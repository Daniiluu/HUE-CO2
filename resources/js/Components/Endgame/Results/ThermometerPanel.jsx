import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Snowflake, ArrowDownCircle, TrendingUp, Minus } from 'lucide-react';

export default function ThermometerPanel({ outcome, current, displayTemp, displayHeating, displayReduction }) {
    return (
        <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
            className="flex-1 bg-white border-4 border-slate-100 rounded-[3.5rem] p-10 shadow-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]"
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#f5f5f4] rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none" />

            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a29e] mb-12 text-center">Informe del Termómetro Global</h3>

            {/* Termómetro Horizontal Optimizado */}
            <div className="flex items-center gap-6 mb-12 w-full max-w-md relative z-10">
                <div className="flex flex-col items-center gap-1">
                    <Flame className="w-8 h-8 text-rose-400" />
                    <span className="font-black text-rose-500 text-[10px] uppercase tracking-tighter">+1.0°C</span>
                </div>

                <div className="flex-1 h-12 bg-slate-50 rounded-full overflow-hidden border-2 border-slate-200 shadow-inner relative flex">
                    <div className="absolute inset-0 flex justify-evenly items-center w-full z-10 pointer-events-none opacity-10">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="w-[1px] h-full bg-slate-900"></div>
                        ))}
                    </div>

                    <div className="h-full w-full flex relative">
                        {/* Llenado dinámico con Framer Motion: de -1.0 (0%) a +1.0 (100%) */}
                        <motion.div 
                            initial={{ width: "50%" }}
                            animate={{ width: `${Math.max(0, Math.min(100, (displayTemp + 1.0) * 50))}%` }}
                            transition={{ delay: 1.2, duration: 1.5, ease: "circOut" }}
                            className={`h-full shadow-[0_0_20px_rgba(0,0,0,0.1)] ${outcome === 'defeat' ? 'bg-rose-500' : outcome === 'neutral' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        />
                    </div>

                    {/* Línea de equilibrio (0.0°C) en el centro exacto */}
                    <div className="absolute top-0 bottom-0 left-[50%] w-[3px] bg-slate-900/10 z-20 border-x border-slate-400/20" />
                </div>

                <div className="flex-col flex items-center gap-1">
                    <Snowflake className="w-8 h-8 text-sky-400" />
                    <span className="font-black text-sky-500 text-[10px] uppercase tracking-tighter">-1.0°C</span>
                </div>
            </div>

            {/* Estadísticas Clave: 1 Principal + 2 Secundarias */}
            <div className="flex flex-col gap-4 w-full relative z-10">
                {/* Temperatura Final (Grande) */}
                <div className={`rounded-3xl p-6 text-center shadow-sm border-2 transition-all hover:scale-[1.02] duration-300 ${current.bgColor} ${current.statusColor.replace('text-', 'border-').replace('600', '200')}`}>
                    <div className={`text-6xl font-black mb-1 tabular-nums tracking-tighter ${current.statusColor}`}>
                        {displayTemp > 0 ? '+' : ''}{displayTemp.toFixed(1)}°C
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a29e]">Temperatura Final (Neto)</div>
                </div>

                {/* Desglose: Aumentado vs Reducido */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-rose-50 border-2 border-rose-100 rounded-3xl p-5 text-center">
                        <div className="text-3xl font-black text-rose-600 mb-1 tabular-nums tracking-tighter flex items-center justify-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            +{Math.abs(displayHeating).toFixed(1)}°C
                        </div>
                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-rose-400/70">Calentamiento Total</div>
                    </div>

                    <div className="bg-emerald-50 border-2 border-emerald-100 rounded-3xl p-5 text-center">
                        <div className="text-3xl font-black text-emerald-600 mb-1 tabular-nums tracking-tighter flex items-center justify-center gap-2">
                            <ArrowDownCircle className="w-5 h-5" />
                            -{Math.abs(displayReduction).toFixed(1)}°C
                        </div>
                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-emerald-400/70">Reducción Lograda</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
