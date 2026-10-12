<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index()
    {
        // Retrieve all orders with items & product, sorted latest first
        $orders = Order::with('items.product')->latest()->get();

        $uids = $orders->pluck('user_id')->filter()->unique();
        $phones = $orders->pluck('customer_phone')->filter()->unique();
        $emails = $orders->pluck('customer_email')->filter()->unique();

        $profilesByUid = \App\Models\UserProfile::whereIn('firebase_uid', $uids)->get()->keyBy('firebase_uid');
        $profilesByPhone = \App\Models\UserProfile::whereIn('phone', $phones)->get()->keyBy('phone');
        $profilesByEmail = \App\Models\UserProfile::whereIn('email', $emails)->get()->keyBy('email');

        $enriched = $orders->map(function ($order) use ($profilesByUid, $profilesByPhone, $profilesByEmail) {
            $user = null;
            if (!empty($order->user_id) && isset($profilesByUid[$order->user_id])) {
                $user = $profilesByUid[$order->user_id];
            } elseif (!empty($order->customer_phone) && isset($profilesByPhone[$order->customer_phone])) {
                $user = $profilesByPhone[$order->customer_phone];
            } elseif (!empty($order->customer_email) && isset($profilesByEmail[$order->customer_email])) {
                $user = $profilesByEmail[$order->customer_email];
            }

            $customerAccount = null;
            if ($user) {
                $hasTelegram = !empty($user->telegram_chat_id) || (!empty($user->firebase_uid) && str_starts_with($user->firebase_uid, 'tg_'));
                $customerAccount = [
                    'id' => $user->id,
                    'firebase_uid' => $user->firebase_uid,
                    'display_name' => $user->display_name ?: $order->customer_name,
                    'username' => $user->username ? (str_starts_with($user->username, '@') ? $user->username : '@' . $user->username) : null,
                    'email' => $user->email,
                    'phone' => $user->phone ?: $order->customer_phone,
                    'photo_url' => $user->photo_url ?: $user->avatar_url,
                    'telegram' => $user->telegram,
                    'telegram_chat_id' => $user->telegram_chat_id,
                    'has_telegram' => $hasTelegram,
                ];
            }

            $orderData = $order->toArray();
            $orderData['customer_account'] = $customerAccount;
            if (empty($orderData['customer_email']) && $user && !empty($user->email)) {
                $orderData['customer_email'] = $user->email;
            }
            return $orderData;
        });

        return response()->json($enriched);
    }

    public function store(Request $request)
    {
        // Validate incoming request
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|string|max:255',
            'address' => 'required|string',
            'delivery_type' => 'nullable|string',
            'payment_method' => 'nullable|string',
            'promo_code' => 'nullable|string|max:50',
            'discount_amount' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric',
            'subtotal' => 'nullable|numeric',
            'delivery_fee' => 'nullable|numeric',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'nullable|numeric',
        ]);

        try {
            DB::beginTransaction();

            $totalAmount = 0;
            $orderItemsData = [];
            
            // Calculate delivery fee
            $deliveryFee = ($validated['delivery_type'] === 'province') ? 3.00 : 2.00;
            if (!empty($validated['delivery_fee']) && (float)$validated['delivery_fee'] > 0) {
                $deliveryFee = (float)$validated['delivery_fee'];
            }

            // Business Logic: Calculate total and check stock
            foreach ($validated['items'] as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                
                if ($product->stock < $item['quantity']) {
                    throw new \Exception("Insufficient stock for product: {$product->name}");
                }

                $dbPrice = ((float)($product->sale_price ?? 0) > 0) ? (float)$product->sale_price : (float)($product->price ?? 0);
                $clientPrice = isset($item['price']) ? (float)$item['price'] : 0;
                $actualPrice = ($dbPrice > 0) ? $dbPrice : (($clientPrice > 0) ? $clientPrice : 1.00);

                $subtotal = $actualPrice * $item['quantity'];
                $totalAmount += $subtotal;

                // Prepare order item
                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $actualPrice,
                    'subtotal' => $subtotal,
                ];

                // Deduct stock
                $product->decrement('stock', $item['quantity']);
            }
            
            $totalAmount += $deliveryFee;

            // Handle Promo Code Discount
            $discountAmount = 0;
            $appliedPromoCode = null;
            if (!empty($validated['promo_code'])) {
                $cleanCode = strtoupper(trim($validated['promo_code']));
                $promo = \App\Models\PromoCode::whereRaw('UPPER(code) = ?', [$cleanCode])->first();
                if ($promo && $promo->status === 'active') {
                    $appliedPromoCode = $promo->code;
                    if (!empty($validated['discount_amount']) && (float)$validated['discount_amount'] > 0) {
                        $discountAmount = (float)$validated['discount_amount'];
                    } elseif ($promo->type === 'percentage') {
                        $discountAmount = ($totalAmount * (float)$promo->value) / 100;
                    } else {
                        $discountAmount = (float)$promo->value;
                    }
                    $promo->increment('usage_count');
                }
            } elseif (!empty($validated['discount_amount']) && (float)$validated['discount_amount'] > 0) {
                $discountAmount = (float)$validated['discount_amount'];
            }

            if ($discountAmount > 0) {
                $totalAmount = max(0, $totalAmount - $discountAmount);
            }

            // Safeguard: If client supplied higher validated total_amount and calculated was just delivery fee, use total_amount
            if (!empty($validated['total_amount']) && (float)$validated['total_amount'] > $deliveryFee && $totalAmount <= $deliveryFee && $discountAmount == 0) {
                $totalAmount = (float)$validated['total_amount'];
            }

            // Resolve customer email
            $customerEmail = !empty($validated['email']) ? trim($validated['email']) : ($request->input('customer_email') ?: $request->header('X-Firebase-Email'));
            if (!$customerEmail && ($uid = $request->header('X-Firebase-UID'))) {
                $customerEmail = \App\Models\UserProfile::where('firebase_uid', $uid)->value('email');
            }

            // Create Order
            $order = Order::create([
                'user_id' => $request->header('X-Firebase-UID'),
                'customer_name' => $validated['name'],
                'customer_phone' => $validated['phone'],
                'customer_email' => $customerEmail,
                'shipping_address' => $validated['address'],
                'delivery_type' => $validated['delivery_type'] ?? null,
                'payment_method' => $validated['payment_method'] ?? null,
                'promo_code' => $appliedPromoCode,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'status' => 'pending',
                // Generate a random order_id
                'order_id' => 'ORD-' . strtoupper(uniqid()),
            ]);

            // Save Order Items
            foreach ($orderItemsData as $itemData) {
                $itemData['order_id'] = $order->id;
                OrderItem::create($itemData);
            }

            DB::commit();

            // Clear the user's cart if authenticated
            if ($uid = $request->header('X-Firebase-UID')) {
                \App\Models\UserCartItem::where('firebase_uid', $uid)->delete();
            }

            // Dispatch instant notification to connected Telegram group (ABA Merchant Style)
            try {
                \App\Services\TelegramService::sendOrderNotification($order->load('items.product'));
                \App\Services\TelegramService::sendFinanceAlert([
                    'type' => 'New Order Payment (' . strtoupper($order->payment_method ?? 'COD') . ')',
                    'amount' => $order->total_amount,
                    'method' => strtoupper($order->payment_method ?? 'COD'),
                    'order_id' => $order->order_id ?? ('#ORD-' . $order->id),
                    'customer' => $order->customer_name ?? 'Customer',
                ]);
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::error("Telegram order notification failed: " . $t->getMessage());
            }

            // Dispatch instant personalized alert directly to Customer Telegram (Bot 2 Companion)
            try {
                \App\Services\TelegramService::sendCustomerDirectOrderAlert($order->load('items.product'), 'created');
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning("Customer direct telegram order alert failed: " . $t->getMessage());
            }

            return response()->json([
                'message' => 'Order placed successfully',
                'order' => $order->load('items')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            try {
                \App\Services\TelegramService::sendSystemErrorAlert([
                    'error' => $e->getMessage(),
                    'context' => 'OrderController::store',
                    'actor' => $request->ip(),
                    'file' => $e->getFile() . ':' . $e->getLine(),
                ]);
            } catch (\Throwable $t) {}
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,processing,shipped,delivered,cancelled',
        ]);

        $order = Order::findOrFail($id);
        $oldStatus = $order->status;
        $order->update(['status' => $validated['status']]);

        // Resolve customer Firebase UID
        $uid = $order->user_id ?: \App\Models\UserProfile::where('phone', $order->customer_phone)->value('firebase_uid');
        if (!$uid && !empty($order->customer_email)) {
            $uid = \App\Models\UserProfile::where('email', $order->customer_email)->value('firebase_uid');
        }

        if ($uid && $oldStatus !== $validated['status']) {
            $statusTitles = [
                'pending' => "⏳ ការបញ្ជាទិញរង់ចាំការបញ្ជាក់",
                'processing' => "📦 កំពុងរៀបចំការបញ្ជាទិញ",
                'shipped' => "🚚 ទំនិញកំពុងដឹកជញ្ជូន",
                'delivered' => "✅ ទំនិញបានដឹកជញ្ជូនដល់ជោគជ័យ",
                'cancelled' => "❌ ការបញ្ជាទិញត្រូវបានបោះបង់",
            ];

            $statusMessages = [
                'pending' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានដាក់ស្នើ និងកំពុងរង់ចាំការបញ្ជាក់ (Pending)។",
                'processing' => "ការបញ្ជាទិញ #{$order->order_id} កំពុងត្រូវបានរៀបចំវេចខ្ចប់ដោយហាង (Processing)។",
                'shipped' => "ការបញ្ជាទិញ #{$order->order_id} កំពុងធ្វើដំណើរលើផ្លូវដឹកជញ្ជូនជូនលោកអ្នក (Shipped)។",
                'delivered' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានដឹកជញ្ជូនដល់ជោគជ័យ។ សូមអរគុណសម្រាប់ការគាំទ្រ S Tech Store! (Delivered)",
                'cancelled' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានបោះបង់ (Cancelled)។",
            ];

            \App\Models\UserNotification::create([
                'firebase_uid' => $uid,
                'title' => $statusTitles[$validated['status']] ?? "Order Update",
                'message' => $statusMessages[$validated['status']] ?? "Your order {$order->order_id} is now {$validated['status']}.",
                'type' => 'order',
                'link' => '/orders',
                'read' => false,
            ]);
        }

        // Dispatch instant personalized status update directly to Customer Telegram (Bot 2 Companion)
        if ($oldStatus !== $validated['status']) {
            try {
                \App\Services\TelegramService::sendCustomerDirectOrderAlert($order->load('items.product'), 'status_updated');
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning("Customer direct telegram order status alert failed: " . $t->getMessage());
            }
        }

        return response()->json(['message' => 'Order status updated successfully', 'order' => $order]);
    }

    public function update(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'status' => 'nullable|string|in:pending,processing,shipped,delivered,cancelled',
            'payment_status' => 'nullable|string|in:pending,paid,failed,refunded',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'customer_email' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'delivery_type' => 'nullable|string|max:50',
            'payment_method' => 'nullable|string|max:50',
            'total_amount' => 'nullable|numeric|min:0',
            'tracking_number' => 'nullable|string|max:100',
            'admin_notes' => 'nullable|string',
            'notify_customer' => 'nullable|boolean',
        ]);

        $oldStatus = $order->status;
        $order->fill(array_filter($validated, fn($val) => $val !== null));
        $order->save();

        $sentToWeb = false;
        $sentToTelegram = false;

        // Auto notification if requested or status changed
        if (!empty($validated['notify_customer']) || ($oldStatus !== $order->status && $request->has('status'))) {
            $statusTitles = [
                'pending' => "⏳ ការបញ្ជាទិញរង់ចាំការបញ្ជាក់",
                'processing' => "📦 កំពុងរៀបចំការបញ្ជាទិញ",
                'shipped' => "🚚 ទំនិញកំពុងដឹកជញ្ជូន",
                'delivered' => "✅ ទំនិញបានដឹកជញ្ជូនដល់ជោគជ័យ",
                'cancelled' => "❌ ការបញ្ជាទិញត្រូវបានបោះបង់",
            ];

            $statusMessages = [
                'pending' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានដាក់ស្នើ និងកំពុងរង់ចាំការបញ្ជាក់ (Pending)។",
                'processing' => "ការបញ្ជាទិញ #{$order->order_id} កំពុងត្រូវបានរៀបចំវេចខ្ចប់ដោយហាង (Processing)។",
                'shipped' => "ការបញ្ជាទិញ #{$order->order_id} កំពុងធ្វើដំណើរលើផ្លូវដឹកជញ្ជូនជូនលោកអ្នក (Shipped)" . ($order->tracking_number ? " [កូដបញ្ញើ: {$order->tracking_number}]" : "") . "។",
                'delivered' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានដឹកជញ្ជូនដល់ជោគជ័យ។ សូមអរគុណសម្រាប់ការគាំទ្រ S Tech Store! (Delivered)",
                'cancelled' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានបោះបង់ (Cancelled)។",
            ];

            $title = $statusTitles[$order->status] ?? "📦 បច្ចុប្បន្នភាពការបញ្ជាទិញ #{$order->order_id}";
            $message = $statusMessages[$order->status] ?? "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានកែប្រែព័ត៌មានដោយជោគជ័យ។";

            // Resolve user profile
            $user = null;
            if (!empty($order->user_id)) {
                $user = \App\Models\UserProfile::where('firebase_uid', $order->user_id)->first();
            }
            if (!$user && !empty($order->customer_phone)) {
                $user = \App\Models\UserProfile::where('phone', $order->customer_phone)->first();
            }
            if (!$user && !empty($order->customer_email)) {
                $user = \App\Models\UserProfile::where('email', $order->customer_email)->first();
            }

            // 1. In-App Website Notification
            if ($user && !empty($user->firebase_uid)) {
                \App\Models\UserNotification::create([
                    'firebase_uid' => $user->firebase_uid,
                    'title' => $title,
                    'message' => $message,
                    'type' => 'order',
                    'link' => '/orders',
                    'read' => false,
                ]);
                $sentToWeb = true;
            }

            // 2. Direct Customer Telegram (if connected)
            try {
                $chatId = \App\Services\TelegramService::resolveCustomerChatId($user ?: $order, $order->customer_phone, $order->customer_email);
                if ($chatId) {
                    $tgRes = \App\Services\TelegramService::sendCustomerDirectNotification(
                        $user ?: $order,
                        $title,
                        $message,
                        '/orders'
                    );
                    $sentToTelegram = ($tgRes['ok'] ?? false) === true;
                }
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning("Telegram update notification failed: " . $t->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Order updated successfully',
            'order' => $order->load('items.product'),
            'sent_to_web' => $sentToWeb,
            'sent_to_telegram' => $sentToTelegram,
        ]);
    }

    public function pushNotification(Request $request, $id)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'message' => 'required|string',
            'status' => 'nullable|string|in:pending,processing,shipped,delivered,cancelled',
        ]);

        $order = Order::findOrFail($id);

        if (!empty($validated['status']) && $validated['status'] !== $order->status) {
            $order->update(['status' => $validated['status']]);
        }

        // Resolve user profile via user_id, phone, or email
        $user = null;
        if (!empty($order->user_id)) {
            $user = \App\Models\UserProfile::where('firebase_uid', $order->user_id)->first();
        }
        if (!$user && !empty($order->customer_phone)) {
            $user = \App\Models\UserProfile::where('phone', $order->customer_phone)->first();
        }
        if (!$user && !empty($order->customer_email)) {
            $user = \App\Models\UserProfile::where('email', $order->customer_email)->first();
        }

        $notificationTitle = $validated['title'] ?: "📦 បច្ចុប្បន្នភាពការបញ្ជាទិញ #{$order->order_id}";
        $sentToWeb = false;
        $sentToTelegram = false;
        $hasTelegram = false;

        // 1. In-App Notification to Website Account
        if ($user && !empty($user->firebase_uid)) {
            \App\Models\UserNotification::create([
                'firebase_uid' => $user->firebase_uid,
                'title' => $notificationTitle,
                'message' => $validated['message'],
                'type' => 'order',
                'link' => '/orders',
                'read' => false,
            ]);
            $sentToWeb = true;
        }

        // 2. Telegram Notification (Direct to customer chat if connected)
        $chatId = \App\Services\TelegramService::resolveCustomerChatId($user ?: $order, $order->customer_phone, $order->customer_email);
        if ($chatId) {
            $hasTelegram = true;
            try {
                $tgRes = \App\Services\TelegramService::sendCustomerDirectNotification(
                    $user ?: $order,
                    $notificationTitle,
                    $validated['message'],
                    '/orders'
                );
                $sentToTelegram = ($tgRes['ok'] ?? false) === true;
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning("Customer direct telegram push notification failed: " . $t->getMessage());
            }
        }

        // Build friendly Khmer message
        $msg = "";
        if ($sentToWeb && $sentToTelegram) {
            $msg = "ការជូនដំណឹងត្រូវបានផ្ញើទៅទាំង Account Website និង Telegram របស់អតិថិជនជោគជ័យ! (Dual Channel Sync)";
        } elseif ($sentToTelegram) {
            $msg = "ការជូនដំណឹងត្រូវបានផ្ញើទៅកាន់ Telegram របស់អតិថិជនជោគជ័យ!";
        } elseif ($sentToWeb) {
            $msg = "ការជូនដំណឹងត្រូវបានផ្ញើទៅកាន់ Account Website របស់អតិថិជនជោគជ័យ! (អតិថិជនមិនទាន់បានភ្ជាប់ Telegram ទេ)";
        } else {
            $msg = "បានកែប្រែ Order រួចរាល់ (មិនទាន់រកឃើញ Account របស់អតិថិជនសម្រាប់ការបញ្ជាទិញនេះទេ)";
        }

        return response()->json([
            'success' => true,
            'message' => $msg,
            'sent_to_web' => $sentToWeb,
            'sent_to_telegram' => $sentToTelegram,
            'has_telegram' => $hasTelegram,
            'has_customer' => !empty($user),
            'customer' => $user ? [
                'name' => $user->display_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'telegram' => $user->telegram,
                'has_telegram' => $hasTelegram,
            ] : null,
            'order' => $order,
        ]);
    }
}
