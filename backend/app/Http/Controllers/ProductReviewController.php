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
        $reviews = ProductReview::where('product_id', $productId)
            ->orderBy('created_at', 'desc')
            ->get();

        $uids = $reviews->pluck('firebase_uid')->unique()->filter()->values();
        $profiles = \App\Models\UserProfile::whereIn('firebase_uid', $uids)->get()->keyBy('firebase_uid');

        $enriched = $reviews->map(function ($rev) use ($profiles) {
            $p = $profiles[$rev->firebase_uid] ?? null;
            return [
                'id' => $rev->id,
                'product_id' => $rev->product_id,
                'firebase_uid' => $rev->firebase_uid,
                'user_name' => $p->display_name ?? $rev->user_name,
                'user_avatar' => $p->photo_url ?? null,
                'rating' => (int)$rev->rating,
                'comment' => $rev->comment,
                'verified_buyer' => true,
                'created_at' => $rev->created_at,
            ];
        });

        return response()->json($enriched);
    }

    public function store(Request $request, $productId)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized. Please login to submit a review.'], 401);

        $product = Product::findOrFail($productId);

        $validated = $request->validate([
            'user_name' => 'nullable|string|max:255',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000'
        ]);

        $profile = \App\Models\UserProfile::where('firebase_uid', $uid)->first();
        $authorName = $validated['user_name'] 
            ?? $profile->display_name 
            ?? $request->header('X-Firebase-Name') 
            ?? ('User ' . substr($uid, 0, 6));

        $review = ProductReview::create([
            'product_id' => $product->id,
            'firebase_uid' => $uid,
            'user_name' => $authorName,
            'rating' => $validated['rating'],
            'comment' => $validated['comment'],
        ]);

        $enrichedReview = [
            'id' => $review->id,
            'product_id' => $review->product_id,
            'firebase_uid' => $review->firebase_uid,
            'user_name' => $authorName,
            'user_avatar' => $profile->photo_url ?? null,
            'rating' => (int)$review->rating,
            'comment' => $review->comment,
            'verified_buyer' => true,
            'created_at' => $review->created_at,
        ];

        return response()->json([
            'message' => 'Review added successfully', 
            'review' => $enrichedReview
        ], 201);
    }
}
