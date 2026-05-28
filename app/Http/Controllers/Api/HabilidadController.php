<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Juego;
use App\Models\Turno;
use App\Models\Carta;
use App\Services\GameFlowService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class HabilidadController extends Controller
{
    protected GameFlowService $gameFlowService;

    public function __construct(GameFlowService $gameFlowService)
    {
        $this->gameFlowService = $gameFlowService;
    }

    public function activar(Request $request, $roomCode)
    {
        $request->validate([
            'participante_id' => 'required|integer',
            'slug' => 'required|string',
        ]);

        // Lock para prevenir doble-gasto rápido
        $lockKey = "juego_habilidad_{$roomCode}_{$request->slug}_{$request->participante_id}";
        if (!Cache::add($lockKey, true, 5)) {
            return response()->json(['success' => false, 'message' => 'Procesando habilidad...'], 429);
        }

        try {
            $juego = Juego::where('room_code', $roomCode)->firstOrFail();
            
            if (!in_array($juego->estado, ['playing', 'challenge'])) {
                return response()->json(['success' => false, 'message' => 'No puedes activar habilidades en la fase de resultados.'], 400);
            }

            // Validar que la habilidad se está activando en un turno que pertenece a este jugador
            $activeParticipant = DB::table('juego_participante')
                ->where('juego_id', $juego->juego_id)
                ->where('rol_id', $juego->current_rol_id)
                ->first();

            if (!$activeParticipant || $activeParticipant->participante_id != $request->participante_id) {
                return response()->json(['success' => false, 'message' => 'Solo puedes usar habilidades en tu propio turno.'], 403);
            }

            $participacion = DB::table('juego_participante')
                ->join('roles', 'juego_participante.rol_id', '=', 'roles.rol_id')
                ->where('juego_participante.juego_id', $juego->juego_id)
                ->where('juego_participante.participante_id', $request->participante_id)
                ->where('roles.slug', $request->slug)
                ->first();

            if (!$participacion) {
                return response()->json(['success' => false, 'message' => 'Participante o rol no válido.'], 403);
            }

            // Evitar usos múltiples por turno
            $useKey = "juego_{$juego->juego_id}_used_{$request->slug}_t{$juego->current_turn}";
            if (Cache::has($useKey)) {
                return response()->json(['success' => false, 'message' => 'Ya has usado tu habilidad especial en este turno.'], 400);
            }

            // Definir costes oficiales
            $costos = [
                'textil' => 3,
                'ciencia' => 5,
                'tech' => 2,
                'primario' => 3,
                'legislativo' => 4,
                'ciudadania' => 2,
            ];

            $costo = $costos[$request->slug] ?? 99;

            if ($participacion->eco_fichas < $costo) {
                return response()->json(['success' => false, 'message' => 'Eco-Tokens insuficientes.'], 400);
            }

            // Restricción: Ciencia necesita que estemos en una pregunta, no evento
            $cartaActual = Carta::find($juego->current_carta_id);
            if ($request->slug === 'ciencia' && $cartaActual && $cartaActual->tipo === 'evento') {
                return response()->json(['success' => false, 'message' => 'El Salto Tecnológico solo se puede usar en preguntas, no en eventos climáticos.'], 400);
            }

            // Restricciones de Mitigación: Tech y Público necesitan que el turno actual SEA o VAYA A SER un evento
            if (in_array($request->slug, ['tech', 'legislativo']) && $cartaActual && $cartaActual->tipo !== 'evento') {
                return response()->json(['success' => false, 'message' => 'Solo puedes usar esta habilidad para mitigar Eventos Climáticos.'], 400);
            }

            DB::transaction(function () use ($juego, $participacion, $request, $costo, $useKey, $cartaActual) {
                // Descontar ET
                DB::table('juego_participante')
                    ->where('juego_id', $juego->juego_id)
                    ->where('participante_id', $participacion->participante_id)
                    ->where('rol_id', $participacion->rol_id)
                    ->decrement('eco_fichas', $costo);

                // Registrar uso en el turno
                Cache::put($useKey, true, 3600);

                // Log del sistema (Mensaje en chat)
                $mensajes = [
                    'textil' => '¡[Industria Textil] activó Cerrar el Ciclo! Reto reciclado.',
                    'ciencia' => '¡[Ciencia e I+D] activó Salto Tecnológico! Reto auto-completado.',
                    'tech' => '¡[EcoTech] activó Algoritmo de Eficiencia! Impacto de evento reducido a la mitad.',
                    'primario' => '¡[Sector Primario] activó Restauración de Ecosistemas! Temperatura global -0.2°C.',
                    'legislativo' => '¡[Sector Legislativo] activó Ley de Emergencia! Impacto de evento bloqueado por completo.',
                    'ciudadania' => '¡[Ciudadanía] activó Presión Social! Eliminado el 50% de las opciones incorrectas del reto actual.',
                ];

                Log::info("[HABILIDAD] {$mensajes[$request->slug]} Sala: {$juego->room_code}");
                event(new \App\Events\ChatMessageReceived($juego->room_code, 'Sistema', $mensajes[$request->slug]));

                // Lógica principal por habilidad
                switch ($request->slug) {
                    case 'primario':
                        // Enfría el planeta en 0.2 (sin límite inferior artificial)
                        $juego->temperatura = $juego->temperatura - 0.2;
                        $juego->total_reduccion += 0.2; // Opcional: registrar reducción
                        $juego->save();
                        break;
                    case 'tech':
                        Cache::put("juego_{$juego->juego_id}_event_halved_t{$juego->current_turn}", true, 3600);
                        break;
                    case 'legislativo':
                        Cache::put("juego_{$juego->juego_id}_event_blocked_t{$juego->current_turn}", true, 3600);
                        break;
                    case 'ciudadania':
                        Cache::put("juego_{$juego->juego_id}_5050_t{$juego->current_turn}", true, 3600);
                        break;
                    case 'textil':
                        // Sacar otra carta del mismo anillo
                        $nuevaCarta = DB::table('cartas')
                            ->where('anillo_id', $juego->anillo_id)
                            ->where('carta_id', '!=', $juego->current_carta_id)
                            ->where('tipo', 'pregunta') // Tiene que ser pregunta, no evento
                            ->inRandomOrder()
                            ->first();
                            
                        if ($nuevaCarta) {
                            $juego->current_carta_id = $nuevaCarta->carta_id;
                            $juego->save();
                            // Limpiar votos anteriores de la vieja carta para el jugador en curso
                            Turno::where('juego_id', $juego->juego_id)
                                 ->where('carta_id', $nuevaCarta->carta_id)
                                 ->delete();
                        }
                        break;
                    case 'ciencia':
                        // Resolver automáticamente para el sector activo
                        $activeRolId = $juego->current_rol_id;
                        $activeParticipation = DB::table('juego_participante')
                            ->where('juego_id', $juego->juego_id)
                            ->where('rol_id', $activeRolId)
                            ->first();
                            
                        if ($activeParticipation && $cartaActual) {
                            $preguntaObj = $cartaActual->preguntas()->first();
                            $opcionCorrecta = null;
                            if ($preguntaObj) {
                                $opcionCorrecta = $preguntaObj->opciones()->where('correcta', 1)->first();
                            }
                            
                            Turno::updateOrCreate(
                                [
                                    'juego_id' => $juego->juego_id,
                                    'carta_id' => $juego->current_carta_id,
                                    'participante_id' => $activeParticipation->participante_id
                                ],
                                [
                                    'is_correct' => true,
                                    'resultado' => $opcionCorrecta ? $opcionCorrecta->texto : 'auto'
                                ]
                            );
                        }
                        break;
                }
            });

            $juego->refresh();

            // Sincronizar con todos
            if ($request->slug === 'ciencia' || in_array($request->slug, ['tech', 'legislativo'])) {
                if ($request->slug === 'ciencia') {
                    // Completar el turno inmediatamente (como si hubieran contestado)
                    $this->gameFlowService->transitionToResults($juego);
                } else {
                    // Tech y Legislativo no terminan el turno si es un evento, pero el host debe hacer advanceTurn después de mostrarlo.
                    // Actually, if it's an event, we still need them to transition to results manually or automatically. Let's just broadcast.
                    $this->gameFlowService->broadcastState($juego);
                }
            } else {
                // Primario, Textil, Ciudadanía
                $this->gameFlowService->broadcastState($juego);
            }

            return response()->json([
                'success' => true, 
                'message' => 'Habilidad activada con éxito.',
            ]);

        } finally {
            Cache::forget($lockKey);
        }
    }
}
