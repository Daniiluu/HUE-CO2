import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, Lock, User, ChevronLeft } from 'lucide-react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen bg-[#fafaf9] font-sans text-[#44403c] flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
            <Head title="Registrarse | HUE-CO2" />

            {/* Fondo Orgánico */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#dcfce7] rounded-full blur-[120px] opacity-40 -z-10" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#fef3c7] rounded-full blur-[120px] opacity-40 -z-10" />
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />

            {/* Logo Mini */}
            <div className="absolute top-6 left-6 flex items-center gap-2 opacity-50">
                <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <img src="/images/DPEC_logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-black mb-5">HUE-CO2</span>
            </div>

            <div className="w-full max-w-md bg-white border-4 border-[#e7e5e4] p-8 md:p-10 rounded-[3rem] shadow-2xl animate-in slide-in-from-right-8 duration-300">
                <Link href="/" className="mb-6 text-[#a8a29e] hover:text-[#1c1917] flex items-center gap-1 font-bold text-sm inline-flex">
                    <ChevronLeft className="w-4 h-4" /> Volver
                </Link>

                {/* Selector de Pestañas */}
                <div className="flex bg-[#f5f5f4] p-1.5 rounded-2xl mb-8 border-2 border-[#e7e5e4]">
                    <Link href={route('login')} className="flex-1 py-3 rounded-xl font-black text-sm transition-all text-[#a8a29e] hover:text-[#57534e] text-center">
                        Entrar
                    </Link>
                    <div className="flex-1 py-3 rounded-xl font-black text-sm transition-all bg-white shadow-sm text-[#1c1917] text-center">
                        Registrarse
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-[#a8a29e] tracking-widest mb-2 ml-4">Nombre / Organización</label>
                        <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-5 h-5" />
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Usuario"
                                className={`w-full bg-[#f5f5f4] border-4 ${errors.name ? 'border-red-500' : 'border-[#e7e5e4]'} rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:outline-none focus:border-[#87AF4C] transition-colors`}
                                required
                                autoFocus
                            />
                        </div>
                        {errors.name && <p className="text-red-500 text-xs font-bold mt-2 ml-4">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-[#a8a29e] tracking-widest mb-2 ml-4">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-5 h-5" />
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="tucorreo@ejemplo.com"
                                className={`w-full bg-[#f5f5f4] border-4 ${errors.email ? 'border-red-500' : 'border-[#e7e5e4]'} rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:outline-none focus:border-[#87AF4C] transition-colors`}
                                required
                            />
                        </div>
                        {errors.email && <p className="text-red-500 text-xs font-bold mt-2 ml-4">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-[#a8a29e] tracking-widest mb-2 ml-4">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-5 h-5" />
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••"
                                className={`w-full bg-[#f5f5f4] border-4 ${errors.password ? 'border-red-500' : 'border-[#e7e5e4]'} rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:outline-none focus:border-[#87AF4C] transition-colors`}
                                required
                            />
                        </div>
                        {errors.password && <p className="text-red-500 text-xs font-bold mt-2 ml-4">{errors.password}</p>}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-[#a8a29e] tracking-widest mb-2 ml-4">Confirmar Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-5 h-5" />
                            <input
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                placeholder="••••••••"
                                className={`w-full bg-[#f5f5f4] border-4 ${errors.password_confirmation ? 'border-red-500' : 'border-[#e7e5e4]'} rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:outline-none focus:border-[#87AF4C] transition-colors`}
                                required
                            />
                        </div>
                        {errors.password_confirmation && <p className="text-red-500 text-xs font-bold mt-2 ml-4">{errors.password_confirmation}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-[#1c1917] text-white py-5 rounded-2xl font-black text-lg shadow-lg hover:bg-[#292524] transition-all mt-4 disabled:opacity-50"
                    >
                        Crear Cuenta
                    </button>
                </form>
            </div>
        </div>
    );
}