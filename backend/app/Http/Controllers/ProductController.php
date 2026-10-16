<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    /**
     * Display a listing of products.
     */
    public function index(Request $request)
    {
        $isAdmin = $request->header('X-Admin-Token') || $request->header('Authorization') || $request->has('fresh') || $request->has('_t');

        if ($isAdmin) {
            $query = Product::with('category');

            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            if ($request->filled('category')) {
                $slug = $request->category;
                $query->whereHas('category', function ($q) use ($slug) {
                    $q->where('slug', $slug);
                });
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $isPg = config('database.default') === 'pgsql';
                $likeOp = $isPg ? 'ilike' : 'like';
                $query->where(function ($q) use ($s, $likeOp) {
                    $q->where('name', $likeOp, "%{$s}%")
                      ->orWhere('description', $likeOp, "%{$s}%")
                      ->orWhere('brand', $likeOp, "%{$s}%");
                });
            }

            if ($request->has('featured')) {
                $query->where('is_featured', filter_var($request->featured, FILTER_VALIDATE_BOOLEAN));
            }

            $products = $query
                ->orderByRaw('CASE WHEN pinned_to_top = true THEN 1 ELSE 0 END DESC')
                ->orderByRaw('CASE WHEN sale_price IS NOT NULL AND sale_price > 0 AND sale_price < price THEN 1 ELSE 0 END DESC')
                ->orderByRaw('COALESCE(bumped_at, created_at, updated_at) DESC')
                ->orderBy('id', 'desc')
                ->get();

            return response()->json($products)
                ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                ->header('Pragma', 'no-cache')
                ->header('Expires', '0');
        }

        $version = Cache::get('products_cache_version', 1);
        $cacheKey = "products_list_v{$version}_" . md5(json_encode($request->all()));

        $products = Cache::remember($cacheKey, 30, function () use ($request) {
            $query = Product::with('category');

            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            if ($request->filled('category')) {
                $slug = $request->category;
                $query->whereHas('category', function ($q) use ($slug) {
                    $q->where('slug', $slug);
                });
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $isPg = config('database.default') === 'pgsql';
                $likeOp = $isPg ? 'ilike' : 'like';
                $query->where(function ($q) use ($s, $likeOp) {
                    $q->where('name', $likeOp, "%{$s}%")
                      ->orWhere('description', $likeOp, "%{$s}%")
                      ->orWhere('brand', $likeOp, "%{$s}%");
                });
            }

            if ($request->has('featured')) {
                $query->where('is_featured', filter_var($request->featured, FILTER_VALIDATE_BOOLEAN));
            }

            return $query
                ->orderByRaw('CASE WHEN pinned_to_top = true THEN 1 ELSE 0 END DESC')
                ->orderByRaw('CASE WHEN sale_price IS NOT NULL AND sale_price > 0 AND sale_price < price THEN 1 ELSE 0 END DESC')
                ->orderByRaw('COALESCE(bumped_at, created_at, updated_at) DESC')
                ->orderBy('id', 'desc')
                ->get();
        });

        return response()->json($products)
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    /**
     * Store a newly created product.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|string|max:100',
            'sale_price' => 'nullable|string|max:100',
            'stock' => 'required|integer|min:0',
            'brand' => 'nullable|string|max:100',
            'badge' => 'nullable|string|max:50',
            'image_url' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'image_urls' => 'nullable',
            'is_featured' => 'nullable',
            'pinned_to_top' => 'nullable',
            'bump_to_top' => 'nullable',
            'condition' => 'nullable|string|max:100'
        ]);

        // Safely resolve category_id
        if (!empty($validated['category_id'])) {
            $catId = (int)$validated['category_id'];
            if (!\App\Models\Category::where('id', $catId)->exists()) {
                $firstCat = \App\Models\Category::first();
                $validated['category_id'] = $firstCat ? $firstCat->id : 1;
            } else {
                $validated['category_id'] = $catId;
            }
        } else {
            $firstCat = \App\Models\Category::first();
            $validated['category_id'] = $firstCat ? $firstCat->id : 1;
        }

        // Clean price formatting (strip $, commas, spaces)
        if ($request->has('price')) {
            $rawPrice = $request->input('price');
            $cleanPrice = preg_replace('/[^0-9.]/', '', (string)$rawPrice);
            $validated['price'] = $cleanPrice !== '' ? $cleanPrice : '0.00';
        }

        // Clean sale_price formatting
        if ($request->filled('sale_price')) {
            $rawSale = $request->input('sale_price');
            $cleanSale = preg_replace('/[^0-9.]/', '', (string)$rawSale);
            $validated['sale_price'] = $cleanSale !== '' ? $cleanSale : null;
        } else {
            $validated['sale_price'] = null;
        }

        // Support explicitly clearing nullable fields
        if ($request->has('badge') && trim((string)$request->input('badge')) === '') {
            $validated['badge'] = null;
        }
        if ($request->has('brand') && trim((string)$request->input('brand')) === '') {
            $validated['brand'] = null;
        }
        if ($request->has('description') && trim((string)$request->input('description')) === '') {
            $validated['description'] = null;
        }

        if (isset($validated['is_featured'])) {
            $validated['is_featured'] = filter_var($validated['is_featured'], FILTER_VALIDATE_BOOLEAN);
        } else {
            $validated['is_featured'] = false;
        }

        if (isset($validated['pinned_to_top'])) {
            $validated['pinned_to_top'] = filter_var($validated['pinned_to_top'], FILTER_VALIDATE_BOOLEAN);
        } else {
            $validated['pinned_to_top'] = false;
        }

        // New products automatically get bumped_at = now() so they start at the top
        $validated['bumped_at'] = now();
        unset($validated['bump_to_top']);

        // Generate unique slug
        $validated['slug'] = Str::slug($validated['name']) . '-' . time();

        // Process images (both image link addresses and uploaded files)
        $processed = $this->processImages($request);
        $validated['image_url'] = $processed['image_url'];
        $validated['images'] = $processed['images'];

        unset($validated['image'], $validated['image_urls']);

        $product = Product::create($validated);
        $product->load('category');

        // 1. Dispatch push notifications to all customer accounts
        try {
            $uids = \App\Models\UserProfile::whereNotNull('firebase_uid')
                ->where('firebase_uid', '!=', '')
                ->pluck('firebase_uid')
                ->unique();

            if ($uids->isNotEmpty()) {
                $now = now();
                $title = "🔥 ផលិតផលថ្មីទើបមកដល់: {$product->name}";
                $priceDisplay = $product->sale_price ? "\${$product->sale_price} (បញ្ចុះពី \${$product->price})" : "\${$product->price}";
                $message = "ទំនិញថ្មី '{$product->name}' តម្លៃ {$priceDisplay} ត្រូវបានដាក់លក់ក្នុងស្តុកហើយ! ចុចដើម្បីពិនិត្យមើល។";

                $batch = [];
                $productImage = $product->image_url ?? (!empty($product->images) ? $product->images[0] : null);
                $productLink = "/products/{$product->slug}";
                foreach ($uids as $uid) {
                    $batch[] = [
                        'firebase_uid' => $uid,
                        'title' => $title,
                        'message' => $message,
                        'type' => 'promo',
                        'link' => $productLink,
                        'image' => $productImage,
                        'read' => false,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                \App\Models\UserNotification::insert($batch);
            }
        } catch (\Throwable $e) {
            Log::error("Failed to insert user notifications for new product: " . $e->getMessage());
        }

        // 2. Dispatch instant alert to Telegram Stock Forum Topic
        try {
            $actor = $request->header('X-User-Email') ?: ($request->header('X-Admin-Role') ? 'Admin (' . $request->header('X-Admin-Role') . ')' : 'Admin / Staff');
            \App\Services\TelegramService::sendNewProductAlert($product, $actor);
        } catch (\Throwable $e) {
            Log::error("Failed to send telegram new product alert: " . $e->getMessage());
        }

        Cache::forget('products_cache_version');
        Cache::put('products_cache_version', time(), 86400 * 30);

        return response()->json([
            'message' => 'Product created successfully',
            'data' => $product
        ], 201)
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        ->header('Pragma', 'no-cache')
        ->header('Expires', '0');
    }

    /**
     * Display the specified product.
     */
    public function show(Request $request, $identifier)
    {
        $isAdmin = $request->header('X-Admin-Token') || $request->header('Authorization') || $request->has('fresh') || $request->has('_t');

        if ($isAdmin) {
            $query = Product::with('category');
            if (is_numeric($identifier)) {
                $query->where('id', $identifier);
            } else {
                $query->where('slug', $identifier);
            }
            $product = $query->first();

            if (!$product) {
                return response()->json(['message' => 'Product not found'], 404);
            }

            return response()->json($product)
                ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                ->header('Pragma', 'no-cache');
        }

        $version = Cache::get('products_cache_version', 1);
        $cacheKey = "product_single_{$identifier}_v{$version}";

        $product = Cache::remember($cacheKey, 30, function () use ($identifier) {
            $query = Product::with('category');
            
            if (is_numeric($identifier)) {
                $query->where('id', $identifier);
            } else {
                $query->where('slug', $identifier);
            }

            return $query->first();
        });

        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        return response()->json($product)
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    /**
     * Update the specified product.
     */
    public function update(Request $request, $id)
    {
        $product = is_numeric($id) ? Product::findOrFail($id) : Product::where('slug', $id)->firstOrFail();
        
        $oldValues = [
            'name' => $product->name,
            'price' => $product->price,
            'sale_price' => $product->sale_price,
            'stock' => $product->stock,
            'brand' => $product->brand,
        ];

        $validated = $request->validate([
            'category_id' => 'sometimes|exists:categories,id',
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|string|max:100',
            'sale_price' => 'nullable|string|max:100',
            'stock' => 'sometimes|integer|min:0',
            'brand' => 'nullable|string|max:100',
            'badge' => 'nullable|string|max:50',
            'image_url' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'image_urls' => 'nullable',
            'is_featured' => 'nullable',
            'pinned_to_top' => 'nullable',
            'bump_to_top' => 'nullable',
            'condition' => 'nullable|string|max:100'
        ]);

        if (isset($validated['is_featured'])) {
            $validated['is_featured'] = filter_var($validated['is_featured'], FILTER_VALIDATE_BOOLEAN);
        }

        if (isset($validated['pinned_to_top'])) {
            $validated['pinned_to_top'] = filter_var($validated['pinned_to_top'], FILTER_VALIDATE_BOOLEAN);
        }

        if ($request->boolean('bump_to_top') || $request->input('bump_to_top') === '1' || $request->input('bump_to_top') === true) {
            $validated['bumped_at'] = now();
        }
        unset($validated['bump_to_top']);

        if (isset($validated['name']) && $validated['name'] !== $product->name) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . time();
        }

        // Clean price formatting (strip $, commas, etc.)
        if ($request->has('price')) {
            $rawPrice = $request->input('price');
            $cleanPrice = preg_replace('/[^0-9.]/', '', (string)$rawPrice);
            if ($cleanPrice !== '') {
                $validated['price'] = $cleanPrice;
            }
        }

        // Clean sale_price formatting
        if ($request->has('sale_price')) {
            $rawSale = $request->input('sale_price');
            if ($rawSale === null || trim((string)$rawSale) === '') {
                $validated['sale_price'] = null;
            } else {
                $cleanSale = preg_replace('/[^0-9.]/', '', (string)$rawSale);
                $validated['sale_price'] = $cleanSale !== '' ? $cleanSale : null;
            }
        }

        // Support explicitly clearing nullable fields
        if ($request->has('badge') && ($request->input('badge') === '' || $request->input('badge') === null)) {
            $validated['badge'] = null;
        }
        if ($request->has('brand') && ($request->input('brand') === '' || $request->input('brand') === null)) {
            $validated['brand'] = null;
        }
        if ($request->has('description') && ($request->input('description') === '' || $request->input('description') === null)) {
            $validated['description'] = null;
        }

        // Process images with existing product fallback
        $processed = $this->processImages($request, $product);
        if ($processed['image_url'] !== null || $request->has('image_url') || $request->has('image_urls') || $request->hasFile('images') || $request->hasFile('image')) {
            $validated['image_url'] = $processed['image_url'];
            $validated['images'] = $processed['images'];
        }

        unset($validated['image'], $validated['image_urls']);

        $product->update($validated);
        $product->touch();
        $product->refresh();
        $product->load('category');

        $actor = $request->header('X-User-Email') ?: ($request->header('X-Admin-Role') ? 'Admin (' . $request->header('X-Admin-Role') . ')' : 'Admin / Staff');

        $changes = [];
        if ($oldValues['name'] !== $product->name) {
            $changes['name'] = ['old' => $oldValues['name'], 'new' => $product->name];
        }
        if ((float)($oldValues['price'] ?? 0) != (float)($product->price ?? 0)) {
            $changes['price'] = ['old' => $oldValues['price'], 'new' => $product->price];
        }
        if ((float)($oldValues['sale_price'] ?? 0) != (float)($product->sale_price ?? 0)) {
            $changes['sale_price'] = ['old' => $oldValues['sale_price'] ?: '-', 'new' => $product->sale_price ?: '-'];
        }
        if ((int)($oldValues['stock'] ?? 0) !== (int)($product->stock ?? 0)) {
            $changes['stock'] = ['old' => $oldValues['stock'], 'new' => $product->stock];
        }
        if (($oldValues['brand'] ?? '') !== ($product->brand ?? '')) {
            $changes['brand'] = ['old' => $oldValues['brand'] ?: '-', 'new' => $product->brand ?: '-'];
        }

        try {
            \App\Services\TelegramService::sendEditProductAlert($product, $changes, $actor);
        } catch (\Throwable $t) {
            Log::error("Failed to send telegram edit product alert: " . $t->getMessage());
        }

        if ((int)$product->stock <= 3) {
            try {
                \App\Services\TelegramService::sendLowStockAlert($product, (int)$product->stock);
            } catch (\Throwable $t) {}
        }

        if (!empty($product->sale_price) && (float)$product->sale_price < (float)$product->price && $request->has('sale_price')) {
            try {
                $discountPercent = round((((float)$product->price - (float)$product->sale_price) / (float)$product->price) * 100);
                \App\Services\TelegramService::sendPromotionAlert([
                    'title' => "បញ្ចុះតម្លៃពិសេសលើ {$product->name}",
                    'actor' => $request->header('X-User-Email') ?? 'Admin / Staff',
                    'discount' => "{$discountPercent}% OFF (សល់ត្រឹម \${$product->sale_price})",
                    'details' => "តម្លៃដើម \${$product->price} បញ្ចុះនៅសល់ត្រឹម \${$product->sale_price} USD",
                ]);
            } catch (\Throwable $t) {}
        }

        Cache::forget("product_single_{$product->id}");
        Cache::forget("product_single_{$id}");
        if ($product->slug) {
            Cache::forget("product_single_{$product->slug}");
        }
        Cache::forget('products_cache_version');
        Cache::put('products_cache_version', time(), 86400 * 30);

        return response()->json([
            'message' => 'Product updated successfully',
            'data' => $product
        ])
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        ->header('Pragma', 'no-cache')
        ->header('Expires', '0');
    }

    /**
     * Bump an old or existing product to the very top (make it fresh).
     */
    public function bump($id)
    {
        $product = is_numeric($id) ? Product::findOrFail($id) : Product::where('slug', $id)->firstOrFail();
        $product->bumped_at = now();
        $product->touch();
        $product->save();
        $product->load('category');

        Cache::forget('products_cache_version');
        Cache::put('products_cache_version', time(), 86400 * 30);

        return response()->json([
            'success' => true,
            'message' => "បានរុញទំនិញ \"{$product->name}\" មកលើគេបង្អស់ (ធ្វើឱ្យថ្មីជានិច្ច) ជោគជ័យ!",
            'data' => $product
        ])
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        ->header('Pragma', 'no-cache')
        ->header('Expires', '0');
    }

    /**
     * Toggle pinned status for a product (Pin/Unpin to Top).
     */
    public function togglePin($id)
    {
        $product = is_numeric($id) ? Product::findOrFail($id) : Product::where('slug', $id)->firstOrFail();
        $newStatus = !$product->pinned_to_top;
        $product->pinned_to_top = $newStatus;
        if ($newStatus) {
            $product->bumped_at = now();
        }
        $product->touch();
        $product->save();
        $product->load('category');

        Cache::forget('products_cache_version');
        Cache::put('products_cache_version', time(), 86400 * 30);

        $msg = $newStatus
            ? "បានខ្ទាស់ទំនិញ \"{$product->name}\" នៅលើគេបង្អស់ជោគជ័យ (Pinned to Top)!"
            : "បានដោះការខ្ទាស់ទំនិញ \"{$product->name}\" (Unpinned)!";

        return response()->json([
            'success' => true,
            'message' => $msg,
            'pinned_to_top' => $newStatus,
            'data' => $product
        ])
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        ->header('Pragma', 'no-cache')
        ->header('Expires', '0');
    }

    /**
     * Remove the specified product.
     */
    public function destroy(Request $request, $id)
    {
        $product = is_numeric($id) ? Product::with('category')->findOrFail($id) : Product::with('category')->where('slug', $id)->firstOrFail();

        $actor = $request->header('X-User-Email') ?: ($request->header('X-Admin-Role') ? 'Admin (' . $request->header('X-Admin-Role') . ')' : 'Admin / Staff');

        // 1. Dispatch Telegram Alert before deletion
        try {
            \App\Services\TelegramService::sendDeleteProductAlert($product, $actor);
        } catch (\Throwable $e) {
            Log::error("Failed to send telegram delete product alert: " . $e->getMessage());
        }

        // 2. Clear caches immediately
        Cache::forget("product_single_{$product->id}");
        Cache::forget("product_single_{$id}");
        if ($product->slug) {
            Cache::forget("product_single_{$product->slug}");
        }
        Cache::forget('products_cache_version');
        Cache::put('products_cache_version', time(), 86400 * 30);

        // 3. Delete product
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully',
            'id' => $id
        ])
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        ->header('Pragma', 'no-cache')
        ->header('Expires', '0');
    }

    /**
     * Robust helper to process images from link addresses, array/JSON URLs, and file uploads.
     * Uploads files to Cloudinary with fallback to local storage.
     */
    protected function processImages(Request $request, ?Product $existingProduct = null): array
    {
        $urls = [];

        // 1. Direct single image_url string (e.g. pasted image address link from Google, web, Cloudinary)
        if ($request->filled('image_url')) {
            $inputUrl = trim($request->input('image_url'));
            if ($inputUrl !== '' && filter_var($inputUrl, FILTER_VALIDATE_URL)) {
                $urls[] = $inputUrl;
            } elseif ($inputUrl !== '') {
                // If it's a relative URL or path
                $urls[] = $inputUrl;
            }
        }

        // 2. image_urls input (can be array, JSON array string, or comma-separated string)
        if ($request->has('image_urls')) {
            $raw = $request->input('image_urls');
            if (is_string($raw)) {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $raw = $decoded;
                } else {
                    $raw = explode(',', $raw);
                }
            }
            if (is_array($raw)) {
                foreach ($raw as $u) {
                    if (is_string($u)) {
                        $trimmed = trim($u);
                        if ($trimmed !== '') {
                            $urls[] = $trimmed;
                        }
                    }
                }
            }
        }

        // 3. Process uploaded files (both multiple 'images' and single 'image')
        $filesToUpload = [];
        if ($request->hasFile('images')) {
            $files = $request->file('images');
            if (is_array($files)) {
                $filesToUpload = array_merge($filesToUpload, $files);
            } else {
                $filesToUpload[] = $files;
            }
        }
        if ($request->hasFile('image')) {
            $filesToUpload[] = $request->file('image');
        }

        foreach ($filesToUpload as $file) {
            if ($file && $file->isValid()) {
                $uploadedUrl = null;
                // Attempt Cloudinary upload first
                try {
                    $cloudUrl = config('cloudinary.cloud_url') ?: env('CLOUDINARY_URL');
                    if ($cloudUrl && function_exists('cloudinary')) {
                        $result = cloudinary()->uploadApi()->upload($file->getRealPath(), [
                            'folder' => 'stech_store',
                            'resource_type' => 'auto'
                        ]);
                        $uploadedUrl = $result['secure_url'] ?? null;
                    }
                } catch (\Throwable $e) {
                    Log::warning('Cloudinary upload error, using local storage fallback: ' . $e->getMessage());
                }

                // Fallback to local storage if Cloudinary upload failed or not configured
                if (!$uploadedUrl) {
                    try {
                        $path = $file->store('products', 'public');
                        $uploadedUrl = asset('storage/' . $path);
                    } catch (\Throwable $e) {
                        Log::error('Local storage upload failed: ' . $e->getMessage());
                    }
                }

                if ($uploadedUrl) {
                    $urls[] = $uploadedUrl;
                }
            }
        }

        // Clean, trim, and deduplicate URLs
        $urls = array_values(array_unique(array_filter($urls)));

        // If updating and NO new images were sent at all, retain existing images
        if (
            $existingProduct &&
            empty($urls) &&
            !$request->has('image_url') &&
            !$request->has('image_urls') &&
            !$request->hasFile('images') &&
            !$request->hasFile('image')
        ) {
            $existingImages = $existingProduct->images ?? [];
            if (empty($existingImages) && !empty($existingProduct->image_url)) {
                $existingImages = [$existingProduct->image_url];
            }
            return [
                'image_url' => $existingProduct->image_url,
                'images' => $existingImages
            ];
        }

        $primaryUrl = !empty($urls) ? $urls[0] : null;

        return [
            'image_url' => $primaryUrl,
            'images' => $urls
        ];
    }
}
