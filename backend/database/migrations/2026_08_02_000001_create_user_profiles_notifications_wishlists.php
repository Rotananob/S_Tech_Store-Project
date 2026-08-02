<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('firebase_uid')->unique();
            $table->string('display_name')->nullable();
            $table->string('email')->nullable();
            $table->string('photo_url')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->boolean('two_fa_enabled')->default(false);
            $table->boolean('notif_orders')->default(true);
            $table->boolean('notif_promos')->default(true);
            $table->boolean('notif_builds')->default(true);
            $table->integer('points')->default(0);
            $table->timestamps();
        });

        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('firebase_uid')->index();
            $table->string('title');
            $table->text('message');
            $table->string('type')->default('system'); // welcome, login, promo, order, system
            $table->boolean('read')->default(false);
            $table->timestamps();
        });

        Schema::create('wishlists', function (Blueprint $table) {
            $table->id();
            $table->string('firebase_uid')->index();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['firebase_uid', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlists');
        Schema::dropIfExists('user_notifications');
        Schema::dropIfExists('user_profiles');
    }
};
