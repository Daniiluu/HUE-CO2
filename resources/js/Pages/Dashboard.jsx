import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { PlusCircle, Gamepad2, ArrowRight, X, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import MatchHistory from '@/Components/Dashboard/MatchHistory';
import EndgameResults from '../Components/Endgame/EndgameResults';

// Importación de componentes modulares
import { HostAuthView } from '../Components/GuestPortal/HostAuthView';
import { ModeSelectionView } from '../Components/GuestPortal/ModeSelectionView';
import { LobbyView } from '../Components/GuestPortal/LobbyView';
import axios from 'axios';

export default function Dashboard() {
    const { auth, history } = usePage().props;
    const [view, setView] = useState('main'); // main, host_auth, select_mode, lobby
    const [mode, setMode] = useState(null);
    const [nickname, setNickname] = useState(auth.user?.username || auth.user?.name || '');
    const [selectedPlayers, setSelectedPlayers] = useState(null);
    const [roomCode, setRoomCode] = useState('');
    const [juegoId, setJuegoId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isLocal, setIsLocal] = useState(false);
    const [myParticipantId, setMyParticipantId] = useState(null);
    const [selectedGameDetails, setSelectedGameDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const handleViewDetails = async (id) => {
        try {
            setIsLoadingDetails(true);
            const response = await axios.get(`/juego/${id}/detalles-historial`);
            setSelectedGameDetails(response.data);
        } catch (error) {
            console.error('[HUE-CO2] Error al cargar los detalles del historial:', error);
            alert('No se pudieron recuperar los detalles de la partida.');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const navigateTo = (newView) => {
        setView(newView);
        if (newView === 'main') {
            setSelectedPlayers(null);
            setMode(null);
        }
    };

    const handleSelectMode = async (selectedMode) => {
        try {
            setIsCreating(true);
            setMode(selectedMode);

            const response = await axios.post('/juego/crear', {
                modo: selectedMode,
                anillo_id: 1,
                usuario: nickname || auth.user?.name || auth.user?.username || 'Anfitrión',
                is_local: isLocal
            });

            if (response.data?.juego?.room_code) {
                setRoomCode(response.data.juego.room_code);
                setJuegoId(response.data.juego.juego_id);
                if (response.data.participante) {
                    setMyParticipantId(response.data.participante.participante_id);
                }
                setView('lobby');
            } else {
                throw new Error('No se recibió el código de sala');
            }
        } catch (error) {
            console.error('Error al crear sala:', error);
            const msg = error.response?.data?.message || error.response?.data?.error || error.message;
            alert('Error al crear la sala: ' + msg);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSetSelectedPlayers = async (num) => {
        setSelectedPlayers(num);
        if (!juegoId) return;
        
        try {
            // Sincronizar el límite de jugadores con el backend (vía web route con sesión)
            await axios.put(`/juego/${juegoId}`, {
                max_players: num
            });
            console.log(`[HUE-CO2] Límite de jugadores actualizado a ${num}`);
        } catch (error) {
            console.error('Error al actualizar límite de jugadores:', error);
        }
    };

    const startLocalGame = async (params = {}) => {
        const cleanCode = (roomCode || '').toString().replace(/\s/g, '');
        try {
            // Avisar al servidor: repartir roles y cambiar estado a 'playing'
            await axios.post(`/api/game/${cleanCode}/advance`);
        } catch (error) {
            console.error('[HUE-CO2] Error al iniciar juego:', error);
        }
        
        // Si es modo Online, forzar redirección al tablero completo usando el router de Inertia
        if (!isLocal) {
            router.get(`/tablero/${cleanCode}`, {
                mode: params.mode || mode,
                isLocal: false,
                playerName: nickname
            });
            return;
        }

        // Si es Local, usar el router de Inertia normal
        router.get(`/tablero/${cleanCode}`, { 
            mode: params.mode || mode,
            isLocal: isLocal,
            playerName: nickname
        });
    };

    const joinRoom = (e) => {
        e.preventDefault();
        // Redirigir al portal de juego con el código de sala como parámetro
        router.get(`/jugar`, { pin: roomCode });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard | HUE-CO2" />

            <div className="py-8 md:py-12 flex flex-col items-center min-h-[60vh] justify-center relative overflow-hidden">
                
                <AnimatePresence mode="wait">
                    {view === 'main' && (
                        <motion.div 
                            key="main"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col md:flex-row gap-8 w-full max-w-5xl px-4 md:px-6"
                        >
                            {/* Tarjeta: Crear Sala */}
                            <div className="flex-1 bg-white border-4 border-[#e7e5e4] p-10 rounded-[3rem] shadow-xl flex flex-col items-center group hover:border-[#87AF4C] transition-all duration-300">
                                <div className="w-20 h-20 bg-[#f0fdf4] text-[#87AF4C] rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                                    <PlusCircle className="w-10 h-10" />
                                </div>

                                <h2 className="text-3xl font-black mb-4 text-[#1c1917] tracking-tight text-center">Ser Anfitrión</h2>
                                <p className="text-[#a8a29e] text-center mb-10 text-sm font-bold uppercase tracking-widest leading-relaxed">
                                    Crea una sala nueva,<br />lidera el tablero principal<br />y coordina los sectores.
                                </p>

                                <button
                                    onClick={() => navigateTo('host_auth')}
                                    className="w-full py-5 bg-[#87AF4C] hover:bg-[#769a42] text-white rounded-2xl font-black text-xl shadow-[0_8px_0_0_#5f7b35] active:shadow-none active:translate-y-2 transition-all flex items-center justify-center gap-3"
                                >
                                    Crear Partida <ArrowRight className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Tarjeta: Unirse a Sala */}
                            <div className="flex-1 bg-white border-4 border-[#e7e5e4] p-10 rounded-[3rem] shadow-xl flex flex-col items-center group hover:border-[#1c1917] transition-all duration-300">
                                <div className="w-20 h-20 bg-[#f5f5f4] text-[#1c1917] rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                                    <Gamepad2 className="w-10 h-10" />
                                </div>

                                <h2 className="text-3xl font-black mb-4 text-[#1c1917] tracking-tight text-center">Unirse a Partida</h2>
                                <p className="text-[#a8a29e] text-center mb-10 text-sm font-bold uppercase tracking-widest leading-relaxed">
                                    ¡Entra en acción!<br />Usa el código PIN para<br />conectar tu dispositivo.
                                </p>

                                <form onSubmit={joinRoom} className="w-full flex flex-col gap-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="000 000"
                                            value={roomCode}
                                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                            className="w-full px-6 py-5 bg-[#f5f5f4] border-4 border-[#e7e5e4] rounded-2xl text-center font-black text-2xl uppercase focus:border-[#1c1917] focus:outline-none transition-colors placeholder:text-[#d6d3d1] tracking-[0.2em]"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-5 bg-[#1c1917] hover:bg-[#292524] text-white rounded-2xl font-black text-xl shadow-[0_8px_0_0_#000] active:shadow-none active:translate-y-2 transition-all"
                                    >
                                        Conectar
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}

                    {view === 'host_auth' && (
                        <HostAuthView 
                            key="host" 
                            isGuest={false}
                            initialNickname={nickname}
                            onBack={() => navigateTo('main')}
                            onSelectMode={(m, n, local) => {
                                if (n) setNickname(n);
                                setIsLocal(!!local);
                                navigateTo('select_mode');
                            }}
                        />
                    )}

                    {view === 'select_mode' && (
                        <ModeSelectionView 
                            key="select"
                            hideSolo={!isLocal}
                            hideClass={!isLocal}
                            onBack={() => navigateTo('host_auth')}
                            onSelectMode={handleSelectMode}
                            isLoading={isCreating}
                        />
                    )}

                    {view === 'lobby' && (
                        <LobbyView 
                            key="lobby"
                            mode={mode}
                            isHost={true}
                            roomCode={roomCode}
                            selectedPlayers={selectedPlayers}
                            setSelectedPlayers={handleSetSelectedPlayers}
                            onBack={() => navigateTo('select_mode')}
                            onStartGame={startLocalGame}
                        />
                    )}
                </AnimatePresence>

                {/* Historial de Partidas - Solo se muestra en el menú principal */}
                {view === 'main' && (
                    <MatchHistory 
                        history={history} 
                        onViewDetails={handleViewDetails} 
                    />
                )}

                {/* Modal para ver resultados detallados de partidas históricas */}
                <AnimatePresence>
                    {selectedGameDetails && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                        >
                            <motion.div 
                                initial={{ scale: 0.95, y: 15 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 15 }}
                                className="bg-[#fafaf9] rounded-[3rem] w-full max-w-7xl max-h-[90vh] overflow-y-auto relative shadow-2xl border-4 border-[#e7e5e4] flex flex-col"
                            >
                                <button 
                                    onClick={() => setSelectedGameDetails(null)} 
                                    className="absolute top-6 right-6 z-[60] bg-white border-4 border-[#e7e5e4] text-[#1c1917] p-3 rounded-2xl hover:border-red-500 hover:text-red-500 transition-all shadow-sm active:scale-95 cursor-pointer"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                
                                <div className="flex-1 overflow-y-auto">
                                    <EndgameResults 
                                        outcome={selectedGameDetails.outcome}
                                        finalTemp={selectedGameDetails.temperature}
                                        totalHeating={selectedGameDetails.totalHeating}
                                        totalReduction={selectedGameDetails.totalReduction}
                                        playerStats={selectedGameDetails.sectors?.map((s, index) => ({
                                            id: s.id || `sector_${index}`,
                                            name: s.playerName || 'Jugador',
                                            role: s.role || 'Coordinador',
                                            stat: `${s.points ?? 0} Puntos`,
                                            label: `${s.tokens ?? 0} EcoFichas`,
                                            isMVP: s.points > 0 && s.points === Math.max(...selectedGameDetails.sectors.map(sec => sec.points))
                                        }))}
                                        onBackToPortal={() => setSelectedGameDetails(null)}
                                    />
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Spinner de Carga de Detalles */}
                <AnimatePresence>
                    {isLoadingDetails && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-stone-900/40 backdrop-blur-xs flex items-center justify-center pointer-events-auto"
                        >
                            <div className="bg-white border-4 border-stone-200 p-6 rounded-3xl flex items-center gap-4 shadow-xl">
                                <Loader2 className="w-8 h-8 text-[#87AF4C] animate-spin" />
                                <span className="font-black text-[#1c1917] tracking-tight text-lg uppercase">Cargando resultados...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <div className="mt-16 flex items-center justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    <img src="/images/DPEC_logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                    <div className="h-8 w-1 bg-[#e7e5e4] rounded-full"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a8a29e]">Lo que hacemos cuenta y mucho</p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

