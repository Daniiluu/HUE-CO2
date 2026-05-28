import React from 'react';
import { History, Calendar, Thermometer, Award, ArrowRight } from 'lucide-react';

export default function MatchHistory({ history = [], onViewDetails }) {
    return (
        <div className="w-full max-w-5xl mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
            <div className="flex items-center gap-3 mb-6 px-2">
                <div className="w-10 h-10 bg-stone-200 rounded-xl flex items-center justify-center text-stone-600 shadow-inner">
                    <History className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-black text-[#1c1917] tracking-tight">Historial de Partidas</h3>
            </div>

            <div className="bg-white border-4 border-[#e7e5e4] rounded-[2rem] shadow-lg overflow-hidden">
                {history.length === 0 ? (
                    <div className="p-10 text-center text-stone-400 font-bold">
                        Aún no has jugado ninguna partida. ¡Crea o únete a una para empezar!
                    </div>
                ) : (
                    history.map((match, index) => (
                        <div
                            key={`${match.id}-${index}`}
                            className={`p-6 flex flex-col md:flex-row items-center justify-between gap-6 ${index !== history.length - 1 ? 'border-b-4 border-[#f5f5f4]' : ''
                                } hover:bg-[#fafaf9] transition-colors group`}
                        >
                            {/* Izquierda: Icono y Título */}
                            <div className="flex items-center gap-5 w-full md:w-auto">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-4 shadow-sm group-hover:scale-110 transition-transform ${match.outcome === 'victory' ? 'bg-emerald-50 border-emerald-200 text-emerald-500' :
                                        match.outcome === 'neutral' ? 'bg-amber-50 border-amber-200 text-amber-500' :
                                            'bg-rose-50 border-rose-200 text-rose-500'
                                    }`}>
                                    <Thermometer className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="font-black text-xl text-[#1c1917] mb-1">
                                        {match.outcome === 'victory' ? 'Éxito Global' : match.outcome === 'neutral' ? 'Equilibrio Frágil' : 'Colapso Climático'}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#a8a29e] uppercase tracking-widest">
                                        <Calendar className="w-3.5 h-3.5" /> {match.date}
                                    </div>
                                </div>
                            </div>

                            {/* Derecha: Estadísticas y Botón */}
                            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end bg-[#f5f5f4] md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none">
                                <div className="text-center md:text-right">
                                    <div className="text-[10px] font-black uppercase text-[#a8a29e] tracking-widest mb-1">Rol Jugado</div>
                                    <div className="font-bold text-[#57534e] flex items-center justify-center md:justify-end gap-1.5">
                                        <Award className="w-4 h-4 text-[#87AF4C]" /> {match.role}
                                    </div>
                                </div>

                                <div className="w-1 h-10 bg-[#e7e5e4] rounded-full hidden md:block"></div>

                                <div className="text-center md:text-right w-24">
                                    <div className="text-[10px] font-black uppercase text-[#a8a29e] tracking-widest mb-1">Temp. Final</div>
                                    <div className={`font-black text-2xl tabular-nums leading-none ${match.outcome === 'victory' ? 'text-emerald-500' :
                                            match.outcome === 'neutral' ? 'text-amber-500' :
                                                'text-rose-500'
                                        }`}>
                                        {match.finalTemp > 0 ? '+' : ''}{match.finalTemp.toFixed(1)}°C
                                    </div>
                                </div>

                                <button 
                                    onClick={() => onViewDetails && onViewDetails(match.id)}
                                    className="w-12 h-12 rounded-xl bg-white border-2 border-[#e7e5e4] hover:border-[#1c1917] hover:bg-[#1c1917] hover:text-white flex items-center justify-center text-[#a8a29e] transition-all shadow-sm active:scale-95 cursor-pointer"
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}