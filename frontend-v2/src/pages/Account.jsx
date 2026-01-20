import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { User, Mail, Save, UserCircle, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function Account() {
    const { user, login, logout, updateAuthState } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(false);

    // Password State
    const [isCounting, setIsCounting] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Delete State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isFirebaseUser = !!auth.currentUser;

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_URL}/api/auth/update`, { name, email }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                updateAuthState(res.data.user, res.data.token);
                toast.success('Profile updated successfully');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isFirebaseUser) {
                // Firebase User (Re-auth might be needed if session is old)
                // For simplicity, we try update first. If it fails with 'auth/requires-recent-login', prompt re-login.
                await updatePassword(auth.currentUser, newPassword);
                toast.success('Password updated successfully');
                setNewPassword('');
                setIsPasswordModalOpen(false);
            } else {
                // Legacy User
                const token = localStorage.getItem('token');
                await axios.post(`${API_URL}/api/auth/change-password`, {
                    oldPassword,
                    newPassword
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Password updated successfully');
                setOldPassword('');
                setNewPassword('');
                setIsPasswordModalOpen(false);
            }
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/requires-recent-login') {
                toast.error('Please log out and log in again to change your password.');
            } else {
                toast.error(error.response?.data?.error || error.message || 'Failed to update password');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // 1. Delete from Backend (removes from Postgres)
            await axios.delete(`${API_URL}/api/auth/delete-account`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 2. Delete from Firebase (if applicable)
            if (isFirebaseUser) {
                await deleteUser(auth.currentUser);
            }

            toast.success('Account deleted successfully');
            logout();
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/requires-recent-login') {
                toast.error('Please log out and log in again to delete your account.');
            } else {
                toast.error(error.response?.data?.error || 'Failed to delete account');
            }
        } finally {
            setLoading(false);
        }
    };

    // Modal State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-8"
        >
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Account Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your personal information and preferences.</p>
            </div>

            {/* Profile Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-6">
                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center relative overflow-hidden">
                        {user?.picture ? (
                            <img src={user.picture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <UserCircle size={40} />
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{user?.name || 'User'}</h2>
                        <div className="text-slate-500 dark:text-slate-400">{user?.email}</div>
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded inline-block mt-2 uppercase">{user?.role}</div>
                    </div>
                </div>

                <form onSubmit={handleUpdate} className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Display Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                    placeholder="Enter your name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    disabled={isFirebaseUser}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none ${isFirebaseUser ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed' : ''}`}
                                />
                            </div>
                            {isFirebaseUser && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Managed via Google/Firebase</p>}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || (isFirebaseUser && name === user?.name)}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md shadow-indigo-100 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : (
                                <>
                                    <Save size={18} /> Save Profile
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Security Section (Button Only) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Lock size={20} className="text-slate-400" />
                        Security
                    </h3>
                </div>
                <div className="p-8 flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">Password</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            {isFirebaseUser ? 'Managed via your Google/Provider account.' : 'Regularly updating your password helps keep your account secure.'}
                        </p>
                    </div>
                    {!isFirebaseUser && (
                        <button
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                        >
                            Change Password
                        </button>
                    )}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/50 overflow-hidden">
                <div className="p-6 border-b border-red-50 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10">
                    <h3 className="text-lg font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle size={20} />
                        Danger Zone
                    </h3>
                </div>
                <div className="p-8 flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">Delete Account</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Permanently remove your account and all associated data.</p>
                    </div>
                    <button
                        onClick={handleDeleteAccount}
                        disabled={loading}
                        className="px-6 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium flex items-center gap-2"
                    >
                        <Trash2 size={18} />
                        Delete Account
                    </button>
                </div>
            </div>

            {/* Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
                    >
                        <button
                            onClick={() => setIsPasswordModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Change Password</h3>
                        </div>

                        <form onSubmit={(e) => {
                            handleChangePassword(e);
                        }} className="p-8 space-y-6">
                            {/* Reusing existing state logic */}
                            {!isFirebaseUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                                    <input
                                        type="password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !newPassword}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-70"
                                >
                                    {loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}

