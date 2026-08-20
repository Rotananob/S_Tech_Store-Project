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
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $totalAmount = 0;
            $orderItemsData = [];

            // Business Logic: Calculate total and check stock
            foreach ($validated['items'] as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                
                if ($product->stock < $item['quantity']) {
                    throw new \Exception("Insufficient stock for product: {$product->name}");
                }

                $subtotal = $product->price * $item['quantity'];
                $totalAmount += $subtotal;

                // Prepare order item
                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $product->price,
                    'subtotal' => $subtotal,
                ];

                // Deduct stock
                $product->decrement('stock', $item['quantity']);
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
        $order->update(['status' => $validated['status']]);

        return response()->json(['message' => 'Order status updated successfully', 'order' => $order]);
    }
}
