<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds: pinned_to_top and bumped_at to products table to allow bumping old/new products to the top.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'pinned_to_top')) {
                $table->boolean('pinned_to_top')->default(false)->after('is_featured');
            }
            if (!Schema::hasColumn('products', 'bumped_at')) {
                $table->timestamp('bumped_at')->nullable()->after('is_featured');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'pinned_to_top')) {
                $table->dropColumn('pinned_to_top');
            }
            if (Schema::hasColumn('products', 'bumped_at')) {
                $table->dropColumn('bumped_at');
            }
        });
    }
};
