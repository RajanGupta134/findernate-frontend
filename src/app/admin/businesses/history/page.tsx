'use client';

import AdminLayout from '@/components/admin/layout/AdminLayout';
import { Search, Filter, CheckCircle, XCircle, Calendar, Building2, FileText, Shield } from 'lucide-react';
import { useState } from 'react';

export default function BusinessVerificationHistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data - will be replaced with actual API data
  const verificationHistory = [
    {
      id: '1',
      businessName: 'Tech Innovators Ltd',
      businessType: 'Technology',
      category: 'Software Development',
      ownerName: 'David Chen',
      status: 'approved',
      verifiedBy: 'Admin User',
      verifiedDate: '2024-01-12',
      subscriptionStatus: 'active',
      gstVerified: true,
      aadhaarVerified: true,
      plan: 'Premium',
      remarks: 'All documents verified. Business approved for premium features.'
    },
    {
      id: '2',
      businessName: 'Local Grocery Store',
      businessType: 'Retail',
      category: 'Food & Grocery',
      ownerName: 'Rajesh Kumar',
      status: 'rejected',
      verifiedBy: 'Admin User',
      verifiedDate: '2024-01-10',
      subscriptionStatus: 'pending',
      gstVerified: false,
      aadhaarVerified: true,
      plan: 'Basic',
      remarks: 'GST certificate appears to be invalid. Please resubmit valid documentation.'
    }
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Approved
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </span>
      );
    }
  };

  const getSubscriptionBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[status as keyof typeof statusColors]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Verification History</h1>
          <p className="text-gray-600 mt-2">
            View all completed business verification decisions and their details
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by business name, owner, category..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
                <p className="text-sm font-medium text-gray-600">Total Processed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">342</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600 mt-1">287</p>
                <p className="text-sm text-gray-500">83.9% approval rate</p>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600 mt-1">55</p>
                <p className="text-sm text-gray-500">16.1% rejection rate</p>
              </div>
              <div className="p-3 rounded-xl bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Businesses</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">267</p>
                <p className="text-sm text-gray-500">Currently active</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Verification History List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Verification History
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {verificationHistory.map((record) => (
              <div key={record.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {record.businessName}
                        </h3>
                        <p className="text-gray-600">Owner: {record.ownerName}</p>
                        <p className="text-sm text-gray-500">{record.category}</p>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(record.status)}
                        {getSubscriptionBadge(record.subscriptionStatus)}
                        <span className={`px-2 py-1 text-xs font-medium rounded ${record.plan === 'Premium' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {record.plan}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Business Type</p>
                        <p className="font-medium">{record.businessType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Verified By</p>
                        <p className="font-medium">{record.verifiedBy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Decision Date</p>
                        <p className="font-medium">{record.verifiedDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Subscription</p>
                        <p className={`font-medium ${record.subscriptionStatus === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {record.subscriptionStatus.charAt(0).toUpperCase() + record.subscriptionStatus.slice(1)}
                        </p>
                      </div>
                    </div>

                    {/* Document Verification Status */}
                    <div className="flex gap-6 mb-4">
                      <div className="flex items-center gap-2">
                        <Shield className={`h-4 w-4 ${record.aadhaarVerified ? 'text-green-600' : 'text-red-600'}`} />
                        <span className={`text-sm ${record.aadhaarVerified ? 'text-green-600' : 'text-red-600'}`}>
                          Aadhaar {record.aadhaarVerified ? 'Verified' : 'Not Verified'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className={`h-4 w-4 ${record.gstVerified ? 'text-green-600' : 'text-red-600'}`} />
                        <span className={`text-sm ${record.gstVerified ? 'text-green-600' : 'text-red-600'}`}>
                          GST {record.gstVerified ? 'Verified' : 'Not Verified'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Admin Remarks</p>
                      <p className="text-sm text-gray-700 mt-1">{record.remarks}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing 1 to {verificationHistory.length} of {verificationHistory.length} results
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