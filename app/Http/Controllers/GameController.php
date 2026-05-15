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
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'sector_id'   => 'nullable', // Puede ser string o array
            'player_name' => 'required|string|max:50',
            'answer'      => 'nullable',
            'type'        => 'required|in:options,slider,validate,free,open',
            'participant_id' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            \Illuminate\Support\Facades\Log::warning('[HUE-CO2] Error de validación en voto:', $validator->errors()->toArray());
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $validated = $validator->validated();
        
        // Manejar sector_id como array
        $sectorIds = is_array($validated['sector_id']) ? $validated['sector_id'] : [$validated['sector_id']];
        if (empty($sectorIds) || $sectorIds === [null]) {
            $sectorIds = ['ciudadania'];
        }

        $cleanCode = strtoupper(str_replace(' ', '', $roomCode));
        \Log::info("[PERF] Voto recibido en Controller para sala {$cleanCode} de {$request->player_name} a las " . microtime(true));
        $juego = Juego::where('room_code', $cleanCode)->firstOrFail();

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

        // Guardar el turno/voto en la BD (UNA sola vez por participante)
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

        $juego->refresh();
        $activeRol = DB::table('roles')->where('rol_id', $juego->current_rol_id)->first();
        $activeSectorSlug = $activeRol ? $activeRol->slug : null;
        $shouldTransition = false;

        // Emitir un SOLO evento con todos los sectores
        PlayerVoted::dispatch(
            $roomCode,
            $sectorIds,
            $validated['player_name'],
            $validated['answer'],
            $validated['type']
        );

        foreach ($sectorIds as $sectorId) {
            if (in_array($juego->estado, ['playing', 'challenge'])) {

                $isActiveVote = ($activeSectorSlug === $sectorId);
                $isFreeValidatorVote = ($validated['type'] === 'free' || $validated['type'] === 'validate') && !$isActiveVote;

                if ($isActiveVote || $isFreeValidatorVote) {
                    $shouldTransition = true;
                }
            }
        }

        if ($shouldTransition) {
            try {
                $this->gameFlow->transitionToResults($juego);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("[HUE-CO2] Error en avance tras voto: " . $e->getMessage());
            }
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
            'sector_id'     => 'required', // Puede ser array o string
            'player_name'   => 'required|string|max:50',
            'proposal_text' => 'required|string|max:1000',
        ]);

        $sectorIds = is_array($validated['sector_id']) ? $validated['sector_id'] : [$validated['sector_id']];


        $cleanCode = strtoupper(str_replace(' ', '', $roomCode));
        $juego = Juego::where('room_code', $cleanCode)->firstOrFail();

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
            sectorId:     $sectorIds,
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
        $cleanCode = strtoupper(str_replace(' ', '', $roomCode));
        $juego = Juego::where('room_code', $cleanCode)->firstOrFail();

        // Si es el inicio de la partida (turno 0) y estamos en el lobby,
        // el servicio GameFlowService se encargará de repartir los roles automáticamente
        // al llamar a advanceTurn() por primera vez.
        
        // Avanzar el juego (si es el primer avance, GameFlowService inicializará los roles)
        $this->gameFlow->advanceTurn($juego);
        $juego->refresh();

        // Obtener TODOS los roles de cada participante con sus slugs correctos
        $sectors = DB::table('juego_participante')
            ->join('participantes', 'juego_participante.participante_id', '=', 'participantes.participante_id')
            ->leftJoin('roles', 'juego_participante.rol_id', '=', 'roles.rol_id')
            ->where('juego_participante.juego_id', $juego->juego_id)
            ->select('participantes.usuario', 'juego_participante.participante_id', 'roles.slug', 'juego_participante.eco_fichas', 'juego_participante.puntuacion')
            ->get()
            ->map(fn($row) => [
                'id'         => $row->slug ?: 'ciudadania',
                'tokens'     => $row->eco_fichas,
                'points'     => $row->puntuacion ?? 0,
                'playerName' => $row->usuario,
                'participanteId' => (int) $row->participante_id,
            ]);

        return response()->json([
            'status' => 'ok', 
            'turn' => $juego->current_turn,
            'gameState' => [
                'state' => $juego->estado === 'playing' ? 'challenge' : $juego->estado,
                'turnNumber' => $juego->current_turn,
                'sectors' => $sectors,
                'challenge' => $this->getChallengeData($juego),
                'temperature' => $juego->temperatura,
                'totalHeating' => $juego->total_calentamiento,
                'totalReduction' => $juego->total_reduccion,
                'lastTurnCorrect' => \Illuminate\Support\Facades\Cache::get('juego_'.$juego->juego_id.'_last_correct', false),
                'outcome' => ($juego->estado === 'ended') ? $this->calculateOutcome($juego) : null
            ]
        ]);
    }

    private function calculateOutcome(Juego $juego): string
    {
        if ($juego->temperatura >= 1.0) return 'defeat';
        if ($juego->temperatura >= 0.5) return 'neutral';
        return 'victory';
    }

    /**
     * Obtiene los datos formateados del reto actual para un juego.
     */
    private function getChallengeData(Juego $juego): ?array
    {
        $carta = $juego->current_carta_id ? \App\Models\Carta::find($juego->current_carta_id) : null;
        if (!$carta) return null;

        $pregunta = $carta->preguntas->first();

        $opciones = $pregunta ? $pregunta->opciones->pluck('texto')->toArray() : [];
        $tipoBase = $pregunta ? $pregunta->tipo_pregunta : 'options';

        // Autocorrección: si dice ser 'options' pero la BD no tiene ninguna opción guardada, forzamos a que sea 'free' (abierta)
        if ($tipoBase === 'options' && $pregunta && empty($opciones)) {
            $tipoBase = 'free';
        }

        // Buscar si hay una propuesta activa para este reto SOLO si el tipo es 'free'
        $propuestaActiva = null;
        if ($tipoBase === 'free') {
            $propuestaActiva = Turno::where([
                'juego_id' => $juego->juego_id,
                'carta_id' => $juego->current_carta_id,
                'participante_id' => DB::table('juego_participante')
                    ->where('juego_id', $juego->juego_id)
                    ->where('rol_id', $juego->current_rol_id)
                    ->value('participante_id')
            ])->value('resultado');
        }

        $challengeData = [
            'id' => $carta->carta_id,
            'type' => $propuestaActiva ? 'validate' : $tipoBase,
            'title' => $pregunta ? $pregunta->texto : $carta->texto,
            'description' => $pregunta ? '' : $carta->texto,
            'ring' => $juego->anillo ? $juego->anillo->nombre : 'General',
            'anillo_id' => $juego->anillo_id,
            'options' => $opciones,
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
     * POST /api/game/{roomCode}/heartbeat
     * Los jugadores envían un ping periódico para decir "sigo aquí".
     */
    public function heartbeat(Request $request, string $roomCode): JsonResponse
    {
        $participanteId = $request->input('participante_id');
        \Log::info("[HUE-CO2] Heartbeat recibido de participante: {$participanteId} en sala {$roomCode}");
        
        if (!$participanteId) {
            return response()->json(['error' => 'ID de participante requerido'], 400);
        }

        $cleanCode = strtoupper(str_replace(' ', '', $roomCode));
        $juego = Juego::where('room_code', $cleanCode)->first();
        
        if (!$juego) {
            return response()->json(['error' => 'Sala no encontrada'], 404);
        }

        // Actualizar el timestamp en la tabla pivot
        DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where('participante_id', $participanteId)
            ->update(['last_seen_at' => now()]);

        return response()->json(['status' => 'ok']);
    }

    /**
     * GET /api/juego/{roomCode}/estado
     * Retorna el estado actual del juego (sectores, jugadores, reto activo).
     */
    public function estado(string $roomCode): JsonResponse
    {
        $cleanCode = strtoupper(str_replace(' ', '', $roomCode));
        $juego = Juego::where('room_code', $cleanCode)->first();

        if (!$juego) {
            return response()->json(['error' => 'Sala no encontrada'], 404);
        }

        // Auto-rescate automático de sectores (atómico, cada 10s máximo)
        $cacheKey = "juego_rescue_{$juego->juego_id}";
        if ($juego->estado === 'playing' && \Illuminate\Support\Facades\Cache::add($cacheKey, true, 10)) {
            app(\App\Services\GameFlowService::class)->redistributeInactiveRoles($juego);
        }

        // Obtener TODOS los roles de cada participante con sus slugs correctos
        $sectors = DB::table('juego_participante')
            ->join('participantes', 'juego_participante.participante_id', '=', 'participantes.participante_id')
            ->leftJoin('roles', 'juego_participante.rol_id', '=', 'roles.rol_id')
            ->where('juego_participante.juego_id', $juego->juego_id)
            ->select(
                'participantes.usuario', 
                'juego_participante.participante_id', 
                'roles.slug', 
                'juego_participante.eco_fichas', 
                'juego_participante.puntuacion',
                'juego_participante.last_seen_at'
            )
            ->get()
            ->map(fn($row) => [
                'id'         => $row->slug ?: 'ciudadania',
                'tokens'     => $row->eco_fichas,
                'points'     => $row->puntuacion ?? 0,
                'playerName' => $row->usuario,
                'participanteId' => (int) $row->participante_id,
                'lastSeen'   => $row->last_seen_at,
                'isInactive' => $row->last_seen_at ? (\Carbon\Carbon::parse($row->last_seen_at)->diffInSeconds(now()) > 15) : false
            ]);

        // Calcular tiempo restante para sincronización de late-joiners
        $timeLeft = 30;
        if ($juego->estado === 'playing' && $juego->last_turn_at) {
            $challengeData = $this->getChallengeData($juego);
            $totalDuration = $challengeData['time'] ?? 30;
            $elapsed = now()->diffInSeconds($juego->last_turn_at);
            $timeLeft = (int) max(0, $totalDuration - $elapsed);
        }

        // Identificar al anfitrión (el que se unió primero)
        $hostId = DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->orderBy('created_at', 'asc')
            ->value('participante_id');

        return response()->json([
            'state'       => $juego->estado === 'playing' ? 'challenge' : $juego->estado,
            'challenge'   => $this->getChallengeData($juego),
            'sectors'     => $sectors,
            'timeLeft'    => $timeLeft,
            'temperature' => $juego->temperatura,
            'totalHeating' => $juego->total_calentamiento,
            'totalReduction' => $juego->total_reduccion,
            'turnNumber'  => $juego->current_turn,
            'lastTurnCorrect' => \Illuminate\Support\Facades\Cache::get('juego_'.$juego->juego_id.'_last_correct', false),
            'outcome'     => ($juego->estado === 'ended') ? $this->calculateOutcome($juego) : null,
            'hostId'      => $hostId
        ]);
    }

    /**
     * Renderiza la página del tablero (GameDisplay)
     * También registra al jugador en juego_participante si aún no está.
     */
    public function board(string $roomCode)
    {
        $cleanCode = strtoupper(str_replace(' ', '', $roomCode));
        $juego = Juego::where('room_code', $cleanCode)->first();
        
        \Log::info("[HUE-CO2] Cargando tablero para sala: {$cleanCode}");

        $user = auth()->user();
        $participanteId = request('participantId');
        $playerName = request('playerName', 'Anfitrión');

        if ($user && $juego) {
            // Usuario autenticado: buscar su participante por user_id Y nombre
            // (para no confundir Host con Guest en la misma sesión)
            $found = DB::table('juego_participante')
                ->join('participantes', 'juego_participante.participante_id', '=', 'participantes.participante_id')
                ->where('juego_participante.juego_id', $juego->juego_id)
                ->where('participantes.user_id', $user->id)
                ->where('participantes.usuario', $playerName)
                ->value('participantes.participante_id');

            if ($found) {
                $participanteId = $found;
            } elseif (!$participanteId) {
                // No está en la partida todavía — registrarlo automáticamente
                $participante = \App\Models\Participante::create([
                    'usuario' => $user->username ?? $user->name,
                    'user_id' => $user->id,
                ]);
                $juego->participantes()->attach($participante->participante_id, [
                    'rol_id'       => null,
                    'eco_fichas'   => 12,
                    'puntuacion'   => 0,
                    'last_seen_at' => now(),
                ]);
                $participanteId = $participante->participante_id;
                \Log::info("[HUE-CO2] Jugador auth registrado automáticamente en sala {$cleanCode}: {$participanteId}");
            }

            $playerName = $user->username ?? $user->name;
        } elseif ($participanteId && $juego) {
            // Jugador anónimo con participantId en la URL
            // Verificar que está en juego_participante; si no, registrarlo
            $exists = DB::table('juego_participante')
                ->where('juego_id', $juego->juego_id)
                ->where('participante_id', $participanteId)
                ->exists();

            if (!$exists) {
                // Buscar el participante por ID y añadirlo a la sala
                $participante = \App\Models\Participante::find($participanteId);
                if ($participante) {
                    $juego->participantes()->attach($participante->participante_id, [
                        'rol_id'       => null,
                        'eco_fichas'   => 12,
                        'puntuacion'   => 0,
                        'last_seen_at' => now(),
                    ]);
                    \Log::info("[HUE-CO2] Jugador anónimo {$participanteId} registrado automáticamente en sala {$cleanCode}");
                }
            }
        }

        return \Inertia\Inertia::render('GameDisplay', [
            'roomCode'        => $cleanCode,
            'initialMode'     => request('mode', 'shared'),
            'isLocal'         => $juego ? (bool)$juego->is_local : true,
            'myPlayerName'    => $playerName,
            'myParticipantId' => $participanteId,
            'isHost'          => filter_var(request('isHost', false), FILTER_VALIDATE_BOOLEAN) || ($participanteId && $juego && DB::table('juego_participante')->where('juego_id', $juego->juego_id)->orderBy('juego_jugador_id', 'asc')->value('participante_id') == $participanteId)
        ]);
    }
}
