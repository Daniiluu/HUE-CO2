<?php

namespace App\Http\Controllers;

use App\Events\GameStateChanged;
use App\Events\PlayerVoted;
use App\Events\ProposalSubmitted;
use App\Models\Juego;
use App\Models\Turno;
use App\Services\GameFlowService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * GameController
 *
 * Maneja las acciones de juego en tiempo real.
 * Cada endpoint recibe datos del MobileController (frontend),
 * valida y dispara el evento Reverb correspondiente.
 */
class GameController extends Controller
{
    protected $gameFlow;

    public function __construct(GameFlowService $gameFlow)
    {
        $this->gameFlow = $gameFlow;
    }

    /**
     * POST /api/game/{roomCode}/vote
     * Un jugador envía su voto (opciones ABCD, slider o validación).
     */
    public function vote(Request $request, string $roomCode): JsonResponse
    {
        $validated = $request->validate([
            'sector_id'   => 'required|string',
            'player_name' => 'required|string|max:50',
            'answer'      => 'nullable',
            'type'        => 'required|in:options,slider,validate',
            'participant_id' => 'nullable|integer',
        ]);

        $juego = Juego::where('room_code', $roomCode)->firstOrFail();

        // Validar si es correcta (solo para tipo opciones)
        $isCorrect = null;
        $feedbackMsg = 'Tu elección ha sido enviada con éxito. ¡Suerte!';
        
        if ($validated['type'] === 'options' && $juego->current_carta_id) {
            $pregunta = \App\Models\Pregunta::where('carta_id', $juego->current_carta_id)->first();
            if ($pregunta) {
                $opcionCorrecta = $pregunta->opciones()->where('correcta', true)->first();
                if ($opcionCorrecta) {
                    $isCorrect = ($opcionCorrecta->texto === $validated['answer']);
                    $feedbackMsg = $isCorrect 
                        ? "¡Correcto! Has ayudado a tu sector. 🎉" 
                        : "¡Casi! La respuesta correcta era: " . $opcionCorrecta->texto . " ❌";
                }
            }
        }

        // Guardar el turno/voto en la BD
        Turno::updateOrCreate(
            [
                'juego_id'        => $juego->juego_id,
                'carta_id'        => $juego->current_carta_id,
                'participante_id' => $request->participant_id ?? $request->participante_id, 
            ],
            [
                'resultado' => is_array($validated['answer']) ? json_encode($validated['answer']) : $validated['answer'],
            ]
        );

        PlayerVoted::dispatch(
            roomCode:   $roomCode,
            sectorId:   $validated['sector_id'],
            playerName: $validated['player_name'],
            answer:     $validated['answer'],
            type:       $validated['type']
        );

        // --- AVANCE AUTOMÁTICO REFORZADO ---
        // Forzamos el avance para que la partida no se bloquee bajo ningún concepto
        try {
            // 1. Pasar a 'results'
            $this->gameFlow->advanceTurn($juego);
            $juego->refresh();
            
            // 2. Saltar directamente al siguiente reto ('playing')
            if ($juego->estado === 'results') {
                $this->gameFlow->advanceTurn($juego);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("[HUE-CO2] Error en auto-avance: " . $e->getMessage());
        }

        return response()->json([
            'status'     => 'ok',
            'is_correct' => $isCorrect,
            'message'    => $isCorrect ? '¡Acierto!' : 'Voto registrado',
            'feedback'   => $feedbackMsg,
            'next_state' => 'challenge'
        ]);
    }

    /**
     * POST /api/game/{roomCode}/proposal
     * Un jugador envía una propuesta de texto libre.
     * La pantalla grande cambia a modo 'validate'.
     */
    public function proposal(Request $request, string $roomCode): JsonResponse
    {
        $validated = $request->validate([
            'sector_id'     => 'required|string',
            'player_name'   => 'required|string|max:50',
            'proposal_text' => 'required|string|max:1000',
        ]);

        $juego = Juego::where('room_code', $roomCode)->firstOrFail();

        // Guardar la propuesta en la BD para que persista al refrescar
        Turno::updateOrCreate(
            [
                'juego_id'        => $juego->juego_id,
                'carta_id'        => $juego->current_carta_id,
                'participante_id' => $request->participant_id, 
            ],
            [
                'resultado' => $validated['proposal_text'],
            ]
        );

        ProposalSubmitted::dispatch(
            roomCode:     $roomCode,
            sectorId:     $validated['sector_id'],
            playerName:   $validated['player_name'],
            proposalText: $validated['proposal_text']
        );

        return response()->json(['status' => 'ok']);
    }

    public function chat(Request $request, string $roomCode): JsonResponse
    {
        $playerName = $request->input('player_name', 'Jugador');
        $message = $request->input('message');

        if (!$message) {
            return response()->json(['error' => 'Mensaje vacío'], 400);
        }

        broadcast(new \App\Events\ChatMessageReceived($roomCode, $playerName, $message));

        return response()->json(['status' => 'sent']);
    }

    /**
     * POST /api/game/{roomCode}/advance
     * El host avanza el juego al siguiente reto o estado.
     * (Solo disponible para el organizador/admin de la sala)
     */
    public function advance(string $roomCode): JsonResponse
    {
        $juego = Juego::where('room_code', $roomCode)->firstOrFail();

        // Si es el inicio de la partida (turno 0) y estamos en el lobby,
        // el servicio GameFlowService se encargará de repartir los roles automáticamente
        // al llamar a advanceTurn() por primera vez.
        
        if ($juego->estado === 'lobby') {
            $juego->estado = 'playing';
            $juego->save();
        }

        // Avanzar el juego (si es el primer avance, GameFlowService inicializará los roles)
        $this->gameFlow->advanceTurn($juego);
        $juego->refresh();

        // Obtener TODOS los roles de cada participante con sus slugs correctos
        $sectors = DB::table('juego_participante')
            ->join('participantes', 'juego_participante.participante_id', '=', 'participantes.participante_id')
            ->leftJoin('roles', 'juego_participante.rol_id', '=', 'roles.rol_id')
            ->where('juego_participante.juego_id', $juego->juego_id)
            ->get()
            ->map(fn($row) => [
                'id'         => $row->slug ?: 'ciudadania',
                'tokens'     => $row->eco_fichas,
                'points'     => $row->puntuacion ?? 0,
                'playerName' => $row->usuario,
            ]);

        return response()->json([
            'status' => 'ok', 
            'turn' => $juego->current_turn,
            'gameState' => [
                'state' => $juego->estado === 'playing' ? 'challenge' : $juego->estado,
                'turnNumber' => $juego->current_turn,
                'sectors' => $sectors,
                'challenge' => $this->getChallengeData($juego),
                'temperature' => $juego->temperatura
            ]
        ]);
    }

    /**
     * Obtiene los datos formateados del reto actual para un juego.
     */
    private function getChallengeData(Juego $juego): ?array
    {
        $carta = $juego->current_carta_id ? \App\Models\Carta::find($juego->current_carta_id) : null;
        if (!$carta) return null;

        $pregunta = $carta->preguntas->first();

        // Buscar si hay una propuesta activa para este reto
        $propuestaActiva = Turno::where([
            'juego_id' => $juego->juego_id,
            'carta_id' => $juego->current_carta_id,
            'participante_id' => DB::table('juego_participante')
                ->where('juego_id', $juego->juego_id)
                ->where('rol_id', $juego->current_rol_id)
                ->value('participante_id')
        ])->value('resultado');

        $challengeData = [
            'id' => $carta->carta_id,
            'type' => $propuestaActiva ? 'validate' : ($pregunta ? $pregunta->tipo_pregunta : 'options'),
            'title' => $pregunta ? $pregunta->texto : $carta->texto,
            'description' => $pregunta ? '' : $carta->texto,
            'ring' => $juego->anillo ? $juego->anillo->nombre : 'General',
            'options' => $pregunta ? $pregunta->opciones->pluck('texto')->toArray() : [],
            'proposal' => $propuestaActiva,
            'time' => $carta->tiempo ?? 20,
            'puntos' => $carta->puntos,
            'penalizacion' => $carta->penalizacion,
        ];
        
        $activeRol = \Illuminate\Support\Facades\DB::table('roles')->where('rol_id', $juego->current_rol_id)->first();
        $challengeData['activeSectorId'] = $activeRol ? $activeRol->slug : null;

        return $challengeData;
    }

    /**
     * GET /api/juego/{roomCode}/estado
     * Retorna el estado actual del juego (sectores, jugadores, reto activo).
     */
    public function estado(string $roomCode): JsonResponse
    {
        $juego = Juego::where('room_code', $roomCode)->first();

        if (!$juego) {
            return response()->json(['error' => 'Sala no encontrada'], 404);
        }

        // Obtener TODOS los roles de cada participante con sus slugs correctos
        $sectors = DB::table('juego_participante')
            ->join('participantes', 'juego_participante.participante_id', '=', 'participantes.participante_id')
            ->leftJoin('roles', 'juego_participante.rol_id', '=', 'roles.rol_id')
            ->where('juego_participante.juego_id', $juego->juego_id)
            ->get()
            ->map(fn($row) => [
                'id'         => $row->slug ?: 'ciudadania',
                'tokens'     => $row->eco_fichas,
                'points'     => $row->puntuacion ?? 0,
                'playerName' => $row->usuario,
            ]);

        return response()->json([
            'state'       => $juego->estado === 'playing' ? 'challenge' : $juego->estado,
            'turnNumber'  => $juego->current_turn,
            'sectors'     => $sectors,
            'challenge'   => $this->getChallengeData($juego),
            'temperature' => $juego->temperatura ?? 0,
        ]);
    }
}
