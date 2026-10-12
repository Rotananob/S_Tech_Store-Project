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
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'customer_email')) {
                $table->string('customer_email', 255)->nullable()->after('customer_phone');
            }
            if (!Schema::hasColumn('orders', 'tracking_number')) {
                $table->string('tracking_number', 100)->nullable()->after('delivery_type');
            }
            if (!Schema::hasColumn('orders', 'admin_notes')) {
                $table->text('admin_notes')->nullable()->after('payment_details');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'admin_notes')) {
                $table->dropColumn('admin_notes');
            }
            if (Schema::hasColumn('orders', 'tracking_number')) {
                $table->dropColumn('tracking_number');
            }
            if (Schema::hasColumn('orders', 'customer_email')) {
                $table->dropColumn('customer_email');
            }
        });
    }
};
