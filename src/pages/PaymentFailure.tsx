import { useNavigate } from 'react-router-dom';
import { XCircle, RefreshCcw, Home, Smartphone } from 'lucide-react';

export default function PaymentFailure() {
    const navigate = useNavigate();

    const handleRetry = () => {
        // The POS.tsx useEffect will handle restoring the cart if it's in localStorage
        // but since we are on a dedicated page, we might want to simply navigate back
        // and let the user decide.
        navigate('/pos');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom duration-500">
                <div className="bg-rose-500 p-8 text-center relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
                            <XCircle className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Payment Failed</h1>
                        <p className="text-rose-100 font-bold mt-1 opacity-90">The transaction could not be completed</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100/50 flex items-center gap-4 transition-all">
                            <div className="bg-rose-100 p-3 rounded-xl">
                                <Smartphone className="w-6 h-6 text-rose-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800">Declined or Cancelled</h3>
                                <p className="text-xs text-slate-500 font-medium">Please check the UPI app or network connection</p>
                            </div>
                        </div>

                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Next Steps</h4>
                            <ul className="space-y-2 text-xs font-bold text-slate-600">
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                                    Ask customer to try another UPI App
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                                    Switch to Cash Payment
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                                    Verify if the amount was deducted
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <button
                            onClick={handleRetry}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <RefreshCcw className="w-5 h-5" />
                            Back to Checkout
                        </button>
                        
                        <button
                            onClick={() => navigate('/pos')}
                            className="w-full py-4 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <Home className="w-5 h-5" />
                            Dashboard
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Support: 70369 23456</p>
                </div>
            </div>
        </div>
    );
}
