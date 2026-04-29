import { useEffect, useState } from 'react';
import axios from 'axios';
// Override the standard local API_URL with the public cloud API for all Admin actions
import { API_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, RefreshCw, Receipt, Search, Trash2, AlertTriangle, BarChart3, List, Users, Printer } from 'lucide-react';
import { BluetoothPrinter } from '../api/BluetoothPrinter';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    rewardPoints: number;
    createdAt: string;
}

interface Ticket {
    _id: string;
    id: string;
    amount: number;
    date: string;
    mobile?: string;
    paymentMode?: string;
    createdBy?: string;
    createdAt: string;
    items: any[];
}

export default function AdminDashboard() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserSales, setSelectedUserSales] = useState<string | null>(null);
    const [view, setView] = useState<'transactions' | 'analytics' | 'users'>('transactions');
    const [ticketStats, setTicketStats] = useState({ total: 0, revenue: 0, scanned: 0, pending: 0 });
    const [allRawTickets, setAllRawTickets] = useState<any[]>([]);

    // Bluetooth Printer State
    const [isBTConnecting, setIsBTConnecting] = useState(false);
    const [btError, setBtError] = useState<string | null>(null);
    const [btStatus, setBtStatus] = useState<'disconnected' | 'connected' | 'error' | 'paired_not_linked'>(() => {
        const isPaired = localStorage.getItem('bt_printer_paired') === 'true';
        return isPaired ? 'paired_not_linked' : 'disconnected';
    });
    const [isPrinting, setIsPrinting] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTickets();
        fetchUsers();
        fetchStats();

        // Auto-Resume Bluetooth on Mount
        const autoResume = async () => {
            const isPaired = localStorage.getItem('bt_printer_paired') === 'true';
            const targetName = localStorage.getItem('bt_printer_name') || "PRINTER 001-6D49";

            if (isPaired && !BluetoothPrinter.isConnected) {
                // Try up to 3 times to handle hardware wake-up racing conditions
                for (let i = 0; i < 3; i++) {
                    try {
                        const connected = await BluetoothPrinter.autoConnect(targetName);
                        if (connected) {
                            setBtStatus('connected');
                            return;
                        }
                    } catch (e) {
                        console.log(`Auto-resume Attempt ${i + 1} failed, retrying...`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait before next try
                }
            }
        };
        autoResume();

        const checkStatus = setInterval(() => {
            if (btStatus === 'connected' && !BluetoothPrinter.isConnected) {
                setBtStatus('paired_not_linked');
            }
        }, 5000);
        return () => clearInterval(checkStatus);
    }, [btStatus]);

    const connectBluetooth = async () => {
        setIsBTConnecting(true);
        try {
            const targetName = localStorage.getItem('bt_printer_name') || "PRINTER 001-6D49";
            const printerName = await BluetoothPrinter.connect(targetName);
            
            console.log('Bluetooth Device Selected:', printerName);setBtStatus('connected');
            setBtError(null);
            localStorage.setItem('bt_printer_paired', 'true');
            localStorage.setItem('bt_printer_name', printerName);
            alert(`Printer "${printerName}" Ready!`);
        } catch (error: any) {
            setBtStatus('error');
            setBtError(error.name || 'Unknown Error');
            alert(`Bluetooth pairing failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsBTConnecting(false);
        }
    };

    const disconnectBluetooth = () => {
        localStorage.removeItem('bt_printer_paired');
        localStorage.removeItem('bt_printer_name');
        setBtStatus('disconnected');
    };

    const clearAllData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Clear Tickets
            await axios.delete(`${API_URL}/api/tickets/clear-all`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Clear Orders
            await axios.delete(`${API_URL}/api/orders/clear-all`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Clear Bookings
            await axios.delete(`${API_URL}/api/bookings/clear-all`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTickets([]);
            // setClearConfirmText(''); // This line is not in the provided content, but it's part of the original function. I should be careful not to remove too much.
            // setShowClearModal(false); // This line is not in the provided content.
            alert('All data cleared successfully.');
        } catch (error) {
            console.error('Failed to clear data', error);
            alert('Failed to clear data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const posId = (user.role === 'superadmin' || user.role === 'admin') ? 'all' : (user.posId || 'pos1');
            const response = await axios.get(`${API_URL}/api/tickets?posId=${posId}`);

            // Store raw response for reprinting sub-tickets
            setAllRawTickets(response.data);

            // FIX: Filter out "Sub-Tickets" (Coupons) to avoid double counting transactions.
            const validTickets = response.data.filter((t: any) => !t.parentId);

            setTickets(Array.isArray(validTickets) ? validTickets : []);
        } catch (error) {
            console.error('Failed to fetch tickets', error);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };



    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/auth/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchStats = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const posId = (user.role === 'superadmin' || user.role === 'admin') ? 'all' : (user.posId || 'pos1');
            const response = await axios.get(`${API_URL}/api/tickets/stats?posId=${posId}`);
            setTicketStats(response.data || { total: 0, revenue: 0, scanned: 0, pending: 0 });
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleReprint = async (masterTicket: Ticket) => {
        if (!BluetoothPrinter.isConnected) {
            alert('Printer not connected. Please pair/connect the printer first.');
            return;
        }

        setIsPrinting(masterTicket.id);
        try {
            // Find all sub-tickets (coupons) for this master ticket
            const subTickets = allRawTickets.filter(t => t.parentId === masterTicket.id);

            if (subTickets.length > 0) {
                // Reprint individual coupons
                for (const sub of subTickets) {
                    await BluetoothPrinter.printTicket({
                        id: sub.id,
                        date: sub.date || new Date(sub.createdAt).toLocaleString(),
                        items: sub.items,
                        total: sub.amount,
                        mobile: sub.mobile,
                        paymentMode: sub.paymentMode || 'upi'
                    });
                }
            } else {
                // Fallback: Print master ticket itself if no sub-tickets are found
                await BluetoothPrinter.printTicket({
                    id: masterTicket.id,
                    date: masterTicket.date || new Date(masterTicket.createdAt).toLocaleString(),
                    items: masterTicket.items,
                    total: masterTicket.amount,
                    mobile: masterTicket.mobile,
                    paymentMode: masterTicket.paymentMode || 'upi'
                });
            }
            alert('Reprint successful!');
        } catch (error: any) {
            console.error('Reprint failed', error);
            alert(`Reprint failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsPrinting(null);
        }
    };

    const downloadCSV = () => {
        if (tickets.length === 0) return;

        const headers = ['Ticket ID', 'Date', 'Amount', 'Mobile', 'Payment Mode', 'Created At'];
        const csvContent = [
            headers.join(','),
            ...tickets.map(t => [
                t.id,
                `"${new Date(t.createdAt).toISOString().split('T')[0]}"`,
                t.amount,
                t.mobile || '',
                t.paymentMode?.toLowerCase() || 'cash',
                `"${new Date(t.createdAt).toISOString().split('T')[0]}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAnalyticsCSV = () => {
        const data = getAnalyticsData();
        const headers = ['Date', 'Total Tickets', 'Total Revenue', 'Cash Revenue', 'UPI Revenue'];
        const csvContent = [
            headers.join(','),
            ...data.map(d => [
                d.date,
                d.count,
                d.revenue,
                d.cash,
                d.upi
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_summary_7days_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadDailyReport = (day: any) => {
        const headers = ['Date', 'Tickets Sold', 'Cash Revenue', 'UPI Revenue', 'Total Revenue'];
        const csvContent = [
            headers.join(','),
            [
                day.date,
                day.count,
                day.cash,
                day.upi,
                day.revenue
            ].join(',')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `daily_report_${day.date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Derived Stats
    const totalRevenue = tickets.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Filtered Tickets
    const filteredTickets = tickets.filter(t => {
        const idMatch = t.id ? t.id.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const mobileMatch = t.mobile ? t.mobile.includes(searchTerm) : false;
        const userMatch = selectedUserSales ? t.createdBy === selectedUserSales : true;
        return (idMatch || mobileMatch) && userMatch;
    });

    // Filtered Users
    const filteredUsers = users.filter(u => {
        const nameMatch = u.name.toLowerCase().includes(searchTerm.toLowerCase());
        const emailMatch = u.email.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || emailMatch;
    });

    const getAnalyticsData = () => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        });

        const aggregation = last7Days.map(date => {
            const dailyTickets = tickets.filter(t => {
                if (!t.createdAt) return false;
                try {
                    return new Date(t.createdAt).toISOString().split('T')[0] === date;
                } catch (e) {
                    return false;
                }
            });
            return {
                date,
                count: dailyTickets.length,
                revenue: dailyTickets.reduce((sum, t) => sum + (t.amount || 0), 0),
                cash: dailyTickets.filter(t => !t.paymentMode || t.paymentMode.toLowerCase() === 'cash').reduce((sum, t) => sum + (t.amount || 0), 0),
                upi: dailyTickets.filter(t => t.paymentMode?.toLowerCase() === 'upi').reduce((sum, t) => sum + (t.amount || 0), 0),
            };
        });

        return aggregation;
    };

    const getTopRides = () => {
        const rideCounts: Record<string, { name: string, count: number, revenue: number }> = {};
        tickets.forEach(t => {
            t.items?.forEach(item => {
                const id = item.id || item._id;
                if (!id) return;
                if (!rideCounts[id]) {
                    rideCounts[id] = { name: item.name, count: 0, revenue: 0 };
                }
                const qty = item.quantity || 1;
                rideCounts[id].count += qty;
                rideCounts[id].revenue += ((item.price || 0) * qty);
            });
        });
        // Sort by count descending, slice top 5
        return Object.values(rideCounts).sort((a, b) => b.count - a.count).slice(0, 5);
    };

    // Change Password State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ email: '', newPassword: '' });
    const [passwordMessage, setPasswordMessage] = useState('');

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage('');
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_URL}/api/auth/change-password`,
                passwordData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPasswordMessage('Password updated successfully!');
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordMessage('');
                setPasswordData({ email: '', newPassword: '' });
            }, 1500);
        } catch (error: any) {
            setPasswordMessage(error.response?.data?.message || 'Failed to update password');
        }
    };

    // Change Email State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailData, setEmailData] = useState({ currentEmail: '', newEmail: '' });
    const [emailMessage, setEmailMessage] = useState('');

    const handleChangeEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailMessage('');
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_URL}/api/auth/change-email`,
                emailData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEmailMessage('Email updated successfully!');
            fetchUsers(); // Refresh the users list
            setTimeout(() => {
                setShowEmailModal(false);
                setEmailMessage('');
                setEmailData({ currentEmail: '', newEmail: '' });
            }, 1500);
        } catch (error: any) {
            setEmailMessage(error.response?.data?.message || 'Failed to update email');
        }
    };

    // Clear All Data State
    const [showClearModal, setShowClearModal] = useState(false);
    const [clearConfirmText, setClearConfirmText] = useState('');



    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
            {/* Header */}
            {/* Premium Sticky Header */}
            <header className="bg-slate-900 border-b border-slate-800 text-white p-3 md:p-4 shadow-xl z-20 sticky top-0">
                <div className="container mx-auto flex items-center justify-between">
                    {/* Logo & Brand */}
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-300 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-200"></div>
                            <img
                                src="/logo.jpeg"
                                alt="ETHREE Logo"
                                className="relative w-10 h-10 md:w-12 md:h-12 rounded-lg object-contain bg-white ring-1 ring-slate-900"
                            />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl font-black tracking-tight text-white leading-none">ETHREE <span className="text-blue-400">ADMIN</span></h1>
                            <p className="text-[10px] md:text-xs text-slate-400 font-medium tracking-wide hidden sm:block">SYSTEM MANAGEMENT CONSOLE</p>
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="hidden lg:flex flex-col border-l border-slate-700 pl-4 ml-4">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Authenticated</span>
                        <span className="text-xs font-bold text-white tracking-wide">{JSON.parse(localStorage.getItem('user') || '{}').email || 'Admin'}</span>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Bluetooth Printer Pairing */}
                        <button
                            onClick={btStatus === 'connected' ? disconnectBluetooth : connectBluetooth}
                            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 backdrop-blur-sm ${btStatus === 'connected'
                                ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20'
                                : btStatus === 'paired_not_linked'
                                    ? 'bg-amber-500 text-white border-amber-600'
                                    : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800'
                                }`}
                        >
                            <Printer size={14} className={isBTConnecting ? 'animate-bounce' : ''} />
                            <span>
                                {isBTConnecting ? 'PAIRING...' : btStatus === 'connected' ? 'PRINTER ONLINE' : btStatus === 'paired_not_linked' ? 'RECONNECT' : 'PAIR PRINTER'}
                            </span>
                        </button>
                        {btError && (
                            <span className="text-[8px] text-rose-500 font-bold uppercase tracking-tighter opacity-70 max-w-[100px] leading-tight">
                                ERR: {btError}
                            </span>
                        )}

                        <div className="hidden md:flex items-center bg-slate-800/50 rounded-xl p-1 gap-1 border border-slate-700">
                            <button
                                onClick={() => setShowEmailModal(true)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                            >
                                Change Email
                            </button>
                            <div className="w-px h-4 bg-slate-700"></div>
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                            >
                                Change Password
                            </button>
                        </div>

                        {/* Mobile Menu Trigger (Visible on small screens) */}
                        <div className="md:hidden flex flex-col gap-1 items-end pr-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Admin</span>
                        </div>

                        <div className="h-6 md:h-8 w-px bg-slate-800 mx-0.5"></div>

                        <button
                            onClick={handleLogout}
                            className="group relative p-2 md:px-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Logout"
                        >
                            <LogOut size={20} className="relative z-10" />
                        </button>
                    </div>
                </div>

                {/* Mobile Sub-Header for Actions */}
                <div className="md:hidden border-t border-slate-800 mt-2 pt-2 flex justify-end gap-2 px-1">
                    <button
                        onClick={() => setShowEmailModal(true)}
                        className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider bg-slate-800/50 px-2 py-1.5 rounded border border-slate-700"
                    >
                        Change Email
                    </button>
                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider bg-slate-800/50 px-2 py-1'5 rounded border border-slate-700"
                    >
                        Change Pwd
                    </button>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-6 max-w-7xl">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Total Revenue */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                <BarChart3 size={24} />
                            </div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">TODAY</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today Revenue</p>
                            <h3 className="text-3xl font-black text-slate-900">₹{ticketStats.revenue?.toLocaleString() || 0}</h3>
                        </div>
                    </div>

                    {/* Total Tickets */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                <Receipt size={24} />
                            </div>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">TODAY</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tickets Sold</p>
                            <h3 className="text-3xl font-black text-slate-900">{ticketStats.total?.toLocaleString() || 0}</h3>
                        </div>
                    </div>

                    {/* Ticket Stats */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                                <Search size={24} />
                            </div>
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">TODAY</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Scanned</p>
                                <h3 className="text-2xl font-black text-emerald-600">{ticketStats.scanned}</h3>
                            </div>
                            <div className="w-px h-8 bg-slate-100 mx-2"></div>
                            <div className="space-y-1 text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pending</p>
                                <h3 className="text-2xl font-black text-amber-500">{ticketStats.pending}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Ride Management Button - Replaced the card with one more card if needed, or keep it consistent */}
                    <div
                        onClick={() => navigate('/admin/rides')}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <List size={24} />
                            </div>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">Configure</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Available Rides</p>
                            <h3 className="text-3xl font-black text-slate-900">Manage Pricing</h3>
                        </div>
                    </div>
                </div>
                {/* Email Modal */}
                {showEmailModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 animate-in fade-in zoom-in duration-200">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Change User Email</h2>

                            {emailMessage && (
                                <div className={`p-3 rounded-lg text-sm font-medium mb-4 ${emailMessage.includes('success') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {emailMessage}
                                </div>
                            )}

                            <form onSubmit={handleChangeEmail} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="old@ethree.com"
                                        value={emailData.currentEmail}
                                        onChange={(e) => setEmailData({ ...emailData, currentEmail: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="new@ethree.com"
                                        value={emailData.newEmail}
                                        onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmailModal(false)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                    >
                                        Update
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Password Modal */}
                {showPasswordModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 animate-in fade-in zoom-in duration-200">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Change User Password</h2>

                            {passwordMessage && (
                                <div className={`p-3 rounded-lg text-sm font-medium mb-4 ${passwordMessage.includes('success') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {passwordMessage}
                                </div>
                            )}

                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="user@ethree.com"
                                        value={passwordData.email}
                                        onChange={(e) => setPasswordData({ ...passwordData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Min 6 characters"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(false)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                    >
                                        Update
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Clear Data Modal */}
                {showClearModal && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200 animate-in fade-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle size={40} className="text-rose-600" />
                            </div>

                            <h2 className="text-2xl font-black text-slate-800 text-center mb-2">Clear All Records?</h2>
                            <p className="text-slate-500 text-center mb-8 font-medium">
                                This action will <span className="text-rose-600 font-bold underline">delete all bills and tickets</span> forever. This cannot be undone.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest text-center">Type <span className="text-slate-900">DELETE ALL</span> to confirm</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none text-center font-black uppercase tracking-widest transition-all"
                                        placeholder="Type here..."
                                        value={clearConfirmText}
                                        onChange={(e) => setClearConfirmText(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => { setShowClearModal(false); setClearConfirmText(''); }}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all border border-slate-200"
                                    >
                                        Go Back
                                    </button>
                                    <button
                                        onClick={clearAllData}
                                        disabled={clearConfirmText !== 'DELETE ALL'}
                                        className={`flex-[1.5] py-4 font-black rounded-2xl transition-all shadow-lg border-b-4 ${clearConfirmText === 'DELETE ALL'
                                            ? 'bg-rose-600 text-white hover:bg-rose-700 border-rose-800 shadow-rose-500/40 active:border-b-0 active:translate-y-1'
                                            : 'bg-slate-100 text-slate-300 border-slate-200 grayscale cursor-not-allowed'
                                            }`}
                                    >
                                        DELETE EVERYTHING
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Switcher & Toolbar */}
                {/* View Switcher & Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                    <div className="grid grid-cols-3 md:flex bg-slate-100 p-1 rounded-xl w-full md:w-auto gap-1">
                        <button
                            onClick={() => setView('transactions')}
                            className={`flex items-center justify-center gap-1.5 px-2 py-2 md:px-6 md:py-2.5 rounded-lg font-bold text-[10px] md:text-sm transition-all ${view === 'transactions' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List size={14} className="md:w-4 md:h-4" />
                            <span>Transactions</span>
                        </button>
                        <button
                            onClick={() => setView('analytics')}
                            className={`flex items-center justify-center gap-1.5 px-2 py-2 md:px-6 md:py-2.5 rounded-lg font-bold text-[10px] md:text-sm transition-all ${view === 'analytics' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <BarChart3 size={14} className="md:w-4 md:h-4" />
                            <span>Analytics</span>
                        </button>
                        <button
                            onClick={() => setView('users')}
                            className={`flex items-center justify-center gap-1.5 px-2 py-2 md:px-6 md:py-2.5 rounded-lg font-bold text-[10px] md:text-sm transition-all ${view === 'users' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={14} className="md:w-4 md:h-4" />
                            <span>Users</span>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-end w-full md:w-auto">
                        {(view === 'transactions' || view === 'users') && (
                            <div className="relative w-full sm:w-64 md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder={view === 'transactions' ? "Search ID or Mobile..." : "Search Name..."}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <button
                                onClick={() => { fetchTickets(); fetchStats(); }}
                                className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm flex-none"
                                title="Refresh Data"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>

                            <button
                                onClick={view === 'transactions' ? downloadCSV : downloadAnalyticsCSV}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-xs md:text-sm transition-all shadow-md"
                            >
                                <Download size={16} />
                                <span className={view === 'transactions' ? "hidden xl:inline" : ""}>{view === 'transactions' ? 'Export' : 'Report'}</span>
                            </button>

                            <button
                                onClick={() => navigate('/accounts')}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xs md:text-sm transition-all shadow-md"
                            >
                                <Receipt size={16} />
                                <span className="hidden xl:inline">Accounts</span>
                            </button>

                            <button
                                onClick={() => setShowClearModal(true)}
                                className="p-2.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-600 hover:text-white transition-all group"
                                title="Clear All History"
                            >
                                <Trash2 size={18} className="group-hover:animate-pulse" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter Status Badge */}
                {selectedUserSales && (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                                <Users size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider leading-none mb-1">Active Filter</p>
                                <p className="text-sm font-black text-slate-800">Showing sales for: <span className="text-blue-700">{selectedUserSales}</span></p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedUserSales(null)}
                            className="text-xs font-black text-blue-600 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-blue-100 transition-all hover:scale-105 active:scale-95"
                        >
                            CLEAR FILTER
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
                    {view === 'transactions' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Ticket ID</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Date & Time</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Payment</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Issued By</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-400">
                                                    <RefreshCw size={32} className="animate-spin mb-3 text-slate-300" />
                                                    <span className="font-medium">Loading sales data...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredTickets.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                No tickets found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTickets.map((ticket) => (
                                            <tr key={ticket._id} className="group hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-slate-100 p-2 rounded-lg text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                            <Receipt size={16} />
                                                        </div>
                                                        <span className="font-mono text-sm font-bold text-slate-700">{ticket.id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 text-sm">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                                        <span className="text-xs text-slate-400 font-medium">{new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {ticket.mobile ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                            {ticket.mobile}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${ticket.paymentMode?.toLowerCase() === 'upi'
                                                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                                        }`}>
                                                        {ticket.paymentMode?.toUpperCase() || 'CASH'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                        {ticket.createdBy || 'System'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-emerald-600 font-black text-base">₹{(ticket.amount || 0).toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleReprint(ticket)}
                                                        disabled={isPrinting !== null}
                                                        className={`flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isPrinting === ticket.id
                                                            ? 'bg-amber-100 text-amber-600 animate-pulse'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white shadow-sm'
                                                            }`}
                                                    >
                                                        {isPrinting === ticket.id ? (
                                                            <RefreshCw size={12} className="animate-spin" />
                                                        ) : (
                                                            <Printer size={12} />
                                                        )}
                                                        {isPrinting === ticket.id ? 'Printing...' : 'Reprint'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : view === 'analytics' ? (
                        <div className="space-y-6">
                            {/* Analytics Header Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Total Revenue Card */}
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-all duration-500"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2 text-slate-400">
                                            <div className="p-2 bg-white/10 rounded-lg">
                                                <BarChart3 size={18} className="text-emerald-400" />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-widest">Total Revenue (7 Days)</span>
                                        </div>
                                        <div className="text-4xl font-black tracking-tight text-white mb-1">
                                            ₹{tickets.reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
                                        </div>
                                        <div className="text-xs font-medium text-slate-400">
                                            {tickets.length} total tickets processed
                                        </div>
                                    </div>
                                </div>

                                {/* Pie Chart Card */}
                                <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div className="flex flex-col justify-center">
                                        <h3 className="text-lg font-bold text-slate-800 mb-1">Payment Distribution</h3>
                                        <p className="text-sm text-slate-500 font-medium mb-6">Cash vs UPI Split</p>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                                <span className="text-sm font-bold text-slate-600">Cash:</span>
                                                <span className="text-sm font-black text-slate-900">
                                                    ₹{tickets.filter(t => !t.paymentMode || t.paymentMode === 'cash').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                                <span className="text-sm font-bold text-slate-600">UPI:</span>
                                                <span className="text-sm font-black text-slate-900">
                                                    ₹{tickets.filter(t => t.paymentMode === 'upi').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-64 h-48 min-h-[192px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Cash', value: tickets.filter(t => !t.paymentMode || t.paymentMode === 'cash').reduce((sum, t) => sum + (t.amount || 0), 0) },
                                                        { name: 'UPI', value: tickets.filter(t => t.paymentMode === 'upi').reduce((sum, t) => sum + (t.amount || 0), 0) }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={70}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    <Cell key="cell-0" fill="#f59e0b" />
                                                    <Cell key="cell-1" fill="#2563eb" />
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Top Rides Table */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Top Rides by Bookings</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Rank</th>
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Ride Name</th>
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center">Total Bookings</th>
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Revenue Generated</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {getTopRides().map((ride, index) => (
                                                <tr key={ride.name} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-200 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                                                            {index + 1}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 font-bold text-slate-700">{ride.name}</td>
                                                    <td className="px-6 py-3 text-center">
                                                        <span className="font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{ride.count}</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <span className="text-emerald-600 font-bold">₹{(ride.revenue || 0).toLocaleString()}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {getTopRides().length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                                        No ride data available yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Daily Breakdown Table */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Daily Breakdown</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                                <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center">Tickets Sold</th>
                                                <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Cash Revenue</th>
                                                <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">UPI Revenue</th>
                                                <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Daily Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {getAnalyticsData().map((day) => (
                                                <tr key={day.date} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-slate-700">{new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="font-black text-slate-600">{day.count}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-amber-600 font-bold">₹{(day.cash || 0).toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-blue-600 font-bold">₹{(day.upi || 0).toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-emerald-600 font-black text-lg leading-none">₹{(day.revenue || 0).toLocaleString()}</span>
                                                            <button
                                                                onClick={() => downloadDailyReport(day)}
                                                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-white px-2 py-0.5 rounded border border-transparent hover:border-blue-100 transition-all"
                                                            >
                                                                <Download size={10} />
                                                                Export Day
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">User Name</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Email Address</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center">Role</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center">Tickets Sold</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium italic">
                                                No users found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user._id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-500 group-hover:bg-white transition-all shadow-sm">
                                                            <Users size={16} />
                                                        </div>
                                                        <span className="font-bold text-slate-900">{user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-600">{user.email}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-black text-indigo-600">
                                                    {tickets.filter(t => t.createdBy === user.name).length}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-slate-400 text-xs font-bold whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</span>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUserSales(user.name);
                                                                setView('transactions');
                                                                setSearchTerm(''); // Clear search to see all their sales
                                                            }}
                                                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100/50 transition-all"
                                                        >
                                                            <BarChart3 size={12} />
                                                            View Sales
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Footer Summary */}
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 gap-4">
                        <span className="font-medium">Summary for last <span className="text-slate-900 font-bold">{tickets.length}</span> tickets</span>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <span className="text-slate-400 font-bold text-xs uppercase">Overall Total:</span>
                                <span className="font-black text-slate-900 text-lg">₹{totalRevenue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
