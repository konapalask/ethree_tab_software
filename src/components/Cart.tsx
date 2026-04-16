import { memo, useState, useEffect } from 'react';
import type { Ride } from '../data/rides';
import { Trash2, Printer, ShoppingCart, Smartphone } from 'lucide-react';
import { IMAGE_URL } from '../api/config';

interface CartItem extends Ride {
    quantity: number;
}

const CartImage = ({ ride }: { ride: Ride }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);

    useEffect(() => {
        // Try local path first
        setImageSrc(`/rides/${ride.image}`);
    }, [ride.image]);

    const handleImageError = () => {
        if (imageSrc !== `${IMAGE_URL}/${ride.image}?ngrok-skip-browser-warning=true`) {
            setImageSrc(`${IMAGE_URL}/${ride.image}?ngrok-skip-browser-warning=true`);
        }
    };

    return (
        <img
            src={imageSrc || ''}
            alt=""
            onError={handleImageError}
            className="w-full h-full object-cover"
        />
    );
};

interface CartProps {
    items: CartItem[];
    onUpdateQuantity: (id: string, delta: number) => void;
    onClear: () => void;
    onPrint: () => void;
    paymentMode: 'upi' | null;
    onPaymentModeChange: (mode: 'upi') => void;
    mobileNumber: string;
    onMobileNumberChange: (val: string) => void;
}

export const Cart = memo(function Cart({
    items,
    onUpdateQuantity,
    onClear,
    onPrint,
    paymentMode,
    onPaymentModeChange,
    mobileNumber,
    onMobileNumberChange
}: CartProps) {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 flex flex-col h-full overflow-hidden ring-1 ring-slate-900/5">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3 text-slate-800">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100/50">
                        <ShoppingCart className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                        <h2 className="font-extrabold text-sm uppercase tracking-wide text-slate-500">Current Order</h2>
                        <div className="font-bold text-slate-900 leading-none">Ticket Summary</div>
                    </div>
                </div>
                <span className="bg-slate-900 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-slate-900/10">
                    {count}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <ShoppingCart className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium">Your cart is empty</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item._id || item.id} className="group flex gap-2 items-start bg-white p-2 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 relative">
                                {item.image && (
                                    <CartImage ride={item} />
                                )}
                            </div>
                            <div className="flex-1 min-w-0 py-1">
                                <h4 className="font-bold text-slate-900 text-sm truncate pr-2">{item.name}</h4>
                                <div className="text-slate-500 text-xs mt-1 font-medium">₹{item.price} each</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5">
                                    <button
                                        onClick={() => onUpdateQuantity(item._id || item.id, -1)}
                                        className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md text-slate-500 transition-colors"
                                    >-</button>
                                    <span className="text-xs font-bold w-6 text-center text-slate-900">{item.quantity}</span>
                                    <button
                                        onClick={() => onUpdateQuantity(item._id || item.id, 1)}
                                        className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md text-slate-500 transition-colors"
                                    >+</button>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-slate-900 text-sm">₹{item.price * item.quantity}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 bg-white border-t border-slate-100 space-y-3 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10">
                {items.length > 0 && (
                    <div className="space-y-3 pb-3 border-b border-slate-200">
                        {/* Mobile & Loyalty */}
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Mobile (Optional)</label>
                            <input
                                type="tel"
                                placeholder="Enter 10-digit number"
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                value={mobileNumber}
                                onChange={(e) => onMobileNumberChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            />
                        </div>

                        {/* Payment Mode */}
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Payment Method</label>
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => onPaymentModeChange('upi')}
                                    className={`group flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl border-2 transition-all duration-300 relative overflow-hidden ${paymentMode === 'upi'
                                        ? 'border-indigo-600 bg-indigo-600/5 text-indigo-700 shadow-sm'
                                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-105 ${paymentMode === 'upi' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100'}`}>
                                        <Smartphone size={18} />
                                    </div>
                                    <span className="text-[10px] font-black tracking-widest uppercase">UPI / QR PAYMENT</span>
                                    {paymentMode === 'upi' && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-200 px-1">
                    <div className="flex justify-between text-slate-500 text-xs font-medium">
                        <span>Subtotal</span>
                        <span>₹{total}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-xs font-medium">
                        <span>Taxes (GST 0%)</span>
                        <span className="text-emerald-500 font-bold tracking-tight">INCLUDED</span>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-xl p-2.5 text-white flex justify-between items-center shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-amber-400/20 transition-all duration-500" />
                    <div className="relative z-10">
                        <div className="text-amber-400 text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">Total Payable</div>
                        <div className="text-2xl font-black tracking-tighter leading-none">₹{total}</div>
                    </div>
                    <div className="relative z-10 text-right">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Instant Print</div>
                        <div className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-0.5 italic">Ready</div>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-2 pt-1">
                    <button
                        onClick={onClear}
                        disabled={items.length === 0}
                        className="col-span-1 flex items-center justify-center p-2.5 rounded-xl border-2 border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 disabled:opacity-30 transition-all duration-300 active:scale-95"
                        title="Clear Cart"
                    >
                        <Trash2 size={20} />
                    </button>
                    {paymentMode && (
                        <button
                            onClick={onPrint}
                            disabled={items.length === 0}
                            className="group col-span-4 bg-slate-900 hover:bg-black text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 shadow-lg transition-all duration-300 active:scale-[0.98] animate-in slide-in-from-bottom-2"
                        >
                            <div className="bg-amber-400 p-1 rounded-md text-slate-900 shadow-md group-hover:scale-105 transition-transform">
                                <Printer size={18} />
                            </div>
                            <span className="uppercase tracking-[0.1em] text-xs">Print Final Ticket</span>
                        </button>
                    )}
                    {!paymentMode && items.length > 0 && (
                        <div className="col-span-4 bg-slate-100 text-slate-400 font-black py-3 px-4 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200 text-[9px] uppercase tracking-[0.2em] italic">
                            Select mode above
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
