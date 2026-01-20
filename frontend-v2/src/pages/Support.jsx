import React, { useState } from 'react';
import axios from 'axios';
import { Mail, MessageSquare, Send, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function Support() {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/support`, { message });
            toast.success('Message sent! We will get back to you shortly.');
            setMessage('');
        } catch (error) {
            console.error(error);
            toast.error('Failed to send message.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Help & Support</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Cards */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Mail size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Email Us</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Direct email support</p>
                            </div>
                        </div>
                        <a
                            href="mailto:fredkitchenburg@gmail.com"
                            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline break-all"
                        >
                            fredkitchenburg@gmail.com
                        </a>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Phone size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">WhatsApp</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Chat with us directly</p>
                            </div>
                        </div>
                        <a
                            href="https://wa.me/233278916087"
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                        >
                            +233 27 891 6087
                        </a>
                    </div>
                </div>

                {/* Message Form */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Quick Message</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Send a message to the admin</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="How can we help you?"
                            required
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending...' : <><Send size={18} /> Send Message</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
