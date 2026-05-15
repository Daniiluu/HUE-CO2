<?php
$juego = DB::table('juegos')->latest('juego_id')->first();
$carta = DB::table('cartas')->where('carta_id', $juego->current_carta_id)->first();
echo "Juego: {$juego->juego_id} | Turno: {$juego->current_turn} | Carta: {$juego->current_carta_id} | SectorID: {$carta->rol_id}\n";

$owner = DB::table('juego_participante')
    ->where('juego_id', $juego->juego_id)
    ->where('rol_id', $carta->rol_id)
    ->first();

if ($owner) {
    $participante = DB::table('participantes')->where('participante_id', $owner->participante_id)->first();
    echo "Dueño del sector: {$participante->usuario} (ID: {$owner->participante_id})\n";
} else {
    echo "Sector sin dueño en este juego\n";
}
