<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * POST /api/payment/session
     * Generates dynamic KHQR string, QR code image, and banking app deeplinks
     */
    public function createSession(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|string',
            'method' => 'nullable|string|in:khqr,aba,bakong,visa,card',
            'currency' => 'nullable|string|in:USD,KHR',
        ]);

        $order = Order::where('order_id', $validated['order_id'])
            ->orWhere('id', $validated['order_id'])
            ->firstOrFail();

        $session = PaymentService::createPaymentSession(
            $order,
            $validated['method'] ?? 'khqr',
            $validated['currency'] ?? 'USD'
        );

        return response()->json([
            'success' => true,
            'session' => $session,
        ]);
    }

    /**
     * POST /api/payment/card
     * Processes Visa / Mastercard credit/debit card payment
     */
    public function processCard(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|string',
            'number' => 'required|string',
            'exp_month' => 'required|string',
            'exp_year' => 'required|string',
            'cvv' => 'required|string|min:3|max:4',
            'name' => 'nullable|string|max:100',
        ]);

        $order = Order::where('order_id', $validated['order_id'])
            ->orWhere('id', $validated['order_id'])
            ->firstOrFail();

        if ($order->payment_status === 'paid') {
            return response()->json([
                'success' => true,
                'message' => 'ការបញ្ជាទិញនេះត្រូវបានទូទាត់រួចរាល់ហើយ (Already Paid)',
                'order' => $order,
            ]);
        }

        $result = PaymentService::processCard($order, $validated);

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    /**
     * GET /api/payment/check/{orderId}
     * Real-time payment verification polling
     */
    public function checkStatus($orderId)
    {
        $status = PaymentService::checkTransactionStatus($orderId);
        return response()->json($status);
    }

    /**
     * POST /api/payment/confirm-manual/{orderId}
     * Customer clicked "I Have Completed Payment" or manual bank slip confirmation
     */
    public function confirmManual(Request $request, $orderId)
    {
        $order = Order::where('order_id', $orderId)
            ->orWhere('id', $orderId)
            ->firstOrFail();

        // Ownership Verification: Ensure caller is authorized to confirm this order
        $clientUid = $request->header('X-Firebase-UID');
        if (!empty($order->user_id) && !empty($clientUid) && $order->user_id !== $clientUid) {
            return response()->json([
                'success' => false,
                'message' => 'គ្មានសិទ្ធិផ្ទៀងផ្ទាត់ Order របស់គណនីផ្សេងឡើយ (Forbidden)',
            ], 403);
        }

        // Automatic Bank Status Verification (Bakong / ABA)
        $statusCheck = PaymentService::checkTransactionStatus($order->order_id);
        if ($statusCheck['paid'] ?? false) {
            return response()->json([
                'success' => true,
                'message' => 'បានផ្ទៀងផ្ទាត់ការទូទាត់ជាមួយធនាគារជោគជ័យ! (Payment Auto-Verified by Bank Gateway)',
                'order' => $order->fresh(),
            ]);
        }

        // When not yet verified automatically by bank API, flag as pending_verification
        // This alerts staff to check bank statement and prevents unauthorized order dispatch
        $tranId = 'MANUAL_' . strtoupper(uniqid());
        $method = $request->input('method', 'khqr');

        $order->payment_status = 'pending_verification';
        $order->payment_method = $method;
        $order->transaction_id = $tranId;
        $order->payment_details = json_encode([
            'mode' => 'customer_claimed_transfer',
            'note' => 'Customer submitted transfer confirmation. Awaiting bank verification.',
            'timestamp' => now()->toIso8601String(),
            'ip' => $request->ip(),
        ]);
        $order->save();

        return response()->json([
            'success' => true,
            'message' => 'បានទទួលការបញ្ជាក់ការបង់ប្រាក់! ក្រុមការងារនឹងផ្ទៀងផ្ទាត់ជាមួយធនាគាររួចរៀបចំទំនិញជូនលោកអ្នក (Awaiting Bank Verification)',
            'order' => $order,
            'transaction_id' => $tranId,
        ]);
    }

    /**
     * POST /api/payment/webhook
     * Public Webhook callback from ABA PayWay or Bakong
     */
    public function webhook(Request $request)
    {
        Log::info('Payment Webhook received: ', $request->all());

        // Secret / Signature Verification
        $webhookSecret = env('PAYMENT_WEBHOOK_SECRET');
        if (!empty($webhookSecret)) {
            $headerSecret = $request->header('X-Webhook-Secret') ?: $request->header('X-Signature');
            if ($headerSecret !== $webhookSecret) {
                Log::warning("Unauthorized payment webhook invocation from IP: " . $request->ip());
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }

        $tranId = $request->input('tran_id') ?: $request->input('transaction_id') ?: $request->input('hash');
        $status = $request->input('status');

        if ($tranId) {
            $order = Order::where('order_id', $tranId)->orWhere('transaction_id', $tranId)->first();
            if ($order && ($status === 'SUCCESS' || $status == 0 || $request->input('response_code') == 0)) {
                PaymentService::markOrderAsPaid($order, $tranId, 'webhook', $request->all());
                return response()->json(['status' => 'success', 'message' => 'Order marked as paid']);
            }
        }

        return response()->json(['status' => 'received']);
    }
}
