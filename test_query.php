<?php
$cartas = App\Models\Carta::where('texto', 'LIKE', '%Sequía extrema%')->get();
foreach($cartas as $carta) {
    dump("ID: " . $carta->carta_id . " - Tipo: " . $carta->tipo . " - Texto: " . $carta->texto);
}
