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
        // Retrieve all orders with their items
        $orders = Order::with('items.product')->get();
        return response()->json($orders);
    }

    public function store(Request $request)
    {
        // Validate incoming request
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
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

            // Create Order
            $order = Order::create([
                'user_id' => $request->header('X-Firebase-UID'),
                'customer_name' => $validated['name'],
                'customer_phone' => $validated['phone'],
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

        $uid = $order->user_id ?: \App\Models\UserProfile::where('phone', $order->customer_phone)->value('firebase_uid');

        $notification = null;
        if ($uid) {
            $notificationTitle = $validated['title'] ?: "📦 បច្ចុប្បន្នភាពការបញ្ជាទិញ #{$order->order_id}";
            $notification = \App\Models\UserNotification::create([
                'firebase_uid' => $uid,
                'title' => $notificationTitle,
                'message' => $validated['message'],
                'type' => 'order',
                'link' => '/orders',
                'read' => false,
            ]);

            // Dispatch instant direct notification to customer Telegram (Bot 2 Companion)
            try {
                $userProf = \App\Models\UserProfile::where('firebase_uid', $uid)->first();
                if ($userProf) {
                    \App\Services\TelegramService::sendCustomerDirectNotification(
                        $userProf,
                        $notificationTitle,
                        $validated['message'],
                        '/orders'
                    );
                }
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning("Customer direct telegram push notification failed: " . $t->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => $uid ? 'ការជូនដំណឹងត្រូវបានផ្ញើទៅកាន់អតិថិជនជោគជ័យ!' : 'Order updated, but no linked customer user profile found for this order phone number.',
            'has_customer' => !empty($uid),
            'order' => $order,
            'notification' => $notification,
        ]);
    }
}
