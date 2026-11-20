'use client'

import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  IndianRupee,
  Users,
  TrendingUp,
  Settings,
  Plus,
  ArrowRight,
  CheckCircle,
  Activity,
  CreditCard,
  Package,
  UserPlus,
  ShoppingCart,
  Image as ImageIcon,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
  CheckSquare,
  ArrowUpRight,
  Clock,
  Sparkles,
  ChevronRight,
  Layers,
  Filter
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import Tasks from './Tasks';
import Analytics from './Analytics';
import { supabase, AnalyticsService } from '../../services/supabaseService';
import { useCurrency } from '../../contexts/CurrencyContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'tasks'>('overview');
  const [timeRange, setTimeRange] = useState('7d');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [realtimeStats, setRealtimeStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [chartSeries, setChartSeries] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [chartDateFrom, setChartDateFrom] = useState<string>('');
  const [chartDateTo, setChartDateTo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { currencySettings, convertAmount, formatCurrency } = useCurrency();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'tasks') {
        setActiveTab('tasks');
      } else if (tab === 'analytics') {
        setActiveTab('analytics');
      }
    }
  }, []);

  const handleTabChange = (tab: 'overview' | 'analytics' | 'tasks') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'overview') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Helper function to convert amounts to default currency
  const convertAmountToDefault = (amount: number, fromCurrency: string = 'USD') => {
    return convertAmount(amount, fromCurrency, currencySettings.defaultCurrency);
  };

  // Helper function to format amounts in default currency
  const formatAmountInDefault = (amount: number, fromCurrency: string = 'USD') => {
    const convertedAmount = convertAmountToDefault(amount, fromCurrency);
    return formatCurrency(convertedAmount, currencySettings.defaultCurrency);
  };

  // Fetch dashboard data with silent background refresh support
  const fetchDashboardData = async (silent: boolean = false) => {
    try {
      if (!silent) setRefreshing(true);
      const [analytics, realtime, orders, categories] = await Promise.all([
        AnalyticsService.getDashboardData(),
        AnalyticsService.getRealtimeStats(),
        AnalyticsService.getRecentOrders(5),
        AnalyticsService.getCategoryAnalytics()
      ]);
      setDashboardData(analytics);
      setRealtimeStats(realtime);
      setRecentOrders(orders);
      setCategoryData(categories);
      setChartSeries(analytics?.revenue?.monthly || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData(false);

    // Continuous live background sync every 15 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);

    // Live Supabase subscription for instant order sync
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchDashboardData(true);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchDashboardData(true);
  }, [timeRange]);

  const getUnifiedStats = () => {
    const isReady = dashboardData && realtimeStats;
    return [
      {
        title: 'Total Revenue',
        value: isReady && dashboardData.revenue?.total ? formatCurrency(dashboardData.revenue.total, currencySettings.defaultCurrency) : formatCurrency(0, currencySettings.defaultCurrency),
        change: `+${dashboardData?.revenue?.growth || 0}%`,
        trend: 'up',
        icon: IndianRupee,
        accent: 'emerald',
        description: 'vs last period',
        subTitle: 'Today Revenue',
        subValue: isReady && realtimeStats.todayRevenue ? formatAmountInDefault(realtimeStats.todayRevenue) : formatAmountInDefault(0),
        subIcon: TrendingUp,
        subColor: 'text-emerald-500',
        isRealtime: true,
      },
      {
        title: 'Active Users',
        value: isReady && dashboardData.users?.total != null ? dashboardData.users.total.toLocaleString() : '0',
        change: '+8.2%',
        trend: 'up',
        icon: Users,
        accent: 'blue',
        description: 'registered accounts',
        subTitle: 'Active Now',
        subValue: `${realtimeStats?.activeUsers || 0} live`,
        subIcon: Activity,
        subColor: 'text-teal-500',
        isRealtime: true,
      },
      {
        title: 'Total Tasks',
        value: isReady && dashboardData.tasks?.total_tasks != null ? dashboardData.tasks.total_tasks.toLocaleString() : '0',
        change: '+15.3%',
        trend: 'up',
        icon: CheckCircle,
        accent: 'purple',
        description: 'active milestones',
        subTitle: 'Conversion Rate',
        subValue: `${realtimeStats?.conversionRate || '0.0'}%`,
        subIcon: Target,
        subColor: 'text-amber-500',
        isRealtime: true,
      },
      {
        title: 'Catalog Artworks',
        value: isReady && dashboardData.products?.total != null ? dashboardData.products.total.toLocaleString() : '0',
        change: '+22.1%',
        trend: 'up',
        icon: Package,
        accent: 'amber',
        description: 'published items',
        subTitle: 'Today Orders',
        subValue: realtimeStats?.todayOrders?.toString() || '0',
        subIcon: ShoppingCart,
        subColor: 'text-indigo-500',
        isRealtime: true,
      },
    ];
  };

  const unifiedStats = getUnifiedStats();

  const revenueData = chartSeries || [];

  const convertedRevenueData = useMemo(() => {
    return revenueData.map((item: any) => ({
      ...item,
      revenue: convertAmountToDefault(item.revenue, 'INR')
    }));
  }, [revenueData, currencySettings.defaultCurrency, convertAmount]);

  const filteredRevenueData = useMemo(() => {
    return convertedRevenueData.filter((item: any) => {
      if (!chartDateFrom && !chartDateTo) return true;
      const bucketStart = item.monthStart ? new Date(item.monthStart) : null;
      const bucketEnd = item.monthEnd ? new Date(item.monthEnd) : null;
      if (!bucketStart || !bucketEnd) return true;

      const from = chartDateFrom ? new Date(`${chartDateFrom}T00:00:00`) : null;
      const to = chartDateTo ? new Date(`${chartDateTo}T23:59:59`) : null;

      if (from && bucketEnd < from) return false;
      if (to && bucketStart > to) return false;
      return true;
    });
  }, [convertedRevenueData, chartDateFrom, chartDateTo]);

  const hasRevenueData = useMemo(() => {
    return filteredRevenueData.some(
      (item: any) => (item.revenue || 0) > 0 || (item.orders || 0) > 0
    );
  }, [filteredRevenueData]);

  useEffect(() => {
    let cancelled = false;
    const loadRangeData = async () => {
      try {
        setChartLoading(true);
        const data = await AnalyticsService.getRevenueDataByDateRange(
          chartDateFrom || undefined,
          chartDateTo || undefined
        );
        if (!cancelled) {
          setChartSeries(data);
        }
      } catch (error) {
        console.error('Error loading chart range data:', error);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    };

    loadRangeData();
    return () => { cancelled = true; };
  }, [chartDateFrom, chartDateTo]);

  const convertedCategoryData = categoryData.map(item => ({
    ...item,
    sales: convertAmountToDefault(item.sales, 'INR')
  }));

  const revenueChartData = useMemo(() => {
    return {
      labels: filteredRevenueData.map((d: any) => d.month),
      datasets: [
        {
          label: 'Revenue',
          data: filteredRevenueData.map((d: any) => d.revenue || 0),
          backgroundColor: '#0d9488',
          hoverBackgroundColor: '#0f766e',
          borderRadius: 6,
          yAxisID: 'yRevenue',
          maxBarThickness: 18,
        },
        {
          label: 'Orders',
          data: filteredRevenueData.map((d: any) => d.orders || 0),
          backgroundColor: '#3b82f6',
          hoverBackgroundColor: '#2563eb',
          borderRadius: 6,
          yAxisID: 'yOrders',
          maxBarThickness: 18,
        },
      ],
    };
  }, [filteredRevenueData]);

  const revenueChartOptions: any = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#0f172a',
          bodyColor: '#334155',
          borderColor: 'rgba(226, 232, 240, 0.8)',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          cornerRadius: 10,
          usePointStyle: true,
          callbacks: {
            label: (context: any) => {
              const val = context.parsed.y;
              if (context.dataset.yAxisID === 'yRevenue') {
                return ` Revenue: ${formatCurrency(Number(val || 0), currencySettings.defaultCurrency)}`;
              }
              return ` Orders: ${Number(val || 0)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(241, 245, 249, 0.8)',
            tickLength: 6
          },
          ticks: {
            font: { size: 10, family: 'Inter, sans-serif' },
            color: '#64748b'
          },
          border: { display: false }
        },
        yRevenue: {
          type: 'linear',
          position: 'left',
          grid: {
            color: 'rgba(241, 245, 249, 0.8)'
          },
          ticks: {
            font: { size: 10, family: 'Inter, sans-serif' },
            color: '#64748b',
            callback: (val: any) => formatCurrency(Number(val || 0), currencySettings.defaultCurrency),
          },
          border: { display: false }
        },
        yOrders: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            font: { size: 10, family: 'Inter, sans-serif' },
            color: '#64748b',
            precision: 0,
          },
          border: { display: false }
        },
      },
    };
  }, [currencySettings.defaultCurrency, formatCurrency]);

  const topCategoriesSorted = useMemo(() => {
    return [...convertedCategoryData]
      .sort((a, b) => (b.sales || 0) - (a.sales || 0))
      .slice(0, 8);
  }, [convertedCategoryData]);

  const categoryChartData = useMemo(() => {
    return {
      labels: topCategoriesSorted.map((c: any) => c.name),
      datasets: [
        {
          label: 'Sales',
          data: topCategoriesSorted.map((c: any) => c.sales || 0),
          backgroundColor: topCategoriesSorted.map((c: any) => c.color || '#0d9488'),
          borderRadius: 6,
          maxBarThickness: 28,
        },
      ],
    };
  }, [topCategoriesSorted]);

  const categoryChartOptions: any = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#0f172a',
          bodyColor: '#334155',
          borderColor: 'rgba(226, 232, 240, 0.8)',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          cornerRadius: 10,
          callbacks: {
            label: (context: any) => {
              const item = topCategoriesSorted[context.dataIndex];
              const salesAmount = formatCurrency(Number(context.raw || 0), currencySettings.defaultCurrency);
              const salesCount = item?.salesCount || 0;
              return ` Amount: ${salesAmount} • ${salesCount} sales`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(241, 245, 249, 0.8)' },
          ticks: { font: { size: 10, family: 'Inter, sans-serif' }, color: '#64748b' },
          border: { display: false }
        },
        y: {
          grid: { color: 'rgba(241, 245, 249, 0.8)' },
          ticks: {
            font: { size: 10, family: 'Inter, sans-serif' },
            color: '#64748b',
            callback: (val: any) => formatCurrency(Number(val || 0), currencySettings.defaultCurrency),
          },
          border: { display: false }
        },
      },
    };
  }, [topCategoriesSorted, currencySettings.defaultCurrency, formatCurrency]);

  const convertedRecentOrders = recentOrders.map(order => ({
    ...order,
    amount: convertAmountToDefault(order.amount, order.currency || 'INR'),
    originalAmount: order.amount,
    originalCurrency: order.currency || 'INR'
  }));

  const recentActivities = [
    ...recentOrders.slice(0, 2).map(order => ({
      type: 'order',
      message: `New order from ${order.customer}`,
      details: `${order.artwork} • ${formatAmountInDefault(order.amount, order.currency || 'INR')}`,
      originalAmount: order.amount,
      time: order.time,
      icon: ShoppingCart,
      badgeColor: 'from-emerald-500/20 to-teal-500/10 text-emerald-600 border-emerald-500/20'
    })),
    {
      type: 'user',
      message: 'Verified creator joined',
      details: 'New artist catalog account verified',
      time: '15 min ago',
      icon: UserPlus,
      badgeColor: 'from-blue-500/20 to-cyan-500/10 text-blue-600 border-blue-500/20'
    },
    {
      type: 'payment',
      message: 'Razorpay settlement',
      details: `Order processed • ${formatAmountInDefault(recentOrders[0]?.amount || 0, recentOrders[0]?.currency || 'INR')}`,
      originalAmount: recentOrders[0]?.amount || 0,
      time: '1 hr ago',
      icon: CreditCard,
      badgeColor: 'from-purple-500/20 to-pink-500/10 text-purple-600 border-purple-500/20'
    }
  ];

  const convertedRecentActivities = recentActivities.map(activity => ({
    ...activity,
    details: activity.originalAmount
      ? activity.details.replace(/\$\d+\.?\d*/, formatAmountInDefault(activity.originalAmount, 'INR'))
      : activity.details
  }));

  const getTopArtworks = () => {
    if (!dashboardData?.products?.products) return [];

    return dashboardData.products.products
      .filter((product: any) => product.downloads > 0)
      .sort((a: any, b: any) => b.downloads - a.downloads)
      .slice(0, 3)
      .map((product: any) => ({
        id: product.id,
        title: product.title,
        artist: product.artist || 'Lurevi Studio',
        views: product.views ? `${(product.views / 1000).toFixed(1)}K` : '0',
        downloads: product.downloads || 0,
        revenue: (product.downloads || 0) * (product.price || 0),
        image: product.main_image || '/api/placeholder/60/60'
      }));
  };

  const topArtworks = getTopArtworks();

  const convertedTopArtworks = topArtworks.map(artwork => ({
    ...artwork,
    revenue: convertAmountToDefault(artwork.revenue, 'INR'),
    originalRevenue: artwork.revenue
  }));

  const quickActions = [
    {
      title: 'New Product',
      description: 'Upload artwork & pricing',
      icon: Plus,
      color: 'from-teal-500 to-emerald-600',
      action: () => { window.location.href = '/admin/products'; },
    },
    {
      title: 'Order Desk',
      description: 'Fulfill & track orders',
      icon: ShoppingCart,
      color: 'from-blue-500 to-indigo-600',
      action: () => { window.location.href = '/admin/orders'; },
    },
    {
      title: 'Analytics Pro',
      description: 'Deep funnel & KPIs',
      icon: BarChart3,
      color: 'from-violet-500 to-purple-600',
      action: () => { handleTabChange('analytics'); },
    },
    {
      title: 'Store Settings',
      description: 'Payments & gateway',
      icon: Settings,
      color: 'from-amber-500 to-orange-600',
      action: () => { window.location.href = '/admin/settings'; },
    },
    {
      title: 'Task Manager',
      description: 'Team operations',
      icon: CheckSquare,
      color: 'from-rose-500 to-pink-600',
      action: () => { window.location.href = '/admin/tasks'; },
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
      case 'processing':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-700 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
    }
  };

  const getAccentConfig = (accent: string) => {
    switch (accent) {
      case 'emerald':
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
          gradient: 'from-emerald-500/10 via-transparent to-transparent',
          glow: 'bg-emerald-500/15',
          border: 'hover:border-emerald-500/30'
        };
      case 'blue':
        return {
          iconBg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          gradient: 'from-blue-500/10 via-transparent to-transparent',
          glow: 'bg-blue-500/15',
          border: 'hover:border-blue-500/30'
        };
      case 'purple':
        return {
          iconBg: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
          gradient: 'from-purple-500/10 via-transparent to-transparent',
          glow: 'bg-purple-500/15',
          border: 'hover:border-purple-500/30'
        };
      case 'amber':
      default:
        return {
          iconBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          gradient: 'from-amber-500/10 via-transparent to-transparent',
          glow: 'bg-amber-500/15',
          border: 'hover:border-amber-500/30'
        };
    }
  };

  return (
    <AdminLayout title="Dashboard" noHeader>
      {/* Modern Glass Background Container */}
      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/25 to-indigo-50/35 px-4 sm:px-6 lg:px-8 pt-2.5 sm:pt-3 lg:pt-3 pb-10 space-y-4 max-w-full overflow-x-hidden">
        {/* Modern Glassmorphic Mesh Aurora Canvas */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-20 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-teal-400/30 via-emerald-400/25 to-cyan-300/20 blur-[110px]" />
          <div className="absolute top-1/4 -right-24 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-indigo-500/25 via-purple-500/20 to-blue-400/20 blur-[130px]" />
          <div className="absolute top-2/3 -left-32 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-cyan-400/20 via-sky-400/20 to-teal-300/25 blur-[120px]" />
          <div className="absolute bottom-10 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-purple-400/25 via-pink-400/20 to-rose-300/15 blur-[120px]" />
          <div className="absolute top-1/2 left-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-amber-300/15 via-orange-300/10 to-yellow-200/10 blur-[100px]" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.45)_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
        </div>

        {/* ─── Top Glass Command Bar With Integrated Tabs ─── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/55 px-5 py-3.5 shadow-[0_12px_40px_0_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200/40 to-transparent" />

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {/* Left: Branding & Status */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-800">
                    {activeTab === 'overview'
                      ? 'Executive Overview'
                      : activeTab === 'analytics'
                        ? 'Analytics & Telemetry'
                        : 'Task Operations'}
                  </h1>
                  <p className="text-xs text-slate-500 font-normal">
                    {activeTab === 'overview'
                      ? 'Live operational & revenue intelligence'
                      : activeTab === 'analytics'
                        ? 'Deep sales funnel, conversion trends & visitor performance'
                        : 'Team milestones, backlog & sprint tracking'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {realtimeStats && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-700 backdrop-blur-md shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Live Sync
                  </span>
                )}
                <span className="text-slate-300">|</span>
                <span className="rounded-full border border-white/80 bg-white/60 px-2.5 py-0.5 text-slate-700 shadow-2xs backdrop-blur-md">
                  Currency: <strong className="text-slate-900">{currencySettings.defaultCurrency}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 rounded-full border border-white/80 bg-white/60 px-2.5 py-0.5 text-slate-600 shadow-2xs backdrop-blur-md">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="tabular-nums">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </span>
              </div>
            </div>

            {/* Center: Tabs Switcher (Moved directly into the header bar) */}
            <div className="flex items-center justify-start xl:justify-center">
              <div className="inline-flex items-center gap-1.5 rounded-2xl border border-white/80 bg-white/45 p-1.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.02)] backdrop-blur-2xl">
                <button
                  type="button"
                  onClick={() => handleTabChange('overview')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'overview'
                    ? 'bg-slate-900/95 text-white shadow-[0_4px_16px_rgba(15,23,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Executive Overview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('analytics')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'analytics'
                    ? 'bg-slate-900/95 text-white shadow-[0_4px_16px_rgba(15,23,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Analytics</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('tasks')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'tasks'
                    ? 'bg-slate-900/95 text-white shadow-[0_4px_16px_rgba(15,23,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>Tasks</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${activeTab === 'tasks'
                      ? 'bg-teal-500 text-white shadow-xs'
                      : 'bg-white/80 text-slate-700 border border-white/90 shadow-2xs'
                      }`}
                  >
                    {dashboardData?.tasks?.total_tasks ?? 10}
                  </span>
                </button>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {activeTab === 'overview' && (
                <div className="flex items-center rounded-2xl border border-white/80 bg-white/50 p-1 shadow-xs backdrop-blur-2xl">
                  {['7d', '30d', '90d'].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setTimeRange(range)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${timeRange === range
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* ─── Unified Metrics Glass Row (Single Row) ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {unifiedStats.map((stat) => {
                const Icon = stat.icon;
                const SubIcon = stat.subIcon;
                const style = getAccentConfig(stat.accent);
                const isTaskCard = stat.title === 'Total Tasks';
                return (
                  <div
                    key={stat.title}
                    onClick={isTaskCard ? () => handleTabChange('tasks') : undefined}
                    className={`group relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-5 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-8px_rgba(15,23,42,0.12),inset_0_1.5px_1px_0_rgba(255,255,255,1)] hover:border-white ${style.border} ${isTaskCard ? 'cursor-pointer hover:border-purple-400/80' : ''
                      }`}
                  >
                    <div className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full ${style.glow} blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-100 opacity-70`} />
                    <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />

                    <div className="flex items-start justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/80 ${style.iconBg} shadow-[0_4px_12px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-md transition-transform duration-300 group-hover:scale-105`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 shadow-2xs backdrop-blur-md">
                        <ArrowUpRight className="h-3 w-3" />
                        <span>{stat.change}</span>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-0.5">
                      <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                      <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                        {stat.value}
                      </p>
                      <p className="text-[11px] text-slate-400">{stat.description}</p>
                    </div>

                    {/* Sub-Metric / Live Quick Stat integrated in same card */}
                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/80 bg-white/50 px-3.5 py-2 text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(0,0,0,0.02)] backdrop-blur-md">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <SubIcon className={`h-3.5 w-3.5 shrink-0 ${stat.subColor}`} />
                        <span className="truncate text-[11px] font-medium text-slate-600">{stat.subTitle}</span>
                        {stat.isRealtime && <Zap className="h-2.5 w-2.5 shrink-0 text-amber-500 animate-pulse" />}
                      </div>
                      <span className="shrink-0 font-bold text-slate-900 tabular-nums text-xs ml-2">
                        {stat.subValue}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── Analytics & Charts Section ─── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Revenue & Orders Multi-Axis Chart (2 Columns) */}
              <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-6 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl lg:col-span-2">
                <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/60 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Revenue &amp; Order Trajectory</h2>
                    <p className="text-xs text-slate-500 font-normal">Performance curve over recorded billing cycles</p>
                  </div>

                  {/* Date Filters & Legends */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center rounded-2xl border border-white/80 bg-white/60 p-1 shadow-xs backdrop-blur-md">
                      <input
                        type="date"
                        value={chartDateFrom}
                        onChange={(e) => setChartDateFrom(e.target.value)}
                        className="bg-transparent px-2 py-0.5 text-xs text-slate-700 focus:outline-none"
                        title="From date"
                      />
                      <span className="text-slate-400 font-bold">–</span>
                      <input
                        type="date"
                        value={chartDateTo}
                        onChange={(e) => setChartDateTo(e.target.value)}
                        className="bg-transparent px-2 py-0.5 text-xs text-slate-700 focus:outline-none"
                        title="To date"
                      />
                      {(chartDateFrom || chartDateTo) && (
                        <button
                          type="button"
                          onClick={() => {
                            setChartDateFrom('');
                            setChartDateTo('');
                          }}
                          className="ml-1 rounded-xl bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 border border-slate-200/50 cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/50 px-2.5 py-1 shadow-2xs backdrop-blur-xs">
                        <span className="h-2.5 w-2.5 rounded-full bg-teal-600 shadow-xs shadow-teal-500/50" />
                        <span className="text-slate-700 font-medium">Revenue</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/50 px-2.5 py-1 shadow-2xs backdrop-blur-xs">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-xs shadow-blue-500/50" />
                        <span className="text-slate-700 font-medium">Orders</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chart Container */}
                <div className="h-64 w-full">
                  <Bar data={revenueChartData} options={revenueChartOptions} />
                </div>

                {chartLoading && (
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <RefreshCw className="h-3 w-3 animate-spin text-teal-600" />
                    <span>Synchronizing range metrics…</span>
                  </div>
                )}
                {!hasRevenueData && (
                  <div className="mt-2 text-center text-xs text-slate-400">
                    No recorded transaction data found for this selected timeframe.
                  </div>
                )}
              </div>

              {/* Category Sales Breakdown (1 Column) */}
              <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-6 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
                <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />

                <div className="mb-4 flex items-center justify-between border-b border-white/60 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Category Sales</h2>
                    <p className="text-xs text-slate-500 font-normal">Volume distribution by style</p>
                  </div>
                  <span className="rounded-full border border-white/80 bg-white/60 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow-xs backdrop-blur-md">
                    {convertedCategoryData.length} Styles
                  </span>
                </div>

                {convertedCategoryData.length > 0 ? (
                  <div className="h-64 w-full">
                    <Bar data={categoryChartData} options={categoryChartOptions} />
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60 border border-white/80 text-slate-400 shadow-xs backdrop-blur-md">
                      <Package className="h-6 w-6" />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-500">No category sales recorded</p>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Bento Grid: Orders, Timeline & Top Artworks ─── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Recent Orders Card */}
              <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
                <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />
                <div className="flex items-center justify-between border-b border-white/60 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20 backdrop-blur-xs">
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Recent Purchases</h3>
                  </div>
                  <a
                    href="/admin/orders"
                    className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    <span>View All</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="divide-y divide-white/60 p-3">
                  {convertedRecentOrders.length > 0 ? (
                    convertedRecentOrders.map((order) => (
                      <div key={order.id} className="flex items-center gap-3 rounded-2xl p-2.5 transition-all duration-200 hover:bg-white/65 hover:shadow-xs hover:backdrop-blur-md">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-white to-slate-100 border border-white text-xs font-bold text-slate-700 shadow-xs">
                          {order.avatar || order.customer?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-900">{order.customer}</p>
                          <p className="truncate text-[11px] text-slate-500">{order.artwork}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold text-slate-900 tabular-nums">
                            {formatAmountInDefault(order.amount, order.originalCurrency || 'INR')}
                          </p>
                          <span className={`mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-xs ${getStatusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">No recent orders</div>
                  )}
                </div>
              </div>

              {/* Live System Activity Feed */}
              <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
                <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />
                <div className="flex items-center justify-between border-b border-white/60 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 backdrop-blur-xs">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Live Activity Feed</h3>
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                </div>

                <div className="space-y-3 p-4">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
                      <RefreshCw className="h-4 w-4 animate-spin text-teal-600" />
                      <span>Loading feed…</span>
                    </div>
                  ) : (
                    convertedRecentActivities.map((activity, index) => {
                      const Icon = activity.icon;
                      return (
                        <div key={index} className="flex gap-3 rounded-2xl p-2.5 transition-all duration-200 hover:bg-white/65 hover:shadow-xs hover:backdrop-blur-md">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-gradient-to-br ${activity.badgeColor} shadow-xs`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 leading-snug">{activity.message}</p>
                            <p className="text-[11px] text-slate-500">{activity.details}</p>
                            <p className="mt-1 text-[10px] font-medium text-slate-400">{activity.time}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Top Artworks Card */}
              <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
                <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />
                <div className="flex items-center justify-between border-b border-white/60 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 backdrop-blur-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Top Performing Artworks</h3>
                  </div>
                  <a href="/admin/products" className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                    <span>Catalog</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="divide-y divide-white/60 p-3">
                  {convertedTopArtworks.length > 0 ? (
                    convertedTopArtworks.map((artwork) => (
                      <div key={artwork.id} className="flex items-center gap-3 rounded-2xl p-2.5 transition-all duration-200 hover:bg-white/65 hover:shadow-xs hover:backdrop-blur-md">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/90 bg-white shadow-xs">
                          {artwork.image && artwork.image !== '/api/placeholder/60/60' ? (
                            <img
                              src={artwork.image}
                              alt={artwork.title || 'Artwork preview'}
                              className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-900">{artwork.title}</p>
                          <p className="truncate text-[11px] text-slate-500">{artwork.artist}</p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{artwork.views} views</span>
                            <span>•</span>
                            <span className="font-medium text-emerald-600">{artwork.downloads} downloads</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold text-slate-900 tabular-nums">
                            {formatAmountInDefault(artwork.revenue, 'INR')}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-48 flex-col items-center justify-center text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-slate-400 border border-white/80 shadow-xs">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">No artwork statistics yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Quick Operations Glass Panel ─── */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-6 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />

              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">Quick Administrative Actions</h3>
                <p className="text-xs text-slate-500 font-normal">Jump directly into key operational modules</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.title}
                      type="button"
                      onClick={action.action}
                      className="group relative flex items-center gap-3.5 rounded-2xl border border-white/80 bg-white/55 p-3.5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.02),inset_0_1px_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/40 hover:bg-white/90 hover:shadow-[0_14px_30px_rgba(13,148,136,0.12)] cursor-pointer"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${action.color} text-white shadow-sm transition-transform duration-300 group-hover:scale-105`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{action.title}</p>
                        <p className="truncate text-[11px] text-slate-400">{action.description}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-teal-600" />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : activeTab === 'analytics' ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-4 sm:p-6 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
            <Analytics embedMode={true} />
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-4 sm:p-6 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
            <Tasks embedMode={true} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
