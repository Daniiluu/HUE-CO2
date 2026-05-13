<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Juego extends Model
{
    protected $primaryKey = 'juego_id';

    protected $fillable = ['modo', 'is_local', 'max_players', 'temperatura', 'anillo_id', 'estado', 'room_code', 'current_turn', 'current_carta_id', 'last_turn_at'];

    public function anillo()
    {
        return $this->belongsTo(Anillo::class, 'anillo_id');
    }

    public function participantes()
    {
        return $this->belongsToMany(Participante::class, 'juego_participante', 'juego_id', 'participante_id')
                    ->withPivot('rol_id', 'eco_fichas', 'puntuacion')
                    ->withTimestamps();
    }

    public function turnos()
    {
        return $this->hasMany(Turno::class, 'juego_id');
    }
}
