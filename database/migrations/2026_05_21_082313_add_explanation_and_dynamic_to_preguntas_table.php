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
        Schema::table('preguntas', function (Blueprint $table) {
            $table->text('explicacion')->nullable()->after('rango_max');
            $table->text('dinamica_grupo')->nullable()->after('explicacion');
            $table->integer('tiempo_dinamica')->nullable()->default(120)->after('dinamica_grupo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('preguntas', function (Blueprint $table) {
            $table->dropColumn(['explicacion', 'dinamica_grupo', 'tiempo_dinamica']);
        });
    }
};
