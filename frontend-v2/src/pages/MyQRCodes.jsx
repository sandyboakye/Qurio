import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Trash2, Edit2, ExternalLink, Download, Eye, X, Save, QrCode, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_BACKEND_URL;

function ViewModal({ qr, onClose }) {
    if (!qr) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>

                <h3 className="text-xl font-bold text-slate-900 mb-1">{qr.name}</h3>
                <p className="text-sm text-slate-500 mb-6">Scan to visit: <br /><a href={qr.currentUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all">{qr.currentUrl}</a></p>

                <div className="bg-white border-2 border-slate-100 rounded-xl p-4 mb-6 flex justify-center">
                    <img src={qr.qrImageUrl} alt={qr.name} className="w-64 h-64 object-contain" />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            const link = document.createElement('a');
                            link.download = `${qr.name}_QR.png`;
                            link.href = qr.qrImageUrl;
                            link.click();
                        }}
                        className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Download size={20} /> Download
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function EditModal({ qr, onClose, onSave }) {
    const [url, setUrl] = useState(qr.currentUrl);
    const [isActive, setIsActive] = useState(qr.isActive);
    const [colorDark, setColorDark] = useState(qr.colorDark || '#000000');
    const [colorLight, setColorLight] = useState(qr.colorLight || '#ffffff');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onSave({ id: qr.id, currentUrl: url, isActive, colorDark, colorLight });
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>

                <h3 className="text-xl font-bold text-slate-900 mb-6">Edit QR Code</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Destination URL</label>
                        <input
                            type="url"
                            required
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Foreground</label>
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <input
                                    type="color"
                                    value={colorDark}
                                    onChange={e => setColorDark(e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                />
                                <span className="text-xs font-mono text-slate-500">{colorDark}</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Background</label>
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <input
                                    type="color"
                                    value={colorLight}
                                    onChange={e => setColorLight(e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                />
                                <span className="text-xs font-mono text-slate-500">{colorLight}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">Active Status</span>
                        <button
                            type="button"
                            onClick={() => setIsActive(!isActive)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isActive ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? 'Saving...' : <><Save size={20} /> Save Changes</>}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

export default function MyQRCodes() {
    const queryClient = useQueryClient();
    const location = useLocation();
    const navigate = useNavigate();
    const [selectedQr, setSelectedQr] = useState(null);
    const [editingQr, setEditingQr] = useState(null);

    const { data: qrs, isLoading, isError, error } = useQuery({
        queryKey: ['qrs'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/qr`);
            return res.data;
        }
    });

    // Handle navigation from Dashboard
    useEffect(() => {
        if (location.state?.viewQrId && qrs) {
            const qrToView = qrs.find(q => q.id === location.state.viewQrId);
            if (qrToView) {
                setSelectedQr(qrToView);
                navigate(location.pathname, { replace: true, state: {} }); // Clear state
            }
        }
    }, [location.state, qrs, navigate]);

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await axios.delete(`${API_URL}/api/qr/${id}`);
        },
        onSuccess: () => queryClient.invalidateQueries(['qrs'])
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, currentUrl, isActive, colorDark, colorLight }) => {
            await axios.put(`${API_URL}/api/qr/${id}`, { currentUrl, isActive, colorDark, colorLight });
        },
        onSuccess: () => queryClient.invalidateQueries(['qrs'])
    });

    if (isLoading) return <div className="text-center py-20 text-slate-500">Loading QR Codes...</div>;
    if (isError) return (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
            Error loading data: {error.message}. Is the backend running?
        </div>
    );

    return (
        <>
            <AnimatePresence>
                {selectedQr && <ViewModal qr={selectedQr} onClose={() => setSelectedQr(null)} />}
                {editingQr && <EditModal qr={editingQr} onClose={() => setEditingQr(null)} onSave={updateMutation.mutateAsync} />}
            </AnimatePresence>

            <div>
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-800">My QR Codes</h2>
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-medium">
                        {qrs?.length || 0} Active
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {qrs?.map((qr, index) => (
                        <motion.div
                            key={qr.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-white rounded-2xl p-6 shadow-sm border ${qr.isActive ? 'border-slate-100' : 'border-slate-200 bg-slate-50 opacity-75'} hover:shadow-md transition-all group relative`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div
                                    className="h-12 w-12 bg-white rounded-lg p-1 border border-slate-100 cursor-pointer"
                                    onClick={() => setSelectedQr(qr)}
                                >
                                    <img src={qr.qrImageUrl} alt="QR" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setSelectedQr(qr)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"
                                        title="View"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/analytics/${qr.id}`)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"
                                        title="Analytics"
                                    >
                                        <BarChart2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => setEditingQr(qr)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.download = `${qr.name}_QR.png`;
                                            link.href = qr.qrImageUrl;
                                            link.click();
                                        }}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button
                                        onClick={() => deleteMutation.mutate(qr.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-900 mb-1">{qr.name}</h3>
                            <p className="text-xs text-slate-400 font-mono mb-4">{qr.shortCode}</p>

                            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 truncate mb-4 flex items-center gap-2">
                                <ExternalLink size={14} className="flex-shrink-0" />
                                <a href={qr.currentUrl} target="_blank" rel="noreferrer" className="truncate hover:text-indigo-600 hover:underline">{qr.currentUrl}</a>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                                <span className="text-xs text-slate-400 shadow-sm">Created {new Date(qr.createdAt).toLocaleDateString()}</span>
                                {!qr.isActive && (
                                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">Inactive</span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {qrs?.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <QrCode size={32} />
                        </div>
                        <h3 className="text-slate-900 font-bold mb-2">No QR Codes Yet</h3>
                        <p className="text-slate-500">Create your first campaign to get started.</p>
                    </div>
                )}
            </div>
        </>
    );
}
