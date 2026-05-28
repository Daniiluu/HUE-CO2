import React from 'react';
import { Award, Users, Recycle, Sparkles, Lightbulb, Cpu, ShieldCheck, AlertTriangle, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Importación de sub-componentes especializados
import ResultsHeader from './Results/ResultsHeader';
import ThermometerPanel from './Results/ThermometerPanel';
import SectorsHall from './Results/SectorsHall';

// Configuración de datos de juego (fuera del componente para mayor limpieza)
const GAME_RESULTS_CONFIG = {
    victory: {
        title: "¡Equilibrio Logrado!",
        subtitle: "Habéis demostrado que la cooperación global puede enfriar el planeta. El futuro es sostenible.",
        finalTemp: -0.2,
        reduction: 1.2,
        statusColor: "text-emerald-600",
        bgColor: "bg-emerald-50",
        accentColor: "bg-emerald-500",
        landColor: "bg-emerald-400",
        icon: <Sparkles className="text-amber-400 w-12 h-12" />,
        tag: "MISIÓN COMPLETADA"
    },
    neutral: {
        title: "Mantenimiento Crítico",
        subtitle: "El planeta no ha empeorado, pero tampoco ha mejorado. Estamos en un equilibrio frágil.",
        finalTemp: 0.5,
        reduction: 0.0,
        statusColor: "text-amber-600",
        bgColor: "bg-amber-50",
        accentColor: "bg-amber-400",
        landColor: "bg-yellow-200",
        icon: <Minus className="text-amber-500 w-12 h-12" />,
        tag: "SIN CAMBIOS"
    },
    defeat: {
        title: "Colapso Climático",
        subtitle: "La temperatura ha superado los límites de seguridad. La falta de consenso ha pasado factura.",
        finalTemp: 1.0,
        reduction: -1.0,
        statusColor: "text-rose-600",
        bgColor: "bg-rose-50",
        accentColor: "bg-rose-500",
        landColor: "bg-amber-800",
        icon: <AlertTriangle className="text-rose-500 w-12 h-12" />,
        tag: "LÍMITE SUPERADO"
    }
};

const getRoleIcon = (role) => {
    switch (role) {
        case 'Motor Social': return <Users />;
        case 'El Analista': return <Cpu />;
        case 'El Innovador': return <Lightbulb />;
        case 'El Regulador': return <ShieldCheck />;
        case 'El Regenerador': return <Recycle />;
        default: return <Award />;
    }
};

export default function EndgameResults({
    outcome = 'victory',
    finalTemp,
    totalHeating,
    totalReduction,
    playerStats,
    onBackToPortal
}) {
    const current = GAME_RESULTS_CONFIG[outcome];
    const displayTemp = finalTemp ?? current.finalTemp;
    
    // Stats por defecto si no hay reales
    const defaultSectors = [
        { id: 'ciudadania', name: 'Ciudadanía', role: 'Motor Social', icon: <Users />, border: 'border-violet-300', stat: '42 ET Generados', label: 'Máxima Energía', isMVP: true },
        { id: 'tech', name: 'EcoTech', role: 'El Analista', icon: <Cpu />, border: 'border-indigo-300', stat: '5 Crisis Evitadas', label: 'Mejor Prevención' },
        { id: 'ciencia', name: 'Ciencia e I+D', role: 'El Innovador', icon: <Lightbulb />, border: 'border-cyan-300', stat: '3 Anillos Liderados', label: 'Gran Innovador' },
    ];
    
    // Si no vienen los totales reales (modo offline), usamos el placeholder basado en el finalTemp
    const displayHeating = totalHeating !== undefined ? totalHeating : (displayTemp > 0 ? displayTemp : 0);
    const displayReduction = totalReduction !== undefined ? totalReduction : (displayTemp < 0 ? Math.abs(displayTemp) : 0);
    
    // 1. Preparar TODOS los sectores para gráficas
    const allSectors = playerStats ? playerStats.map(p => ({
        ...p,
        icon: getRoleIcon(p.role),
        border: 'border-slate-300',
        points: parseInt(p.stat) || 0
    })) : defaultSectors.map(s => ({ ...s, points: parseInt(s.stat) || 0 }));

    // 2. Ordenar y filtrar para el Top 3 (Cuadro de Honor)
    const sectorsToDisplay = [...allSectors]
        .sort((a, b) => b.points - a.points)
        .slice(0, 3);

    return (
        <div className="min-h-full bg-[#fafaf9] font-sans text-[#44403c] flex flex-col items-center overflow-y-visible relative p-4 md:p-8 pb-32">
            {/* Fondo Dinámico Optimizado (Capa de resplandor sobre el bg base) */}
            <div className="absolute inset-0 pointer-events-none z-0 transition-all duration-1000 opacity-40"
                style={{
                    background: `radial-gradient(circle at 50% 0%, ${outcome === 'victory' ? '#6ee7b7' : outcome === 'neutral' ? '#fcd34d' : '#fb7185'} 0%, transparent 80%)`
                }}
            />
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />

            <AnimatePresence mode="wait">
                <motion.div
                    key={outcome}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full max-w-7xl flex flex-col items-center relative z-10"
                >
                    <ResultsHeader current={current} />

                    <main className="w-full flex flex-col lg:flex-row gap-8 mt-12 mb-16 relative z-10">
                        <ThermometerPanel 
                            outcome={outcome} 
                            current={current} 
                            displayTemp={displayTemp} 
                            displayHeating={displayHeating}
                            displayReduction={displayReduction} 
                        />

                        <SectorsHall
                            sectors={sectorsToDisplay}
                            allSectors={allSectors}
                            onBackToPortal={onBackToPortal}
                        />
                    </main>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
