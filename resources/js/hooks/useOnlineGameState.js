import { useState, useEffect, useMemo } from 'react';
import { useGame } from '../Components/Game/Core/GameProvider';
import { useGameChannel } from './useGameChannel';
import axios from 'axios';

/**
 * Hook para centralizar la lógica de estado y sincronización multijugador
 */
export function useOnlineGameState(roomCode, myPlayerName, initialChallenge, sectors, myParticipantId) {
    const { setTimeLeft, setIsPaused } = useGame();
    
    // 1. Conexión WebSocket
    const { isConnected, gameState: serverGameState, chatMessages: serverChat, sendChatMessage } = useGameChannel(roomCode, 'player', myPlayerName);
    
    // 2. Estados locales de votación
    const [votedChallengeId, setVotedChallengeId] = useState(null);
    const [lastFeedback, setLastFeedback] = useState(null);
    const [localMessages, setLocalMessages] = useState([{ id: 1, user: 'Sistema', text: '¡Conexión establecida!', type: 'system' }]);

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
        if (serverGameState?.challenge?.time) {
            setTimeLeft(serverGameState.challenge.time);
        }
    }, [currentChallenge?.id, serverGameState?.challenge?.time]);

    useEffect(() => {
        const isLobby = serverGameState?.state === 'lobby';
        setIsPaused(isLobby);
    }, [serverGameState?.state]);

    // 4.5 Auto-Fallo por Tiempo Agotado
    const { timeLeft } = useGame();
    useEffect(() => {
        if (timeLeft === 0 && serverGameState?.state !== 'lobby' && isMyTurn && !hasVoted) {
            console.log("[useOnlineGameState] Tiempo agotado. Enviando fallo automático...");
            handleVote(null);
        }
    }, [timeLeft, isMyTurn, hasVoted, serverGameState?.state]);

    // 5. Acciones
    const handleVote = async (answer) => {
        if (hasVoted || !isMyTurn) return;

        let cleanAnswer = answer;
        if (answer && typeof answer === 'object' && answer.target) {
            cleanAnswer = answer.target.value || answer.target.innerText;
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
            return response.data;
        } catch (error) {
            console.error("[useOnlineGameState] Error al votar:", error);
            throw error;
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
