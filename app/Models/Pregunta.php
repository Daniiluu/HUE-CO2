<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pregunta extends Model
{
    protected $primaryKey = 'pregunta_id';

    protected $fillable = ['carta_id', 'texto', 'tipo_pregunta', 'rango_min', 'rango_max', 'explicacion', 'dinamica_grupo', 'tiempo_dinamica'];

    public function carta()
    {
        return $this->belongsTo(Carta::class, 'carta_id');
    }

    public function opciones()
    {
        return $this->hasMany(OpcionRespuesta::class, 'pregunta_id');
    }

    public function opcionCorrecta()
    {
        return $this->hasOne(OpcionRespuesta::class, 'pregunta_id')->where('correcta', true);
    }
}
