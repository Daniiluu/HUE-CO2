<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PreguntasTestSeeder extends Seeder
{
    public function run(): void
    {
        // Limpiar tablas para evitar errores de duplicidad
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('opciones_respuesta')->truncate();
        DB::table('preguntas')->truncate();
        DB::table('cartas')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // ─────────────────────────────────────────────
        // DEFINICIÓN DE PREGUNTAS POR ANILLO (ID)
        // ─────────────────────────────────────────────

        $data = [
            // --- 1. AGUA ---
            1 => [
                'anillo_id' => 1,
                'texto' => '¿Qué porcentaje aproximado del agua del planeta es agua dulce disponible para consumo humano?',
                'tipo' => 'options',
                'opciones' => [['texto' => '50%', 'c' => 0], ['texto' => '25%', 'c' => 0], ['texto' => '1%', 'c' => 1]],
            ],
            // --- 2. ENERGÍA ---
            2 => [
                'anillo_id' => 2,
                'texto' => '¿Cuál de estas fuentes produce menos emisiones de CO₂ en su ciclo de vida?',
                'tipo' => 'options',
                'opciones' => [['texto' => 'Carbón', 'c' => 0], ['texto' => 'Gas natural', 'c' => 0], ['texto' => 'Solar fotovoltaica', 'c' => 1]],
            ],
            // --- 3. PLÁSTICO ---
            3 => [
                'anillo_id' => 3,
                'texto' => '¿Cuál de los siguientes plásticos es más fácil de reciclar habitualmente?',
                'tipo' => 'options',
                'opciones' => [['texto' => 'PVC', 'c' => 0], ['texto' => 'LDPE', 'c' => 0], ['texto' => 'PET', 'c' => 1]],
            ],
            // --- 4. PANTALLAS (TECH) ---
            4 => [
                'anillo_id' => 4,
                'texto' => '¿Por qué los centros de datos consumen tanta energía?',
                'tipo' => 'options',
                'opciones' => [['texto' => 'Están lejos', 'c' => 0], ['texto' => 'Refrigeración y servidores', 'c' => 1], ['texto' => 'No guardan nada', 'c' => 0]],
            ],
            // --- 5. ROPA ---
            5 => [
                'anillo_id' => 5,
                'texto' => '¿Por qué la industria de la moda rápida ("fast fashion") es tan contaminante?',
                'tipo' => 'options',
                'opciones' => [['texto' => 'Produce poco', 'c' => 0], ['texto' => 'Residuos y consumo masivo', 'c' => 1], ['texto' => 'Ropa duradera', 'c' => 0]],
            ],
        ];

        foreach ($data as $p) {
            $cartaId = DB::table('cartas')->insertGetId([
                'anillo_id' => $p['anillo_id'],
                'tipo' => 'pregunta',
                'texto' => $p['texto'],
                'tiempo' => 30,
                'puntos' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $preguntaId = DB::table('preguntas')->insertGetId([
                'carta_id' => $cartaId,
                'texto' => $p['texto'],
                'tipo_pregunta' => $p['tipo'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($p['tipo'] === 'options') {
                foreach ($p['opciones'] as $o) {
                    DB::table('opciones_respuesta')->insert([
                        'pregunta_id' => $preguntaId,
                        'texto' => $o['texto'],
                        'correcta' => $o['c'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }
}