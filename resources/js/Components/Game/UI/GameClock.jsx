import React, { useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useGame } from '../Core/GameProvider';

/**
 * Componente unificado para el cronómetro del juego.
 * Maneja la visualización y dispara una acción cuando el tiempo se agota.
 */
export default function GameClock({ onTimeout, isActive = true }) {
    const { timeLeft, isPaused } = useGame();

    const hasFiredRef = React.useRef(false);

    // Resetear el disparador cuando el tiempo vuelve a ser mayor que 0
    if (timeLeft > 0) {
        hasFiredRef.current = false;
    }

    // Lógica de "Tiempo Agotado"
    useEffect(() => {
        if (timeLeft === 0 && !hasFiredRef.current && isActive && !isPaused) {
            hasFiredRef.current = true;
            if (onTimeout) onTimeout();
        }
    }, [timeLeft, isPaused, isActive, onTimeout]);

    // Formatear el tiempo (MM:SS)
    const minutes = Math.floor(timeLeft / 60);
    const seconds = String(timeLeft % 60).padStart(2, '0');

    // Estilos según urgencia
    const isUrgent = timeLeft <= 10;
    
    return (
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all shadow-sm
            ${isUrgent 
                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' 
                : 'bg-white/90 backdrop-blur-md border-slate-100 text-slate-600'}`}>
            
            <Clock size={20} className={isUrgent ? 'text-red-500' : 'text-slate-400'} />
            
            <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Tiempo</span>
                <span className="text-2xl font-black tabular-nums leading-tight">
                    {minutes}:{seconds}
                </span>
            </div>
        </div>
    );
}
