<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Branch;

class BranchController extends Controller
{
    /**
     * List all store branches (សាខាហាង)
     */
    public function index()
    {
        return response()->json(Branch::withCount('staff')->orderBy('id', 'asc')->get());
    }

    /**
     * Store new branch (Admin Only)
     */
    public function store(Request $request)
    {
        $currentUser = $request->attributes->get('auth_user');
        if ($currentUser && $currentUser->role !== 'admin') {
            return response()->json(['message' => 'Forbidden: Only administrators can create branches.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'code' => 'required|string|max:30|unique:branches,code',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'manager_name' => 'nullable|string|max:100',
            'opening_hours' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $branch = Branch::create($validated);

        return response()->json([
            'message' => 'Branch created successfully',
            'branch' => $branch,
        ], 201);
    }

    /**
     * Update branch (Admin Only)
     */
    public function update(Request $request, $id)
    {
        $currentUser = $request->attributes->get('auth_user');
        if ($currentUser && $currentUser->role !== 'admin') {
            return response()->json(['message' => 'Forbidden: Only administrators can update branches.'], 403);
        }

        $branch = Branch::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'code' => 'sometimes|string|max:30|unique:branches,code,' . $id,
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'manager_name' => 'nullable|string|max:100',
            'opening_hours' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $branch->update($validated);

        return response()->json([
            'message' => 'Branch updated successfully',
            'branch' => $branch,
        ]);
    }

    /**
     * Delete branch (Admin Only)
     */
    public function destroy(Request $request, $id)
    {
        $currentUser = $request->attributes->get('auth_user');
        if ($currentUser && $currentUser->role !== 'admin') {
            return response()->json(['message' => 'Forbidden: Only administrators can delete branches.'], 403);
        }

        $branch = Branch::findOrFail($id);
        $branch->delete();

        return response()->json(['message' => 'Branch deleted successfully']);
    }
}
