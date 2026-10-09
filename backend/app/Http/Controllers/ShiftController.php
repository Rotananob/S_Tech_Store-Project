<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Shift;

class ShiftController extends Controller
{
    /**
     * List all working shifts & schedules (វេនធ្វើការ)
     */
    public function index()
    {
        return response()->json(Shift::withCount('staff')->orderBy('id', 'asc')->get());
    }

    /**
     * Store new shift (Admin Only)
     */
    public function store(Request $request)
    {
        $currentUser = $request->attributes->get('auth_user');
        if ($currentUser && $currentUser->role !== 'admin') {
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

        return response()->json([
            'message' => 'Shift created successfully',
            'shift' => $shift,
        ], 201);
    }

    /**
     * Update shift (Admin Only)
     */
    public function update(Request $request, $id)
    {
        $currentUser = $request->attributes->get('auth_user');
        if ($currentUser && $currentUser->role !== 'admin') {
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

        return response()->json([
            'message' => 'Shift updated successfully',
            'shift' => $shift,
        ]);
    }

    /**
     * Delete shift (Admin Only)
     */
    public function destroy(Request $request, $id)
    {
        $currentUser = $request->attributes->get('auth_user');
        if ($currentUser && $currentUser->role !== 'admin') {
            return response()->json(['message' => 'Forbidden: Only administrators can delete shifts.'], 403);
        }

        $shift = Shift::findOrFail($id);
        $shift->delete();

        return response()->json(['message' => 'Shift deleted successfully']);
    }
}
