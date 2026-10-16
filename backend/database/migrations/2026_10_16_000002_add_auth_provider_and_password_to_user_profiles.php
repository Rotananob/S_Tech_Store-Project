<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('user_profiles', 'password')) {
                $table->string('password')->nullable()->after('email');
            }
            if (!Schema::hasColumn('user_profiles', 'auth_provider')) {
                $table->string('auth_provider', 50)->nullable()->default('google')->after('password');
            }
            if (!Schema::hasColumn('user_profiles', 'created_by')) {
                $table->string('created_by', 50)->nullable()->default('self')->after('auth_provider');
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('user_profiles', 'password')) {
                $table->dropColumn('password');
            }
            if (Schema::hasColumn('user_profiles', 'auth_provider')) {
                $table->dropColumn('auth_provider');
            }
            if (Schema::hasColumn('user_profiles', 'created_by')) {
                $table->dropColumn('created_by');
            }
        });
    }
};
