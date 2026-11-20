'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from '@/src/compat/router';
import { usePreserveNavScroll } from '@/src/hooks/usePreserveNavScroll';
import { supabase } from '@/src/services/supabaseService';
import { RealUserService } from '@/src/services/realUserService';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUserRole, EMPLOYEE_ALLOWED_SECTIONS, getEmployeeAllowedSections } from '@/src/utils/adminUtils';
import {
  BarChart3,
  ShoppingBag,
  Users,
  Mail,
  TrendingUp,
  Home,
  Palette,
  LogOut,
  Package,
  ChevronRight,
  CheckSquare,
  Activity,
  Table,
  Truck,
  MessageSquare,
  RotateCcw,
  Brush,
  Layers,
  FileText,
  Share2,
  Gift,
  Rss
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMenuItemClick: () => void;
  onExpand: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, onMenuItemClick, onExpand, onLogout }) => {
  const location = useLocation();
  const { user } = useAuth();
  const userRole = getUserRole(user);
  const { navRef, onNavScroll } = usePreserveNavScroll([location.pathname]);
  const [hoveredItem, setHoveredItem] = useState<{ label: string; top: number } | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState<number>(0);
  const [newMessagesCount, setNewMessagesCount] = useState<number>(0);
  const [newUsersCount, setNewUsersCount] = useState<number>(0);

  const ordersCountRef = useRef<number>(0);
  const messagesCountRef = useRef<number>(0);
  const usersCountRef = useRef<number>(0);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      playTone(523.25, now, 0.4);      // C5 note
      playTone(783.99, now + 0.12, 0.6); // G5 note
    } catch (e) {
      console.log('Notification audio play blocked or failed:', e);
    }
  };

  const updateOrdersCount = (count: number, playSound: boolean) => {
    if (playSound && count > ordersCountRef.current) {
      playNotificationSound();
    }
    ordersCountRef.current = count;
    setNewOrdersCount(count);
  };

  const updateMessagesCount = (count: number, playSound: boolean) => {
    if (playSound && count > messagesCountRef.current) {
      playNotificationSound();
    }
    messagesCountRef.current = count;
    setNewMessagesCount(count);
  };

  const updateUsersCount = (count: number, playSound: boolean) => {
    if (playSound && count > usersCountRef.current) {
      playNotificationSound();
    }
    usersCountRef.current = count;
    setNewUsersCount(count);
  };

  const fetchNewOrdersCount = async (playSound = false) => {
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (!error && count !== null) {
        updateOrdersCount(count, playSound);
      }
    } catch (err) {
      console.error('Error fetching new orders count:', err);
    }
  };

  const fetchNewMessagesCount = async (playSound = false) => {
    try {
      const { count, error } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');
      if (!error && count !== null) {
        updateMessagesCount(count, playSound);
      }
    } catch (err) {
      console.error('Error fetching new messages count:', err);
    }
  };

  const fetchNewUsersCount = async (playSound = false) => {
    try {
      const users = await RealUserService.getAllUsers();
      if (users && Array.isArray(users)) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const count = users.filter(u => new Date(u.created_at) > thirtyDaysAgo).length;
        updateUsersCount(count, playSound);
      }
    } catch (err) {
      console.error('Error fetching new users count:', err);
    }
  };

  useEffect(() => {
    fetchNewOrdersCount(false);
    fetchNewMessagesCount(false);
    fetchNewUsersCount(false);

    // Listen to real-time order changes
    const ordersChannel = supabase
      .channel('sidebar-orders-realtime')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchNewOrdersCount(true);
        }
      )
      .subscribe();

    // Listen to real-time message changes
    const messagesChannel = supabase
      .channel('sidebar-messages-realtime')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_messages'
        },
        () => {
          fetchNewMessagesCount(true);
        }
      )
      .subscribe();

    // Poll for user count every 60 seconds
    const userInterval = setInterval(() => fetchNewUsersCount(true), 60000);

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(messagesChannel);
      clearInterval(userInterval);
    };
  }, []);

  const handleMouseEnter = (e: React.MouseEvent, label: string) => {
    if (!collapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredItem({
      label,
      top: rect.top + rect.height / 2,
    });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  useEffect(() => {
    const handleScroll = () => {
      setHoveredItem(null);
    };
    const nav = navRef.current;
    if (nav) {
      nav.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (nav) {
        nav.removeEventListener('scroll', handleScroll);
      }
    };
  }, [collapsed, navRef]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/admin/dashboard' },
    { id: 'homepage', label: 'Homepage', icon: Home, path: '/admin/homepage' },
    { id: 'products', label: 'Products', icon: Package, path: '/admin/products' },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, path: '/admin/orders' },
    { id: 'blog', label: 'Blog', icon: FileText, path: '/admin/blog' },
    { id: 'marketing', label: 'Marketing', icon: TrendingUp, path: '/admin/marketing' },
    { id: 'normal', label: 'Normal', icon: Layers, path: '/admin/normal' },
    { id: 'gifts', label: 'Gifts', icon: Gift, path: '/admin/gifts' },
    { id: 'shipping', label: 'Shipping', icon: Truck, path: '/admin/shipping' },
    { id: 'returns', label: 'Returns', icon: RotateCcw, path: '/admin/returns' },
    { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
    { id: 'customer-care', label: 'Customer Care', icon: MessageSquare, path: '/admin/customer-care' }
  ];

  const displayedMenuItems = React.useMemo(() => {
    if (userRole === 'employee') {
      const allowedSections = getEmployeeAllowedSections(user);
      const effectiveAllowed = [...allowedSections];
      if ((effectiveAllowed.includes('tasks') || effectiveAllowed.includes('analytics')) && !effectiveAllowed.includes('dashboard')) {
        effectiveAllowed.push('dashboard');
      }
      return menuItems.filter((item) => effectiveAllowed.includes(item.id));
    }
    return menuItems;
  }, [userRole, user]);

  return (
    <div
      className={`${collapsed ? 'w-20' : 'w-64'} fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/80 bg-white/60 shadow-[4px_0_30px_0_rgba(15,23,42,0.05),inset_-1px_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl transition-all duration-300 overflow-hidden`}
    >
      {/* Specular right light-edge reflection */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-white/95 via-white/50 to-white/20" />

      {/* Ambient background glow inside sidebar for smooth continuous glass refraction */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-400/8 via-indigo-400/6 to-purple-400/8 blur-xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex-shrink-0 border-b border-white/40 p-3.5 shadow-none">
        <Link to="/" className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/90 bg-white/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95)] backdrop-blur-md transition-transform duration-300 hover:scale-105">
            <img
              src="/logo.png"
              alt="Lurevi"
              className="h-7 w-auto object-contain"
            />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-slate-800 leading-tight">Lurevi</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${userRole === 'employee' ? 'bg-emerald-500' : 'bg-slate-900'} animate-pulse`} />
                <p className="text-[11px] text-slate-500 font-medium">
                  {userRole === 'employee' ? 'Employee Portal' : 'Admin Panel'}
                </p>
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation with invisible scrollbar */}
      <nav
        ref={navRef as any}
        onScroll={onNavScroll}
        className="sidebar-scroll relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2.5 scrollbar-invisible"
      >
        <ul className="space-y-1.5">
          {displayedMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path === '/admin/dashboard' && (location.pathname === '/admin' || location.pathname === '/admin/')) ||
              (item.path === '/admin/marketing' && (location.pathname.startsWith('/admin/marketing') || location.pathname === '/admin/social-posting' || location.pathname === '/admin/newsletter' || location.pathname === '/admin/email'));

            return (
              <li key={item.id}>
                <div className="relative group">
                  <Link
                    to={item.path}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={(e) => handleMouseEnter(e, item.label)}
                    onMouseLeave={handleMouseLeave}
                    className={`relative flex items-center ${collapsed ? 'justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} rounded-2xl transition-all duration-200 cursor-pointer ${isActive
                      ? 'bg-slate-900/90 text-white shadow-[0_4px_16px_rgba(15,23,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-white/30 backdrop-blur-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:shadow-[0_2px_10px_rgba(15,23,42,0.03)] hover:border-white/80 border border-transparent'
                      }`}
                  >
                    {isActive && (
                      <span
                        className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-teal-400 to-emerald-400 shadow-[0_0_8px_rgba(45,212,191,0.8)] pointer-events-none"
                        aria-hidden
                      />
                    )}
                    <Icon
                      className={`relative z-10 shrink-0 h-4 w-4 transition-transform duration-200 ${isActive
                        ? 'text-white'
                        : 'text-slate-500 group-hover:text-slate-800 group-hover:scale-110'
                        }`}
                      strokeWidth={2}
                    />
                    {!collapsed && <span className="font-semibold text-xs tracking-tight">{item.label}</span>}
                    {item.id === 'orders' && newOrdersCount > 0 && (
                      collapsed ? (
                        <span className="absolute top-1 right-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[8px] font-bold min-w-[15px] h-[15px] px-0.5 rounded-full animate-pulse flex items-center justify-center border border-white/80 shadow-[0_2px_8px_rgba(244,63,94,0.4)] backdrop-blur-md z-20">
                          {newOrdersCount}
                        </span>
                      ) : (
                        <span className="ml-auto bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse min-w-[18px] h-4 flex items-center justify-center border border-white/80 shadow-[0_2px_8px_rgba(244,63,94,0.4)] backdrop-blur-md">
                          {newOrdersCount}
                        </span>
                      )
                    )}
                    {item.id === 'customer-care' && newMessagesCount > 0 && (
                      collapsed ? (
                        <span className="absolute top-1 right-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[8px] font-bold min-w-[15px] h-[15px] px-0.5 rounded-full animate-pulse flex items-center justify-center border border-white/80 shadow-[0_2px_8px_rgba(244,63,94,0.4)] backdrop-blur-md z-20">
                          {newMessagesCount}
                        </span>
                      ) : (
                        <span className="ml-auto bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse min-w-[18px] h-4 flex items-center justify-center border border-white/80 shadow-[0_2px_8px_rgba(244,63,94,0.4)] backdrop-blur-md">
                          {newMessagesCount}
                        </span>
                      )
                    )}
                    {item.id === 'users' && newUsersCount > 0 && (
                      collapsed ? (
                        <span className="absolute top-1 right-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[8px] font-bold min-w-[15px] h-[15px] px-0.5 rounded-full animate-pulse flex items-center justify-center border border-white/80 shadow-[0_2px_8px_rgba(244,63,94,0.4)] backdrop-blur-md z-20">
                          {newUsersCount}
                        </span>
                      ) : (
                        <span className="ml-auto bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse min-w-[18px] h-4 flex items-center justify-center border border-white/80 shadow-[0_2px_8px_rgba(244,63,94,0.4)] backdrop-blur-md">
                          {newUsersCount}
                        </span>
                      )
                    )}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section - User Info & Logout Button */}
      <div className="relative z-10 border-t border-white/60 p-2.5 flex-shrink-0 space-y-1.5 bg-white/30 backdrop-blur-md">
        {!collapsed && user?.email && (
          <div className="px-3 py-2 rounded-xl bg-white/60 border border-white/80 shadow-2xs backdrop-blur-sm flex items-center justify-between text-xs">
            <span className="truncate text-slate-600 font-medium max-w-[120px]" title={user.email}>
              {user.email}
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${userRole === 'employee'
              ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
              : 'bg-slate-900/10 text-slate-800 border border-slate-900/15'
              }`}>
              {userRole}
            </span>
          </div>
        )}
        {collapsed ? (
          <div className="relative group">
            <button
              onClick={onLogout}
              onMouseEnter={(e) => handleMouseEnter(e, 'Logout')}
              onMouseLeave={handleMouseLeave}
              className="flex items-center justify-center w-full py-2.5 px-3 text-slate-500 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/20 border border-transparent rounded-2xl transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="flex items-center space-x-3 w-full px-3.5 py-2.5 text-slate-600 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/20 border border-transparent rounded-2xl transition-all duration-200 group cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-500 transition-transform duration-200 group-hover:scale-110" />
            <span className="font-semibold text-xs">Logout</span>
          </button>
        )}
      </div>

      {/* Portal-like Tooltip for collapsed state - avoids overflow-x-hidden clipping */}
      {collapsed && hoveredItem && (
        <div
          className="fixed rounded-xl border border-white/80 bg-slate-900/90 text-white text-xs font-semibold px-3 py-1.5 whitespace-nowrap z-50 pointer-events-none shadow-[0_8px_24px_rgba(15,23,42,0.25)] backdrop-blur-xl"
          style={{
            top: `${hoveredItem.top}px`,
            left: '88px', // w-20 (80px) + ml-2 (8px)
            transform: 'translateY(-50%)'
          }}
        >
          {hoveredItem.label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900/90" />
        </div>
      )}
    </div>
  );
};

export default Sidebar;




