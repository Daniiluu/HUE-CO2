import React from 'react';
import { motion } from 'framer-motion';
import { 
    Users, Database, Shirt, FlaskConical, Sprout, Landmark, Hexagon 
} from 'lucide-react';

const SECTOR_CONFIG = {
    tech:       { color: '#4340FF', bg: 'bg-[#D6D5FF]', border: 'border-[#4340FF]', icon: <Database className="w-full h-full" strokeWidth={2.5} /> },
    primario:   { color: '#658437', bg: 'bg-[#E2F1C3]', border: 'border-[#658437]', icon: <Sprout className="w-full h-full" strokeWidth={2.5} /> },
    publico:    { color: '#D00000', bg: 'bg-[#FFC2C2]', border: 'border-[#D00000]', icon: <Landmark className="w-full h-full" strokeWidth={2.5} /> },
    textil:     { color: '#FFA340', bg: 'bg-[#FFE4C4]', border: 'border-[#FFA340]', icon: <Shirt className="w-full h-full" strokeWidth={2.5} /> },
    ciencia:    { color: '#9640FF', bg: 'bg-[#DEB8FF]', border: 'border-[#9640FF]', icon: <FlaskConical className="w-full h-full" strokeWidth={2.5} /> },
    ciudadania: { color: '#FF3ADB', bg: 'bg-[#FFC9F2]', border: 'border-[#FF3ADB]', icon: <Users className="w-full h-full" strokeWidth={2.5} /> },
};

const RING_RADII = [80, 115, 150, 185, 220]; // Radios para los 5 anillos

export default function OrbitalBoard({ sectors, activeSectorId = null, visualPhase = 1 }) {

    // Ordenar sectores en sentido horario (Lógica oficial)
    // Público (Top) -> Ciudadanía -> Textil -> Ciencia -> Tech -> Primario
    const CLOCKWISE_ORDER = ['publico', 'ciudadania', 'textil', 'ciencia', 'tech', 'primario'];
    const sortedSectors = [...sectors].sort((a, b) => {
        return CLOCKWISE_ORDER.indexOf(a.id) - CLOCKWISE_ORDER.indexOf(b.id);
    });

    return (
        <div 
            className="relative flex items-center justify-center shrink-0"
            style={{ width: 'min(50vw, 60vh)', height: 'min(50vw, 60vh)' }}
        >
            {/* Resplandor de fondo */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_#e9d5ff_0%,_transparent_70%)] opacity-10" />

            <div className="relative w-full h-full flex items-center justify-center rounded-full bg-[radial-gradient(circle,_#D4AAE2_20%,_#642E7E_100%)] shadow-2xl border-[12px] border-white/10">
                
                {/* SVG para los Anillos segmentados */}
                <svg viewBox="0 0 500 500" className="absolute inset-0 w-full h-full transform -rotate-90">
                    {/* Anillos base decorativos */}
                    {RING_RADII.map((r, ringIdx) => (
                        <circle key={`bg-ring-${r}`} cx="250" cy="250" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                    ))}
                    
                    {/* SECCIONES POR ANILLO */}
                    {RING_RADII.map((r, ringIdx) => {
                        const ringPhase = ringIdx + 1;
                        // Solo mostramos anillos hasta la fase actual (o todos si es results)
                        if (ringPhase > visualPhase) return null;

                        return (
                            <g key={`ring-group-${ringIdx}`}>
                                {sortedSectors.map((s, i) => {
                                    const totalSectors = 6;
                                    const arcLength = 360 / totalSectors;
                                    const gap = 3;
                                    const startAngle = (i * arcLength) + (gap / 2);
                                    
                                    const circum = 2 * Math.PI * r;
                                    const dashArray = (arcLength / 360) * circum - (gap * (circum / 360));
                                    const dashOffset = (startAngle / 360) * circum;

                                    // ¿Ha completado este sector este anillo específico?
                                    // Usamos el historial de resultados por anillo enviado por el servidor
                                    const isComplete = s.ringResults ? s.ringResults[ringIdx] : ((s.points || 0) >= ringPhase);
                                    const progress = isComplete ? 1 : 0;
                                    const progressDashArray = progress * dashArray;

                                    const isActive = s.id === activeSectorId && ringPhase === visualPhase;
                                    const config = SECTOR_CONFIG[s.id] || { color: '#ffffff' };

                                    return (
                                        <g key={`arc-${ringIdx}-${s.id}`}>
                                            {/* Fondo del segmento */}
                                            <circle 
                                                cx="250" cy="250" r={r} 
                                                fill="none" 
                                                stroke="rgba(255,255,255,0.15)" 
                                                strokeWidth={isActive ? 14 : 10}
                                                strokeDasharray={`${dashArray} ${circum - dashArray}`}
                                                strokeDashoffset={-dashOffset}
                                                strokeLinecap="round"
                                            />
                                            {/* Progreso del segmento */}
                                            <motion.circle 
                                                initial={{ strokeDasharray: `0 ${circum}` }}
                                                animate={{ 
                                                    strokeDasharray: `${progressDashArray} ${circum - progressDashArray}`,
                                                    strokeWidth: isComplete ? (isActive ? 16 : 12) : (isActive ? 14 : 10)
                                                }}
                                                transition={{ duration: 1.5, delay: i * 0.1, ease: "circOut" }}
                                                cx="250" cy="250" r={r} 
                                                fill="none" 
                                                stroke={isActive ? "#FFD700" : config.color} 
                                                strokeWidth={isActive ? 14 : 10}
                                                strokeDashoffset={-dashOffset}
                                                strokeLinecap="round"
                                                className={isComplete ? (isActive ? "drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]" : `drop-shadow-[0_0_8px_${config.color}]`) : ""}
                                            />
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>

                {/* Tierra en el Centro */}
                <div className="relative z-10 w-[18%] h-[18%] flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl animate-pulse" />
                    <motion.img
                        animate={{ rotate: 360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                        src="/images/earth_icon.png"
                        alt="Tierra"
                        className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    />
                </div>

                {/* NODOS (Iconos de Sectores) */}
                {sortedSectors.map((p, i) => {
                    const totalSectors = 6;
                    const arcLength = 360 / totalSectors;
                    const angle = (i * arcLength + arcLength / 2) * (Math.PI / 180);

                    // Los iconos se sitúan fuera del último anillo
                    const radiusPercent = 48; 
                    const x = 50 + radiusPercent * Math.cos(angle);
                    const y = 50 + radiusPercent * Math.sin(angle);

                    const isActive = p.id === activeSectorId;
                    const config = SECTOR_CONFIG[p.id] || { bg: 'bg-slate-200', border: 'border-slate-400', icon: <Hexagon /> };

                    return (
                        <motion.div
                            key={p.id}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`absolute w-[4.5vw] h-[4.5vw] min-w-[45px] min-h-[45px] -ml-[2.25vw] -mt-[2.25vw] rounded-full ${config.bg} flex items-center justify-center z-20 shadow-xl border-4 ${isActive ? 'border-yellow-400 scale-125 z-30' : config.border} transition-all duration-500`}
                            style={{ left: `${x}%`, top: `${y}%` }}
                        >
                            <div className={`w-[60%] h-[60%] ${isActive ? 'text-yellow-600' : ''}`}>
                                {config.icon}
                            </div>
                            
                            {/* Halo de actividad */}
                            {isActive && (
                                <motion.div 
                                    animate={{ scale: [1.2, 1.5, 1.2], opacity: [0.3, 0.1, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 rounded-full bg-yellow-400 -z-10" 
                                />
                            )}
                        </motion.div>
                    )
                })}
            </div>
        </div>
    );
}
