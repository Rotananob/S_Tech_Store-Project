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
        Schema::table('user_notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('user_notifications', 'link')) {
                $table->string('link', 500)->nullable()->after('type');
            }
            if (!Schema::hasColumn('user_notifications', 'image')) {
                $table->string('image', 1000)->nullable()->after('link');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_notifications', function (Blueprint $table) {
            if (Schema::hasColumn('user_notifications', 'image')) {
                $table->dropColumn('image');
            }
            if (Schema::hasColumn('user_notifications', 'link')) {
                $table->dropColumn('link');
            }
        });
    }
};
