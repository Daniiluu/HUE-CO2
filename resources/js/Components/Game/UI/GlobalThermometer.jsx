import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Snowflake } from 'lucide-react';

export default function GlobalThermometer({ temperature = 0.5 }) {
    // Normalizamos el valor para el visual (de -1.0 a +1.0 para que 0 sea el centro)
    const fillPercent = Math.max(0, Math.min(100, (temperature + 1.0) * 50));

    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-[4vw] min-w-[50px] h-[60vh] bg-white rounded-full p-2 flex flex-col items-center justify-between shadow-md border border-slate-100 shrink-0 z-20"
        >
            <div className="flex flex-col items-center gap-1 mt-2">
                <Flame className="text-rose-500 w-8 h-8" strokeWidth={2.5} />
                <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">+1.0°</span>
            </div>

            <div className="w-10 flex-1 bg-slate-50 rounded-full my-4 flex flex-col relative border border-slate-100 overflow-hidden">
                {/* Llenado reactivo */}
                <motion.div 
                    initial={{ height: "50%" }}
                    animate={{ height: `${fillPercent}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                    className={`absolute bottom-0 left-0 right-0 ${temperature > 0.7 ? 'bg-rose-500' : temperature > 0.2 ? 'bg-amber-400' : 'bg-sky-400'}`}
                />
                
                <div className="absolute inset-0 z-10 pointer-events-none opacity-20">
                    {[5, 10, 15, 20, 25, 30, 35, 40, 45, 55, 60, 65, 70, 75, 80, 85, 90, 95].map((pos) => (
                        <div 
                            key={pos} 
                            className={`absolute left-1/2 -translate-x-1/2 h-[1px] bg-slate-900 ${pos % 10 === 0 ? 'w-6 opacity-100' : 'w-3 opacity-50'}`}
                            style={{ bottom: `${pos}%` }}
                        />
                    ))}
                </div>

                {/* Línea de equilibrio (0.0°C) */}
                <div className="absolute bottom-[50%] left-0 right-0 h-[2px] bg-slate-900/20 z-20 border-t border-dashed border-slate-400" title="Equilibrio" />
            </div>

            <div className="flex flex-col items-center gap-1 mb-2">
                <span className="text-[9px] font-black text-sky-500 uppercase tracking-tighter">-1.0°</span>
                <Snowflake className="text-sky-500 w-8 h-8" strokeWidth={2.5} />
            </div>
        </motion.div>
    );
}
