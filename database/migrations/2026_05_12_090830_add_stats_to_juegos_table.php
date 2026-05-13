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
        Schema::table('juegos', function (Blueprint $table) {
            $table->double('total_calentamiento', 8, 2)->default(0.0)->after('temperatura');
            $table->double('total_reduccion', 8, 2)->default(0.0)->after('total_calentamiento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('juegos', function (Blueprint $table) {
            $table->dropColumn(['total_calentamiento', 'total_reduccion']);
        });
    }
};
