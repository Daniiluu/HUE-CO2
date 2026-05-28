<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\JuegoController;
use App\Http\Controllers\Api\AnilloController;
use App\Http\Controllers\Api\TurnoController;
use App\Http\Controllers\Api\CartaController;
use App\Http\Controllers\Api\ParticipanteController;
use App\Http\Controllers\Api\PreguntaController;
use App\Http\Controllers\Api\HabilidadController;
use App\Http\Controllers\GameController;

// ── Rutas públicas ──────────────────────────────────────────
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login',    [AuthController::class, 'login'])->middleware('throttle:5,1');

// Endpoint de prueba de conexión para la App Móvil
Route::get('/status', function () {
    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        return response()->json([
            'status' => 'success',
            'api' => 'HUE-CO2',
            'database_connected' => true,
            'timestamp' => now()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'api' => 'HUE-CO2',
            'database_connected' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// Anillos y cartas (lectura pública para Unity)
Route::get('/anillos',                          [AnilloController::class, 'index']);
Route::get('/anillos/{id}',                     [AnilloController::class, 'show']);
Route::get('/anillos/{anillo_id}/carta-aleatoria', [CartaController::class, 'cartaAleatoria']);
Route::get('/cartas',                           [CartaController::class, 'index']);
Route::get('/cartas/{id}',                      [CartaController::class, 'show']);

// Preguntas aleatorias (público para el frontend del juego)
Route::get('/preguntas/random',                 [PreguntaController::class, 'random']);

// ── Rutas de Juego en Tiempo Real (públicas, identificadas por roomCode) ──
Route::post('/game/{roomCode}/vote',     [GameController::class, 'vote']);
Route::post('/game/{roomCode}/proposal', [GameController::class, 'proposal']);
Route::post('/game/{roomCode}/chat',     [GameController::class, 'chat']);
Route::post('/game/{roomCode}/advance',  [GameController::class, 'advance']);
Route::post('/game/{roomCode}/habilidad', [HabilidadController::class, 'activar']);
Route::get('/juego/{roomCode}/estado',   [GameController::class, 'estado']);
Route::post('/game/{roomCode}/heartbeat', [GameController::class, 'heartbeat']);
Route::post('/juegos/join',              [JuegoController::class, 'unirse'])->middleware('throttle:10,1');

// ── Rutas protegidas (requieren token) ──────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Participantes
    Route::get('/participantes',       [ParticipanteController::class, 'index']);
    Route::get('/participantes/{id}',  [ParticipanteController::class, 'show']);
    Route::put('/participantes/{id}',  [ParticipanteController::class, 'update']);
    Route::delete('/participantes/{id}', [ParticipanteController::class, 'destroy']);

    // Juegos
    Route::get('/juegos',              [JuegoController::class, 'index']);
    Route::post('/juegos',             [JuegoController::class, 'store']);
    Route::get('/juegos/{id}',         [JuegoController::class, 'show']);
    Route::put('/juegos/{id}',         [JuegoController::class, 'update']);
    Route::delete('/juegos/{id}',      [JuegoController::class, 'destroy']);

    // Turnos
    Route::get('/juegos/{juego_id}/turnos',  [TurnoController::class, 'index']);
    Route::post('/juegos/{juego_id}/turnos', [TurnoController::class, 'store']);
    Route::get('/turnos/{id}',               [TurnoController::class, 'show']);

    // Admin - Anillos y Cartas (solo para usuarios con rol 'admin')
    Route::middleware('role:admin')->group(function () {
        Route::post('/anillos',          [AnilloController::class, 'store']);
        Route::put('/anillos/{id}',      [AnilloController::class, 'update']);
        Route::delete('/anillos/{id}',   [AnilloController::class, 'destroy']);
        Route::post('/cartas',           [CartaController::class, 'store']);
        Route::put('/cartas/{id}',       [CartaController::class, 'update']);
        Route::delete('/cartas/{id}',    [CartaController::class, 'destroy']);
    });
});
