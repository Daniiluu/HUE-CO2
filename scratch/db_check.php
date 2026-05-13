<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$tables = ['juegos', 'participantes', 'roles', 'anillos', 'cartas', 'preguntas'];
foreach ($tables as $table) {
    try {
        $count = DB::table($table)->count();
        echo "$table: $count rows\n";
    } catch (\Exception $e) {
        echo "$table: ERROR (" . $e->getMessage() . ")\n";
    }
}
