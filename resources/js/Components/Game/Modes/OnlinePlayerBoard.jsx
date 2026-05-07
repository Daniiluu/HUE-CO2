import React, { useState, useEffect } from 'react';
import OrbitalBoard from '../UI/OrbitalBoard';
import GlobalThermometer from '../UI/GlobalThermometer';
import ChallengeCard from '../UI/ChallengeCard';
import { useGame } from '../Core/GameProvider';
import { useGameChannel } from '../../../hooks/useGameChannel';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Send, CheckCircle2, Users, Cpu, Shirt, FlaskConical, Tractor, Landmark, Hexagon, Clock, LogOut, Zap, X } from 'lucide-react';

const figmaColors = {
    'ciencia':    { bg: 'bg-[#DEB8FF]', border: 'border-[#9640FF]', shadow: 'shadow-[0px_4px_0px_0px_rgba(150,64,255,1.0)]', textTitle: 'text-purple-700', iconClass: 'text-[#9640FF]' },
    'primario':   { bg: 'bg-[#E2F1C3]', border: 'border-[#658437]', shadow: 'shadow-[0px_4px_0px_0px_rgba(101,132,55,1.0)]',  textTitle: 'text-lime-700',   iconClass: 'text-[#658437]'  },
    'publico':    { bg: 'bg-[#FFC2C2]', border: 'border-[#D00000]', shadow: 'shadow-[0px_4px_0px_0px_rgba(208,0,0,1.0)]',     textTitle: 'text-red-700',    iconClass: 'text-[#D00000]'  },
    'tech':       { bg: 'bg-[#D6D5FF]', border: 'border-[#4340FF]', shadow: 'shadow-[0px_4px_0px_0px_rgba(67,64,255,1.0)]',   textTitle: 'text-indigo-600', iconClass: 'text-[#4340FF]'  },
    'textil':     { bg: 'bg-[#FFE4C4]', border: 'border-[#FFA340]', shadow: 'shadow-[0px_4px_0px_0px_rgba(255,163,64,1.0)]',  textTitle: 'text-orange-500', iconClass: 'text-[#FFA340]'  },
    'ciudadania': { bg: 'bg-[#FFC9F2]', border: 'border-[#FF3ADB]', shadow: 'shadow-[0px_4px_0px_0px_rgba(255,58,219,1.0)]',  textTitle: 'text-fuchsia-600',iconClass: 'text-[#FF3ADB]'  },
};

const getRoleIcon = (iconName, id) => {
    if (id === 'tech')     return <Cpu       className="w-full h-full" strokeWidth={2.5} />;
    if (id === 'primario') return <Tractor   className="w-full h-full" strokeWidth={2.5} />;
    if (id === 'publico')  return <Landmark  className="w-full h-full" strokeWidth={2.5} />;
    switch (iconName) {
        case 'Shirt':        return <Shirt        className="w-full h-full" strokeWidth={2.5} />;
        case 'FlaskConical': return <FlaskConical className="w-full h-full" strokeWidth={2.5} />;
        case 'Users':        return <Users        className="w-full h-full" strokeWidth={2.5} />;
        default:             return <Hexagon      className="w-full h-full" strokeWidth={2.5} />;
    }
};

export default function OnlinePlayerBoard({ sectors, challenge, roomCode, myRoles = [], myParticipantId }) {
    const { timeLeft, intensity, setIntensity, setTimeLeft, setIsPaused } = useGame();
    
    // 1. Identificar cuáles de los sectores me pertenecen
    const myAssignedRoles = sectors.filter(s => 
        myRoles.some(mr => mr.id === s.id) || (s.playerName === 'Anfitrión' && myRoles.length === 0)
    );

    // 2. Determinar quién tiene el turno en el servidor
    const [activeChallenge, setActiveChallenge] = useState(challenge);
    const activeSectorInChallenge = sectors.find(s => s.id === activeChallenge?.activeSectorId);
    
    // 3. ¿Es mi turno? (Cualquiera de mis roles coincide con el sector activo)
    const isMyTurn = myRoles.some(r => r.id === activeChallenge?.activeSectorId);
    const activePlayerName = activeSectorInChallenge?.playerName || 'otro jugador';

    // 4. Identidad visual dinámica
    const currentDisplayRole = isMyTurn ? activeSectorInChallenge : (myAssignedRoles[0] || sectors[0]);
    const theme = figmaColors[currentDisplayRole?.id] || figmaColors['tech'];

    // 5. Conexión WebSocket
    const { isConnected, gameState: serverGameState, chatMessages: serverChat, sendChatMessage } = useGameChannel(roomCode, 'player', currentDisplayRole?.playerName);

    // 6. Estados de juego
    const [localMessages, setLocalMessages] = useState([{ id: 1, user: 'Sistema', text: '¡Conexión establecida!', type: 'system' }]);
    const [chatInput, setChatInput] = useState('');
    const [hasVoted, setHasVoted] = useState(false);
    const [lastFeedback, setLastFeedback] = useState(null);

    // Combinar mensajes locales y del servidor
    const allMessages = [...localMessages, ...serverChat].sort((a, b) => a.id - b.id);

    // Sincronización del reto y pausa en Lobby
    useEffect(() => {
        if (serverGameState?.challenge) {
            setActiveChallenge(serverGameState.challenge);
            if (serverGameState.challenge.time) setTimeLeft(serverGameState.challenge.time);
        }
    }, [serverGameState?.challenge]);

    useEffect(() => {
        if (serverGameState?.state === 'lobby') {
            setIsPaused(true);
            setTimeLeft(0); 
        } else {
            setIsPaused(false);
        }
    }, [serverGameState?.state]);

    useEffect(() => {
        if (activeChallenge?.id) {
            setHasVoted(false);
            setLastFeedback(null);
        }
    }, [activeChallenge?.id]);

    const sendMessage = () => {
        if (!chatInput.trim()) return;
        sendChatMessage(chatInput);
        setChatInput('');
    };

    const handleVote = async (answer) => {
        if (hasVoted || !isMyTurn) return;

        let cleanAnswer = answer;
        if (answer && typeof answer === 'object' && answer.target) {
            cleanAnswer = answer.target.value || answer.target.innerText;
        }

        try {
            const response = await axios.post(`/api/game/${roomCode}/vote`, {
                sector_id: activeChallenge?.activeSectorId,
                player_name: currentDisplayRole?.playerName || 'Jugador Online',
                answer: cleanAnswer,
                type: activeChallenge?.type || 'options',
                participant_id: myParticipantId 
            });
            
            setHasVoted(true);
            setLastFeedback(response.data.is_correct);
            setLocalMessages(prev => [...prev, { id: Date.now(), user: 'Sistema', text: response.data.feedback || '¡Voto registrado!', type: 'system' }]);
        } catch (error) {
            console.error("[HUE-CO2] Error al enviar respuesta:", error);
        }
    };

    if (serverGameState?.state === 'lobby' || !activeChallenge) {
        return (
            <div className="h-screen w-full bg-stone-50 flex flex-col items-center justify-center font-sans p-10">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[4rem] border-4 border-stone-200 shadow-2xl text-center max-w-md w-full">
                    <Clock className="w-12 h-12 text-[#87AF4C] animate-spin mx-auto mb-8" />
                    <h2 className="text-4xl font-black text-stone-900 mb-4 tracking-tighter">¡Dentro!</h2>
                    <p className="text-stone-500 font-bold text-lg leading-snug">Esperando al anfitrión...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-[#f8fafc] flex flex-col font-sans overflow-hidden relative">
            <AnimatePresence>
                {hasVoted && lastFeedback !== null && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] bg-white border-2 border-slate-200 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lastFeedback ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {lastFeedback ? <CheckCircle2 size={24} /> : <X size={24} />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Resultado</span>
                            <span className="text-lg font-black text-slate-900 leading-tight">{lastFeedback ? '¡Acierto!' : '¡Fallo!'}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="pt-4 lg:pt-6 px-8 w-full max-w-[1750px] mx-auto z-50">
                <div className="flex items-end justify-between mb-2">
                    <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-sm border border-white/50 flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-black text-slate-400 tracking-[0.3em] uppercase">SALA: {roomCode}</span>
                    </div>
                    <div className="flex items-center gap-4 bg-white/90 backdrop-blur-md px-6 py-2.5 rounded-2xl shadow-sm border border-white/50">
                        <Clock className="w-6 h-6 text-slate-300" />
                        <span className={`font-black text-3xl tabular-nums ${timeLeft < 30 ? 'text-rose-500 animate-pulse' : 'text-slate-800'}`}>
                            {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full max-w-[1750px] mx-auto px-8 relative z-10">
                <div className="flex items-center justify-between gap-6 h-full overflow-hidden">
                    <GlobalThermometer temperature={intensity} />
                    <OrbitalBoard sectors={sectors} activeSectorId={activeChallenge?.activeSectorId} />
                    <div className="relative">
                        <ChallengeCard
                            challenge={activeChallenge}
                            intensity={intensity}
                            setIntensity={setIntensity}
                            onApply={handleVote}
                            sectorColor={currentDisplayRole?.color || 'blue'}
                            isCompact={true}
                            readOnly={hasVoted || !isMyTurn}
                        />
                        {!isMyTurn && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-6 left-0 right-0 text-center">
                                <span className="bg-[#1c1917] text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                                    <Users size={12} className="text-[#87AF4C]" /> Turno de: {activePlayerName}
                                </span>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            <footer className="w-full bg-slate-100 border-t border-slate-200 flex items-center h-[140px] px-4 gap-3">
                {/* Tus Roles */}
                <div className="flex gap-2 overflow-x-auto h-full py-3 scrollbar-hide">
                    {myAssignedRoles.map(role => (
                        <div key={role.id} className={`flex items-center gap-3 px-4 py-2 rounded-2xl border-2 transition-all min-w-[180px]
                            ${role.id === activeChallenge?.activeSectorId ? 'bg-white border-[#87AF4C] shadow-lg scale-105 z-10' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                            <div className={`w-10 h-10 p-2 rounded-xl bg-white shadow-sm ${figmaColors[role.id]?.iconClass}`}>
                                {getRoleIcon(role.iconName, role.id)}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tu Sector</span>
                                <span className="text-[11px] font-black uppercase truncate text-slate-700">{role.name}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chat */}
                <div className="flex-1 flex flex-col justify-between py-3 px-4 bg-white rounded-2xl shadow-sm border border-slate-100 h-full">
                    <div className="flex-1 overflow-y-auto space-y-1 mb-2 text-[11px]">
                        {allMessages.slice(-3).map(msg => (
                            <div key={msg.id} className={msg.type === 'system' ? 'text-slate-400 italic' : 'text-slate-700'}>
                                {msg.type !== 'system' && <span className="font-black text-blue-600 mr-1.5">{msg.user}:</span>}
                                {msg.text}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Escribe al equipo..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-400" />
                        <button onClick={sendMessage} className="bg-blue-600 text-white px-3 py-2 rounded-xl"><Send size={14} /></button>
                    </div>
                </div>

                {/* Monitoreo Global */}
                <div className="flex flex-col justify-between py-3 px-5 w-[280px] bg-white rounded-2xl shadow-sm border border-slate-100 h-full">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Estado Global
                    </div>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                        {sectors.map(role => (
                            <div key={role.id} className={`flex items-center justify-center p-2 rounded-xl border-2 transition-all 
                                ${role.id === activeChallenge?.activeSectorId ? 'bg-amber-50 border-amber-400 animate-pulse' : 'bg-slate-50 border-slate-100'}`}>
                                <div className={`w-5 h-5 ${role.id === activeChallenge?.activeSectorId ? 'text-amber-600' : 'text-slate-300'}`}>
                                    {getRoleIcon(role.iconName, role.id)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
}
