import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Printer, Home, ShoppingBag } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../api/config';

export default function PaymentSuccess() {
    const navigate = useNavigate();

    useEffect(() => {
        // 1. History Trap - Block Back Button
        window.history.pushState(null, '', window.location.href);
        const handleBack = () => {
            window.history.pushState(null, '', window.location.href);
        };
        window.addEventListener('popstate', handleBack);

        const handleSuccess = async () => {
            const pendingData = localStorage.getItem('pending_upi_transaction');
            if (pendingData) {
                const parsed = JSON.parse(pendingData);
                
                try {
                    // 1. Sync to backend
                    await axios.post(`${API_URL}/api/tickets`, parsed.ticketsToSave);
                    
                    // 2. Clear pending transaction
                    localStorage.removeItem('pending_upi_transaction');

                    // 3. Trigger Print automatically
                    setTimeout(() => {
                        window.print();
                    }, 500);
                } catch (error) {
                    console.error('Failed to sync ticket:', error);
                }
            }
        };

        handleSuccess();

        return () => window.removeEventListener('popstate', handleBack);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in duration-500">
                <div className="bg-emerald-500 p-8 text-center relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
                            <CheckCircle2 className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Payment Success!</h1>
                        <p className="text-emerald-100 font-bold mt-1 opacity-90">Transaction Verified & Completed</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 transition-all hover:bg-slate-100/50">
                            <div className="bg-emerald-100 p-3 rounded-xl">
                                <Printer className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800">Automatic Printing</h3>
                                <p className="text-xs text-slate-500 font-medium">Ticket printer should trigger automatically</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 transition-all hover:bg-slate-100/50">
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <ShoppingBag className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800">Order Finalized</h3>
                                <p className="text-xs text-slate-500 font-medium">Cart has been cleared and recorded</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <button
                            onClick={handlePrint}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <Printer className="w-5 h-5" />
                            Reprint Ticket
                        </button>
                        
                        <button
                            onClick={() => navigate('/pos')}
                            className="w-full py-4 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <Home className="w-5 h-5" />
                            Return to POS
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Powered by Ethree Secure Gateway</p>
                </div>
            </div>

            {/* Hidden Print Container for Success Logic */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
               <div className="p-4 text-center">
                   <p className="font-bold">Please collect your receipt from the printer.</p>
               </div>
            </div>
        </div>
    );
}
