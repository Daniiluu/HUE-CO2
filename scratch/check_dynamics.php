<?php
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// 1. Cuántas preguntas tienen dinámica
$count = DB::table('preguntas')->whereNotNull('dinamica_grupo')->count();
echo "Preguntas con dinamica: $count\n";

// 2. Verificar que el modelo las lee bien
$pregunta = App\Models\Pregunta::with('opciones')->whereNotNull('dinamica_grupo')->first();
if ($pregunta) {
    echo "Texto: " . substr($pregunta->texto, 0, 70) . "\n";
    echo "Explicacion (len): " . strlen($pregunta->explicacion) . "\n";
    echo "Dinamica (len): " . strlen($pregunta->dinamica_grupo) . "\n";
    echo "Tiempo: " . $pregunta->tiempo_dinamica . "\n";
    echo "Opciones: " . $pregunta->opciones->count() . "\n";
}

// 3. Simular lo que hace GameFlowService::formatChallenge
$carta = App\Models\Carta::with(['preguntas.opciones'])->whereHas('preguntas', function($q) {
    $q->whereNotNull('dinamica_grupo');
})->first();

if ($carta) {
    $p = $carta->preguntas->first();
    echo "\n--- SIMULACION formatChallenge ---\n";
    echo "carta_id: " . $carta->carta_id . "\n";
    echo "explicacion en pregunta: " . (strlen($p->explicacion ?? '') > 0 ? 'SI (' . strlen($p->explicacion) . ' chars)' : 'NO') . "\n";
    echo "dinamica_grupo en pregunta: " . (strlen($p->dinamica_grupo ?? '') > 0 ? 'SI' : 'NO') . "\n";
    echo "tiempo_dinamica: " . $p->tiempo_dinamica . "\n";
}
