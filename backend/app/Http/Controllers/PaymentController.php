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

        $tranId = 'MANUAL_' . strtoupper(uniqid());
        $method = $request->input('method', 'khqr');

        $updated = PaymentService::markOrderAsPaid($order, $tranId, $method, [
            'mode' => 'customer_confirmed',
            'note' => 'Customer confirmed KHQR transfer from banking app',
            'timestamp' => now()->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'បានផ្ទៀងផ្ទាត់ការទូទាត់ជោគជ័យ! (Payment Verified)',
            'order' => $updated,
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
