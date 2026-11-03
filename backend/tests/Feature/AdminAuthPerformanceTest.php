<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Http\Controllers\AdminAuthController;
use Tests\TestCase;

class AdminAuthPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_login_returns_fast_and_successful(): void
    {
        $admin = User::factory()->create([
            'name' => 'Store Administrator',
            'email' => 'admin@stechstore.com',
            'password' => Hash::make('AdminPass123!@#'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $start = microtime(true);
        $response = $this->postJson('/api/admin/login', [
            'email' => 'admin@stechstore.com',
            'password' => 'AdminPass123!@#',
        ]);
        $duration = microtime(true) - $start;

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'token',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'role',
                    'permissions',
                ],
            ]);

        $this->assertEquals('admin', $response->json('user.role'));
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_staff_login_returns_fast_and_successful(): void
    {
        $staff = User::factory()->create([
            'name' => 'Cashier Specialist',
            'email' => 'cashier@stechstore.com',
            'password' => Hash::make('Cashier123'),
            'role' => 'staff',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/admin/login', [
            'email' => 'cashier@stechstore.com',
            'password' => 'Cashier123',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('staff', $response->json('user.role'));
        $this->assertContains('manage_orders', $response->json('user.permissions'));
    }

    public function test_system_owner_login_auto_promotes_to_super_admin(): void
    {
        $owner = User::factory()->create([
            'name' => 'System Owner',
            'email' => 'nobrothana180703@gmail.com',
            'password' => Hash::make('SuperMaster2026!@#'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/admin/login', [
            'email' => 'nobrothana180703@gmail.com',
            'password' => 'SuperMaster2026!@#',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('super_admin', $response->json('user.role'));
        $this->assertEquals(['*'], $response->json('user.permissions'));
    }

    public function test_invalid_credentials_rejected_cleanly(): void
    {
        User::factory()->create([
            'email' => 'tech@stechstore.com',
            'password' => Hash::make('ValidPass123'),
        ]);

        $response = $this->postJson('/api/admin/login', [
            'email' => 'tech@stechstore.com',
            'password' => 'WrongPassword999',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Invalid email or password. Access denied.']);
    }

    public function test_inactive_account_blocked(): void
    {
        User::factory()->create([
            'email' => 'inactive@stechstore.com',
            'password' => Hash::make('Inactive123'),
            'status' => 'inactive',
        ]);

        $response = $this->postJson('/api/admin/login', [
            'email' => 'inactive@stechstore.com',
            'password' => 'Inactive123',
        ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'This account has been deactivated. Please contact the administrator.']);
    }

    public function test_sql_injection_payload_blocked_with_403(): void
    {
        $response = $this->postJson('/api/admin/login', [
            'email' => "admin' OR 1=1 --",
            'password' => 'anything',
        ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Malicious payload signature detected. Incident reported to security team.']);
    }

    public function test_password_complexity_tiered_rules(): void
    {
        // Super Admin requires >= 12 chars, upper, lower, digit, special symbol
        $this->assertNotNull(AdminAuthController::validatePasswordForRole('short', 'super_admin'));
        $this->assertNotNull(AdminAuthController::validatePasswordForRole('ALLUPPERNOLOWER123!', 'super_admin'));
        $this->assertNull(AdminAuthController::validatePasswordForRole('ValidSuperAdmin2026!@#', 'super_admin'));

        // Admin requires >= 8 chars, letters, digit, special symbol
        $this->assertNotNull(AdminAuthController::validatePasswordForRole('short7!', 'admin'));
        $this->assertNull(AdminAuthController::validatePasswordForRole('AdminSecret123#', 'admin'));

        // Staff requires >= 6 chars, letters and digits
        $this->assertNotNull(AdminAuthController::validatePasswordForRole('12345', 'staff'));
        $this->assertNull(AdminAuthController::validatePasswordForRole('Staff2026', 'staff'));
    }
}
