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
export function useGameChannel(roomCode, sectorId, playerName, participantId = null) {
    const channelRef = useRef(null);

    const [isConnected, setIsConnected]   = useState(false);
    const [votes, setVotes]               = useState({});   // { sectorId: answer }
    const [proposal, setProposal]         = useState(null); // La propuesta activa
    const [gameState, setGameState]       = useState(null); // Último estado del host

    // ── Suscripción al canal ──────────────────────────────────────────────────
    useEffect(() => {
        if (!roomCode || !window.Echo) return;

        const channelName = `game.${roomCode}`;

        channelRef.current = window.Echo.channel(channelName)
            .listen('.player.voted', (e) => {
                setVotes(prev => ({ ...prev, [e.sectorId]: e.answer }));
            })
            .listen('.proposal.submitted', (e) => {
                setProposal({
                    sectorId:    e.sectorId,
                    playerName:  e.playerName,
                    text:        e.proposalText,
                });
            })
            .listen('.game.state.changed', (e) => {
                setGameState(e);
                // Si el host cambia de reto, limpiar los votos anteriores
                if (e.state === 'challenge') {
                    setVotes({});
                    setProposal(null);
                }
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
    }, [roomCode]);

    // ── Polling de respaldo (por si falla WebSockets) ─────────────────────────
    useEffect(() => {
        if (!roomCode) return;

        const fetchState = async () => {
            try {
                const res = await axios.get(`/api/juego/${roomCode}/estado`);
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
                                lastTurnCorrect: res.data.lastTurnCorrect || false
                            };
                        }
                        return prev;
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
    }, [roomCode]);

    // ── Enviar Voto (MobileController → Backend → Reverb → LocalDisplayBoard) ──
    const sendVote = useCallback(async (answer, type = 'options', sectorIdOverride = null) => {
        const finalSectorId = sectorIdOverride || sectorId;
        if (!roomCode || !finalSectorId) return;
        try {
            await axios.post(`/api/game/${roomCode}/vote`, {
                sector_id:       finalSectorId,
                player_name:     playerName,
                participant_id:  participantId,
                answer,
                type,
            });
        } catch (err) {
            console.error('[HUE-CO2] Error al enviar voto:', err);
        }
    }, [roomCode, sectorId, playerName, participantId]);

    // ── Enviar Propuesta (Texto Libre) ────────────────────────────────────────
    const sendProposal = useCallback(async (text, sectorIdOverride = null) => {
        const finalSectorId = sectorIdOverride || sectorId;
        if (!roomCode || !finalSectorId || !text.trim()) return;
        try {
            await axios.post(`/api/game/${roomCode}/proposal`, {
                sector_id:       finalSectorId,
                player_name:     playerName,
                participant_id:  participantId,
                proposal_text:   text,
            });
        } catch (err) {
            console.error('[HUE-CO2] Error al enviar propuesta:', err);
        }
    }, [roomCode, sectorId, playerName, participantId]);

    return {
        isConnected,
        votes,
        proposal,
        gameState,
        sendVote,
        sendProposal,
    };
}
