<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Turno extends Model
{
    protected $primaryKey = 'turno_id';

    protected $fillable = ['juego_id', 'participante_id', 'carta_id', 'resultado', 'cambio_temp', 'is_correct'];

    public function juego()
    {
        return $this->belongsTo(Juego::class, 'juego_id');
    }

    public function participante()
    {
        return $this->belongsTo(Participante::class, 'participante_id');
    }

    public function carta()
    {
        return $this->belongsTo(Carta::class, 'carta_id');
    }
}
