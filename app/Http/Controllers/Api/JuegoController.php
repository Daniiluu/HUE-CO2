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

        // Solo unir al host como participante si NO es modo local O si es modo solo
        if (!$request->input('is_local', false) || $request->modo === 'solo') {
            $juego->participantes()->attach($participante->participante_id, [
                'rol_id'     => null, // Se asignará al empezar
                'eco_fichas' => 12,
                'puntuacion' => 0,
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

        $juego->update($request->only(['modo', 'max_players', 'temperatura', 'anillo_id', 'estado']));

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
            $participanteData['usuario'] = $request->user()->username ?? $request->user()->name;
        }

        if (empty($participanteData['usuario'])) {
            return response()->json(['error' => 'Debes proporcionar un nombre de usuario'], 422);
        }

        // Buscar si el usuario ya está en la sala (para permitir reconexión y no ocupar más espacios)
        $existingQuery = $juego->participantes();
        if ($request->user()) {
            // Si está autenticado, buscamos por user_id o por nombre de usuario
            $existingQuery->where(function($q) use ($participanteData) {
                $q->where('participantes.user_id', $participanteData['user_id'])
                  ->orWhere('participantes.usuario', $participanteData['usuario']);
            });
        } else {
            // Si no está autenticado, buscamos por el nombre de usuario que introdujo
            $existingQuery->where('participantes.usuario', $participanteData['usuario']);
        }
        
        $existingParticipante = $existingQuery->first();

        if ($existingParticipante) {
            // Si ya estaba en la sala, simplemente lo devolvemos
            return response()->json([
                'message' => 'Te has reconectado a la partida',
                'participante' => $existingParticipante,
                'juego'   => $juego->load('participantes'),
            ]);
        }

        // Verificar si la sala ya está llena
        // Contamos participantes distintos para que si alguien tiene varios roles asignados (pivot rows) no cuente como múltiple
        $uniqueCount = clone $juego->participantes();
        $count = $uniqueCount->distinct('participantes.participante_id')->count('participantes.participante_id');

        if ($juego->max_players && $count >= $juego->max_players) {
            return response()->json(['error' => 'La sala ya está completa'], 403);
        }

        $participante = Participante::create($participanteData);

        $juego->participantes()->attach($participante->participante_id, [
            'rol_id'     => $request->rol_id,
            'eco_fichas' => 12,
            'puntuacion' => 0,
        ]);

        // Disparar evento para tiempo real (si falla Reverb, el jugador sigue unido)
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
}
