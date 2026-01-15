import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Trash2, Shield, Users, BarChart3, QrCode, Key, Ban, CheckCircle, RefreshCw, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ total_users: 0, total_qrs: 0, total_scans: 0 });
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
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
        } catch (error) {
            toast.error("Failed to load admin data");
        } finally {
            setIsLoading(false);
        }
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

    if (isLoading) return <div className="p-10 text-center">Loading Admin Panel...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 relative">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                    <Shield size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Admin Portal</h1>
                    <p className="text-slate-500">Platform overview and user management</p>
                </div>
                <button onClick={fetchData} className="ml-auto p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transaction-colors">
                    <RefreshCw size={20} className="text-slate-600" />
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 uppercase">Total Users</div>
                        <div className="text-3xl font-bold text-slate-900">{stats.total_users}</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
                        <QrCode size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 uppercase">Total QR Codes</div>
                        <div className="text-3xl font-bold text-slate-900">{stats.total_qrs}</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 uppercase">Total Scans</div>
                        <div className="text-3xl font-bold text-slate-900">{stats.total_scans}</div>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Registered Users</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Total QRs</th>
                                <th className="p-4">Plan / Limits</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900">{u.email}</div>
                                        <div className="text-xs text-slate-400">ID: {u.id} • Joined {new Date(u.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 ml-4">{u.qr_count || 0}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium text-slate-700">{u.max_qrs || 10} QRs Max</span>
                                            {u.has_enterprise ? (
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded w-fit">Enterprise</span>
                                            ) : (
                                                <span className="text-xs text-slate-400">Basic</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase flex w-fit items-center gap-1 ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {u.is_active ? <CheckCircle size={12} /> : <Ban size={12} />}
                                            {u.is_active ? 'Active' : 'Banned'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingUser(u)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit Limits"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        {u.id !== user.id && (
                                            <>
                                                <button
                                                    onClick={() => handleResetPassword(u.id)}
                                                    className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Reset Password"
                                                >
                                                    <Key size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(u.id, u.is_active)}
                                                    className={`p-2 rounded-lg transition-colors ${u.is_active ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100'}`}
                                                    title={u.is_active ? "Deactivate User" : "Activate User"}
                                                >
                                                    {u.is_active ? <Ban size={18} /> : <CheckCircle size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Edit User Permissions</h3>
                            <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveLimits} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">User Email</label>
                                <input
                                    type="text"
                                    value={editingUser.email}
                                    disabled
                                    className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-lg px-4 py-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Max QR Codes</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editingUser.max_qrs || 10}
                                    onChange={e => setEditingUser({ ...editingUser, max_qrs: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-slate-400 mt-1">Default is 10.</p>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <input
                                    type="checkbox"
                                    id="enterprise"
                                    checked={!!editingUser.has_enterprise}
                                    onChange={e => setEditingUser({ ...editingUser, has_enterprise: e.target.checked ? 1 : 0 })}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="enterprise" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                    Enable Enterprise Tools
                                    <span className="block text-xs font-normal text-slate-500">Unlocks Bulk Create & Barcode Generator</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg shadow-indigo-200"
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

