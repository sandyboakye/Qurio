import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ adminOnly = false, enterpriseOnly = false }) {
    const { user, loading } = useAuth();

    if (loading) return null; // Or a spinner

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && user.role !== 'admin') {
        return <Navigate to="/" replace />; // Redirect non-admins to dashboard
    }

    if (enterpriseOnly && !user.has_enterprise && user.role !== 'admin') {
        return <Navigate to="/" replace />; // Redirect non-enterprise users
    }

    return <Outlet />;
}
