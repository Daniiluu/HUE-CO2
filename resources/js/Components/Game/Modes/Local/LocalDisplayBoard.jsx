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
import { Sparkles, Info, Shirt, FlaskConical, Database, Sprout, Landmark, Users } from 'lucide-react';
import FeedbackOverlay from '../../UI/FeedbackOverlay';
import { usePage } from '@inertiajs/react';

export default function LocalDisplayBoard({
    sectors,
    challenge,
    roomCode,
    turnNumber = 1,
    onNextChallenge,
    myParticipantId,
    myPlayerName,
    visualPhase: propVisualPhase,
    gameMode = 'shared'
}) {
    // 1. Hooks de estado y contexto
    const { timeLeft, setTimeLeft, intensity, setIntensity, isPaused, setIsPaused } = useGame();

    // Extraemos setGameState y setVotes del hook actualizado
    const { votes, setVotes, proposal, setProposal, isConnected, gameState: remoteState, setGameState, sendVote, chatMessages } = useGameChannel(roomCode, 'host', myPlayerName || 'Host', myParticipantId);

    const [activeChallenge, setActiveChallenge] = useState(challenge);
    const advancingRef = useRef(false);
    const dismissedChallengeRef = useRef(null);

    // 2. Variables derivadas
    const isLocalGame = (roomCode && roomCode.startsWith('LOCAL_')) || gameMode === 'solo';
    const currentGameState = remoteState?.state || 'waiting';

    const displaySectors = sectors.map((s) => ({
        ...s,
        hasVoted: !!votes[s.id],
    }));

    const activeSectorId = activeChallenge?.activeSectorId;
    const activeSector = sectors.find(s => s.id === activeSectorId);
    const isFreeQuestion = activeChallenge?.type === 'free' || activeChallenge?.type === 'open';

    const [localFeedback, setLocalFeedback] = useState(null);
    const [freePhase, setFreePhase] = useState(null);

    // 3. Efectos de sincronización y limpieza anti-bucles
    useEffect(() => {
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

    // RESETEAR TODO AL CAMBIAR DE RETO REAL (Evita lecturas fantasma del turno anterior)
    useEffect(() => {
        if (challenge) {
            setActiveChallenge(challenge);
            setLocalFeedback(null);
            setFreePhase(null);
            if (challenge.time) setTimeLeft(challenge.time);
        }
    }, [challenge, challenge?.id]);

    useEffect(() => {
        if (remoteState?.temperature !== undefined) {
            setIntensity(remoteState.temperature);
        }
    }, [remoteState]);

    useEffect(() => {
        setFreePhase(null);
        setLocalFeedback(null);
    }, [activeChallenge?.id, activeChallenge?.title]);

    useEffect(() => {
        if (setIsPaused) {
            setIsPaused(localFeedback !== null);
        }
        return () => {
            if (setIsPaused) {
                setIsPaused(false);
            }
        };
    }, [localFeedback, setIsPaused]);

    const [processedMessages, setProcessedMessages] = useState(new Set());
    const [activeAbilityAlert, setActiveAbilityAlert] = useState(null);

    useEffect(() => {
        if (!chatMessages || chatMessages.length === 0) return;

        const latestSystemMsg = [...chatMessages]
            .reverse()
            .find(m => m.type === 'system' && !processedMessages.has(m.id));

        if (latestSystemMsg) {
            setProcessedMessages(prev => {
                const next = new Set(prev);
                next.add(latestSystemMsg.id);
                return next;
            });

            const match = latestSystemMsg.text.match(/¡\[(.*?)\] activó (.*?)[!.]/);
            if (match) {
                const sectorName = match[1];
                const abilityName = match[2];

                const sectorIdMap = {
                    'Industria Textil': 'textil',
                    'Ciencia e I+D': 'ciencia',
                    'Gigantes Tech': 'tech',
                    'Sector Primario': 'primario',
                    'Sector Legislativo': 'legislativo',
                    'Ciudadanía': 'ciudadania'
                };

                const sectorId = sectorIdMap[sectorName] || 'ciencia';

                setActiveAbilityAlert({
                    sectorId,
                    sectorName,
                    abilityName,
                    fullText: latestSystemMsg.text
                });

                setTimeout(() => {
                    setActiveAbilityAlert(null);
                }, 4500);
            }
        }
    }, [chatMessages, processedMessages]);

    // Sincronización en tiempo real de los votos con control de desfase de renders
    useEffect(() => {
        if (!activeChallenge || localFeedback !== null) return;
        if (dismissedChallengeRef.current === activeChallenge.id) return;

        // CORTAFUEGOS EXTRA: Si el estado global de la app ya no es challenge/playing, abortar
        if (remoteState?.state === 'results') return;

        if (isFreeQuestion) {
            const validationVote = Object.values(votes).find(v => ['valid', 'partial', 'invalid'].includes(v));
            if (validationVote) {
                const result = validationVote === 'valid' ? 'correct' : (validationVote === 'partial' ? 'partial' : 'incorrect');
                setLocalFeedback(result);

                if (validationVote === 'valid') {
                    setIntensity(prev => Math.max(0, prev - 0.1));
                } else if (validationVote === 'invalid') {
                    setIntensity(prev => prev + 0.1);
                }
            }
        } else if (activeChallenge.type === 'options' || activeChallenge.type === 'slider') {
            const activeVote = votes[activeSectorId];

            // Si el voto pertenece al reto actual y no es un residuo del render anterior
            if (activeVote !== undefined && activeVote !== null && activeVote !== '') {
                let isCorrect = false;
                if (activeChallenge.type === 'options' && activeChallenge.options) {
                    const correctOption = activeChallenge.correct_answer || activeChallenge.options[0];
                    isCorrect = (String(activeVote).trim().toLowerCase() === String(correctOption).trim().toLowerCase());
                } else if (activeChallenge.type === 'slider') {
                    const diff = Math.abs(Number(activeVote) - Number(activeChallenge.correct_answer || 50));
                    isCorrect = (diff <= 5);
                }
                setLocalFeedback(isCorrect ? 'correct' : 'incorrect');
            }
        }
    }, [votes, activeChallenge, localFeedback, isFreeQuestion, activeSectorId, remoteState?.state]);

    // Fallback de seguridad mediante Sockets/Polling
    // NOTA: El evento WebSocket (GameStateChanged) manda 'lastTurnResult' (string: 'correct'|'incorrect')
    //       mientras que el Polling HTTP manda 'lastTurnCorrect' (boolean). Normalizamos ambos.
    useEffect(() => {
        if (remoteState?.state === 'results' && localFeedback === null && dismissedChallengeRef.current !== activeChallenge?.id) {
            // Soportar ambas naming conventions: WebSocket (lastTurnResult) y Polling (lastTurnCorrect)
            let isCorrect = false;
            if (remoteState?.lastTurnResult !== undefined) {
                isCorrect = remoteState.lastTurnResult === 'correct';
            } else if (remoteState?.lastTurnCorrect !== undefined) {
                isCorrect = !!remoteState.lastTurnCorrect;
            }
            setLocalFeedback(isCorrect ? 'correct' : 'incorrect');
            if (isFreeQuestion) setFreePhase(null);
        }
    }, [remoteState?.state, remoteState?.lastTurnResult, remoteState?.lastTurnCorrect, localFeedback, isFreeQuestion, activeChallenge?.id]);

    const handleAdvance = async () => {
        if (advancingRef.current) return;
        advancingRef.current = true;

        // 1. Limpieza total e instantánea en la interfaz optimista
        setLocalFeedback(null);
        setFreePhase(null);
        if (typeof setVotes === 'function') setVotes({});
        if (typeof setProposal === 'function') setProposal(null);

        try {
            let response;
            if (onNextChallenge) {
                response = await onNextChallenge();
            } else {
                const cleanCode = (roomCode || '').toString().replace(/\s/g, '');
                response = await axios.post(`/api/game/${cleanCode}/advance`);
            }

            if (response?.data?.gameState) {
                const freshState = response.data.gameState;

                if (typeof setGameState === 'function') {
                    setGameState(freshState);
                }
                if (typeof setActiveChallenge === 'function') {
                    setActiveChallenge(freshState.challenge || {});
                }
                if (freshState.temperature !== undefined) {
                    setIntensity(freshState.temperature);
                }
            }
        } catch (error) {
            console.error('[HUE-CO2] Error al avanzar turno:', error);
        } finally {
            setTimeout(() => { advancingRef.current = false; }, 2500);
        }
    };

    const handleApply = async (answer) => {
        if (!activeChallenge || activeChallenge.type === 'waiting') return;

        if (isFreeQuestion) {
            if (freePhase === null) {
                setFreePhase('evaluating');
                return;
            }
            const isCorrect = (answer === 'valid');

            if (gameMode === 'solo') {
                try {
                    await sendVote(answer, 'validate', activeSectorId);
                } catch (err) {
                    console.error('[HUE-CO2] Error al validar respuesta en modo solo:', err);
                }
            }

            setLocalFeedback(isCorrect ? 'correct' : 'incorrect');
            setFreePhase(null);
            return;
        }

        let isCorrect = true;
        if (activeChallenge.type === 'options' && activeChallenge.options) {
            const correctOption = activeChallenge.correct_answer || activeChallenge.options[0];
            isCorrect = (answer === correctOption);
        } else if (activeChallenge.type === 'slider') {
            const diff = Math.abs(Number(answer) - Number(activeChallenge.correct_answer || 50));
            isCorrect = (diff <= 5);
        }

        if (gameMode === 'solo') {
            try {
                await sendVote(answer, activeChallenge.type ?? 'options', activeSectorId);
            } catch (err) {
                console.error('[HUE-CO2] Error al enviar voto en modo solo:', err);
            }
        }

        setLocalFeedback(isCorrect ? 'correct' : 'incorrect');
    };

    const { props } = usePage();
    const handleExit = () => {
        if (window.confirm("¿Seguro que deseas salir de la partida? Perderás todo el progreso actual.")) {
            if (props.auth?.user) {
                window.location.href = '/dashboard';
            } else {
                window.location.href = '/jugar';
            }
        }
    };

    const visualPhase = propVisualPhase || remoteState?.challenge?.visual_phase || 1;

    return (
        <div className="h-screen w-full bg-[#f8fafc] flex flex-col font-sans p-0 overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none opacity-40"
                style={{ background: 'radial-gradient(circle at 50% 0%, #f1f5f9 0%, transparent 60%)' }} />

            {/* Cabecera Superior */}
            <div className="pt-4 px-10 w-full z-50">
                <div className="flex items-center justify-between">
                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">
                            SALA: <span className="text-slate-900 ml-1">{roomCode || "--- ---"}</span>
                        </span>
                    </div>

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

                    <div className="flex items-center gap-3">
                        <GameClock
                            isActive={activeChallenge?.type !== 'waiting'}
                            onTimeout={handleAdvance}
                        />
                        <button
                            onClick={handleExit}
                            className="bg-white p-3 rounded-xl border border-slate-100 text-slate-400 hover:text-rose-500 transition-colors shadow-sm"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenido Central */}
            <main className="flex-1 flex items-center justify-between px-[5vw] gap-[2vw]">
                <div className="flex-none">
                    <GlobalThermometer temperature={intensity} />
                </div>

                <div className="flex-1 flex justify-center items-center">
                    <OrbitalBoard
                        sectors={displaySectors}
                        turnNumber={turnNumber}
                        activeSectorId={activeSectorId}
                        visualPhase={visualPhase}
                    />
                </div>

                <div className="flex-none w-[380px]">
                    {(() => {
                        const relativeTurn = ((turnNumber - 1) % 6) + 1;
                        const challengeWithTurn = {
                            ...activeChallenge,
                            turn: `${relativeTurn} / 6`
                        };

                        if (isFreeQuestion && freePhase === null) {
                            return (
                                <motion.div
                                    key="free-answering"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white border-4 border-amber-300 rounded-[2.5rem] p-8 shadow-xl w-[380px]"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                            🎤 Pregunta Abierta
                                        </span>
                                        <div className="px-2.5 py-1 bg-neutral-100 rounded-md border border-stone-200">
                                            <span className="text-stone-500 text-[9px] font-bold uppercase tracking-widest">
                                                Turno {challengeWithTurn.turn}
                                            </span>
                                        </div>
                                    </div>
                                    <h2 className="text-lg font-black mb-3 text-[#1c1917] leading-tight">
                                        {activeChallenge.title}
                                    </h2>
                                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-800">
                                        <strong>Turno de: {activeSector?.playerName || activeSectorId}</strong>
                                        <p className="mt-1 font-medium">
                                            {isLocalGame
                                                ? "Responde en voz alta. Cuando hayas terminado, pulsa el botón para que tus compañeros evalúen tu respuesta."
                                                : "El jugador está respondiendo en su dispositivo. Esperando confirmation..."}
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
                            );
                        }

                        if (isFreeQuestion && (freePhase === 'evaluating' || (!isLocalGame && activeChallenge.type === 'validate'))) {
                            return (
                                <motion.div
                                    key="free-evaluating"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white border-4 border-4 border-[#87AF4C] rounded-[2.5rem] p-8 shadow-xl w-[380px]"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[9px] font-black uppercase text-[#87AF4C] tracking-widest bg-[#f0fdf4] px-3 py-1 rounded-full border border-[#E3EFD2]">
                                            ⭐ {isLocalGame ? "Evalúa a tu compañero" : "Evaluación en curso"}
                                        </span>
                                        <div className="px-2.5 py-1 bg-neutral-100 rounded-md border border-stone-200">
                                            <span className="text-stone-500 text-[9px] font-bold uppercase tracking-widest">
                                                Turno {challengeWithTurn.turn}
                                            </span>
                                        </div>
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
                            );
                        }

                        if (!isFreeQuestion) {
                            return (
                                <ChallengeCard
                                    challenge={challengeWithTurn}
                                    intensity={intensity}
                                    setIntensity={setIntensity}
                                    onApply={handleApply}
                                    readOnly={!isLocalGame || localFeedback !== null}
                                />
                            );
                        }

                        return null;
                    })()}
                </div>
            </main>

            {/* Footer con Sectores */}
            <footer className="bg-white border-t border-slate-200 p-4 relative h-[160px]">
                <div className="max-w-[1700px] mx-auto flex items-center h-full gap-6">
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

            {/* OVERLAY DE RESULTADO DE TURNO CORREGIDO CON FILTRO DE TURNO */}
            <AnimatePresence>
                {localFeedback !== null && (
                    <FeedbackOverlay
                        isCorrect={localFeedback === 'correct'}
                        explicacion={activeChallenge?.explicacion}
                        dinamica_grupo={activeChallenge?.dinamica_grupo}
                        tiempo_dinamica={activeChallenge?.tiempo_dinamica}
                        opcion_correcta={activeChallenge?.correctAnswerText}
                        onNext={async () => {
                            if (activeChallenge?.id) {
                                dismissedChallengeRef.current = activeChallenge.id;
                            }
                            setLocalFeedback(null);
                            await handleAdvance();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* OVERLAY DE NOTIFICACIÓN DE HABILIDAD ACTIVADA */}
            <AnimatePresence>
                {activeAbilityAlert && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-md p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 50, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }}
                            exit={{ scale: 0.8, y: -50, opacity: 0 }}
                            className="bg-white/90 backdrop-blur-xl border-4 border-amber-400 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl text-center relative overflow-hidden"
                            style={{ boxShadow: '0 25px 50px -12px rgba(251, 191, 36, 0.4)' }}
                        >
                            <div className="absolute -inset-10 bg-gradient-to-tr from-amber-200/20 via-transparent to-yellow-200/20 rounded-[4rem] pointer-events-none blur-xl" />

                            <motion.div
                                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg border-2 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 text-amber-500"
                            >
                                {(() => {
                                    const iconSize = 48;
                                    switch (activeAbilityAlert.sectorId) {
                                        case 'textil': return <Shirt size={iconSize} className="text-indigo-500" />;
                                        case 'ciencia': return <FlaskConical size={iconSize} className="text-blue-500" />;
                                        case 'tech': return <Database size={iconSize} className="text-violet-500" />;
                                        case 'primario': return <Sprout size={iconSize} className="text-emerald-500" />;
                                        case 'legislativo': return <Landmark size={iconSize} className="text-rose-500" />;
                                        case 'ciudadania': return <Users size={iconSize} className="text-fuchsia-500" />;
                                        default: return <Zap size={iconSize} className="text-amber-500" />;
                                    }
                                })()}
                            </motion.div>

                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 bg-amber-100/60 px-4 py-1.5 rounded-full border border-amber-200/50 inline-block mb-4 shadow-sm">
                                ✨ PODER ACTIVO DETECTADO ✨
                            </span>

                            <h2 className="text-3xl font-black text-stone-900 mb-2 leading-tight">
                                {activeAbilityAlert.sectorName}
                            </h2>

                            <h3 className="text-lg font-black text-amber-500 mb-4 flex items-center justify-center gap-2">
                                <Sparkles className="w-5 h-5 fill-current" />
                                {activeAbilityAlert.abilityName}
                            </h3>

                            <p className="text-stone-600 font-semibold text-sm leading-relaxed max-w-sm mx-auto bg-stone-50 border border-stone-100 rounded-2xl p-4">
                                {activeAbilityAlert.fullText.split('! ')[1] || activeAbilityAlert.fullText}
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}