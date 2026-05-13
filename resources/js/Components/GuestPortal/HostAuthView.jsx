import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Globe, ArrowRight, UserCircle2 } from 'lucide-react';

export function HostAuthView({ onBack, onSelectMode, isGuest = true, initialNickname = '' }) {
    const [nickname, setNickname] = useState(initialNickname);

    const handleSelect = (mode, isLocal = false) => {
        if (!nickname.trim()) {
            alert("Por favor, introduce tu nombre para crear la sala.");
            return;
        }
        onSelectMode(mode, nickname, isLocal);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -20, y: -10 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            style={{ willChange: "transform, opacity" }}
            className="w-full max-w-md bg-white border-4 border-[#e7e5e4] p-10 rounded-[3rem] shadow-2xl"
        >
            <button
                onClick={onBack}
                className="mb-6 text-[#a8a29e] hover:text-[#1c1917] flex items-center gap-1 font-bold text-sm"
            >
                <ChevronLeft className="w-4 h-4" /> Atrás
            </button>

            <h2 className="text-3xl font-black mb-2 text-center text-[#1c1917]">¡Hola, Anfitrión!</h2>
            <p className="text-center text-[#78716c] text-sm font-medium mb-8 px-4">
                Introduce tu nombre para que los demás sepan quién manda en la sala.
            </p>

            {/* Input de Nombre */}
            <div className="relative mb-8 group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[#87AF4C] transition-colors">
                    <UserCircle2 className="w-6 h-6" />
                </div>
                <input 
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Tu nombre o alias..."
                    className="w-full bg-[#fcfcfb] border-4 border-[#f5f5f4] focus:border-[#87AF4C] rounded-2xl py-4 pl-14 pr-4 font-black text-lg outline-none transition-all placeholder:text-stone-300"
                />
            </div>

            <div className="space-y-4">
                <button
                    onClick={() => handleSelect('online_selector', true)}
                    className="w-full flex items-center justify-between p-6 bg-[#f0fdf4] border-4 border-[#E3EFD2] hover:border-[#87AF4C] rounded-2xl transition-all group"
                >
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <User className="text-[#87AF4C] w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-black text-[#1c1917]">Multijugador Local</div>
                            <div className="text-[10px] text-[#87AF4C] font-bold uppercase tracking-widest mt-1">Pantalla compartida + Móviles</div>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#87AF4C] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={() => handleSelect('online_selector', false)}
                    className="w-full flex items-center justify-between p-6 bg-[#f5f5f4] border-4 border-[#e7e5e4] hover:border-[#1c1917] rounded-2xl transition-all group"
                >
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Globe className="text-[#a8a29e] w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-black text-[#1c1917]">Multijugador Online</div>
                            <div className="text-[10px] text-[#a8a29e] font-bold uppercase tracking-widest mt-1">Cada uno en su casa</div>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#a8a29e] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>
        </motion.div>
    );
}
