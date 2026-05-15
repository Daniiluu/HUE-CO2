import { useState, useEffect, useMemo } from 'react';
import { useGame } from '../Components/Game/Core/GameProvider';
import { useGameChannel } from './useGameChannel';
import axios from 'axios';

/**
 * Hook para centralizar la lógica de estado y sincronización multijugador
 */
export function useOnlineGameState(roomCode, myPlayerName, initialChallenge, sectors, myParticipantId, initialTimeLeft = 30) {
    const { setTimeLeft, setIsPaused } = useGame();
    
    // Sincronizar tiempo inicial al montar (para late-joiners)
    useEffect(() => {
        if (initialTimeLeft !== undefined) {
            console.log("[HUE-CO2] Sincronizando tiempo inicial:", initialTimeLeft);
            setTimeLeft(initialTimeLeft);
        }
    }, []);

    console.log("[HUE-CO2] Hook cargado. setTimeLeft disponible:", typeof setTimeLeft === 'function');
    
    const cleanRoomCode = (roomCode || '').toString().replace(/\s/g, '');
    // 1. Conexión WebSocket
    const { isConnected, gameState: serverGameState, chatMessages: serverChat, sendChatMessage } = useGameChannel(cleanRoomCode, 'player', myPlayerName, myParticipantId);

    // 2. Estados locales de votación
    const [votedChallengeId, setVotedChallengeId] = useState(null);
    const [lastFeedback, setLastFeedback] = useState(null);
    const [localMessages, setLocalMessages] = useState([{ id: 1, user: 'Sistema', text: '¡Conexión establecida!', type: 'system' }]);
    const [isSending, setIsSending] = useState(false);

    // 3. Cálculos derivados (Memoized para rendimiento)
    const currentChallenge = useMemo(() => serverGameState?.challenge || initialChallenge, [serverGameState?.challenge, initialChallenge]);
    
    const normalize = (str) => str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() || "";

    // Sectores enriquecidos con datos frescos del servidor (isInactive, points, etc.)
    const liveSectors = useMemo(() => {
        const serverSectors = serverGameState?.sectors || [];
        return sectors.map(s => {
            const serverSector = serverSectors.find(ss => ss.id === s.id);
            return serverSector ? { ...s, ...serverSector } : s;
        });
    }, [sectors, serverGameState?.sectors]);

    const activeSectorInChallenge = useMemo(() => 
        liveSectors.find(s => s.id === currentChallenge?.activeSectorId),
    [liveSectors, currentChallenge?.activeSectorId]);

    const activePlayerNameRaw = activeSectorInChallenge?.playerName || '';
    const activeParticipanteId = activeSectorInChallenge?.participanteId;
    
    const isMyTurn = useMemo(() => {
        const activePID = Number(activeParticipanteId);
        const myPID = Number(myParticipantId);
        
        // 1. Prioridad absoluta al ID numérico (Evita colisiones de nombres como "Jugador" vs "Jugador")
        if (activePID && myPID) {
            return activePID === myPID;
        }
        
        // 2. Fallback por nombre normalizado (para anfitrión o casos donde el ID no llegó)
        const normalizedActive = normalize(activePlayerNameRaw);
        const normalizedMe = normalize(myPlayerName);
        
        if (!normalizedActive || !normalizedMe || normalizedActive === 'esperando...') return false;
        
        return (
            normalizedActive === normalizedMe ||
            (normalizedMe === 'anfitrion' && normalizedActive === 'anfitrion')
        );
    }, [activeParticipanteId, myParticipantId, activePlayerNameRaw, myPlayerName]);

    const myAssignedRoles = useMemo(() => {
        if (!sectors || sectors.length === 0) return [];
        
        return sectors.filter(s => {
            // Prioridad absoluta al ID único para evitar colisiones de nombres (admin vs admin)
            if (s.participanteId && myParticipantId) {
                return Number(s.participanteId) === Number(myParticipantId);
            }
            
            // Si hay IDs en el sector pero no coinciden con el mío, no es mi sector (punto)
            if (s.participanteId && !myParticipantId) return false;

            // Fallback por nombre solo si no hay IDs disponibles en absoluto (casos legacy)
            const sName = normalize(s.playerName);
            const myName = normalize(myPlayerName);
            
            if (sName === 'esperando...') return false;
            
            return sName === myName || (myName === 'anfitrion' && sName === 'anfitrion');
        });
    }, [sectors, myParticipantId, myPlayerName]);

    const hasVoted = votedChallengeId === currentChallenge?.id;

    const isActuallyHost = useMemo(() => {
        return serverGameState?.hostId === (Number(myParticipantId) || myParticipantId);
    }, [serverGameState?.hostId, myParticipantId]);

    // 4. Efectos de sincronización
    useEffect(() => {
        const state = serverGameState?.state;
        
        if (state === 'challenge' || state === 'playing') {
            setIsPaused(false);
            // Resetear el reloj con el tiempo de la carta
            if (serverGameState?.challenge?.time) {
                setTimeLeft(serverGameState.challenge.time);
            }
        } else if (state === 'results' || state === 'lobby') {
            setIsPaused(true);
        }

        // Auto-avance desde Resultados al siguiente Reto (Solo modo Online puro)
        if (state === 'results' && !roomCode.startsWith('LOCAL_')) {
            // El anfitrión se encarga de avanzar tras 4 segundos de feedback
            // Ahora usamos isActuallyHost que es más fiable que el nombre
            if (isActuallyHost || normalize(myPlayerName) === 'anfitrion') {
                const timer = setTimeout(() => {
                    console.log("[HUE-CO2] Auto-avanzando desde Resultados...");
                    axios.post(`/api/game/${cleanRoomCode}/advance`).catch(e => console.error(e));
                }, 4500);
                return () => clearTimeout(timer);
            }
        }
    }, [currentChallenge?.id, serverGameState?.state, myPlayerName, roomCode, isActuallyHost]);

    // Resetear estados locales cuando cambia el reto, el turno O el estado del juego
    useEffect(() => {
        if (currentChallenge?.id || serverGameState?.turnNumber || serverGameState?.state) {
            // Si el estado es 'challenge' o 'playing', nos aseguramos de que el mando esté limpio
            if (serverGameState?.state === 'challenge' || serverGameState?.state === 'playing') {
                setVotedChallengeId(null);
                setLastFeedback(null);
                setIsSending(false);
            }
        }
    }, [currentChallenge?.id, serverGameState?.turnNumber, serverGameState?.state]);

    // 5. Acciones
    const handleVote = async (answer) => {
        if (hasVoted || !isMyTurn || isSending) return;
        setIsSending(true);

        let cleanAnswer = answer;
        // Si el answer viene de un evento (e.g. onChange), extraemos el valor.
        // Pero si viene de un clic directo con el valor ya resuelto, lo usamos tal cual.
        if (answer && typeof answer === 'object' && answer.target && 'value' in answer.target) {
            cleanAnswer = answer.target.value;
        } else if (answer && typeof answer === 'object' && answer.target && 'innerText' in answer.target) {
            cleanAnswer = answer.target.innerText;
        }

        try {
            const response = await axios.post(`/api/game/${cleanRoomCode}/vote`, {
                sector_id: currentChallenge?.activeSectorId,
                player_name: myPlayerName || 'Jugador Online',
                answer: cleanAnswer,
                type: currentChallenge?.type || 'options',
                participant_id: myParticipantId 
            });
            
            setVotedChallengeId(currentChallenge?.id);
            setLastFeedback(response.data.is_correct);

            // Si es online puro (sin LocalDisplayBoard manejando el avance), avanzamos el turno.
            if (!roomCode.startsWith('LOCAL_')) {
                setTimeout(() => {
                    axios.post(`/api/game/${cleanRoomCode}/advance`).catch(e => console.error(e));
                }, 2500);
            }

            return response.data;
        } catch (error) {
            console.error("[useOnlineGameState] Error al votar:", error);
        } finally {
            setIsSending(false);
        }
    };

    const resetMando = () => {
        setVotedChallengeId(null);
        setLastFeedback(null);
    };

    return {
        isConnected,
        serverGameState,
        currentChallenge,
        isMyTurn,
        hasVoted,
        myAssignedRoles,
        activePlayerName: activePlayerNameRaw || 'esperando...',
        lastFeedback,
        setLastFeedback,
        serverChat,
        localMessages,
        setLocalMessages,
        sendChatMessage,
        handleVote,
        resetMando,
        isActivePlayerInactive: activeSectorInChallenge?.isInactive || false,
        isActuallyHost
    };
}
