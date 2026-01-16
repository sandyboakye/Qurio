import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { QrCode, Smartphone, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_BACKEND_URL;

function StatCard({ icon: Icon, label, value, color }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
            <div>
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                <div className="text-sm text-slate-500 font-medium">{label}</div>
            </div>
        </motion.div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { data: qrs, isLoading: isLoadingQrs } = useQuery({
        queryKey: ['qrs'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/qr?limit=5`);
            return res.data;
        }
    });

    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['global-stats'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/qr/analytics/global`);
            return res.data;
        }
    });

    if (isLoadingQrs || isLoadingStats) return <div className="text-slate-500">Loading stats...</div>;

    const totalQRs = stats?.summary?.totalQRs || 0;
    const activeQRs = stats?.summary?.activeQRs || 0;
    const totalScans = stats?.summary?.totalScans || 0;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
                <div className="text-sm text-slate-400">Last updated: Just now</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={QrCode} label="Total QR Codes" value={totalQRs} color="bg-blue-500 shadow-blue-200" />
                <StatCard icon={Smartphone} label="Total Scans" value={totalScans} color="bg-emerald-500 shadow-emerald-200" />
                <StatCard icon={Users} label="Active Campaigns" value={activeQRs} color="bg-violet-500 shadow-violet-200" />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                    {qrs?.slice(0, 5).map(qr => (
                        <div
                            key={qr.id}
                            onClick={() => navigate('/list', { state: { viewQrId: qr.id } })}
                            className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors group cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg p-1">
                                    <img src={qr.qrImageUrl} alt="" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-900">{qr.name}</div>
                                    <div className="text-xs text-slate-400">
                                        {new Date(qr.createdAt || Date.now()).toLocaleDateString(undefined, {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${qr.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {qr.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    ))}
                    {(!qrs || qrs.length === 0) && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No recent activity found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
