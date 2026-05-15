<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Se dispara cuando un jugador envía una propuesta de texto libre.
 * La pantalla grande cambia la ChallengeCard al modo 'validate'
 * y muestra el texto de la propuesta para que todos voten.
 */
class ProposalSubmitted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $roomCode;
    public mixed $sectorId;
    public string $playerName;
    public string $proposalText;

    public function __construct(
        string $roomCode,
        mixed $sectorId,
        string $playerName,
        string $proposalText
    ) {
        $this->roomCode     = $roomCode;
        $this->sectorId     = $sectorId;
        $this->playerName   = $playerName;
        $this->proposalText = $proposalText;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel("game.{$this->roomCode}"),
        ];
    }
}
