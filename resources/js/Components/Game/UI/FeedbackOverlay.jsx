import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, ChevronRight, Minus, Play, Pause, RotateCcw, BookOpen, Users, Volume2 } from 'lucide-react';

/**
 * Genera un pitido acústico premium de finalización de tiempo usando Web Audio API.
 */
const playBeep = () => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Primer tono (agudo y resonante)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // La5
        gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.3);

        // Segundo tono un poco retrasado para efecto campana escolar
        setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // Do6
            gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.4);
        }, 150);
    } catch (e) {
        console.warn('AudioContext no soportado o bloqueado por el navegador:', e);
    }
};

/**
 * FeedbackOverlay
 * Componente unificado para mostrar si un turno fue correcto o incorrecto.
 * Se adapta dinámicamente si la pregunta contiene explicaciones y dinámicas de grupo.
 */
export default function FeedbackOverlay({
    isCorrect,
    message,
    onNext,
    explicacion,
    dinamica_grupo,
    tiempo_dinamica = 120,
    opcion_correcta
}) {
    // Estado del Temporizador para Dinámicas de Grupo
    const duration = tiempo_dinamica || 120;
    const [timeLeft, setTimeLeft] = useState(duration);
    const [isRunning, setIsRunning] = useState(false);
    const [hasEnded, setHasEnded] = useState(false);

    useEffect(() => {
        let interval = null;
        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        setHasEnded(true);
                        playBeep();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, timeLeft]);

    const handleToggleTimer = () => {
        setIsRunning(!isRunning);
        if (hasEnded) setHasEnded(false);
    };

    const handleResetTimer = () => {
        setIsRunning(false);
        setTimeLeft(duration);
        setHasEnded(false);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const successColor = {
        bg: 'bg-[#E2F1C3]',
        border: 'border-[#87AF4C]',
        text: 'text-[#658437]',
        icon: 'text-[#87AF4C]',
        btn: 'bg-[#87AF4C] hover:bg-[#658437]',
        hex: '#E2F1C3',
        borderHex: '#87AF4C'
    };

    const partialColor = {
        bg: 'bg-amber-100',
        border: 'border-amber-500',
        text: 'text-amber-800',
        icon: 'text-amber-500',
        btn: 'bg-amber-500 hover:bg-amber-600',
        hex: '#FEF3C7',
        borderHex: '#F59E0B'
    };

    const errorColor = {
        bg: 'bg-[#FFC2C2]',
        border: 'border-[#D00000]',
        text: 'text-[#D00000]',
        icon: 'text-[#D00000]',
        btn: 'bg-[#D00000] hover:bg-[#a00000]',
        hex: '#FFC2C2',
        borderHex: '#D00000'
    };

    const getTheme = () => {
        if (isCorrect === 'partial') return partialColor;
        if (isCorrect === 'correct' || isCorrect === true) return successColor;
        return errorColor;
    };

    const theme = getTheme();
    const hasGroupDynamic = !!dinamica_grupo;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-6 ${onNext ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />

            <motion.div
                initial={{ scale: 0.8, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                className={`relative rounded-[3.5rem] shadow-2xl flex flex-col items-center border-8 overflow-hidden transition-all duration-300 w-full ${hasGroupDynamic ? 'max-w-6xl p-10' : 'p-12 max-w-lg'
                    }`}
                style={{
                    backgroundColor: theme.hex,
                    borderColor: theme.borderHex,
                    zIndex: 10001,
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                }}
            >
                {/* DISEÑO 1: CON DINÁMICA DE GRUPO (Layout a 2 columnas widescreen) */}
                {hasGroupDynamic ? (
                    <div className="w-full flex flex-col gap-6">

                        {/* Cabecera del Feedback */}
                        <div className="flex items-center justify-between pb-4 border-b-2 border-stone-800/10">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md">
                                    {isCorrect === 'correct' || isCorrect === true ? (
                                        <CheckCircle2 className={`w-10 h-10 ${theme.icon}`} />
                                    ) : (
                                        <X className={`w-10 h-10 ${theme.icon}`} />
                                    )}
                                </div>
                                <div>
                                    <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.text}`}>
                                        {isCorrect === 'correct' || isCorrect === true ? '¡Correcto!' : '¡Casi!'}
                                    </h1>
                                    <p className={`text-xs font-black uppercase tracking-wider opacity-75 ${theme.text}`}>
                                        {message || (isCorrect === 'correct' || isCorrect === true ? '+1 PUNTO PARA EL SECTOR' : '+0.1°C A LA TEMPERATURA')}
                                    </p>
                                </div>
                            </div>

                            {/* Revelación destacada de opción correcta */}
                            {opcion_correcta && (
                                <div className="bg-white/80 border border-green-300/40 px-6 py-2.5 rounded-2xl text-emerald-800 font-black shadow-sm text-sm">
                                    🟢 RESPUESTA CORRECTA: <span className="underline">{opcion_correcta}</span>
                                </div>
                            )}
                        </div>

                        {/* Rejilla de Contenido Principal */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* Columna Izquierda: Explicación Científica (5 cols) */}
                            <div className="lg:col-span-5 flex flex-col bg-white/70 backdrop-blur-sm rounded-[2.5rem] p-6 border-2 border-stone-800/5 shadow-inner">
                                <div className="flex items-center gap-3 mb-4 text-emerald-800">
                                    <BookOpen className="w-6 h-6 stroke-[2.5]" />
                                    <h2 className="text-lg font-black uppercase tracking-tight">¿Por qué es así?</h2>
                                </div>
                                <div className="flex-1 overflow-y-auto max-h-[250px] pr-2 text-stone-700 font-semibold text-sm leading-relaxed scrollbar-thin">
                                    {explicacion}
                                </div>
                            </div>

                            {/* Columna Derecha: Actividad Dinámica de Grupo (7 cols) */}
                            <div className="lg:col-span-7 flex flex-col bg-[#F3FAFF] rounded-[2.5rem] p-6 border-2 border-sky-200/50 shadow-md relative overflow-hidden">
                                {/* Decoración de fondo */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-200/10 rounded-full blur-xl pointer-events-none" />

                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3 text-sky-800">
                                        <Users className="w-7 h-7 stroke-[2.5]" />
                                        <h2 className="text-xl font-black uppercase tracking-tight">Dinámica de Grupo</h2>
                                    </div>
                                    <span className="bg-sky-200/50 text-sky-800 px-3 py-1 rounded-full font-black text-[10px] tracking-wider uppercase">
                                        Físico / Clase
                                    </span>
                                </div>

                                <div className="bg-white/80 border border-sky-100 rounded-3xl p-5 mb-5 text-stone-800 font-bold text-[13px] leading-relaxed shadow-sm min-h-[90px]">
                                    {dinamica_grupo}
                                </div>

                                {/* Panel del Temporizador Premium */}
                                <div className={`flex items-center justify-between p-4 rounded-3xl border-2 transition-all duration-300 ${hasEnded
                                        ? 'bg-rose-50 border-rose-300 animate-pulse'
                                        : 'bg-white border-sky-100'
                                    } shadow-sm`}>
                                    <div className="flex items-center gap-4">
                                        {/* Esfera de tiempo */}
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg transition-all ${hasEnded ? 'bg-rose-500' : (isRunning ? 'bg-sky-500 animate-pulse' : 'bg-slate-400')
                                            }`}>
                                            {hasEnded ? <Volume2 className="w-6 h-6 animate-bounce" /> : formatTime(timeLeft)}
                                        </div>
                                        <div>
                                            <h3 className={`font-black text-sm ${hasEnded ? 'text-rose-700' : 'text-slate-700'}`}>
                                                {hasEnded ? '¡Tiempo Finalizado!' : 'Debate en Curso'}
                                            </h3>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                {isRunning ? 'El reloj está corriendo' : 'Temporizador pausado'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Controles del temporizador */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleToggleTimer}
                                            className={`p-3 rounded-2xl text-white shadow-md active:scale-90 transition-all ${isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-sky-500 hover:bg-sky-600'
                                                }`}
                                        >
                                            {isRunning ? <Pause size={18} /> : <Play size={18} className="translate-x-[1px]" />}
                                        </button>
                                        <button
                                            onClick={handleResetTimer}
                                            className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 shadow-sm border border-slate-200 active:scale-90 transition-all"
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Botón de Siguiente Pregunta centrado al final */}
                        {onNext && (
                            <div className="flex justify-center pt-2 border-t-2 border-stone-800/10">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onNext}
                                    className={`px-12 py-4 rounded-2xl text-white font-black text-lg flex items-center gap-3 shadow-xl ${theme.btn}`}
                                >
                                    Siguiente Pregunta
                                    <ChevronRight className="w-6 h-6" />
                                </motion.button>
                            </div>
                        )}

                    </div>
                ) : (
                    /* DISEÑO 2: STANDARD / ANTERIOR (Diseño vertical clásico compacto) */
                    <>
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-inner">
                            {isCorrect === 'partial' ? (
                                <Minus className={`w-16 h-16 ${theme.icon}`} />
                            ) : (isCorrect === 'correct' || isCorrect === true ? (
                                <CheckCircle2 className={`w-16 h-16 ${theme.icon}`} />
                            ) : (
                                <X className={`w-16 h-16 ${theme.icon}`} />
                            ))}
                        </div>

                        <div className="text-center mt-6">
                            <h1 className={`text-5xl font-black uppercase tracking-tighter ${theme.text}`}>
                                {isCorrect === 'partial' ? '¡Parcial!' : (isCorrect === 'correct' || isCorrect === true ? '¡Correcto!' : '¡Casi!')}
                            </h1>
                            <p className={`mt-1 text-sm font-black uppercase tracking-widest opacity-70 ${theme.text}`}>
                                {message || (isCorrect === 'partial' ? '+0.5 PUNTOS PARA EL SECTOR' : (isCorrect === 'correct' || isCorrect === true ? '+1 PUNTO PARA EL SECTOR' : '+0.1°C A LA TEMPERATURA'))}
                            </p>
                        </div>

                        {onNext && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                onClick={onNext}
                                className={`mt-8 px-10 py-4 rounded-2xl text-white font-black text-lg flex items-center gap-3 shadow-xl active:scale-95 transition-all ${theme.btn}`}
                            >
                                Siguiente Pregunta
                                <ChevronRight className="w-6 h-6" />
                            </motion.button>
                        )}
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}
