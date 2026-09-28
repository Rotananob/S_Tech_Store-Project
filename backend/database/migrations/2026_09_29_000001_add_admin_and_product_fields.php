<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds: is_admin flag, avatar_url for profile photo, sale_price for products
     */
    public function up(): void
    {
        // Add is_admin and avatar_url to user_profiles
        Schema::table('user_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('user_profiles', 'is_admin')) {
                $table->boolean('is_admin')->default(false)->after('points');
            }
            if (!Schema::hasColumn('user_profiles', 'avatar_url')) {
                $table->string('avatar_url')->nullable()->after('photo_url');
            }
        });

        // Add sale_price to products so discounts can be shown
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'sale_price')) {
                $table->decimal('sale_price', 10, 2)->nullable()->after('price');
            }
            if (!Schema::hasColumn('products', 'brand')) {
                $table->string('brand')->nullable()->after('sale_price');
            }
            if (!Schema::hasColumn('products', 'badge')) {
                $table->string('badge')->nullable()->after('brand');
            }
            if (!Schema::hasColumn('products', 'rating')) {
                $table->decimal('rating', 3, 2)->default(0)->after('badge');
            }
            if (!Schema::hasColumn('products', 'reviews_count')) {
                $table->integer('reviews_count')->default(0)->after('rating');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn(['is_admin', 'avatar_url']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['sale_price', 'brand', 'badge', 'rating', 'reviews_count']);
        });
    }
};
