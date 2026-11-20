'use client'

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ShieldAlert, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { canAccessAdmin, canAccessAdminPath, getUserRole } from '../../utils/adminUtils';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/sign-in';
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to access the admin panel. 
            Redirecting you to the login page...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Check if user has staff/admin permissions
  if (!canAccessAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6 text-sm">
            You don't have permission to access the admin panel. 
            Only administrators and staff members can view this area.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-teal-600 text-white py-2 px-4 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm"
            >
              Go to Homepage
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              Go to Customer Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Section-level access check for Employees
  const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
  if (!canAccessAdminPath(user, currentPath)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl border border-amber-200/60 flex items-center justify-center mx-auto mb-4 text-amber-600">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Section Restricted</h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Your account has the <strong className="text-gray-900 font-semibold">Employee</strong> role, which does not have permission to access this administrative tab. Please contact an administrator if you need access.
          </p>
          <div className="space-y-2.5">
            <button
              onClick={() => window.location.href = '/admin/dashboard'}
              className="w-full bg-teal-600 text-white py-2 px-4 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/admin/orders'}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              Go to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;




