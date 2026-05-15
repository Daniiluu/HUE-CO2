import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Star, Hexagon, Heart, Moon, Droplet, Send, CheckCircle2, Minus, X, Shirt, Clock, Cpu } from 'lucide-react';

// ─── Constantes Estáticas ────────────────────────────────────────────────────
// Definidas fuera del componente para que no se recreen en cada render.

const COLOR_MAP = {
    violet:  { base: 'bg-violet-600',  text: 'text-violet-600',  outline: 'outline-violet-600',  gradient: 'from-violet-400/20 to-violet-700/0', focus: 'focus:border-violet-400',  sliderColor: '#7c3aed' },
    emerald: { base: 'bg-emerald-600', text: 'text-emerald-600', outline: 'outline-emerald-600', gradient: 'from-emerald-400/20 to-emerald-700/0', focus: 'focus:border-emerald-400', sliderColor: '#059669' },
    rose:    { base: 'bg-rose-600',    text: 'text-rose-600',    outline: 'outline-rose-600',    gradient: 'from-rose-400/20 to-rose-700/0',    focus: 'focus:border-rose-400',    sliderColor: '#e11d48' },
    blue:    { base: 'bg-blue-600',    text: 'text-blue-600',    outline: 'outline-blue-600',    gradient: 'from-blue-400/20 to-cyan-700/0',    focus: 'focus:border-blue-400',    sliderColor: '#2563eb' },
    indigo:  { base: 'bg-indigo-600',  text: 'text-indigo-600',  outline: 'outline-indigo-600',  gradient: 'from-indigo-400/20 to-indigo-700/0', focus: 'focus:border-indigo-400',  sliderColor: '#4f46e5' },
    fuchsia: { base: 'bg-fuchsia-600', text: 'text-fuchsia-600', outline: 'outline-fuchsia-600', gradient: 'from-fuchsia-400/20 to-fuchsia-700/0', focus: 'focus:border-fuchsia-400', sliderColor: '#c026d3' },
    amber:   { base: 'bg-amber-500',   text: 'text-amber-600',   outline: 'outline-amber-500',   gradient: 'from-amber-400/20 to-amber-700/0',   focus: 'focus:border-amber-400',   sliderColor: '#f59e0b' },
};

const OPTION_STYLES = [
    { light: 'bg-rose-500',    dark: 'bg-rose-700',    borderDark: 'border-rose-700',    icon: <Star    fill="white" size={24} color="white" /> },
    { light: 'bg-amber-400',   dark: 'bg-amber-700',   borderDark: 'border-amber-700',   icon: <Hexagon fill="white" size={24} color="white" /> },
    { light: 'bg-emerald-500', dark: 'bg-emerald-700', borderDark: 'border-emerald-700', icon: <Heart   fill="white" size={24} color="white" /> },
    { light: 'bg-blue-500',    dark: 'bg-blue-700',    borderDark: 'border-blue-700',    icon: <Moon    fill="white" size={24} color="white" /> },
];

const VALIDATE_OPTIONS = [
    { key: 'valid',   icon: <CheckCircle2 size={20} />, label: 'Es Válida',              active: 'bg-emerald-50 border-emerald-500 text-emerald-700', hover: 'hover:border-emerald-300 hover:text-emerald-600' },
    { key: 'partial', icon: <Minus size={20} />,        label: 'Incompleta / Discutible', active: 'bg-amber-50 border-amber-500 text-amber-800',       hover: 'hover:border-amber-300 hover:text-amber-600' },
    { key: 'invalid', icon: <X size={20} />,             label: 'Es Incorrecta',           active: 'bg-rose-50 border-rose-500 text-rose-800',          hover: 'hover:border-rose-300 hover:text-rose-600' },
];
// ─────────────────────────────────────────────────────────────────────────────

export default function ChallengeCard({ 
    challenge = {}, 
    intensity = 50, 
    setIntensity, 
    onApply, 
    readOnly = false,
    sectorColor = 'blue',
    isCompact = false
}) {
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [proposalText, setProposalText] = useState('');

    if (!challenge || Object.keys(challenge).length === 0) {
        return (
            <div className={`${isCompact ? 'w-[20vw] h-[55vh]' : 'w-[24vw] lg:w-[22vw] h-[65vh]'} bg-white rounded-[2rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center shrink-0`}>
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Clock className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest mb-2">Esperando Reto</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                    Sincronizando con el servidor...<br/>El primer desafío aparecerá en unos instantes.
                </p>
            </div>
        );
    }

    // --- CONFIGURACIÓN POR ANILLO ---
    const ringName = String(challenge?.ring || '').toLowerCase();
    const ringId = challenge?.anillo_id || challenge?.anilloId;

    const getRingConfig = () => {
        if (ringName.includes('agua') || ringId == 1) {
            return { color: COLOR_MAP.blue, icon: <Droplet size={20} strokeWidth={2.5} />, label: 'ANILLO DEL AGUA' };
        }
        if (ringName.includes('energi') || ringId == 2) {
            return { color: COLOR_MAP.amber, icon: <Zap size={20} strokeWidth={2.5} />, label: 'ANILLO DE LA ENERGÍA' };
        }
        if (ringName.includes('plastic') || ringId == 3) {
            return { color: COLOR_MAP.emerald, icon: <Hexagon size={20} strokeWidth={2.5} />, label: 'ANILLO DEL PLÁSTICO' };
        }
        if (ringName.includes('pantalla') || ringId == 4) {
            return { color: COLOR_MAP.violet, icon: <Cpu size={20} strokeWidth={2.5} />, label: 'ANILLO DE PANTALLAS' };
        }
        if (ringName.includes('ropa') || ringId == 5) {
            return { color: COLOR_MAP.rose, icon: <Shirt size={20} strokeWidth={2.5} />, label: 'ANILLO DE LA ROPA' };
        }
        // Default
        return { color: COLOR_MAP[sectorColor] ?? COLOR_MAP.blue, icon: <Droplet size={20} strokeWidth={2.5} />, label: challenge.sectorName ?? 'Reto del Sector' };
    };

    const ringConfig = getRingConfig();
    const c = ringConfig.color;
    const challengeType = challenge.type ?? 'options'; // options | open | slider | validate

    const renderOptionsGrid = () => (
        <div className="flex flex-col h-full mt-auto pb-2">
            <div className={`grid grid-cols-2 ${isCompact ? 'gap-x-2 gap-y-2' : 'gap-x-3 gap-y-4'} w-full flex-grow`}>
                {challenge.options?.map((opt, idx) => {
                    const originalStyle = OPTION_STYLES[idx];
                    // Mantener los iconos originales (Estrella, Hexágono, etc.)
                    const style = originalStyle;
                    const isSelected = selectedAnswer === opt;
                    return (
                        <div 
                            key={idx}
                            onClick={() => !readOnly && setSelectedAnswer(opt)}
                            className={`relative flex flex-col min-h-[110px] w-full group transition-transform ${readOnly ? '' : 'cursor-pointer active:scale-95'}`}
                        >
                            <div className={`absolute inset-0 top-1.5 rounded-xl ${style.dark} ${isSelected ? 'ring-4 ring-indigo-200' : ''}`} />
                            <div className={`relative flex flex-col h-[calc(100%-6px)] z-10 w-full drop-shadow-sm ${isSelected ? '-translate-y-1' : ''} transition-all`}>
                                <div className={`${isCompact ? 'h-[35px]' : 'h-[45px]'} w-full ${style.light} rounded-t-xl border-b border-[0.83px] ${style.borderDark} flex items-center justify-center`}>
                                    <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                                        {style.icon}
                                    </div>
                                </div>
                                <div className="flex-1 bg-stone-100 rounded-b-xl border-x border-b border-gray-300 px-2 py-1.5 flex items-center justify-center group-hover:bg-white transition-colors">
                                    <span className="text-stone-500 text-[9px] md:text-[10px] font-semibold text-center leading-snug line-clamp-3">
                                        {opt}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {!readOnly && (
                <button 
                    onClick={() => onApply?.(selectedAnswer)}
                    disabled={!selectedAnswer}
                    className={`mt-4 w-full py-3 rounded-xl font-bold uppercase tracking-widest text-white shadow-lg transition-all ${selectedAnswer ? `${c.base} active:scale-95` : 'bg-slate-300 cursor-not-allowed'}`}
                >
                    Confirmar Voto
                </button>
            )}
        </div>
    );

    const renderOpen = () => (
        <div className="flex flex-col flex-1 h-full pb-2">
            {/* Si NO es readOnly, significa que es el turno del jugador de INTERACTUAR (votar) */}
            {/* En preguntas abiertas, el que 'interactúa' es el validador, no el que habla */}
            {!readOnly ? (
                renderValidate()
            ) : (
                <div className="flex-1 flex flex-col justify-center items-center">
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-6 text-center text-amber-800 shadow-inner w-full">
                        <span className="text-3xl mb-4 block animate-pulse">🎤</span>
                        <h4 className="font-black uppercase tracking-widest text-sm mb-2">Tu turno de hablar</h4>
                        <p className="font-medium text-sm">
                            Responde a la pregunta en voz alta frente al grupo.
                        </p>
                    </div>
                    <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px] text-center">
                        Los demás sectores evaluarán tu respuesta
                    </div>
                </div>
            )}
        </div>
    );


    const renderSlider = () => (
        <div className="flex flex-col flex-1 items-center justify-center pb-4">
            <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                key={intensity}
                className="relative mt-auto mb-8"
            >
                <div className={`${c.base} text-white font-black text-5xl lg:text-6xl px-10 py-5 rounded-[2rem] shadow-[0_6px_0_0_rgba(0,0,0,0.15)]`}>
                    {intensity}{challenge.unit ?? '%'}
                </div>
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 ${c.base} rotate-45`} />
            </motion.div>

            {!readOnly ? (
                <div className="w-full mb-6">
                    <input
                        type="range"
                        min={challenge.sliderMin ?? 0}
                        max={challenge.sliderMax ?? 100}
                        step={challenge.sliderStep ?? 1}
                        value={intensity}
                        onChange={(e) => setIntensity(parseInt(e.target.value))}
                        className="w-full h-4 bg-slate-200 rounded-full appearance-none cursor-pointer transition-all"
                        style={{ background: `linear-gradient(to right, ${c.sliderColor} ${intensity}%, #e2e8f0 ${intensity}%)` }}
                    />
                    <div className="flex justify-between mt-3 px-1 text-[10px] font-black text-slate-400 tracking-widest uppercase">
                        <span>MÍN: {challenge.sliderMin ?? 0}</span>
                        <span>MÁX: {challenge.sliderMax ?? 100}</span>
                    </div>
                </div>
            ) : (
                <p className="text-slate-400 font-medium text-center uppercase tracking-widest text-[10px] mt-4">
                    El jugador está evaluando el impacto...
                </p>
            )}

            {!readOnly && (
                <button
                    onClick={() => onApply?.(intensity)}
                    className={`w-full py-4 ${c.base} text-white rounded-xl font-bold uppercase tracking-widest shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2 mt-auto`}
                >
                    Aplicar Medida {React.cloneElement(ringConfig.icon, { className: "w-5 h-5 text-yellow-300" })}
                </button>
            )}
        </div>
    );

    const renderValidate = () => (
        <div className="flex flex-col flex-1 h-full pb-2">
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 mb-4 relative mt-2">
                <div className={`absolute -top-4 -left-3 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm ${c.text}`}>
                    {ringConfig.icon}
                </div>
                <p className="text-slate-700 font-bold italic text-sm leading-relaxed mt-1 text-center">
                    {challenge.type === 'free' || challenge.type === 'open' || challenge.proposal === 'oral_response' 
                        ? '🗣️ El jugador está respondiendo en voz alta. ¿Cómo valoras su propuesta?' 
                        : `"${challenge.proposal ?? 'El sector propone una medida. Evalúala...'}"`}
                </p>

            </div>

            <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-[0.2em] mb-4">
                ¿Es esta medida viable y realista?
            </p>
            
            {!readOnly ? (
                <div className="space-y-3 mt-auto">
                    {VALIDATE_OPTIONS.map(({ key, icon, label, active, hover }) => (
                        <button 
                            key={key}
                            onClick={() => setSelectedAnswer(key)}
                            className={`w-full border-[2.5px] py-3.5 rounded-2xl flex items-center justify-center gap-3 font-black transition-all shadow-sm active:scale-95
                                ${selectedAnswer === key ? ((ringId && ringId <= 5) ? 'bg-amber-50 border-amber-500 text-amber-800' : active) : `bg-white border-slate-200 text-slate-500 ${hover}`}`}
                        >
                            {icon} {label}
                        </button>
                    ))}
                    <button 
                        onClick={() => onApply?.(selectedAnswer)}
                        disabled={!selectedAnswer}
                        className={`w-full py-3 mt-4 rounded-xl font-bold uppercase tracking-widest text-white shadow-lg transition-all ${selectedAnswer ? `${c.base} active:scale-95` : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        Confirmar Voto
                    </button>
                </div>
            ) : (
                <div className="flex-1 mt-auto flex items-center justify-center bg-slate-100 rounded-2xl min-h-[80px]">
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] animate-pulse">
                        El grupo está votando...
                    </p>
                </div>
            )}
        </div>
    );

    const RENDERERS = { 
        options: renderOptionsGrid, 
        open: renderOpen, 
        free: renderOpen, // Mismo comportamiento para ambos
        slider: renderSlider, 
        validate: renderValidate 
    };


    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${isCompact ? 'w-[20vw] h-[55vh]' : 'w-[24vw] lg:w-[22vw] h-[65vh]'} relative shrink-0`}
        >
            {/* Sombra 3D */}
            <div className={`absolute inset-0 top-[10px] ${c.base} rounded-[2rem]`} />

            {/* Tarjeta Principal */}
            <div className={`absolute inset-0 h-[calc(100%-10px)] bg-white rounded-[2rem] outline outline-[2.5px] outline-offset-[-2.5px] ${c.outline} flex flex-col p-6 overflow-hidden`}>
                <div className={`absolute bg-gradient-to-b ${c.gradient} inset-0 pointer-events-none rounded-[2rem] z-0`} />

                <div className="relative z-10 flex flex-col h-full">
                    {/* Header */}
                    <div className={`flex items-center justify-between ${isCompact ? 'mb-3' : 'mb-5'}`}>
                        <div className={`flex items-center gap-2 ${c.text} font-bold text-sm uppercase tracking-wider`}>
                            {ringConfig.icon} 
                            {ringConfig.label}
                        </div>
                        <div className="px-2.5 py-1 bg-neutral-100 rounded-md border border-stone-200">
                            <span className="text-stone-500 text-[9px] font-bold uppercase tracking-widest">
                                Turno {challenge.turn ?? '—'}
                            </span>
                        </div>
                    </div>

                    {/* Título y Descripción */}
                    <div className={`flex flex-col gap-2 ${challengeType === 'slider' ? (isCompact ? 'mb-4' : 'mb-8') : (isCompact ? 'mb-2' : 'mb-4')}`}>
                        <h2 className={`${isCompact ? 'text-[18px]' : 'text-[22px]'} text-slate-900 font-black tracking-tight leading-none`}>
                            {challenge.title ?? 'Título del Desafío'}
                        </h2>
                        {challenge.description && challenge.description !== challenge.title && (
                            <p className={`text-slate-500 font-medium leading-relaxed ${challengeType === 'validate' || challengeType === 'options' ? 'text-[12px]' : 'text-sm'}`}>
                                {challenge.description}
                            </p>
                        )}
                    </div>

                    {/* Contenido Dinámico */}
                    <div className="flex-1 flex flex-col min-h-0">
                        {(RENDERERS[challengeType] ?? RENDERERS.options)()}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
