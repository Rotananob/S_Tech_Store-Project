<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('user_profiles', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('points');
            }
            if (!Schema::hasColumn('user_profiles', 'status')) {
                $table->string('status', 30)->default('active')->after('is_active');
            }
            if (!Schema::hasColumn('user_profiles', 'last_password_reset_at')) {
                $table->timestamp('last_password_reset_at')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn(['is_active', 'status', 'last_password_reset_at']);
        });
    }
};
