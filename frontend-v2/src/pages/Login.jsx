import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, firebaseLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // 1. Try Firebase Login first
            let firebaseUserStr = null;
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const token = await userCredential.user.getIdToken();
                const loggedInUser = await firebaseLogin(token);
                toast.success(`Welcome back, ${loggedInUser.name || loggedInUser.email.split('@')[0]}!`);
                navigate('/');
                return;
            } catch (firebaseError) {
                // If user not found in Firebase, fall through to Legacy Login
                if (firebaseError.code !== 'auth/user-not-found' && firebaseError.code !== 'auth/invalid-credential') {
                    throw firebaseError; // Re-throw real errors (wrong password, etc.)
                    // Note: 'auth/invalid-credential' covers user-not-found AND wrong-password in newer SDKs sometimes, 
                    // but usually we want to try legacy if it fails. 
                    // Ideally we only try legacy if we are sure it's not a Firebase user. 
                    // But since emails are unique, if Firebase says invalid creds, it could be a legacy user.
                }
            }

            // 2. Try Legacy Login (Postgres Backend)
            const user = await login(email, password);
            toast.success(`Welcome back, ${user.name || user.email.split('@')[0]}!`);
            navigate('/');

        } catch (error) {
            console.error(error);
            if (error.response) {
                toast.error(error.response.data.error || 'Failed to login');
            } else {
                toast.error('Invalid email or password');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const token = await result.user.getIdToken();
            const loggedInUser = await firebaseLogin(token);
            toast.success(`Welcome back, ${loggedInUser.name || loggedInUser.email.split('@')[0]}!`);
            navigate('/');
        } catch (error) {
            console.error(error);
            if (error.response?.data?.error) {
                toast.error(error.response.data.error); // Show "Verify email" error from backend
            } else {
                toast.error('Google Sign-In Failed');
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-300">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Qurio QR</h1>
                    <p className="text-slate-500 dark:text-slate-400">Sign in to your account</p>
                </div>

                {/* Google Sign In */}
                <button
                    onClick={handleGoogleLogin}
                    type="button"
                    className="w-full py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 mb-6"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Continue with Gmail
                </button>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">Or sign in with email</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <Mail size={20} />}
                        Sign In with Email
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                        Create one
                    </Link>
                </div>
            </div>
        </div>
    );
}

