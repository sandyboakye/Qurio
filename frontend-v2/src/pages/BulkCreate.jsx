import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function BulkCreate() {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error'
    const navigate = useNavigate();

    const handleDownloadTemplate = () => {
        const headers = "name,target_url,color_dark,color_light";
        const sample = "Summer Promo,https://example.com/summer,#6366f1,#ffffff\nWinter Sale,https://example.com/winter,#ec4899,#ffffff";
        const csvContent = `${headers}\n${sample}`;

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "qurio_bulk_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setIsUploading(true);
        setStatus(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${API_URL}/api/qr/bulk`, formData, {
                responseType: 'blob', // Important for Zip download
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Trigger Download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `qurio_bulk_generated.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setStatus('success');
            setTimeout(() => navigate('/list'), 3000); // Redirect to list after success
        } catch (error) {
            console.error(error);
            setStatus('error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-10">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Bulk Creation</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Upload a CSV to generate hundreds of QR codes instantly.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Step 1: Template */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4">
                        <FileSpreadsheet size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">1. Get the Template</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Download our CSV template. Fill it with your campaign details. Do not change the headers.</p>
                    <button
                        onClick={handleDownloadTemplate}
                        className="w-full py-2.5 border-2 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-center gap-2"
                    >
                        <Download size={18} />
                        Download CSV Template
                    </button>
                </motion.div>

                {/* Step 2: Upload */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
                        <Upload size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">2. Upload & Generate</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Upload your filled CSV. We'll generate the QR codes and a ZIP file for you.</p>

                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="relative">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="block w-full text-sm text-slate-500 dark:text-slate-400
                                    file:mr-4 file:py-2.5 file:px-4
                                    file:rounded-xl file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-400
                                    hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50
                                    cursor-pointer"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!file || isUploading}
                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all
                                ${!file || isUploading ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl'}`}
                        >
                            {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                            {isUploading ? 'Processing...' : 'Generate QRs'}
                        </button>
                    </form>
                </motion.div>
            </div>

            {/* Status Messages */}
            {status === 'success' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-800"
                >
                    <CheckCircle />
                    <div>
                        <span className="font-bold">Success!</span> Your QR codes have been created and the ZIP file is downloading.
                    </div>
                </motion.div>
            )}

            {status === 'error' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-3 border border-red-100 dark:border-red-800"
                >
                    <AlertCircle />
                    <div>
                        <span className="font-bold">Error!</span> Something went wrong. Please check your CSV format and try again.
                    </div>
                </motion.div>
            )}
        </div>
    );
}
