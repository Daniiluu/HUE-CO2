<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AnillosSeeder extends Seeder
{
    public function run(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
        }

        DB::table('anillos')->truncate();

        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON;');
        }

        DB::table('anillos')->insert([
            ['nombre' => 'Agua', 'orden' => 1],
            ['nombre' => 'Energía', 'orden' => 2],
            ['nombre' => 'Plástico', 'orden' => 3],
            ['nombre' => 'Pantallas', 'orden' => 4],
            ['nombre' => 'Ropa', 'orden' => 5],
        ]);
    }
}