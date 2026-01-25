'use client';

import AdminLayout from '@/components/admin/layout/AdminLayout';
import { Search, Filter, Plus, Edit, Shield, Users, Calendar, Clock } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function AllAdminsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data - will be replaced with actual API data
  const admins = [
    {
      id: '1',
      username: 'super_admin',
      fullName: 'Super Admin',
      email: 'admin@findernate.com',
      role: 'Super Admin',
      isActive: true,
      lastLogin: '2024-01-15T10:30:00Z',
      createdAt: '2023-12-01T00:00:00Z',
      createdBy: 'System',
      permissions: {
        viewAnalytics: true,
        verifyAadhaar: true,
        manageReports: true,
        manageUsers: true,
        manageBusiness: true
      }
    },
    {
      id: '2',
      username: 'content_moderator',
      fullName: 'Content Moderator',
      email: 'moderator@findernate.com',
      role: 'Moderator',
      isActive: true,
      lastLogin: '2024-01-15T09:15:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      createdBy: 'Super Admin',
      permissions: {
        viewAnalytics: false,
        verifyAadhaar: false,
        manageReports: true,
        manageUsers: true,
        manageBusiness: false
      }
    },
    {
      id: '3',
      username: 'business_verifier',
      fullName: 'Business Verifier',
      email: 'verifier@findernate.com',
      role: 'Verifier',
      isActive: false,
      lastLogin: '2024-01-10T14:20:00Z',
      createdAt: '2024-01-05T00:00:00Z',
      createdBy: 'Super Admin',
      permissions: {
        viewAnalytics: true,
        verifyAadhaar: true,
        manageReports: false,
        manageUsers: false,
        manageBusiness: true
      }
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPermissionCount = (permissions: any) => {
    return Object.values(permissions).filter(Boolean).length;
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
            <p className="text-gray-600 mt-2">
              Manage admin accounts and their permissions
            </p>
          </div>
          <Link 
            href="/admin/admins/create"
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Admin
          </Link>
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
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            <Filter className="h-4 w-4" />
            More Filters
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Admins</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{admins.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Admins</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {admins.filter(admin => admin.isActive).length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Admins</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {admins.filter(admin => !admin.isActive).length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-red-100">
                <Clock className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Super Admins</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {admins.filter(admin => admin.role === 'Super Admin').length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Admins List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              All Admins ({admins.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {admins.map((admin) => (
              <div key={admin.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {admin.fullName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {admin.fullName}
                        </h3>
                        <p className="text-gray-600">@{admin.username}</p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(admin.isActive)}
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                          {admin.role}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Permissions</p>
                        <p className="font-medium">{getPermissionCount(admin.permissions)}/5 granted</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Last Login</p>
                        <p className="font-medium">{formatDate(admin.lastLogin)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Created</p>
                        <p className="font-medium">{formatDate(admin.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Created By</p>
                        <p className="font-medium">{admin.createdBy}</p>
                      </div>
                    </div>

                    {/* Permissions Display */}
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Permissions</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(admin.permissions).map(([permission, granted]) => (
                          <span
                            key={permission}
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              granted
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Permissions">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Manage Account">
                      <Shield className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing 1 to {admins.length} of {admins.length} results
          </div>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button className="px-3 py-1 text-sm bg-yellow-500 text-white rounded">
              1
            </button>
            <button
              disabled
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}