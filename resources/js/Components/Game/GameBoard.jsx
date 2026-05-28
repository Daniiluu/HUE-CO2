import { ROLES } from '../../data/gameData';
import { GameProvider } from './Core/GameProvider';
import { useGameChannel } from '../../hooks/useGameChannel';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Importación de Tableros por Modo
import LocalDisplayBoard from './Modes/Local/LocalDisplayBoard';
import OnlinePlayerBoard from './Modes/Online/OnlinePlayerBoard';
import EndgameResults from '../Endgame/EndgameResults';

export function GameBoard({
    players: activePlayers,
    onEnd,
    myRoles = [],
    myPlayerName,
    myParticipantId,
    isHost = false,
    turnNumber: parentTurnNumber,
    roomCode,
    gameMode = 'shared',
    isLocal: isLocalProp = true
}) {
    const [sectorsState, setSectorsState] = useState([]);
    const [currentChallenge, setCurrentChallenge] = useState({});
    const [turnNumber, setTurnNumber] = useState(0);
    const [isLoadingChallenge, setIsLoadingChallenge] = useState(false);
    const [initialTimeLeft, setInitialTimeLeft] = useState(45);
    const [endData, setEndData] = useState(null);

    // ── WebSocket: Escuchar el estado global del juego ────────────────────────
    const { gameState: serverGameState, votes, setGameState } = useGameChannel(roomCode, 'host', 'Host');

    useEffect(() => {
        if (serverGameState) {
            // MEDIDA ANTIFRAUDE / PROTECCIÓN DE TURNO ANTERIOR:
            // Si el evento del socket trae un número de turno menor al que ya procesamos localmente, lo ignoramos.
            if (turnNumber > 0 && serverGameState.turnNumber < turnNumber) {
                console.log(`[DEBUG-PERF] Ignorando evento WebSocket desfasado del turno ${serverGameState.turnNumber}`);
                return;
            }

            console.log(`[DEBUG-PERF] GameBoard detectó cambio de estado a: [${serverGameState.state}] a las ${new Date().toLocaleTimeString()}.${new Date().getMilliseconds()}`);

            if (serverGameState.state === 'challenge' || serverGameState.state === 'playing' || serverGameState.state === 'results') {
                setCurrentChallenge(serverGameState.challenge);
                setTurnNumber(serverGameState.turnNumber);
                if (serverGameState.sectors) {
                    setSectorsState(serverGameState.sectors);
                }
                setEndData(null);
            } else if (serverGameState.state === 'ended') {
                const finalData = {
                    outcome: serverGameState.outcome || 'neutral',
                    temperature: serverGameState.temperature,
                    totalHeating: serverGameState.totalHeating,
                    totalReduction: serverGameState.totalReduction,
                    sectors: serverGameState.sectors
                };
                setEndData(finalData);
                onEnd?.(finalData);
            }
        }
    }, [serverGameState, turnNumber, onEnd]);
    // ─────────────────────────────────────────────────────────────────────────

    // ── Detectar si es un juego local (sin BD) ─────────────────────────────
    const isLocalGame = isLocalProp || (roomCode && roomCode.startsWith('LOCAL_'));

    // ── Carga de retos desde el servidor (avanzar turno) ─────────────────────
    const nextChallenge = useCallback(async () => {
        setIsLoadingChallenge(true);
        let response = null;
        try {
            if (roomCode && !roomCode.startsWith('LOCAL_')) {
                const cleanCode = (roomCode || '').toString().replace(/\s/g, '');
                response = await axios.post(`/api/game/${cleanCode}/advance`);

                if (response.data && response.data.gameState) {
                    const { state, challenge, turnNumber: newTurn, sectors: newSectors, outcome, temperature } = response.data.gameState;

                    // ACTUALIZACIÓN DE UI OPTIMISTA INMEDIATA:
                    // Forzamos la sincronización de estados locales antes de que cualquier polling o socket interfiera
                    if (state === 'challenge' || state === 'playing' || state === 'results') {
                        setCurrentChallenge(challenge);
                        setTurnNumber(newTurn);
                        if (newSectors) setSectorsState(newSectors);
                        setEndData(null);

                        // Sincronizar el estado del propio hook de sockets para alinearlo al nuevo turno
                        if (typeof setGameState === 'function') {
                            setGameState(response.data.gameState);
                        }
                    } else if (state === 'ended') {
                        const finalData = {
                            outcome: outcome || 'neutral',
                            temperature: temperature,
                            totalHeating: response.data.gameState.totalHeating ?? 0,
                            totalReduction: response.data.gameState.totalReduction ?? 0,
                            sectors: newSectors
                        };
                        setEndData(finalData);
                        onEnd?.(finalData);
                    }
                }
            } else {
                // Modo local puro (sin servidor/sala): cargar pregunta aleatoria directamente
                response = await axios.get('/api/preguntas/random');
                setCurrentChallenge(response.data);
                setTurnNumber(prev => prev + 1);
            }
            return response;
        } catch (error) {
            console.error('[HUE-CO2] Error al avanzar turno:', error);
            return null;
        } finally {
            setIsLoadingChallenge(false);
        }
    }, [roomCode, isLocalGame, onEnd, setGameState]);

    // Al montar, si es juego LOCAL PURO (sin código de sala) pedimos el primer reto.
    useEffect(() => {
        const isPureLocal = !roomCode;
        if (isPureLocal && (!currentChallenge || Object.keys(currentChallenge).length === 0)) {
            nextChallenge();
        }
    }, [roomCode]);

    // ── Carga del estado inicial para modo ONLINE (sin esperar WebSocket) ────
    useEffect(() => {
        if (!roomCode || isLocalGame) return;
        const cleanCode = (roomCode || '').toString().replace(/\s/g, '');
        axios.get(`/api/juego/${cleanCode}/estado`)
            .then(res => {
                const data = res.data;
                if (data.sectors) setSectorsState(data.sectors);
                if (data.challenge) setCurrentChallenge(data.challenge);
                if (data.turnNumber) setTurnNumber(data.turnNumber);
                if (data.timeLeft !== undefined) setInitialTimeLeft(data.timeLeft);
                if (data.state === 'ended') {
                    setEndData({
                        outcome: data.outcome || 'neutral',
                        temperature: data.temperature,
                        totalHeating: data.totalHeating,
                        totalReduction: data.totalReduction,
                        sectors: data.sectors
                    });
                }
            })
            .catch(err => console.error('[HUE-CO2] Error al cargar estado inicial:', err));
    }, [roomCode, isLocalGame]);
    // ─────────────────────────────────────────────────────────────────────────

    // Preparación de datos de sectores con estilos consistentes
    const getRoleColors = (id) => {
        const colors = {
            textil: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', accent: 'bg-indigo-600' },
            ciencia: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', accent: 'bg-blue-600' },
            tech: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', accent: 'bg-violet-600' },
            primario: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', accent: 'bg-emerald-600' },
            legislativo: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', accent: 'bg-rose-600' },
            ciudadania: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-100', accent: 'bg-fuchsia-600' },
        };
        return colors[id] || colors.ciencia;
    };

    const sectors = ROLES.map(role => {
        const serverData = sectorsState.find(s => s.id === role.id);
        return {
            ...role,
            ...getRoleColors(role.id),
            tokens: serverData ? serverData.tokens : 12,
            playerName: serverData ? serverData.playerName : 'Esperando...',
            participanteId: serverData ? serverData.participanteId : null,
            hasVoted: !!votes[role.id],
            points: serverData ? serverData.points : 0,
            ringResults: serverData ? serverData.ringResults : []
        };
    });

    const visualPhase = Math.ceil(turnNumber / 6) || 1;

    const renderBoard = () => {
        if (endData) {
            return (
                <EndgameResults
                    outcome={endData.outcome}
                    finalTemp={endData.temperature}
                    totalHeating={endData.totalHeating}
                    totalReduction={endData.totalReduction}
                    playerStats={endData.sectors?.map(s => ({
                        id: s.id,
                        name: s.id.charAt(0).toUpperCase() + s.id.slice(1),
                        role: s.playerName || 'Anónimo',
                        stat: `${s.points} Puntos`,
                        label: `${s.tokens} EcoFichas`,
                        isMVP: s.points === Math.max(...endData.sectors.map(sec => sec.points))
                    }))}
                    onBackToPortal={() => window.location.href = '/'}
                />
            );
        }

        if (isLocalGame) {
            return (
                <LocalDisplayBoard
                    sectors={sectors}
                    challenge={currentChallenge}
                    roomCode={roomCode}
                    turnNumber={turnNumber}
                    onNextChallenge={nextChallenge}
                    visualPhase={visualPhase}
                    myParticipantId={myParticipantId}
                    myPlayerName={myPlayerName}
                    gameMode={gameMode}
                    setGameState={setGameState} // Exponemos la mutación al tablero local
                />
            );
        } else {
            return (
                <OnlinePlayerBoard
                    sectors={sectors}
                    challenge={currentChallenge}
                    roomCode={roomCode}
                    myRoles={myRoles}
                    myParticipantId={myParticipantId}
                    myPlayerName={myPlayerName}
                    isHost={isHost}
                    turnNumber={serverGameState?.turnNumber || parentTurnNumber}
                    visualPhase={serverGameState?.challenge?.visual_phase || visualPhase}
                    initialTimeLeft={initialTimeLeft}
                />
            );
        }
    };

    return (
        <GameProvider initialTime={105} playerStats={{}}>
            {renderBoard()}
        </GameProvider>
    );
}