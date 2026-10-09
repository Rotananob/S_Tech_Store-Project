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
        if (!Schema::hasTable('repairs')) {
            Schema::create('repairs', function (Blueprint $table) {
                $table->id();
                $table->string('ticket_code')->unique();
                $table->string('customer_name');
                $table->string('customer_phone')->nullable();
                $table->string('device_name');
                $table->text('issue_description');
                $table->string('technician_name')->default('Unassigned');
                $table->decimal('estimated_cost', 10, 2)->default(0);
                $table->string('status')->default('Pending Assessment');
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('repairs');
    }
};
