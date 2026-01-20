import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Loader2, Smartphone, Globe, Monitor, Activity, TrendingUp, Clock, MapPin, X, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_BACKEND_URL;
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981'];

export default function GlobalAnalytics() {
    const [selectedStat, setSelectedStat] = useState(null); // 'scans', 'qrs', 'active'

    const { data, isLoading, isError } = useQuery({
        queryKey: ['global-metrics'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/qr/analytics/global`);
            return res.data;
        }
    });

    const handleExportCSV = async () => {
        try {
            // Fetch full dataset
            const res = await axios.get(`${API_URL}/api/qr/analytics/export`);
            const rows = res.data;

            if (!rows || rows.length === 0) {
                alert("No data to export");
                return;
            }

            const headers = ["Time", "QR Name", "Target URL", "IP", "Country", "City", "Device", "Browser", "OS"];
            const csvRows = rows.map(s => [
                new Date(s.scanned_at).toLocaleString().replace(/,/g, ''), // remove commas for CSV safety
                `"${s.qr_name}"`, // Quote strings
                `"${s.current_url}"`,
                s.ip_address,
                s.country,
                s.city,
                s.device_type,
                s.browser,
                s.os
            ]);

            const csvContent = [
                headers.join(","),
                ...csvRows.map(r => r.join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `qurio_full_analytics_${new Date().toISOString().split('T')[0]}.csv`);
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

    const { summary, charts, lists } = data;
    const { scansOverTime, scansByHour, devices, browsers, os } = charts;

    // ... StatCard component ...
    const StatCard = ({ title, value, type, color }) => (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedStat(type)}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer relative overflow-hidden group"
        >
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                <Activity size={48} />
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">{title}</div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white">{value}</div>
            <div className="text-xs text-indigo-500 dark:text-indigo-400 mt-2 font-medium flex items-center gap-1">
                View Details <TrendingUp size={12} />
            </div>
        </motion.div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 relative print:p-8 print:max-w-none print:space-y-4">
            {/* Print Only Header */}
            <div className="hidden print:flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Qurio Analytics</h1>
                    <p className="text-slate-500 text-sm">Platform Performance Summary</p>
                </div>
                <div className="text-right">
                    <div className="text-sm font-medium text-slate-600">Report Generated</div>
                    <div className="text-lg font-bold text-slate-900">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
            </div>

            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <TrendingUp className="text-indigo-600 dark:text-indigo-400" />
                        Detailed Analytics
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Comprehensive view of all QR code performance across the platform.</p>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm font-medium shadow-sm"
                    >
                        <FileText size={16} />
                        Save as PDF
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-md shadow-indigo-200 dark:shadow-none"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Platform Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid print:grid-cols-3 print:gap-4 print:mb-4">
                <StatCard title="Total Scans" value={summary.totalScans} type="scans" color="text-indigo-600" />
                <StatCard title="Total QR Codes" value={summary.totalQRs} type="qrs" color="text-purple-600" />
                <StatCard title="Active Campaigns" value={summary.activeQRs} type="active" color="text-emerald-600" />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid print:grid-cols-3 print:gap-4">

                {/* Hourly Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 print:col-span-2 print:p-4 print:h-[200px]"
                >
                    <div className="flex items-center gap-2 mb-6 print:mb-2">
                        <Clock className="text-indigo-600 dark:text-indigo-400" size={20} />
                        <h2 className="font-bold text-slate-700 dark:text-slate-200">Time of Day Activity</h2>
                    </div>
                    <div className="h-[250px] w-full print:h-[140px]">
                        {scansByHour && scansByHour.some(h => h.count > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={scansByHour}>
                                    <defs>
                                        <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#colorHour)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                <Clock size={32} className="mb-2 opacity-20" />
                                <span className="text-sm font-medium">No activity data available</span>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Scans Over Time - Small */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 print:col-span-1 print:p-4 print:h-[200px]"
                >
                    <div className="flex items-center gap-2 mb-6 print:mb-2">
                        <Activity className="text-pink-500" size={20} />
                        <h2 className="font-bold text-slate-700 dark:text-slate-200">Daily Trend</h2>
                    </div>
                    <div className="h-[250px] w-full print:h-[140px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scansOverTime}>
                                <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Device Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 print:col-span-1 print:p-4 print:h-[220px]"
                >
                    <div className="flex items-center gap-2 mb-4 print:mb-2">
                        <Smartphone className="text-purple-600 dark:text-purple-400" size={20} />
                        <h2 className="font-bold text-slate-700 dark:text-slate-200">Devices</h2>
                    </div>
                    <div className="h-[200px] flex items-center justify-center print:h-[140px]">
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
                    <div className="flex flex-wrap gap-2 justify-center mt-4 print:hidden">
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
                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 print:col-span-1 print:p-4 print:h-[220px]"
                >
                    <div className="flex items-center gap-2 mb-4 print:mb-2">
                        <Monitor className="text-pink-600 dark:text-pink-400" size={20} />
                        <h2 className="font-bold text-slate-700 dark:text-slate-200">Operating System</h2>
                    </div>
                    <div className="h-[200px] flex items-center justify-center print:h-[140px]">
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
                    <div className="flex flex-wrap gap-2 justify-center mt-4 print:hidden">
                        {os.map((d, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs text-slate-600">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                {d.name} ({d.value})
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Location Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 print:col-span-1 print:p-4 print:h-[220px]"
                >
                    <div className="flex items-center gap-2 mb-4 print:mb-2">
                        <Globe className="text-emerald-600 dark:text-emerald-400" size={20} />
                        <h2 className="font-bold text-slate-700 dark:text-slate-200">Location Preview</h2>
                    </div>
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                        <MapPin size={32} className="mx-auto mb-2 text-emerald-200 dark:text-emerald-800" />
                        See "Total Scans" for details
                    </div>
                </motion.div>

                {/* Browsers - Hidden on Print */}
                <motion.div className="print:hidden">
                    {/* ... (Hidden content placeholder if needed, but the div itself is hidden) ... */}
                </motion.div>

            </div>

            {/* Glassy Modal Overlay */}
            <AnimatePresence>
                {selectedStat && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedStat(null)}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl border border-white/20 dark:border-slate-700 shadow-2xl rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                    {selectedStat === 'scans' && 'Recent Scans Log'}
                                    {selectedStat === 'qrs' && 'All QR Codes'}
                                    {selectedStat === 'active' && 'Active Campaigns'}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {selectedStat === 'scans' && (
                                        <button
                                            onClick={handleExportCSV}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-bold"
                                        >
                                            <Download size={14} />
                                            Save CSV
                                        </button>
                                    )}
                                    <button onClick={() => setSelectedStat(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                        <X size={20} className="text-slate-500" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                {selectedStat === 'scans' && (
                                    <div className="space-y-4">
                                        {lists?.recentScans?.map((scan, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">
                                                        {scan.country?.substring(0, 2).toUpperCase() || 'NA'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-white">{scan.qr_name}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <MapPin size={10} /> {scan.city || 'Unknown'}, {scan.country || 'Unknown'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-mono text-slate-400 dark:text-slate-500">
                                                        {new Date(scan.scanned_at).toLocaleTimeString()}
                                                    </div>
                                                    <div className="text-[10px] text-slate-300 dark:text-slate-600">
                                                        {new Date(scan.scanned_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!lists?.recentScans || lists.recentScans.length === 0) && (
                                            <div className="text-center py-10 text-slate-400">No scans recorded yet.</div>
                                        )}
                                    </div>
                                )}
                                {selectedStat !== 'scans' && (
                                    <div className="text-center py-12 text-slate-400">
                                        Detailed view for {selectedStat} is coming soon in V2.1.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
