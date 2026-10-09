<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('user_profiles', 'gps_lat')) {
                $table->decimal('gps_lat', 10, 7)->nullable()->after('address');
            }
            if (!Schema::hasColumn('user_profiles', 'gps_lng')) {
                $table->decimal('gps_lng', 10, 7)->nullable()->after('gps_lat');
            }
            if (!Schema::hasColumn('user_profiles', 'telegram')) {
                $table->string('telegram', 100)->nullable()->after('phone');
            }
            if (!Schema::hasColumn('user_profiles', 'profession')) {
                $table->string('profession', 150)->nullable()->after('telegram');
            }
            if (!Schema::hasColumn('user_profiles', 'gender')) {
                $table->string('gender', 30)->nullable()->after('profession');
            }
            if (!Schema::hasColumn('user_profiles', 'birthday')) {
                $table->string('birthday', 50)->nullable()->after('gender');
            }
            if (!Schema::hasColumn('user_profiles', 'delivery_notes')) {
                $table->text('delivery_notes')->nullable()->after('city');
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'gps_lat', 'gps_lng', 'telegram', 'profession',
                'gender', 'birthday', 'delivery_notes'
            ]);
        });
    }
};
