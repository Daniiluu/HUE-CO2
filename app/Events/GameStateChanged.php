<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Se dispara desde el host/servidor para notificar a todos los mandos
 * que el estado del juego ha cambiado (nuevo reto, nueva ronda, fin del juego).
 * Todos los MobileController y la pantalla grande lo escuchan.
 */
class GameStateChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $roomCode;
    public string $state;     // 'challenge' | 'waiting' | 'results' | 'ended'
    public array  $challenge; // El nuevo objeto de reto
    public array  $sectors;   // Estado de todos los sectores (tokens, etc.)
    public int    $timeLeft;  // Segundos restantes del turno
    public int    $turnNumber;
    public float  $temperature; // Temperatura global actual
    public float  $totalHeating; // Acumulado de calentamiento (+)
    public float  $totalReduction; // Acumulado de enfriamiento (-)
    public bool   $lastTurnCorrect; // Indica si el último turno procesado fue correcto
    public ?float $serverTime; // Timestamp para medir latencia
    public ?string $outcome; // 'victory' | 'neutral' | 'defeat' | null

    public function __construct(
        string $roomCode,
        string $state,
        array  $challenge = [],
        array  $sectors = [],
        int    $timeLeft  = 90,
        int    $turnNumber = 1,
        float  $temperature = 0.0,
        float  $totalHeating = 0.0,
        float  $totalReduction = 0.0,
        bool   $lastTurnCorrect = false,
        ?string $outcome = null,
        ?float $serverTime = null
    ) {
        $this->roomCode   = $roomCode;
        $this->state      = $state;
        $this->challenge  = $challenge;
        $this->sectors    = $sectors;
        $this->timeLeft   = $timeLeft;
        $this->turnNumber = $turnNumber;
        $this->temperature = $temperature;
        $this->totalHeating = $totalHeating;
        $this->totalReduction = $totalReduction;
        $this->lastTurnCorrect = $lastTurnCorrect;
        $this->outcome = $outcome;
        $this->serverTime = $serverTime;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel("game.{$this->roomCode}"),
        ];
    }
}
