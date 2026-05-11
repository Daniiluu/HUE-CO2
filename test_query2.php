<?php
$pregunta = App\Models\Pregunta::where('carta_id', 7)->first();
if ($pregunta) {
    dump("Pregunta ID: " . $pregunta->pregunta_id . " - Tipo: " . $pregunta->tipo_pregunta);
} else {
    dump("No hay pregunta para esta carta.");
}
