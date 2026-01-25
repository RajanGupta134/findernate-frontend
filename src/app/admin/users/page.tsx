'use client';

import AdminLayout from '@/components/admin/layout/AdminLayout';
import { Search, Filter, MoreVertical, Ban, CheckCircle, XCircle, Users, UserCheck, UserX, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usersAPI, User, UsersPagination } from '@/api/users';

export default function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<UsersPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchUsers = async (page = 1, search = '', accountStatus = 'all') => {
    try {
      setIsLoading(true);
      setError(null);
      
      //console.log('🔍 Fetching users:', { page, search, accountStatus });
      
      const response = await usersAPI.getUsers({
        page,
        limit: 20,
        search: search.trim(),
        accountStatus: accountStatus !== 'all' ? accountStatus : undefined,
      });

      //console.log('✅ API Response:', response);

      if (response.success) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.message || 'Failed to fetch data');
      }
    } catch (err: any) {
      //console.error('❌ Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage, searchQuery, accountStatusFilter);
  }, [currentPage, searchQuery, accountStatusFilter]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setAccountStatusFilter(status);
    setCurrentPage(1);
  };

  const handleUpdateUserStatus = async (userId: string, status: 'active' | 'banned' | 'deactivated') => {
    if (!confirm(`Are you sure you want to change this user's status to ${status}?`)) return;
    
    try {
      setIsUpdating(userId);
      //console.log(`🔄 Updating user ${userId} to ${status}`);
      
      await usersAPI.updateUserStatus(userId, status);
      
      //console.log('✅ User status updated successfully');
      
      // Refresh the users list
      await fetchUsers(currentPage, searchQuery, accountStatusFilter);
    } catch (err: any) {
      //console.error('❌ Error updating user status:', err);
      setError(err.message || 'Failed to update user status');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;
    
    try {
      setIsUpdating(userId);
      //console.log(`🗑️ Deleting user ${userId}`);
      
      await usersAPI.deleteUser(userId);
      
      //console.log('✅ User deleted successfully');
      
      // Refresh the users list
      await fetchUsers(currentPage, searchQuery, accountStatusFilter);
    } catch (err: any) {
      //console.error('❌ Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
    } finally {
      setIsUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (fullName: string) => {
    return fullName.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { 
        color: 'bg-green-100 text-green-800', 
        icon: CheckCircle,
        text: 'Active' 
      },
      deactivated: { 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: XCircle,
        text: 'Deactivated' 
      },
      banned: { 
        color: 'bg-red-100 text-red-800', 
        icon: Ban,
        text: 'Banned' 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full flex items-center gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage user accounts, view activity, and update account status
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by username, name, or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black"
            value={accountStatusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{pagination?.totalUsers || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{users.filter(u => u.accountStatus === 'active').length}</p>
                <p className="text-sm text-gray-500">{pagination?.totalUsers ? ((users.filter(u => u.accountStatus === 'active').length / pagination.totalUsers) * 100).toFixed(1) : '0.0'}% of total</p>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Deactivated</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{users.filter(u => u.accountStatus === 'deactivated').length}</p>
                <p className="text-sm text-gray-500">Need attention</p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-100">
                <XCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Banned Users</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{users.filter(u => u.accountStatus === 'banned').length}</p>
                <p className="text-sm text-gray-500">Restricted access</p>
              </div>
              <div className="p-3 rounded-xl bg-red-100">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              All Users ({users.length})
            </h2>
            {error && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>
          
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
                <span className="ml-3 text-gray-600">Loading users...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No users found</p>
              </div>
            ) : (
              users.map((user) => (
                <div key={user._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={user.fullName}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {getInitials(user.fullName)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {user.fullName}
                          </h3>
                          <p className="text-gray-600">@{user.username}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        {getStatusBadge(user.accountStatus)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium text-black">{user.phoneNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Posts</p>
                          <p className="font-medium text-black">{user.posts.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Followers</p>
                          <p className="font-medium text-black">{user.followers.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Following</p>
                          <p className="font-medium text-black">{user.following.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Joined</p>
                          <p className="font-medium text-black">{formatDate(user.createdAt)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-4">
                        <div className="text-sm">
                          <span className="text-gray-500">Email Verified:</span> 
                          <span className={`ml-1 ${user.isEmailVerified ? 'text-green-600' : 'text-red-600'}`}>
                            {user.isEmailVerified ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Phone Verified:</span> 
                          <span className={`ml-1 ${user.isPhoneVerified ? 'text-green-600' : 'text-red-600'}`}>
                            {user.isPhoneVerified ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Business Profile:</span> 
                          <span className={`ml-1 ${user.isBusinessProfile ? 'text-blue-600' : 'text-gray-600'}`}>
                            {user.isBusinessProfile ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select 
                      value=""
                      onChange={(e) => e.target.value && handleUpdateUserStatus(user._id, e.target.value as any)}
                      disabled={isUpdating === user._id}
                      className="px-3 py-1 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:opacity-50 text-black"
                    >
                      <option value="">Change Status</option>
                      {user.accountStatus !== 'active' && <option value="active">Set Active</option>}
                      {user.accountStatus !== 'deactivated' && <option value="deactivated">Deactivate</option>}
                      {user.accountStatus !== 'banned' && <option value="banned">Ban User</option>}
                    </select>
                    <button 
                      onClick={() => handleDeleteUser(user._id)}
                      disabled={isUpdating === user._id}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete User"
                    >
                      {isUpdating === user._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.currentPage - 1) * 20) + 1} to {Math.min(pagination.currentPage * 20, pagination.totalUsers)} of {pagination.totalUsers} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50 text-black"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-yellow-500 text-white rounded">
                {pagination.currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50 text-black"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}