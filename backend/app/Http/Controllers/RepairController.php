<?php

namespace App\Http\Controllers;

use App\Models\Repair;
use Illuminate\Http\Request;

class RepairController extends Controller
{
    public function index()
    {
        return response()->json(Repair::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'device_name' => 'required|string|max:255',
            'issue_description' => 'required|string|max:2000',
            'technician_name' => 'nullable|string|max:100',
            'estimated_cost' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:Pending Assessment,In Progress,Ready,Completed',
            'notes' => 'nullable|string|max:2000',
        ]);

        $count = Repair::count() + 1;
        $ticketCode = 'REP-' . (1000 + $count);

        $repair = Repair::create([
            'ticket_code' => $ticketCode,
            'customer_name' => $validated['customer_name'],
            'customer_phone' => $validated['customer_phone'] ?? null,
            'device_name' => $validated['device_name'],
            'issue_description' => $validated['issue_description'],
            'technician_name' => $validated['technician_name'] ?? 'Unassigned',
            'estimated_cost' => $validated['estimated_cost'] ?? 0,
            'status' => $validated['status'] ?? 'Pending Assessment',
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(['message' => 'Repair ticket created', 'data' => $repair], 201);
    }

    public function update(Request $request, $id)
    {
        $repair = Repair::findOrFail($id);

        $validated = $request->validate([
            'customer_name' => 'sometimes|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'device_name' => 'sometimes|string|max:255',
            'issue_description' => 'sometimes|string|max:2000',
            'technician_name' => 'sometimes|string|max:100',
            'estimated_cost' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|string|in:Pending Assessment,In Progress,Ready,Completed',
            'notes' => 'nullable|string|max:2000',
        ]);

        $repair->update($validated);

        return response()->json(['message' => 'Repair ticket updated', 'data' => $repair]);
    }

    public function destroy($id)
    {
        $repair = Repair::findOrFail($id);
        $repair->delete();

        return response()->json(['message' => 'Repair ticket deleted']);
    }
}
