<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
{
    /**
     * Display a listing of products.
     */
    public function index(Request $request)
    {
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

        $products = $query->orderBy('id', 'desc')->get();
        return response()->json($products);
    }

    /**
     * Store a newly created product.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'brand' => 'nullable|string|max:100',
            'badge' => 'nullable|string|max:50',
            'image_url' => 'nullable|string',
            'image' => 'nullable|image|max:10240',
            'images.*' => 'nullable|image|max:10240',
            'image_urls' => 'nullable',
            'is_featured' => 'nullable',
            'condition' => 'nullable|string|max:100'
        ]);

        if (isset($validated['is_featured'])) {
            $validated['is_featured'] = filter_var($validated['is_featured'], FILTER_VALIDATE_BOOLEAN);
        } else {
            $validated['is_featured'] = false;
        }

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
                foreach ($uids as $uid) {
                    $batch[] = [
                        'firebase_uid' => $uid,
                        'title' => $title,
                        'message' => $message,
                        'type' => 'promo',
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
            \App\Services\TelegramService::sendNewProductAlert($product);
        } catch (\Throwable $e) {
            Log::error("Failed to send telegram new product alert: " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Product created successfully',
            'data' => $product
        ], 201);
    }

    /**
     * Display the specified product.
     */
    public function show($identifier)
    {
        $query = Product::with('category');
        
        if (is_numeric($identifier)) {
            $query->where('id', $identifier);
        } else {
            $query->where('slug', $identifier);
        }

        $product = $query->firstOrFail();
        return response()->json($product);
    }

    /**
     * Update the specified product.
     */
    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        
        $validated = $request->validate([
            'category_id' => 'sometimes|exists:categories,id',
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock' => 'sometimes|integer|min:0',
            'brand' => 'nullable|string|max:100',
            'badge' => 'nullable|string|max:50',
            'image_url' => 'nullable|string',
            'image' => 'nullable|image|max:10240',
            'images.*' => 'nullable|image|max:10240',
            'image_urls' => 'nullable',
            'is_featured' => 'nullable',
            'condition' => 'nullable|string|max:100'
        ]);

        if (isset($validated['is_featured'])) {
            $validated['is_featured'] = filter_var($validated['is_featured'], FILTER_VALIDATE_BOOLEAN);
        }

        if (isset($validated['name']) && $validated['name'] !== $product->name) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . time();
        }

        // Process images with existing product fallback
        $processed = $this->processImages($request, $product);
        if ($processed['image_url'] !== null || $request->has('image_url') || $request->has('image_urls') || $request->hasFile('images') || $request->hasFile('image')) {
            $validated['image_url'] = $processed['image_url'];
            $validated['images'] = $processed['images'];
        }

        unset($validated['image'], $validated['image_urls']);

        $product->update($validated);
        $product->load('category');

        return response()->json([
            'message' => 'Product updated successfully',
            'data' => $product
        ]);
    }

    /**
     * Remove the specified product.
     */
    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully'
        ]);
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
