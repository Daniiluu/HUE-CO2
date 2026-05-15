<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Se dispara cuando un jugador envía su voto desde el MobileController.
 * La pantalla grande (LocalDisplayBoard) lo escucha para actualizar
 * el conteo de votos en tiempo real.
 */
class PlayerVoted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $roomCode;
    public mixed $sectorId;
    public string $playerName;
    public mixed  $answer;    // string (opción) | int (slider) | 'valid'|'partial'|'invalid'
    public string $type;      // options | slider | validate | open

    public function __construct(
        string $roomCode,
        mixed $sectorId,
        string $playerName,
        mixed  $answer,
        string $type = 'options'
    ) {
        $this->roomCode   = $roomCode;
        $this->sectorId   = $sectorId;
        $this->playerName = $playerName;
        $this->answer     = $answer;
        $this->type       = $type;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel("game.{$this->roomCode}"),
        ];
    }
}
