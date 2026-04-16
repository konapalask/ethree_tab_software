import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Printer, Home, Bluetooth, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../api/config';
import { BluetoothPrinter } from '../api/BluetoothPrinter';

export default function PaymentSuccess() {
    const navigate = useNavigate();
    const [btStatus, setBtStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [isConnecting, setIsConnecting] = useState(false);
    const [lastPrintData, setLastPrintData] = useState<any>(null);

    console.log('Current Bluetooth Status:', btStatus);

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
                setLastPrintData(parsed.printData);
                
                try {
                    // 1. Sync to backend
                    await axios.post(`${API_URL}/api/tickets`, parsed.ticketsToSave);
                    
                    // Note: We DON'T clear pending transaction immediately 
                    // so we can reprint if Bluetooth fails.
                } catch (error) {
                    console.error('Failed to sync ticket:', error);
                }
            }
        };

        handleSuccess();

        // AUTO-CLOSE if in Popup mode (Handover back to POS)
        if (window.opener) {
            console.log('Detected Popup Mode - Auto-closing in 5 seconds...');
            setTimeout(() => {
                window.close();
            }, 5000);
        }

        return () => window.removeEventListener('popstate', handleBack);
    }, []);

    const handleDirectBTPrint = async () => {
        setIsConnecting(true);
        const targetPrinter = "PRINTER 001-6D49";

        try {
            // 1. Try Auto-Connect first (Fastest/Silent)
            let connectedName = await BluetoothPrinter.autoConnect(targetPrinter);
            
            // 2. Fallback to Manual Connect with specific filter
            if (!connectedName) {
                console.log('Auto-connect failed or not supported, trying manual picker...');
                connectedName = await BluetoothPrinter.connect(targetPrinter);
            }

            if (connectedName) {
                setBtStatus('connected');
                
                if (lastPrintData) {
                    console.log('Printing UPI Tickets via Bluetooth...');
                    
                    // Print individual tickets
                    if (lastPrintData.subTickets && lastPrintData.subTickets.length > 0) {
                        for (const sub of lastPrintData.subTickets) {
                            await BluetoothPrinter.printTicket({
                                id: sub.id,
                                date: sub.date,
                                items: sub.items,
                                total: sub.amount,
                                mobile: sub.mobile,
                                paymentMode: 'upi'
                            });
                        }
                    }
                    
                    // Clear state
                    localStorage.removeItem('pending_upi_transaction');
                }
            }
        } catch (error: any) {
            console.error('BT/Auto-Connect failed:', error);
            alert(`Printer Error: ${error.message || 'Please ensure Bluetooth is ON'}`);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleSystemPrintFallback = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Success background glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            <div className="max-w-md w-full bg-slate-800/40 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in duration-500 relative z-10">
                <div className="bg-emerald-500/90 p-10 text-center relative border-b border-white/10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/30 shadow-2xl scale-110">
                            <CheckCircle2 className="w-14 h-14 text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none">Payment OK!</h1>
                        <p className="text-emerald-100 font-bold mt-2 opacity-90 tracking-widest text-xs uppercase">Transaction Verified</p>
                    </div>
                </div>

                <div className="p-10 space-y-8">
                    {/* Action Cards */}
                    <div className="space-y-4">
                        <button
                            onClick={handleDirectBTPrint}
                            disabled={isConnecting}
                            className={`w-full group relative overflow-hidden p-6 rounded-[2rem] border-2 transition-all duration-300 flex items-center gap-5 ${
                                isConnecting 
                                ? 'bg-amber-500/10 border-amber-500/50 grayscale' 
                                : 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] active:scale-95'
                            }`}
                        >
                            <div className={`p-4 rounded-2xl ${isConnecting ? 'bg-amber-500/20' : 'bg-white/20'} shadow-lg group-hover:scale-110 transition-transform`}>
                                {isConnecting ? <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" /> : <Bluetooth className="w-8 h-8 text-white" />}
                            </div>
                            <div className="text-left">
                                <h3 className={`font-black uppercase tracking-wider ${isConnecting ? 'text-amber-500' : 'text-white'}`}>
                                    {isConnecting ? 'Detecting...' : 'ACTIVATE PRINTER'}
                                </h3>
                                <p className={`text-xs font-bold leading-none ${isConnecting ? 'text-amber-500/50' : 'text-emerald-100/70'}`}>
                                    {isConnecting ? 'Checking Bluetooth...' : 'Instant Thermal Print'}
                                </p>
                            </div>
                            {!isConnecting && <div className="ml-auto w-2 h-2 rounded-full bg-white opacity-50 animate-ping"></div>}
                        </button>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleSystemPrintFallback}
                                className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                            >
                                <Printer size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">System Print</span>
                            </button>
                            <button
                                onClick={() => navigate('/pos')}
                                className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                            >
                                <Home size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Dashboard</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="pt-2 text-center border-t border-white/5 pt-6">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Ethree Secure Gateway</p>
                        <p className="text-[10px] font-medium text-slate-600">Please collect receipts and hand over to customer</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
