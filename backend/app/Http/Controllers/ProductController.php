<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;

class ProductController extends Controller
{
    public function index()
    {
        // Retrieve products with category included
        $products = Product::with('category')->get();
        return response()->json($products);
    }

    public function store(Request $request)
    {
        // Validate Data
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'image_url' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
            'images.*' => 'nullable|image|max:5120',
            'image_urls' => 'nullable|array',
            'image_urls.*' => 'nullable|string',
            'is_featured' => 'boolean'
        ]);

        if (isset($validated['is_featured']) && is_string($validated['is_featured'])) {
            $validated['is_featured'] = filter_var($validated['is_featured'], FILTER_VALIDATE_BOOLEAN);
        }

        // Generate a slug automatically from the name
        $validated['slug'] = Str::slug($validated['name']) . '-' . time();

        $finalImages = [];
        if ($request->has('image_urls') && is_array($request->image_urls)) {
            $finalImages = array_filter($request->image_urls);
        }

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $url = Cloudinary::upload($file->getRealPath(), ['folder' => 'stech_store'])->getSecurePath();
                $finalImages[] = $url;
            }
        }
        
        // Legacy fallback
        if ($request->hasFile('image')) {
            $uploadedFileUrl = Cloudinary::upload($request->file('image')->getRealPath(), ['folder' => 'stech_store'])->getSecurePath();
            $validated['image_url'] = $uploadedFileUrl;
            $finalImages[] = $uploadedFileUrl;
        }

        if (!empty($finalImages)) {
            $validated['images'] = array_values(array_unique($finalImages));
            if (empty($validated['image_url'])) {
                $validated['image_url'] = $finalImages[0];
            }
        }

        unset($validated['image']);
        unset($validated['images.*']);
        unset($validated['image_urls']);

        // Business Logic: Store Product
        $product = Product::create($validated);

        return response()->json([
            'message' => 'Product created successfully',
            'data' => $product
        ], 201);
    }

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

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        
        $validated = $request->validate([
            'category_id' => 'sometimes|exists:categories,id',
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'stock' => 'sometimes|integer|min:0',
            'image_url' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
            'images.*' => 'nullable|image|max:5120',
            'image_urls' => 'nullable|array',
            'image_urls.*' => 'nullable|string',
            'is_featured' => 'boolean'
        ]);

        if (isset($validated['is_featured']) && is_string($validated['is_featured'])) {
            $validated['is_featured'] = filter_var($validated['is_featured'], FILTER_VALIDATE_BOOLEAN);
        }

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . time();
        }

        $finalImages = $product->images ?? [];
        // Optional logic: completely replace images, or just append?
        // Let's completely replace if 'images' or 'image_urls' are provided for simplicity:
        if ($request->has('image_urls') || $request->hasFile('images')) {
            $finalImages = [];
            if ($request->has('image_urls') && is_array($request->image_urls)) {
                $finalImages = array_filter($request->image_urls);
            }
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $file) {
                    $url = Cloudinary::upload($file->getRealPath(), ['folder' => 'stech_store'])->getSecurePath();
                    $finalImages[] = $url;
                }
            }
        }

        if ($request->hasFile('image')) {
            $uploadedFileUrl = Cloudinary::upload($request->file('image')->getRealPath(), ['folder' => 'stech_store'])->getSecurePath();
            $validated['image_url'] = $uploadedFileUrl;
            if (!in_array($uploadedFileUrl, $finalImages)) {
                $finalImages[] = $uploadedFileUrl;
            }
        }

        if (isset($finalImages) && !empty($finalImages)) {
            $validated['images'] = array_values(array_unique($finalImages));
            $validated['image_url'] = $finalImages[0];
        }

        unset($validated['image']);
        unset($validated['images.*']);
        unset($validated['image_urls']);

        $product->update($validated);

        return response()->json([
            'message' => 'Product updated successfully',
            'data' => $product
        ]);
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully'
        ]);
    }
}
