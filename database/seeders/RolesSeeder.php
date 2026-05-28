<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolesSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('roles')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        DB::table('roles')->insert([
            ['nombre' => 'Industria Textil', 'slug' => 'textil',     'habilidades' => 'Pasiva: Reduce coste ET en Ropa. Activa: Cerrar el Ciclo (Descarta y saca reto nuevo).'],
            ['nombre' => 'Ciencia e I+D',    'slug' => 'ciencia',    'habilidades' => 'Pasiva: Cartas sin bloqueo. Activa: Salto Tecnológico (Auto-acierto).'],
            ['nombre' => 'EcoTech',          'slug' => 'tech',       'habilidades' => 'Pasiva: Ve eventos futuros. Activa: Algoritmo de Eficiencia (Mitiga 50% de evento).'],
            ['nombre' => 'Sector Primario',  'slug' => 'primario',   'habilidades' => 'Pasiva: Escudo automático. Activa: Restauración de Ecosistemas (Baja temp global).'],
            ['nombre' => 'Sector Legislativo',   'slug' => 'legislativo',    'habilidades' => 'Pasiva: Impuestos verdes (+1 ET). Activa: Ley de Emergencia (Bloquea evento).'],
            ['nombre' => 'Ciudadanía',       'slug' => 'ciudadania', 'habilidades' => 'Pasiva: +2 ET extra por turno. Activa: Presión Social (Elimina 50% de errores).'],
        ]);
    }
}