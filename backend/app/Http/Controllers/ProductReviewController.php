<?php

namespace App\Http\Controllers;

use App\Models\ProductReview;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductReviewController extends Controller
{
    private function getUid(Request $request): ?string
    {
        return $request->header('X-Firebase-UID');
    }

    public function index($productId)
    {
        return response()->json(ProductReview::where('product_id', $productId)->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request, $productId)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $product = Product::findOrFail($productId);

        $validated = $request->validate([
            'user_name' => 'nullable|string|max:255',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string'
        ]);

        $review = ProductReview::create([
            'product_id' => $product->id,
            'firebase_uid' => $uid,
            'user_name' => $validated['user_name'] ?? ('User ' . substr($uid, 0, 6)),
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null
        ]);

        return response()->json(['message' => 'Review added', 'review' => $review], 201);
    }
}
