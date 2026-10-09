<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add role, branch, shift, status, and api_token to users table
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role', 30)->default('staff')->after('password'); // admin, staff, manager
            }
            if (!Schema::hasColumn('users', 'branch')) {
                $table->string('branch', 100)->nullable()->after('role');
            }
            if (!Schema::hasColumn('users', 'shift')) {
                $table->string('shift', 100)->nullable()->after('branch');
            }
            if (!Schema::hasColumn('users', 'status')) {
                $table->string('status', 20)->default('active')->after('shift'); // active, inactive
            }
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone', 30)->nullable()->after('status');
            }
            if (!Schema::hasColumn('users', 'permissions')) {
                $table->json('permissions')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('users', 'api_token')) {
                $table->string('api_token', 128)->nullable()->unique()->after('permissions');
            }
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('api_token');
            }
        });

        // 2. Create branches table
        if (!Schema::hasTable('branches')) {
            Schema::create('branches', function (Blueprint $table) {
                $table->id();
                $table->string('name', 150);
                $table->string('code', 30)->unique();
                $table->string('address', 255)->nullable();
                $table->string('phone', 50)->nullable();
                $table->string('manager_name', 100)->nullable();
                $table->string('opening_hours', 100)->default('08:00 AM - 08:00 PM');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 3. Create shifts table
        if (!Schema::hasTable('shifts')) {
            Schema::create('shifts', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100); // វេនព្រឹក, វេនថ្ងៃ/ល្ងាច, វេនពេញម៉ោង
                $table->string('code', 30)->unique();
                $table->string('start_time', 20); // 08:00 AM
                $table->string('end_time', 20);   // 05:00 PM
                $table->string('days', 100)->default('Mon - Sat');
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('branches');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'role',
                'branch',
                'shift',
                'status',
                'phone',
                'permissions',
                'api_token',
                'last_login_at',
            ]);
        });
    }
};
