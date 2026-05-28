import { useState, useEffect, useMemo } from 'react';
import { useGame } from '../Components/Game/Core/GameProvider';
import { useGameChannel } from './useGameChannel';
import axios from 'axios';

/**
 * Hook para centralizar la lógica de estado y sincronización multijugador
 */
export function useOnlineGameState(roomCode, myPlayerName, initialChallenge, sectors, myParticipantId, initialTimeLeft = 45) {
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
    
    const myAssignedRoles = useMemo(() => {
        if (!liveSectors || liveSectors.length === 0) return [];
        
        return liveSectors.filter(s => {
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
    }, [liveSectors, myParticipantId, myPlayerName]);

    const isMyTurn = useMemo(() => {
        // 1. Verificación por ID de participante (más segura)
        const activePID = Number(activeParticipanteId);
        const myPID = Number(myParticipantId);
        if (activePID && myPID && activePID === myPID) return true;

        // 2. Verificación por Rol/Sector (si yo tengo el sector que está activo, es mi turno)
        const myRoleSlugs = myAssignedRoles.map(r => r.id);
        if (currentChallenge?.activeSectorId && myRoleSlugs.includes(currentChallenge.activeSectorId)) {
            return true;
        }
        
        // 3. Fallback por nombre normalizado
        const normalizedActive = normalize(activePlayerNameRaw);
        const normalizedMe = normalize(myPlayerName);
        if (!normalizedActive || !normalizedMe || normalizedActive === 'esperando...') return false;
        
        return (
            normalizedActive === normalizedMe ||
            (normalizedMe === 'anfitrion' && normalizedActive === 'anfitrion')
        );
    }, [activeParticipanteId, myParticipantId, activePlayerNameRaw, myPlayerName, myAssignedRoles, currentChallenge?.activeSectorId]);

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

    const [lastMessage, setLastMessage] = useState('');

    // Resetear estados locales cuando cambia el reto, el turno O el estado del juego
    useEffect(() => {
        if (currentChallenge?.id || serverGameState?.turnNumber || serverGameState?.state) {
            // Si el estado es 'challenge' o 'playing', nos aseguramos de que el mando esté limpio
            if (serverGameState?.state === 'challenge' || serverGameState?.state === 'playing') {
                setVotedChallengeId(null);
                setLastFeedback(null);
                setLastMessage('');
                setIsSending(false);
            }
            
            // Si el estado es 'results' y no tenemos feedback local, lo cogemos del servidor
            if (serverGameState?.state === 'results' && lastFeedback === null) {
                setLastFeedback(serverGameState.lastTurnResult || 'incorrect');
                setLastMessage(serverGameState.lastTurnMessage || '');
            }
        }
    }, [currentChallenge?.id, serverGameState?.turnNumber, serverGameState?.state, serverGameState?.lastTurnResult, serverGameState?.lastTurnMessage, lastFeedback]);

    // 5. Acciones
    const handleVote = async (answer) => {
        const challengeType = currentChallenge?.type || 'options';
        const isFreeOrValidate = challengeType === 'free' || challengeType === 'open' || challengeType === 'validate';

        // En preguntas abiertas/validación: los NO activos validan (isMyTurn=false pueden votar)
        // En preguntas normales: solo el activo puede votar
        const canVote = isFreeOrValidate ? !isMyTurn : isMyTurn;

        if (hasVoted || !canVote || isSending) return;
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
                type: challengeType,
                participant_id: myParticipantId 
            });
            
            setVotedChallengeId(currentChallenge?.id);
            setLastFeedback(response.data.is_correct);

            // Si es online puro, avanzamos el turno SOLO si NO es una pregunta libre.
            // Para preguntas free/open, el avance ocurre DESPUÉS de que el grupo vote (en la fase validate).
            const tipoPregunta = currentChallenge?.type;
            const esPreguntaLibre = tipoPregunta === 'free' || tipoPregunta === 'open';
            if (!roomCode.startsWith('LOCAL_') && !esPreguntaLibre) {
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

    const handleProposal = async (text) => {
        console.log("[useOnlineGameState] handleProposal disparado con texto:", text);
        console.log("[useOnlineGameState] Estado actual - isMyTurn:", isMyTurn, "isSending:", isSending);
        
        // Eliminamos el bloqueo local de isMyTurn. Si la UI muestra el botón, dejamos que el servidor procese la petición.
        if (isSending) {
            console.warn("[useOnlineGameState] Bloqueado: Ya se está enviando una petición.");
            return;
        }
        if (!text) return;

        setIsSending(true);
        console.log("[useOnlineGameState] Enviando propuesta a:", `/api/game/${cleanRoomCode}/proposal`);

        try {
            const response = await axios.post(`/api/game/${cleanRoomCode}/proposal`, {
                sector_id: currentChallenge?.activeSectorId,
                player_name: myPlayerName || 'Jugador Online',
                proposal_text: text,
                participant_id: myParticipantId 
            });
            
            console.log("[useOnlineGameState] Propuesta enviada con éxito:", response.data);
            setVotedChallengeId(currentChallenge?.id); 
            
        } catch (error) {
            console.error("[useOnlineGameState] Error al enviar propuesta:", error);
            alert("Error al enviar la respuesta. Por favor, inténtalo de nuevo.");
        } finally {
            setIsSending(false);
        }
    };

    const useAbility = async (roleSlug) => {
        if (isSending || !myParticipantId) return;
        setIsSending(true);
        
        try {
            const response = await axios.post(`/api/game/${cleanRoomCode}/habilidad`, {
                participante_id: myParticipantId,
                slug: roleSlug
            });
            
            console.log(`[useOnlineGameState] Habilidad ${roleSlug} activada con éxito:`, response.data);
            return response.data;
        } catch (error) {
            console.error(`[useOnlineGameState] Error al activar habilidad ${roleSlug}:`, error);
            const msg = error.response?.data?.message || "Error al activar la habilidad.";
            alert(msg);
            throw error;
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
        lastMessage,
        serverChat,

        localMessages,
        setLocalMessages,
        sendChatMessage,
        handleVote,
        handleProposal,
        useAbility,
        resetMando,
        isActivePlayerInactive: activeSectorInChallenge?.isInactive || false,
        isActuallyHost,
        is5050Active: currentChallenge?.is5050Active || false
    };
}
