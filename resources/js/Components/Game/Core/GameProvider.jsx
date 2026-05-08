import React, { createContext, useContext, useState, useEffect } from 'react';


/**
 Esta clase es un proveedor de estado global para el juego.
 los estados que maneja son:
 - timeLeft: tiempo restante del juego
 - intensity: intensidad del juego
 - sectorStates: estados de los sectores
 - isPaused: estado de pausa
  */
const GameContext = createContext();

export function GameProvider({ children, initialTime = 105, playerStats = {} }) {
    const [timeLeft, setTimeLeft] = useState(initialTime);
    const [intensity, setIntensity] = useState(50);
    const [sectorStates, setSectorStates] = useState(playerStats);
    const [isPaused, setIsPaused] = useState(false);

    // Timer logic estable
    useEffect(() => {
        let timer = null;
        if (timeLeft > 0 && !isPaused) {
            timer = setInterval(() => {
                setTimeLeft(prev => Math.max(0, prev - 1));
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isPaused, timeLeft === 0]); // Solo se reinicia si cambia la pausa o si el tiempo llega a cero

    const value = {
        timeLeft,
        setTimeLeft,
        intensity,
        setIntensity,
        sectorStates,
        setSectorStates,
        isPaused,
        setIsPaused
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};
