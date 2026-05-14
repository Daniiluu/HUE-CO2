import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Sparkles } from 'lucide-react';
import { router } from '@inertiajs/react';

export function MainMenuView({ onNavigate }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            style={{ willChange: "transform, opacity" }}
            className="w-full max-w-sm text-center"
        >
            <div className="w-36 h-36 flex items-center justify-center mx-auto mb-4">
                <img src="/images/DPEC_logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>

            <h1 className="text-5xl font-black tracking-tighter text-[#1c1917] mb-1">HUE-CO2</h1>
            <p className="text-[#87AF4C] font-bold uppercase tracking-[0.2em] text-[10px] mb-12">Modo Invitado</p>

            <div className="space-y-4">
                <button 
                    onClick={() => onNavigate('join')} 
                    className="w-full bg-white border-4 border-[#e7e5e4] text-[#1c1917] p-6 rounded-[2rem] shadow-sm hover:border-[#87AF4C] transition-all font-black text-xl flex items-center justify-center gap-3"
                >
                    <Gamepad2 className="w-6 h-6" /> Unirse con PIN
                </button>
            </div>

            <button 
                onClick={() => router.get('/')} 
                className="mt-8 text-stone-400 font-bold hover:text-stone-600 transition-colors"
            >
                Volver al inicio
            </button>
        </motion.div>
    );
}
