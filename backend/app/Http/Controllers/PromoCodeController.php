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

        $rawCode = trim($validated['code']);
        $code = strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', $rawCode));

        // Built-in store promo configurations for instant reliability
        $builtInCodes = [
            'STECH20' => ['name' => 'S Tech Promo 20% OFF', 'type' => 'percentage', 'value' => 20.00, 'description' => 'បញ្ចុះតម្លៃ ២០% លើគ្រប់ទំនិញ IT'],
            'PROMO' => ['name' => 'October Mega Sale 20% OFF', 'type' => 'percentage', 'value' => 20.00, 'description' => 'ប្រូម៉ូសិនពិសេសប្រចាំខែ ២០%'],
            'STECH10' => ['name' => 'S Tech Member 10% OFF', 'type' => 'percentage', 'value' => 10.00, 'description' => 'បញ្ចុះតម្លៃ ១០% សម្រាប់សមាជិក'],
            'WELCOME' => ['name' => 'ស្វាគមន៍អតិថិជនថ្មី $10 OFF', 'type' => 'fixed', 'value' => 10.00, 'description' => 'កាដូស្វាគមន៍អតិថិជនថ្មី បញ្ចុះ $10 ភ្លាមៗ'],
            'VIP10' => ['name' => 'VIP Member 10% OFF', 'type' => 'percentage', 'value' => 10.00, 'description' => 'បញ្ចុះតម្លៃ ១០% សម្រាប់ VIP Member'],
            'PCHUM' => ['name' => 'ប្រូម៉ូសិន ភ្ជុំបិណ្ឌ 30% OFF', 'type' => 'percentage', 'value' => 30.00, 'description' => 'បញ្ចុះតម្លៃ ៣០% ពិធីបុណ្យភ្ជុំបិណ្ឌ'],
        ];

        $promo = PromoCode::whereRaw('UPPER(TRIM(code)) = ?', [$code])->first();

        // If not found in DB or inactive scheduled, but is a recognized built-in code, activate/create it
        if ((!$promo || $promo->status !== 'active') && isset($builtInCodes[$code])) {
            $def = $builtInCodes[$code];
            if (!$promo) {
                $promo = PromoCode::create([
                    'name' => $def['name'],
                    'code' => $code,
                    'type' => $def['type'],
                    'value' => $def['value'],
                    'status' => 'active',
                    'description' => $def['description'],
                    'usage_max' => 99999,
                    'usage_count' => 0,
                ]);
            } else {
                $promo->status = 'active';
                $promo->save();
            }
        }

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

        try {
            $user = $request->header('X-User-Email') ?? 'Admin';
            \App\Services\TelegramService::sendPromotionAlert([
                'title' => $promo->name,
                'actor' => $user,
                'details' => $promo->description ?? "បញ្ចុះតម្លៃ " . ($promo->type === 'percentage' ? "{$promo->value}%" : "\${$promo->value}"),
                'discount' => $promo->code ?? ($promo->type === 'percentage' ? "{$promo->value}% OFF" : "\${$promo->value} OFF"),
            ]);
        } catch (\Throwable $e) {}

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
