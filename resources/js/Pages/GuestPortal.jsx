import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Gamepad2, AlertCircle } from 'lucide-react';

// Importación de componentes modulares
import { MainMenuView } from '../Components/GuestPortal/MainMenuView';
import { HostAuthView } from '../Components/GuestPortal/HostAuthView';
import { ModeSelectionView } from '../Components/GuestPortal/ModeSelectionView';
import { LobbyView } from '../Components/GuestPortal/LobbyView';
import { JoinView } from '../Components/GuestPortal/JoinView';
import MobileController from '../Components/Game/Modes/MobileController';
import axios from 'axios';
import { ROLES } from '../data/gameData';
import { useGameChannel } from '../hooks/useGameChannel';
import { GameBoard } from '../Components/Game/GameBoard';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">React Crash</h1>
            <pre className="text-sm bg-white p-4 rounded overflow-auto border border-red-200">
                {this.state.error && this.state.error.toString()}
                <br/>
                {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function GuestPortal({ pin = null }) {
    const { auth } = usePage().props;
    const [view, setView] = useState(pin ? 'join' : 'main');
    const [mode, setMode] = useState(null);
    const [roomCode, setRoomCode] = useState(pin ? pin.toString() : null);
    const [selectedPlayers, setSelectedPlayers] = useState(null);
    const [myPlayerName, setMyPlayerName] = useState(auth.user?.name || auth.user?.username || '');
    const [myRoles, setMyRoles] = useState([]);
    const [myTotalTokens, setMyTotalTokens] = useState(0);
    const [myParticipantId, setMyParticipantId] = useState(null);
    const [joinError, setJoinError] = useState(null);
    const [isOnlineMode, setIsOnlineMode] = useState(false);
    const [isHost, setIsHost] = useState(false);
    
    // Escuchar el canal del juego para recibir el estado en tiempo real
    const { gameState: serverGameState } = useGameChannel(roomCode, isHost ? 'host' : 'player', myPlayerName);

    // AUTO-SALTO AL TABLERO: Si estamos en la lobby y el servidor dice que ya se está jugando, saltamos
    useEffect(() => {
        if (!serverGameState) return;

        const isGameStarted = 
            serverGameState.state === 'playing' || 
            serverGameState.state === 'challenge' || 
            (serverGameState.challenge && Object.keys(serverGameState.challenge).length > 0);
        
        console.log(`[HUE-CO2] Estado recibido en Lobby: ${serverGameState.state}. ¿Empezado?: ${isGameStarted}`);

        if (view === 'lobby' && isGameStarted) {
            console.log('[HUE-CO2] ¡Confirmado! La partida ha comenzado. Saltando al tablero...');
            navigateTo('playing');
        }
    }, [serverGameState?.state, serverGameState?.challenge, view]);

    // Actualizar datos del rol cuando el servidor manda el estado de sectores
    useEffect(() => {
        if (serverGameState && serverGameState.sectors) {
            // Buscar todos los sectores que pertenecen a este jugador
            const myServerSectors = serverGameState.sectors.filter(s => s.playerName === myPlayerName);
            if (myServerSectors.length > 0) {
                const assignedRoles = myServerSectors.map(s => ROLES.find(r => r.id === s.id)).filter(Boolean);
                const totalTokens = myServerSectors.reduce((sum, s) => sum + (s.tokens || 0), 0);
                
                setMyRoles(assignedRoles);
                setMyTotalTokens(totalTokens);
            }
        }
    }, [serverGameState, myPlayerName]);

    const navigateTo = (newView) => {
        setView(newView);
        if (newView === 'main') {
            setMode(null);
            setRoomCode(pin ? pin.toString() : null);
        }
    };

    const handleSelectMode = async (selectedMode, nickname) => {
        // Si viene de HostAuthView con el nombre del host
        if (nickname) setMyPlayerName(nickname);

        // Caso 1: Solo quiere ver el selector online
        if (selectedMode === 'online_selector') {
            setIsOnlineMode(true);
            navigateTo('select_mode');
            return;
        }

        // Caso 2: Elige modo Solo (Local)
        if (selectedMode === 'solo') {
            setMode('solo');
            setIsOnlineMode(false);
            navigateTo('lobby');
            return;
        }

        // Caso 3: Elige un modo Multijugador (Small, Classic, Class)
        setMode(selectedMode);
        setIsHost(true);
        try {
            const response = await axios.post('/juego/crear', {
                modo: selectedMode,
                anillo_id: 1,
                usuario: nickname || myPlayerName || 'Anfitrión'
            });
            
            if (response.data?.juego?.room_code) {
                const newRoomCode = response.data.juego.room_code;
                setRoomCode(newRoomCode);
                
                if (response.data.participante) {
                    setMyParticipantId(response.data.participante.participante_id);
                }

                navigateTo('lobby');
            }
        } catch (error) {
            console.error('[HUE-CO2] Error creando partida online:', error);
            setJoinError("No se pudo crear la sala online. Revisa tu conexión.");
        }
    };

    const handleStartGame = async (params = {}) => {
        // Caso A: Partida Online (tiene un roomCode real)
        if (roomCode && !roomCode.startsWith('LOCAL_')) {
            try {
                // 1. Avisar al servidor para que reparta roles y empiece
                await axios.post(`/api/game/${roomCode}/advance`);
                
                // 2. Navegar a la vista de tablero (OnlinePlayerBoard)
                // Usamos el modo 'playing' pero configuraremos el render para que muestre el tablero
                navigateTo('playing');
            } catch (error) {
                console.error('[HUE-CO2] Error al iniciar partida online:', error);
                alert("No se pudo iniciar la partida. Revisa la conexión del servidor.");
            }
        } 
        // Caso B: Partida Local
        else {
            try {
                const gameMode = params.mode || mode;
                router.get('/juego-local', { 
                    mode: gameMode,
                    players: params.players || selectedPlayers
                });
            } catch (error) {
                console.error('[HUE-CO2] Error creando partida local:', error);
            }
        }
    };

    const handleConnect = async (data) => {
        try {
            const cleanPin = data.pin.replace(/\s/g, '');
            const response = await axios.post('/api/juegos/join', {
                room_code: cleanPin,
                usuario: data.nickname,
                rol_id: null
            });
            
            setRoomCode(cleanPin);
            setMyPlayerName(data.nickname);
            setMyParticipantId(response.data.participante?.participante_id);
            setMode(response.data.juego?.modo || 'multiplayer');
            setIsHost(false);
            navigateTo('playing');

        } catch (error) {
            console.error('[HUE-CO2] Error al conectar:', error);
            let msg = 'PIN incorrecto o sala no disponible';
            if (error.response?.data?.errors) {
                // Si hay errores de validación (422)
                msg = Object.values(error.response.data.errors).flat().join(', ');
            } else if (error.response?.data?.error) {
                // Si hay un error específico (403, 404, etc)
                msg = error.response.data.error;
            } else if (error.response?.data?.message) {
                // Mensaje genérico de Laravel
                msg = error.response.data.message;
            }
            setJoinError(msg);
        }
    };

    return (
        <ErrorBoundary>
        <div className="min-h-screen bg-[#fafaf9] font-sans text-[#44403c] flex flex-col items-center justify-center p-6 relative overflow-y-auto transition-colors duration-500">
            <Head title="Portal de Invitado | HUE-CO2" />

            {/* Fondo Orgánico Optimizado (Sin blurs pesados) */}
            <div className="absolute inset-0 pointer-events-none -z-10 opacity-30" 
                style={{ 
                    background: 'radial-gradient(circle at 10% 10%, #dcfce7 0%, transparent 40%), radial-gradient(circle at 90% 90%, #fef3c7 0%, transparent 40%)'
                }} 
            />

            {/* Logo Mini (Sticky top left) */}
            {view !== 'main' && (
                <div className="absolute top-6 left-6 flex items-center gap-2 opacity-50 z-20">
                    <div className="w-10 h-10 flex items-center justify-center">
                        <img src="/images/DPEC_logo.png" alt="Logo" className="w-full h-full object-contain" loading="eager" />
                    </div>
                    <span className="font-black text-sm">HUE-CO2</span>
                </div>
            )}

            <AnimatePresence mode="wait">
                {/* VISTA 1: MAIN MENU */}
                {view === 'main' && (
                    <MainMenuView 
                        key="main" 
                        onNavigate={navigateTo} 
                    />
                )}

                {/* VISTA 1.5: OPCIONES DE ANFITRIÓN */}
                {view === 'host_auth' && (
                    <HostAuthView 
                        key="host_auth" 
                        initialNickname={myPlayerName}
                        onBack={() => navigateTo('main')} 
                        onSelectMode={(mode, nickname) => handleSelectMode(mode, nickname)} 
                    />
                )}

                {/* VISTA 2.5: SELECT MODE */}
                {view === 'select_mode' && (
                    <ModeSelectionView 
                        key="select_mode" 
                        hideSolo={isOnlineMode}
                        onBack={() => navigateTo('host_auth')} 
                        onSelectMode={handleSelectMode} 
                    />
                )}

                {/* VISTA 3: LOBBY */}
                {view === 'lobby' && (
                    <LobbyView 
                        key="lobby" 
                        mode={mode}
                        isHost={isHost}
                        roomCode={roomCode}
                        myPlayerName={myPlayerName}
                        selectedPlayers={selectedPlayers}
                        setSelectedPlayers={setSelectedPlayers}
                        onBack={() => navigateTo(isHost ? 'select_mode' : 'join')}
                        onStartGame={handleStartGame}
                    />
                )}

                {/* VISTA 4: UNIRSE CON PIN */}
                {view === 'join' && (
                    <JoinView 
                        key="join"
                        onBack={() => navigateTo('main')}
                        onConnect={handleConnect}
                        initialPin={roomCode}
                    />
                )}

                {/* VISTA 5: JUEGO EN CURSO (MANDO O TABLERO) */}
                {view === 'playing' && (
                    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
                        {isHost ? (
                            <GameBoard 
                                roomCode={roomCode}
                                gameMode={mode || 'multiplayer'}
                                myRoles={myRoles}
                                myPlayerName={myPlayerName}
                                myParticipantId={myParticipantId}
                                onEnd={(win) => console.log('Game Over:', win)}
                            />
                        ) : (
                            <MobileController 
                                roomCode={roomCode}
                                participantId={myParticipantId}
                                playerName={myPlayerName}
                                roles={myRoles.length > 0 ? myRoles : [{ id: 'ciudadania', name: 'Ciudadanía' }]}
                                tokens={myTotalTokens}
                                gameState={serverGameState?.state === 'lobby' ? 'lobby' : (serverGameState?.state || 'lobby')}
                            />
                        )}
                    </div>
                )}
            </AnimatePresence>

            {/* POPUP DE ERROR (Sala llena, PIN incorrecto, etc.) */}
            <AnimatePresence>
                {joinError && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center border-4 border-[#fb923c]/20"
                        >
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-stone-900 mb-2">¡Ups! Algo ha pasado</h3>
                            <p className="text-stone-600 font-bold mb-8 leading-relaxed">
                                {joinError}
                            </p>
                            <button 
                                onClick={() => setJoinError(null)}
                                className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black text-lg hover:bg-stone-800 transition-all active:scale-95 shadow-lg shadow-stone-200"
                            >
                                Entendido
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
        </ErrorBoundary>
    );
}