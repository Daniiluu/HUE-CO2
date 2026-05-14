import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, X, ChevronRight } from 'lucide-react';

/**
 * FeedbackOverlay
 * Componente unificado para mostrar si un turno fue correcto o incorrecto.
 * Se usa tanto en el tablero principal como en los mandos móviles.
 *
 * Props:
 *  - isCorrect: boolean
 *  - message: string opcional
 *  - onNext: function opcional — si se pasa, muestra el botón "Siguiente Pregunta"
 *            y el overlay se vuelve interactivo (pointer-events-auto).
 */
export default function FeedbackOverlay({ isCorrect, message, onNext }) {
    const successColor = {
        bg: 'bg-[#E2F1C3]',
        border: 'border-[#87AF4C]',
        text: 'text-[#658437]',
        icon: 'text-[#87AF4C]',
        btn: 'bg-[#87AF4C] hover:bg-[#658437]',
    };

    const errorColor = {
        bg: 'bg-[#FFC2C2]',
        border: 'border-[#D00000]',
        text: 'text-[#D00000]',
        icon: 'text-[#D00000]',
        btn: 'bg-[#D00000] hover:bg-[#a00000]',
    };

    const colors = isCorrect ? successColor : errorColor;

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className={`fixed inset-0 z-[9999] flex items-center justify-center ${onNext ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
            <div className="absolute inset-0 bg-white/40 backdrop-blur-md" />
            
            <motion.div 
                initial={{ scale: 0.5, y: 20 }} 
                animate={{ scale: 1, y: 0 }}
                className="relative p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-6 border-8"
                style={{ 
                    backgroundColor: isCorrect ? '#E2F1C3' : '#FFC2C2', 
                    borderColor: isCorrect ? '#87AF4C' : '#D00000',
                    zIndex: 10001,
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                }}
            >
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-inner">
                    {isCorrect ? (
                        <CheckCircle2 className={`w-16 h-16 ${colors.icon}`} />
                    ) : (
                        <X className={`w-16 h-16 ${colors.icon}`} />
                    )}
                </div>

                <div className="text-center">
                    <h1 className={`text-5xl font-black uppercase tracking-tighter ${colors.text}`}>
                        {isCorrect ? '¡Correcto!' : '¡Casi!'}
                    </h1>
                    <p className={`mt-1 text-sm font-black uppercase tracking-widest opacity-70 ${colors.text}`}>
                        {message || (isCorrect ? '+1 PUNTO PARA EL SECTOR' : '+0.1°C A LA TEMPERATURA')}
                    </p>
                </div>

                {/* Botón "Siguiente Pregunta" — solo en modo local (cuando se pasa onNext) */}
                {onNext && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        onClick={onNext}
                        className={`mt-2 px-10 py-4 rounded-2xl text-white font-black text-lg flex items-center gap-3 shadow-xl active:scale-95 transition-all ${colors.btn}`}
                    >
                        Siguiente Pregunta
                        <ChevronRight className="w-6 h-6" />
                    </motion.button>
                )}
            </motion.div>
        </motion.div>
    );
}
