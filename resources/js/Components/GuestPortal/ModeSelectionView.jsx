import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Users, Crown, Globe } from 'lucide-react';

export function ModeSelectionView({ onBack, onSelectMode, isLoading = false, hideSolo = false }) {
    return (
        <motion.div 
            initial={{ opacity: 0, x: 20, y: 10 }} 
            animate={{ opacity: 1, x: 0, y: 0 }} 
            exit={{ opacity: 0, x: -20, y: -10 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            style={{ willChange: "transform, opacity" }}
            className="w-full max-w-4xl"
        >
            <button 
                onClick={onBack} 
                className="mb-6 text-[#a8a29e] hover:text-[#1c1917] flex items-center gap-1 font-bold text-sm"
            >
                <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <h2 className="text-4xl font-black mb-2 text-center text-[#1c1917]">¿Cuántos vais a jugar?</h2>
            <p className="text-center text-[#87AF4C] font-medium mb-10">Los 6 sectores siempre estarán presentes. Elige cómo repartirlos.</p>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${hideSolo ? 'lg:grid-cols-3 max-w-3xl mx-auto' : 'lg:grid-cols-4'} gap-4`}>
                {!hideSolo && (
                    <button 
                        onClick={() => onSelectMode('solo')} 
                        disabled={isLoading}
                        className={`bg-white border-4 border-[#e7e5e4] p-6 rounded-[2.5rem] text-left hover:border-[#16a34a] hover:bg-[#f0fdf4] transition-all group shadow-sm hover:shadow-xl flex flex-col items-start h-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="w-14 h-14 bg-[#16a34a]/10 text-[#16a34a] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform flex-shrink-0">
                            <User className="w-8 h-8" />
                        </div>
                        <h3 className="font-black text-2xl mb-2">1 Jugador</h3>
                        <p className="text-sm font-bold text-[#a8a29e] uppercase tracking-widest mb-3">Modo Solitario</p>
                        <p className="text-sm text-[#57534e] leading-relaxed italic">
                            {isLoading ? 'Creando sala...' : 'Asumes el control total. Liderarás los 6 sectores simultáneamente.'}
                        </p>
                    </button>
                )}

                <button 
                    onClick={() => onSelectMode('small')} 
                    disabled={isLoading}
                    className={`bg-white border-4 border-[#e7e5e4] p-6 rounded-[2.5rem] text-left hover:border-[#fb923c] hover:bg-[#fff7ed] transition-all group shadow-sm hover:shadow-xl flex flex-col items-start h-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="w-14 h-14 bg-[#fb923c]/10 text-[#fb923c] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform flex-shrink-0">
                        <Users className="w-8 h-8" />
                    </div>
                    <h3 className="font-black text-2xl mb-2">2-5 Jugadores</h3>
                    <p className="text-sm font-bold text-[#a8a29e] uppercase tracking-widest mb-3">Grupo Íntimo</p>
                    <p className="text-sm text-[#57534e] leading-relaxed italic">
                        {isLoading ? 'Configurando...' : 'El sistema reparte los 6 roles equitativamente entre los presentes.'}
                    </p>
                </button>

                <button 
                    onClick={() => onSelectMode('classic')} 
                    disabled={isLoading}
                    className={`bg-white border-4 border-[#e7e5e4] p-6 rounded-[2.5rem] text-left hover:border-[#3b82f6] hover:bg-[#eff6ff] transition-all group shadow-sm hover:shadow-xl flex flex-col items-start h-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="w-14 h-14 bg-[#3b82f6]/10 text-[#3b82f6] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform flex-shrink-0">
                        <Crown className="w-8 h-8" />
                    </div>
                    <h3 className="font-black text-2xl mb-2">6 Jugadores</h3>
                    <p className="text-sm font-bold text-[#a8a29e] uppercase tracking-widest mb-3">Equipo Perfecto</p>
                    <p className="text-sm text-[#57534e] leading-relaxed italic">
                        {isLoading ? 'Iniciando equipo...' : 'La experiencia original. Cada persona controla un sector específico.'}
                    </p>
                </button>

                <button 
                    onClick={() => onSelectMode('class')} 
                    disabled={isLoading}
                    className={`bg-white border-4 border-[#e7e5e4] p-6 rounded-[2.5rem] text-left hover:border-[#d946ef] hover:bg-[#fdf4ff] transition-all group shadow-sm hover:shadow-xl flex flex-col items-start h-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="w-14 h-14 bg-[#d946ef]/10 text-[#d946ef] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform flex-shrink-0">
                        <Globe className="w-8 h-8" />
                    </div>
                    <h3 className="font-black text-2xl mb-2">+7 Jugadores</h3>
                    <p className="text-sm font-bold text-[#a8a29e] uppercase tracking-widest mb-3">Modo Clase/Taller</p>
                    <p className="text-sm text-[#57534e] leading-relaxed italic">
                        {isLoading ? 'Preparando taller...' : 'Formad 6 grandes equipos. Ideal para proyectar en pizarra digital.'}
                    </p>
                </button>
            </div>
        </motion.div>
    );
}
