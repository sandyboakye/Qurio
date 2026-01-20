import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Trash2, Shield, Users, BarChart3, QrCode, Key, Ban, CheckCircle, RefreshCw, Edit, X, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ total_users: 0, total_qrs: 0, total_scans: 0 });
    const [users, setUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [dbError, setDbError] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, usersRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/stats`),
                axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users`)
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);

            // Try fetch messages
            try {
                const msgsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/messages`);
                setMessages(msgsRes.data);
                setDbError(false);
            } catch (msgErr) {
                console.warn("Message fetch failed, likely DB missing:", msgErr);
                setDbError(true);
            }

            if (isRefreshing) toast.success("Data refreshed");
        } catch (error) {
            toast.error("Failed to load admin data");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchData();
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure? This will delete the user and their data.")) return;

        try {
            await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${userId}`);
            toast.success("User deleted");
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete user");
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === 1 ? 0 : 1;
        const action = newStatus === 1 ? "activate" : "deactivate";

        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${userId}/status`, { is_active: newStatus });
            toast.success(`User ${action}d successfully`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Update failed");
        }
    };

    const handleResetPassword = async (userId) => {
        const tempPassword = Math.random().toString(36).slice(-8) + "!";
        if (!window.confirm(`Reset password to: ${tempPassword}\n\nCopy this password before confirming!`)) return;

        try {
            await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${userId}/password`, { password: tempPassword });
            toast.success("Password reset successfully");
            alert(`New Password for user: ${tempPassword}\n\nPlease share this with them securely.`);
        } catch (error) {
            toast.error(error.response?.data?.error || "Reset failed");
        }
    };

    const handleSaveLimits = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${editingUser.id}/limits`, {
                max_qrs: parseInt(editingUser.max_qrs),
                has_enterprise: editingUser.has_enterprise ? 1 : 0
            });
            toast.success("User limits updated");
            setEditingUser(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Update failed");
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/admin/messages/${id}/read`);
            setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
            toast.success("Marked as read");
        } catch (e) {
            toast.error("Failed to update message");
        }
    };

    const handleDeleteMessage = async (id) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/admin/messages/${id}`);
            setMessages(prev => prev.filter(m => m.id !== id));
            toast.success("Message deleted");
        } catch (e) {
            toast.error("Failed to delete message");
        }
    };

    const handleInitDb = async () => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/admin/migrate-support`);
            toast.success(res.data.message);
            // Refresh to see if it works now
            setTimeout(fetchData, 1000);
        } catch (e) {
            toast.error("Migration failed: " + (e.response?.data?.error || e.message));
        }
    };

    if (isLoading) return <div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Admin Panel...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 relative">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
                    <Shield size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Portal</h1>
                    <p className="text-slate-500 dark:text-slate-400">Platform overview and user management</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="ml-auto p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={20} className={`text-slate-600 dark:text-slate-300 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">Total Users</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total_users}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <QrCode size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">Total QR Codes</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total_qrs}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">Total Scans</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total_scans}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">Messages</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">
                            {messages.filter(m => !m.is_read).length} <span className="text-sm font-normal text-slate-400">/ {messages.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* DB Fix Action (Only shows if DB is missing) */}
            {dbError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-400">Support Database Missing</h3>
                        <p className="text-red-600 dark:text-red-300">The support_messages table does not exist. Click to initialize it.</p>
                    </div>
                    <button
                        onClick={handleInitDb}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg shadow-red-200 dark:shadow-none transition-all"
                    >
                        Initialize Database
                    </button>
                </div>
            )}

            {/* Support Messages Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Recent Messages</h2>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">No messages yet.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {messages.map(msg => (
                                <div key={msg.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!msg.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white">{msg.email}</span>
                                            {!msg.is_read && (
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-xs rounded-full font-bold">New</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-400">{new Date(msg.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">{msg.message}</p>
                                    <div className="flex gap-3">
                                        {!msg.is_read && (
                                            <button
                                                onClick={() => handleMarkRead(msg.id)}
                                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                            >
                                                <CheckCircle size={14} /> Mark as Read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteMessage(msg.id)}
                                            className="text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Registered Users</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Total QRs</th>
                                <th className="p-4">Plan / Limits</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-white">{u.email}</div>
                                        <div className="text-xs text-slate-400 dark:text-slate-500">ID: {u.id} • Joined {new Date(u.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-white ml-4">{u.qr_count || 0}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{u.max_qrs || 10} QRs Max</span>
                                            {u.has_enterprise ? (
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded w-fit">Enterprise</span>
                                            ) : (
                                                <span className="text-xs text-slate-400 dark:text-slate-500">Basic</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase flex w-fit items-center gap-1 ${u.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                            {u.is_active ? <CheckCircle size={12} /> : <Ban size={12} />}
                                            {u.is_active ? 'Active' : 'Banned'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingUser(u)}
                                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                            title="Edit Limits"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        {u.id !== user.id && (
                                            <>
                                                <button
                                                    onClick={() => handleResetPassword(u.id)}
                                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                    title="Reset Password"
                                                >
                                                    <Key size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(u.id, u.is_active)}
                                                    className={`p-2 rounded-lg transition-colors ${u.is_active ? 'text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'}`}
                                                    title={u.is_active ? "Deactivate User" : "Activate User"}
                                                >
                                                    {u.is_active ? <Ban size={18} /> : <CheckCircle size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit User Permissions</h3>
                            <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveLimits} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">User Email</label>
                                <input
                                    type="text"
                                    value={editingUser.email}
                                    disabled
                                    className="w-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Max QR Codes</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editingUser.max_qrs || 10}
                                    onChange={e => setEditingUser({ ...editingUser, max_qrs: e.target.value })}
                                    className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Default is 10.</p>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                <input
                                    type="checkbox"
                                    id="enterprise"
                                    checked={!!editingUser.has_enterprise}
                                    onChange={e => setEditingUser({ ...editingUser, has_enterprise: e.target.checked ? 1 : 0 })}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="enterprise" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                    Enable Enterprise Tools
                                    <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">Unlocks Bulk Create & Barcode Generator</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-none"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

