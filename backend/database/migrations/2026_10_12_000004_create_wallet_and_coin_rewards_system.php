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
        // 1. Add wallet and daily coins tracking to user_profiles table
        Schema::table('user_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('user_profiles', 'wallet_balance')) {
                $table->decimal('wallet_balance', 10, 2)->default(0.00)->after('points');
            }
            if (!Schema::hasColumn('user_profiles', 'last_daily_coin_at')) {
                $table->date('last_daily_coin_at')->nullable()->after('wallet_balance');
            }
            if (!Schema::hasColumn('user_profiles', 'daily_streak')) {
                $table->integer('daily_streak')->default(0)->after('last_daily_coin_at');
            }
            // CRITICAL INTERNAL ANTI-BOT LIMIT: Lifetime free coins earned cap (500 coins max)
            // Silently prevents bot farm exploitation without alerting users.
            if (!Schema::hasColumn('user_profiles', 'lifetime_free_coins')) {
                $table->integer('lifetime_free_coins')->default(0)->after('daily_streak');
            }
        });

        // 2. Create wallet_transactions table for ledger tracking
        if (!Schema::hasTable('wallet_transactions')) {
            Schema::create('wallet_transactions', function (Blueprint $table) {
                $table->id();
                $table->string('firebase_uid')->index();
                $table->string('type'); // deposit, purchase, coin_reward, coin_redeem, refund, admin_adjustment
                $table->decimal('amount', 10, 2)->default(0.00); // USD amount
                $table->integer('coins')->default(0); // Coin count (+/-)
                $table->string('description');
                $table->string('payment_method')->nullable(); // bakong, aba, wing, card, wallet, daily_checkin, activity_bonus
                $table->string('reference_id')->nullable()->index(); // deposit_id or order_id
                $table->string('status')->default('completed'); // completed, pending, failed
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');

        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('user_profiles', 'wallet_balance')) {
                $table->dropColumn(['wallet_balance', 'last_daily_coin_at', 'daily_streak', 'lifetime_free_coins']);
            }
        });
    }
};
