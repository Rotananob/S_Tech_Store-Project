<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AdminTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MasterSystemControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure system_settings table has master_system_state initialized
        DB::table('system_settings')->updateOrInsert(
            ['key' => 'master_system_state'],
            [
                'value' => json_encode([
                    'mode' => 'online',
                    'maintenance_mode' => false,
                    'vacation_mode' => false,
                    'night_lock_enabled' => false,
                    'night_lock_forced' => false,
                    'staff_lockdown' => false,
                ]),
                'updated_at' => now(),
            ]
        );
    }

    private function createAdminToken(string $role = 'admin'): array
    {
        $admin = User::create([
            'name' => 'Tech Lead Admin',
            'email' => 'admin_lead@stech.com',
            'password' => bcrypt('LeaderSecret123!'),
            'role' => $role,
            'status' => 'active',
        ]);

        $token = AdminTokenService::createToken($admin);

        return [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ];
    }

    public function test_public_store_status_returns_online_mode_by_default(): void
    {
        $response = $this->getJson('/api/store-status');

        $response->assertStatus(200);
        $cacheControl = (string)$response->headers->get('Cache-Control');
        $this->assertStringContainsString('no-cache', $cacheControl);
        $this->assertStringContainsString('no-store', $cacheControl);
        $response->assertJson([
            'status' => 'online',
            'maintenance' => [
                'active' => false,
            ],
            'vacation' => [
                'active' => false,
            ],
        ]);
    }

    public function test_unauthenticated_request_cannot_toggle_master_system_settings(): void
    {
        $this->postJson('/api/admin/master/toggle-maintenance', ['enabled' => true])
            ->assertStatus(401);

        $this->postJson('/api/admin/master/toggle-vacation', ['enabled' => true])
            ->assertStatus(401);

        $this->postJson('/api/admin/master/toggle-staff-lockdown', ['enabled' => true])
            ->assertStatus(401);
    }

    public function test_admin_can_toggle_maintenance_mode(): void
    {
        $headers = $this->createAdminToken();

        $enableResponse = $this->postJson('/api/admin/master/toggle-maintenance', [
            'enabled' => true,
            'title' => 'Scheduled System Upgrade',
            'reason' => 'Database migration and performance scaling in progress',
        ], $headers);

        $enableResponse->assertStatus(200);
        $enableResponse->assertJson([
            'success' => true,
            'maintenance_mode' => true,
            'mode' => 'maintenance',
        ]);

        $publicResponse = $this->getJson('/api/store-status');
        $publicResponse->assertStatus(200);
        $publicResponse->assertJson([
            'status' => 'maintenance',
            'maintenance' => [
                'active' => true,
                'title' => 'Scheduled System Upgrade',
            ],
        ]);

        $disableResponse = $this->postJson('/api/admin/master/toggle-maintenance', [
            'enabled' => false,
        ], $headers);

        $disableResponse->assertStatus(200);
        $disableResponse->assertJson([
            'success' => true,
            'maintenance_mode' => false,
            'mode' => 'online',
        ]);

        $publicAfterDisable = $this->getJson('/api/store-status');
        $publicAfterDisable->assertJson([
            'status' => 'online',
            'maintenance' => [
                'active' => false,
            ],
        ]);
    }

    public function test_admin_can_toggle_vacation_mode(): void
    {
        $headers = $this->createAdminToken();

        $vacationResponse = $this->postJson('/api/admin/master/toggle-vacation', [
            'enabled' => true,
            'days' => 4,
            'title' => 'Holiday Closure',
            'reason' => 'Store closed for National Holiday',
        ], $headers);

        $vacationResponse->assertStatus(200);
        $vacationResponse->assertJson([
            'success' => true,
            'vacation_mode' => true,
            'mode' => 'vacation',
        ]);

        $publicResponse = $this->getJson('/api/store-status');
        $publicResponse->assertStatus(200);
        $publicResponse->assertJson([
            'status' => 'vacation',
            'vacation' => [
                'active' => true,
                'days' => 4,
            ],
        ]);
    }

    public function test_admin_can_purge_system_caches(): void
    {
        $headers = $this->createAdminToken();

        $response = $this->postJson('/api/admin/master/purge-caches', [], $headers);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);
        $this->assertNotEmpty($response->json('last_cache_purge'));
    }

    public function test_admin_can_update_coin_reward_multiplier(): void
    {
        $headers = $this->createAdminToken();

        $response = $this->postJson('/api/admin/master/coin-multiplier', [
            'multiplier' => 2.5,
        ], $headers);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'coin_multiplier' => 2.5,
        ]);
    }
}
