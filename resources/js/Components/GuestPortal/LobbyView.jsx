import React, { useState, useEffect } from 'react';
import { ChevronLeft, User, Play, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

export function LobbyView({ mode, onBack, onStartGame, selectedPlayers, setSelectedPlayers, roomCode, isHost = false }) {
    console.log('[HUE-CO2] LobbyView Render Props:', { mode, roomCode, selectedPlayers });

    const safeRoomCode = String(roomCode || "").replace(/\s/g, '');
    const [connectedPlayers, setConnectedPlayers] = useState([]);

    useEffect(() => {
        if (!safeRoomCode || safeRoomCode.startsWith('LOCAL_')) return;
        
        console.log(`[HUE-CO2] Inicializando Lobby para sala: ${safeRoomCode}`);

        // Cargar jugadores que ya estén en la sala
        const fetchPlayers = async () => {
            try {
                const res = await axios.get(`/api/juego/${safeRoomCode}/estado`);
                console.log('[HUE-CO2] Estado inicial recibido:', res.data);
                if (res.data && res.data.sectors) {
                    // Mapear a objetos {name, id} usando participantId
                    const players = res.data.sectors.map(s => ({
                        name: s.playerName,
                        id: s.participanteId
                    }));
                    // Filtrar duplicados por ID
                    const uniquePlayers = [];
                    const seenKeys = new Set();
                    players.forEach((p, idx) => {
                        // Usamos el ID si existe, si no, usamos el índice como clave única temporal
                        const key = p.id ? `id_${p.id}` : `idx_${idx}`;
                        if (!seenKeys.has(key)) {
                            seenKeys.add(key);
                            uniquePlayers.push(p);
                        }
                    });
                    setConnectedPlayers(uniquePlayers);
                }
            } catch (e) {
                console.error('[HUE-CO2] Error fetching players:', e);
            }
        };
        fetchPlayers();

        // Polling de seguridad cada 5 segundos (por si falla el WebSocket)
        const pollInterval = setInterval(fetchPlayers, 5000);

        // Escuchar nuevos jugadores (solo si Echo/Reverb está disponible)
        if (!window.Echo) {
            console.info('[HUE-CO2] Echo no disponible — lobby por polling.');
            return () => clearInterval(pollInterval);
        }

        const channelName = `game.${safeRoomCode}`;
        console.log(`[HUE-CO2] Escuchando canal: ${channelName}`);
        
        const channel = window.Echo.channel(channelName);
        channel.listen('.player.joined', (e) => {
            console.log('[HUE-CO2] Evento PlayerJoined recibido vía WS:', e);
            setConnectedPlayers(prev => {
                // Si el evento trae ID, verificamos duplicados por ID
                if (e.participanteId) {
                    if (prev.some(p => p.id === e.participanteId)) return prev;
                } else {
                    // Si no trae ID, verificamos por nombre como último recurso
                    if (prev.some(p => p.name === e.playerName)) return prev;
                }
                return [...prev, { name: e.playerName, id: e.participanteId }];
            });
        });

        return () => {
            console.log(`[HUE-CO2] Abandonando Lobby: ${safeRoomCode}`);
            clearInterval(pollInterval);
            window.Echo.leave(channelName);
        };
    }, [safeRoomCode]);

    const renderSoloLobby = () => (
        <div className="flex flex-col items-center text-center">
            <div className="bg-[#f0fdf4] border-4 border-[#16a34a] p-8 rounded-[3rem] shadow-xl mb-8 w-full">
                <div className="w-20 h-20 bg-[#16a34a] rounded-full mx-auto mb-4 flex items-center justify-center text-white border-4 border-white shadow-md">
                    <User className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black mb-2 text-stone-900">Líder Absoluto</h3>
                <p className="text-[#57534e] mb-6 font-medium text-sm">Controlarás los 6 sectores tú solo. Ideal para jugar en una sola pantalla.</p>
            </div>
            <button
                onClick={() => onStartGame({ mode: 'solo' })}
                className="w-full max-w-sm bg-[#1c1917] text-white py-5 rounded-[2rem] font-black text-xl shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-3"
            >
                ¡Empezar Partida! <Play className="w-6 h-6 fill-current" />
            </button>
        </div>
    );

    const renderSmallLobby = () => {
        const isReady = selectedPlayers && connectedPlayers.length >= selectedPlayers;
        
        return (
        <div className="flex flex-col items-center text-center">
            <h3 className="text-2xl font-black mb-6 text-stone-900">Grupo de 2 a 5 Jugadores</h3>
            <div className="grid grid-cols-2 gap-4 mb-8 w-full max-w-sm">
                {[2, 3, 4, 5].map(num => (
                    <button
                        key={num}
                        onClick={() => setSelectedPlayers(num)}
                        className={`border-4 p-6 rounded-3xl font-black text-2xl transition-all ${selectedPlayers === num
                            ? 'border-[#fb923c] bg-[#fff7ed] shadow-inner scale-95'
                            : 'bg-[#fdfcfb] border-[#e7e5e4] hover:border-[#fb923c] hover:bg-[#fff7ed]'
                            }`}
                    >
                        {num} <span className="text-sm block font-bold text-[#a8a29e] uppercase tracking-tighter">Jugadores</span>
                    </button>
                ))}
            </div>
            
            {selectedPlayers && (
                <div className="mb-6 w-full max-w-sm">
                    <div className="flex items-center justify-between bg-[#f5f5f4] p-4 rounded-2xl border-2 border-stone-200">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-stone-500" />
                            <span className="font-bold text-stone-600">Jugadores Conectados</span>
                        </div>
                        <div className="text-xl font-black">
                            <span className={connectedPlayers.length >= selectedPlayers ? "text-[#16a34a]" : "text-[#fb923c]"}>
                                {connectedPlayers.length}
                            </span>
                            <span className="text-stone-400"> / {selectedPlayers}</span>
                        </div>
                    </div>
                    {connectedPlayers.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 justify-center">
                            {connectedPlayers.map((player, i) => (
                                <span key={player.id || i} className="bg-stone-200 text-stone-700 px-3 py-1 rounded-full text-xs font-bold">{player.name}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {selectedPlayers && (
                <div className="mb-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-start gap-3 text-left max-w-sm">
                    <div className="bg-blue-500 text-white p-1 rounded-lg shrink-0">
                        <User className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] text-blue-800 font-bold leading-tight">
                        ANFITRIÓN: Recuerda que tú también debes conectarte con tu móvil usando el código de arriba para poder jugar y responder.
                    </p>
                </div>
            )}

            <p className="text-[#78716c] text-sm font-medium italic mb-8">Los 6 sectores se repartirán automáticamente entre vosotros.</p>

            {selectedPlayers && (
                <button
                    onClick={() => onStartGame({ players: selectedPlayers, mode: 'small' })}
                    disabled={!isReady}
                    className={`w-full max-w-sm text-white py-5 rounded-[2rem] font-black text-xl transition-all flex items-center justify-center gap-3
                        ${isReady 
                            ? 'bg-[#fb923c] shadow-[0_8px_0_0_#ea580c] hover:shadow-[0_4px_0_0_#ea580c] hover:translate-y-1 active:shadow-none active:translate-y-2' 
                            : 'bg-stone-300 shadow-none cursor-not-allowed opacity-50'}`}
                >
                    {isReady ? '¡Comenzar Partida!' : 'Esperando Jugadores...'} 
                    {isReady && <Play className="w-6 h-6 fill-current" />}
                </button>
            )}
        </div>
        );
    };

    return (
        <div className="w-full max-w-2xl bg-white border-4 border-[#e7e5e4] p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative transition-all duration-300">

            <button 
                onClick={onBack} 
                className="absolute top-8 left-8 text-[#a8a29e] hover:text-[#1c1917] flex items-center gap-1 font-bold text-sm bg-white p-2 rounded-xl z-10"
            >
                <ChevronLeft className="w-4 h-4" /> Atrás
            </button>
            <div className="mt-8">
                {safeRoomCode && (
                    <div className="mb-8 text-center bg-[#f5f5f4] p-6 rounded-3xl border-2 border-stone-200">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 mb-2">Código de Sala</p>
                        <div className="text-5xl font-black tracking-[0.2em] text-[#1c1917] flex justify-center gap-2">
                             {safeRoomCode.split('').map((char, i) => (
                                 <span key={i} className="bg-white px-2 py-1 rounded-lg shadow-sm border border-stone-100">{char}</span>
                             ))}
                        </div>
                    </div>
                )}
                {mode === 'solo' && renderSoloLobby()}
                {mode === 'small' && renderSmallLobby()}
                {(mode === 'classic' || mode === 'class') && (
                    <div className="flex flex-col items-center text-center">
                        <h3 className="text-2xl font-black mb-6 text-stone-900">
                            {mode === 'classic' ? 'Modo Clásico (6 Jugadores)' : 
                             mode === 'class' ? 'Modo Aula Completa' : 
                             'Pequeño Grupo'}
                        </h3>
                        
                        {/* Indicador de Estado */}
                        <div className="mb-8 w-full max-w-sm">
                            <div className="flex items-center justify-between bg-[#f0fdf4] p-5 rounded-3xl border-4 border-[#E3EFD2] shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <Users className="w-5 h-5 text-[#87AF4C]" />
                                    </div>
                                    <span className="font-black text-stone-700">Participantes</span>
                                </div>
                                <div className="text-2xl font-black text-stone-900">
                                    <span className="text-[#87AF4C]">{connectedPlayers.length}</span>
                                    <span className="text-stone-300"> / {mode === 'classic' ? 6 : (selectedPlayers || '?')}</span>
                                </div>
                            </div>
                            
                            {/* Lista de nombres conectados */}
                            <div className="flex flex-wrap gap-2 mt-4 justify-center">
                                {connectedPlayers.length > 0 ? (
                                    connectedPlayers.map((player, i) => (
                                        <motion.span 
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            key={player.id || i} 
                                            className="bg-white border-2 border-stone-100 text-stone-600 px-4 py-2 rounded-2xl text-xs font-black shadow-sm flex items-center gap-2"
                                        >
                                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                            {player.name} {i === 0 && <span className="text-[9px] text-stone-400 font-bold ml-1">(HOST)</span>}
                                        </motion.span>
                                    ))
                                ) : (
                                    <span className="text-stone-400 font-bold text-sm italic">Esperando conexiones...</span>
                                )}
                            </div>
                        </div>

                        <div className="mb-8 p-5 bg-amber-50 border-4 border-[#FEF3C7] rounded-3xl flex items-start gap-4 text-left max-w-sm">
                            <div className="bg-amber-400 text-white p-2 rounded-xl shrink-0 shadow-sm">
                                <Clock className="w-5 h-5" />
                            </div>
                            <p className="text-[12px] text-amber-900 font-bold leading-snug">
                                Comparte el código superior con los jugadores. En cuanto estéis listos, pulsa el botón para repartir sectores y empezar.
                            </p>
                        </div>

                        {isHost ? (
                            <button
                                onClick={() => onStartGame({ mode: mode, players: mode === 'classic' ? 6 : selectedPlayers })}
                                className={`w-full max-w-sm text-white py-5 rounded-[2.5rem] font-black text-xl transition-all flex items-center justify-center gap-3 shadow-lg
                                    ${connectedPlayers.length > 0 
                                        ? 'bg-[#1c1917] hover:scale-105 active:scale-95 shadow-stone-200' 
                                        : 'bg-stone-300 shadow-none cursor-not-allowed opacity-50'}`}
                            >
                                {connectedPlayers.length > 0 ? '¡Empezar Partida!' : 'Esperando Jugadores...'} 
                                {connectedPlayers.length > 0 && <Play className="w-6 h-6 fill-current text-emerald-400" />}
                            </button>
                        ) : (
                            <div className="w-full max-w-sm bg-stone-100 border-4 border-dashed border-stone-200 py-6 rounded-[2.5rem] flex flex-col items-center">
                                <Clock className="w-8 h-8 text-[#87AF4C] animate-spin mb-3" />
                                <span className="font-black text-stone-400 uppercase tracking-widest text-sm">Esperando al anfitrión...</span>
                            </div>
                        )}
                    </div>
                )}
                {!mode && (
                    <div className="text-center p-8 text-stone-400 italic">
                        Cargando configuración de sala...
                    </div>
                )}
            </div>
        </div>
    );
}
