<?php
$voto = App\Models\Turno::whereNotNull('resultado')->where('resultado', 'not like', 'partial')->where('resultado', 'not like', 'valid')->where('resultado', 'not like', 'invalid')->latest('updated_at')->first();
if ($voto) {
    dump("Juego ID: " . $voto->juego_id);
    dump("Carta ID: " . $voto->carta_id);
    dump("Resultado: " . $voto->resultado);
    
    $carta = App\Models\Carta::with('preguntas.opciones')->find($voto->carta_id);
    if ($carta && $carta->preguntas->count() > 0) {
        $pregunta = $carta->preguntas->first();
        $opcionCorrecta = $pregunta->opciones->where('correcta', 1)->first() ?? $pregunta->opciones->where('correcta', true)->first();
        dump('Opción Correcta calculada: ' . ($opcionCorrecta ? $opcionCorrecta->texto : 'NO CORRECT OPTION FOUND'));
        
        if ($opcionCorrecta) {
            $valRecibida = trim((string) $voto->resultado);
            $valEsperada = trim((string) $opcionCorrecta->texto);
            dump('Recibida: ' . $valRecibida);
            dump('Esperada: ' . $valEsperada);
            dump('Match (strcasecmp): ' . (strcasecmp($valRecibida, $valEsperada) === 0 ? 'YES' : 'NO'));
            dump('Match (==): ' . ($valRecibida == $valEsperada ? 'YES' : 'NO'));
            dump('JSON Recibida: ' . json_encode($valRecibida));
            dump('JSON Esperada: ' . json_encode($valEsperada));
        }
    } else {
        dump("La carta no tiene preguntas u opciones.");
    }
} else {
    dump("No hay votos de tipo options en la base de datos.");
}
