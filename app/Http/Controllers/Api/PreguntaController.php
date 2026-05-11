<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pregunta;
use Illuminate\Http\Request;

class PreguntaController extends Controller
{
    /**
     * GET /api/preguntas/random
     * Devuelve una pregunta aleatoria formateada como challenge para el frontend.
     * Parámetros opcionales: ?anillo_id=X
     */
    public function random(Request $request)
    {
        $query = Pregunta::with(['opciones', 'carta.anillo']);

        // Filtrar por anillo si se especifica
        if ($request->has('anillo_id')) {
            $query->whereHas('carta', function ($q) use ($request) {
                $q->where('anillo_id', $request->anillo_id);
            });
        }

        // Solo preguntas (no eventos)
        $query->whereHas('carta', function ($q) {
            $q->where('tipo', 'pregunta');
        });

        $pregunta = $query->inRandomOrder()->first();

        if (!$pregunta) {
            return response()->json([
                'type' => 'waiting',
                'title' => 'Sin preguntas disponibles',
                'description' => 'No hay preguntas en la base de datos.',
            ], 404);
        }

        return response()->json($this->formatChallenge($pregunta));
    }

    /**
     * Formatea una Pregunta de BD al formato challenge que espera ChallengeCard.jsx
     */
    private function formatChallenge(Pregunta $pregunta): array
    {
        $tipo = $pregunta->tipo_pregunta ?? 'options';
        $carta = $pregunta->carta;
        $anilloNombre = $carta?->anillo?->nombre ?? 'General';

        $challenge = [
            'type'        => $tipo, // Mantener el tipo original de la BD (free, options, slider)
            'title'       => $pregunta->texto,
            'description' => $carta?->texto ?? 'Responde a este desafío medioambiental.',
            'sectorName'  => $anilloNombre,
            'time'        => $carta?->tiempo ?? 30,
        ];

        // Opciones ABCD
        if ($tipo === 'options' && $pregunta->opciones->isNotEmpty()) {
            $challenge['options'] = $pregunta->opciones->pluck('texto')->toArray();
            $correctIndex = $pregunta->opciones->search(fn($o) => $o->correcta);
            $challenge['correctAnswer'] = $correctIndex !== false ? $correctIndex : null;
        }

        // Slider
        if ($tipo === 'slider') {
            $challenge['sliderMin']  = $pregunta->rango_min ?? 0;
            $challenge['sliderMax']  = $pregunta->rango_max ?? 100;
            $challenge['sliderStep'] = 1;
            $challenge['unit']       = '%';
        }

        return $challenge;
    }
}
