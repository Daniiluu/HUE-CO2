<?php
$juego = DB::table('juegos')->latest('juego_id')->first();
echo "Juego: {$juego->juego_id} | Sala: {$juego->room_code} | Turno: {$juego->current_turn}\n";

$rows = DB::table('juego_participante')
    ->join('participantes','juego_participante.participante_id','=','participantes.participante_id')
    ->leftJoin('roles','juego_participante.rol_id','=','roles.rol_id')
    ->where('juego_participante.juego_id', $juego->juego_id)
    ->select('participantes.usuario','participantes.participante_id','roles.slug','juego_participante.rol_id')
    ->get();

foreach($rows as $r) {
    echo "  Participante {$r->participante_id} ({$r->usuario}) -> rol_id={$r->rol_id} slug={$r->slug}\n";
}
echo "Total rows: " . count($rows) . "\n";
