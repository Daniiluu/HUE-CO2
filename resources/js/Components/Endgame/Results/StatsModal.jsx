import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, BarChart3 } from 'lucide-react';

export function StatsModal({ isOpen, onClose, allSectors }) {
    if (!isOpen) return null;

    // Encontrar el valor máximo para escalar las barras
    const maxPoints = Math.max(...allSectors.map(s => s.points || 0), 1);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#87AF4C] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#87AF4C]/20">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-[#1c1917]">Estadísticas Globales</h3>
                                <p className="text-sm font-bold text-[#87AF4C] uppercase tracking-wider">Distribución de Puntos por Sector</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center hover:border-[#1c1917] transition-all active:scale-90"
                        >
                            <X className="w-6 h-6 text-slate-500" />
                        </button>
                    </div>

                    {/* Chart Content */}
                    <div className="p-8 md:p-12 overflow-y-auto">
                        <div className="space-y-8">
                            {allSectors.sort((a, b) => b.points - a.points).map((sector, index) => (
                                <motion.div 
                                    key={sector.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative"
                                >
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
                                                {sector.icon}
                                            </div>
                                            <div>
                                                <span className="font-black text-slate-800">{sector.name}</span>
                                                <span className="ml-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">{sector.role}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {index === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
                                            <span className="text-xl font-black text-[#1c1917]">{sector.points} pts</span>
                                        </div>
                                    </div>
                                    
                                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(sector.points / maxPoints) * 100}%` }}
                                            transition={{ delay: 0.5 + index * 0.1, duration: 1, ease: "easeOut" }}
                                            className={`h-full rounded-full bg-gradient-to-r from-[#87AF4C] to-[#a3cf62] shadow-lg relative`}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
                        <p className="text-sm text-slate-500 font-medium italic">
                            "El esfuerzo colectivo es la única vía hacia un futuro sostenible."
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
