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

    const [isConnected, setIsConnected] = useState(false);
    const [votes, setVotes] = useState({});   // { sectorId: answer }
    const [proposal, setProposal] = useState(null); // La propuesta activa
    const [gameState, setGameState] = useState(null); // Último estado del host
    const [chatMessages, setChatMessages] = useState([]);   // Historial de chat

    // ── Suscripción al canal ──────────────────────────────────────────────────
    useEffect(() => {
        if (!cleanRoomCode || !window.Echo) return;

        const channelName = `game.${cleanRoomCode}`;

        channelRef.current = window.Echo.channel(channelName)
            .listen('PlayerVoted', (e) => {
                console.log(`[DEBUG-PERF] Recibido PlayerVoted de ${Array.isArray(e.sectorId) ? e.sectorId.join(',') : e.sectorId} (${e.playerName}) a las ${new Date().toLocaleTimeString()}.${new Date().getMilliseconds()}`);
                setVotes(prev => {
                    const newVotes = { ...prev };
                    if (Array.isArray(e.sectorId)) {
                        e.sectorId.forEach(id => newVotes[id] = e.answer);
                    } else {
                        newVotes[e.sectorId] = e.answer;
                    }
                    return newVotes;
                });
            })
            .listen('ProposalSubmitted', (e) => {
                const primarySectorId = Array.isArray(e.sectorId) ? e.sectorId[0] : e.sectorId;
                console.log(`[DEBUG-PERF] Recibida Propuesta de ${primarySectorId} a las ${new Date().toLocaleTimeString()}.${new Date().getMilliseconds()}`);
                setProposal({
                    sectorId: primarySectorId,
                    playerName: e.playerName,
                    text: e.proposalText,
                });
            })
            .listen('GameStateChanged', (e) => {
                const now = Date.now();
                const serverTimeMs = e.serverTime ? e.serverTime * 1000 : null;
                const latency = serverTimeMs ? (now - serverTimeMs).toFixed(0) : 'unknown';

                console.log(`[DEBUG-PERF] Recibido GameStateChanged: [${e.state}] a las ${new Date().toLocaleTimeString()}.${new Date().getMilliseconds()}. Latencia estimada: ${latency}ms`);

                setGameState(prev => {
                    // Si el turno ha avanzado, limpiar votos y propuestas inmediatamente
                    if (!prev || e.turnNumber !== prev.turnNumber || e.state === 'challenge') {
                        setVotes({});
                        setProposal(null);
                    }
                    return e;
                });
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

    // ── Polling de respaldo (Optimizado contra bucles y sobrecarga en Vaport) ──
    useEffect(() => {
        // No hacer polling si no hay código o si es una partida local (no persiste en BD)
        if (!cleanRoomCode || cleanRoomCode.startsWith('LOCAL_')) return;

        const fetchState = async () => {
            try {
                const res = await axios.get(`/api/juego/${cleanRoomCode}/estado`);
                if (res.data) {
                    setGameState(prev => {
                        // SEGURO 1: Bloqueo estricto de turnos pasados (Evita Race Conditions)
                        if (prev && res.data.turnNumber < prev.turnNumber) {
                            return prev;
                        }

                        // SEGURO 2: Si el Host ya avanzó localmente a 'challenge', 
                        // ignorar respuestas residuales de red que digan 'results' del mismo turno
                        if (prev && prev.state === 'challenge' && res.data.state === 'results' && res.data.turnNumber === prev.turnNumber) {
                            return prev;
                        }

                        // Comprobar si los datos críticos han cambiado
                        const hasChanged = !prev ||
                            prev.state !== res.data.state ||
                            prev.turnNumber !== res.data.turnNumber ||
                            (prev.challenge?.id !== res.data.challenge?.id);

                        if (hasChanged) {
                            console.log(`[DEBUG-POLLING] Sincronizando estado a [${res.data.state}] desde el Polling en el Turno ${res.data.turnNumber}`);

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
                                hostId: res.data.hostId || null,
                                timeLeft: res.data.timeLeft
                            };
                        }

                        // Si no hay cambios críticos, comparar los sectores (EcoFichas, puntos) o el tiempo restante
                        const sectorsChanged = JSON.stringify(prev.sectors) !== JSON.stringify(res.data.sectors);
                        const timeChanged = prev.timeLeft !== res.data.timeLeft;
                        if (sectorsChanged || timeChanged) {
                            return {
                                ...prev,
                                sectors: res.data.sectors,
                                hostId: res.data.hostId || null,
                                timeLeft: res.data.timeLeft
                            };
                        }

                        // Si absolutamente nada ha cambiado, devolver el mismo objeto 'prev'
                        return prev;
                    });
                }
            } catch (error) {
                console.error('[HUE-CO2] Error polling game state:', error);
            }
        };

        // Hacer un fetch inicial inmediatamente
        fetchState();

        // CONTROL DE REFRESCO OPTIMIZADO PARA ENTORNOS DE PRODUCCIÓN (Como Railway):
        // Si el WebSocket está conectado, el polling se dilata a 45s actuando como un latido pasivo de seguridad.
        // Si está desconectado, bajamos el delay a 2s (2000ms) para garantizar una sincronización fluida y en tiempo real sin latencias.
        const pollIntervalMs = isConnected ? 45000 : 2000;

        const interval = setInterval(() => {
            fetchState();
        }, pollIntervalMs);

        return () => clearInterval(interval);
    }, [cleanRoomCode, isConnected]); // Añadimos isConnected como dependencia para re-evaluar el intervalo

    // ── Enviar Voto (MobileController → Backend → Reverb → LocalDisplayBoard) ──
    const sendVote = useCallback(async (answer, type = 'options', sectorIdOverride = null) => {
        const finalSectorId = sectorIdOverride || sectorId;
        if (!cleanRoomCode || !finalSectorId) return null;
        try {
            const res = await axios.post(`/api/game/${cleanRoomCode}/vote`, {
                sector_id: finalSectorId,
                player_name: playerName,
                participant_id: participanteId,
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
                sector_id: finalSectorId,
                player_name: playerName,
                participant_id: participanteId,
                proposal_text: text,
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
                message: text,
            });
        } catch (err) {
            console.error('[HUE-CO2] Error al enviar mensaje de chat:', err);
        }
    }, [cleanRoomCode, playerName]);

    return {
        isConnected,
        votes,
        setVotes,       // Exponemos el limpiador de votos
        proposal,
        setProposal,    // Exponemos el limpiador de propuestas
        gameState,
        setGameState,   // ¡CRÍTICO! Exponemos el mutador de estado para la UI optimista
        chatMessages,
        sendVote,
        sendProposal,
        sendChatMessage,
    };
}
