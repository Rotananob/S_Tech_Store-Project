<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add critical high-performance indexes on orders, order_items, products, and user_profiles
     */
    public function up(): void
    {
        // 1. Orders table indexes
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'user_id')) {
                $table->index('user_id', 'orders_user_id_perf_idx');
            }
            if (Schema::hasColumn('orders', 'customer_email')) {
                $table->index('customer_email', 'orders_customer_email_perf_idx');
            }
            if (Schema::hasColumn('orders', 'customer_phone')) {
                $table->index('customer_phone', 'orders_customer_phone_perf_idx');
            }
            if (Schema::hasColumn('orders', 'status')) {
                $table->index('status', 'orders_status_perf_idx');
            }
            if (Schema::hasColumn('orders', 'created_at')) {
                $table->index('created_at', 'orders_created_at_perf_idx');
            }
        });

        // 2. Order Items table indexes
        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasColumn('order_items', 'order_id')) {
                $table->index('order_id', 'order_items_order_id_perf_idx');
            }
            if (Schema::hasColumn('order_items', 'product_id')) {
                $table->index('product_id', 'order_items_product_id_perf_idx');
            }
        });

        // 3. Products table indexes
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'category_id')) {
                $table->index('category_id', 'products_category_id_perf_idx');
            }
            if (Schema::hasColumn('products', 'is_active')) {
                $table->index('is_active', 'products_is_active_perf_idx');
            }
            if (Schema::hasColumn('products', 'is_featured')) {
                $table->index('is_featured', 'products_is_featured_perf_idx');
            }
            if (Schema::hasColumn('products', 'is_pinned')) {
                $table->index('is_pinned', 'products_is_pinned_perf_idx');
            }
            if (Schema::hasColumn('products', 'created_at')) {
                $table->index('created_at', 'products_created_at_perf_idx');
            }
        });

        // 4. User Profiles table indexes
        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('user_profiles', 'email')) {
                $table->index('email', 'user_profiles_email_perf_idx');
            }
            if (Schema::hasColumn('user_profiles', 'phone')) {
                $table->index('phone', 'user_profiles_phone_perf_idx');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_user_id_perf_idx');
            $table->dropIndex('orders_customer_email_perf_idx');
            $table->dropIndex('orders_customer_phone_perf_idx');
            $table->dropIndex('orders_status_perf_idx');
            $table->dropIndex('orders_created_at_perf_idx');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex('order_items_order_id_perf_idx');
            $table->dropIndex('order_items_product_id_perf_idx');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_category_id_perf_idx');
            $table->dropIndex('products_is_active_perf_idx');
            $table->dropIndex('products_is_featured_perf_idx');
            $table->dropIndex('products_is_pinned_perf_idx');
            $table->dropIndex('products_created_at_perf_idx');
        });

        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropIndex('user_profiles_email_perf_idx');
            $table->dropIndex('user_profiles_phone_perf_idx');
        });
    }
};
