import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Link, Loader2, ArrowRight, Palette, Eye, QrCode, Image, X } from 'lucide-react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function CreateQR() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        colorDark: '#000000',
        colorLight: '#ffffff'
    });
    const [previewImage, setPreviewImage] = useState('');
    const [error, setError] = useState('');

    // Live Preview Effect
    React.useEffect(() => {
        const generatePreview = async () => {
            try {
                // Use a placeholder if URL is empty to still show colors
                const content = formData.url || 'https://example.com';
                const url = await QRCode.toDataURL(content, {
                    width: 400,
                    margin: 1,
                    color: {
                        dark: formData.colorDark,
                        light: formData.colorLight
                    }
                });
                setPreviewImage(url);
            } catch (err) {
                console.error("Preview Generation Error", err);
            }
        };

        const timer = setTimeout(generatePreview, 100); // Debounce
        return () => clearTimeout(timer);
    }, [formData.url, formData.colorDark, formData.colorLight]);

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await axios.post(`${API_URL}/api/qr/create`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['qrs']);
            navigate('/list');
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to create QR code');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.url) return;
        createMutation.mutate(formData);
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Visual Preview Sidebar */}
                <div className="lg:col-span-1 order-last">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sticky top-8"
                    >
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Eye size={16} /> Live Preview
                        </h3>

                        <div className="aspect-square bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative transition-colors duration-300" style={{ backgroundColor: formData.colorLight }}>
                            {previewImage ? (
                                <img src={previewImage} alt="Preview" className="w-full h-full object-contain p-4 transition-all duration-300" />
                            ) : (
                                <div className="text-center text-slate-300">
                                    <QrCode size={48} className="mx-auto mb-2 opacity-50" />
                                    <span className="text-xs">Preview Area</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 text-center">
                            <p className="text-xs text-slate-400 mb-1">Scan to test (points to destination)</p>
                            {!formData.url && <p className="text-xs text-amber-500">Enter a URL to activate</p>}
                        </div>
                    </motion.div>
                </div>

                {/* Main Form */}
                <div className="lg:col-span-2">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden"
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white">
                            <h2 className="text-2xl font-bold mb-2">Create New QR Code</h2>
                            <p className="text-indigo-100">Generate a dynamic QR code that you can update anytime.</p>
                        </div>

                        <div className="p-8">
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Campaign Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                            placeholder="e.g. Summer Promo 2026"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Destination URL</label>
                                        <div className="relative">
                                            <Link className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                            <input
                                                type="url"
                                                value={formData.url}
                                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                                placeholder="https://example.com/landing-page"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Palette className="text-indigo-600" size={20} />
                                        <h3 className="font-bold text-slate-800">Design & Colors</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Foreground Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={formData.colorDark}
                                                    onChange={e => setFormData({ ...formData, colorDark: e.target.value })}
                                                    className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
                                                />
                                                <span className="text-sm font-mono text-slate-600 uppercase">{formData.colorDark}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Background Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={formData.colorLight}
                                                    onChange={e => setFormData({ ...formData, colorLight: e.target.value })}
                                                    className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
                                                />
                                                <span className="text-sm font-mono text-slate-600 uppercase">{formData.colorLight}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    {createMutation.isPending ? (
                                        <>
                                            <Loader2 className="animate-spin" /> Creating...
                                        </>
                                    ) : (
                                        <>
                                            Generate QR Code <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
