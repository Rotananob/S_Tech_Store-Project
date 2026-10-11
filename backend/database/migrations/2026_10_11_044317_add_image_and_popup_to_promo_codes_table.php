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
        Schema::table('promo_codes', function (Blueprint $table) {
            $table->text('image_url')->nullable()->after('name');
            $table->boolean('show_popup')->default(false)->after('auto_applied');
            $table->text('description')->nullable()->after('show_popup');
            $table->string('target_url')->nullable()->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promo_codes', function (Blueprint $table) {
            $table->dropColumn(['image_url', 'show_popup', 'description', 'target_url']);
        });
    }
};
