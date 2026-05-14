import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';

/**
 * useGameChannel
 *
 * Hook central de comunicación WebSocket para HUE-CO2.
 * Encapsula toda la lógica de Laravel Echo / Reverb para que los
 * componentes solo tengan que llamar a funciones y leer estado.
 *
 * @param {string} roomCode   - Código de sala (ej: "TEST-772")
 * @param {string} sectorId   - ID del sector del jugador (ej: "ciudadania")
 * @param {string} playerName - Nombre del jugador
 *
 * @returns {{
 *   votes:         object,   // { [sectorId]: answer } — votos registrados
 *   proposal:      object|null, // { sectorId, playerName, proposalText }
 *   gameState:     object|null, // El último GameStateChanged recibido
 *   sendVote:      function,  // (answer, type) → POST al backend
 *   sendProposal:  function,  // (text) → POST al backend
 *   isConnected:   boolean,
 * }}
 */
export function useGameChannel(roomCode, sectorId, playerName, participanteId = null) {
    const cleanRoomCode = (roomCode || '').toString().replace(/\s/g, '');
    const channelRef = useRef(null);

    const [isConnected, setIsConnected]   = useState(false);
    const [votes, setVotes]               = useState({});   // { sectorId: answer }
    const [proposal, setProposal]         = useState(null); // La propuesta activa
    const [gameState, setGameState]       = useState(null); // Último estado del host
    const [chatMessages, setChatMessages] = useState([]);   // Historial de chat

    // ── Suscripción al canal ──────────────────────────────────────────────────
    useEffect(() => {
        if (!cleanRoomCode || !window.Echo) return;

        const channelName = `game.${cleanRoomCode}`;

        channelRef.current = window.Echo.channel(channelName)
            .listen('PlayerVoted', (e) => {
                setVotes(prev => ({ ...prev, [e.sectorId]: e.answer }));
            })
            .listen('ProposalSubmitted', (e) => {
                setProposal({
                    sectorId:    e.sectorId,
                    playerName:  e.playerName,
                    text:        e.proposalText,
                });
            })
            .listen('GameStateChanged', (e) => {
                setGameState(e);
                // Si el host cambia de reto, limpiar los votos anteriores
                if (e.state === 'challenge') {
                    setVotes({});
                    setProposal(null);
                }
            })
            .listen('ChatMessageReceived', (e) => {
                setChatMessages(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    user: e.playerName,
                    text: e.message,
                    type: e.playerName === 'Sistema' ? 'system' : 'user'
                }]);
            })
            .subscribed(() => {
                setIsConnected(true);
                console.log(`[HUE-CO2] Conectado al canal: ${channelName}`);
            })
            .error((error) => {
                console.error(`[HUE-CO2] Error en canal ${channelName}:`, error);
                setIsConnected(false);
            });

        return () => {
            if (window.Echo) {
                window.Echo.leave(channelName);
            }
            setIsConnected(false);
        };
    }, [cleanRoomCode]);

    // ── Heartbeat (Seguimiento de actividad) ──────────────────────────────────
    useEffect(() => {
        if (!cleanRoomCode || !participanteId || cleanRoomCode.startsWith('LOCAL_')) return;

        const sendHeartbeat = async () => {
            try {
                await axios.post(`/api/game/${cleanRoomCode}/heartbeat`, {
                    participante_id: participanteId
                });
            } catch (err) {
                console.warn('[HUE-CO2] Heartbeat failed');
            }
        };

        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, 10000);
        return () => clearInterval(interval);
    }, [cleanRoomCode, participanteId]);

    // ── Polling de respaldo (por si falla WebSockets) ─────────────────────────
    useEffect(() => {
        // No hacer polling si no hay código o si es una partida local (no persiste en BD)
        if (!cleanRoomCode || cleanRoomCode.startsWith('LOCAL_')) return;

        const fetchState = async () => {
            try {
                const res = await axios.get(`/api/juego/${cleanRoomCode}/estado`);
                if (res.data) {
                    setGameState(prev => {
                        // Solo actualizar si ha cambiado el estado, el reto o el turno
                        // Esto evita que se borre lo que el usuario está escribiendo si el estado es el mismo
                        if (!prev || 
                            prev.state !== res.data.state || 
                            prev.turnNumber !== res.data.turnNumber ||
                            (prev.challenge?.id !== res.data.challenge?.id)) {
                            
                            // Si cambió a challenge, limpiar los votos anteriores
                            if (res.data.state === 'challenge' && prev && prev.state !== 'challenge') {
                                setVotes({});
                                setProposal(null);
                            }

                            return {
                                state: res.data.state,
                                challenge: res.data.challenge,
                                turnNumber: res.data.turnNumber,
                                sectors: res.data.sectors,
                                temperature: res.data.temperature || 0,
                                totalHeating: res.data.totalHeating || 0,
                                totalReduction: res.data.totalReduction || 0,
                                lastTurnCorrect: res.data.lastTurnCorrect || false,
                                outcome: res.data.outcome || null,
                                hostId: res.data.hostId || null
                            };
                        }
                        // Aunque no haya cambiado el estado, siempre actualizar sectors y hostId
                        // para que isInactive e isActuallyHost sean siempre frescos
                        return {
                            ...prev,
                            sectors: res.data.sectors,
                            hostId: res.data.hostId || null
                        };
                    });
                }
            } catch (error) {
                console.error('[HUE-CO2] Error polling game state:', error);
            }
        };

        // Hacer un fetch inicial inmediatamente
        fetchState();

        // Luego cada 1 segundo para mayor inmediatez en el tablero
        const interval = setInterval(fetchState, 1000);

        return () => clearInterval(interval);
    }, [cleanRoomCode]);

    // ── Enviar Voto (MobileController → Backend → Reverb → LocalDisplayBoard) ──
    const sendVote = useCallback(async (answer, type = 'options', sectorIdOverride = null) => {
        const finalSectorId = sectorIdOverride || sectorId;
        if (!cleanRoomCode || !finalSectorId) return null;
        try {
            const res = await axios.post(`/api/game/${cleanRoomCode}/vote`, {
                sector_id:       finalSectorId,
                player_name:     playerName,
                participant_id:  participanteId,
                answer,
                type,
            });
            return res.data;
        } catch (err) {
            console.error('[HUE-CO2] Error al enviar voto:', err);
            return null;
        }
    }, [cleanRoomCode, sectorId, playerName, participanteId]);

    // ── Enviar Propuesta (Texto Libre) ────────────────────────────────────────
    const sendProposal = useCallback(async (text, sectorIdOverride = null) => {
        const finalSectorId = sectorIdOverride || sectorId;
        if (!cleanRoomCode || !finalSectorId || !text.trim()) return;
        try {
            await axios.post(`/api/game/${cleanRoomCode}/proposal`, {
                sector_id:       finalSectorId,
                player_name:     playerName,
                participant_id:  participanteId,
                proposal_text:   text,
            });
        } catch (err) {
            console.error('[HUE-CO2] Error al enviar propuesta:', err);
        }
    }, [cleanRoomCode, sectorId, playerName, participanteId]);
    
    const sendChatMessage = useCallback(async (text) => {
        if (!cleanRoomCode || !text.trim()) return;
        try {
            await axios.post(`/api/game/${cleanRoomCode}/chat`, {
                player_name: playerName,
                message:     text,
            });
        } catch (err) {
            console.error('[HUE-CO2] Error al enviar mensaje de chat:', err);
        }
    }, [cleanRoomCode, playerName]);

    return {
        isConnected,
        votes,
        proposal,
        gameState,
        chatMessages,
        sendVote,
        sendProposal,
        sendChatMessage,
    };
}
