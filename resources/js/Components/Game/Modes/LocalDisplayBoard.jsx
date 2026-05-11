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

export default function LocalDisplayBoard({ sectors, challenge, roomCode, turnNumber = 1, onNextChallenge }) {
    // 1. Hooks de estado y contexto
    const { timeLeft, setTimeLeft, intensity, setIntensity } = useGame();
    const { votes, proposal, isConnected, gameState: remoteState } = useGameChannel(roomCode, 'host', 'Pantalla');
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

        // 1. Validar respuesta (si es tipo opciones)
        let isCorrect = true;
        if (activeChallenge.type === 'options' && activeChallenge.options) {
            // En modo local (1 jugador), validamos contra la primera opción o la definida
            const correctOption = activeChallenge.correct_answer || activeChallenge.options[0];
            isCorrect = (answer === correctOption);
        }

        // 2. Mostrar el feedback visual (Overlay)
        setLocalFeedback(isCorrect ? 'correct' : 'incorrect');

        // 3. Esperar y avanzar
        setTimeout(async () => {
            setLocalFeedback(null);
            await handleAdvance();
        }, 2500);
    };

    // Para la visualPhase en el OrbitalBoard
    const visualPhase = (currentGameState === 'results' || localFeedback !== null) ? 'results' : 'challenge';

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
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                            <Clock className="w-4 h-4 text-slate-300" />
                            <div className="flex flex-col items-end">
                                <GameClock 
                                    isActive={activeChallenge?.type !== 'waiting'} 
                                    onTimeout={handleAdvance} 
                                />
                            </div>
                        </div>
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
                        readOnly={!isLocalGame || localFeedback !== null}
                    />
                </div>
            </main>

            {/* Footer con Sectores */}
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

                {/* BOTÓN: FORZAR RESULTADOS (Solo en modo challenge, para el host) */}
                <AnimatePresence>
                    {currentGameState !== 'results' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-2 right-4"
                        >
                            <button
                                onClick={handleAdvance}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                                title="Forzar fin de turno (si nadie ha votado)"
                            >
                                Forzar Resultados <ChevronRight className="w-3 h-3" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* BOTÓN SIGUIENTE (Solo en modo resultados) */}
                <AnimatePresence>
                    {currentGameState === 'results' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="absolute inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center z-[60]"
                        >
                            <button 
                                onClick={handleAdvance}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-2xl font-black text-xl shadow-xl hover:scale-105 transition-all flex items-center gap-3 group"
                            >
                                <Zap className="w-6 h-6 text-yellow-300 group-hover:rotate-12 transition-transform" />
                                SIGUIENTE RETO
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </footer>

            {/* OVERLAY DE RESULTADO DE TURNO (Multiplayer o Local) */}
            <AnimatePresence>
                {(currentGameState === 'results' || localFeedback !== null) && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none"
                    >
                        <motion.div 
                            initial={{ scale: 0.5, rotate: -5 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className={`p-16 rounded-[4rem] shadow-2xl flex flex-col items-center gap-6 border-8 
                                ${(remoteState?.lastTurnCorrect || localFeedback === 'correct') 
                                    ? 'bg-emerald-500 border-emerald-400' 
                                    : 'bg-rose-600 border-rose-500'}`}
                        >
                            {(remoteState?.lastTurnCorrect || localFeedback === 'correct') ? (
                                <>
                                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-inner">
                                        <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                                    </div>
                                    <h1 className="text-white text-7xl font-black uppercase tracking-tighter">¡LOGRADO!</h1>
                                    <p className="text-emerald-100 text-xl font-bold uppercase tracking-widest">+1 PUNTO PARA EL SECTOR</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-inner animate-bounce">
                                        <AlertTriangle className="w-20 h-20 text-rose-500" />
                                    </div>
                                    <h1 className="text-white text-7xl font-black uppercase tracking-tighter">¡FALLO!</h1>
                                    <p className="text-rose-100 text-xl font-bold uppercase tracking-widest">+0.1°C A LA TEMPERATURA GLOBAL</p>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
