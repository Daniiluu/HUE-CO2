import { useState, useEffect, useMemo } from 'react';
import { useGame } from '../Components/Game/Core/GameProvider';
import { useGameChannel } from './useGameChannel';
import axios from 'axios';

/**
 * Hook para centralizar la lógica de estado y sincronización multijugador
 */
export function useOnlineGameState(roomCode, myPlayerName, initialChallenge, sectors, myParticipantId) {
    const { setTimeLeft, setIsPaused } = useGame();
    console.log("[HUE-CO2] Hook cargado. setTimeLeft disponible:", typeof setTimeLeft === 'function');
    
    // 1. Conexión WebSocket
    const { isConnected, gameState: serverGameState, chatMessages: serverChat, sendChatMessage } = useGameChannel(roomCode, 'player', myPlayerName);
    
    // 2. Estados locales de votación
    const [votedChallengeId, setVotedChallengeId] = useState(null);
    const [lastFeedback, setLastFeedback] = useState(null);
    const [localMessages, setLocalMessages] = useState([{ id: 1, user: 'Sistema', text: '¡Conexión establecida!', type: 'system' }]);
    const [isSending, setIsSending] = useState(false);

    // 3. Cálculos derivados (Memoized para rendimiento)
    const currentChallenge = useMemo(() => serverGameState?.challenge || initialChallenge, [serverGameState?.challenge, initialChallenge]);
    
    const normalize = (str) => str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() || "";

    const activeSectorInChallenge = useMemo(() => 
        sectors.find(s => s.id === currentChallenge?.activeSectorId),
    [sectors, currentChallenge?.activeSectorId]);

    const activePlayerNameRaw = activeSectorInChallenge?.playerName || '';
    
    const isMyTurn = useMemo(() => (
        normalize(activePlayerNameRaw) === normalize(myPlayerName) ||
        (normalize(myPlayerName) === 'anfitrion' && normalize(activePlayerNameRaw) === 'anfitrion')
    ), [activePlayerNameRaw, myPlayerName]);

    const myAssignedRoles = useMemo(() => sectors.filter(s => 
        normalize(s.playerName) === normalize(myPlayerName) || 
        (normalize(myPlayerName) === 'anfitrion' && normalize(s.playerName) === 'anfitrion')
    ), [sectors, myPlayerName]);

    const hasVoted = votedChallengeId === currentChallenge?.id;

    // 4. Efectos de sincronización
    useEffect(() => {
        const state = serverGameState?.state;
        
        if (state === 'challenge' || state === 'playing') {
            setIsPaused(false);
            // Resetear el reloj con el tiempo de la carta (siempre, no solo si existe)
            setTimeLeft(serverGameState?.challenge?.time ?? 30);
        } else if (state === 'results' || state === 'lobby') {
            setIsPaused(true);
        }

        // Auto-avance desde Resultados al siguiente Reto (Solo modo Online puro)
        if (state === 'results' && !roomCode.startsWith('LOCAL_')) {
            // El anfitrión se encarga de avanzar tras 4 segundos de feedback
            if (normalize(myPlayerName) === 'anfitrion') {
                const timer = setTimeout(() => {
                    console.log("[HUE-CO2] Auto-avanzando desde Resultados...");
                    axios.post(`/api/game/${roomCode}/advance`).catch(e => console.error(e));
                }, 4500);
                return () => clearTimeout(timer);
            }
        }
    }, [currentChallenge?.id, serverGameState?.state, myPlayerName, roomCode]);

    // Resetear estados locales cuando cambia el reto O el turno
    useEffect(() => {
        if (currentChallenge?.id || serverGameState?.turnNumber) {
            setVotedChallengeId(null);
            setLastFeedback(null);
            setIsSending(false);
        }
    }, [currentChallenge?.id, serverGameState?.turnNumber]);

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
            const response = await axios.post(`/api/game/${roomCode}/vote`, {
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
                    axios.post(`/api/game/${roomCode}/advance`).catch(e => console.error(e));
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
        resetMando
    };
}
