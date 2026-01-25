'use client';

import AdminLayout from '@/components/admin/layout/AdminLayout';
import { Search, Filter, CheckCircle, XCircle, Eye, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { aadhaarVerificationAPI, AadhaarVerificationBusiness, PaginationInfo } from '@/api/aadhaarVerification';

export default function PendingAadhaarPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingVerifications, setPendingVerifications] = useState<AadhaarVerificationBusiness[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const fetchPendingVerifications = async (page = 1, search = '') => {
    try {
      setIsLoading(true);
      setError(null);
      
      //console.log('🔍 Fetching pending Aadhaar verifications:', { page, search });
      
      const response = await aadhaarVerificationAPI.getPendingVerifications({
        page,
        limit: 20,
        search: search.trim() || undefined,
      });

      //console.log('✅ API Response:', response);

      if (response.success) {
        setPendingVerifications(response.data.businesses);
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.message || 'Failed to fetch data');
      }
    } catch (err: any) {
      //console.error('❌ Error fetching pending verifications:', err);
      setError(err.message || 'Failed to load pending verifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingVerifications(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleVerifyAadhaar = async (businessId: string, status: 'approved' | 'rejected', remarks = '') => {
    try {
      setIsVerifying(businessId);
      //console.log(`🔐 ${status === 'approved' ? 'Approving' : 'Rejecting'} Aadhaar for business:`, businessId);
      
      await aadhaarVerificationAPI.verifyAadhaar(businessId, { status, remarks });
      
      //console.log('✅ Aadhaar verification updated successfully');
      
      // Refresh the list
      await fetchPendingVerifications(currentPage, searchQuery);
    } catch (err: any) {
      //console.error('❌ Error verifying Aadhaar:', err);
      setError(err.message || 'Failed to update verification');
    } finally {
      setIsVerifying(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const maskAadhaarNumber = (aadhaarNumber: string) => {
    if (!aadhaarNumber) return 'Not provided';
    // Mask middle digits, show only last 4
    const cleaned = aadhaarNumber.replace(/\s/g, '');
    if (cleaned.length >= 8) {
      return `${'*'.repeat(8)}${cleaned.slice(-4)}`;
    }
    return aadhaarNumber;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Aadhaar Verifications</h1>
          <p className="text-gray-600 mt-2">
            Review and verify business owner Aadhaar cards
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by business name, owner name, or Aadhaar number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            <Filter className="h-4 w-4" />
            Filter
          </button> */}
        </div>

        {/* Pending Verifications List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Pending Verifications ({pendingVerifications.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
                <span className="ml-3 text-gray-600">Loading pending verifications...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <span className="ml-3 text-red-600">{error}</span>
              </div>
            ) : pendingVerifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No pending verifications found</p>
              </div>
            ) : (
              pendingVerifications.map((verification) => (
              <div key={verification._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {verification.businessName}
                        </h3>
                        <p className="text-gray-600">Owner: {verification.userId?.fullName || 'N/A'}</p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                        Pending Review
                      </span>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Aadhaar Number</p>
                        <p className="font-medium text-gray-900">{maskAadhaarNumber(verification.aadhaarNumber)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">GST Number</p>
                        <p className="font-medium text-gray-900">{verification.gstNumber || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="font-medium text-gray-900">
                          {typeof verification.location === 'string'
                            ? verification.location
                            : verification.location?.city && verification.location?.state
                              ? `${verification.location.city}, ${verification.location.state}`
                              : verification.location?.city || verification.location?.state || 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Submitted</p>
                        <p className="font-medium text-gray-900">{formatDate(verification.createdAt)}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-2">Contact Information</p>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-gray-900"><span className="font-medium">Email:</span> {verification.contact?.email || 'N/A'}</p>
                        <p className="text-sm text-gray-900"><span className="font-medium">Phone:</span> {verification.contact?.phone || 'N/A'}</p>
                        <p className="text-sm text-gray-900"><span className="font-medium">Address:</span> {verification.contact?.address || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button 
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleVerifyAadhaar(verification._id, 'approved')}
                      disabled={isVerifying === verification._id}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Approve"
                    >
                      {isVerifying === verification._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </button>
                    <button 
                      onClick={() => handleVerifyAadhaar(verification._id, 'rejected')}
                      disabled={isVerifying === verification._id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Reject"
                    >
                      {isVerifying === verification._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
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