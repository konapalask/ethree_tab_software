import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../api/config';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Everyone is routed to the configured API_URL (Vercel Backend)
            const targetApi = API_URL;

            const response = await axios.post(`${targetApi}/api/auth/login`, {
                email: email.toLowerCase(),
                password
            });

            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            if (user.role === 'admin' || user.role === 'superadmin') {
                navigate('/admin');
            } else if (user.role === 'verify') {
                navigate('/verify');
            } else {
                navigate('/pos');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#a855f7] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/bg-login.webp')" }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-slate-900/60 backdrop-blur-[2px]"></div>

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="p-8 pt-10">
                    <div className="flex justify-center mb-6">
                        <img
                            src="/logo.jpeg"
                            alt="ETHREE Logo"
                            className="w-56 h-auto object-contain hover:scale-105 transition-transform duration-700"
                        />
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Welcome Back</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">ETHREE POS</p>
                    </div>

                    {error && (
                        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl mb-6 text-sm text-center font-medium border border-rose-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none transition-all text-slate-900 placeholder-slate-400 font-medium"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none transition-all text-slate-900 placeholder-slate-400 font-medium"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4 active:scale-[0.98] text-sm"
                        >
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>
                </div>
                <div className="bg-slate-50 p-4 text-center text-[10px] text-slate-400 border-t border-slate-100 font-semibold tracking-wide uppercase">
                    Protected by E3 Security System
                </div>
            </div>
        </div>
    );
}
