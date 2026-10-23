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

            // Resolve customer user ID & email reliably (URL decode safe)
            $rawUid = $request->header('X-Firebase-UID');
            $orderUserUid = !empty($rawUid) ? urldecode(trim((string)$rawUid)) : null;
            $rawCustEmail = !empty($validated['email']) ? trim($validated['email']) : ($request->input('customer_email') ?: $request->header('X-Firebase-Email'));
            $customerEmail = !empty($rawCustEmail) ? urldecode(trim((string)$rawCustEmail)) : null;

            // 1. If UID empty, attempt resolution via Customer Session Token
            if (empty($orderUserUid)) {
                $rawToken = $request->header('X-Customer-Token')
                    ?: $request->bearerToken()
                    ?: $request->cookie('customer_token')
                    ?: $request->query('token')
                    ?: $request->query('tg_token');
                if (!empty($rawToken)) {
                    $token = urldecode(trim((string)$rawToken));
                    $sessUserId = \Illuminate\Support\Facades\Cache::get("customer_sess_{$token}");
                    if ($sessUserId) {
                        $sessUser = \App\Models\UserProfile::find($sessUserId);
                        if ($sessUser && !empty($sessUser->firebase_uid)) {
                            $orderUserUid = $sessUser->firebase_uid;
                        }
                    }
                }
            }

            // 2. If still empty, check X-Telegram-Chat-ID (ONLY if actively connected and NOT disconnected)
            if (empty($orderUserUid)) {
                $rawChatId = $request->header('X-Telegram-Chat-ID') ?: $request->query('chat_id');
                if (!empty($rawChatId)) {
                    $cleanChatId = preg_replace('/\D/', '', (string)$rawChatId);
                    if (!empty($cleanChatId) && !\Illuminate\Support\Facades\Cache::has("tg_disconnected_{$cleanChatId}")) {
                        $active = \App\Services\TelegramService::resolveActiveUser($cleanChatId);
                        if ($active && !empty($active->firebase_uid)) {
                            $orderUserUid = $active->firebase_uid;
                        }
                    }
                }
            }

            // Cross-check with UserProfile if UID is known or if email matches an existing account
            if (!empty($orderUserUid)) {
                $matchedUser = \App\Models\UserProfile::where('firebase_uid', $orderUserUid)->first();
                if (!$matchedUser && !empty($customerEmail)) {
                    $matchedUser = \App\Models\UserProfile::where('email', $customerEmail)->first();
                    if ($matchedUser && !empty($matchedUser->firebase_uid)) {
                        $orderUserUid = $matchedUser->firebase_uid;
                    }
                }
                if ($matchedUser && empty($customerEmail) && !empty($matchedUser->email)) {
                    $customerEmail = $matchedUser->email;
                }
            } elseif (!empty($customerEmail)) {
                $matchedUser = \App\Models\UserProfile::where('email', $customerEmail)->first();
                if ($matchedUser && !empty($matchedUser->firebase_uid)) {
                    $orderUserUid = $matchedUser->firebase_uid;
                }
            }

            // ACC STORE ALL: Automatically store customer contact info on their Store Account
            if ($matchedUser) {
                $userNeedsUpdate = false;
                if (empty($matchedUser->phone) && !empty($validated['phone'])) {
                    $matchedUser->phone = $validated['phone'];
                    $userNeedsUpdate = true;
                }
                if (empty($matchedUser->address) && !empty($validated['address'])) {
                    $matchedUser->address = $validated['address'];
                    $userNeedsUpdate = true;
                }
                if (str_starts_with((string)$matchedUser->firebase_uid, 'tg_') && empty($matchedUser->telegram_chat_id)) {
                    $matchedUser->telegram_chat_id = substr($matchedUser->firebase_uid, 3);
                    $matchedUser->notif_telegram = true;
                    $userNeedsUpdate = true;
                }
                if ($userNeedsUpdate) {
                    try { $matchedUser->save(); } catch (\Throwable $t) {}
                }
            }

            // Create Order
            $order = Order::create([
                'user_id' => $orderUserUid,
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
            if (!empty($orderUserUid)) {
                \App\Models\UserCartItem::where('firebase_uid', $orderUserUid)->delete();
            }

            // Only dispatch Telegram notifications on order creation if payment is COD (Cash on Delivery).
            // For online payments (Bakong KHQR, ABA PAY, Card), notifications MUST ONLY be sent
            // AFTER the customer has actually completed payment, preventing premature alerts and speeding up checkout!
            $isCod = in_array(strtolower($order->payment_method ?? 'cod'), ['cod', 'cash', 'cash_on_delivery']);
            if ($isCod) {
                $orderId = $order->id;
                $emailToSend = (!empty($customerEmail) && filter_var($customerEmail, FILTER_VALIDATE_EMAIL) && !str_ends_with($customerEmail, '@telegram.s-tech-store.tech') && !str_ends_with($customerEmail, '@tiktok.s-tech-store.tech')) ? $customerEmail : null;

                app()->terminating(function () use ($orderId, $emailToSend) {
                    try {
                        $freshOrder = Order::with('items.product')->find($orderId);
                        if (!$freshOrder) return;

                        try {
                            \App\Services\TelegramService::sendOrderNotification($freshOrder);
                            \App\Services\TelegramService::sendFinanceAlert([
                                'type' => 'New Order (COD - Pending Payment on Delivery)',
                                'amount' => $freshOrder->total_amount,
                                'method' => 'COD',
                                'order_id' => $freshOrder->order_id ?? ('#ORD-' . $freshOrder->id),
                                'customer' => $freshOrder->customer_name ?? 'Customer',
                            ]);
                        } catch (\Throwable $t) {
                            \Illuminate\Support\Facades\Log::warning("Telegram order notification non-critical error: " . $t->getMessage());
                        }

                        try {
                            \App\Services\TelegramService::sendCustomerDirectOrderAlert($freshOrder, 'created');
                        } catch (\Throwable $t) {
                            \Illuminate\Support\Facades\Log::warning("Customer direct telegram order alert skipped: " . $t->getMessage());
                        }

                        // Auto-dispatch Luxury HTML Order Invoice Email to customer's Gmail
                        if ($emailToSend) {
                            try {
                                OrderController::sendOrderEmail(
                                    $freshOrder,
                                    $emailToSend,
                                    'ការកុម្ម៉ង់ទំនិញទទួលបានជោគជ័យ (Order Placed - COD)',
                                    "សូមអរគុណចំពោះការកុម្ម៉ង់ទំនិញនៅ S Tech Store Cambodia! ការបញ្ជាទិញរបស់អ្នក (#{$freshOrder->order_id}) ត្រូវបានកត់ត្រាចូលក្នុងប្រព័ន្ធរួចរាល់ហើយ។ វិក្កយបត្រអេឡិចត្រូនិចផ្លូវការត្រូវបានភ្ជាប់មកជាមួយអ៊ីមែលនេះ។"
                                );
                            } catch (\Throwable $mailErr) {
                                \Illuminate\Support\Facades\Log::warning("Order placement COD email dispatch failed: " . $mailErr->getMessage());
                            }
                        }
                    } catch (\Throwable $bgErr) {
                        \Illuminate\Support\Facades\Log::error("Background COD dispatch error: " . $bgErr->getMessage());
                    }
                });
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
     * GET /api/orders/{idOrOrderId}
     * Public order & invoice lookup endpoint
     */
    public function show(Request $request, $idOrOrderId)
    {
        $cleanId = ltrim($idOrOrderId, '#');

        // Check if caller is authenticated admin or staff
        $authHeader = $request->header('Authorization', '');
        $token = str_starts_with($authHeader, 'Bearer ') ? substr($authHeader, 7) : ($request->header('X-Admin-Token') ?: $request->cookie('stech_admin_token'));
        $adminUser = $token ? \App\Services\AdminTokenService::validateToken($token) : null;
        $isAdmin = $adminUser && ($adminUser->isAdmin() || $adminUser->isStaff());

        // Numeric incremental ID (1, 2, 3...) is STRICTLY restricted to Admin/Staff to prevent enumeration IDOR attacks
        if (is_numeric($cleanId)) {
            if (!$isAdmin) {
                return response()->json([
                    'success' => false,
                    'error' => 'ការស្វែងរកតាមលេខសម្គាល់លេខ (Numeric ID) ត្រូវបានហាមឃាត់! សូមប្រើប្រាស់កូដ Order ID (ឧ. ORD-XXXX) ដែលមានលើវិក្កយបត្រ។',
                ], 403);
            }
            $order = Order::where('id', (int)$cleanId)->with('items.product')->first();
        } else {
            // Public / Customer lookup via secure alphanumeric Order ID (e.g. ORD-1718293...)
            $order = Order::where('order_id', $cleanId)
                ->orWhere('order_id', '#' . $cleanId)
                ->with('items.product')
                ->first();
        }

        if (!$order) {
            return response()->json(['success' => false, 'error' => 'Order not found'], 404);
        }

        return response()->json([
            'success' => true,
            'order' => $order,
        ]);
    }

    /**
     * POST /api/orders/{idOrOrderId}/mark-failed
     * Sets order status and payment_status to 'failed' (បរាជ័យ) when checkout or payment fails
     */
    public function markFailed(Request $request, $idOrOrderId)
    {
        $cleanId = ltrim($idOrOrderId, '#');

        // Check Admin privilege
        $authHeader = $request->header('Authorization', '');
        $token = str_starts_with($authHeader, 'Bearer ') ? substr($authHeader, 7) : ($request->header('X-Admin-Token') ?: $request->cookie('stech_admin_token'));
        $adminUser = $token ? \App\Services\AdminTokenService::validateToken($token) : null;
        $isAdmin = $adminUser && ($adminUser->isAdmin() || $adminUser->isStaff());

        // Prohibit numeric ID manipulation for non-admins
        if (is_numeric($cleanId) && !$isAdmin) {
            return response()->json([
                'success' => false,
                'error' => 'Forbidden: Invalid order identifier',
            ], 403);
        }

        $order = Order::where('order_id', $cleanId)
            ->orWhere('order_id', '#' . $cleanId);
        if ($isAdmin && is_numeric($cleanId)) {
            $order = $order->orWhere('id', (int)$cleanId);
        }
        $order = $order->first();

        if (!$order) {
            return response()->json(['success' => false, 'error' => 'Order not found'], 404);
        }

        // Integrity Protection: Never allow marking an already paid, processing, or completed order as failed
        if (in_array($order->payment_status, ['paid', 'completed']) || in_array($order->status, ['processing', 'completed', 'delivered'])) {
            return response()->json([
                'success' => false,
                'error' => 'ការបញ្ជាទិញនេះត្រូវបានទូទាត់ ឬកំពុងរៀបចំរួចរាល់ហើយ មិនអាចកំណត់ថាបរាជ័យបានឡើយ (Order already paid/processed).',
            ], 422);
        }

        $reason = $request->input('reason', 'Payment or checkout failed');

        $order->status = 'failed';
        $order->payment_status = 'failed';
        
        $details = json_decode($order->payment_details ?: '{}', true) ?: [];
        $details['failure_reason'] = $reason;
        $details['failed_at'] = now()->toIso8601String();
        $order->payment_details = json_encode($details);
        $order->save();

        try {
            \App\Services\TelegramService::sendFinanceAlert([
                'type' => '❌ ការបញ្ជាទិញបរាជ័យ (ORDER PAYMENT FAILED)',
                'amount' => $order->total_amount,
                'method' => strtoupper($order->payment_method ?? 'ONLINE'),
                'order_id' => $order->order_id ?? ('#ORD-' . $order->id),
                'customer' => $order->customer_name ?? 'Customer',
                'reason' => $reason,
            ]);
        } catch (\Throwable $t) {
            Log::warning("Telegram finance alert on order failure: " . $t->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Order marked as failed (បរាជ័យ)',
            'order' => $order,
        ]);
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
            'status' => 'required|string|in:pending,processing,shipped,delivered,completed,cancelled,failed',
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
                'failed' => "❌ ការបញ្ជាទិញបរាជ័យ (Failed)",
            ];

            $statusMessages = [
                'pending' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានដាក់ស្នើ និងកំពុងរង់ចាំការបញ្ជាក់ (Pending)។",
                'processing' => "ការបញ្ជាទិញ #{$order->order_id} កំពុងត្រូវបានរៀបចំវេចខ្ចប់ដោយហាង (Processing)។",
                'shipped' => "ការបញ្ជាទិញ #{$order->order_id} កំពុងធ្វើដំណើរលើផ្លូវដឹកជញ្ជូនជូនលោកអ្នក (Shipped)" . ($order->tracking_number ? " [កូដបញ្ញើ: {$order->tracking_number}]" : "") . "។",
                'delivered' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានដឹកជញ្ជូនដល់ជោគជ័យ។ សូមអរគុណសម្រាប់ការគាំទ្រ S Tech Store! (Delivered)",
                'cancelled' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានបោះបង់ (Cancelled)។",
                'failed' => "ការបញ្ជាទិញ #{$order->order_id} មិនបានជោគជ័យឡើយ (Failed)។",
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
            'status' => 'nullable|string|in:pending,processing,shipped,delivered,completed,cancelled,failed',
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
                'failed' => "❌ ការបញ្ជាទិញបរាជ័យ (Failed)",
            ];

            $statusMessages = [
                'pending' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានដាក់ស្នើ និងកំពុងរង់ចាំការបញ្ជាក់ (Pending)។",
                'processing' => "ការបញ្ជាទិញ #{$order->order_id} កំពុងត្រូវបានរៀបចំវេចខ្ចប់ដោយហាង (Processing)។",
                'shipped' => "ការបញ្ជាទិញ #{$order->order_id} កំពុងធ្វើដំណើរលើផ្លូវដឹកជញ្ជូនជូនលោកអ្នក (Shipped)" . ($order->tracking_number ? " [កូដបញ្ញើ: {$order->tracking_number}]" : "") . "។",
                'delivered' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានដឹកជញ្ជូនដល់ជោគជ័យ។ សូមអរគុណសម្រាប់ការគាំទ្រ S Tech Store! (Delivered)",
                'cancelled' => "ការបញ្ជាទិញ #{$order->order_id} ត្រូវបានបោះបង់ (Cancelled)។",
                'failed' => "ការបញ្ជាទិញ #{$order->order_id} មិនបានជោគជ័យឡើយ (Failed)។",
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
            'status' => 'nullable|string|in:pending,processing,shipped,delivered,completed,cancelled,failed',
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

        // 2. Telegram & Email Notifications (Dispatched asynchronously after response flush for 0ms UI delay)
        $chatId = \App\Services\TelegramService::resolveCustomerChatId($user ?: $order, $order->customer_phone, $customerEmail);
        if ($chatId) {
            $hasTelegram = true;
            if ($wantTelegram) {
                $sentToTelegram = true;
            }
        }

        // 3. Real Email Notification (Dispatch to customer's real Gmail / email inbox)
        $isSyntheticEmail = empty($customerEmail) || 
                            str_ends_with($customerEmail, '@s-tech-store.tech') || 
                            str_ends_with($customerEmail, '@telegram.s-tech-store.tech') ||
                            str_ends_with($customerEmail, '@tiktok.s-tech-store.tech');

        $emailError = null;
        if ($wantEmail && !empty($customerEmail) && !$isSyntheticEmail && filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            $sentToEmail = true;
        } elseif ($wantEmail && ($isSyntheticEmail || empty($customerEmail))) {
            $emailError = "អ៊ីមែលអតិថិជនជា Synthetic Placeholder (មិនមែន Real Gmail)";
        }

        // Asynchronously dispatch external network calls post-response
        $orderId = $order->id;
        $orderUserId = $user?->id;
        $orderOldStatus = $oldStatus;
        $orderNewStatus = $order->status;
        $rawMessage = $validated['message'];
        $doTelegram = $wantTelegram && $hasTelegram;
        $doEmail = $sentToEmail;

        if ($doTelegram || $doEmail) {
            app()->terminating(function () use ($orderId, $orderUserId, $orderOldStatus, $orderNewStatus, $notificationTitle, $rawMessage, $customerEmail, $doTelegram, $doEmail) {
                try {
                    $order = Order::with('items.product')->find($orderId);
                    if (!$order) return;
                    $user = $orderUserId ? \App\Models\UserProfile::find($orderUserId) : null;

                    if ($doTelegram) {
                        try {
                            \App\Services\TelegramService::sendCustomerDirectNotification(
                                $user ?: $order,
                                $notificationTitle,
                                $rawMessage,
                                '/orders'
                            );
                        } catch (\Throwable $t) {
                            \Illuminate\Support\Facades\Log::warning("Customer direct telegram push notification failed: " . $t->getMessage());
                        }

                        if ($orderOldStatus !== $orderNewStatus) {
                            try {
                                \App\Services\TelegramService::sendCustomerDirectOrderAlert($order, 'status_updated');
                            } catch (\Throwable $t) {}
                        }
                    }

                    if ($doEmail && !empty($customerEmail)) {
                        try {
                            self::sendOrderEmail($order, $customerEmail, $notificationTitle, $rawMessage);
                        } catch (\Throwable $t) {
                            \Illuminate\Support\Facades\Log::warning("Real email order notification failed: " . $t->getMessage());
                        }
                    }
                } catch (\Throwable $bgErr) {
                    \Illuminate\Support\Facades\Log::error("Background updateStatus dispatch error: " . $bgErr->getMessage());
                }
            });
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
     * Generate standalone printable HTML invoice file content (A4 / PDF print ready)
     */
    public static function generateInvoiceHtml(Order $order): string
    {
        $orderId = htmlspecialchars($order->order_id ?: ('#' . $order->id));
        $date = $order->created_at ? $order->created_at->format('d M Y, h:i A') : date('d M Y, h:i A');
        $customerName = htmlspecialchars($order->customer_name ?: 'អតិថិជនកិត្តិយស');
        $customerPhone = htmlspecialchars($order->customer_phone ?: 'N/A');
        $customerEmail = htmlspecialchars($order->customer_email ?: 'N/A');
        $shippingAddress = htmlspecialchars($order->shipping_address ?: 'N/A');
        $paymentMethod = htmlspecialchars(strtoupper($order->payment_method ?: 'COD'));
        $paymentStatus = htmlspecialchars(strtoupper($order->payment_status ?: 'PENDING'));
        $orderStatus = htmlspecialchars(strtoupper($order->status ?: 'PROCESSING'));
        $totalFormatted = number_format((float)$order->total_amount, 2);

        $itemsRows = '';
        $subtotal = 0.0;
        if ($order->relationLoaded('items') && $order->items->count() > 0) {
            foreach ($order->items as $idx => $item) {
                $num = $idx + 1;
                $prodName = htmlspecialchars($item->product->name ?? 'គ្រឿងបច្ចេកវិទ្យា S Tech');
                $qty = (int)$item->quantity;
                $unitPrice = (float)$item->unit_price;
                $itemTotal = (float)$item->subtotal;
                $subtotal += $itemTotal;
                $unitPriceFmt = number_format($unitPrice, 2);
                $itemTotalFmt = number_format($itemTotal, 2);

                $itemsRows .= "
                <tr>
                    <td style='padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: center;'>{$num}</td>
                    <td style='padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600;'>{$prodName}</td>
                    <td style='padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: center;'>{$qty}</td>
                    <td style='padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: right;'>\${$unitPriceFmt}</td>
                    <td style='padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;'>\${$itemTotalFmt}</td>
                </tr>";
            }
        }
        $subtotalFmt = number_format($subtotal > 0 ? $subtotal : (float)$order->total_amount, 2);

        $discountRow = '';
        if ((float)($order->discount_amount ?? 0) > 0) {
            $discountVal = number_format((float)$order->discount_amount, 2);
            $discountRow = "
            <tr>
                <td colspan='4' style='padding: 10px 14px; text-align: right; color: #16a34a; font-size: 13px; font-weight: 600;'>ការបញ្ចុះតម្លៃ (Discount / Voucher):</td>
                <td style='padding: 10px 14px; text-align: right; color: #16a34a; font-size: 13px; font-weight: 700;'>-\${$discountVal}</td>
            </tr>";
        }

        $trackingRow = '';
        if (!empty($order->tracking_number)) {
            $trackingRow = "<p><strong>Tracking Number:</strong> " . htmlspecialchars($order->tracking_number) . "</p>";
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - {$orderId} - S Tech Store Cambodia</title>
  <style>
    body { font-family: 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 30px 15px; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.06); padding: 40px; }
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .logo-img { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; border: 2px solid #dc2626; }
    .brand-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .brand-sub { font-size: 12px; color: #64748b; margin: 2px 0 0; }
    .inv-title-box { text-align: right; }
    .inv-title { font-size: 24px; font-weight: 900; color: #dc2626; margin: 0; letter-spacing: 1px; }
    .inv-number { font-family: monospace; font-size: 15px; color: #475569; margin: 4px 0 0; font-weight: 700; }
    .inv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 28px 0; }
    .inv-col h4 { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin: 0 0 8px; }
    .inv-col p { margin: 0 0 4px; font-size: 13px; color: #334155; line-height: 1.5; }
    .table-container { margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #f8fafc; padding: 12px 14px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-pending { background: #fef3c7; color: #b45309; }
    .summary-box { max-width: 360px; margin-left: auto; margin-top: 16px; }
    .total-row { background: #f8fafc; border-top: 2px solid #0f172a; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; margin-top: 8px; }
    .total-label { font-size: 14px; font-weight: 800; color: #0f172a; }
    .total-val { font-size: 20px; font-weight: 900; color: #dc2626; }
    .footer-note { margin-top: 36px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6; }
    .print-btn-bar { text-align: center; margin-bottom: 20px; }
    .print-btn { background: #dc2626; color: #ffffff; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(220,38,38,0.25); }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-btn-bar no-print">
    <button onclick="window.print()" class="print-btn">Print / Save as PDF</button>
  </div>
  <div class="invoice-card">
    <div class="inv-header">
      <div class="brand">
        <img src="https://www.s-tech-store.tech/logo.jpg" alt="Logo" class="logo-img" />
        <div>
          <h2 class="brand-title">S TECH STORE CAMBODIA</h2>
          <p class="brand-sub">មជ្ឈមណ្ឌលកុំព្យូទ័រ និងបច្ចេកវិទ្យាផ្លូវការ • រាជធានីភ្នំពេញ</p>
          <p class="brand-sub">Tel: +855 88 993 0032 | Web: www.s-tech-store.tech</p>
        </div>
      </div>
      <div class="inv-title-box">
        <h1 class="inv-title">វិក្កយបត្រផ្លូវការ</h1>
        <div class="inv-number">#{$orderId}</div>
        <div style="margin-top: 8px;">
          <span class="badge badge-paid">{$paymentStatus}</span>
        </div>
      </div>
    </div>

    <div class="inv-grid">
      <div class="inv-col">
        <h4>ព័ត៌មានអតិថិជន (Customer):</h4>
        <p><strong>{$customerName}</strong></p>
        <p>ទូរស័ព្ទ: {$customerPhone}</p>
        <p>អ៊ីមែល: {$customerEmail}</p>
        <p>អាសយដ្ឋានដឹកជញ្ជូន: {$shippingAddress}</p>
      </div>
      <div class="inv-col" style="text-align: right;">
        <h4>ព័ត៌មានវិក្កយបត្រ (Details):</h4>
        <p><strong>កាលបរិច្ឆេទ:</strong> {$date}</p>
        <p><strong>វិធីសាស្ត្រទូទាត់:</strong> {$paymentMethod}</p>
        <p><strong>ស្ថានភាពបញ្ជាទិញ:</strong> {$orderStatus}</p>
        {$trackingRow}
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>មុខទំនិញ (Description)</th>
            <th style="width: 70px; text-align: center;">ចំនួន</th>
            <th style="width: 110px; text-align: right;">តម្លៃរាយ</th>
            <th style="width: 120px; text-align: right;">សរុប</th>
          </tr>
        </thead>
        <tbody>
          {$itemsRows}
          {$discountRow}
        </tbody>
      </table>
    </div>

    <div class="summary-box">
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #64748b;">
        <span>សរុបមុខទំនិញ (Subtotal):</span>
        <span style="font-weight: 600; color: #0f172a;">\${$subtotalFmt}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #64748b;">
        <span>ថ្លៃដឹកជញ្ជូន (Shipping Fee):</span>
        <span style="font-weight: 600; color: #16a34a;">ឥតគិតថ្លៃ (FREE)</span>
      </div>
      <div class="total-row">
        <span class="total-label">ទឹកប្រាក់សរុប (Grand Total):</span>
        <span class="total-val">\${$totalFormatted} USD</span>
      </div>
    </div>

    <div class="footer-note">
      <p>សូមអរគុណចំពោះការជ្រើសរើសទិញទំនិញនៅ S Tech Store Cambodia! ទំនិញទាំងអស់ទទួលបានការធានាផ្លូវការពីក្រុមហ៊ុន។<br>
      សម្រាប់ជំនួយបច្ចេកទេស ឬចម្ងល់ផ្សេងៗ សូមទាក់ទង +855 88 993 0032 ឬចូលទៅកាន់ www.s-tech-store.tech</p>
    </div>
  </div>
</body>
</html>
HTML;
    }

    /**
     * Send luxury HTML order notification email to customer with attached printable invoice
     */
    public static function sendOrderEmail(Order $order, string $toEmail, string $title, string $message): array
    {
        try {
            $domain = 'https://www.s-tech-store.tech';
            $subject = "[S Tech Store] {$title} — Order #{$order->order_id}";

            $statusBadgeColor = match (strtolower($order->status)) {
                'pending' => '#d97706',
                'processing' => '#2563eb',
                'shipped' => '#7c3aed',
                'delivered' => '#16a34a',
                'cancelled' => '#dc2626',
                default => '#475569',
            };

            $statusText = match (strtolower($order->status)) {
                'pending' => 'រង់ចាំការបញ្ជាក់ • PENDING',
                'processing' => 'កំពុងរៀបចំទំនិញ • PROCESSING',
                'shipped' => 'កំពុងដឹកជញ្ជូន • SHIPPED',
                'delivered' => 'បានប្រគល់ជូនជោគជ័យ • DELIVERED',
                'cancelled' => 'បានបោះបង់ • CANCELLED',
                default => strtoupper($order->status),
            };

            $itemsHtml = '';
            if ($order->relationLoaded('items') && $order->items->count() > 0) {
                foreach ($order->items as $idx => $item) {
                    $prodName = htmlspecialchars($item->product->name ?? 'គ្រឿងបច្ចេកវិទ្យា S Tech');
                    $qty = (int)$item->quantity;
                    $unitPrice = number_format((float)$item->unit_price, 2);
                    $itemSubtotal = number_format((float)$item->subtotal, 2);
                    $rowBg = ($idx % 2 === 0) ? '#ffffff' : '#f8fafc';
                    $itemsHtml .= "
                    <tr style='background-color: {$rowBg};'>
                      <td style='padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600;'>{$prodName}</td>
                      <td style='padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #475569; font-weight: 700;'>×{$qty}</td>
                      <td style='padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #475569; font-mono font-weight: 600;'>\${$unitPrice}</td>
                      <td style='padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 800; color: #0f172a;'>\${$itemSubtotal}</td>
                    </tr>";
                }
            }

            $trackingRow = '';
            if (!empty($order->tracking_number)) {
                $trackingRow = "
                <tr>
                  <td style='padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; width: 38%; vertical-align: top;'>កូដតាមដានបញ្ញើ (Tracking):</td>
                  <td style='padding: 6px 0; font-size: 13px; color: #7c3aed; font-weight: 800; width: 62%; text-align: right; font-family: monospace;'>{$order->tracking_number}</td>
                </tr>";
            }

            $discountRow = '';
            if ((float)($order->discount_amount ?? 0) > 0) {
                $discountVal = number_format((float)$order->discount_amount, 2);
                $discountRow = "
                <tr>
                  <td style='padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; width: 38%; vertical-align: top;'>បញ្ចុះតម្លៃ Promo Code:</td>
                  <td style='padding: 6px 0; font-size: 13px; color: #16a34a; font-weight: 800; width: 62%; text-align: right;'>-\${$discountVal} USD</td>
                </tr>";
            }

            $totalFormatted = number_format((float)$order->total_amount, 2);
            $cleanTitle = htmlspecialchars($title);
            $cleanMsg = nl2br(htmlspecialchars($message));
            $customerName = htmlspecialchars($order->customer_name ?: 'អតិថិជនកិត្តិយស');
            $customerPhone = htmlspecialchars($order->customer_phone ?: 'N/A');
            $shippingAddress = htmlspecialchars($order->shipping_address ?: 'N/A');
            $paymentMethod = htmlspecialchars(strtoupper($order->payment_method ?: 'COD'));

            $htmlContent = <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>{$subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Koh Santepheap', 'Battambang', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 24px 12px; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 12px 35px rgba(0,0,0,0.06);">
    <!-- Top Signature Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #8B1A1A 0%, #a82020 60%, #6e1313 100%); padding: 34px 24px 28px; text-align: center;">
        <img src="{$domain}/logo.jpg" alt="S Tech Store" width="68" height="68" style="width: 68px; height: 68px; border-radius: 18px; object-fit: cover; border: 2px solid rgba(255,255,255,0.3); display: inline-block; margin-bottom: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.25);" />
        <h1 style="margin: 0; font-size: 21px; font-weight: 900; letter-spacing: 0.8px; color: #ffffff !important; text-transform: uppercase;">
          S Tech Store Cambodia
        </h1>
        <p style="margin: 5px 0 0; font-size: 12px; color: #fecaca !important; font-weight: 500;">
          បច្ចុប្បន្នភាពការបញ្ជាទិញ & សេវាដឹកជញ្ជូនរហ័ស • www.s-tech-store.tech
        </p>
      </td>
    </tr>

    <!-- Main Content Area -->
    <tr>
      <td style="padding: 28px 24px 32px;">
        <!-- Status Pill -->
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 18px;">
          <tr>
            <td style="background-color: {$statusBadgeColor}; color: #ffffff !important; font-size: 11px; font-weight: 800; padding: 6px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.8px;">
              {$statusText}
            </td>
          </tr>
        </table>

        <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 14px;">
          ជំរាបសួរលោកអ្នក <span style="color: #8B1A1A;">{$customerName}</span>,
        </h2>

        <!-- Alert Notification Box -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #8B1A1A; border-radius: 0 14px 14px 0; margin-bottom: 22px;">
          <tr>
            <td style="padding: 16px 18px;">
              <div style="font-weight: 800; font-size: 14px; color: #8B1A1A; margin-bottom: 5px;">
                {$cleanTitle}
              </div>
              <div style="font-size: 13px; line-height: 1.6; color: #334155;">
                {$cleanMsg}
              </div>
            </td>
          </tr>
        </table>

        <!-- Order Information Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 20px; margin-bottom: 22px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          <tr>
            <td style="padding: 4px 4px 14px 4px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <span style="font-family: monospace; font-size: 18px; font-weight: 900; color: #8B1A1A;">
                      #{$order->order_id}
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #64748b; font-weight: 600;">
                      វិធីសាស្ត្រទូទាត់៖ <strong style="color: #0f172a; font-weight: 800;">{$paymentMethod}</strong>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 14px 4px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; width: 38%; vertical-align: top;">
                    អតិថិជន (Customer):
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700; width: 62%; text-align: right;">
                    {$customerName} ({$customerPhone})
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; width: 38%; vertical-align: top;">
                    អាសយដ្ឋានដឹកជញ្ជូន:
                  </td>
                  <td style="padding: 6px 0; font-size: 12px; color: #334155; font-weight: 600; width: 62%; text-align: right; line-height: 1.5;">
                    {$shippingAddress}
                  </td>
                </tr>
                {$trackingRow}
                {$discountRow}
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding-top: 10px;">
              <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;">
                បញ្ជីមុខទំនិញដែលបានកុម្ម៉ង់ (Order Items):
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; width: 100%;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="padding: 10px 12px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; text-align: left; border-bottom: 1px solid #e2e8f0;">ទំនិញ</th>
                    <th style="padding: 10px 10px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; text-align: center; border-bottom: 1px solid #e2e8f0;">ចំនួន</th>
                    <th style="padding: 10px 12px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; text-align: right; border-bottom: 1px solid #e2e8f0;">តម្លៃរាយ</th>
                    <th style="padding: 10px 12px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; text-align: right; border-bottom: 1px solid #e2e8f0;">សរុប</th>
                  </tr>
                </thead>
                <tbody>
                  {$itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Grand Total Box -->
          <tr>
            <td style="padding-top: 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #fef2f2; border: 1px dashed #f87171; border-radius: 12px; padding: 14px 18px;">
                <tr>
                  <td align="left" style="font-size: 14px; font-weight: 800; color: #1e293b;">
                    សរុបទឹកប្រាក់ត្រូវទូទាត់ (Total):
                  </td>
                  <td align="right" style="font-size: 20px; font-weight: 900; color: #8B1A1A; font-family: monospace;">
                    \${$totalFormatted} USD
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- ── 1-CLICK INVOICE DOWNLOAD HUB (PDF & JPG IMAGE) ── -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 18px; padding: 18px 20px; margin-bottom: 24px; text-align: center;">
          <tr>
            <td>
              <div style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                🧾 វិក្កយបត្រអេឡិចត្រូនិចផ្លូវការ (Official Invoice)
              </div>
              <p style="font-size: 12px; color: #374151; margin: 0 0 14px; line-height: 1.5;">
                ដើម្បីភាពងាយស្រួល លោកអ្នកអាចទាញយកវិក្កយបត្រទុកក្នុងទូរស័ព្ទជា <strong>រូបភាព JPG</strong> (រក្សាទុកក្នុង Photos) ឬ <strong>ឯកសារ PDF</strong> បានភ្លាមៗ៖
              </p>
              <div>
                <a href="{$domain}/api/invoice-image?order_id={$order->order_id}&download=1" target="_blank" style="display: inline-block; background: #0284c7; color: #ffffff !important; font-weight: 800; font-size: 12px; padding: 11px 22px; border-radius: 10px; text-decoration: none; margin: 4px; box-shadow: 0 4px 12px rgba(2,132,199,0.25);">
                  📸 ទាញយកជារូបភាព JPG
                </a>
                <a href="{$domain}/orders?verify={$order->order_id}&print=1" target="_blank" style="display: inline-block; background: #8B1A1A; color: #ffffff !important; font-weight: 800; font-size: 12px; padding: 11px 22px; border-radius: 10px; text-decoration: none; margin: 4px; box-shadow: 0 4px 12px rgba(139,26,26,0.25);">
                  📄 ទាញយកជា PDF / Print
                </a>
              </div>
            </td>
          </tr>
        </table>

        <!-- 24/7 Telegram Direct Assistant Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #0f172a; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <tr>
            <td>
              <div style="display: inline-block; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 3px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 8px;">
                TELEGRAM BOT 24/7
              </div>
              <div style="font-size: 14px; font-weight: 800; color: #ffffff !important; margin-bottom: 4px;">
                💬 តាមដាន និងជជែកជាមួយ Telegram Bot ផ្លូវការ
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin: 0 0 14px;">
                លោកអ្នកអាចសាកសួរព័ត៌មានលម្អិត និងឆែកការដឹកជញ្ជូនទំនិញភ្លាមៗតាម Telegram។
              </p>
              <a href="https://t.me/S_TECH_ASSISTANTBOT" target="_blank" style="display: inline-block; background: #0088cc; color: #ffffff !important; font-weight: 800; font-size: 12px; padding: 10px 24px; border-radius: 10px; text-decoration: none;">
                បើក Telegram Assistant Bot (@S_TECH_ASSISTANTBOT)
              </a>
            </td>
          </tr>
        </table>

        <!-- Tracking Links -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="text-align: center; margin-top: 10px;">
          <tr>
            <td>
              <a href="{$domain}/orders" target="_blank" style="display: inline-block; background: #8B1A1A; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 13px; padding: 12px 26px; border-radius: 10px; margin: 4px; box-shadow: 0 4px 15px rgba(139,26,26,0.25);">
                តាមដានការបញ្ជាទិញ (Track Order)
              </a>
              <a href="{$domain}/products" target="_blank" style="display: inline-block; background: #f1f5f9; color: #334155 !important; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 22px; border-radius: 10px; margin: 4px; border: 1px solid #cbd5e1;">
                រុករកទំនិញ (Products)
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #f8fafc; padding: 22px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.6;">
        <p style="margin: 0 0 4px;">ទូរស័ព្ទ: +855 88 993 0032 | ទីតាំង: រាជធានីភ្នំពេញ កម្ពុជា</p>
        <p style="margin: 0;">
          © 2026 S Tech Store Cambodia. រក្សាសិទ្ធិគ្រប់យ៉ាង។<br>
          គេហទំព័រផ្លូវការ: <a href="{$domain}" style="color: #8B1A1A; text-decoration: none; font-weight: 700;">https://www.s-tech-store.tech</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;

            // Prepare attachments: Fetch high-resolution JPG/PNG invoice image with fast failover
            $attachments = [];
            try {
                $imageRes = Http::connectTimeout(1.0)->timeout(2.0)->get("{$domain}/api/invoice-image?order_id={$order->order_id}");
                if ($imageRes->successful() && strlen($imageRes->body()) > 500) {
                    $attachments[] = [
                        'name' => "Invoice_{$order->order_id}.png",
                        'data' => $imageRes->body(),
                        'mime' => 'image/png',
                    ];
                }
            } catch (\Throwable $imgErr) {
                Log::warning("Invoice image pre-fetch skipped: " . $imgErr->getMessage());
            }

            // Fallback: If image fetch failed, attach clean HTML invoice
            if (empty($attachments)) {
                $invoiceHtml = self::generateInvoiceHtml($order);
                $attachments[] = [
                    'name' => "Invoice_{$order->order_id}.html",
                    'data' => $invoiceHtml,
                    'mime' => 'text/html',
                ];
            }

            return \App\Services\EmailService::dispatchHtmlEmail($toEmail, $subject, $htmlContent, [
                'order_id' => $order->order_id,
                'from_name' => 'S Tech Store Cambodia',
                'from_email' => 'orders@s-tech-store.tech',
                'reply_to' => 'support@s-tech-store.tech',
                'attachments' => $attachments,
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
