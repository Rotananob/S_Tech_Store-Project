<?php

namespace App\Http\Controllers;

use App\Models\PcBuild;
use Illuminate\Http\Request;

class PcBuildController extends Controller
{
    private function getUid(Request $request): ?string
    {
        return $request->header('X-Firebase-UID');
    }

    public function index(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        return response()->json(PcBuild::where('firebase_uid', $uid)->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'components' => 'required|array',
            'total_price' => 'required|numeric|min:0'
        ]);

        $build = PcBuild::create([
            'firebase_uid' => $uid,
            'name' => $validated['name'] ?? 'My Custom Build',
            'components' => $validated['components'],
            'total_price' => $validated['total_price']
        ]);

        return response()->json(['message' => 'Build saved successfully', 'build' => $build], 201);
    }

    public function destroy(Request $request, $id)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $build = PcBuild::where('firebase_uid', $uid)->findOrFail($id);
        $build->delete();
        
        return response()->json(['message' => 'Build deleted']);
    }
}
