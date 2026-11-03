<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Shift;
use App\Models\User;
use App\Services\AdminTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BranchAndShiftManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createAuthHeaders(string $role): array
    {
        $user = User::create([
            'name' => "User {$role}",
            'email' => "user_{$role}@stech.com",
            'password' => bcrypt('StrongPass123!'),
            'role' => $role,
            'status' => 'active',
        ]);

        $token = AdminTokenService::createToken($user);

        return [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ];
    }

    public function test_unauthenticated_request_cannot_access_branch_or_shift_apis(): void
    {
        $this->getJson('/api/admin/branches')->assertStatus(401);
        $this->postJson('/api/admin/branches', ['name' => 'Branch'])->assertStatus(401);
        $this->getJson('/api/admin/shifts')->assertStatus(401);
        $this->postJson('/api/admin/shifts', ['name' => 'Shift'])->assertStatus(401);
    }

    public function test_staff_role_is_forbidden_from_creating_or_updating_branch(): void
    {
        $headers = $this->createAuthHeaders('staff');

        $response = $this->postJson('/api/admin/branches', [
            'name' => 'Toul Kork Branch',
            'code' => 'BR-TK-01',
            'phone' => '023888999',
            'is_active' => true,
        ], $headers);

        $response->assertStatus(403);
        $response->assertJson([
            'message' => 'Forbidden: Only administrators can create branches.',
        ]);
    }

    public function test_staff_role_is_forbidden_from_creating_or_updating_shift(): void
    {
        $headers = $this->createAuthHeaders('staff');

        $response = $this->postJson('/api/admin/shifts', [
            'name' => 'Morning Shift',
            'code' => 'SH-MORN-01',
            'start_time' => '08:00',
            'end_time' => '17:00',
            'is_active' => true,
        ], $headers);

        $response->assertStatus(403);
        $response->assertJson([
            'message' => 'Forbidden: Only administrators can create shifts.',
        ]);
    }

    public function test_admin_can_create_list_and_update_branch(): void
    {
        $headers = $this->createAuthHeaders('admin');

        $createResponse = $this->postJson('/api/admin/branches', [
            'name' => 'Sensok Head Office',
            'code' => 'BR-SS-01',
            'address' => 'Street 1986, Sensok, Phnom Penh',
            'phone' => '012999888',
            'manager_name' => 'Mr. Rotana',
            'opening_hours' => '8:00 AM - 8:00 PM',
            'is_active' => true,
        ], $headers);

        $createResponse->assertStatus(201);
        $createResponse->assertJsonPath('branch.code', 'BR-SS-01');

        $branchId = $createResponse->json('branch.id');

        $listResponse = $this->getJson('/api/admin/branches', $headers);
        $listResponse->assertStatus(200);
        $listResponse->assertJsonFragment(['code' => 'BR-SS-01']);

        $updateResponse = $this->putJson("/api/admin/branches/{$branchId}", [
            'name' => 'Sensok Flagship Store',
            'opening_hours' => '8:00 AM - 9:00 PM',
        ], $headers);

        $updateResponse->assertStatus(200);
        $this->assertDatabaseHas('branches', [
            'id' => $branchId,
            'name' => 'Sensok Flagship Store',
            'opening_hours' => '8:00 AM - 9:00 PM',
        ]);

        $deleteResponse = $this->deleteJson("/api/admin/branches/{$branchId}", [], $headers);
        $deleteResponse->assertStatus(200);
        $this->assertDatabaseMissing('branches', ['id' => $branchId]);
    }

    public function test_super_admin_can_create_list_and_update_shift(): void
    {
        $headers = $this->createAuthHeaders('super_admin');

        $createResponse = $this->postJson('/api/admin/shifts', [
            'name' => 'Evening Support Shift',
            'code' => 'SH-EVN-02',
            'start_time' => '13:00',
            'end_time' => '21:00',
            'days' => 'Mon-Sat',
            'description' => 'Technical support and repair diagnostics',
            'is_active' => true,
        ], $headers);

        $createResponse->assertStatus(201);
        $createResponse->assertJsonPath('shift.code', 'SH-EVN-02');

        $shiftId = $createResponse->json('shift.id');

        $listResponse = $this->getJson('/api/admin/shifts', $headers);
        $listResponse->assertStatus(200);
        $listResponse->assertJsonFragment(['code' => 'SH-EVN-02']);

        $updateResponse = $this->putJson("/api/admin/shifts/{$shiftId}", [
            'end_time' => '22:00',
            'description' => 'Extended evening diagnostic shift',
        ], $headers);

        $updateResponse->assertStatus(200);
        $this->assertDatabaseHas('shifts', [
            'id' => $shiftId,
            'end_time' => '22:00',
        ]);

        $deleteResponse = $this->deleteJson("/api/admin/shifts/{$shiftId}", [], $headers);
        $deleteResponse->assertStatus(200);
        $this->assertDatabaseMissing('shifts', ['id' => $shiftId]);
    }
}
