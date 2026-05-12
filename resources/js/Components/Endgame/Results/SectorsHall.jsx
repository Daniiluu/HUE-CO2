import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, ArrowRight } from 'lucide-react';
import { StatsModal } from './StatsModal';

export default function SectorsHall({ sectors, allSectors, onBackToPortal }) {
    const [showStats, setShowStats] = useState(false);
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 1.0,
            }
        }
    };

    const item = {
        hidden: { opacity: 0, x: 20 },
        show: { opacity: 1, x: 0 }
    };

    return (
        <div className="flex-1 flex flex-col gap-4 relative z-10 lg:pl-4">
            <motion.h3 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="text-xs font-black uppercase tracking-[0.2em] text-[#a8a29e] mb-4 px-2 flex items-center gap-2"
            >
                <Award className="w-5 h-5" /> Cuadro de Honor Cooperativo
            </motion.h3>

            <motion.div 
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-4"
            >
                {sectors.map((sector) => (
                    <motion.div 
                        key={sector.id} 
                        variants={item}
                        whileHover={{ x: 5 }}
                        className="bg-white border-2 border-slate-100 rounded-[2rem] p-5 flex items-center gap-6 shadow-sm hover:shadow-md hover:border-[#84cc16] transition-all group"
                    >
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${sector.border} shadow-inner bg-white group-hover:scale-110 transition-transform`}>
                            {sector.icon && React.isValidElement(sector.icon) ? React.cloneElement(sector.icon, { className: "w-8 h-8" }) : null}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-black text-xl text-[#1c1917] leading-none">{sector.name}</span>
                                {sector.isMVP && <span className="bg-[#84cc16] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">MVP</span>}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">{sector.role}</div>
                        </div>
                        <div className="text-right">
                            <div className="font-black text-lg leading-none mb-1 tabular-nums">{sector.stat}</div>
                            <div className="text-[10px] font-black uppercase tracking-tighter opacity-40">{sector.label}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Botones de Acción Final */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.5 }}
                className="mt-auto grid grid-cols-2 gap-4 pt-6"
            >
                <button 
                    onClick={() => setShowStats(true)}
                    className="bg-white border-2 border-slate-200 text-[#78716c] py-4 rounded-2xl font-black text-sm hover:border-[#1c1917] hover:text-[#1c1917] transition-all active:scale-95"
                >
                    Ver Gráficas
                </button>
                <button 
                    onClick={onBackToPortal} 
                    className="bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-black hover:scale-[1.02] active:scale-[0.95] transition-all flex items-center justify-center gap-2"
                >
                    Finalizar <ArrowRight className="w-4 h-4" />
                </button>
            </motion.div>

            <StatsModal 
                isOpen={showStats} 
                onClose={() => setShowStats(false)} 
                allSectors={allSectors} 
            />
        </div>
    );
}
