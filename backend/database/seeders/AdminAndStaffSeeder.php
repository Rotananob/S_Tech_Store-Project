<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Branch;
use App\Models\Shift;

class AdminAndStaffSeeder extends Seeder
{
    /**
     * Run the database seeds with ultra-secure Bcrypt hashes (Cost 12).
     */
    public function run(): void
    {
        // 1. Seed Standard Branches
        $branchPP = Branch::updateOrCreate(
            ['code' => 'ST-PP-MAIN'],
            [
                'name' => 'Phnom Penh Main Branch (សាខាកណ្តាល)',
                'address' => '#128, Preah Monivong Blvd, Sangkat Boeung Keng Kang 1, Phnom Penh',
                'phone' => '+855 23 888 999',
                'manager_name' => 'Rotana Nob',
                'opening_hours' => '08:00 AM - 08:30 PM',
                'is_active' => true,
            ]
        );

        Branch::updateOrCreate(
            ['code' => 'ST-TK-02'],
            [
                'name' => 'Toul Kork Branch (សាខាទួលគោក)',
                'address' => 'St 315, Sangkat Boeung Kak 1, Khan Toul Kork, Phnom Penh',
                'phone' => '+855 23 888 777',
                'manager_name' => 'Sokha Meng',
                'opening_hours' => '08:30 AM - 08:00 PM',
                'is_active' => true,
            ]
        );

        Branch::updateOrCreate(
            ['code' => 'ST-SR-03'],
            [
                'name' => 'Siem Reap Branch (សាខាសៀមរាប)',
                'address' => 'Sivutha Blvd, Svay Dangkum, Krong Siem Reap',
                'phone' => '+855 63 999 555',
                'manager_name' => 'Dara Chan',
                'opening_hours' => '08:00 AM - 07:30 PM',
                'is_active' => true,
            ]
        );

        // 2. Seed Standard Shifts
        $shiftMorning = Shift::updateOrCreate(
            ['code' => 'SHIFT-AM'],
            [
                'name' => 'Morning Shift (វេនព្រឹក)',
                'start_time' => '08:00 AM',
                'end_time' => '05:00 PM',
                'days' => 'Monday - Saturday',
                'description' => 'Morning store opening, customer consultations, stock inventory check, and order dispatch.',
                'is_active' => true,
            ]
        );

        Shift::updateOrCreate(
            ['code' => 'SHIFT-PM'],
            [
                'name' => 'Afternoon/Evening Shift (វេនរសៀល/យប់)',
                'start_time' => '01:00 PM',
                'end_time' => '09:30 PM',
                'days' => 'Monday - Saturday',
                'description' => 'Peak sales hours, evening customer walk-ins, daily revenue closing, and nightly backups.',
                'is_active' => true,
            ]
        );

        $shiftFull = Shift::updateOrCreate(
            ['code' => 'SHIFT-FT'],
            [
                'name' => 'Full-Time Shift (វេនពេញម៉ោង)',
                'start_time' => '08:00 AM',
                'end_time' => '06:00 PM',
                'days' => 'Monday - Saturday',
                'description' => 'Full administrative & operations management shift.',
                'is_active' => true,
            ]
        );

        // 3. Seed Super Admin (ម្ចាស់ប្រព័ន្ធ / System Owner) Accounts with Cost 12 Bcrypt Hash
        $ownerEmails = [
            'owner@stechstore.com',
            'nobrothana180703@gmail.com',
            'rotananob@gmail.com',
        ];

        $ownerPassword = env('ADMIN_OWNER_PASSWORD') ?: bin2hex(random_bytes(16));
        foreach ($ownerEmails as $oEmail) {
            $ownerToken = bin2hex(random_bytes(32));
            User::updateOrCreate(
                ['email' => $oEmail],
                [
                    'name' => 'Rotana Nob (System Owner)',
                    'password' => Hash::make($ownerPassword, ['rounds' => 12]),
                    'role' => 'super_admin',
                    'branch' => 'Phnom Penh Main Branch (សាខាកណ្តាល)',
                    'shift' => 'Full-Time Shift (វេនពេញម៉ោង)',
                    'status' => 'active',
                    'phone' => '+855 12 888 999',
                    'permissions' => ['*'],
                    'api_token' => $ownerToken,
                ]
            );

            UserProfile::updateOrCreate(
                ['email' => $oEmail],
                [
                    'firebase_uid' => 'OWNER_ROOT_' . md5($oEmail),
                    'display_name' => 'Rotana Nob (System Owner)',
                    'is_admin' => true,
                    'phone' => '+855 12 888 999',
                ]
            );
        }

        // 4. Seed Standard Administrator (Admin - អ្នកគ្រប់គ្រងទូទៅ)
        $adminPassword = env('ADMIN_PASSWORD') ?: bin2hex(random_bytes(16));
        $adminToken = bin2hex(random_bytes(32));
        $adminUser = User::updateOrCreate(
            ['email' => 'admin@stechstore.com'],
            [
                'name' => 'S Tech Admin',
                'password' => Hash::make($adminPassword, ['rounds' => 12]),
                'role' => 'admin',
                'branch' => 'Phnom Penh Main Branch (សាខាកណ្តាល)',
                'shift' => 'Full-Time Shift (វេនពេញម៉ោង)',
                'status' => 'active',
                'phone' => '+855 12 888 999',
                'permissions' => [
                    'all',
                    'manage_products',
                    'manage_orders',
                    'manage_staff',
                    'manage_branches',
                    'manage_shifts',
                    'manage_promotions',
                    'system_settings',
                    'financial_reports',
                ],
                'api_token' => $adminToken,
            ]
        );

        UserProfile::updateOrCreate(
            ['email' => 'admin@stechstore.com'],
            [
                'firebase_uid' => 'ADMIN_SYSTEM_' . md5('admin@stechstore.com'),
                'display_name' => 'S Tech Admin',
                'is_admin' => true,
                'phone' => '+855 12 888 999',
            ]
        );

        // 5. Seed Staff Account (បុគ្គលិកហាង & ផ្នែកលក់)
        $staffPassword = env('STAFF_PASSWORD') ?: bin2hex(random_bytes(16));
        $staffToken = bin2hex(random_bytes(32));
        $staffUser = User::updateOrCreate(
            ['email' => 'staff@stechstore.com'],
            [
                'name' => 'S Tech Operations Staff',
                'password' => Hash::make($staffPassword, ['rounds' => 12]),
                'role' => 'staff',
                'branch' => 'Phnom Penh Main Branch (សាខាកណ្តាល)',
                'shift' => 'Morning Shift (វេនព្រឹក)',
                'status' => 'active',
                'phone' => '+855 77 666 555',
                'permissions' => [
                    'manage_products',
                    'manage_orders',
                    'view_inventory',
                    'customer_service',
                    'process_repairs',
                ],
                'api_token' => $staffToken,
            ]
        );

        UserProfile::updateOrCreate(
            ['email' => 'staff@stechstore.com'],
            [
                'firebase_uid' => 'STAFF_SYSTEM_' . md5('staff@stechstore.com'),
                'display_name' => 'S Tech Operations Staff',
                'is_admin' => true,
                'phone' => '+855 77 666 555',
            ]
        );
    }
}
