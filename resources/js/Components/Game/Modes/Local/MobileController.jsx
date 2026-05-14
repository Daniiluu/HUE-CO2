import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Zap, Droplets, Cpu, Shirt, Landmark, FlaskConical,
    AlertTriangle, Send, HeartHandshake, CheckCircle2, Clock,
    ChevronRight, Recycle, ShieldCheck, Star, Hexagon, Heart, Moon,
    CheckCircle, Minus, X
} from 'lucide-react';
import { useGameChannel } from '../../../../hooks/useGameChannel';

// ─── Constantes Estáticas ────────────────────────────────────────────────────
// Fuente de verdad de roles (espejo del gameData.ts para el mando)
const ROLE_CONFIG = {
    textil:     { color: 'bg-amber-100',   border: 'border-amber-400',   text: 'text-amber-900',   btn: 'bg-amber-500',   shadow: 'shadow-amber-200'   },
    ciencia:    { color: 'bg-cyan-100',    border: 'border-cyan-400',    text: 'text-cyan-900',    btn: 'bg-cyan-500',    shadow: 'shadow-cyan-200'    },
    tech:       { color: 'bg-indigo-100',  border: 'border-indigo-400',  text: 'text-indigo-900',  btn: 'bg-indigo-500',  shadow: 'shadow-indigo-200'  },
    primario:   { color: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-900', btn: 'bg-emerald-500', shadow: 'shadow-emerald-200' },
    publico:    { color: 'bg-rose-100',    border: 'border-rose-400',    text: 'text-rose-900',    btn: 'bg-rose-500',    shadow: 'shadow-rose-200'    },
    ciudadania: { color: 'bg-violet-100',  border: 'border-violet-400',  text: 'text-violet-900',  btn: 'bg-violet-500',  shadow: 'shadow-violet-200'  },
};

const ROLE_ICONS = {
    textil:     <Shirt />,
    ciencia:    <FlaskConical />,
    tech:       <Cpu />,
    primario:   <Droplets />,
    publico:    <Landmark />,
    ciudadania: <Users />,
};

// Iconos y colores de las opciones ABCD (compartidos con ChallengeCard)
const OPTION_STYLES = [
    { bg: 'bg-rose-500',    border: 'border-rose-500',    icon: <Star    fill="white" size={20} color="white" />, label: 'A' },
    { bg: 'bg-amber-400',   border: 'border-amber-400',   icon: <Hexagon fill="white" size={20} color="white" />, label: 'B' },
    { bg: 'bg-emerald-500', border: 'border-emerald-500', icon: <Heart   fill="white" size={20} color="white" />, label: 'C' },
    { bg: 'bg-blue-500',    border: 'border-blue-500',    icon: <Moon    fill="white" size={20} color="white" />, label: 'D' },
];

const VALIDATE_OPTIONS = [
    { key: 'valid',   icon: <CheckCircle size={20} />,  label: 'Totalmente válida',    active: 'border-emerald-500 bg-emerald-50 text-emerald-800', check: 'text-emerald-600' },
    { key: 'partial', icon: <Minus size={20} />,         label: 'Incompleta (parcial)', active: 'border-amber-500 bg-amber-50 text-amber-800',       check: 'text-amber-600'   },
    { key: 'invalid', icon: <X size={20} />,              label: 'Incorrecta',           active: 'border-rose-500 bg-rose-50 text-rose-800',          check: 'text-rose-600'    },
];
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MobileController.jsx
 * Vista del mando de control personal de cada jugador.
 * 
 * Props:
 *  - role: Objeto del rol del jugador (de ROLES en gameData.ts)
 *  - playerName: Nombre del jugador
 *  - tokens: Eco-tokens actuales
 *  - timeLeft: Segundos restantes del turno
 *  - globalTemp: Temperatura global actual (ej: "+0.2°C")
 *  - currentTurn: Ej: "3/15"
 *  - challenge: Objeto del reto actual (mismo schema que ChallengeCard)
 *  - gameState: 'waiting' | 'challenge' | 'voted'
 *  - onVote: fn(answer) — callback al votar
 *  - onApply: fn(value) — callback al confirmar slider/open
 *  - onDonate: fn() — callback al donar EcoToken
 *  - onChat: fn() — callback al abrir chat
 *  - onActivatePower: fn() — callback al activar poder especial
 */
export default function MobileController({
    roles = [],
    playerName = 'Jugador',
    tokens = 4,
    timeLeft = 90,
    globalTemp = '+0.2°C',
    currentTurn = '3/15',
    challenge = {},
    gameState = 'challenge', // 'waiting' | 'challenge' | 'voted'
    roomCode = 'TEST-000',   // Código de sala para conectar al canal correcto
    participanteId = null,
    onDonate,
    onChat,
    onActivatePower,
}) {
    // ── Soporte Multi-Rol (Modo Local) ──
    const safeRoles = roles.length > 0 ? roles : [{ id: 'ciudadania', name: 'Ciudadanía' }];
    
    // El tema visual se basa en el primer rol para mantener coherencia
    const primaryRole = safeRoles[0];
    const theme = ROLE_CONFIG[primaryRole?.id] ?? ROLE_CONFIG.ciudadania;

    const [localGameState, setLocalGameState] = useState(gameState);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [sliderValue, setSliderValue] = useState(challenge.sliderDefault ?? 50);
    const [proposalText, setProposalText] = useState('');
    const [currentChallenge, setCurrentChallenge] = useState(challenge);

    // ── WebSocket: Conectar al canal de la sala ───────────────────────────────
    const { isConnected, gameState: serverGameState, sendVote, sendProposal, proposal } = useGameChannel(
        roomCode,
        primaryRole?.id, // ID por defecto
        playerName,
        participanteId
    );

    // Cuando el servidor cambia el estado del juego, actualizar nuestra vista
    React.useEffect(() => {
        if (!serverGameState) return;
        setLocalGameState(serverGameState.state);
        if (serverGameState.challenge && typeof serverGameState.challenge === 'object' && Object.keys(serverGameState.challenge).length > 0) {
            setCurrentChallenge(serverGameState.challenge);
            setSelectedAnswer(null);
            setSliderValue(serverGameState.challenge.sliderDefault ?? 50);
            setProposalText('');
        }
    }, [serverGameState]);

    // NUEVO: Cuando llega una propuesta de un compañero, cambiar a modo validación
    React.useEffect(() => {
        if (proposal && localGameState !== 'voted') {
            setCurrentChallenge(prev => ({
                ...prev,
                type: 'validate',
                proposal: proposal.text,
                proposerName: proposal.playerName,
                proposerSectorId: proposal.sectorId
            }));
            setSelectedAnswer(null);
        }
    }, [proposal]);
    // ───────────────────────────────────────────────────────────────

    const challengeType = currentChallenge.type ?? 'options';

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const handleVote = async (answer) => {
        setSelectedAnswer(answer);
        // Votación en bloque para todos los sectores asignados
        for (const r of safeRoles) {
            await sendVote(answer, challengeType, r.id);
        }
        // La transición a 'results' la gestiona el backend en /vote automáticamente.
        // El polling de 1s en useGameChannel detectará el nuevo estado y actualizará la UI.
        setLocalGameState('voted');
    };

    const handleProposal = async () => {
        if (!proposalText.trim()) return;
        // Propuesta en bloque para todos los sectores asignados
        for (const r of safeRoles) {
            await sendProposal(proposalText, r.id);
        }
        setLocalGameState('voted');
    };

    // ── Contenido del Área Principal según tipo de reto ──
    const renderChallengeContent = () => {
        const safeChallenge = currentChallenge || {};
        const challengeType = safeChallenge.type ?? 'options';

        // Verificar si es nuestro turno
        const activeSectorId = safeChallenge.activeSectorId;
        const isMyTurn = !activeSectorId || safeRoles.some(r => r.id === activeSectorId);

        // Para preguntas abiertas (free): los OTROS sectores validan, el activo responde en voz alta
        // Para el resto: solo el sector activo puede responder
        const isFreeQuestion = challengeType === 'free';
        const canVoteNow = isFreeQuestion ? !isMyTurn : isMyTurn; // En free, votan los que NO son el activo

        if (!canVoteNow && localGameState !== 'voted') {
            // Mensaje especial para el sector activo en pregunta abierta
            if (isFreeQuestion && isMyTurn) {
                return (
                    <motion.div
                        key="free-speaker"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50 border-4 border-amber-300 rounded-[2.5rem] p-10 text-center"
                    >
                        <div className="w-20 h-20 bg-amber-200 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-amber-600 animate-pulse" />
                        </div>
                        <h2 className="text-xl font-black text-amber-800 mb-2 uppercase tracking-widest">¡Es tu turno!</h2>
                        <h3 className="text-lg font-bold text-amber-700 mb-4">{safeChallenge.title ?? 'Pregunta abierta'}</h3>
                        <p className="text-amber-600 font-medium">
                            Responde <strong>en voz alta</strong>. Tus compañeros validarán tu respuesta.
                        </p>
                    </motion.div>
                );
            }
            // Mensaje genérico para sectores que no les toca
            return (
                <motion.div
                    key="waiting-turn"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-stone-50 border-4 border-stone-200 rounded-[2.5rem] p-10 text-center"
                >
                    <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-stone-400 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-black text-stone-400 mb-2 uppercase tracking-widest">Turno de otro sector</h2>
                    <p className="text-stone-500 font-medium">
                        Ahora es el turno de: <br/>
                        <span className="text-stone-800 font-black text-2xl uppercase">{activeSectorId}</span>
                    </p>
                    <div className="mt-8 p-4 bg-white rounded-2xl border-2 border-stone-100 text-xs text-stone-400 italic">
                        "Prepara tu estrategia, tu turno llegará pronto"
                    </div>
                </motion.div>
            );
        }

        if (localGameState === 'voted') {
            return (
                <motion.div
                    key="voted"
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white border-4 border-[#e7e5e4] rounded-[2.5rem] p-8 text-center shadow-[0_8px_0_0_#e7e5e4]"
                >
                    <div className={`w-20 h-20 ${theme.color} rounded-full flex items-center justify-center mx-auto mb-4 border-4 ${theme.border}`}>
                        <CheckCircle2 className={`w-10 h-10 ${theme.text}`} />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-[#1c1917]">Voto Registrado</h2>
                    <p className="text-sm text-[#78716c] font-medium mb-6">
                        Mira la pantalla principal para debatir con tus compañeros.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-amber-600 font-bold bg-amber-50 p-3 rounded-2xl border-2 border-amber-200">
                        <Clock className="w-5 h-5" /> Quedan {formatTime(timeLeft)}
                    </div>
                </motion.div>
            );
        }

        if (localGameState === 'lobby') {
            return (
                <motion.div
                    key="lobby"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border-4 border-[#e7e5e4] rounded-[2.5rem] p-8 text-center shadow-[0_8px_0_0_#e7e5e4]"
                >
                    <div className="w-20 h-20 bg-[#f5f5f4] rounded-full flex items-center justify-center mx-auto mb-6">
                        <HeartHandshake className="w-10 h-10 text-[#a8a29e] animate-bounce" />
                    </div>
                    <h2 className="text-2xl font-black mb-3 text-[#1c1917]">¡Conectado!</h2>
                    <p className="text-sm text-[#78716c] font-medium leading-relaxed mb-6">
                        Esperando a que el host empiece la partida...
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#a8a29e]">Conexión Establecida</span>
                    </div>
                </motion.div>
            );
        }

        if (localGameState === 'waiting') {
            return (
                <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center p-8 border-4 border-dashed border-[#e7e5e4] rounded-[2.5rem] bg-white"
                >
                    <Recycle className="w-10 h-10 text-[#d6d3d1] mx-auto mb-3" style={{ animation: 'spin 10s linear infinite' }} />
                    <p className="font-bold text-[#a8a29e] text-sm">Esperando el siguiente anillo...</p>
                    <p className="text-xs text-[#d6d3d1] mt-2 font-medium">Las demás secciones toman su decisión.</p>
                </motion.div>
            );
        }

        // gameState === 'challenge' o 'playing'
        return (
            <motion.div
                key={`challenge-${challengeType}-${currentChallenge.id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-4 border-[#e7e5e4] rounded-[2.5rem] p-5 shadow-[0_8px_0_0_#e7e5e4]"
            >
                {/* Cabecera del reto */}
                <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-[9px] font-black uppercase text-rose-500 tracking-widest">
                        Desafío · Anillo del {safeChallenge.ring ?? 'Agua'}
                    </span>
                </div>
                <h2 className="text-lg font-black mb-1 text-[#1c1917] leading-tight">
                    {safeChallenge.title ?? 'Reto sin nombre'}
                </h2>

                {/* ── Tipo OPCIONES ── */}
                {challengeType === 'options' && (
                    <>
                        <p className="text-xs text-[#78716c] font-medium mb-4 leading-relaxed">
                            Mira la pantalla para debatir la respuesta.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {safeChallenge.options?.map((opt, i) => {
                                const style = OPTION_STYLES[i];
                                const isSelected = selectedAnswer === opt;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedAnswer(opt)}
                                        className={`rounded-2xl overflow-hidden flex flex-col h-[110px] transition-all active:scale-95 border-[3px]
                                            ${isSelected ? `${style.border} ring-4 ring-slate-100` : 'border-[#e7e5e4] hover:border-slate-300'}`}
                                    >
                                        <div className={`flex-1 flex items-center justify-center ${style.bg} text-white`}>
                                            {style.icon}
                                        </div>
                                        <div className="bg-[#fafaf9] p-2 flex items-center justify-center min-h-[42px]">
                                            <span className="text-[9px] font-bold text-[#78716c] text-center leading-snug line-clamp-2">
                                                {opt}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => handleVote(selectedAnswer)}
                            disabled={!selectedAnswer}
                            className={`mt-4 w-full py-3 rounded-2xl font-black transition-all text-sm
                                ${selectedAnswer ? `${theme.btn} text-white active:scale-95 shadow-md` : 'bg-[#e7e5e4] text-[#a8a29e] cursor-not-allowed'}`}
                        >
                            Confirmar Voto
                        </button>
                    </>
                )}

                {/* ── Tipo FREE: Los OTROS sectores validan la respuesta del sector activo ── */}
                {challengeType === 'free' && (
                    <>
                        <p className="text-xs text-[#78716c] font-medium mb-2 leading-relaxed">
                            Valida la respuesta del sector <strong className="uppercase">{safeChallenge.activeSectorId ?? 'activo'}</strong>
                        </p>
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 mb-4 text-sm font-bold text-amber-800 text-center">
                            🎤 Escucha su respuesta en voz alta
                        </div>
                        <div className="space-y-2">
                            {VALIDATE_OPTIONS.map(({ key, icon, label, active }) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedAnswer(key)}
                                    className={`w-full border-[3px] py-3 rounded-2xl flex items-center justify-center gap-3 font-black text-sm transition-all active:scale-95
                                        ${selectedAnswer === key ? active : 'bg-white border-[#e7e5e4] text-[#78716c] hover:border-slate-300'}`}
                                >
                                    {icon} {label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => selectedAnswer && handleVote(selectedAnswer)}
                            disabled={!selectedAnswer}
                            className={`mt-4 w-full py-3 rounded-2xl font-black transition-all text-sm
                                ${selectedAnswer ? `${theme.btn} text-white active:scale-95 shadow-md` : 'bg-[#e7e5e4] text-[#a8a29e] cursor-not-allowed'}`}
                        >
                            Confirmar Validación
                        </button>
                    </>
                )}

                {/* ── Tipo SLIDER ── */}
                {challengeType === 'slider' && (
                    <>
                        <p className="text-xs text-[#78716c] font-medium mb-5 leading-relaxed">
                            {safeChallenge.description ?? 'Ajusta el valor de tu decisión.'}
                        </p>
                        <div className="text-center mb-5">
                            <span className={`text-5xl font-black tabular-nums ${theme.text}`}>
                                {sliderValue}
                            </span>
                            <span className={`text-lg font-black ${theme.text} ml-1`}>{safeChallenge.unit ?? '%'}</span>
                        </div>
                        <input
                            type="range"
                            min={safeChallenge.sliderMin ?? 0}
                            max={safeChallenge.sliderMax ?? 100}
                            step={safeChallenge.sliderStep ?? 5}
                            value={sliderValue}
                            onChange={(e) => setSliderValue(parseInt(e.target.value))}
                            className="w-full h-3 bg-[#e7e5e4] rounded-full appearance-none cursor-pointer mb-2"
                        />
                        <div className="flex justify-between text-[9px] font-black text-[#a8a29e] uppercase tracking-widest mb-4">
                            <span>{safeChallenge.sliderMin ?? 0}</span>
                            <span>{safeChallenge.sliderMax ?? 100}</span>
                        </div>
                        <button
                            onClick={() => handleVote(sliderValue)}
                            className={`w-full py-3 rounded-2xl font-black text-white flex items-center justify-center gap-2 active:scale-95 transition-all ${theme.btn}`}
                        >
                            <Zap size={16} /> Confirmar Decisión
                        </button>
                    </>
                )}

                {/* ── Tipo VALIDATE ── */}
                {challengeType === 'validate' && (
                    <>
                        <p className="text-xs text-[#78716c] font-medium mb-3 leading-relaxed">
                            Evalúa a tus compañeros
                        </p>
                        <div className="bg-[#f5f5f4] border-2 border-dashed border-[#d6d3d1] rounded-2xl p-4 mb-4 text-sm font-bold italic text-[#44403c] leading-relaxed">
                            "{safeChallenge.proposal ?? 'El sector ha propuesto una medida...'}"
                            {safeChallenge.proposerName && (
                                <div className="mt-2 text-right not-italic text-[10px] text-[#a8a29e] uppercase tracking-wider">
                                    — Propuesta de {safeChallenge.proposerName}
                                </div>
                            )}
                        </div>
                        <p className="text-[9px] font-black text-[#a8a29e] uppercase tracking-widest text-center mb-3">
                            Debate con tu equipo. <br />Vota si su propuesta merece ganar los Eco-Tokens.
                        </p>
                        <div className="space-y-2">
                            {VALIDATE_OPTIONS.map(({ key, icon, label, active }) => (
                                <button
                                    key={key}
                                    onClick={() => handleVote(key)}
                                    className={`w-full border-[3px] py-3 rounded-2xl flex items-center justify-center gap-3 font-black text-sm transition-all active:scale-95
                                        ${selectedAnswer === key ? active : 'bg-white border-[#e7e5e4] text-[#78716c] hover:border-slate-300'}`}
                                >
                                    {icon} {label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </motion.div>
        );
    };

    return (
        <div className="h-[100dvh] bg-[#fafaf9] font-sans text-[#44403c] flex justify-center overflow-hidden">
            <div className="w-full max-w-md bg-[#fafaf9] h-[100dvh] flex flex-col relative shadow-2xl border-x-4 border-[#e7e5e4]">

                {/* ── HEADER Global ── */}
                <header className="px-5 py-3.5 flex justify-between items-center bg-white border-b-4 border-[#e7e5e4] shrink-0 z-10">
                    <div className="bg-[#1c1917] text-white px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 text-sm">
                        <span className="text-rose-400">{globalTemp}</span>
                    </div>
                    <div className="font-black text-[#a8a29e] uppercase tracking-widest text-[10px]">
                        Turno {currentTurn}
                    </div>
                </header>

                {/* ── SELECTOR MULTI-ROL (ELIMINADO por unificación) ── */}

                {/* ── IDENTIDAD DEL JUGADOR (UNIFICADA) ── */}
                <div className={`px-5 pt-5 pb-7 ${theme.color} border-b-4 ${theme.border} rounded-b-[2.5rem] shrink-0 transition-colors duration-500`}>
                    <div className="flex justify-between items-start mb-5">
                        {/* Iconos de los Roles */}
                        <div className="flex -space-x-2">
                            {safeRoles.map((r, idx) => {
                                const rIcon = ROLE_ICONS[r.id] ?? <Users />;
                                const rTheme = ROLE_CONFIG[r.id] ?? ROLE_CONFIG.ciudadania;
                                return (
                                    <div key={idx} className={`bg-white p-2.5 rounded-2xl shadow-sm border-2 ${rTheme.border} relative z-[${10 - idx}]`}>
                                        {React.cloneElement(rIcon, { className: `w-6 h-6 ${rTheme.text}` })}
                                    </div>
                                );
                            })}
                        </div>
                        {/* EcoTokens (Total Sumado) */}
                        <div className={`bg-[#1c1917] text-white px-4 py-2 rounded-[1.5rem] flex items-center gap-2 shadow-lg rotate-2`}>
                            <Zap className="w-5 h-5 fill-current text-amber-400" />
                            <span className="font-black text-xl">{tokens}</span>
                        </div>
                    </div>
                    <div>
                        <h1 className={`text-xl font-black leading-tight mb-2 ${theme.text}`}>
                            {safeRoles.map(r => r.name).join(' + ')}
                        </h1>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold text-xs opacity-70 ${theme.text}`}>
                                Jugador: {playerName}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── ÁREA DE JUEGO ── */}
                <main className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto pb-32">
                    <AnimatePresence mode="wait">
                        {renderChallengeContent()}
                    </AnimatePresence>

                    {/* ── TARJETA DE HABILIDADES (Unificada) ── */}
                    <div className="bg-white border-4 border-[#e7e5e4] rounded-[2.5rem] p-5 space-y-6">
                        {safeRoles.map((r, idx) => {
                            const rTheme = ROLE_CONFIG[r.id] ?? ROLE_CONFIG.ciudadania;
                            const rIcon = ROLE_ICONS[r.id] ?? <Users />;
                            return (
                                <div key={idx} className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        {React.cloneElement(rIcon, { className: `w-4 h-4 ${rTheme.text}` })}
                                        <h3 className={`text-[10px] font-black uppercase ${rTheme.text} tracking-widest`}>
                                            {r.name}
                                        </h3>
                                    </div>
                                    <div className="space-y-3 pl-2 border-l-2 border-[#f5f5f4]">
                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 bg-[#f5f5f4] rounded-lg mt-0.5 shrink-0">
                                                <ShieldCheck className="w-4 h-4 text-[#a8a29e]" />
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black uppercase mb-1 text-[#78716c]">Pasiva</div>
                                                <div className="text-xs font-medium text-[#78716c] leading-tight">{r.passiveDesc ?? '—'}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onActivatePower}
                                            className={`w-full ${rTheme.btn} text-white p-3 rounded-xl font-black flex items-center justify-between shadow-md active:scale-95 transition-all`}
                                        >
                                            <span className="text-left leading-tight text-xs">
                                                Poder Especial
                                                <br />
                                                <span className="text-[8px] uppercase opacity-80 font-bold">Cuesta {r.activeCost ?? 3} Tokens</span>
                                            </span>
                                            <Zap className="w-5 h-5 fill-current text-white/40" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>

                {/* ── FOOTER: Acciones Rápidas ── */}
                <footer className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t-4 border-[#e7e5e4] p-4 pb-8 flex gap-3 z-20">
                    <button
                        onClick={onDonate}
                        className="flex-1 bg-[#f5f5f4] border-4 border-[#e7e5e4] py-3 rounded-2xl font-black text-[#78716c] text-xs flex items-center justify-center gap-2 hover:bg-white transition-colors active:scale-95"
                    >
                        <HeartHandshake className="w-5 h-5" /> Donar ET
                    </button>
                    <button
                        onClick={onChat}
                        className="flex-1 bg-[#1c1917] text-white border-4 border-[#1c1917] py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                    >
                        <Send className="w-5 h-5" /> Chat
                    </button>
                </footer>
            </div>
        </div>
    );
}
