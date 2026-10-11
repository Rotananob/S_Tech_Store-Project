<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('user_profiles', 'telegram_chat_id')) {
                $table->string('telegram_chat_id')->nullable()->index();
            }
            if (!Schema::hasColumn('user_profiles', 'notif_telegram')) {
                $table->boolean('notif_telegram')->default(true);
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('user_profiles', 'telegram_chat_id')) {
                $table->dropColumn('telegram_chat_id');
            }
            if (Schema::hasColumn('user_profiles', 'notif_telegram')) {
                $table->dropColumn('notif_telegram');
            }
        });
    }
};
