'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Calendar,
  RefreshCw,
  X,
  Send,
  Copy,
  Check,
  Sparkles,
  Inbox,
  ArrowLeft,
  Tag,
  CornerDownRight,
  ShieldAlert,
  Flame,
  CheckSquare
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { ContactMessageService, ContactMessage, ContactMessageFilters } from '../../services/contactMessageService';
import EmailService from '../../services/emailService';

type TabView = 'all' | 'unresolved' | 'resolved';

const QUICK_TEMPLATES = [
  {
    title: 'Order Status Update',
    text: (name: string) =>
      `Hello ${name},\n\nThank you for reaching out to Lurevi support regarding your order. We are actively reviewing your order details and tracking status with our fulfillment team. We will send you another update shortly once the latest transit update is verified.\n\nWarm regards,\nLurevi Care Team`
  },
  {
    title: 'Refund Processed',
    text: (name: string) =>
      `Hello ${name},\n\nWe have reviewed your request and processed the refund for your order. The funds should reflect back onto your original payment method within 5–7 business days depending on your bank.\n\nPlease let us know if we can help with anything else!\n\nWarm regards,\nLurevi Care Team`
  },
  {
    title: 'Shipping & Delivery',
    text: (name: string) =>
      `Hello ${name},\n\nThank you for checking in on your shipment. All orders are carefully packaged and dispatched via our express courier partners. Your package is currently moving through our delivery network and should arrive within the estimated timeline.\n\nBest regards,\nLurevi Care Team`
  },
  {
    title: 'General Support',
    text: (name: string) =>
      `Hello ${name},\n\nThank you for contacting Lurevi. We have received your inquiry and our customer care team is delighted to assist you. If you have any further questions or details to share, please reply directly to this email.\n\nWarm regards,\nLurevi Care Team`
  }
];

const CustomerCare: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [autoResolveOnReply, setAutoResolveOnReply] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<TabView>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ContactMessageFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<any>(null);

  // Mobile detail view toggle
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadMessages();
    loadStats();
  }, [filters]);

  // When messages load or filter changes, keep or select an active message on desktop
  useEffect(() => {
    if (messages.length > 0 && !selectedMessage) {
      setSelectedMessage(messages[0]);
    } else if (selectedMessage) {
      const updated = messages.find(m => m.id === selectedMessage.id);
      if (updated) setSelectedMessage(updated);
    }
  }, [messages]);

  const loadMessages = async (opts?: { skipLoading?: boolean }) => {
    if (!opts?.skipLoading) setLoading(true);
    try {
      const result = await ContactMessageService.getMessages(filters);
      if (result.success && result.messages) {
        setMessages(result.messages);
      } else {
        console.error('Failed to load messages:', result.error);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (!opts?.skipLoading) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMessages({ skipLoading: true });
      await loadStats();
    } finally {
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await ContactMessageService.getMessageStats();
      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm.trim() || undefined
    }));
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setFilters(prev => ({
      ...prev,
      search: undefined
    }));
  };

  const handleStatusUpdate = async (messageId: string, status: string) => {
    try {
      const result = await ContactMessageService.updateMessage(messageId, { status: status as any });
      if (result.success) {
        await loadMessages({ skipLoading: true });
        await loadStats();
        setSelectedMessage(prev =>
          prev?.id === messageId ? { ...prev, status: status as ContactMessage['status'] } : prev
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handlePriorityUpdate = async (messageId: string, priority: string) => {
    try {
      const result = await ContactMessageService.updateMessage(messageId, { priority: priority as any });
      if (result.success) {
        await loadMessages({ skipLoading: true });
        setSelectedMessage(prev =>
          prev?.id === messageId ? { ...prev, priority: priority as ContactMessage['priority'] } : prev
        );
      }
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      try {
        const result = await ContactMessageService.deleteMessage(messageId);
        if (result.success) {
          await loadMessages({ skipLoading: true });
          await loadStats();
          if (selectedMessage?.id === messageId) {
            const remaining = messages.filter(m => m.id !== messageId);
            setSelectedMessage(remaining.length > 0 ? remaining[0] : null);
            setShowMobileDetail(false);
          }
        }
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const emailResult = await EmailService.sendEmail({
        to: { email: selectedMessage.email, name: selectedMessage.name },
        subject: `Re: ${selectedMessage.subject}`,
        text: replyText,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 24px;">
              <h2 style="margin: 0; color: #111827; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Lurevi Customer Care</h2>
            </div>
            <p style="font-size: 15px; margin-bottom: 16px;">Dear ${selectedMessage.name},</p>
            <div style="font-size: 15px; white-space: pre-wrap; margin-bottom: 24px; color: #374151;">${replyText.replace(/\n/g, '<br>')}</div>
            <hr style="margin: 28px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <div style="background-color: #f9fafb; border-left: 3px solid #9ca3af; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #6b7280;">
              <strong style="color: #4b5563;">Your original message:</strong><br />
              ${selectedMessage.message.replace(/\n/g, '<br>')}
            </div>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; text-align: center;">
              &copy; ${new Date().getFullYear()} Lurevi. All rights reserved.
            </p>
          </div>
        `
      });

      if (emailResult.success) {
        const nextStatus = autoResolveOnReply ? 'resolved' : selectedMessage.status;
        await ContactMessageService.updateMessage(selectedMessage.id!, {
          response: replyText,
          response_sent_at: new Date().toISOString(),
          status: nextStatus
        });

        setReplySuccess(true);
        setTimeout(() => setReplySuccess(false), 4000);

        await loadMessages({ skipLoading: true });
        await loadStats();

        setSelectedMessage(prev =>
          prev
            ? {
                ...prev,
                response: replyText,
                response_sent_at: new Date().toISOString(),
                status: nextStatus
              }
            : null
        );
        setReplyText('');
      } else {
        alert('Failed to deliver email. Please check configuration and try again.');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('An error occurred while sending the reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleApplyTemplate = (tpl: (name: string) => string) => {
    if (!selectedMessage) return;
    setReplyText(tpl(selectedMessage.name));
    replyTextareaRef.current?.focus();
  };

  // Filter messages by active Tab (All / Unresolved / Resolved)
  const tabFilteredMessages = useMemo(() => {
    return messages.filter(m => {
      if (activeTab === 'unresolved') return m.status === 'new' || m.status === 'in_progress';
      if (activeTab === 'resolved') return m.status === 'resolved' || m.status === 'closed';
      return true;
    });
  }, [messages, activeTab]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            New
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <XCircle className="w-3 h-3 text-gray-500" />
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-100/80 text-red-800 border border-red-300">
            <Flame className="w-3 h-3 text-red-600" />
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            Med
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-gray-50 text-gray-700">
            {priority}
          </span>
        );
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'order':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'billing':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'shipping':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'returns':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'technical':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <AdminLayout title="Customer Care" noHeader>
      <div className="p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1720px] mx-auto min-h-screen flex flex-col">
        {/* Top Header Card with Glass Styling */}
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-4 sm:p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gray-900 text-white shadow-sm">
                <MessageSquare className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">Customer Care</h1>
                <p className="text-xs text-gray-500 font-medium">
                  Direct inquiries, live support tickets, and threaded email responses
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          {stats && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200/80 shadow-xs text-xs font-medium">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-900 tabular-nums">{stats.total}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs font-semibold text-blue-900 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                <span>New</span>
                <span className="tabular-nums font-bold">{stats.new}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs font-semibold text-amber-900 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>In Progress</span>
                <span className="tabular-nums font-bold">{stats.in_progress}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs font-semibold text-emerald-900 shadow-xs">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Resolved</span>
                <span className="tabular-nums font-bold">{stats.resolved}</span>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-xs disabled:opacity-50 ml-1"
                title="Refresh customer care list"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          )}
        </div>

        {/* Two-Pane Master Detail Inbox */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[640px]">
          {/* ========================================================= */}
          {/* LEFT PANE: INBOX LIST (col-span-5 on lg, 4 on xl) */}
          {/* ========================================================= */}
          <div
            className={`lg:col-span-5 xl:col-span-4 flex flex-col rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden ${
              showMobileDetail ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Search & Tabs Header */}
            <div className="p-3 border-b border-gray-100 bg-gray-50/50 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sender, email, subject..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-8 pr-8 text-xs text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 shadow-xs"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  className="h-9 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-9 px-2.5 rounded-xl border transition-all text-xs font-medium flex items-center gap-1 shadow-xs ${
                    showFilters
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Toggle Advanced Filters"
                >
                  <Filter className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Advanced Filter Drawer */}
              {showFilters && (
                <div className="p-2.5 rounded-xl border border-gray-200 bg-white grid grid-cols-2 gap-2 text-xs shadow-xs animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status || ''}
                      onChange={e => handleFilterChange('status', e.target.value)}
                      className="h-7 w-full rounded-lg border border-gray-200 px-2 text-[11px] bg-white focus:outline-none"
                    >
                      <option value="">All Statuses</option>
                      <option value="new">New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                      Priority
                    </label>
                    <select
                      value={filters.priority || ''}
                      onChange={e => handleFilterChange('priority', e.target.value)}
                      className="h-7 w-full rounded-lg border border-gray-200 px-2 text-[11px] bg-white focus:outline-none"
                    >
                      <option value="">All Priorities</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                      Category
                    </label>
                    <select
                      value={filters.category || ''}
                      onChange={e => handleFilterChange('category', e.target.value)}
                      className="h-7 w-full rounded-lg border border-gray-200 px-2 text-[11px] bg-white focus:outline-none"
                    >
                      <option value="">All Categories</option>
                      <option value="general">General</option>
                      <option value="order">Order Issues</option>
                      <option value="shipping">Shipping & Tracking</option>
                      <option value="returns">Returns & Refunds</option>
                      <option value="billing">Billing & Payments</option>
                      <option value="technical">Technical</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Segmented Quick Filter Tabs */}
              <div className="flex p-0.5 rounded-xl bg-gray-200/70 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                    activeTab === 'all'
                      ? 'bg-white text-gray-900 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({messages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('unresolved')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                    activeTab === 'unresolved'
                      ? 'bg-white text-gray-900 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Unresolved ({messages.filter(m => m.status === 'new' || m.status === 'in_progress').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('resolved')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                    activeTab === 'resolved'
                      ? 'bg-white text-gray-900 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Resolved ({messages.filter(m => m.status === 'resolved' || m.status === 'closed').length})
                </button>
              </div>
            </div>

            {/* Scrollable Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {loading ? (
                <div className="py-16 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                  <p className="text-xs text-gray-500 font-medium">Loading customer messages...</p>
                </div>
              ) : tabFilteredMessages.length === 0 ? (
                <div className="py-16 px-4 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">No messages found</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    {activeTab !== 'all' || searchTerm || Object.keys(filters).length > 0
                      ? 'Try resetting your search query or filters to view all inquiries.'
                      : 'Your customer care queue is clear! All inquiries have been handled.'}
                  </p>
                </div>
              ) : (
                tabFilteredMessages.map(msg => {
                  const isSelected = selectedMessage?.id === msg.id;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => {
                        setSelectedMessage(msg);
                        setShowMobileDetail(true);
                      }}
                      className={`group relative p-3.5 cursor-pointer transition-all border-l-4 ${
                        isSelected
                          ? 'bg-blue-50/40 border-l-gray-900'
                          : 'border-l-transparent hover:bg-gray-50/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div
                          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? 'bg-gray-900 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200'
                          }`}
                        >
                          {getInitials(msg.name)}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-semibold text-gray-900 truncate">{msg.name}</span>
                            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                              {formatMessageTime(msg.created_at)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <h4
                              className={`text-xs font-medium truncate ${
                                isSelected ? 'text-gray-900' : 'text-gray-800'
                              }`}
                            >
                              {msg.subject || '(No subject)'}
                            </h4>
                          </div>

                          <p className="text-[11px] text-gray-500 line-clamp-1 mb-2 leading-relaxed">
                            {msg.message}
                          </p>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getStatusBadge(msg.status)}
                            {getPriorityBadge(msg.priority)}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize ${getCategoryBadge(
                                msg.category
                              )}`}
                            >
                              {msg.category}
                            </span>
                            {msg.response && (
                              <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold">
                                <Check className="w-3 h-3" />
                                Replied
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT PANE: MODERN CONVERSATION & REPLY PANEL (7/8 cols)  */}
          {/* ========================================================= */}
          <div
            className={`lg:col-span-7 xl:col-span-8 flex flex-col rounded-2xl border border-gray-200/80 bg-white/95 backdrop-blur-xl shadow-sm overflow-hidden ${
              showMobileDetail ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {selectedMessage ? (
              <div className="flex flex-col h-full">
                {/* 1. Header Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-white flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  {/* Left: Sender Information */}
                  <div className="flex items-center gap-3">
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={() => setShowMobileDetail(false)}
                      className="lg:hidden p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                      title="Back to messages"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {getInitials(selectedMessage.name)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                          {selectedMessage.name}
                        </h2>
                        {getStatusBadge(selectedMessage.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(selectedMessage.email)}
                          className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors group"
                          title="Click to copy email address"
                        >
                          <Mail className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                          <span>{selectedMessage.email}</span>
                          {copiedEmail ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                          )}
                        </button>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(selectedMessage.created_at || '').toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick State Controls */}
                  <div className="flex items-center gap-2 ml-auto">
                    {/* Status Dropdown */}
                    <select
                      value={selectedMessage.status}
                      onChange={e => handleStatusUpdate(selectedMessage.id!, e.target.value)}
                      className="h-8 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50/80 text-xs font-semibold text-gray-800 hover:bg-white focus:outline-none focus:border-gray-900 transition-all cursor-pointer shadow-xs"
                    >
                      <option value="new">● Status: New</option>
                      <option value="in_progress">● Status: In Progress</option>
                      <option value="resolved">● Status: Resolved</option>
                      <option value="closed">● Status: Closed</option>
                    </select>

                    {/* Priority Dropdown */}
                    <select
                      value={selectedMessage.priority}
                      onChange={e => handlePriorityUpdate(selectedMessage.id!, e.target.value)}
                      className="h-8 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50/80 text-xs font-semibold text-gray-800 hover:bg-white focus:outline-none focus:border-gray-900 transition-all cursor-pointer shadow-xs"
                    >
                      <option value="low">Priority: Low</option>
                      <option value="medium">Priority: Medium</option>
                      <option value="high">Priority: High</option>
                      <option value="urgent">Priority: Urgent</option>
                    </select>

                    {/* Delete Action */}
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(selectedMessage.id!)}
                      className="h-8 w-8 flex items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors shadow-xs"
                      title="Delete this message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. Conversation & Message Viewport */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gradient-to-b from-gray-50/30 to-white">
                  {/* Subject & Meta Card */}
                  <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-gray-900">
                        {selectedMessage.subject || 'Inquiry from customer'}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold border capitalize ${getCategoryBadge(
                            selectedMessage.category
                          )}`}
                        >
                          {selectedMessage.category}
                        </span>
                        {getPriorityBadge(selectedMessage.priority)}
                      </div>
                    </div>
                  </div>

                  {/* Customer's Original Message Bubble */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                      <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {selectedMessage.name} wrote:
                      </span>
                      <span>
                        {new Date(selectedMessage.created_at || '').toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedMessage.message}
                    </div>
                  </div>

                  {/* Previous Admin Response (if any) */}
                  {selectedMessage.response && (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs text-emerald-800 px-1">
                        <span className="font-semibold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Lurevi Support Response sent via Email
                        </span>
                        {selectedMessage.response_sent_at && (
                          <span className="text-gray-500 text-[11px]">
                            {new Date(selectedMessage.response_sent_at).toLocaleString([], {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        )}
                      </div>

                      <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-5 shadow-xs text-emerald-950 text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedMessage.response}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Integrated Email Reply Composer */}
                <div className="p-4 sm:p-5 border-t border-gray-100 bg-white shadow-lg space-y-3">
                  {/* Quick Canned Response Chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[11px] font-semibold text-gray-400 shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Quick reply:
                    </span>
                    {QUICK_TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl.text)}
                        className="shrink-0 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-gray-900 bg-gray-50 hover:bg-gray-100 text-[11px] font-medium text-gray-700 transition-colors"
                      >
                        {tpl.title}
                      </button>
                    ))}
                  </div>

                  {/* Textarea Input */}
                  <div className="relative">
                    <textarea
                      ref={replyTextareaRef}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          handleSendReply();
                        }
                      }}
                      placeholder={`Write a direct email response to ${selectedMessage.name}... (Press Ctrl + Enter to send)`}
                      className="w-full rounded-xl border border-gray-200 p-3.5 text-xs text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all min-h-[110px] resize-y shadow-xs"
                    />
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 font-medium cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoResolveOnReply}
                          onChange={e => setAutoResolveOnReply(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 accent-black"
                        />
                        <span>Auto-mark as resolved upon sending</span>
                      </label>

                      {replySuccess && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-in fade-in">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Email delivered to customer!
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={sendingReply || !replyText.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                    >
                      {sendingReply ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending email...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Reply to Customer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State when no message selected */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/40">
                <div className="w-16 h-16 rounded-3xl bg-white border border-gray-200/80 shadow-sm flex items-center justify-center text-gray-400 mb-4">
                  <Inbox className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Select an inquiry to view</h3>
                <p className="text-xs text-gray-500 max-w-sm leading-relaxed mb-4">
                  Choose any customer ticket or inquiry from the list on the left to review message details, inspect sender info, update priorities, and send email replies.
                </p>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMessage(messages[0]);
                      setShowMobileDetail(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    Open first inquiry ({messages[0].name})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CustomerCare;
