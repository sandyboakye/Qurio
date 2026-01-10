import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, Loader2, Smartphone, Globe, Monitor, Activity, Download, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_BACKEND_URL;
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981'];

export default function Analytics() {
    const { id } = useParams();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['analytics', id],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/qr/${id}/analytics`);
            return res.data;
        }
    });

    const handleExportCSV = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/qr/${id}/export`);
            const rows = res.data;

            if (!rows || rows.length === 0) {
                alert("No scan data to export.");
                return;
            }

            const headers = ["Time", "IP", "Country", "City", "Device", "Browser", "OS"];
            const csvRows = rows.map(s => [
                new Date(s.scanned_at).toLocaleString().replace(/,/g, ''),
                s.ip_address,
                s.country,
                s.city,
                s.device_type,
                s.browser,
                s.os
            ]);

            const csvContent = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `qr_${id}_analytics.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Export failed", err);
            alert("Failed to export data.");
        }
    };

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
    if (isError) return <div className="text-center py-20 text-red-500">Failed to load analytics data.</div>;

    const { scansOverTime, devices, browsers, os } = data;

    return (
        <div className="max-w-6xl mx-auto space-y-8 relative print:p-0 print:max-w-none">
            {/* Print Only Header */}
            <div className="hidden print:flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Campaign Report</h1>
                    <p className="text-slate-500 text-sm">QR Code Analytics</p>
                </div>
                <div className="text-right">
                    <div className="text-sm font-medium text-slate-600">Generated On</div>
                    <div className="text-lg font-bold text-slate-900">{new Date().toLocaleDateString()}</div>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link to="/list" className="p-2 hover:bg-slate-100 rounded-full transition-colors print:hidden">
                        <ArrowLeft size={24} className="text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Campaign Analytics</h1>
                        <p className="text-slate-500 text-sm">Detailed performance metrics</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors text-sm font-medium shadow-sm"
                    >
                        <FileText size={16} />
                        Save PDF
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-md shadow-indigo-200"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Scans Over Time - Main Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="text-indigo-600" size={20} />
                        <h2 className="font-bold text-slate-700">Scan Activity (Last 30 Days)</h2>
                    </div>

                    <div className="h-[300px] w-full">
                        {scansOverTime.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scansOverTime}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                No scan data available yet for this period.
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Device Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Smartphone className="text-purple-600" size={20} />
                        <h2 className="font-bold text-slate-700">Devices</h2>
                    </div>
                    <div className="h-[200px] flex items-center justify-center">
                        {devices.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={devices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                        {devices.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <span className="text-slate-400 text-sm">No Data</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {devices.map((d, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs text-slate-600">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                {d.name.toUpperCase()} ({d.value})
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* OS Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Monitor className="text-pink-600" size={20} />
                        <h2 className="font-bold text-slate-700">Operating System</h2>
                    </div>
                    <div className="h-[200px] flex items-center justify-center">
                        {os.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={os} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                        {os.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <span className="text-slate-400 text-sm">No Data</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {os.map((d, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs text-slate-600">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                {d.name} ({d.value})
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Browser Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Globe className="text-emerald-600" size={20} />
                        <h2 className="font-bold text-slate-700">Browsers</h2>
                    </div>
                    <div className="space-y-3">
                        {browsers.length > 0 ? browsers.map((b, i) => (
                            <div key={i} className="relative">
                                <div className="flex justify-between text-xs font-medium text-slate-600 mb-1 z-10 relative">
                                    <span>{b.name}</span>
                                    <span>{b.value}</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${(b.value / Math.max(...browsers.map(x => x.value))) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )) : <div className="text-center py-10 text-slate-400 text-sm">No Data</div>}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
