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
        if (!Schema::hasTable('analytics_visits')) {
            Schema::create('analytics_visits', function (Blueprint $table) {
                $table->id();
                $table->string('ip_address', 45)->nullable()->index();
                $table->string('page', 255)->default('Home Page');
                $table->string('referrer', 255)->nullable();
                $table->string('device', 150)->nullable();
                $table->string('device_id', 150)->nullable()->index();
                $table->string('country', 100)->nullable();
                $table->string('city', 100)->nullable();
                $table->string('isp', 150)->nullable();
                $table->string('screen', 50)->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analytics_visits');
    }
};
