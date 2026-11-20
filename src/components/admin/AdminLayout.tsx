'use client'

import React from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  noHeader?: boolean;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, noHeader = false }) => {
  const { signOut } = useAuth();
  const sidebarCollapsed = true; // Always collapsed

  const handleMenuItemClick = () => {
    // No-op since sidebar is always collapsed
  };

  const handleToggle = () => {
    // No-op since sidebar is always collapsed
  };

  const handleExpand = () => {
    // No-op since sidebar is always collapsed
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-indigo-50/25 overflow-hidden w-full max-w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={handleToggle}
        onMenuItemClick={handleMenuItemClick}
        onExpand={handleExpand}
        onLogout={handleLogout}
      />
      <div className={`flex-1 min-w-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        <div className={noHeader ? "p-0" : "p-4"}>
          {title && !noHeader && (
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;




