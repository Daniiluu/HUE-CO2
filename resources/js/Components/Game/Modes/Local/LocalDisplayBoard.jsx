import React, { useState, useEffect, useRef } from 'react';
import GameClock from '../../UI/GameClock';
import { Clock, LogOut, Zap, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import OrbitalBoard from '../../UI/OrbitalBoard';
import GlobalThermometer from '../../UI/GlobalThermometer';
import ChallengeCard from '../../UI/ChallengeCard';
import SectorMiniCard from '../../UI/SectorMiniCard';
import { useGame } from '../../Core/GameProvider';
import { useGameChannel } from '../../../../hooks/useGameChannel';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ROLES } from '../../../../data/gameData';
import { Sparkles, Info } from 'lucide-react';
import FeedbackOverlay from '../../UI/FeedbackOverlay';

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
    const isFreeQuestion = activeChallenge?.type === 'free' || activeChallenge?.type === 'open';

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
    // Para preguntas abiertas en modo local: null → 'evaluating'
    const [freePhase, setFreePhase] = useState(null); // null | 'evaluating'

    // Cuando cambia el reto (por id o por título), resetear estado del turno anterior
    useEffect(() => {
        setFreePhase(null);
        setLocalFeedback(null);
    }, [activeChallenge?.id, activeChallenge?.title]);

    // Mostrar feedback inmediato cuando el mando envía un voto y el backend transiciona a 'results'
    // remoteState.lastTurnCorrect viene del evento GameStateChanged (Reverb) o del polling
    useEffect(() => {
        if (currentGameState === 'results' && localFeedback === null) {
            const isCorrect = remoteState?.lastTurnCorrect ?? false;
            setLocalFeedback(isCorrect ? 'correct' : 'incorrect');
        }
    }, [currentGameState, remoteState?.lastTurnCorrect]);

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
                const cleanCode = (roomCode || '').toString().replace(/\s/g, '');
                response = await axios.post(`/api/game/${cleanCode}/advance`);
            }
            // FALLBACK: actualizar temperatura directamente si el WS falla
            if (response?.data?.juego) {
                setIntensity(response.data.juego.temperatura);
            }
        } catch (error) {
            console.error('[HUE-CO2] Error al avanzar turno:', error);
        } finally {
            setTimeout(() => { advancingRef.current = false; }, 2000);
        }
    };

    const handleApply = async (answer) => {
        if (!activeChallenge || activeChallenge.type === 'waiting') return;

        // Preguntas abiertas: flujo de 2 fases (acepta 'free' y 'open')
        if (isFreeQuestion) {
            if (freePhase === null) {
                // Fase 1: el jugador activo ha respondido en voz alta → pasar a evaluación grupal
                setFreePhase('evaluating');
                return;
            }
            // Fase 2: el grupo ha votado (answer = 'valid' | 'partial' | 'invalid')
            const isCorrect = (answer === 'valid');
            setLocalFeedback(isCorrect ? 'correct' : 'incorrect');
            setFreePhase(null);
            setTimeout(async () => {
                setLocalFeedback(null);
                await handleAdvance();
            }, 2500);
            return;
        }

        // Preguntas de opciones
        let isCorrect = true;
        if (activeChallenge.type === 'options' && activeChallenge.options) {
            const correctOption = activeChallenge.correct_answer || activeChallenge.options[0];
            isCorrect = (answer === correctOption);
        }
        setLocalFeedback(isCorrect ? 'correct' : 'incorrect');
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
                <div className="flex-none w-[380px]">
                    {isFreeQuestion && freePhase === null && (
                        // FASE RESPUESTA: El jugador activo responde en voz alta
                        <motion.div
                            key="free-answering"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border-4 border-amber-300 rounded-[2.5rem] p-8 shadow-xl w-[380px]"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                    🎤 Pregunta Abierta
                                </span>
                            </div>
                            <h2 className="text-lg font-black mb-3 text-[#1c1917] leading-tight">
                                {activeChallenge.title}
                            </h2>
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-800">
                                <strong>Turno de: {activeSector?.playerName || activeSectorId}</strong>
                                <p className="mt-1 font-medium">
                                    {isLocalGame 
                                        ? "Responde en voz alta. Cuando hayas terminado, pulsa el botón para que tus compañeros evalúen tu respuesta."
                                        : "El jugador está respondiendo en su dispositivo. Esperando confirmación..."}
                                </p>
                            </div>
                            {isLocalGame && (
                                <button
                                    onClick={() => handleApply(null)}
                                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-base transition-all active:scale-95 shadow-lg"
                                >
                                    👍 Ya respondí en voz alta
                                </button>
                            )}
                        </motion.div>
                    )}

                    {isFreeQuestion && (freePhase === 'evaluating' || (!isLocalGame && activeChallenge.type === 'validate')) && (
                        // FASE EVALUACIÓN: Los demás votan si la respuesta fue correcta
                        <motion.div
                            key="free-evaluating"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white border-4 border-[#87AF4C] rounded-[2.5rem] p-8 shadow-xl w-[380px]"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[9px] font-black uppercase text-[#87AF4C] tracking-widest bg-[#f0fdf4] px-3 py-1 rounded-full border border-[#E3EFD2]">
                                    ⭐ {isLocalGame ? "Evalúa a tu compañero" : "Evaluación en curso"}
                                </span>
                            </div>
                            <h3 className="text-base font-black text-[#1c1917] mb-1">{activeChallenge.title}</h3>
                            <p className="text-sm text-[#78716c] font-medium mb-5">
                                {isLocalGame 
                                    ? `El sector ${activeSector?.playerName || activeSectorId} ha respondido. ¿Cuál es el veredicto del equipo?`
                                    : `El grupo está evaluando la propuesta de ${activeSector?.playerName || activeSectorId}...`}
                            </p>
                            
                            {isLocalGame ? (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleApply('valid')}
                                        className="w-full py-3 border-[3px] border-emerald-400 bg-emerald-50 text-emerald-800 rounded-2xl font-black text-sm hover:bg-emerald-100 active:scale-95 transition-all"
                                    >
                                        ✅ Totalmente correcta
                                    </button>
                                    <button
                                        onClick={() => handleApply('partial')}
                                        className="w-full py-3 border-[3px] border-amber-400 bg-amber-50 text-amber-800 rounded-2xl font-black text-sm hover:bg-amber-100 active:scale-95 transition-all"
                                    >
                                        ⚠️ Incompleta (parcial)
                                    </button>
                                    <button
                                        onClick={() => handleApply('invalid')}
                                        className="w-full py-3 border-[3px] border-rose-400 bg-rose-50 text-rose-800 rounded-2xl font-black text-sm hover:bg-rose-100 active:scale-95 transition-all"
                                    >
                                        ❌ Incorrecta
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-center">
                                    <div className="flex items-center justify-center gap-2 text-[#87AF4C] font-black text-sm">
                                        <div className="w-2 h-2 rounded-full bg-[#87AF4C] animate-ping" />
                                        Esperando votos del grupo...
                                    </div>
                                    <div className="mt-4 flex justify-center gap-1">
                                        {sectors.filter(s => s.id !== activeSectorId).map(s => (
                                            <div 
                                                key={`vote-dot-${s.id}`}
                                                className={`w-3 h-3 rounded-full border-2 ${votes[s.id] ? 'bg-[#87AF4C] border-[#87AF4C]' : 'bg-transparent border-slate-300'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {!isFreeQuestion && (
                        <ChallengeCard
                            challenge={activeChallenge}
                            intensity={intensity}
                            setIntensity={setIntensity}
                            onApply={handleApply}
                            readOnly={!isLocalGame || localFeedback !== null}
                        />
                    )}
                </div>
            </main>

            {/* Footer con Sectores */}
            {/* Footer con Sectores y Habilidades */}
            <footer className="bg-white border-t border-slate-200 p-4 relative h-[160px]">
                <div className="max-w-[1700px] mx-auto flex items-center h-full gap-6">
                    
                    {/* SECTORES (Grid de 6 columnas - Sin Scroll) */}
                    <div className="grid grid-cols-6 gap-3 w-full h-full py-2">
                        {displaySectors.map((sector, idx) => (
                            <SectorMiniCard 
                                key={sector.id} 
                                sector={sector} 
                                index={idx}
                                isActive={sector.id === activeSectorId}
                            />
                        ))}
                    </div>
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
