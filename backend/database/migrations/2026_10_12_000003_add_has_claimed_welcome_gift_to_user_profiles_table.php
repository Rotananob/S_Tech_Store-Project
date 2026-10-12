<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('user_profiles', 'has_claimed_welcome_gift')) {
                $table->boolean('has_claimed_welcome_gift')->default(false)->after('points');
            }
            if (!Schema::hasColumn('user_profiles', 'welcome_gift_claimed_at')) {
                $table->timestamp('welcome_gift_claimed_at')->nullable()->after('has_claimed_welcome_gift');
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('user_profiles', 'has_claimed_welcome_gift')) {
                $table->dropColumn('has_claimed_welcome_gift');
            }
            if (Schema::hasColumn('user_profiles', 'welcome_gift_claimed_at')) {
                $table->dropColumn('welcome_gift_claimed_at');
            }
        });
    }
};
