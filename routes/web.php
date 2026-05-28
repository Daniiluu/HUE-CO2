<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Support\Facades\Artisan;

Route::get('/limpiar-todo', function() {
    // 1. Forzamos la limpieza profunda de configuraciones, rutas y vistas viejas de Laravel
    Artisan::call('config:clear');
    Artisan::call('cache:clear');
    Artisan::call('view:clear');
    Artisan::call('route:clear');
    
    // 2. Ejecutamos la creación real de las tablas de la app (si hubiera cambios)
    Artisan::call('migrate', ['--force' => true]);
    
    return "¡Servidor Vaport purgado, optimizado y Base de Datos estructurada con éxito!";
});

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
    $user = auth()->user();

    $history = \DB::table('juegos')
        ->join('juego_participante', 'juegos.juego_id', '=', 'juego_participante.juego_id')
        ->join('participantes', 'juego_participante.participante_id', '=', 'participantes.participante_id')
        ->leftJoin('roles', 'juego_participante.rol_id', '=', 'roles.rol_id')
        ->where('participantes.user_id', $user->id)
        ->where('juegos.estado', 'ended')
        ->select(
            'juegos.juego_id as id',
            'juegos.updated_at as date',
            'juegos.temperatura as finalTemp',
            \DB::raw('GROUP_CONCAT(DISTINCT roles.nombre ORDER BY roles.rol_id ASC SEPARATOR ", ") as role')
        )
        ->groupBy('juegos.juego_id', 'juegos.updated_at', 'juegos.temperatura')
        ->orderBy('juegos.updated_at', 'desc')
        ->limit(5)
        ->get();

    $formattedHistory = $history->map(function ($row) {
        $date = \Carbon\Carbon::parse($row->date);
        $months = [
            1 => 'Ene', 2 => 'Feb', 3 => 'Mar', 4 => 'Abr', 5 => 'May', 6 => 'Jun',
            7 => 'Jul', 8 => 'Ago', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dic'
        ];
        $monthStr = $months[$date->month] ?? '';
        $dateStr = $date->day . ' ' . $monthStr . ' ' . $date->year;

        $temp = (float) $row->finalTemp;
        $outcome = 'neutral';
        if ($temp >= 0.99) {
            $outcome = 'defeat';
        } elseif ($temp <= 0.0) {
            $outcome = 'victory';
        }

        return [
            'id' => (string) $row->id,
            'date' => $dateStr,
            'outcome' => $outcome,
            'finalTemp' => $temp,
            'role' => $row->role ?? 'Coordinador',
        ];
    });

    return Inertia::render('Dashboard', [
        'history' => $formattedHistory
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

// Perfil de usuario (Estándar de Breeze)
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Ruta del Tablero Principal (Solo visualización Premium)
Route::get('/tablero/{roomCode}', [App\Http\Controllers\GameController::class, 'board'])
    ->name('game.board')
    ->where('roomCode', '[A-Za-z0-9]+');

// Ruta para juego local desde el Guest Portal (Sin Auth)
Route::get('/juego-local', function () {
    return Inertia::render('GameDisplay', [
        'roomCode' => 'LOCAL_' . strtoupper(substr(uniqid(), -4)),
        'initialMode' => request('mode', 'solo')
    ]);
})->name('game.local');

// Rutas DE JUEGO (Creación permitida para invitados)

Route::middleware(['auth'])->group(function () {
    Route::post('/juego/crear', [App\Http\Controllers\Api\JuegoController::class, 'store'])->name('juego.crear');
    Route::put('/juego/{id}', [App\Http\Controllers\Api\JuegoController::class, 'update'])->name('juego.update');
    Route::get('/juego/{id}/detalles-historial', [App\Http\Controllers\Api\JuegoController::class, 'historyDetails'])->name('juego.detalles-historial');
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

Route::get('/cargar-datos', function() {
    // Ejecuta los seeders para rellenar las tablas vacías
    Artisan::call('db:seed', ['--force' => true]);
    return "¡Datos iniciales (Seeders) cargados con éxito en la base de datos!";
});