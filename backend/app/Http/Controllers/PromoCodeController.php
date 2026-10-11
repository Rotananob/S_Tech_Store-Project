<?php

namespace App\Http\Controllers;

use App\Models\PromoCode;
use Illuminate\Http\Request;

class PromoCodeController extends Controller
{
    public function index(Request $request)
    {
        $query = PromoCode::latest();
        if ($request->boolean('active_only')) {
            $query->where('status', 'active');
        }
        return response()->json($query->get());
    }

    public function activePopup()
    {
        $promo = PromoCode::where('status', 'active')
            ->where('show_popup', true)
            ->where(function ($q) {
                $q->whereNull('valid_until')->orWhere('valid_until', '>=', now());
            })
            ->latest()
            ->first();

        return response()->json([
            'success' => true,
            'data' => $promo,
        ]);
    }

    public function validatePromo(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'subtotal' => 'nullable|numeric|min:0',
        ]);

        $code = strtoupper(trim($validated['code']));
        $promo = PromoCode::whereRaw('UPPER(code) = ?', [$code])->first();

        if (!$promo) {
            return response()->json([
                'success' => false,
                'message' => 'កូដប្រូម៉ូសិនមិនត្រឹមត្រូវ (Invalid promo code)',
            ], 404);
        }

        if ($promo->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'កូដប្រូម៉ូសិននេះមិនទាន់បើកដំណើរការ ឬត្រូវបានបិទ (Promotion is inactive)',
            ], 400);
        }

        $now = now();
        if ($promo->valid_from && $now->lessThan($promo->valid_from)) {
            return response()->json([
                'success' => false,
                'message' => 'កូដប្រូម៉ូសិននេះមិនទាន់ដល់កាលបរិច្ឆេទអនុវត្តនៅឡើយ (Not yet valid)',
            ], 400);
        }

        if ($promo->valid_until && $now->greaterThan($promo->valid_until)) {
            return response()->json([
                'success' => false,
                'message' => 'កូដប្រូម៉ូសិននេះបានផុតកំណត់សុពលភាពហើយ (Promotion expired)',
            ], 400);
        }

        if ($promo->usage_max && $promo->usage_count >= $promo->usage_max) {
            return response()->json([
                'success' => false,
                'message' => 'កូដប្រូម៉ូសិននេះត្រូវបានប្រើប្រាស់អស់ចំនួនកំណត់ហើយ (Usage limit reached)',
            ], 400);
        }

        $subtotal = (float)($validated['subtotal'] ?? 0);
        $discount = 0;
        if ($promo->type === 'percentage') {
            $discount = ($subtotal * (float)$promo->value) / 100;
        } else {
            $discount = (float)$promo->value;
        }

        if ($subtotal > 0 && $discount > $subtotal) {
            $discount = $subtotal;
        }

        return response()->json([
            'success' => true,
            'message' => "បានអនុវត្តកូដ {$promo->code} ដោយជោគជ័យ!",
            'data' => [
                'id' => $promo->id,
                'code' => $promo->code,
                'name' => $promo->name,
                'type' => $promo->type,
                'value' => (float)$promo->value,
                'discount_amount' => round($discount, 2),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:promo_codes',
            'type' => 'required|in:percentage,fixed',
            'value' => 'required|numeric|min:0',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date|after_or_equal:valid_from',
            'usage_max' => 'nullable|integer|min:1',
            'status' => 'required|in:active,scheduled,expired,disabled',
            'auto_applied' => 'nullable|boolean',
            'image_url' => 'nullable|string',
            'show_popup' => 'nullable|boolean',
            'description' => 'nullable|string',
            'target_url' => 'nullable|string',
        ]);

        $promo = PromoCode::create($validated);
        return response()->json(['message' => 'Promo code created', 'data' => $promo], 201);
    }

    public function update(Request $request, $id)
    {
        $promo = PromoCode::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'nullable|string|max:50|unique:promo_codes,code,' . $promo->id,
            'type' => 'sometimes|required|in:percentage,fixed',
            'value' => 'sometimes|required|numeric|min:0',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date|after_or_equal:valid_from',
            'usage_max' => 'nullable|integer|min:1',
            'status' => 'sometimes|required|in:active,scheduled,expired,disabled',
            'auto_applied' => 'nullable|boolean',
            'image_url' => 'nullable|string',
            'show_popup' => 'nullable|boolean',
            'description' => 'nullable|string',
            'target_url' => 'nullable|string',
        ]);

        $promo->update($validated);
        return response()->json(['message' => 'Promo code updated', 'data' => $promo]);
    }

    public function destroy($id)
    {
        $promo = PromoCode::findOrFail($id);
        $promo->delete();
        return response()->json(['message' => 'Promo code deleted']);
    }
}
