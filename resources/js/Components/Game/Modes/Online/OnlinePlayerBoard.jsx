import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, Users, Cpu, Shirt, FlaskConical, Tractor, Landmark, Hexagon, Clock, LogOut, X } from 'lucide-react';
import { useGame } from '../../Core/GameProvider';
import { useOnlineGameState } from '../../../../hooks/useOnlineGameState';
import ChallengeCard from '../../UI/ChallengeCard';
import GlobalThermometer from '../../UI/GlobalThermometer';
import OrbitalBoard from '../../UI/OrbitalBoard';
import GameClock from '../../UI/GameClock';
import { ROLES } from '../../../../data/gameData';
import { Sparkles, Info, Zap as ZapIcon } from 'lucide-react';
import FeedbackOverlay from '../../UI/FeedbackOverlay';
import { usePage } from '@inertiajs/react';

const figmaColors = {
    'ciencia':    { bg: 'bg-[#DEB8FF]', border: 'border-[#9640FF]', iconClass: 'text-[#9640FF]' },
    'primario':   { bg: 'bg-[#E2F1C3]', border: 'border-[#658437]', iconClass: 'text-[#658437]' },
    'legislativo': { bg: 'bg-[#FFC2C2]', border: 'border-[#D00000]', iconClass: 'text-[#D00000]' },
    'tech':       { bg: 'bg-[#D6D5FF]', border: 'border-[#4340FF]', iconClass: 'text-[#4340FF]' },
    'textil':     { bg: 'bg-[#FFE4C4]', border: 'border-[#FFA340]', iconClass: 'text-[#FFA340]' },
    'ciudadania': { bg: 'bg-[#FFC9F2]', border: 'border-[#FF3ADB]', iconClass: 'text-[#FF3ADB]' },
};

const getRoleIcon = (iconName, id) => {
    const icons = {
        tech: <Cpu className="w-full h-full" strokeWidth={2.5} />,
        primario: <Tractor className="w-full h-full" strokeWidth={2.5} />,
        legislativo: <Landmark className="w-full h-full" strokeWidth={2.5} />,
        Shirt: <Shirt className="w-full h-full" strokeWidth={2.5} />,
        FlaskConical: <FlaskConical className="w-full h-full" strokeWidth={2.5} />,
        Users: <Users className="w-full h-full" strokeWidth={2.5} />,
    };
    return icons[id] || icons[iconName] || <Hexagon className="w-full h-full" strokeWidth={2.5} />;
};

export default function OnlinePlayerBoard({ 
    sectors, 
    challenge, 
    roomCode, 
    myParticipantId, 
    myPlayerName, 
    turnNumber, 
    myRoles = [], 
    visualPhase = 1, 
    initialTimeLeft = 45,
    isHost = false
}) {
    const { props } = usePage();
    const { intensity, setIntensity, timeLeft } = useGame();
    const [chatInput, setChatInput] = useState('');

    // --- Lógica Fragmentada (Hook Personalizado) ---
    const {
        isConnected, serverGameState, currentChallenge, isMyTurn, hasVoted,
        myAssignedRoles, activePlayerName, lastFeedback, setLastFeedback,
        lastMessage, serverChat, localMessages, setLocalMessages, sendChatMessage,
        handleVote, handleProposal, resetMando, isActivePlayerInactive, useAbility
    } = useOnlineGameState(roomCode, myPlayerName, challenge, sectors, myParticipantId, initialTimeLeft);


    // Calcular el turno relativo (1-6) dentro del anillo actual
    const relativeTurn = ((turnNumber - 1) % 6) + 1;
    const challengeWithTurn = {
        ...currentChallenge,
        turn: `${relativeTurn} / 6`,
        ring: currentChallenge?.ring || serverGameState?.challenge?.ring || 'Anillo Actual',
        anillo_id: currentChallenge?.anillo_id || serverGameState?.anillo_id || serverGameState?.challenge?.anillo_id || 1
    };

    const allMessages = [...localMessages, ...serverChat].sort((a, b) => a.id - b.id);

    // Efecto visual para el feedback
    useEffect(() => {
        if (lastFeedback !== null) {
            const timer = setTimeout(() => setLastFeedback(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [lastFeedback]);

    // Sincronizar temperatura global desde el servidor
    useEffect(() => {
        if (serverGameState?.temperature !== undefined) {
            setIntensity(serverGameState.temperature);
        }
    }, [serverGameState?.temperature]);

    if (serverGameState?.state === 'lobby' || !currentChallenge) {
        return <LobbyWaitingScreen roomCode={roomCode} />;
    }

    const currentDisplayRole = isMyTurn ? sectors.find(s => s.id === currentChallenge?.activeSectorId) : (myAssignedRoles[0] || sectors[0]);
    const theme = figmaColors[currentDisplayRole?.id] || figmaColors['tech'];

    return (
        <div className="h-screen w-full bg-[#f8fafc] flex flex-col font-sans overflow-hidden relative">
            <AnimatePresence>
                {(hasVoted || serverGameState?.state === 'results') && lastFeedback !== null && (
                    <FeedbackOverlay isCorrect={lastFeedback} message={lastMessage} />
                )}
            </AnimatePresence>


            {/* HEADER */}
            <header className="relative flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 z-50">
                <div className="flex items-center gap-4">
                    <div className="bg-[#87AF4C]/10 text-[#87AF4C] px-4 py-2 rounded-2xl flex items-center gap-2 border border-[#87AF4C]/20">
                        <div className="w-2 h-2 rounded-full bg-[#87AF4C] animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest">Sala: {roomCode}</span>
                    </div>
                </div>

                {/* Turno de Jugador en el centro */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#1c1917] text-white shadow-md border border-stone-850"
                    >
                        <div className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-amber-400 animate-ping' : 'bg-[#87AF4C]'}`} />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            {isMyTurn ? (
                                <span className="text-amber-400">🚨 ¡Es tu turno de responder!</span>
                            ) : (
                                <>
                                    <span className="text-stone-400">Turno de:</span>
                                    <span className="text-[#87AF4C]">{activePlayerName || '---'}</span>
                                </>
                            )}
                        </span>
                    </motion.div>
                </div>

                <div className="flex items-center gap-6">
                    <GameClock 
                        isActive={(currentChallenge?.type === 'validate' ? !isMyTurn : isMyTurn) && !hasVoted && serverGameState?.state === 'challenge'} 
                        onTimeout={() => handleVote(null)} 
                    />

                    <button 
                        onClick={() => {
                            if (window.confirm("¿Seguro que deseas salir de la partida? Perderás todo el progreso actual.")) {
                                if (props.auth?.user) {
                                    window.location.href = '/dashboard';
                                } else {
                                    window.location.href = '/jugar';
                                }
                            }
                        }} 
                        className="p-3 rounded-2xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 min-h-0 w-full max-w-[1750px] mx-auto px-8 relative z-10 flex items-center justify-between gap-6">
                <GlobalThermometer temperature={serverGameState?.temperature ?? 0} />
                {/* Tablero Orbital - Sincronizado con el servidor */}
                <OrbitalBoard 
                    sectors={sectors.map(s => {
                        const serverSector = (serverGameState?.sectors || []).find(ss => ss.id === s.id);
                        return {
                            ...s,
                            tokens: serverSector?.tokens ?? s.tokens,
                            points: serverSector?.points ?? s.points,
                            ringResults: serverSector?.ringResults ?? [],
                            isInactive: serverSector?.isInactive ?? false
                        };
                    })} 
                    activeSectorId={currentChallenge?.activeSectorId} 
                    visualPhase={currentChallenge?.visual_phase || visualPhase}
                />
                
                <div className="relative">
                    <ChallengeCard
                        challenge={challengeWithTurn}
                        intensity={intensity}
                        setIntensity={setIntensity}
                        onApply={handleVote}
                        sectorColor={currentDisplayRole?.color || 'blue'}
                        isCompact={true}
                        isOnline={true}
                        onProposal={handleProposal}
                        readOnly={hasVoted || (() => {
                            const type = currentChallenge?.type;
                            // Para preguntas abiertas (free/open): el activo responde en voz alta
                            // → readOnly=false para el activo (escribe), true para los demás (esperan)
                            if (type === 'free' || type === 'open') return !isMyTurn;
                            // Para validación de propuesta: el activo NO vota, los demás sí
                            if (type === 'validate') return isMyTurn;
                            // Para options/slider: solo el activo puede interactuar
                            return !isMyTurn;
                        })()}
                    />
                    {/* El indicador de turno ha sido movido al Header para liberar espacio visual */}
                </div>
            </main>

            {/* FOOTER & CHAT */}
            <footer className="w-full bg-slate-100 border-t border-slate-200 flex items-center h-[140px] px-4 gap-3">
                <RoleInventory roles={myAssignedRoles} activeSectorId={currentChallenge?.activeSectorId} onUseAbility={useAbility} isMyTurn={isMyTurn} />
                <GameChat 
                    messages={allMessages} 
                    value={chatInput} 
                    onChange={setChatInput} 
                    onSend={() => { sendChatMessage(chatInput); setChatInput(''); }} 
                />
            </footer>
        </div>
    );
}

// --- SUB-COMPONENTES (Para mayor orden) ---

function LobbyWaitingScreen({ roomCode }) {
    return (
        <div className="h-screen w-full bg-stone-50 flex flex-col items-center justify-center p-10 text-center">
            <Clock className="w-12 h-12 text-[#87AF4C] animate-spin mb-8" />
            <h2 className="text-4xl font-black text-stone-900 mb-4 tracking-tighter">¡Dentro!</h2>
            <p className="text-stone-500 font-medium">Esperando a que el anfitrión inicie la partida...</p>
            <div className="mt-8 bg-white px-6 py-3 rounded-2xl border-2 border-stone-200 font-bold text-stone-400 uppercase tracking-widest text-xs">
                SALA: {roomCode}
            </div>
        </div>
    );
}

// TurnIndicator eliminado (ahora integrado en el GameHeader centralizado)

function RoleInventory({ roles, activeSectorId, onUseAbility, isMyTurn }) {
    return (
        <div className="flex gap-2 overflow-x-auto h-full py-3 scrollbar-hide flex-1">
            {roles.map(role => {
                const canAfford = (role.tokens ?? 12) >= (role.activeCost ?? 99);
                const canUse = canAfford && isMyTurn;
                return (
                    <div key={role.id} className={`flex flex-col gap-2 px-4 py-2 rounded-2xl border-2 transition-all min-w-[220px] ${role.id === activeSectorId ? 'bg-white border-[#87AF4C] shadow-lg scale-105 z-10' : 'bg-slate-50 border-slate-200 opacity-90'}`}>
                        <div className="flex items-center gap-3 w-full">
                            <div className={`w-10 h-10 p-2 rounded-xl bg-white shadow-sm flex items-center justify-center ${figmaColors[role.id]?.iconClass}`}>
                                {getRoleIcon(role.iconName, role.id)}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tu Sector</span>
                                <span className="text-[11px] font-black uppercase truncate text-slate-700">{role.name}</span>
                            </div>
                            {/* EcoTokens Counter Badge */}
                            <div className="bg-[#1c1917] text-white px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm shrink-0">
                                <ZapIcon className="w-3.5 h-3.5 fill-current text-amber-400" />
                                <span className="font-black text-xs">{role.tokens ?? 12}</span>
                            </div>
                        </div>
                        {/* Botón de Habilidad */}
                        <button 
                            onClick={() => canUse && onUseAbility(role.id)}
                            disabled={!canUse}
                            title={!isMyTurn ? 'Solo puedes usar habilidades en tu turno' : role.activeDesc}
                            className={`mt-auto w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all ${
                                canUse 
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 hover:scale-[1.02] active:scale-95 shadow-sm' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <Sparkles size={10} /> 
                            {role.activeDesc?.split(':')[0] || 'Habilidad'} ({role.activeCost} ET)
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

function GameChat({ messages, value, onChange, onSend }) {
    return (
        <div className="w-[400px] h-full flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide flex flex-col-reverse">
                {[...messages].reverse().map((msg, i) => (
                    <div key={i} className={`p-2 rounded-xl text-[10px] ${msg.type === 'system' ? 'bg-slate-50 text-slate-500 italic' : 'bg-blue-50 text-blue-700'}`}>
                        <span className="font-black uppercase mr-1">{msg.user}:</span> {msg.text}
                    </div>
                ))}
            </div>
            <div className="p-2 border-t border-slate-100 flex gap-2">
                <input type="text" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSend()} placeholder="Escribe al equipo..." className="flex-1 bg-slate-50 border-none rounded-xl text-xs px-3 py-2 focus:ring-2 focus:ring-[#87AF4C]" />
                <button onClick={onSend} className="p-2 bg-[#87AF4C] text-white rounded-xl hover:scale-105 transition-transform"><Send size={14} /></button>
            </div>
        </div>
    );
}
