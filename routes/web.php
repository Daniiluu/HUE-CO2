<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'auth' => ['user' => auth()->user()],
    ]);
});

// Ruta pública para los invitados (Portal de entrada al juego)
Route::get('/jugar', function () {
    return Inertia::render('GuestPortal', [
        'pin' => request('pin')
    ]);
})->name('guest.portal');

// Dashboard (Ahora protegido por Auth de Breeze)
Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

// Perfil de usuario (Estándar de Breeze)
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Ruta del Tablero Principal (Solo visualización Premium)
Route::get('/tablero/{roomCode}', function ($roomCode) {
    return Inertia::render('GameDisplay', [
        'roomCode' => $roomCode,
        'initialMode' => request('mode', 'shared')
    ]);
})->name('game.board');

// Ruta para juego local desde el Guest Portal (Sin Auth)
Route::get('/juego-local', function () {
    return Inertia::render('GameDisplay', [
        'roomCode' => 'LOCAL_' . strtoupper(substr(uniqid(), -4)),
        'initialMode' => request('mode', 'solo')
    ]);
})->name('game.local');

// Rutas DE JUEGO (Creación permitida para invitados)
Route::post('/juego/crear', [App\Http\Controllers\Api\JuegoController::class, 'store'])->name('juego.crear');

Route::middleware(['auth'])->group(function () {
    Route::put('/juego/{id}', [App\Http\Controllers\Api\JuegoController::class, 'update'])->name('juego.update');
});

// Ruta de prueba Reverb (temporal)
Route::get('/fire-event', function () {
    App\Events\TestEvent::dispatch('Hello World from Reverb!');
    return 'Event fired!';
});

// Ruta de prueba de resultados (Temporal para visualización)
Route::get('/test-results', function () {
    return Inertia::render('TestResults');
});

Route::get('/test-boards', function () {
    return Inertia::render('TestBoards');
});

require __DIR__.'/auth.php';
