<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Juego;
use App\Models\Participante;
use Illuminate\Http\Request;

use App\Events\PlayerJoined;

class JuegoController extends Controller
{
    // ... index, store, show, update, destroy ...
    // GET /api/juegos
    public function index()
    {
        $juegos = Juego::with(['anillo', 'participantes'])->get();
        return response()->json($juegos);
    }

    // POST /api/juegos
    public function store(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('[HUE-CO2] Petición a /juego/crear:', $request->all());

        $request->validate([
            'modo'       => 'required|string|max:50',
            'anillo_id'  => 'nullable|exists:anillos,anillo_id',
            'usuario'    => 'required|string|max:50', // Nombre del host
        ]);

        $juego = Juego::create([
            'modo'        => $request->modo,
            'is_local'    => $request->input('is_local', true),
            'max_players' => $request->max_players ?? 6,
            'temperatura' => 0,
            'anillo_id'   => $request->anillo_id,
            'estado'      => 'lobby',
            'room_code'   => strtoupper(substr(bin2hex(random_bytes(3)), 0, 6)),
        ]);

        // Crear al Host como participante 1
        $participante = Participante::create([
            'usuario' => $request->usuario,
            'user_id' => $request->user()?->id,
        ]);

        // Unir al host como participante si es Online o modo Solo
        // Forzamos la unión si is_local es false (Online)
        $isLocal = filter_var($request->input('is_local', true), FILTER_VALIDATE_BOOLEAN);
        
        if (!$isLocal || $request->modo === 'solo') {
            $juego->participantes()->attach($participante->participante_id, [
                'rol_id'     => null, 
                'eco_fichas' => 12,
                'puntuacion' => 0,
                'last_seen_at' => now(),
            ]);
        }

        return response()->json([
            'message'      => 'Juego creado y host unido',
            'juego'        => $juego->load(['anillo', 'participantes']),
            'participante' => $participante
        ], 201);
    }

    // GET /api/juegos/{id}
    public function show($id)
    {
        $juego = Juego::with(['anillo', 'participantes', 'turnos.carta'])->findOrFail($id);
        return response()->json($juego);
    }

    // PUT /api/juegos/{id}
    public function update(Request $request, $id)
    {
        $juego = Juego::findOrFail($id);
        $oldEstado = $juego->estado;

        $juego->update($request->only(['modo', 'max_players', 'temperatura', 'anillo_id', 'estado']));

        // Si la partida comienza (pasa de lobby a playing), inicializar turnos y roles
        if ($oldEstado === 'lobby' && $juego->estado === 'playing' && $juego->current_turn === 0) {
            $gameFlow = app(\App\Services\GameFlowService::class);
            $gameFlow->advanceTurn($juego);
        }

        return response()->json([
            'message' => 'Juego actualizado',
            'juego'   => $juego->load(['anillo', 'participantes']),
        ]);
    }

    // DELETE /api/juegos/{id}
    public function destroy($id)
    {
        $juego = Juego::findOrFail($id);
        $juego->delete();

        return response()->json(['message' => 'Juego eliminado']);
    }

    // POST /api/juegos/join
    public function unirse(Request $request)
    {
        // Normalizar el código de sala (quitar espacios y poner en mayúsculas)
        if ($request->has('room_code')) {
            $request->merge([
                'room_code' => strtoupper(str_replace(' ', '', $request->room_code))
            ]);
        }

        $request->validate([
            'room_code' => 'required|string|exists:juegos,room_code',
            'rol_id'    => 'nullable|integer|exists:roles,rol_id',
            'usuario'   => 'required_unless:auth,true|string|max:50',
        ]);

        $juego = Juego::where('room_code', $request->room_code)->first();
        
        if (!$juego) {
            return response()->json(['error' => 'La sala no existe o el PIN es incorrecto'], 404);
        }

        // Crear los datos del participante
        $participanteData = [
            'usuario' => $request->usuario,
        ];

        if ($request->user()) {
            $participanteData['user_id'] = $request->user()->id;
            // Solo usamos el nombre del sistema si no se proporcionó uno manualmente
            if (empty($participanteData['usuario'])) {
                $participanteData['usuario'] = $request->user()->username ?? $request->user()->name;
            }
        }

        if (empty($participanteData['usuario'])) {
            return response()->json(['error' => 'Debes proporcionar un nombre de usuario'], 422);
        }

        // Buscar si el usuario ya está en la sala (para permitir reconexión)
        // IMPORTANTE: Para evitar que el Host y el Guest compartan ID en la misma máquina,
        // la reconexión solo se activa si coincide el user_id Y el nombre de usuario.
        $existingQuery = $juego->participantes();
        if ($request->user()) {
            $existingQuery->where('participantes.user_id', $request->user()->id)
                          ->where('participantes.usuario', $participanteData['usuario']);
        } else {
            // Para invitados anónimos, buscamos por nombre (o desactivamos si queremos permitir duplicados)
            $existingQuery->where('participantes.usuario', $participanteData['usuario']);
        }
        
        $existingParticipante = $existingQuery->first();

        if ($existingParticipante) {
            // Si es un invitado anónimo, verificar si realmente es una reconexión o un secuestro
            if (!$request->user() && $existingParticipante->pivot && $existingParticipante->pivot->last_seen_at) {
                $lastSeen = \Carbon\Carbon::parse($existingParticipante->pivot->last_seen_at);
                // Si el jugador anónimo ha estado activo en los últimos 30 segundos, asumimos que alguien más intenta usurpar el nombre
                if ($lastSeen->diffInSeconds(now()) < 30) {
                    return response()->json(['error' => 'Ese nombre de usuario ya está en uso en esta sala y se encuentra activo.'], 403);
                }
            }

            // Actualizar last_seen_at al reconectarse
            $juego->participantes()->updateExistingPivot($existingParticipante->participante_id, [
                'last_seen_at' => now()
            ]);

            return response()->json([
                'message' => 'Te has reconectado a la partida',
                'participante' => $existingParticipante,
                'juego'   => $juego->load('participantes'),
            ]);
        }

        if ($juego->estado !== 'lobby') {
            return response()->json(['error' => 'La partida ya ha comenzado. Solo se permiten reconexiones.'], 403);
        }

        // Verificar si la sala ya está llena ANTES de crear al participante
        $count = $juego->participantes()->distinct('participantes.participante_id')->count('participantes.participante_id');
        if ($juego->max_players && $count >= $juego->max_players) {
            return response()->json(['error' => 'La sala ya está completa'], 403);
        }

        // Si no existe, crear y adjuntar con timestamp de actividad inicial
        $participante = Participante::create($participanteData);
        $juego->participantes()->attach($participante->participante_id, [
            'rol_id'     => $request->rol_id,
            'eco_fichas' => 12,
            'puntuacion' => 0,
            'last_seen_at' => now(),
        ]);

        // Disparar evento para tiempo real
        try {
            PlayerJoined::dispatch($juego->room_code, $participante->usuario, $participante->participante_id);
        } catch (\Exception $e) {
            \Log::error('[HUE-CO2] Error al transmitir PlayerJoined: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Te has unido a la partida',
            'participante' => $participante,
            'juego'   => $juego->load('participantes'),
        ]);
    }

    /**
     * Obtiene los detalles de una partida finalizada para mostrar en el historial.
     */
    public function historyDetails($id)
    {
        $juego = Juego::findOrFail($id);

        $sectors = \DB::table('juego_participante')
            ->join('participantes', 'juego_participante.participante_id', '=', 'participantes.participante_id')
            ->leftJoin('roles', 'juego_participante.rol_id', '=', 'roles.rol_id')
            ->where('juego_participante.juego_id', $id)
            ->select(
                'participantes.usuario as playerName',
                'roles.slug as id',
                'roles.nombre as role',
                'juego_participante.eco_fichas as tokens',
                'juego_participante.puntuacion as points'
            )
            ->get();

        $outcome = 'neutral';
        if ($juego->temperatura >= 0.99) {
            $outcome = 'defeat';
        } elseif ($juego->temperatura <= 0.0) {
            $outcome = 'victory';
        }

        return response()->json([
            'juego_id' => $juego->juego_id,
            'outcome' => $outcome,
            'temperature' => (float)$juego->temperatura,
            'totalHeating' => (float)$juego->total_calentamiento,
            'totalReduction' => (float)$juego->total_reduccion,
            'sectors' => $sectors
        ]);
    }
}
