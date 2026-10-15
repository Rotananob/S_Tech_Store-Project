<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

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
            
            // Prioritize customer's real Gmail / contact email from account profile if available
            $isOrderSynthetic = empty($orderData['customer_email']) || 
                                str_ends_with($orderData['customer_email'], '@s-tech-store.tech') || 
                                str_ends_with($orderData['customer_email'], '@telegram.s-tech-store.tech');
            $userHasRealEmail = $user && !empty($user->email) && 
                                !str_ends_with($user->email, '@s-tech-store.tech') && 
                                !str_ends_with($user->email, '@telegram.s-tech-store.tech');

            if ($userHasRealEmail && $isOrderSynthetic) {
                $orderData['customer_email'] = $user->email;
            } elseif (empty($orderData['customer_email']) && $user && !empty($user->email)) {
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

        // Security Guard: Check Cybersecurity Night Lockdown
        $nightLock = \App\Http\Controllers\MasterSystemController::isNightLockActive();
        if ($nightLock['active'] && !$request->header('X-Owner-Bypass')) {
            $adminUser = $request->attributes->get('auth_user');
            $isSuper = $adminUser && ($adminUser->role === 'super_admin' || $adminUser->email === 'nobrothana180703@gmail.com');
            if (!$isSuper) {
                return response()->json([
                    'success' => false,
                    'code' => 'NIGHT_LOCKDOWN_ACTIVE',
                    'message' => 'ហាងកំពុងស្ថិតក្នុងរបៀបការពារសុវត្ថិភាពពេលរាត្រី (Cybersecurity Night Lockdown: ' . $nightLock['start_time'] . ' - ' . $nightLock['end_time'] . ')។ ការបញ្ជាទិញនឹងបើកដំណើរការឡើងវិញនៅវេលាម៉ោង 06:00 AM ព្រឹកនេះ!',
                    'reopen_at' => $nightLock['reopen_at'],
                ], 423);
            }
        }

        try {
            DB::beginTransaction();

            $totalAmount = 0;
            $orderItemsData = [];
            
            // Calculate delivery fee server-side based on shipping location
            $deliveryFee = ($validated['delivery_type'] === 'province') ? 3.00 : 2.00;

            // Business Logic: Calculate subtotal from database prices and check stock
            $itemsSubtotal = 0;
            foreach ($validated['items'] as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                
                if ($product->stock < $item['quantity']) {
                    throw new \Exception("Insufficient stock for product: {$product->name}");
                }

                // Strict Server-Side Pricing: never trust client-supplied unit price
                $dbPrice = ((float)($product->sale_price ?? 0) > 0) ? (float)$product->sale_price : (float)($product->price ?? 0);
                $actualPrice = ($dbPrice > 0) ? $dbPrice : 1.00;

                $subtotal = $actualPrice * $item['quantity'];
                $itemsSubtotal += $subtotal;

                // Prepare order item
                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $actualPrice,
                    'subtotal' => $subtotal,
                ];

                // Deduct stock
                $product->decrement('stock', $item['quantity']);
                $newStock = (int)$product->fresh()->stock;
                if ($newStock <= 3) {
                    try {
                        \App\Services\TelegramService::sendLowStockAlert($product->fresh(), $newStock);
                    } catch (\Throwable $t) {}
                }
            }

            // Handle Promo Code Discount (Server-Side Only - Client cannot forge discount amount)
            $discountAmount = 0;
            $appliedPromoCode = null;
            if (!empty($validated['promo_code'])) {
                $cleanCode = strtoupper(trim($validated['promo_code']));
                $promo = \App\Models\PromoCode::whereRaw('UPPER(code) = ?', [$cleanCode])->first();
                if ($promo && $promo->status === 'active') {
                    $appliedPromoCode = $promo->code;
                    if ($promo->type === 'percentage') {
                        $discountAmount = ($itemsSubtotal * (float)$promo->value) / 100;
                    } else {
                        $discountAmount = (float)$promo->value;
                    }
                    // Discount cannot exceed items subtotal
                    $discountAmount = min($itemsSubtotal, $discountAmount);
                    $promo->increment('usage_count');
                }
            }

            // Calculate final validated total
            $totalAmount = max(1.00, ($itemsSubtotal - $discountAmount) + $deliveryFee);

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
                if ($order->payment_method !== 'wallet') {
                    \App\Services\TelegramService::sendFinanceAlert([
                        'type' => 'New Order Payment (' . strtoupper($order->payment_method ?? 'COD') . ')',
                        'amount' => $order->total_amount,
                        'method' => strtoupper($order->payment_method ?? 'COD'),
                        'order_id' => $order->order_id ?? ('#ORD-' . $order->id),
                        'customer' => $order->customer_name ?? 'Customer',
                    ]);
                }
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning("Telegram order notification non-critical error: " . $t->getMessage());
            }

            // Dispatch instant personalized alert directly to Customer Telegram (Bot 2 Companion)
            if ($order->payment_method !== 'wallet') {
                try {
                    \App\Services\TelegramService::sendCustomerDirectOrderAlert($order->load('items.product'), 'created');
                } catch (\Throwable $t) {
                    \Illuminate\Support\Facades\Log::warning("Customer direct telegram order alert skipped: " . $t->getMessage());
                }
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

    /**
     * Resolve customer UserProfile and Target UID (supports both Web Firebase UID and Telegram Mini App tg_<chat_id>)
     */
    private function resolveCustomerAndUid(Order $order): array
    {
        $targetUid = !empty($order->user_id) ? trim($order->user_id) : null;
        $user = null;

        if (!empty($targetUid)) {
            $user = \App\Models\UserProfile::where('firebase_uid', $targetUid)->first();
            if (!$user && str_starts_with($targetUid, 'tg_')) {
                $rawChatId = str_replace('tg_', '', $targetUid);
                $user = \App\Models\UserProfile::where('telegram_chat_id', $rawChatId)->first();
            }
        }
        if (!$user && !empty($order->customer_phone)) {
            $user = \App\Models\UserProfile::where('phone', trim($order->customer_phone))->first();
            if ($user && empty($targetUid)) {
                $targetUid = $user->firebase_uid;
            }
        }
        if (!$user && !empty($order->customer_email)) {
            $user = \App\Models\UserProfile::where('email', trim($order->customer_email))->first();
            if ($user && empty($targetUid)) {
                $targetUid = $user->firebase_uid;
            }
        }
        if (empty($targetUid) && $user && !empty($user->firebase_uid)) {
            $targetUid = $user->firebase_uid;
        }

        return [$user, $targetUid];
    }

    public function updateStatus(Request $request, $id)
    {
        if ($request->has('status')) {
            $request->merge(['status' => strtolower(trim($request->input('status')))]);
        }
        $validated = $request->validate([
            'status' => 'required|string|in:pending,processing,shipped,delivered,completed,cancelled',
        ]);

        $order = Order::findOrFail($id);
        $oldStatus = $order->status;
        $newStatus = $validated['status'];
        if ($newStatus === 'completed') {
            $newStatus = 'delivered';
        }
        $order->update(['status' => $newStatus]);

        [$user, $targetUid] = $this->resolveCustomerAndUid($order);

        if ($targetUid && $oldStatus !== $newStatus) {
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

            try {
                \App\Models\UserNotification::create([
                    'firebase_uid' => $targetUid,
                    'title' => $statusTitles[$newStatus] ?? "Order Update",
                    'message' => $statusMessages[$newStatus] ?? "Your order {$order->order_id} is now {$newStatus}.",
                    'type' => 'order',
                    'link' => '/orders',
                    'read' => false,
                ]);
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning("Status update notification create error: " . $t->getMessage());
            }
        }

        // Dispatch instant personalized status update directly to Customer Telegram (Bot 2 Companion)
        if ($oldStatus !== $newStatus) {
            try {
                \App\Services\TelegramService::sendCustomerDirectOrderAlert($order->load('items.product'), 'status_updated');
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning("Customer direct telegram order status alert failed: " . $t->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Order status updated successfully',
            'order' => $order->fresh('items.product'),
        ]);
    }

    public function update(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ($request->has('status') && !empty($request->input('status'))) {
            $st = strtolower(trim($request->input('status')));
            if ($st === 'completed') $st = 'delivered';
            $request->merge(['status' => $st]);
        }

        $validated = $request->validate([
            'status' => 'nullable|string|in:pending,processing,shipped,delivered,completed,cancelled',
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
        $sentToEmail = false;

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

            [$user, $targetUid] = $this->resolveCustomerAndUid($order);

            $wantEmail = $request->has('send_email') ? $request->boolean('send_email') : true;
            $wantTelegram = $request->has('send_telegram') ? $request->boolean('send_telegram') : true;
            $wantWeb = $request->has('send_web') ? $request->boolean('send_web') : true;

            $customerEmail = !empty($validated['customer_email'])
                ? trim($validated['customer_email'])
                : ($order->customer_email ?: ($user?->email ?: null));

            // 1. In-App Website / Mini App Notification
            if ($wantWeb && !empty($targetUid)) {
                try {
                    \App\Models\UserNotification::create([
                        'firebase_uid' => $targetUid,
                        'title' => $title,
                        'message' => $message,
                        'type' => 'order',
                        'link' => '/orders',
                        'read' => false,
                    ]);
                    $sentToWeb = true;
                } catch (\Throwable $t) {
                    \Illuminate\Support\Facades\Log::warning("Web notification failed: " . $t->getMessage());
                }
            }

            // 2. Direct Customer Telegram (if connected)
            if ($wantTelegram) {
                try {
                    $chatId = \App\Services\TelegramService::resolveCustomerChatId($user ?: $order, $order->customer_phone, $customerEmail);
                    if ($chatId) {
                        $tgRes = \App\Services\TelegramService::sendCustomerDirectNotification(
                            $user ?: $order,
                            $title,
                            $message,
                            '/orders'
                        );
                        $sentToTelegram = ($tgRes['ok'] ?? false) === true;
                    }

                    if ($oldStatus !== $order->status) {
                        \App\Services\TelegramService::sendCustomerDirectOrderAlert($order->load('items.product'), 'status_updated');
                    }
                } catch (\Throwable $t) {
                    \Illuminate\Support\Facades\Log::warning("Telegram update notification failed: " . $t->getMessage());
                }
            }

            // 3. Real Email Notification
            if ($wantEmail && !empty($customerEmail)) {
                try {
                    $order->loadMissing('items.product');
                    $emailRes = self::sendOrderEmail($order, $customerEmail, $title, $message);
                    $sentToEmail = ($emailRes['success'] ?? false) === true;
                } catch (\Throwable $t) {
                    \Illuminate\Support\Facades\Log::warning("Real email order update notification failed: " . $t->getMessage());
                    $sentToEmail = false;
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Order updated successfully',
            'order' => $order->fresh('items.product'),
            'sent_to_web' => $sentToWeb,
            'sent_to_telegram' => $sentToTelegram,
            'sent_to_email' => $sentToEmail,
        ]);
    }

    public function pushNotification(Request $request, $id)
    {
        if ($request->has('status') && !empty($request->input('status'))) {
            $st = strtolower(trim($request->input('status')));
            if ($st === 'completed') $st = 'delivered';
            $request->merge(['status' => $st]);
        }

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'message' => 'required|string',
            'status' => 'nullable|string|in:pending,processing,shipped,delivered,completed,cancelled',
            'send_email' => 'nullable|boolean',
            'send_telegram' => 'nullable|boolean',
            'send_web' => 'nullable|boolean',
            'email' => 'nullable|email|max:150',
        ]);

        $order = Order::with('items.product')->findOrFail($id);
        $oldStatus = $order->status;

        if (!empty($validated['status'])) {
            $newStatus = $validated['status'];
            if ($newStatus === 'completed') {
                $newStatus = 'delivered';
            }
            if ($newStatus !== $order->status) {
                $order->update(['status' => $newStatus]);
            }
        }

        // Resolve user profile and target UID (supports both Web and Telegram Mini App tg_<chat_id>)
        [$user, $targetUid] = $this->resolveCustomerAndUid($order);

        $notificationTitle = $validated['title'] ?: "📦 បច្ចុប្បន្នភាពការបញ្ជាទិញ #{$order->order_id}";

        $wantEmail = $request->has('send_email') ? $request->boolean('send_email') : true;
        $wantTelegram = $request->has('send_telegram') ? $request->boolean('send_telegram') : true;
        $wantWeb = $request->has('send_web') ? $request->boolean('send_web') : true;

        $orderEmail = $order->customer_email;
        $userEmail = $user?->email;
        $isOrderSynthetic = empty($orderEmail) || 
                            str_ends_with($orderEmail, '@s-tech-store.tech') || 
                            str_ends_with($orderEmail, '@telegram.s-tech-store.tech');
        $userHasRealEmail = !empty($userEmail) && 
                            !str_ends_with($userEmail, '@s-tech-store.tech') && 
                            !str_ends_with($userEmail, '@telegram.s-tech-store.tech');

        $customerEmail = !empty($validated['email'])
            ? trim($validated['email'])
            : ($userHasRealEmail ? $userEmail : ($orderEmail ?: $userEmail));

        if (!empty($validated['email']) && $order->customer_email !== $validated['email']) {
            $order->update(['customer_email' => $validated['email']]);
        } elseif ($userHasRealEmail && $isOrderSynthetic) {
            $order->update(['customer_email' => $userEmail]);
        }

        $sentToWeb = false;
        $sentToTelegram = false;
        $sentToEmail = false;
        $hasTelegram = false;

        // 1. In-App Notification to Customer Account (Web or Telegram Mini App)
        if ($wantWeb && !empty($targetUid)) {
            try {
                \App\Models\UserNotification::create([
                    'firebase_uid' => $targetUid,
                    'title' => $notificationTitle,
                    'message' => $validated['message'],
                    'type' => 'order',
                    'link' => '/orders',
                    'read' => false,
                ]);
                $sentToWeb = true;
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning("Web notification failed: " . $t->getMessage());
            }
        }

        // 2. Telegram Notification (Direct to customer chat if connected)
        $chatId = \App\Services\TelegramService::resolveCustomerChatId($user ?: $order, $order->customer_phone, $customerEmail);
        if ($chatId) {
            $hasTelegram = true;
            if ($wantTelegram) {
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

                if ($oldStatus !== $order->status) {
                    try {
                        \App\Services\TelegramService::sendCustomerDirectOrderAlert($order->fresh(['items.product']), 'status_updated');
                    } catch (\Throwable $t) {}
                }
            }
        }

        // 3. Real Email Notification (Dispatch to customer's real Gmail / email inbox)
        $isSyntheticEmail = empty($customerEmail) || 
                            str_ends_with($customerEmail, '@s-tech-store.tech') || 
                            str_ends_with($customerEmail, '@telegram.s-tech-store.tech') ||
                            str_ends_with($customerEmail, '@tiktok.s-tech-store.tech');

        $emailError = null;
        if ($wantEmail && !empty($customerEmail) && !$isSyntheticEmail && filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            try {
                $emailRes = self::sendOrderEmail($order, $customerEmail, $notificationTitle, $validated['message']);
                $sentToEmail = ($emailRes['success'] ?? false) === true;
                if (!$sentToEmail) {
                    $emailError = $emailRes['error'] ?? 'បរាជ័យក្នុងការបញ្ជូន Email';
                }
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning("Real email order notification failed: " . $t->getMessage());
                $sentToEmail = false;
                $emailError = $t->getMessage();
            }
        } elseif ($wantEmail && ($isSyntheticEmail || empty($customerEmail))) {
            $emailError = "អ៊ីមែលអតិថិជនជា Synthetic Placeholder (មិនមែន Real Gmail)";
        }

        // Build friendly Khmer message
        $channels = [];
        if ($sentToEmail) $channels[] = "Email ({$customerEmail})";
        if ($sentToTelegram) $channels[] = "Telegram Bot 1-on-1";
        if ($sentToWeb) $channels[] = "Account Website & Mini App";

        if (!empty($channels)) {
            $msg = "ការជូនដំណឹងត្រូវបានបញ្ជូនជោគជ័យទៅកាន់: " . implode(" + ", $channels);
            if ($wantEmail && !$sentToEmail) {
                $msg .= " ⚠️ (Email មិនបានផ្ញើ: {$emailError})";
            }
        } else {
            if ($wantEmail && !$sentToEmail) {
                $msg = "មិនអាចបញ្ជូន Email បានទេ: {$emailError}";
            } else {
                $msg = "បានកត់ត្រាការជូនដំណឹង (គ្មាន Channel ណាត្រូវបានជ្រើសរើស ឬរកឃើញព័ត៌មានទំនាក់ទំនង)";
            }
        }

        return response()->json([
            'success' => true,
            'message' => $msg,
            'sent_to_email' => $sentToEmail,
            'email_error' => $emailError,
            'sent_to_telegram' => $sentToTelegram,
            'sent_to_web' => $sentToWeb,
            'has_telegram' => $hasTelegram,
            'has_email' => !empty($customerEmail),
            'customer_email' => $customerEmail,
            'has_customer' => !empty($user) || !empty($targetUid),
            'customer' => $user ? [
                'name' => $user->display_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'telegram' => $user->telegram,
                'has_telegram' => $hasTelegram,
            ] : null,
            'order' => $order->fresh(['items.product']),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $orderId = $order->order_id ?: ('#' . $order->id);

        $order->items()->delete();
        $order->delete();

        return response()->json([
            'success' => true,
            'message' => "បានលុបការបញ្ជាទិញ {$orderId} ដោយជោគជ័យ!",
            'deleted_id' => (int)$id,
        ]);
    }

    /**
     * Send luxury HTML order notification email to customer
     */
    public static function sendOrderEmail(Order $order, string $toEmail, string $title, string $message): array
    {
        try {
            $subject = "📦 [S Tech Store] {$title} — Order #{$order->order_id}";

            $statusBadgeColor = match (strtolower($order->status)) {
                'pending' => '#d97706',
                'processing' => '#2563eb',
                'shipped' => '#7c3aed',
                'delivered' => '#16a34a',
                'cancelled' => '#dc2626',
                default => '#475569',
            };

            $statusText = match (strtolower($order->status)) {
                'pending' => 'រង់ចាំការបញ្ជាក់ • Pending',
                'processing' => 'កំពុងរៀបចំទំនិញ • Processing',
                'shipped' => 'កំពុងដឹកជញ្ជូន • Shipped',
                'delivered' => 'បានប្រគល់ជូនជោគជ័យ • Delivered',
                'cancelled' => 'បានបោះបង់ • Cancelled',
                default => ucfirst($order->status),
            };

            $itemsHtml = '';
            if ($order->relationLoaded('items') && $order->items->count() > 0) {
                foreach ($order->items as $item) {
                    $prodName = htmlspecialchars($item->product->name ?? 'ផលិតផលបច្ចេកវិទ្យា');
                    $qty = (int)$item->quantity;
                    $unitPrice = number_format((float)$item->unit_price, 2);
                    $itemSubtotal = number_format((float)$item->subtotal, 2);
                    $itemsHtml .= "
                    <tr>
                      <td style='padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b;'>{$prodName}</td>
                      <td style='padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center; color: #64748b;'>x{$qty}</td>
                      <td style='padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; color: #64748b;'>\${$unitPrice}</td>
                      <td style='padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; font-weight: 700; color: #0f172a;'>\${$itemSubtotal}</td>
                    </tr>";
                }
            }

            $trackingRow = '';
            if (!empty($order->tracking_number)) {
                $trackingRow = "
                <div class='info-row'>
                  <span class='info-label'>កូដតាមដានបញ្ញើ (Tracking Number):</span>
                  <span class='info-val' style='font-family: monospace; color: #7c3aed;'>{$order->tracking_number}</span>
                </div>";
            }

            $discountRow = '';
            if ((float)($order->discount_amount ?? 0) > 0) {
                $discountVal = number_format((float)$order->discount_amount, 2);
                $discountRow = "
                <div class='info-row'>
                  <span class='info-label'>បញ្ចុះតម្លៃ Promo Code:</span>
                  <span class='info-val' style='color: #16a34a;'>-\${$discountVal}</span>
                </div>";
            }

            $totalFormatted = number_format((float)$order->total_amount, 2);
            $cleanTitle = htmlspecialchars($title);
            $cleanMsg = nl2br(htmlspecialchars($message));
            $customerName = htmlspecialchars($order->customer_name ?: 'អតិថិជន');
            $customerPhone = htmlspecialchars($order->customer_phone ?: 'N/A');
            $shippingAddress = htmlspecialchars($order->shipping_address ?: 'N/A');
            $paymentMethod = htmlspecialchars(strtoupper($order->payment_method ?: 'COD'));

            $htmlContent = "
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset='utf-8'>
              <title>{$subject}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .header { background: linear-gradient(135deg, #8B1A1A 0%, #b91c1c 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
                .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
                .header p { margin: 0; font-size: 13px; opacity: 0.9; }
                .content { padding: 30px 24px; }
                .message-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 24px; color: #991b1b; }
                .message-title { font-weight: 800; font-size: 15px; margin-bottom: 6px; }
                .message-body { font-size: 14px; line-height: 1.6; color: #334155; }
                .order-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
                .order-code { font-family: monospace; font-size: 20px; font-weight: 800; color: #8B1A1A; }
                .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #fff; background-color: {$statusBadgeColor}; }
                .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
                .info-label { color: #64748b; font-weight: 600; }
                .info-val { font-weight: 700; color: #0f172a; text-align: right; }
                .items-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 16px; }
                .items-table th { background: #f1f5f9; padding: 8px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: left; }
                .total-box { background: #ffffff; border: 2px dashed #8B1A1A; border-radius: 10px; padding: 14px 18px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
                .btn-track { display: block; text-align: center; background: #8B1A1A; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 24px; border-radius: 12px; margin: 24px 0 10px 0; }
                .footer { background: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
                .footer a { color: #8B1A1A; text-decoration: none; font-weight: 700; }
              </style>
            </head>
            <body>
              <div class='container'>
                <div class='header'>
                  <h1>S TECH STORE CAMBODIA</h1>
                  <p>បច្ចុប្បន្នភាពការបញ្ជាទិញ & សេវាដឹកជញ្ជូនរហ័សទូទាំងប្រទេស</p>
                </div>
                <div class='content'>
                  <p>ជំរាបសួរលោកអ្នក <b>{$customerName}</b>,</p>
                  
                  <div class='message-box'>
                    <div class='message-title'>{$cleanTitle}</div>
                    <div class='message-body'>{$cleanMsg}</div>
                  </div>

                  <div class='order-card'>
                    <div style='display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;'>
                      <span class='order-code'>#{$order->order_id}</span>
                      <span class='badge'>{$statusText}</span>
                    </div>

                    <div class='info-row'>
                      <span class='info-label'>អតិថិជន (Customer):</span>
                      <span class='info-val'>{$customerName} ({$customerPhone})</span>
                    </div>
                    <div class='info-row'>
                      <span class='info-label'>អាសយដ្ឋានដឹកជញ្ជូន:</span>
                      <span class='info-val'>{$shippingAddress}</span>
                    </div>
                    <div class='info-row'>
                      <span class='info-label'>វិធីសាស្ត្រទូទាត់:</span>
                      <span class='info-val'>{$paymentMethod}</span>
                    </div>
                    {$trackingRow}
                    {$discountRow}

                    " . (!empty($itemsHtml) ? "
                    <div style='margin-top: 16px;'>
                      <strong style='font-size: 13px; color: #334155;'>មុខទំនិញដែលបានកុម្ម៉ង់ (Order Items):</strong>
                      <table class='items-table'>
                        <thead>
                          <tr>
                            <th>ទំនិញ</th>
                            <th style='text-align: center;'>ចំនួន</th>
                            <th style='text-align: right;'>តម្លៃរាយ</th>
                            <th style='text-align: right;'>សរុប</th>
                          </tr>
                        </thead>
                        <tbody>
                          {$itemsHtml}
                        </tbody>
                      </table>
                    </div>" : "") . "

                    <div class='total-box'>
                      <span style='font-size: 15px; font-weight: 800; color: #1e293b;'>សរុបទឹកប្រាក់ត្រូវទូទាត់ (Total):</span>
                      <span style='font-size: 20px; font-weight: 900; color: #8B1A1A;'>\${$totalFormatted} USD</span>
                    </div>
                  </div>

                  <a href='https://www.s-tech-store.tech/orders' class='btn-track'>
                    🔍 ពិនិត្យមើលការបញ្ជាទិញក្នុងគេហទំព័រ (Track Order)
                  </a>

                  <p style='font-size: 13px; line-height: 1.6; color: #475569; margin-top: 20px;'>
                    📍 <b>ទីតាំងហាង:</b> ផ្លូវ ២៧១ រាជធានីភ្នំពេញ<br>
                    📞 <b>ទូរស័ព្ទទំនាក់ទំនង:</b> +855 12 345 678 | Telegram Bot: @S_TECH_ASSISTANTBOT
                  </p>
                </div>
                <div class='footer'>
                  <p>© 2026 S Tech Store Cambodia. All rights reserved.<br>
                  គេហទំព័រផ្លូវការ: <a href='https://www.s-tech-store.tech'>www.s-tech-store.tech</a></p>
                </div>
              </div>
            </body>
            </html>";

            return \App\Services\EmailService::dispatchHtmlEmail($toEmail, $subject, $htmlContent, [
                'order_id' => $order->order_id,
            ]);
        } catch (\Throwable $t) {
            Log::error("Order email preparation error: " . $t->getMessage());
            return [
                'success' => false,
                'error' => $t->getMessage(),
            ];
        }
    }
}
