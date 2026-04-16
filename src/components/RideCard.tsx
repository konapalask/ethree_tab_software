import { memo, useState, useEffect } from 'react';
import type { Ride } from '../data/rides';
import { Plus } from 'lucide-react';
import { IMAGE_URL } from '../api/config';

interface RideCardProps {
    ride: Ride;
    onAdd: (ride: Ride) => void;
}

export const RideCard = memo(function RideCard({ ride, onAdd }: RideCardProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);

    useEffect(() => {
        // Stagger the loading of ride images to avoid flooding the ngrok tunnel connection limit
        // Random delay between 100ms and 2000ms
        const delay = Math.floor(Math.random() * 1900) + 100;
        const timer = setTimeout(() => {
            setImageSrc(`${IMAGE_URL}/${ride.image}?ngrok-skip-browser-warning=true`);
        }, delay);

        return () => clearTimeout(timer);
    }, [ride.image]);

    return (
        <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col h-full">
            <div className="h-28 overflow-hidden relative">
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={ride.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">
                        <div className="w-8 h-8 bg-slate-200 rounded-full" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-80" />

                <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                    <h3 className="font-bold text-sm text-white leading-tight shadow-sm drop-shadow-md">{ride.name}</h3>
                    <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg shadow-black/20">
                        ₹{ride.price}
                    </span>
                </div>
            </div>

            <div className="p-2.5 flex flex-col flex-1 bg-white relative">
                <p className="text-slate-500 text-[10px] mb-2 line-clamp-2 leading-relaxed">{ride.description}</p>

                <div className="mt-auto">
                    <button
                        onClick={() => onAdd(ride)}
                        className="w-full bg-slate-50 hover:bg-slate-900 text-slate-700 hover:text-amber-400 border border-slate-200 hover:border-slate-900 font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 group/btn text-xs"
                    >
                        <span className="bg-slate-200 group-hover/btn:bg-amber-400 p-0.5 rounded-full transition-colors">
                            <Plus size={12} className="text-slate-600 group-hover/btn:text-slate-900" />
                        </span>
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
});
