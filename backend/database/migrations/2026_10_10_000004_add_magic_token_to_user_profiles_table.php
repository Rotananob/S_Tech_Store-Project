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
        Schema::table('user_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('user_profiles', 'magic_login_token')) {
                $table->string('magic_login_token', 128)->nullable()->index();
            }
            if (!Schema::hasColumn('user_profiles', 'magic_token_expires_at')) {
                $table->timestamp('magic_token_expires_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('user_profiles', 'magic_login_token')) {
                $table->dropColumn('magic_login_token');
            }
            if (Schema::hasColumn('user_profiles', 'magic_token_expires_at')) {
                $table->dropColumn('magic_token_expires_at');
            }
        });
    }
};
