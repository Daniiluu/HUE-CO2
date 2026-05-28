<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Participante extends Model
{
    protected $table = 'participantes';
    protected $primaryKey = 'participante_id';
    protected $fillable = ['user_id', 'usuario', 'email', 'contrasena'];

    protected $hidden = ['contrasena'];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function juegos()
    {
        return $this->belongsToMany(Juego::class, 'juego_participante', 'participante_id', 'juego_id')
                    ->withPivot('rol_id', 'eco_fichas', 'puntuacion', 'last_seen_at')
                    ->withTimestamps();
    }

    public function turnos()
    {
        return $this->hasMany(Turno::class, 'participante_id');
    }
}
