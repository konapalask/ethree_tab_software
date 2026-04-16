import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, RefreshCcw, Home, Smartphone, AlertTriangle } from 'lucide-react';

export default function PaymentFailure() {
    const navigate = useNavigate();
    const [typedText, setTypedText] = useState('');
    const fullText = "PLEASE ASK CUSTOMER TO TRY PAYMENT AGAIN";

    // 1. History Trap - Block Back Button
    useEffect(() => {
        // Push state to ensure we can trap the back button
        window.history.pushState(null, '', window.location.href);
        
        const handleBack = () => {
            window.history.pushState(null, '', window.location.href);
            // Optional: User feedback could be added here
        };

        window.addEventListener('popstate', handleBack);
        return () => window.removeEventListener('popstate', handleBack);
    }, []);

    // 2. Typing Animation Logic
    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            setTypedText(fullText.substring(0, i));
            i++;
            if (i > fullText.length) clearInterval(interval);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    const handleRetry = () => {
        navigate('/pos');
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans overflow-hidden relative">
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-600 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px] animate-pulse delay-700"></div>
            </div>

            <div className="max-w-md w-full bg-slate-800/40 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 animate-in zoom-in duration-500 relative z-10">
                <div className="p-10 text-center relative border-b border-white/5">
                    <div className="relative inline-block mb-6">
                        {/* Pulsing Glow */}
                        <div className="absolute inset-0 bg-rose-500 rounded-full blur-2xl opacity-20 animate-ping"></div>
                        <div className="bg-gradient-to-br from-rose-500 to-rose-700 w-24 h-24 rounded-full flex items-center justify-center relative border-4 border-white/10 shadow-2xl">
                            <XCircle className="w-14 h-14 text-white animate-in swing duration-700" />
                        </div>
                    </div>
                    
                    <h1 className="text-3xl font-black text-white tracking-[0.05em] uppercase mb-2">Transaction Error</h1>
                    <div className="h-6 flex items-center justify-center">
                        <p className="text-rose-400 font-black text-sm tracking-widest uppercase animate-pulse">
                            {typedText}<span className="inline-block w-1.5 h-4 bg-rose-400 ml-1 animate-ping"></span>
                        </p>
                    </div>
                </div>

                <div className="p-10 space-y-8">
                    <div className="space-y-4">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center gap-5 group transition-all hover:bg-white/10 ring-1 ring-inset ring-transparent hover:ring-rose-500/30">
                            <div className="bg-rose-500/20 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                                <AlertTriangle className="w-8 h-8 text-rose-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-lg">UPI Response Error</h3>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">The payment gateway rejected the request. Please verify the QR code or network.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 space-y-4">
                        <button
                            onClick={handleRetry}
                            className="w-full py-5 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_20px_40px_-10px_rgba(225,29,72,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(225,29,72,0.5)] hover:-translate-y-1 transition-all active:scale-[0.98] flex items-center justify-center gap-4 group"
                        >
                            <RefreshCcw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />
                            RETRY PAYMENT
                        </button>
                        
                        <button
                            onClick={() => navigate('/pos')}
                            className="w-full py-5 bg-transparent text-slate-400 hover:text-white border-2 border-white/5 rounded-3xl font-black uppercase tracking-[0.2em] text-xs hover:bg-white/5 hover:border-white/10 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <Home className="w-5 h-5" />
                            CANCEL & RETURN
                        </button>
                    </div>
                </div>

                <div className="bg-black/20 py-5 px-8 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Smartphone className="w-3 h-3 text-slate-500" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Support Contact</p>
                    </div>
                    <p className="text-xs font-black text-slate-300 tracking-widest">+91 70369 23456</p>
                </div>
            </div>
        </div>
    );
}
