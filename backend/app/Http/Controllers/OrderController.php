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

            // Safeguard: If client supplied higher validated total_amount and calculated was just delivery fee, use total_amount
            if (!empty($validated['total_amount']) && (float)$validated['total_amount'] > $deliveryFee && $totalAmount <= $deliveryFee) {
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
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::error("Telegram order notification failed: " . $t->getMessage());
            }

            return response()->json([
                'message' => 'Order placed successfully',
                'order' => $order->load('items')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
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

        if ($order->user_id && $oldStatus !== $validated['status']) {
            \App\Models\UserNotification::create([
                'firebase_uid' => $order->user_id,
                'title' => 'Order Update',
                'message' => "Your order {$order->order_id} is now {$validated['status']}.",
                'type' => 'order'
            ]);
        }

        return response()->json(['message' => 'Order status updated successfully', 'order' => $order]);
    }
}
