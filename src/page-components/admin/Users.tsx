'use client'

import React, { useState, useEffect } from 'react';
import { 
  Search, RefreshCw, Eye, Edit2, UserX, Plus, X,
  Users as UsersIcon, Shield, Calendar, CheckCircle, XCircle, Crown,
  Ban, Unlock, Trash2, Wallet, DollarSign, Briefcase, Info, Lock, Check
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { RealUserService, RealUser, UserStats } from '../../services/realUserService';
import StoreCreditService from '../../services/storeCreditService';
import { 
  EMPLOYEE_TAB_DEFINITIONS,
  ADMIN_ONLY_TAB_DEFINITIONS,
  EMPLOYEE_ALLOWED_SECTIONS,
  getEmployeeAllowedSections
} from '../../utils/adminUtils';

const inputCls =
  'h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900';

const Users: React.FC = () => {
  const [users, setUsers] = useState<RealUser[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    confirmed: 0,
    unconfirmed: 0,
    active: 0,
    inactive: 0,
    recent_signups: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RealUser | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showStoreCreditModal, setShowStoreCreditModal] = useState(false);
  const [storeCreditBalances, setStoreCreditBalances] = useState<Record<string, number>>({});
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditDescription, setCreditDescription] = useState<string>('');
  const [creditAction, setCreditAction] = useState<'add' | 'deduct'>('add');

  // Load store credit balances for all users
  const loadStoreCreditBalances = async (userList: RealUser[]) => {
    try {
      const balances: Record<string, number> = {};
      await Promise.all(
        userList.map(async (user) => {
          const balance = await StoreCreditService.getUserBalance(user.id);
          balances[user.id] = balance;
        })
      );
      setStoreCreditBalances(balances);
    } catch (error) {
      console.error('Error loading store credit balances:', error);
    }
  };

  // Load users and stats
  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, statsData] = await Promise.all([
        RealUserService.getAllUsers(),
        RealUserService.getUserStats()
      ]);
      setUsers(usersData);
      setStats(statsData);
      
      // Load store credit balances
      await loadStoreCreditBalances(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Create user
  const handleCreateUser = async (userData: { email: string; password: string; role: string; allowedTabs?: string[] }) => {
    try {
      const success = await RealUserService.createUser(
        userData.email,
        userData.password,
        { role: userData.role },
        userData.allowedTabs
      );
      if (success) {
        await loadData();
        setShowCreateModal(false);
        alert('User created successfully!');
      } else {
        alert('Failed to create user. Please try again.');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user. Please try again.');
    }
  };

  // Update user role & allowed tabs
  const handleUpdateRole = async (userId: string, role: string, allowedTabs?: string[]) => {
    try {
      const success = await RealUserService.updateUserRole(userId, role, allowedTabs);
      if (success) {
        setShowEditModal(false);
        setSelectedUser(null);
        await loadData();
        alert('User role & tab permissions updated successfully!');
      } else {
        alert('Failed to update user role. Please try again.');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  // Ban/unban user
  const handleBanUser = async (userId: string, banUntil?: string) => {
    try {
      const success = await RealUserService.banUser(userId, banUntil);
      if (success) {
        await loadData();
        alert(banUntil ? 'User banned successfully!' : 'User unbanned successfully!');
      } else {
        alert('Failed to update user status. Please try again.');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Failed to update user status. Please try again.');
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const success = await RealUserService.deleteUser(userId);
        if (success) {
          await loadData();
          alert('User deleted successfully!');
        } else {
          alert('Failed to delete user. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. Please try again.');
      }
    }
  };

  // Open store credit modal
  const handleOpenStoreCreditModal = (user: RealUser) => {
    setSelectedUser(user);
    setCreditAmount('');
    setCreditDescription('');
    setCreditAction('add');
    setShowStoreCreditModal(true);
  };

  // Manage store credit
  const handleManageStoreCredit = async () => {
    if (!selectedUser || !creditAmount || parseFloat(creditAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const amount = parseFloat(creditAmount);
      let result;

      if (creditAction === 'add') {
        result = await StoreCreditService.addCredit(
          selectedUser.id,
          amount,
          creditDescription || `Admin credit adjustment`,
          undefined,
          'credit'
        );
      } else {
        result = await StoreCreditService.deductCredit(
          selectedUser.id,
          amount,
          creditDescription || `Admin deduction`
        );
      }

      if (result.success) {
        alert(`Store credit ${creditAction === 'add' ? 'added' : 'deducted'} successfully!`);
        setShowStoreCreditModal(false);
        setCreditAmount('');
        setCreditDescription('');
        // Reload balances
        await loadStoreCreditBalances(users);
      } else {
        alert(result.error || `Failed to ${creditAction} store credit`);
      }
    } catch (error) {
      console.error('Error managing store credit:', error);
      alert(`Failed to ${creditAction} store credit`);
    }
  };

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedUsers([]);
  };

  // View user details
  const handleViewUser = (user: RealUser) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  // Edit user
  const handleEditUser = (user: RealUser) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'confirmed' && user.email_confirmed_at) ||
                           (filterStatus === 'unconfirmed' && !user.email_confirmed_at) ||
                           (filterStatus === 'active' && user.last_sign_in_at && 
                            new Date(user.last_sign_in_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ||
                           (filterStatus === 'inactive' && (!user.last_sign_in_at || 
                            new Date(user.last_sign_in_at) <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      return matchesSearch && matchesStatus && matchesRole;
    })
    .sort((a, b) => {
      let aValue = a[sortBy as keyof RealUser];
      let bValue = b[sortBy as keyof RealUser];
      
      if (sortBy === 'created_at' || sortBy === 'last_sign_in_at' || sortBy === 'email_confirmed_at') {
        aValue = aValue ? new Date(aValue as string).getTime() : 0;
        bValue = bValue ? new Date(bValue as string).getTime() : 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-50 text-red-900 ring-1 ring-inset ring-red-600/20';
      case 'employee':
        return 'bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-600/20';
      case 'artist':
        return 'bg-violet-50 text-violet-900 ring-1 ring-inset ring-violet-600/20';
      case 'customer':
        return 'bg-blue-50 text-blue-900 ring-1 ring-inset ring-blue-600/20';
      default:
        return 'bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-500/20';
    }
  };

  const getRoleIcon = (role: string) => {
    const cls = 'w-3 h-3 shrink-0';
    switch (role) {
      case 'admin':
        return <Crown className={cls} />;
      case 'employee':
        return <Briefcase className={cls} />;
      case 'artist':
        return <Shield className={cls} />;
      case 'customer':
        return <UsersIcon className={cls} />;
      default:
        return <UsersIcon className={cls} />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUserActive = (user: RealUser) => {
    if (!user.last_sign_in_at) return false;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return new Date(user.last_sign_in_at) > thirtyDaysAgo;
  };

  const statItems: { label: string; value: number; Icon: typeof UsersIcon; iconClass: string }[] = [
    { label: 'Total', value: stats.total, Icon: UsersIcon, iconClass: 'text-blue-600' },
    { label: 'Confirmed', value: stats.confirmed, Icon: CheckCircle, iconClass: 'text-green-600' },
    { label: 'Unconfirmed', value: stats.unconfirmed, Icon: XCircle, iconClass: 'text-amber-600' },
    { label: 'Active 30d', value: stats.active, Icon: Calendar, iconClass: 'text-green-600' },
    { label: 'Inactive', value: stats.inactive, Icon: UserX, iconClass: 'text-red-600' },
    { label: 'New 30d', value: stats.recent_signups, Icon: Plus, iconClass: 'text-violet-600' },
  ];

  return (
    <AdminLayout title="Users" noHeader={true}>
      <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <p className="text-xs text-gray-500">Supabase Auth users, roles, and store credit</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPermissionsModal(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
              title="View all tabs accessible by the Employee role"
            >
              <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
              <span>Employee Tab Permissions</span>
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-gray-900 px-2.5 text-xs font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add user
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50/90 p-3">
          {statItems.map(({ label, value, Icon, iconClass }) => (
            <div
              key={label}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5"
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} />
              <span className="text-[11px] text-gray-500">{label}</span>
              <span className="text-xs font-semibold tabular-nums text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative min-w-[10rem] flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputCls} w-full pl-7`}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`${inputCls} min-w-[7rem]`}
            >
              <option value="all">All status</option>
              <option value="confirmed">Confirmed</option>
              <option value="unconfirmed">Unconfirmed</option>
              <option value="active">Active (30d)</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={`${inputCls} min-w-[6.5rem]`}
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
              <option value="artist">Artist</option>
              <option value="customer">Customer</option>
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className={`${inputCls} min-w-[8rem]`}
            >
              <option value="created_at-desc">Newest</option>
              <option value="created_at-asc">Oldest</option>
              <option value="last_sign_in_at-desc">Last active</option>
              <option value="email-asc">Email A–Z</option>
              <option value="email-desc">Email Z–A</option>
            </select>
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs">
            <span className="font-medium text-gray-800">
              {selectedUsers.length} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={clearSelection} className="text-gray-600 hover:text-gray-900">
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedUsers.forEach((id) =>
                    handleBanUser(id, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
                  );
                  setSelectedUsers([]);
                }}
                className="text-red-600 hover:underline"
              >
                Ban 7d
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedUsers.forEach((id) => handleBanUser(id));
                  setSelectedUsers([]);
                }}
                className="text-green-700 hover:underline"
              >
                Unban
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center">
            <UsersIcon className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-800">No users</p>
            <p className="text-xs text-gray-500">Try search or filters</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] divide-y divide-gray-200 text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={
                          selectedUsers.length === filteredUsers.length && filteredUsers.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(filteredUsers.map((u) => u.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      User
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Role
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Credit
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Created
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Last in
                    </th>
                    <th className="w-40 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/80">
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                      </td>
                      <td className="max-w-[200px] px-3 py-2.5 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-700">
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium text-gray-900">{user.email}</div>
                            <div className="font-mono text-[10px] text-gray-400">{user.id.slice(0, 8)}…</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-0.5 text-[11px]">
                            {user.email_confirmed_at ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <XCircle className="h-3 w-3 text-amber-600" />
                            )}
                            <span className={user.email_confirmed_at ? 'text-green-800' : 'text-amber-800'}>
                              {user.email_confirmed_at ? 'OK' : 'Pending'}
                            </span>
                          </span>
                          {isUserActive(user) && (
                            <span className="w-fit rounded bg-green-50 px-1 py-0 text-[10px] font-medium text-green-800 ring-1 ring-inset ring-green-600/15">
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (user.role === 'employee') {
                                handleEditUser(user);
                              }
                            }}
                            className={`w-fit inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize transition-all ${getRoleColor(user.role || 'customer')} ${
                              user.role === 'employee'
                                ? 'cursor-pointer hover:ring-2 hover:ring-emerald-600/40'
                                : 'cursor-default'
                            }`}
                            title={user.role === 'employee' ? 'Click to edit allowed tab permissions' : undefined}
                          >
                            {getRoleIcon(user.role || 'customer')}
                            <span>{user.role || 'customer'}</span>
                          </button>
                          {user.role === 'employee' && (
                            <button
                              type="button"
                              onClick={() => handleEditUser(user)}
                              className="text-left text-[10px] font-medium text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                              title="Edit allowed tabs for this employee"
                            >
                              <span>{getEmployeeAllowedSections(user).length} of 11 tabs</span>
                              <Edit2 className="w-2.5 h-2.5 opacity-70" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle tabular-nums">
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-900">
                          <Wallet className="h-3.5 w-3.5 text-violet-600" />
                          ₹{storeCreditBalances[user.id]?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[11px] text-gray-700">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[11px] text-gray-700">
                        {formatDate(user.last_sign_in_at)}
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div className="flex flex-wrap items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleViewUser(user)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditUser(user)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title="Edit role"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleBanUser(
                                user.id,
                                user.banned_until
                                  ? undefined
                                  : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                              )
                            }
                            className={`rounded-md p-1.5 ${
                              user.banned_until
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }`}
                            title={user.banned_until ? 'Unban' : 'Ban 7d'}
                          >
                            {user.banned_until ? (
                              <Unlock className="h-3.5 w-3.5" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenStoreCreditModal(user)}
                            className="rounded-md p-1.5 text-violet-500 hover:bg-violet-50 hover:text-violet-700"
                            title="Store credit"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <CreateUserModal
            onSubmit={handleCreateUser}
            onOpenPermissions={() => setShowPermissionsModal(true)}
            onClose={() => setShowCreateModal(false)}
          />
        )}

        {/* View User Modal */}
        {showViewModal && selectedUser && (
          <ViewUserModal
            user={selectedUser}
            onClose={() => {
              setShowViewModal(false);
              setSelectedUser(null);
            }}
          />
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <EditUserModal
            user={selectedUser}
            onSubmit={handleUpdateRole}
            onOpenPermissions={() => setShowPermissionsModal(true)}
            onClose={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
          />
        )}

        {/* Employee Permissions Modal */}
        {showPermissionsModal && (
          <EmployeePermissionsModal onClose={() => setShowPermissionsModal(false)} />
        )}

        {showStoreCreditModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
            <div
              className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-lg"
              role="dialog"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Wallet className="h-4 w-4 text-violet-600" />
                  Store credit
                </h3>
                <button
                  type="button"
                  onClick={() => setShowStoreCreditModal(false)}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 p-3">
                <div className="rounded-md border border-violet-100 bg-violet-50/80 p-2 text-xs">
                  <p className="truncate text-gray-800">
                    <span className="text-gray-500">User: </span>
                    {selectedUser.email}
                  </p>
                  <p className="mt-0.5 text-gray-800">
                    <span className="text-gray-500">Balance: </span>
                    <span className="font-semibold text-violet-700 tabular-nums">
                      ₹{storeCreditBalances[selectedUser.id]?.toFixed(2) || '0.00'}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-medium text-gray-600">Action</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setCreditAction('add')}
                      className={`flex-1 rounded-md py-1.5 text-xs font-medium ${
                        creditAction === 'add'
                          ? 'bg-green-600 text-white'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreditAction('deduct')}
                      className={`flex-1 rounded-md py-1.5 text-xs font-medium ${
                        creditAction === 'deduct'
                          ? 'bg-red-600 text-white'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Deduct
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-medium text-gray-600">Amount (₹)</label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={inputCls + ' w-full'}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-medium text-gray-600">Note (optional)</label>
                  <textarea
                    value={creditDescription}
                    onChange={(e) => setCreditDescription(e.target.value)}
                    placeholder="Reason…"
                    rows={2}
                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
                <div className="flex gap-2 border-t border-gray-100 pt-2">
                  <button
                    type="button"
                    onClick={handleManageStoreCredit}
                    disabled={!creditAmount || parseFloat(creditAmount) <= 0}
                    className="flex-1 rounded-md bg-violet-600 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creditAction === 'add' ? 'Add' : 'Deduct'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStoreCreditModal(false)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

// Create User Modal Component
interface CreateUserModalProps {
  onSubmit: (user: { email: string; password: string; role: string; allowedTabs?: string[] }) => void;
  onClose: () => void;
  onOpenPermissions?: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onSubmit, onClose, onOpenPermissions }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'customer'
  });
  const [selectedTabs, setSelectedTabs] = useState<string[]>(() =>
    EMPLOYEE_TAB_DEFINITIONS.map(t => t.id)
  );

  const handleToggleTab = (tabId: string) => {
    setSelectedTabs(prev =>
      prev.includes(tabId) ? prev.filter(id => id !== tabId) : [...prev, tabId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      allowedTabs: formData.role === 'employee' ? selectedTabs : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="max-h-[90vh] w-full max-w-xl flex flex-col rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-white">
          <h3 className="text-sm font-bold text-gray-900">Create new user</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-gray-700">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputCls + ' w-full'}
              required
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-gray-700">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={inputCls + ' w-full'}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-gray-700">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className={inputCls + ' w-full'}
            >
              <option value="customer">Customer (Storefront shopper)</option>
              <option value="employee">Employee (Operational staff with custom tabs)</option>
              <option value="artist">Artist (Artwork creator)</option>
              <option value="admin">Administrator (Super Admin - Full uninhibited access)</option>
            </select>
          </div>

          {formData.role === 'employee' && (
            <div className="space-y-3 pt-1">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
                    Allowed Operational Tabs ({selectedTabs.length} of {EMPLOYEE_TAB_DEFINITIONS.length} enabled)
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTabs(EMPLOYEE_TAB_DEFINITIONS.map(t => t.id))}
                      className="px-2 py-0.5 rounded bg-white hover:bg-emerald-100 border border-emerald-300 text-[10px] font-semibold text-emerald-800 transition-colors"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTabs([])}
                      className="px-2 py-0.5 rounded bg-white hover:bg-gray-100 border border-gray-200 text-[10px] font-medium text-gray-600 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {EMPLOYEE_TAB_DEFINITIONS.map((tab) => {
                    const isChecked = selectedTabs.includes(tab.id);
                    return (
                      <label
                        key={tab.id}
                        className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-white border-emerald-300 shadow-xs'
                            : 'bg-white/60 border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTab(tab.id)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                        />
                        <div className="min-w-0 flex-1">
                          <span className={`text-[11px] font-semibold block ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>
                            {tab.name}
                          </span>
                          <span className="font-mono text-[9px] text-gray-400">
                            {tab.path}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Locked Admin-only preview */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 space-y-1 opacity-80">
                <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-red-500" />
                  Admin-Only Tabs (Locked)
                </span>
                <p className="text-[10px] text-gray-500">
                  Users, Settings, Database, Analytics, Email, Marketing, Social Posting, Homepage are strictly locked to Admins.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 border-t border-gray-100 pt-3">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-gray-900 py-2 text-xs font-semibold text-white hover:bg-black transition-colors"
            >
              Create User
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View User Modal Component
interface ViewUserModalProps {
  user: RealUser;
  onClose: () => void;
}

const ViewUserModal: React.FC<ViewUserModalProps> = ({ user, onClose }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
        <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-gray-100 bg-white px-3 py-2">
          <h3 className="text-sm font-semibold text-gray-900">User details</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-sm font-medium text-gray-900">{user.email}</h4>
              <p className="truncate font-mono text-[10px] text-gray-500">{user.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Email confirmed</p>
              <p className={`text-xs font-medium ${user.email_confirmed_at ? 'text-green-700' : 'text-amber-700'}`}>
                {user.email_confirmed_at ? 'Yes' : 'No'}
              </p>
            </div>
            <div className="rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Role</p>
              <p className="text-xs capitalize text-gray-900">{user.role || 'customer'}</p>
            </div>
            <div className="rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Created</p>
              <p className="text-xs text-gray-900">{formatDate(user.created_at)}</p>
            </div>
            <div className="rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Last sign in</p>
              <p className="text-xs text-gray-900">{formatDate(user.last_sign_in_at)}</p>
            </div>
            <div className="rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Phone</p>
              <p className="text-xs text-gray-900">{user.phone || '—'}</p>
            </div>
            <div className="rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Banned until</p>
              <p className="text-xs text-gray-900">{user.banned_until ? formatDate(user.banned_until) : '—'}</p>
            </div>
          </div>

          {user.user_metadata && Object.keys(user.user_metadata).length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium text-gray-600">User metadata</p>
              <pre className="max-h-32 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-[10px] leading-relaxed">
                {JSON.stringify(user.user_metadata, null, 2)}
              </pre>
            </div>
          )}

          {user.app_metadata && Object.keys(user.app_metadata).length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium text-gray-600">App metadata</p>
              <pre className="max-h-32 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-[10px] leading-relaxed">
                {JSON.stringify(user.app_metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-gray-100 px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit User Modal Component
interface EditUserModalProps {
  user: RealUser;
  onSubmit: (userId: string, role: string, allowedTabs?: string[]) => Promise<void> | void;
  onClose: () => void;
  onOpenPermissions?: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onSubmit, onClose, onOpenPermissions }) => {
  const [role, setRole] = useState(user.role || 'customer');
  const [saving, setSaving] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<string[]>(() => {
    // If the user already has custom allowed_tabs, load them (ensuring valid operational tabs only)
    if (user.allowed_tabs && Array.isArray(user.allowed_tabs) && user.allowed_tabs.length > 0) {
      const valid = user.allowed_tabs.filter((t: string) => (EMPLOYEE_ALLOWED_SECTIONS as readonly string[]).includes(t));
      if (valid.length > 0) return valid;
    }
    // Default to all 11 operational tabs
    return EMPLOYEE_TAB_DEFINITIONS.map(t => t.id);
  });

  const handleToggleTab = (tabId: string) => {
    setSelectedTabs(prev => {
      if (prev.includes(tabId)) {
        return prev.filter(t => t !== tabId);
      } else {
        return [...prev, tabId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedTabs(EMPLOYEE_TAB_DEFINITIONS.map(t => t.id));
  };

  const handleClearAll = () => {
    setSelectedTabs([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(user.id, role, role === 'employee' ? selectedTabs : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-xl flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs font-bold text-gray-700">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">
                Edit User Role & Permissions
              </h3>
              <p className="text-[11px] font-mono text-gray-500 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputCls + ' w-full h-9 font-medium text-xs'}
            >
              <option value="customer">Customer (Storefront shopper)</option>
              <option value="employee">Employee (Operational staff with custom tabs)</option>
              <option value="artist">Artist (Artwork creator)</option>
              <option value="admin">Administrator (Super Admin - Full uninhibited access)</option>
            </select>
          </div>

          {role === 'employee' ? (
            <div className="space-y-3.5 pt-1">
              {/* Allowed Operational Tabs Checklist */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
                      Allowed Operational Tabs ({selectedTabs.length} of {EMPLOYEE_TAB_DEFINITIONS.length} enabled)
                    </h4>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5">
                      Check each section this employee is permitted to view and manage.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-100 border border-emerald-300 text-[10px] font-bold text-emerald-800 transition-colors cursor-pointer"
                    >
                      Select All ({EMPLOYEE_TAB_DEFINITIONS.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2.5 py-1 rounded-md bg-white hover:bg-gray-100 border border-gray-200 text-[10px] font-medium text-gray-600 transition-colors cursor-pointer"
                      title="Clear all tabs"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Grid of operational tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {EMPLOYEE_TAB_DEFINITIONS.map((tab) => {
                    const isChecked = selectedTabs.includes(tab.id);
                    return (
                      <label
                        key={tab.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-500/10'
                            : 'bg-white/60 border-gray-200/80 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTab(tab.id)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-semibold ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>
                              {tab.name}
                            </span>
                            <span className="font-mono text-[9px] text-gray-400 bg-gray-50 px-1 py-0.2 rounded border border-gray-100">
                              {tab.path}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 leading-snug mt-0.5">
                            {tab.desc}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Locked Admin-Only Tabs Indicator */}
              <div className="rounded-xl border border-red-200/70 bg-red-50/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-red-600" />
                    Admin-Only Tabs (Strictly Protected - 10 Tabs)
                  </span>
                  <span className="text-[10px] font-semibold text-red-700 bg-red-100/70 border border-red-200 px-2 py-0.5 rounded-full">
                    Super Admin Only
                  </span>
                </div>
                <p className="text-[11px] text-red-800 leading-relaxed">
                  These critical sections cannot be assigned to employees:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {ADMIN_ONLY_TAB_DEFINITIONS.map(tab => (
                    <span
                      key={tab.id}
                      className="inline-flex items-center gap-1 rounded-md bg-white border border-red-200/80 px-2 py-0.5 text-[10px] font-medium text-red-900"
                    >
                      <Lock className="w-2.5 h-2.5 text-red-500" />
                      {tab.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : role === 'admin' ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-950 flex items-start gap-2">
              <Crown className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900 block">Super Administrator Privileges</span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Administrators have unrestricted access to all 21 tabs, including sensitive database tables, credentials, marketing engines, user management, and revenue analytics.
                </p>
              </div>
            </div>
          ) : null}

          {/* Modal Footer */}
          <div className="flex gap-2.5 border-t border-gray-100 pt-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-gray-900 py-2.5 text-xs font-semibold text-white hover:bg-black transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Saving changes...' : 'Save Role & Permissions'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Employee Permissions & Tab Access Modal
interface EmployeePermissionsModalProps {
  onClose: () => void;
}

const EmployeePermissionsModal: React.FC<EmployeePermissionsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Briefcase className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                Employee Role: Tab & Permission Scope
              </h3>
              <p className="text-xs text-gray-500">
                Summary of accessible operational tabs vs restricted admin areas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          {/* Summary Box */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-xs text-emerald-950">
            <h4 className="font-semibold text-emerald-900 mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Role Purpose & Security Boundaries
            </h4>
            <p className="text-emerald-800 leading-relaxed">
              Accounts assigned the <strong>Employee</strong> role can access daily e-commerce operations (handling orders, products, shipping, returns, customer support, and tasks) with granular per-employee tab customization. Sensitive configuration, API keys, database tables, and financial analytics remain strictly restricted to administrators.
            </p>
          </div>

          {/* Operational Allowed Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Operational Tabs ({EMPLOYEE_TAB_DEFINITIONS.length} Available)
              </h4>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Customizable per Employee
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {EMPLOYEE_TAB_DEFINITIONS.map(tab => (
                <div
                  key={tab.id}
                  className="rounded-xl border border-gray-200/80 bg-white p-3 hover:border-emerald-300 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-xs text-gray-900">{tab.name}</span>
                    <span className="font-mono text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                      {tab.path}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">{tab.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Admin-Only Restricted Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Admin-Only Tabs ({ADMIN_ONLY_TAB_DEFINITIONS.length} Protected)
              </h4>
              <span className="text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                Strictly Super Admin Only
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ADMIN_ONLY_TAB_DEFINITIONS.map(tab => (
                <div
                  key={tab.id}
                  className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-3 opacity-80"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-medium text-xs text-gray-800 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-red-500" />
                      {tab.name}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200/60">
                      {tab.path}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">{tab.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Users;




