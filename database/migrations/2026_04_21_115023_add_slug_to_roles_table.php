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
        Schema::table('roles', function (Blueprint $table) {
            $table->string('slug', 50)->unique()->after('nombre')->nullable();
        });

        // Rellenar slugs en los roles ya existentes para no dejarlos en NULL
        $slugMap = [
            'Industria Textil' => 'textil',
            'Ciencia e I+D'    => 'ciencia',
            'Gigantes Tech'    => 'tech',
            'Sector Primario'  => 'primario',
            'Sector Público'   => 'publico',
            'Ciudadanía'       => 'ciudadania',
        ];
        foreach ($slugMap as $nombre => $slug) {
            \Illuminate\Support\Facades\DB::table('roles')
                ->where('nombre', $nombre)
                ->whereNull('slug')
                ->update(['slug' => $slug]);
        }
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
