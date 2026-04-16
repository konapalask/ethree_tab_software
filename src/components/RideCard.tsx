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
        // Step 1: Try to load from the LOCAL public folder first (which is 100% reliable)
        const localPath = `/rides/${ride.image}`;
        
        // We set the local path immediately. If it fails (404), the onError handler will catch it.
        setImageSrc(localPath);
    }, [ride.image]);

    // Fallback logic if the local image is missing
    const handleImageError = () => {
        if (imageSrc !== `${IMAGE_URL}/${ride.image}?ngrok-skip-browser-warning=true`) {
            console.log(`Local image missing for ${ride.name}, falling back to proxy...`);
            setImageSrc(`${IMAGE_URL}/${ride.image}?ngrok-skip-browser-warning=true`);
        }
    };

    return (
        <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col h-full">
            <div className="h-56 overflow-hidden relative">
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={ride.name}
                        onError={handleImageError}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">
                        <div className="w-8 h-8 bg-slate-200 rounded-full" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-80" />

                <div className="absolute bottom-1.5 left-2 right-2 flex items-end justify-between">
                    <h3 className="font-bold text-lg text-white leading-tight shadow-sm drop-shadow-md">{ride.name}</h3>
                    <span className="bg-amber-400 text-slate-900 text-sm font-bold px-2 py-1 rounded shadow-lg shadow-black/20">
                        ₹{ride.price}
                    </span>
                </div>
            </div>

            <div className="p-2 flex flex-col flex-1 bg-white relative">
                <p className="text-slate-500 text-xs mb-3 line-clamp-3 leading-relaxed">{ride.description}</p>

                <div className="mt-auto">
                    <button
                        onClick={() => onAdd(ride)}
                        className="w-full bg-slate-50 hover:bg-slate-900 text-slate-700 hover:text-amber-400 border border-slate-200 hover:border-slate-900 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 group/btn text-sm"
                    >
                        <span className="bg-slate-200 group-hover/btn:bg-amber-400 p-1 rounded-full transition-colors">
                            <Plus size={14} className="text-slate-600 group-hover/btn:text-slate-900" />
                        </span>
                        Add to Order
                    </button>
                </div>
            </div>
        </div>
    );
});
