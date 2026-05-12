import React, { useState, useEffect, useRef } from 'react';
import GameClock from '../UI/GameClock';
import { Clock, LogOut, Zap, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import OrbitalBoard from '../UI/OrbitalBoard';
import GlobalThermometer from '../UI/GlobalThermometer';
import ChallengeCard from '../UI/ChallengeCard';
import SectorMiniCard from '../UI/SectorMiniCard';
import { useGame } from '../Core/GameProvider';
import { useGameChannel } from '../../../hooks/useGameChannel';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import FeedbackOverlay from '../UI/FeedbackOverlay';

export default function LocalDisplayBoard({ 
    sectors, 
    challenge, 
    roomCode, 
    turnNumber = 1, 
    onNextChallenge,
    myParticipantId,
    myPlayerName
}) {
    // 1. Hooks de estado y contexto
    const { timeLeft, setTimeLeft, intensity, setIntensity } = useGame();
    const { votes, proposal, isConnected, gameState: remoteState, sendVote } = useGameChannel(roomCode, 'host', myPlayerName || 'Host', myParticipantId);
    const [activeChallenge, setActiveChallenge] = useState(challenge);
    const advancingRef = useRef(false);

    // 2. Variables derivadas (Calculadas en cada render)
    const isLocalGame = roomCode && roomCode.startsWith('LOCAL_');
    const currentGameState = remoteState?.state || 'challenge'; // 'challenge' | 'results' | 'ended'
    
    const displaySectors = sectors.map((s) => ({
        ...s,
        hasVoted: !!votes[s.id],
    }));

    const activeSectorId = activeChallenge?.activeSectorId;
    const activeSector = sectors.find(s => s.id === activeSectorId);

    // 3. Efectos de sincronización
    useEffect(() => {
        // Resetear el guard cuando comienza un nuevo reto
        if (currentGameState === 'challenge') {
            advancingRef.current = false;
        }
    }, [currentGameState]);

    useEffect(() => {
        if (proposal) {
            setActiveChallenge(prev => ({
                ...prev,
                type: 'validate',
                proposal: proposal.text,
            }));
        }
    }, [proposal]);

    useEffect(() => {
        if (challenge) {
            setActiveChallenge(challenge);
            if (challenge.time) setTimeLeft(challenge.time);
        }
    }, [challenge]);

    useEffect(() => {
        if (remoteState?.temperature !== undefined) {
            setIntensity(remoteState.temperature);
        }
    }, [remoteState]);

    const [localFeedback, setLocalFeedback] = useState(null); // 'correct' | 'incorrect' | null

    // Auto-avance automático cuando estamos en modo resultados
    useEffect(() => {
        if (currentGameState === 'results' && !advancingRef.current) {
            const timer = setTimeout(() => {
                handleAdvance();
            }, 4000); // Esperar 4 segundos viendo los resultados antes de saltar al siguiente reto
            return () => clearTimeout(timer);
        }
    }, [currentGameState]);

    const handleAdvance = async () => {
        // Evitar doble llamada al backend
        if (advancingRef.current) return;
        advancingRef.current = true;
        try {
            let response;
            if (onNextChallenge) {
                response = await onNextChallenge();
            } else {
                response = await axios.post(`/api/game/${roomCode}/advance`);
            }
            // FALLBACK: actualizar temperatura directamente si el WS falla
            if (response?.data?.juego) {
                setIntensity(response.data.juego.temperatura);
            }
        } catch (error) {
            console.error('[HUE-CO2] Error al avanzar turno:', error);
        } finally {
            // Solo liberar el guard si pasamos a results (no a challenge)
            // Si pasamos a challenge, el useEffect de arriba lo reseteará
            setTimeout(() => { advancingRef.current = false; }, 2000);
        }
    };

    const handleApply = async (answer) => {
        // Si no hay reto o es tipo waiting, ignorar
        if (!activeChallenge || activeChallenge.type === 'waiting') return;

        // 1. Enviar el voto al backend para que procese puntos y temperatura
        const result = await sendVote(answer, activeChallenge.type || 'options', activeChallenge.activeSectorId);
        
        // 2. Determinar si fue correcto basándonos en la respuesta del servidor
        // (Fallback local si el servidor falla por alguna razón)
        let isCorrect = result ? result.is_correct : false;
        
        if (!result && activeChallenge.type === 'options' && activeChallenge.options) {
            const correctOption = activeChallenge.correct_answer || activeChallenge.options[0];
            isCorrect = (answer === correctOption);
        }

        // 3. Mostrar el feedback visual (Overlay)
        setLocalFeedback(isCorrect ? 'correct' : 'incorrect');

        // 4. Esperar y avanzar al siguiente estado
        setTimeout(async () => {
            setLocalFeedback(null);
            await handleAdvance();
        }, 2500);
    };

    // Fase visual actual (Número de anillo del 1 al 5)
    const visualPhase = remoteState?.challenge?.visual_phase || 1;

    return (
        <div className="h-screen w-full bg-[#f8fafc] flex flex-col font-sans p-0 overflow-hidden relative">
            {/* Fondo decorativo */}
            <div className="absolute inset-0 pointer-events-none opacity-40"
                style={{ background: 'radial-gradient(circle at 50% 0%, #f1f5f9 0%, transparent 60%)' }} />

            {/* Cabecera Superior */}
            <div className="pt-4 px-10 w-full z-50">
                <div className="flex items-center justify-between">
                    {/* Código Sala */}
                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">
                            SALA: <span className="text-slate-900 ml-1">{roomCode || "--- ---"}</span>
                        </span>
                    </div>

                    {/* Banner de Turno Activo */}
                    <AnimatePresence mode="wait">
                        {activeSector && (
                            <motion.div 
                                key={activeSector.id}
                                initial={{ y: -15, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 15, opacity: 0 }}
                                className="bg-amber-50 border-2 border-amber-200 px-6 py-2 rounded-xl shadow-sm flex items-center gap-3"
                            >
                                <div className="text-amber-600 font-black text-[10px] uppercase tracking-widest">Turno:</div>
                                <div className="text-amber-900 font-black text-base">{activeSector.playerName}</div>
                                <div className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-md text-[9px] font-bold uppercase">{activeSector.id}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Tiempo y Salir */}
                    <div className="flex items-center gap-3">
                        <GameClock 
                            isActive={activeChallenge?.type !== 'waiting'} 
                            onTimeout={handleAdvance} 
                        />
                        <button className="bg-white p-3 rounded-xl border border-slate-100 text-slate-400 hover:text-rose-500 transition-colors shadow-sm">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenido Central */}
            <main className="flex-1 flex items-center justify-between px-[5vw] gap-[2vw]">
                {/* Termómetro */}
                <div className="flex-none">
                    <GlobalThermometer temperature={intensity} />
                </div>

                {/* Orbital Board */}
                <div className="flex-1 flex justify-center items-center">
                    <OrbitalBoard 
                        sectors={displaySectors} 
                        turnNumber={turnNumber} 
                        activeSectorId={activeSectorId}
                        visualPhase={visualPhase}
                    />
                </div>

                {/* Carta de Reto */}
                <div className="flex-none">
                    <ChallengeCard
                        challenge={activeChallenge}
                        intensity={intensity}
                        setIntensity={setIntensity}
                        onApply={handleApply}
                        readOnly={(remoteState?.state === 'results' || localFeedback !== null)}
                    />
                </div>
            </main>

            {/* FOOTER - Solo info de sectores */}
            <footer className="bg-white border-t border-slate-200 p-6 relative">
                <div className="max-w-[1600px] mx-auto flex justify-between gap-4">
                    {displaySectors.map((sector, idx) => (
                        <SectorMiniCard 
                            key={sector.id} 
                            sector={sector} 
                            index={idx}
                            isActive={sector.id === activeSectorId}
                        />
                    ))}
                </div>
            </footer>

            {/* OVERLAY DE RESULTADO DE TURNO (Solo feedback temporal) */}
            <AnimatePresence>
                {localFeedback !== null && (
                    <FeedbackOverlay 
                        isCorrect={localFeedback === 'correct'} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
