import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { GameBoard } from '../Components/Game/GameBoard';
import EndgameResults from '../Components/Endgame/EndgameResults';

export default function GameDisplay({ roomCode, initialMode = 'shared' }) {
    // Esta página es el "Visor del Tablero" oficial.
    const [endData, setEndData] = useState(null);

    return (
        <div className="min-h-screen bg-[#fafaf9]">
            <Head title={`Tablero HUE-CO2 | Sala ${roomCode}`} />
            
            {!endData ? (
                <GameBoard 
                    roomCode={roomCode} 
                    gameMode={initialMode}
                    onEnd={(data) => setEndData(data)}
                />
            ) : (
                <EndgameResults 
                    outcome={endData.outcome}
                    finalTemp={endData.temperature}
                    playerStats={endData.sectors?.map(s => ({
                        id: s.id,
                        name: s.id.charAt(0).toUpperCase() + s.id.slice(1),
                        role: s.playerName,
                        stat: `${s.points} Puntos`,
                        label: `${s.tokens} EcoFichas`,
                        isMVP: s.points === Math.max(...endData.sectors.map(sec => sec.points))
                    }))}
                    onBackToPortal={() => window.location.href = '/'}
                />
            )}
        </div>
    );
}
