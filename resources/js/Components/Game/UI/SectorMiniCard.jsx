import React from 'react';
import { motion } from 'framer-motion';
import { Users, Cpu, Shirt, FlaskConical, Tractor, Landmark, Hexagon, Zap, Info, Sparkles } from 'lucide-react';

/*
Este componente es utilizado en el modo local para mostrar los sectores.
Recibe como props el sector y el indice.
*/

const getRoleIcon = (iconName, id) => {
    if (id === 'tech') return <Cpu className="w-full h-full" strokeWidth={2.5} />;
    if (id === 'primario') return <Tractor className="w-full h-full" strokeWidth={2.5} />;
    if (id === 'legislativo') return <Landmark className="w-full h-full" strokeWidth={2.5} />;

    switch (iconName) {
        case 'Shirt': return <Shirt className="w-full h-full" strokeWidth={2.5} />;
        case 'FlaskConical': return <FlaskConical className="w-full h-full" strokeWidth={2.5} />;
        case 'Users': return <Users className="w-full h-full" strokeWidth={2.5} />;
        default: return <Hexagon className="w-full h-full" strokeWidth={2.5} />;
    }
};

// Colores de los sectores
export default function SectorMiniCard({ sector, index, isActive = false }) {
    const figmaColors = {
        'ciencia': { bg: 'bg-[#DEB8FF]', shadow: 'shadow-[0px_4px_0px_0px_rgba(150,64,255,1.0)]', textTitle: 'text-purple-600', iconClass: 'text-[#9640FF]' },
        'primario': { bg: 'bg-[#E2F1C3]', shadow: 'shadow-[0px_4px_0px_0px_rgba(101,132,55,1.0)]', textTitle: 'text-lime-700', iconClass: 'text-[#658437]' },
        'legislativo': { bg: 'bg-[#FFC2C2]', shadow: 'shadow-[0px_4px_0px_0px_rgba(208,0,0,1.0)]', textTitle: 'text-red-700', iconClass: 'text-[#D00000]' },
        'tech': { bg: 'bg-[#D6D5FF]', shadow: 'shadow-[0px_4px_0px_0px_rgba(67,64,255,1.0)]', textTitle: 'text-indigo-600', iconClass: 'text-[#4340FF]' },
        'textil': { bg: 'bg-[#FFE4C4]', shadow: 'shadow-[0px_4px_0px_0px_rgba(255,163,64,1.0)]', textTitle: 'text-orange-500', iconClass: 'text-[#FFA340]' },
        'ciudadania': { bg: 'bg-[#FFC9F2]', shadow: 'shadow-[0px_4px_0px_0px_rgba(255,58,219,1.0)]', textTitle: 'text-fuchsia-500', iconClass: 'text-[#FF3ADB]' },
    };

    const theme = figmaColors[sector.id] || figmaColors['tech'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
                opacity: 1, 
                y: isActive ? -10 : 0,
                scale: isActive ? 1.05 : 1,
            }}
            transition={{ delay: 0.1 * index }}
            className={`w-full h-full px-3 py-2 lg:px-4 lg:py-2.5 ${isActive ? 'bg-stone-50 ring-4 ring-amber-400' : theme.bg} rounded-3xl ${isActive ? 'shadow-xl' : theme.shadow} transition-all duration-300`}
        >
            <div className="flex flex-col justify-between h-full w-full">
                {/* Top: Icono + Tokens */}
                <div className="flex justify-between items-center w-full">
                    <div className="w-8 h-8 lg:w-9 lg:h-9 p-1.5 bg-white rounded-xl flex justify-center items-center shrink-0 shadow-sm">
                        <div className={`relative w-full h-full ${theme.iconClass}`}>
                            {getRoleIcon(sector.iconName, sector.id)}
                        </div>
                    </div>

                    <div className="w-8 h-8 lg:w-9 lg:h-9 bg-[#87AF4C] rounded-full shadow-[0px_2px_0px_0px_rgba(101,132,55,1.00)] inline-flex justify-center items-center flex-shrink-0">
                        <span className="text-white text-base lg:text-lg font-extrabold leading-none">
                            {sector.tokens}
                        </span>
                    </div>
                </div>

                {/* Bottom: Info + Habilidad */}
                <div className="flex flex-col gap-0.5 mt-auto">
                    <div className={`${theme.textTitle} text-[10px] lg:text-xs font-black uppercase truncate tracking-tight leading-none`}>
                        {sector.name}
                    </div>
                    
                    <div className="text-slate-500 text-[8px] font-bold uppercase truncate opacity-70 mb-1">
                        {sector.playerName ? sector.playerName : '...'}
                    </div>

                    {/* Badge de Habilidad Compacta */}
                    <div className="flex items-center gap-1.5 bg-white/40 px-2 py-1 rounded-xl border border-black/5 backdrop-blur-sm">
                        <Zap className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                        <span className="text-[8px] font-black truncate flex-1 text-slate-700 uppercase tracking-tighter">
                            {sector.activeDesc.split(':')[0]}
                        </span>
                        <div className="text-[8px] font-black bg-amber-500/10 text-amber-700 px-1 rounded-md shrink-0">
                            {sector.activeCost}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
