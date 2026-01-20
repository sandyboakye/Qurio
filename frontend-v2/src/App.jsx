
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutDashboard, PlusCircle, List, BarChart2, Layers, LogOut, QrCode, ScanBarcode, Shield, Menu, X, Settings, HelpCircle } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

import Dashboard from './pages/Dashboard';
import CreateQR from './pages/CreateQR';
import MyQRCodes from './pages/MyQRCodes';
import Analytics from './pages/Analytics';
import GlobalAnalytics from './pages/GlobalAnalytics';
import BulkCreate from './pages/BulkCreate';
import BarcodeGenerator from './pages/BarcodeGenerator';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import Account from './pages/Account';
import Support from './pages/Support';



const queryClient = new QueryClient();

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setMode } = useTheme();
  const isActive = (path) => location.pathname === path;

  const NavItem = ({ path, icon: Icon, label }) => (
    <Link
      to={path}
      onClick={() => onClose && onClose()} // Close on navigation on mobile
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive(path)
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
        }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 bg-white dark:bg-slate-800 h-[100dvh] border-r border-slate-100 dark:border-slate-700 flex flex-col p-6 fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } overflow-hidden shadow-2xl md:shadow-none`}>
        <div className="flex items-center justify-between mb-8 px-2 shrink-0">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor" fillOpacity="0.4" />
                <path d="M11 7H13V13H11V7Z" fill="currentColor" />
                <circle cx="12" cy="16" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Qurio QR</h1>
              <span className="text-xs text-slate-400 font-medium">Smart QR Platform</span>
            </div>
          </Link>
          {/* Close Button Mobile */}
          <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6 px-2 shrink-0">
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user?.name || user?.email}</div>
          <div className="text-xs text-slate-400 uppercase font-bold">{user?.role}</div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto py-2 scrollbar-thin min-h-0">
          <NavItem path="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem path="/create" icon={PlusCircle} label="Create QR" />
          <NavItem path="/list" icon={List} label="My QR Codes" />
          <NavItem path="/analytics" icon={BarChart2} label="Analytics" />
          <NavItem path="/account" icon={Settings} label="Account" />
          <NavItem path="/support" icon={HelpCircle} label="Help & Support" />

          {(user?.role === 'admin' || user?.has_enterprise) && (
            <div className="pt-4 pb-2">
              <div className="text-xs font-bold text-slate-400 px-4 uppercase tracking-wider mb-2">Enterprise Tools</div>
              <NavItem path="/bulk" icon={Layers} label="Bulk Create" />
              <NavItem path="/barcode" icon={ScanBarcode} label="Barcode Generator" />
            </div>
          )}

          {user?.role === 'admin' && (
            <div className="pt-4 pb-2">
              <div className="text-xs font-bold text-slate-400 px-4 uppercase tracking-wider mb-2">Admin</div>
              <NavItem path="/admin" icon={Shield} label="Admin Portal" />
            </div>
          )}
        </nav>

        {/* Theme Toggle */}
        {/* Theme Toggle Removed - Forced Light Mode */}


        <div className="pt-4 shrink-0 pb-safe">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all w-full"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}

function Layout({ children }) {
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 md:pl-64 transition-all duration-300">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <span className="font-bold text-sm">Q</span>
            </div>
            <h1 className="font-bold text-slate-900 dark:text-white">Qurio QR</h1>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Toaster position="top-right" />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected User Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Layout><Dashboard /></Layout>} />
                <Route path="/create" element={<Layout><CreateQR /></Layout>} />
                <Route path="/list" element={<Layout><MyQRCodes /></Layout>} />
                <Route path="/analytics" element={<Layout><GlobalAnalytics /></Layout>} />
                <Route path="/analytics/:id" element={<Layout><Analytics /></Layout>} />
                <Route path="/account" element={<Layout><Account /></Layout>} />
                <Route path="/support" element={<Layout><Support /></Layout>} />
              </Route>

              {/* Enterprise Routes */}
              <Route element={<ProtectedRoute enterpriseOnly={true} />}>
                <Route path="/bulk" element={<Layout><BulkCreate /></Layout>} />
                <Route path="/barcode" element={<Layout><BarcodeGenerator /></Layout>} />
              </Route>

              {/* Protected Admin Routes */}
              <Route element={<ProtectedRoute adminOnly={true} />}>
                <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
