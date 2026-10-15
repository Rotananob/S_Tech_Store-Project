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
            'promo' => $promo,
        ]);
    }

    public function heroBanners()
    {
        $banners = PromoCode::where('status', 'active')
            ->whereNotNull('image_url')
            ->where('image_url', '!=', '')
            ->where(function ($q) {
                $q->whereNull('valid_until')->orWhere('valid_until', '>=', now());
            })
            ->latest()
            ->take(8)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $banners,
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

        $promo = PromoCode::whereRaw('UPPER(TRIM(code)) = ?', [$code])->first();

        if (!$promo) {
            return response()->json([
                'success' => false,
                'message' => 'កូដប្រូម៉ូសិនមិនត្រឹមត្រូវ ឬត្រូវបានលុបចេញ (Invalid or deleted promo code)',
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

    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp,gif,svg|max:10240',
        ]);

        $file = $request->file('image');
        $uploadedUrl = null;

        try {
            $cloudUrl = config('cloudinary.cloud_url') ?: env('CLOUDINARY_URL');
            if ($cloudUrl && function_exists('cloudinary')) {
                $result = cloudinary()->uploadApi()->upload($file->getRealPath(), [
                    'folder' => 'stech_promotions',
                    'resource_type' => 'auto'
                ]);
                $uploadedUrl = $result['secure_url'] ?? null;
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Cloudinary upload error: ' . $e->getMessage());
        }

        if (!$uploadedUrl) {
            $path = $file->store('promotions', 'public');
            $uploadedUrl = asset('storage/' . $path);
        }

        return response()->json([
            'success' => true,
            'url' => $uploadedUrl,
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
            'auto_applied' => 'nullable',
            'image' => 'nullable|image|max:10240',
            'image_url' => 'nullable|string',
            'show_popup' => 'nullable',
            'description' => 'nullable|string',
            'target_url' => 'nullable|string',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $uploadedUrl = null;
            try {
                $cloudUrl = config('cloudinary.cloud_url') ?: env('CLOUDINARY_URL');
                if ($cloudUrl && function_exists('cloudinary')) {
                    $result = cloudinary()->uploadApi()->upload($file->getRealPath(), [
                        'folder' => 'stech_promotions',
                        'resource_type' => 'auto'
                    ]);
                    $uploadedUrl = $result['secure_url'] ?? null;
                }
            } catch (\Throwable $e) {}

            if (!$uploadedUrl) {
                $path = $file->store('promotions', 'public');
                $uploadedUrl = asset('storage/' . $path);
            }
            $validated['image_url'] = $uploadedUrl;
        }

        if (!empty($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        if (isset($validated['auto_applied'])) {
            $validated['auto_applied'] = filter_var($validated['auto_applied'], FILTER_VALIDATE_BOOLEAN);
        }
        if (isset($validated['show_popup'])) {
            $validated['show_popup'] = filter_var($validated['show_popup'], FILTER_VALIDATE_BOOLEAN);
        }

        unset($validated['image']);

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
            'auto_applied' => 'nullable',
            'image' => 'nullable|image|max:10240',
            'image_url' => 'nullable|string',
            'show_popup' => 'nullable',
            'description' => 'nullable|string',
            'target_url' => 'nullable|string',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $uploadedUrl = null;
            try {
                $cloudUrl = config('cloudinary.cloud_url') ?: env('CLOUDINARY_URL');
                if ($cloudUrl && function_exists('cloudinary')) {
                    $result = cloudinary()->uploadApi()->upload($file->getRealPath(), [
                        'folder' => 'stech_promotions',
                        'resource_type' => 'auto'
                    ]);
                    $uploadedUrl = $result['secure_url'] ?? null;
                }
            } catch (\Throwable $e) {}

            if (!$uploadedUrl) {
                $path = $file->store('promotions', 'public');
                $uploadedUrl = asset('storage/' . $path);
            }
            $validated['image_url'] = $uploadedUrl;
        }

        if (isset($validated['code']) && !empty($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        if (isset($validated['auto_applied'])) {
            $validated['auto_applied'] = filter_var($validated['auto_applied'], FILTER_VALIDATE_BOOLEAN);
        }
        if (isset($validated['show_popup'])) {
            $validated['show_popup'] = filter_var($validated['show_popup'], FILTER_VALIDATE_BOOLEAN);
        }

        unset($validated['image']);

        $promo->update($validated);

        try {
            $user = $request->header('X-User-Email') ?? 'Admin';
            if ($promo->status === 'active') {
                \App\Services\TelegramService::sendPromotionAlert([
                    'title' => $promo->name,
                    'actor' => $user,
                    'code' => $promo->code,
                    'valid_until' => $promo->valid_until ? date('d-m-Y', strtotime($promo->valid_until)) : null,
                    'details' => $promo->description ?? "បច្ចុប្បន្នភាពប្រូម៉ូសិន " . ($promo->type === 'percentage' ? "{$promo->value}%" : "\${$promo->value}"),
                    'discount' => $promo->code ?? ($promo->type === 'percentage' ? "{$promo->value}% OFF" : "\${$promo->value} OFF"),
                ]);
            }
        } catch (\Throwable $e) {}

        return response()->json(['message' => 'Promo code updated', 'data' => $promo]);
    }

    public function destroy($id)
    {
        $promo = PromoCode::findOrFail($id);
        $promo->delete();
        return response()->json(['message' => 'Promo code deleted']);
    }
}
