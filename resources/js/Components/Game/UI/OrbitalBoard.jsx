import React from 'react';
import { motion } from 'framer-motion';
import { 
    Users, Cpu, Shirt, FlaskConical, Tractor, Scale, Hexagon 
} from 'lucide-react';

const getRoleIcon = (iconName, id) => {
    if (id === 'tech') return <Cpu className="w-full h-full" />;
    if (id === 'primario') return <Tractor className="w-full h-full" />;
    if (id === 'publico') return <Scale className="w-full h-full" />;

    switch (iconName) {
        case 'Shirt': return <Shirt className="w-full h-full" />;
        case 'FlaskConical': return <FlaskConical className="w-full h-full" />;
        case 'Users': return <Users className="w-full h-full" />;
        default: return <Hexagon className="w-full h-full" />;
    }
};

export default function OrbitalBoard({ sectors, turnNumber = 1, activeSectorId = null, visualPhase = 1 }) {

    // Ordenar sectores en sentido horario para que coincidan con la lógica del servidor
    const CLOCKWISE_ORDER = ['publico', 'ciudadania', 'textil', 'ciencia', 'tech', 'primario'];
    const sortedSectors = [...sectors].sort((a, b) => {
        return CLOCKWISE_ORDER.indexOf(a.id) - CLOCKWISE_ORDER.indexOf(b.id);
    });

    return (
        <div 
            className="relative flex items-center justify-center shrink-0"
            style={{ width: 'min(50vw, 60vh)', height: 'min(50vw, 60vh)' }}
        >
            {/* Fondo estático (sin pulse para ahorrar CPU) */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_#e9d5ff_0%,_transparent_70%)] opacity-20" />

            <div className="relative w-full h-full flex items-center justify-center rounded-full bg-[radial-gradient(circle,_#D4AAE2_20%,_#642E7E_100%)] shadow-xl border-8 border-white/20">
                
                {/* SVG para los Anillos segmentados */}
                <svg viewBox="0 0 500 500" className="absolute inset-0 w-full h-full transform -rotate-90">
                    {/* Anillos decorativos de fondo */}
                    <circle cx="250" cy="250" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <circle cx="250" cy="250" r="115" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <circle cx="250" cy="250" r="150" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <circle cx="250" cy="250" r="185" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    
                    {/* Anillo base (blanco tenue) */}
                    <circle cx="250" cy="250" r="220" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                    
                    {/* SECCIONES DEL ANILLO */}
                    {sortedSectors.map((s, i) => {
                        const totalSectors = sortedSectors.length || 1;
                        const arcLength = 360 / totalSectors;
                        const gap = 4;
                        const startAngle = (i * arcLength) + (gap / 2);
                        const endAngle = ((i + 1) * arcLength) - (gap / 2);
                        
                        const r = 220;
                        const circum = 2 * Math.PI * r;
                        const dashArray = (arcLength / 360) * circum;
                        const dashOffset = (startAngle / 360) * circum;

                        const progress = Math.min((s.points || 0) / 6, 1);
                        const progressDashArray = progress * dashArray;

                        const isActive = s.id === activeSectorId;

                        return (
                            <g key={`arc-${s.id}`}>
                                <circle 
                                    cx="250" cy="250" r={r} 
                                    fill="none" 
                                    stroke="rgba(255,255,255,0.3)" 
                                    strokeWidth={isActive ? 12 : 8}
                                    strokeDasharray={`${dashArray} ${circum - dashArray}`}
                                    strokeDashoffset={-dashOffset}
                                    strokeLinecap="round"
                                />
                                <motion.circle 
                                    initial={{ strokeDasharray: `0 ${circum}` }}
                                    animate={{ strokeDasharray: `${progressDashArray} ${circum - progressDashArray}` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    cx="250" cy="250" r={r} 
                                    fill="none" 
                                    stroke={isActive ? "#fbbf24" : "#60a5fa"} 
                                    strokeWidth={isActive ? 12 : 8}
                                    strokeDashoffset={-dashOffset}
                                    strokeLinecap="round"
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Tierra en el Centro (Simplificada) */}
                <motion.img
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    src="/images/earth_icon.png"
                    alt="Tierra"
                    className="z-10 w-[8vw] h-[8vw] min-w-[80px] min-h-[80px] object-contain shadow-inner"
                />

                {/* NODOS ORBITANDO */}
                {sortedSectors.map((p, i) => {
                    const totalSectors = sortedSectors.length || 1;
                    const arcLength = 360 / totalSectors;
                    const angle = (i * arcLength + arcLength / 2) * (Math.PI / 180);

                    const radiusPercent = 44 - ((visualPhase - 1) * 7); 
                    const x = 50 + radiusPercent * Math.cos(angle);
                    const y = 50 + radiusPercent * Math.sin(angle);

                    const isActive = p.id === activeSectorId;

                    return (
                        <motion.div
                            key={p.id}
                            animate={{ 
                                scale: isActive ? 1.15 : 1,
                            }}
                            className={`absolute w-[3.5vw] h-[3.5vw] min-w-[40px] min-h-[40px] -ml-[1.75vw] -mt-[1.75vw] rounded-full ${p.bg} ${p.text} flex items-center justify-center z-20 shadow-md border-2 ${isActive ? 'border-yellow-400' : p.border} transition-all duration-500`}
                            style={{ left: `${x}%`, top: `${y}%` }}
                        >
                            <div className="w-[60%] h-[60%]">
                                {getRoleIcon(p.iconName, p.id)}
                            </div>
                            
                            {/* Halo estático para evitar parpadeos pesados */}
                            {isActive && (
                                <div className="absolute inset-0 rounded-full border-4 border-yellow-400 opacity-30 scale-125" />
                            )}
                        </motion.div>
                    )
                })}
            </div>
        </div>
    );
}
