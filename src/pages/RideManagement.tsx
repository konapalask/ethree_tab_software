import { useEffect, useState } from 'react';
import axios from 'axios';
// Override the standard local API_URL with the public cloud API for all Admin actions
import { API_URL, IMAGE_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2, RefreshCw, Pencil, X } from 'lucide-react';

interface Ride {
    _id: string;
    id: string;
    name: string;
    price: number;
    description: string;
    image: string;
    allowedPos?: string[];
    status?: 'on' | 'off';
}

export default function RideManagement() {
    const [rides, setRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRide, setEditingRide] = useState<Ride | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        description: '',
        id: '',
        image: '',
        allowedPos: '',
        status: 'on' as 'on' | 'off'
    });

    const navigate = useNavigate();

    useEffect(() => {
        fetchRides();
    }, []);

    const fetchRides = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/products?t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRides(response.data);
            // Cache the data for fallback use
            localStorage.setItem('cached_rides', JSON.stringify(response.data));
        } catch (error) {
            console.error('Failed to fetch rides, checking local cache...', error);
            const cached = localStorage.getItem('cached_rides');
            if (cached) {
                try {
                    setRides(JSON.parse(cached));
                    console.log('Loaded rides from cache');
                } catch (e) {
                    console.error('Failed to parse cache', e);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (ride: Ride) => {
        setEditingRide(ride);
        setFormData({
            name: ride.name,
            price: ride.price,
            description: ride.description || '',
            id: ride.id,
            image: ride.image || '',
            allowedPos: ride.allowedPos ? ride.allowedPos.join(', ') : '',
            status: ride.status || 'on'
        });
        setIsAdding(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRide) return;

        try {
            const token = localStorage.getItem('token');
            const submitData = {
                ...formData,
                allowedPos: formData.allowedPos.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '')
            };
            await axios.put(`${API_URL}/api/products/${editingRide._id}`, submitData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRides();
            setEditingRide(null);
            setFormData({ name: '', price: 0, description: '', id: '', image: '', allowedPos: '', status: 'on' });
        } catch (error) {
            console.error('Update failed', error);
            alert('Failed to update ride');
        }
    };

    const handleDelete = async (mongoId: string) => {
        if (!confirm('Are you sure you want to delete this ride?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/products/${mongoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRides();
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete ride');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            // Auto-generate ID if missing
            const submitData = {
                ...formData,
                id: formData.id || Date.now().toString(),
                allowedPos: formData.allowedPos.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '')
            };
            await axios.post(`${API_URL}/api/products`, submitData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRides();
            setIsAdding(false);
            setFormData({ name: '', price: 0, description: '', id: '', image: '', allowedPos: '', status: 'on' });
        } catch (error) {
            console.error('Create failed', error);
            alert('Failed to add ride');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
            {/* Header */}
            <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-20 border-b border-slate-800">
                <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin')}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg md:text-xl font-black tracking-tight leading-none">RIDE MANAGEMENT</h1>
                            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Pricing & Inventory</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setIsAdding(true);
                            setEditingRide(null);
                            setFormData({ name: '', price: 0, description: '', id: '', image: '', allowedPos: '', status: 'on' });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Add New Ride</span>
                    </button>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-6 max-w-7xl">
                {/* Form Section (Update/Create) */}
                {(isAdding || editingRide) && (
                    <div className="mb-8 bg-white rounded-2xl shadow-xl border border-slate-200 p-6 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800">
                                {isAdding ? 'ADD NEW RIDE' : `EDIT RIDE: ${editingRide?.name}`}
                            </h2>
                            <button
                                onClick={() => { setIsAdding(false); setEditingRide(null); }}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={isAdding ? handleCreate : handleUpdate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Ride Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Price (₹)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Image Path/URL</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. baloon shooting/IMG_8435.jpg"
                                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as 'on' | 'off' })}
                                >
                                    <option value="on">✅ ACTIVE</option>
                                    <option value="off">❌ INACTIVE</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="flex items-end lg:col-span-1">
                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 text-white font-black py-3.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Save size={20} />
                                    {isAdding ? 'CREATE RIDE' : 'SAVE CHANGES'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Rides Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <RefreshCw size={48} className="animate-spin mb-4" />
                        <p className="font-bold">Loading Rides...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {rides.map(ride => (
                            <div key={ride._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                <div className="h-40 bg-slate-100 relative group">
                                    {ride.image ? (
                                        <img 
                                            src={`${IMAGE_URL}/${ride.image}?ngrok-skip-browser-warning=1`} 
                                            alt={ride.name} 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            No Image
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg">
                                            ₹{ride.price}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm ${ride.status === 'off' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                            {ride.status === 'off' ? 'INACTIVE' : 'ACTIVE'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="font-black text-slate-800 mb-1 uppercase truncate">{ride.name}</h3>
                                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed flex-1">
                                        {ride.description || 'No description provided.'}
                                    </p>
                                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => handleEdit(ride)}
                                            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-all active:scale-95"
                                        >
                                            <Pencil size={16} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(ride._id)}
                                            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl border border-rose-100 transition-all active:scale-95"
                                            title="Delete Ride"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
