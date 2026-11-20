'use client'

import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  RefreshCw,
  Download,
  Calendar,
  Users,
  IndianRupee,
  ShoppingCart,
  TrendingUp,
  Package,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Star,
  Activity,
  CreditCard,
  AlertCircle,
  FileText,
  Target
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  supabase,
  AnalyticsService,
  OrderService,
  ProductService,
  CategoryService
} from '../../services/supabaseService';
import { RealUserService } from '../../services/realUserService';
import { useCurrency } from '../../contexts/CurrencyContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsProps {
  embedMode?: boolean;
}

const Analytics: React.FC<AnalyticsProps> = ({ embedMode = false }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real database telemetry states
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [realtimeStats, setRealtimeStats] = useState<any>(null);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  const { currencySettings, convertAmount, formatCurrency } = useCurrency();

  // Helper function to convert amounts from INR or original currency to default
  const convertAmountToDefault = (amount: number, fromCurrency: string = 'INR') => {
    return convertAmount(amount, fromCurrency, currencySettings.defaultCurrency);
  };

  const formatAmountInDefault = (amount: number, fromCurrency: string = 'INR') => {
    const converted = convertAmountToDefault(amount, fromCurrency);
    return formatCurrency(converted, currencySettings.defaultCurrency);
  };

  // Load real telemetry from Supabase with silent auto-sync support
  const loadAnalytics = async (silent: boolean = false) => {
    try {
      if (!silent) setRefreshing(true);

      const now = new Date();
      let fromDate: string | undefined;
      const toDate = now.toISOString().split('T')[0];

      if (timeRange === '7d') {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        fromDate = d.toISOString().split('T')[0];
      } else if (timeRange === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        fromDate = d.toISOString().split('T')[0];
      } else if (timeRange === '90d') {
        const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        fromDate = d.toISOString().split('T')[0];
      } else if (timeRange === '1y') {
        const d = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        fromDate = d.toISOString().split('T')[0];
      }

      const [
        dashRes,
        realtimeRes,
        orderStatsRes,
        categoryRes,
        productsRes,
        seriesRes,
        userStatsRes,
        categoriesRes
      ] = await Promise.all([
        AnalyticsService.getDashboardData().catch(() => null),
        AnalyticsService.getRealtimeStats().catch(() => null),
        OrderService.getOrderStats().catch(() => null),
        AnalyticsService.getCategoryAnalytics().catch(() => []),
        ProductService.getAllProducts().catch(() => []),
        AnalyticsService.getRevenueDataByDateRange(fromDate, toDate).catch(() => []),
        RealUserService.getUserStats().catch(() => null),
        CategoryService.getAllCategories().catch(() => [])
      ]);

      setAnalyticsData(dashRes);
      setRealtimeStats(realtimeRes);
      setOrderStats(orderStatsRes);
      setCategoryData(categoryRes || []);
      setAllProducts(productsRes || []);
      setRevenueSeries(seriesRes || []);
      setUserStats(userStatsRes);
      setCategoriesList(categoriesRes || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics(false);

    // Continuous auto-sync live stats every 15s
    const interval = setInterval(() => {
      loadAnalytics(true);
    }, 15000);

    // Live Supabase subscription for instant order sync
    const channel = supabase
      .channel('admin-analytics-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadAnalytics(true);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  // Real KPI calculations
  const totalRevenue = orderStats?.totalRevenue || analyticsData?.revenue?.total || 0;
  const todayRevenue = realtimeStats?.todayRevenue || orderStats?.todayRevenue || 0;
  const totalOrdersCount = orderStats?.total || 0;
  const todayOrdersCount = realtimeStats?.todayOrders || orderStats?.todayOrders || 0;
  const averageOrderVal = orderStats?.averageOrderValue || (totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0);
  const totalUsersCount = userStats?.total || realtimeStats?.activeUsers || 0;
  const totalProductsCount = allProducts.length || analyticsData?.products?.total || 0;
  const activeProductsCount = allProducts.filter((p: any) => p.status === 'active').length || totalProductsCount;
  const totalTasksCount = analyticsData?.tasks?.total_tasks || 10;
  const completedTasksCount = analyticsData?.tasks?.completed || 0;

  // Real Conversion Rate
  const conversionRate = useMemo(() => {
    if (realtimeStats?.conversionRate && realtimeStats.conversionRate !== '0.0') {
      return realtimeStats.conversionRate;
    }
    if (totalUsersCount > 0 && totalOrdersCount > 0) {
      return ((totalOrdersCount / totalUsersCount) * 100).toFixed(1);
    }
    return '0.0';
  }, [realtimeStats, totalUsersCount, totalOrdersCount]);

  // Real Trajectory chart data (Revenue + Orders)
  const trajectoryChartData = useMemo(() => {
    const rawData = revenueSeries && revenueSeries.length > 0
      ? revenueSeries
      : (analyticsData?.revenue?.monthly || []);

    const labels = rawData.map((d: any) => d.month || '');
    const revValues = rawData.map((d: any) => convertAmountToDefault(d.revenue || 0, 'INR'));
    const orderValues = rawData.map((d: any) => Number(d.orders || 0));

    return {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: revValues,
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#0d9488',
          pointHoverRadius: 6,
          yAxisID: 'yRevenue',
        },
        {
          label: 'Orders',
          data: orderValues,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.06)',
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#3b82f6',
          pointHoverRadius: 6,
          yAxisID: 'yOrders',
        },
      ],
    };
  }, [revenueSeries, analyticsData, currencySettings.defaultCurrency]);

  const trajectoryChartOptions: any = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#0f172a',
        bodyColor: '#334155',
        borderColor: 'rgba(226, 232, 240, 0.9)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        cornerRadius: 10,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => {
            const name = context.dataset.label || '';
            const val = context.parsed.y;
            if (context.dataset.yAxisID === 'yRevenue') {
              return ` ${name}: ${formatCurrency(Number(val || 0), currencySettings.defaultCurrency)}`;
            }
            return ` ${name}: ${Number(val || 0)} orders`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(241, 245, 249, 0.8)' },
        ticks: { font: { size: 10, weight: 500 }, color: '#64748b' },
      },
      yRevenue: {
        type: 'linear',
        position: 'left',
        grid: { color: 'rgba(241, 245, 249, 0.8)' },
        ticks: {
          font: { size: 10 },
          color: '#0d9488',
          callback: (value: any) => {
            return `${currencySettings.defaultCurrency === 'INR' ? '₹' : '$'}${Number(value).toLocaleString()}`;
          },
        },
      },
      yOrders: {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          font: { size: 10 },
          color: '#3b82f6',
          precision: 0,
        },
      },
    },
  }), [currencySettings.defaultCurrency, formatCurrency]);

  // Real categories distribution with product count aggregation
  const enhancedCategories = useMemo(() => {
    // Map existing products per category
    const countMap: Record<string, number> = {};
    allProducts.forEach((p: any) => {
      const cat = p.category || (Array.isArray(p.categories) ? p.categories[0] : null);
      if (cat) {
        countMap[cat] = (countMap[cat] || 0) + 1;
      }
    });

    const palette = ['#0d9488', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#14b8a6'];

    // Combine categoryData (from orders) and categoriesList (from catalog)
    if (categoryData && categoryData.length > 0) {
      return categoryData.map((item, idx) => ({
        name: item.name,
        sales: convertAmountToDefault(item.sales || 0, 'INR'),
        salesCount: item.salesCount || 0,
        productCount: countMap[item.name] || 0,
        percentage: item.value || 0,
        color: item.color || palette[idx % palette.length]
      }));
    }

    // Fallback if no order items: compute real distribution from products table!
    const entries = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
    const totalCatalogItems = allProducts.length || 1;

    return entries.map(([name, count], idx) => ({
      name,
      sales: 0,
      salesCount: 0,
      productCount: count,
      percentage: Math.round((count / totalCatalogItems) * 100),
      color: palette[idx % palette.length]
    }));
  }, [categoryData, allProducts, currencySettings.defaultCurrency]);

  const categoryDoughnutData = useMemo(() => {
    const topCats = enhancedCategories.slice(0, 6);
    return {
      labels: topCats.map((c) => c.name),
      datasets: [
        {
          data: topCats.map((c) => (c.sales > 0 ? c.sales : c.productCount)),
          backgroundColor: topCats.map((c) => c.color),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }, [enhancedCategories]);

  const categoryDoughnutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#0f172a',
        bodyColor: '#334155',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 8,
        callbacks: {
          label: (context: any) => {
            const cat = enhancedCategories[context.dataIndex];
            if (cat && cat.sales > 0) {
              return ` ${context.label}: ${formatCurrency(cat.sales, currencySettings.defaultCurrency)} (${cat.productCount} items)`;
            }
            return ` ${context.label}: ${context.raw} catalog items`;
          },
        },
      },
    },
  };

  // Top products from catalog
  const topProductsList = useMemo(() => {
    return [...allProducts]
      .sort((a, b) => (b.downloads || b.views || 0) - (a.downloads || a.views || 0))
      .slice(0, 5);
  }, [allProducts]);

  // Order fulfillment funnel numbers
  const fulfillmentPipeline = [
    {
      status: 'Completed',
      count: orderStats?.completed || 0,
      desc: 'Fulfilled & settled',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgLight: 'bg-emerald-500/10 border-emerald-500/25'
    },
    {
      status: 'Processing',
      count: orderStats?.processing || 0,
      desc: 'In production / dispatch',
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgLight: 'bg-blue-500/10 border-blue-500/25'
    },
    {
      status: 'Pending',
      count: orderStats?.pending || 0,
      desc: 'Awaiting payment / review',
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgLight: 'bg-amber-500/10 border-amber-500/25'
    },
    {
      status: 'Cancelled',
      count: orderStats?.cancelled || 0,
      desc: 'Voided or refunded',
      color: 'bg-rose-500',
      textColor: 'text-rose-700',
      bgLight: 'bg-rose-500/10 border-rose-500/25'
    }
  ];

  // Export analytics data
  const exportData = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      timeRange,
      currency: currencySettings.defaultCurrency,
      executiveSummary: {
        totalRevenue,
        todayRevenue,
        totalOrders: totalOrdersCount,
        todayOrders: todayOrdersCount,
        averageOrderValue: averageOrderVal,
        totalUsers: totalUsersCount,
        catalogProducts: totalProductsCount,
        activeProducts: activeProductsCount,
        conversionRate: `${conversionRate}%`,
        totalTasks: totalTasksCount,
        completedTasks: completedTasksCount
      },
      orderFulfillment: fulfillmentPipeline,
      categories: enhancedCategories,
      trajectorySeries: revenueSeries
    };

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lurevi-real-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (loading) {
    if (embedMode) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <RefreshCw className="h-7 w-7 animate-spin text-teal-600" />
          <span className="text-xs font-semibold text-slate-600 tracking-wide">Syncing live analytics from Supabase…</span>
        </div>
      );
    }
    return (
      <AdminLayout title="Analytics" noHeader>
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <RefreshCw className="h-7 w-7 animate-spin text-teal-600" />
          <span className="text-xs font-semibold text-slate-600 tracking-wide">Syncing live analytics from Supabase…</span>
        </div>
      </AdminLayout>
    );
  }

  const analyticsContent = (
    <div className={`space-y-4 max-w-full overflow-x-hidden ${embedMode ? '' : 'px-4 py-5 sm:px-6'}`}>
      {/* ─── Top Command & Control Ribbon ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-4.5 sm:p-5 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-500/25">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-800">Commercial Intelligence &amp; Telemetry</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700 shadow-2xs backdrop-blur-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live Database
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">Real-time orders, revenue curves, catalog velocity, and funnel performance</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Range Toggle */}
            <div className="inline-flex items-center gap-1 rounded-2xl border border-white/80 bg-white/45 p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] backdrop-blur-md">
              {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    timeRange === range
                      ? 'bg-slate-900/95 text-white shadow-[0_4px_12px_rgba(15,23,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={exportData}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-slate-900/95 px-3.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(15,23,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:bg-slate-900 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Real KPI Metric Cards Grid ─── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Card 1: Total Revenue */}
        <div className="group relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-4 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Gross Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-2xs backdrop-blur-md">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-semibold text-slate-900 tabular-nums">
            {formatCurrency(totalRevenue, currencySettings.defaultCurrency)}
          </div>
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/80 bg-white/60 px-2.5 py-1 text-[11px] text-slate-500 font-normal shadow-2xs backdrop-blur-md">
            <span>Today:</span>
            <span className="text-emerald-600 font-semibold tabular-nums">
              {formatAmountInDefault(todayRevenue)}
            </span>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="group relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-4 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Total Orders</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-2xs backdrop-blur-md">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-semibold text-slate-900 tabular-nums">
            {totalOrdersCount.toLocaleString()}
          </div>
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/80 bg-white/60 px-2.5 py-1 text-[11px] text-slate-500 font-normal shadow-2xs backdrop-blur-md">
            <span>Today:</span>
            <span className="text-blue-600 font-semibold tabular-nums">
              +{todayOrdersCount} orders
            </span>
          </div>
        </div>

        {/* Card 3: Average Order Value */}
        <div className="group relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-4 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Avg Order Value</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20 shadow-2xs backdrop-blur-md">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-semibold text-slate-900 tabular-nums">
            {formatCurrency(averageOrderVal, currencySettings.defaultCurrency)}
          </div>
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/80 bg-white/60 px-2.5 py-1 text-[11px] text-slate-500 font-normal shadow-2xs backdrop-blur-md">
            <span>Per Order</span>
            <span className="text-teal-600 font-semibold">Healthy</span>
          </div>
        </div>

        {/* Card 4: Registered Users */}
        <div className="group relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-4 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Registered Users</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 shadow-2xs backdrop-blur-md">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-semibold text-slate-900 tabular-nums">
            {totalUsersCount.toLocaleString()}
          </div>
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/80 bg-white/60 px-2.5 py-1 text-[11px] text-slate-500 font-normal shadow-2xs backdrop-blur-md">
            <span>Confirmed:</span>
            <span className="text-purple-600 font-semibold tabular-nums">
              {userStats?.confirmed ?? totalUsersCount}
            </span>
          </div>
        </div>

        {/* Card 5: Catalog Items */}
        <div className="group relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-4 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Catalog Artworks</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-2xs backdrop-blur-md">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-semibold text-slate-900 tabular-nums">
            {totalProductsCount.toLocaleString()}
          </div>
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/80 bg-white/60 px-2.5 py-1 text-[11px] text-slate-500 font-normal shadow-2xs backdrop-blur-md">
            <span>Active:</span>
            <span className="text-amber-600 font-semibold tabular-nums">
              {activeProductsCount} items
            </span>
          </div>
        </div>

        {/* Card 6: Conversion Rate */}
        <div className="group relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-4 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Conversion Rate</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shadow-2xs backdrop-blur-md">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-semibold text-slate-900 tabular-nums">
            {conversionRate}%
          </div>
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/80 bg-white/60 px-2.5 py-1 text-[11px] text-slate-500 font-normal shadow-2xs backdrop-blur-md">
            <span>Orders / Users</span>
            <span className="text-indigo-600 font-semibold">Live</span>
          </div>
        </div>
      </div>

      {/* ─── Trajectory Chart & Category Analytics ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left 2 Cols: Real Revenue & Orders Trajectory Line Chart */}
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-5 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl lg:col-span-2">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
          <div className="mb-4 flex flex-col gap-2 border-b border-white/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Revenue &amp; Orders Trajectory</h3>
              <p className="text-[11px] text-slate-400 font-normal">Continuous telemetry curve across recorded billing cycles ({timeRange.toUpperCase()})</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-teal-700 rounded-full border border-white/80 bg-white/60 px-2.5 py-1 shadow-2xs backdrop-blur-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-600 shadow-xs shadow-teal-500/50" />
                Revenue
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-blue-700 rounded-full border border-white/80 bg-white/60 px-2.5 py-1 shadow-2xs backdrop-blur-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-xs shadow-blue-500/50" />
                Order Volume
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <Line data={trajectoryChartData} options={trajectoryChartOptions} />
          </div>
        </div>

        {/* Right 1 Col: Category Sales Share & Breakdown */}
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-5 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
          <div className="mb-4 border-b border-white/60 pb-3">
            <h3 className="text-sm font-semibold text-slate-800">Category Volume &amp; Share</h3>
            <p className="text-[11px] text-slate-400 font-normal">Distribution across active styles &amp; offerings</p>
          </div>
          <div className="h-44 w-full flex items-center justify-center">
            <Doughnut data={categoryDoughnutData} options={categoryDoughnutOptions} />
          </div>
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
            {enhancedCategories.slice(0, 5).map((category, index) => (
              <div key={index} className="flex items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/50 px-2.5 py-1.5 text-xs shadow-2xs backdrop-blur-xs transition-all hover:bg-white/80">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="truncate font-medium text-slate-700">{category.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 tabular-nums">
                  <span className="text-[11px] text-slate-400 font-normal">{category.productCount} items</span>
                  <span className="font-semibold text-slate-800">
                    {category.sales > 0 ? formatCurrency(category.sales, currencySettings.defaultCurrency) : `${category.percentage}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Fulfillment Funnel & Top Artworks Row ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Order Fulfillment Pipeline Funnel */}
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-5 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
          <div className="mb-4 border-b border-white/60 pb-3">
            <h3 className="text-sm font-semibold text-slate-800">Order Fulfillment Funnel</h3>
            <p className="text-[11px] text-slate-400 font-normal">Real-time status of orders placed through storefront</p>
          </div>
          <div className="space-y-2.5">
            {fulfillmentPipeline.map((item) => {
              const pct = totalOrdersCount > 0 ? Math.round((item.count / totalOrdersCount) * 100) : 0;
              return (
                <div key={item.status} className={`rounded-2xl border p-3 transition-all backdrop-blur-md shadow-2xs ${item.bgLight}`}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      <span className="font-semibold text-slate-700">{item.status}</span>
                    </div>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {item.count} <span className="text-[10px] text-slate-500 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/80 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-500 font-normal">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performing Artworks / Products in Catalog */}
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/75 via-white/55 to-white/40 p-5 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl lg:col-span-2">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
          <div className="mb-4 border-b border-white/60 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Top Performing Catalog Artworks</h3>
              <p className="text-[11px] text-slate-400 font-normal">Ranked by actual downloads, customer views, and price</p>
            </div>
            <span className="rounded-full border border-white/80 bg-white/60 px-2.5 py-0.5 text-xs font-medium text-slate-600 shadow-2xs backdrop-blur-xs">
              {totalProductsCount} total items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/60 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  <th className="pb-2.5">Artwork</th>
                  <th className="pb-2.5">Category</th>
                  <th className="pb-2.5">Price</th>
                  <th className="pb-2.5 text-right">Downloads</th>
                  <th className="pb-2.5 text-right">Est. Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40 font-normal">
                {topProductsList.map((prod, idx) => {
                  const estVol = (prod.downloads || 0) * (prod.price || 0);
                  return (
                    <tr key={prod.id || idx} className="hover:bg-white/60 transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          {prod.main_image ? (
                            <img
                              src={prod.main_image}
                              alt={prod.title}
                              className="h-9 w-9 rounded-xl object-cover border border-white/90 shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-400 shrink-0 border border-white/90 shadow-2xs">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0 max-w-[180px] sm:max-w-[240px]">
                            <p className="truncate font-semibold text-slate-800">{prod.title}</p>
                            <p className="text-[10px] text-slate-400 font-normal truncate">{prod.artist || 'Lurevi Studio'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-600">
                        <span className="inline-block rounded-lg border border-white/80 bg-white/60 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-2xs backdrop-blur-xs">
                          {prod.category || 'General'}
                        </span>
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800 tabular-nums">
                        {formatCurrency(prod.price || 0, currencySettings.defaultCurrency)}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-teal-700 tabular-nums">
                        {(prod.downloads || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-800 tabular-nums">
                        {formatCurrency(estVol, currencySettings.defaultCurrency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedMode) {
    return analyticsContent;
  }

  return (
    <AdminLayout title="Analytics" noHeader>
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
        {analyticsContent}
      </div>
    </AdminLayout>
  );
};

export default Analytics;
