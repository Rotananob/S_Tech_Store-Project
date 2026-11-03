<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Shift;

class ShiftController extends Controller
{
    /**
     * List all working shifts & schedules - វេនធ្វើការ
     */
    public function index()
    {
        $shifts = \Illuminate\Support\Facades\Cache::remember('public_shifts_list', 1800, function () {
            return Shift::withCount('staff')->orderBy('id', 'asc')->get();
        });
        return response()->json($shifts);
    }

    /**
     * Store new shift - Admin and Super Admin
     */
    public function store(Request $request)
    {
        $currentUser = $request->attributes->get('auth_user');
        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json(['message' => 'Forbidden: Only administrators can create shifts.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:30|unique:shifts,code',
            'start_time' => 'required|string|max:20',
            'end_time' => 'required|string|max:20',
            'days' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $shift = Shift::create($validated);
        \Illuminate\Support\Facades\Cache::forget('public_shifts_list');

        return response()->json([
            'message' => 'Shift created successfully',
            'shift' => $shift,
        ], 201);
    }

    /**
     * Update shift - Admin and Super Admin
     */
    public function update(Request $request, $id)
    {
        $currentUser = $request->attributes->get('auth_user');
        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json(['message' => 'Forbidden: Only administrators can update shifts.'], 403);
        }

        $shift = Shift::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'code' => 'sometimes|string|max:30|unique:shifts,code,' . $id,
            'start_time' => 'sometimes|string|max:20',
            'end_time' => 'sometimes|string|max:20',
            'days' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $shift->update($validated);
        \Illuminate\Support\Facades\Cache::forget('public_shifts_list');

        return response()->json([
            'message' => 'Shift updated successfully',
            'shift' => $shift,
        ]);
    }

    /**
     * Delete shift - Admin and Super Admin
     */
    public function destroy(Request $request, $id)
    {
        $currentUser = $request->attributes->get('auth_user');
        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json(['message' => 'Forbidden: Only administrators can delete shifts.'], 403);
        }

        $shift = Shift::findOrFail($id);
        $shift->delete();
        \Illuminate\Support\Facades\Cache::forget('public_shifts_list');

        return response()->json(['message' => 'Shift deleted successfully']);
    }
}
