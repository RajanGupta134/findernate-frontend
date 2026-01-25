'use client';

import AdminLayout from '@/components/admin/layout/AdminLayout';
import { Search, Filter, CheckCircle, XCircle, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { aadhaarVerificationAPI, AadhaarHistoryBusiness, PaginationInfo } from '@/api/aadhaarVerification';

export default function AadhaarHistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [verificationHistory, setVerificationHistory] = useState<AadhaarHistoryBusiness[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerificationHistory = async (page = 1, search = '', status = 'all') => {
    try {
      setIsLoading(true);
      setError(null);
      
      //console.log('🔍 Fetching Aadhaar verification history:', { page, search, status });
      
      const response = await aadhaarVerificationAPI.getVerificationHistory({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: status as 'approved' | 'rejected' | undefined,
      });

      //console.log('✅ API Response:', response);

      if (response.success) {
        setVerificationHistory(response.data.businesses);
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.message || 'Failed to fetch data');
      }
    } catch (err: any) {
      //console.error('❌ Error fetching verification history:', err);
      setError(err.message || 'Failed to load verification history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerificationHistory(currentPage, searchQuery, statusFilter);
  }, [currentPage, searchQuery, statusFilter]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (status: 'all' | 'approved' | 'rejected') => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const maskAadhaarNumber = (aadhaarNumber: string | null) => {
    if (!aadhaarNumber) return 'Not provided';
    // Mask middle digits, show only last 4
    const cleaned = aadhaarNumber.replace(/\s/g, '');
    if (cleaned.length >= 8) {
      return `${'*'.repeat(8)}${cleaned.slice(-4)}`;
    }
    return aadhaarNumber;
  };

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

  // Calculate statistics
  const approvedCount = verificationHistory.filter(v => v.verificationStatus === 'approved').length;
  const rejectedCount = verificationHistory.filter(v => v.verificationStatus === 'rejected').length;
  const totalCount = pagination?.totalBusinesses || 0;
  const approvalRate = totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : '0.0';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aadhaar Verification History</h1>
          <p className="text-gray-600 mt-2">
            View all completed Aadhaar verification decisions
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by business name, owner name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black"
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value as 'all' | 'approved' | 'rejected')}
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          {/* <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            <Filter className="h-4 w-4" />
            More Filters
          </button> */}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Processed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{approvedCount}</p>
                <p className="text-sm text-gray-500">{approvalRate}% approval rate</p>
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
                <p className="text-2xl font-bold text-red-600 mt-1">{rejectedCount}</p>
                <p className="text-sm text-gray-500">{totalCount > 0 ? ((rejectedCount / totalCount) * 100).toFixed(1) : '0.0'}% rejection rate</p>
              </div>
              <div className="p-3 rounded-xl bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Verification History List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Verification History ({verificationHistory.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
                <span className="ml-3 text-gray-600">Loading verification history...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <span className="ml-3 text-red-600">{error}</span>
              </div>
            ) : verificationHistory.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No verification history found</p>
              </div>
            ) : (
              verificationHistory.map((record) => (
                <div key={record._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {record.businessName}
                          </h3>
                          <p className="text-gray-600">Owner: {record.userId?.fullName || 'N/A'}</p>
                        </div>
                        {getStatusBadge(record.verificationStatus)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Aadhaar Number</p>
                          <p className="font-medium text-black">{maskAadhaarNumber(record.aadhaarNumber)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Verified By</p>
                          <p className="font-medium text-black">{record.verifiedBy?.fullName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Decision Date</p>
                          <p className="font-medium text-black">{formatDate(record.verifiedAt)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p className={`font-medium ${record.verificationStatus === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
                            {record.verificationStatus.charAt(0).toUpperCase() + record.verificationStatus.slice(1)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Admin Remarks</p>
                        <p className="text-sm text-gray-700 mt-1">{record.verificationRemarks}</p>
                      </div>
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
              Showing {((pagination.currentPage - 1) * 20) + 1} to {Math.min(pagination.currentPage * 20, pagination.totalBusinesses)} of {pagination.totalBusinesses} results
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