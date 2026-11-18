'use client'

import React, { useState, useEffect } from 'react';
import {
  Package,
  Calendar,
  IndianRupee,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Wallet,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { orderService, Order, OrderStats } from '../../services/orderService';
import { useCurrency } from '../../contexts/CurrencyContext';
import { buildSequenceMap, formatOrderNumber } from '../../utils/sequenceNumberUtils';

interface OrderManagementProps {
  isFBOnly?: boolean;
}

const OrderItemThumb: React.FC<{
  src?: string | null;
  alt: string;
}> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-9 h-9 shrink-0 rounded border border-gray-200 bg-gray-100 flex items-center justify-center">
        <Package className="w-4 h-4 text-gray-400" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-9 h-9 shrink-0 rounded border border-gray-200 object-cover"
      onError={() => setFailed(true)}
    />
  );
};

const normalizePaymentMethod = (method?: string | null): 'cod' | 'razorpay' | 'wallet' | 'other' => {
  if (!method) return 'other';
  const m = method.toLowerCase().trim();
  if (m === 'cod' || m.includes('cash') || m === 'cash_on_delivery') return 'cod';
  if (m === 'razorpay' || m.includes('razor')) return 'razorpay';
  if (m === 'wallet' || m === 'store_credit' || m.includes('credit') || m.includes('wallet')) return 'wallet';
  return 'other';
};

const getPaymentBadge = (method?: string | null) => {
  const norm = normalizePaymentMethod(method);
  switch (norm) {
    case 'cod':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
          <Banknote className="h-3 w-3 text-amber-600 shrink-0" />
          <span>COD</span>
        </span>
      );
    case 'razorpay':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 ring-1 ring-inset ring-blue-600/20">
          <CreditCard className="h-3 w-3 text-blue-600 shrink-0" />
          <span>Razorpay</span>
        </span>
      );
    case 'wallet':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-800 ring-1 ring-inset ring-purple-600/20">
          <Wallet className="h-3 w-3 text-purple-600 shrink-0" />
          <span>Wallet</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-[11px] font-medium capitalize text-gray-700 ring-1 ring-inset ring-gray-400/20">
          <CreditCard className="h-3 w-3 text-gray-500 shrink-0" />
          <span>{method || 'Prepaid'}</span>
        </span>
      );
  }
};

const OrderManagement: React.FC<OrderManagementProps> = ({ isFBOnly = false }) => {
  const { formatCurrency, currencySettings, convertAmount } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
    refunded: 0,
    totalRevenue: 0,
    todayOrders: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [sequenceMap, setSequenceMap] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await orderService.getAllOrders();

      const seqMap = buildSequenceMap(ordersData.map(o => ({ id: o.id, createdAt: o.created_at })));
      setSequenceMap(seqMap);

      const filtered = isFBOnly
        ? ordersData.filter((order) =>
            order.order_items?.some((item) => {
              const title = (item.product_title || '').toLowerCase();
              const productTitle = (item.products?.title || '').toLowerCase();
              const combined = `${title} ${productTitle}`;
              return (
                combined.includes('food & beverage') ||
                combined.includes('f&b') ||
                combined.includes('f & b') ||
                combined.includes('dry fruit') ||
                combined.includes('dried fruit') ||
                combined.includes('spice')
              );
            })
          )
        : ordersData;

      setOrders(filtered);
      calculateStats(filtered);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersData: Order[]) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todayOrders = ordersData.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= todayStart && orderDate < todayEnd;
    });

    const totalRevenue = ordersData.reduce((sum, order) => {
      const orderCurrency = order.currency_code || 'INR';
      const convertedAmount = convertAmount(
        order.total_amount,
        orderCurrency,
        currencySettings.defaultCurrency
      );
      return sum + convertedAmount;
    }, 0);

    const todayRevenue = todayOrders.reduce((sum, order) => {
      const orderCurrency = order.currency_code || 'INR';
      const convertedAmount = convertAmount(
        order.total_amount,
        orderCurrency,
        currencySettings.defaultCurrency
      );
      return sum + convertedAmount;
    }, 0);

    setStats({
      total: ordersData.length,
      pending: ordersData.filter((o) => o.status === 'pending').length,
      processing: ordersData.filter((o) => o.status === 'processing').length,
      completed: ordersData.filter((o) => o.status === 'completed').length,
      cancelled: ordersData.filter((o) => o.status === 'cancelled').length,
      refunded: ordersData.filter((o) => o.status === 'refunded').length,
      totalRevenue,
      todayOrders: todayOrders.length,
      todayRevenue,
    });
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const success = await orderService.updateOrderStatus(orderId, newStatus);
      if (success) {
        await loadOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredOrders = orders
    .filter((order) => {
      const seq = sequenceMap[order.id] || 1;
      const realOrderNumber = formatOrderNumber(order.created_at, seq);
      const matchesSearch =
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        realOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.payment_method && order.payment_method.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

      const normPayment = normalizePaymentMethod(order.payment_method);
      const matchesPayment =
        filterPayment === 'all' ||
        (filterPayment === 'cod' && normPayment === 'cod') ||
        (filterPayment === 'razorpay' && normPayment === 'razorpay') ||
        (filterPayment === 'wallet' && normPayment === 'wallet') ||
        (filterPayment === 'other' && normPayment === 'other');

      let matchesDate = true;
      if (filterDate !== 'all') {
        const orderDate = new Date(order.created_at);
        const today = new Date();

        switch (filterDate) {
          case 'today':
            matchesDate = orderDate.toDateString() === today.toDateString();
            break;
          case 'week': {
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = orderDate >= weekAgo;
            break;
          }
          case 'month': {
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = orderDate >= monthAgo;
            break;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesPayment && matchesDate;
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortBy === 'order_id') {
        const aSeq = sequenceMap[a.id] || 0;
        const bSeq = sequenceMap[b.id] || 0;
        aValue = aSeq;
        bValue = bSeq;
      } else if (sortBy === 'status') {
        aValue = a.status || '';
        bValue = b.status || '';
      } else if (sortBy === 'payment_method') {
        aValue = a.payment_method || '';
        bValue = b.payment_method || '';
      } else {
        aValue = a[sortBy as keyof Order] as string | number;
        bValue = b[sortBy as keyof Order] as string | number;

        if (sortBy === 'created_at' || sortBy === 'updated_at') {
          aValue = new Date(aValue as string).getTime();
          bValue = new Date(bValue as string).getTime();
        }
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPayment, filterDate, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredOrders.length);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20';
      case 'processing':
        return 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-600/20';
      case 'pending':
        return 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20';
      case 'cancelled':
        return 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/20';
      case 'refunded':
        return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-500/20';
      default:
        return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-500/20';
    }
  };

  const getStatusSelectColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-800 !border-green-300 hover:bg-green-100/80 focus:!border-green-400 focus:!ring-2 focus:!ring-green-400/30';
      case 'processing':
        return 'bg-blue-50 text-blue-800 !border-blue-300 hover:bg-blue-100/80 focus:!border-blue-400 focus:!ring-2 focus:!ring-blue-400/30';
      case 'pending':
        return 'bg-amber-50 text-amber-800 !border-amber-300 hover:bg-amber-100/80 focus:!border-amber-400 focus:!ring-2 focus:!ring-amber-400/30';
      case 'cancelled':
        return 'bg-red-50 text-red-800 !border-red-300 hover:bg-red-100/80 focus:!border-red-400 focus:!ring-2 focus:!ring-red-400/30';
      case 'refunded':
        return 'bg-gray-100 text-gray-700 !border-gray-300 hover:bg-gray-200/80 focus:!border-gray-400 focus:!ring-2 focus:!ring-gray-400/30';
      default:
        return 'bg-gray-50 text-gray-700 !border-gray-300 hover:bg-gray-100 focus:!border-gray-400 focus:!ring-2 focus:!ring-gray-400/30';
    }
  };

  const getStatusIcon = (status: string) => {
    const cls = 'w-3 h-3 shrink-0';
    switch (status) {
      case 'completed':
        return <CheckCircle className={`${cls} text-green-600`} />;
      case 'processing':
        return <Clock className={`${cls} text-blue-600`} />;
      case 'pending':
        return <Clock className={`${cls} text-amber-600`} />;
      case 'cancelled':
        return <XCircle className={`${cls} text-red-600`} />;
      case 'refunded':
        return <AlertCircle className={`${cls} text-gray-600`} />;
      default:
        return <Clock className={`${cls} text-gray-600`} />;
    }
  };

  const inputCls =
    'h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900';

  const codCount = orders.filter((o) => normalizePaymentMethod(o.payment_method) === 'cod').length;
  const razorpayCount = orders.filter((o) => normalizePaymentMethod(o.payment_method) === 'razorpay').length;
  const walletCount = orders.filter((o) => normalizePaymentMethod(o.payment_method) === 'wallet').length;

  const statItems: {
    label: string;
    value: React.ReactNode;
    Icon?: typeof Package;
    iconClass?: string;
  }[] = [
    { label: 'Total', value: stats.total, Icon: Package, iconClass: 'text-blue-600' },
    { label: 'COD', value: codCount, Icon: Banknote, iconClass: 'text-amber-600' },
    { label: 'Razorpay', value: razorpayCount, Icon: CreditCard, iconClass: 'text-blue-600' },
    { label: 'Wallet', value: walletCount, Icon: Wallet, iconClass: 'text-purple-600' },
    { label: 'Pending', value: stats.pending, Icon: Clock, iconClass: 'text-amber-600' },
    { label: 'Processing', value: stats.processing, Icon: Clock, iconClass: 'text-blue-600' },
    { label: 'Done', value: stats.completed, Icon: CheckCircle, iconClass: 'text-green-600' },
    { label: 'Cancelled', value: stats.cancelled, Icon: XCircle, iconClass: 'text-red-600' },
    { label: 'Refunded', value: stats.refunded, Icon: AlertCircle, iconClass: 'text-gray-600' },
    { label: 'Today', value: stats.todayOrders, Icon: Calendar, iconClass: 'text-gray-600' },
    {
      label: 'Revenue',
      value: formatCurrency(stats.totalRevenue, currencySettings.defaultCurrency),
      Icon: IndianRupee,
      iconClass: 'text-green-600',
    },
    {
      label: 'Today',
      value: formatCurrency(stats.todayRevenue, currencySettings.defaultCurrency),
      Icon: IndianRupee,
      iconClass: 'text-green-700',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Order Management</h2>
          <p className="text-xs text-gray-500">Orders and payments</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50/80 p-2 scrollbar-hide">
        {statItems.map(({ label, value, Icon, iconClass }, idx) => (
          <div
            key={`${label}-${idx}`}
            className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 shadow-sm"
          >
            {Icon && (
              <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass || 'text-gray-500'}`} />
            )}
            <span className="text-[11px] text-gray-500">{label}</span>
            <span className="text-xs font-semibold tabular-nums text-gray-900">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
        <div className="relative flex min-w-[10rem] flex-1 max-w-xs items-center">
          <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, id…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputCls} w-full pl-7`}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`${inputCls} min-w-[6.5rem]`}
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
        <select
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value)}
          className={`${inputCls} min-w-[7.5rem]`}
        >
          <option value="all">All payments</option>
          <option value="cod">COD</option>
          <option value="razorpay">Razorpay</option>
          <option value="wallet">Wallet</option>
          <option value="other">Other</option>
        </select>
        <select
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className={`${inputCls} min-w-[6.5rem]`}
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">7 days</option>
          <option value="month">30 days</option>
        </select>
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-');
            setSortBy(field);
            setSortOrder(order as 'asc' | 'desc');
          }}
          className={`${inputCls} min-w-[8.5rem]`}
        >
          <option value="created_at-desc">Newest</option>
          <option value="created_at-asc">Oldest</option>
          <option value="total_amount-desc">Amount ↓</option>
          <option value="total_amount-asc">Amount ↑</option>
          <option value="customer_name-asc">Customer A–Z</option>
          <option value="customer_name-desc">Customer Z–A</option>
          <option value="payment_method-asc">Payment A–Z</option>
          <option value="payment_method-desc">Payment Z–A</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
          <Package className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-800">No orders</p>
          <p className="text-xs text-gray-500">Adjust search or filters</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <tr>
                  <th
                    onClick={() => handleSort('order_id')}
                    className="cursor-pointer select-none px-4 py-3 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Order ID</span>
                      {sortBy === 'order_id' && (
                        <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('customer_name')}
                    className="cursor-pointer select-none px-4 py-3 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Customer</span>
                      {sortBy === 'customer_name' && (
                        <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('created_at')}
                    className="cursor-pointer select-none px-4 py-3 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      {sortBy === 'created_at' && (
                        <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="cursor-pointer select-none px-4 py-3 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      {sortBy === 'status' && (
                        <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('payment_method')}
                    className="cursor-pointer select-none px-4 py-3 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Payment</span>
                      {sortBy === 'payment_method' && (
                        <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('total_amount')}
                    className="cursor-pointer select-none px-4 py-3 text-right hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total</span>
                      {sortBy === 'total_amount' && (
                        <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedOrders.map((order) => {
                  const seq = sequenceMap[order.id] || 1;
                  const realOrderNumber = formatOrderNumber(order.created_at, seq);
                  const displayId = realOrderNumber;
                  const initials = order.customer_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  const isExpanded = expandedOrders.has(order.id);

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer hover:bg-gray-50/80 transition-colors align-middle"
                        onClick={() => toggleOrderExpansion(order.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleOrderExpansion(order.id);
                          }
                        }}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-gray-900" title={`UUID: ${order.id}`}>
                          #{displayId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] font-bold text-gray-700 ring-1 ring-inset ring-gray-200">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900">{order.customer_name}</p>
                              <p className="truncate font-mono text-[10px] text-gray-400">
                                {order.customer_email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                          {new Date(order.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: '2-digit',
                          })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-flex items-center">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 flex items-center z-10 text-xs">
                              {getStatusIcon(order.status)}
                            </span>
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleUpdateStatus(order.id, e.target.value as Order['status'])
                              }
                              style={{
                                backgroundImage: 'none',
                                outline: 'none',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none',
                              }}
                              className={`status-pill-select h-7 cursor-pointer appearance-none rounded-full text-[11px] font-medium capitalize border transition-all ${getStatusSelectColor(order.status)}`}
                              title="Click to update status"
                            >
                              <option value="pending" className="bg-white text-gray-900 font-normal">Pending</option>
                              <option value="processing" className="bg-white text-gray-900 font-normal">Processing</option>
                              <option value="completed" className="bg-white text-gray-900 font-normal">Completed</option>
                              <option value="cancelled" className="bg-white text-gray-900 font-normal">Cancelled</option>
                              <option value="refunded" className="bg-white text-gray-900 font-normal">Refunded</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-50 z-10" />
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {getPaymentBadge(order.payment_method)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
                          {formatCurrency(order.total_amount, order.currency_code || 'INR')}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleOrderExpansion(order.id);
                            }}
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                              isExpanded ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                            title={isExpanded ? 'Hide order details' : 'View order details'}
                          >
                            <span>{isExpanded ? 'Hide' : 'View'}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="border-t border-gray-100 bg-gray-50/90 px-4 py-3">
                          <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
                            <div className="rounded-md border border-gray-200 bg-white p-2">
                              <h4 className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-gray-900">
                                <Package className="h-3.5 w-3.5 text-gray-600" />
                                Items
                              </h4>
                              <div className="space-y-1">
                                {order.order_items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex gap-2 rounded border border-gray-100 bg-gray-50/50 p-1.5 text-xs"
                                  >
                                    <OrderItemThumb
                                      src={item.products?.main_image || item.product_image}
                                      alt={item.product_title}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium leading-tight text-gray-900">
                                        {item.product_title}
                                      </p>
                                      <div className="mt-0.5 text-[11px] text-gray-600">
                                        {(() => {
                                          const isClothing =
                                            item.selected_product_type === 'clothing' ||
                                            (item.options && (item.options.color || item.options.size)) ||
                                            (item.product_title &&
                                              [
                                                'sweatshirt',
                                                'hoodie',
                                                't-shirt',
                                                'shirt',
                                                'jacket',
                                                'sweater',
                                                'crewneck',
                                                'oversized',
                                              ].some((k) =>
                                                item.product_title!.toLowerCase().includes(k)
                                              ));

                                          if (isClothing && item.options && (item.options.color || item.options.size)) {
                                            return (
                                              <div className="flex flex-wrap gap-0.5">
                                                {item.options.color && (
                                                  <span className="rounded bg-purple-100 px-1 py-0 text-[10px] text-purple-800">
                                                    {item.options.color}
                                                  </span>
                                                )}
                                                {item.options.size && (
                                                  <span className="rounded bg-blue-100 px-1 py-0 text-[10px] text-blue-800">
                                                    {item.options.size}
                                                  </span>
                                                )}
                                                <span className="rounded bg-gray-200 px-1 py-0 text-[10px] text-gray-800">
                                                  ×{item.quantity}
                                                </span>
                                              </div>
                                            );
                                          }
                                          if (isClothing) {
                                            const hasSizeInPosterSize =
                                              item.selected_poster_size &&
                                              item.selected_product_type === 'poster';
                                            return (
                                              <div className="flex flex-wrap gap-0.5">
                                                <span className="rounded bg-orange-100 px-1 py-0 text-[10px]">
                                                  Clothing
                                                </span>
                                                {hasSizeInPosterSize && (
                                                  <span className="rounded bg-blue-100 px-1 py-0 text-[10px]">
                                                    {item.selected_poster_size}
                                                  </span>
                                                )}
                                                <span className="text-gray-600">Qty {item.quantity}</span>
                                                {hasSizeInPosterSize && (
                                                  <span className="rounded bg-red-100 px-1 py-0 text-[10px]">
                                                    Data issue
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          }
                                          return (
                                            <>
                                              <span className="capitalize">
                                                {item.selected_product_type === 'poster' ? 'Poster' : 'Digital'}
                                              </span>
                                              {item.selected_product_type === 'poster' &&
                                                item.selected_poster_size && (
                                                  <span className="ml-1 rounded bg-green-100 px-1 text-[10px]">
                                                    {item.selected_poster_size}
                                                  </span>
                                                )}
                                              <span className="text-gray-500"> · Qty {item.quantity}</span>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className="font-semibold tabular-nums text-gray-900">
                                        {formatCurrency(item.total_price, order.currency_code || 'INR')}
                                      </p>
                                      <p className="text-[10px] text-gray-500">
                                        {formatCurrency(item.unit_price, order.currency_code || 'INR')} ea
                                      </p>
                                      {item.gst_amount !== undefined && item.gst_amount !== null && item.gst_amount > 0 && (
                                        <p className="text-[9px] text-gray-400">
                                          incl. {item.gst_rate}% GST ({formatCurrency(item.gst_amount, order.currency_code || 'INR')})
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="rounded-md border border-gray-200 bg-white p-2">
                                <h4 className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-gray-900">
                                  <FileText className="h-3.5 w-3.5 text-gray-600" />
                                  Details
                                </h4>
                                <dl className="space-y-1 text-[11px]">
                                  <div className="flex justify-between gap-2">
                                    <dt className="text-gray-500">Payment</dt>
                                    <dd className="font-medium capitalize text-gray-900">
                                      {order.payment_method}
                                    </dd>
                                  </div>
                                  {order.gst_amount !== undefined && order.gst_amount !== null && order.gst_amount > 0 && (
                                    <div className="flex justify-between gap-2">
                                      <dt className="text-gray-500">GST (Inclusive)</dt>
                                      <dd className="font-medium text-gray-900">
                                        {formatCurrency(order.gst_amount, order.currency_code || 'INR')}
                                      </dd>
                                    </div>
                                  )}
                                  {order.payment_id && (
                                    <div className="flex justify-between gap-2">
                                      <dt className="text-gray-500">Payment ID</dt>
                                      <dd className="max-w-[60%] truncate font-mono text-gray-800">
                                        {order.payment_id}
                                      </dd>
                                    </div>
                                  )}
                                  <div className="flex justify-between gap-2">
                                    <dt className="text-gray-500">Created</dt>
                                    <dd className="text-right text-gray-800">
                                      {new Date(order.created_at).toLocaleString()}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <dt className="text-gray-500">Updated</dt>
                                    <dd className="text-right text-gray-800">
                                      {new Date(order.updated_at).toLocaleString()}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                              {order.shipping_address && (
                                <div className="rounded-md border border-gray-200 bg-white p-2 text-[11px]">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                    Shipping
                                  </p>
                                  <p className="mt-0.5 leading-snug text-gray-800">
                                    {order.shipping_address}
                                  </p>
                                </div>
                              )}
                              {order.notes && (
                                <div className="rounded-md border border-gray-200 bg-white p-2 text-[11px]">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                    Notes
                                  </p>
                                  <p className="mt-0.5 leading-snug text-gray-800">{order.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 bg-gray-50/60 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span>
                Showing{' '}
                <span className="font-semibold text-gray-900">
                  {filteredOrders.length === 0 ? 0 : startIndex + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-gray-900">{endIndex}</span>{' '}
                of{' '}
                <span className="font-semibold text-gray-900">
                  {filteredOrders.length}
                </span>{' '}
                orders
              </span>
              <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200">
                <span className="text-gray-500">Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 rounded border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-center gap-1 mx-1">
                {getPageNumbers().map((page, idx) => {
                  if (typeof page === 'string') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">
                        …
                      </span>
                    );
                  }
                  const isActive = page === currentPage;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`inline-flex h-7 min-w-[1.75rem] px-2 items-center justify-center rounded text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-900 text-white shadow-sm font-semibold'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
