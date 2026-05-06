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
            'answer'      => 'required',
            'type'        => 'required|in:options,slider,validate',
            'participant_id' => 'nullable|integer',
        ]);

        $juego = Juego::where('room_code', $roomCode)->firstOrFail();

        // Guardar el turno/voto en la BD para procesar penalizaciones luego
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

        return response()->json([
            'status'   => 'ok',
            'message'  => '¡Voto registrado! Esperando al Host...',
            'feedback' => 'Tu elección ha sido enviada con éxito. ¡Suerte!'
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

    /**
     * POST /api/game/{roomCode}/advance
     * El host avanza el juego al siguiente reto o estado.
     * (Solo disponible para el organizador/admin de la sala)
     */
    public function advance(Request $request, string $roomCode): JsonResponse
    {
        $juego = Juego::where('room_code', $roomCode)->firstOrFail();
        
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
