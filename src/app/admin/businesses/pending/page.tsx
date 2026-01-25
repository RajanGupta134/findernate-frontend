'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/layout/AdminLayout';
import { Search, CheckCircle, XCircle, Eye, FileText, Shield, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { businessesAPI, Business, BusinessesData, BusinessDetailsResponse } from '@/api/businesses';

export default function PendingBusinessVerificationsPage() {
  const [businessesData, setBusinessesData] = useState<BusinessesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showRemarksModal, setShowRemarksModal] = useState<{ businessId: string; action: 'approve' | 'reject' } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [approveGst, setApproveGst] = useState(true);
  const [approveAadhaar, setApproveAadhaar] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState<BusinessDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  const fetchPendingBusinesses = async (page: number = 1, search?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params: any = { page, limit: 20 };
      
      if (search && search.length >= 3) {
        params.search = search;
      }

      const response = await businessesAPI.getPendingBusinessVerifications(params);
      
      if (response.success) {
        setBusinessesData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch pending businesses');
      }
    } catch (err: any) {
      console.error('Error fetching pending businesses:', err);
      setError(err.message || 'Failed to load pending businesses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBusinesses(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== searchQuery) {
        setSearchQuery(searchTerm);
        setCurrentPage(1);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleApproveReject = (businessId: string, action: 'approve' | 'reject') => {
    setShowRemarksModal({ businessId, action });
    setRemarks('');
    setApproveGst(true);
    setApproveAadhaar(true);
  };

  const confirmApproveReject = async () => {
    if (!showRemarksModal) return;
    
    const { businessId, action } = showRemarksModal;
    
    try {
      setIsUpdating(businessId);
      
      if (action === 'approve') {
        await businessesAPI.approveBusinessVerification(businessId, remarks || undefined, approveGst, approveAadhaar);
      } else {
        await businessesAPI.rejectBusinessVerification(businessId, remarks || undefined);
      }
      
      // Refresh the list
      await fetchPendingBusinesses(currentPage, searchQuery);
      setShowRemarksModal(null);
      setRemarks('');
    } catch (err: any) {
      console.error(`Error ${action}ing business:`, err);
      setError(err.message || `Failed to ${action} business`);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleViewDetails = async (businessId: string) => {
    try {
      setLoadingDetails(businessId);
      const response = await businessesAPI.getBusinessDetails(businessId);
      setShowDetailsModal(response);
    } catch (err: any) {
      console.error('Error fetching business details:', err);
      setError(err.message || 'Failed to fetch business details');
    } finally {
      setLoadingDetails(null);
    }
  };

  const businesses = businessesData?.businesses || [];
  const pagination = businessesData?.pagination;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Safe getter functions to prevent object rendering errors
  const safeGetContactInfo = (contact: any) => {
    try {
      if (!contact || typeof contact !== 'object') return { email: null, phone: null };

      // Extra safety: ensure we're not dealing with nested objects
      const safeString = (val: any) => {
        if (!val) return null;
        if (typeof val === 'string' && val.trim() !== '') return String(val);
        if (typeof val === 'object') return null; // Don't render objects
        return String(val);
      };

      return {
        email: safeString(contact.email),
        phone: safeString(contact.phone)
      };
    } catch (error) {
      console.error('Error getting contact info:', error);
      return { email: null, phone: null };
    }
  };

  const safeGetLocationInfo = (location: any) => {
    try {
      if (!location || typeof location !== 'object') return { city: null, state: null, address: null, country: null, postalCode: null };

      // Extra safety: ensure we're not dealing with nested objects
      const safeString = (val: any) => {
        if (!val) return null;
        if (typeof val === 'string' && val.trim() !== '') return String(val);
        if (typeof val === 'object') return null; // Don't render objects
        return String(val);
      };

      return {
        city: safeString(location.city),
        state: safeString(location.state),
        address: safeString(location.address),
        country: safeString(location.country),
        postalCode: safeString(location.postalCode)
      };
    } catch (error) {
      console.error('Error getting location info:', error);
      return { city: null, state: null, address: null, country: null, postalCode: null };
    }
  };

  const getPlanBadge = (plan: string) => {
    const planColors = {
      plan1: 'bg-blue-100 text-blue-800',
      plan2: 'bg-purple-100 text-purple-800',
      plan3: 'bg-indigo-100 text-indigo-800',
      basic: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-indigo-100 text-indigo-800'
    };
    
    const planNames = {
      plan1: 'Basic',
      plan2: 'Premium', 
      plan3: 'Enterprise',
      basic: 'Basic',
      premium: 'Premium',
      enterprise: 'Enterprise'
    };
    
    const normalizedPlan = plan.toLowerCase();
    const colorClass = planColors[normalizedPlan as keyof typeof planColors] || 'bg-gray-100 text-gray-800';
    const displayName = planNames[normalizedPlan as keyof typeof planNames] || plan;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colorClass}`}>
        {displayName}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Business Verifications</h1>
          <p className="text-gray-600 mt-2">
            Review and verify business accounts and documentation
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by business name, owner, category..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Pending Businesses List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Pending Verifications ({pagination?.totalBusinesses || 0})
            </h2>
          </div>
          
          {isLoading ? (
            <div className="divide-y divide-gray-200">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-6 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={() => fetchPendingBusinesses(currentPage, searchQuery)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                Retry
              </button>
            </div>
          ) : !businesses.length ? (
            <div className="p-6 text-center">
              <p className="text-gray-600">No pending business verifications found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {businesses.map((business: Business) => {
                // Safely extract data to prevent object rendering
                const contactInfo = safeGetContactInfo(business?.contact);
                const locationInfo = safeGetLocationInfo(business?.location);
                const businessName = String(business?.businessName || 'N/A');
                const ownerName = String(business?.userId?.fullName || 'N/A');
                const category = business?.category ? String(business.category) : null;
                const description = business?.description ? String(business.description) : null;
                const businessType = business?.businessType ? String(business.businessType) : null;
                const plan = String(business?.plan || 'basic');

                return (
                <div key={business._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {businessName}
                          </h3>
                          <p className="text-gray-600">Owner: {ownerName}</p>
                          {category && <p className="text-sm text-gray-500">{category}</p>}
                        </div>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                            Pending Review
                          </span>
                          {getPlanBadge(plan)}
                        </div>
                      </div>

                      {description && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-700">{description}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {businessType && (
                          <div>
                            <p className="text-sm text-gray-500">Business Type</p>
                            <p className="font-medium text-gray-700">{businessType}</p>
                          </div>
                        )}
                        {(locationInfo.city || locationInfo.state) && (
                          <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="font-medium text-gray-700">
                              {[locationInfo.city, locationInfo.state].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-500">Submitted</p>
                          <p className="font-medium text-gray-700">{formatDate(business.createdAt)}</p>
                        </div>
                        {(contactInfo.email || contactInfo.phone) && (
                          <div>
                            <p className="text-sm text-gray-500">Contact</p>
                            {contactInfo.email && <p className="text-sm text-gray-700">{contactInfo.email}</p>}
                            {contactInfo.phone && <p className="text-sm text-gray-700">{contactInfo.phone}</p>}
                          </div>
                        )}
                      </div>

                      {/* Document Status */}
                      <div className="flex gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Shield className={`h-4 w-4 ${business.aadhaarVerified ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className={`text-sm ${business.aadhaarVerified ? 'text-green-600' : 'text-gray-500'}`}>
                            Aadhaar {business.aadhaarVerified ? 'Verified' : 'Not Verified'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className={`h-4 w-4 ${business.gstVerified ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className={`text-sm ${business.gstVerified ? 'text-green-600' : 'text-gray-500'}`}>
                            GST {business.gstVerified ? 'Verified' : 'Not Verified'}
                          </span>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                        {contactInfo.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{contactInfo.phone}</span>
                          </div>
                        )}
                        {business.userId?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{business.userId.email}</span>
                          </div>
                        )}
                        {locationInfo.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{locationInfo.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button 
                        onClick={() => handleViewDetails(business._id)}
                        disabled={loadingDetails === business._id}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50" 
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleApproveReject(business._id, 'approve')}
                        disabled={isUpdating === business._id}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50" 
                        title="Approve"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleApproveReject(business._id, 'reject')}
                        disabled={isUpdating === business._id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" 
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
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

        {/* Remarks Modal */}
        {showRemarksModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {showRemarksModal.action === 'approve' ? 'Approve Business' : 'Reject Business'}
              </h3>
              
              {/* GST and Aadhaar approval options for approve action */}
              {showRemarksModal.action === 'approve' && (
                <div className="mb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="approveGst"
                      checked={approveGst}
                      onChange={(e) => setApproveGst(e.target.checked)}
                      className="h-4 w-4 text-yellow-500 focus:ring-yellow-400 border-gray-300 rounded"
                    />
                    <label htmlFor="approveGst" className="text-sm font-medium text-gray-700">
                      Approve GST Verification
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="approveAadhaar"
                      checked={approveAadhaar}
                      onChange={(e) => setApproveAadhaar(e.target.checked)}
                      className="h-4 w-4 text-yellow-500 focus:ring-yellow-400 border-gray-300 rounded"
                    />
                    <label htmlFor="approveAadhaar" className="text-sm font-medium text-gray-700">
                      Approve Aadhaar Verification
                    </label>
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any remarks or notes..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-gray-500"
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRemarksModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={isUpdating !== null}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApproveReject}
                  disabled={isUpdating !== null}
                  className={`flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 ${
                    showRemarksModal.action === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isUpdating !== null ? 'Processing...' : 
                   showRemarksModal.action === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Business Details Modal */}
        {showDetailsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Business Details</h2>
                <button
                  onClick={() => setShowDetailsModal(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="p-6">
                  {showDetailsModal.data && (
                    <div className="space-y-6">
                      {/* Business Header */}
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {showDetailsModal.data.business.businessName}
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Business Type:</span>
                              <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.businessType}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Category:</span>
                              <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.category}</span>
                            </div>
                            {showDetailsModal.data.business.subcategory && (
                              <div>
                                <span className="text-gray-500">Subcategory:</span>
                                <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.subcategory}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500">Plan:</span>
                              <span className="ml-2">{getPlanBadge(showDetailsModal.data.business.plan)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Business Description */}
                      {showDetailsModal.data.business.description && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-2">Description</h4>
                          <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                            {showDetailsModal.data.business.description}
                          </p>
                        </div>
                      )}

                      {/* Owner Information */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Owner Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Full Name:</span>
                            <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.userId?.fullName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Username:</span>
                            <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.userId?.username || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Email:</span>
                            <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.userId?.email || 'N/A'}</span>
                          </div>
                          {showDetailsModal.data.business.userId?.phoneNumber && (
                            <div>
                              <span className="text-gray-500">Phone:</span>
                              <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.userId?.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Contact Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {showDetailsModal.data.business.contact?.phone && (
                            <div>
                              <span className="text-gray-500">Business Phone:</span>
                              <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.contact?.phone}</span>
                            </div>
                          )}
                          {showDetailsModal.data.business.contact?.email && (
                            <div>
                              <span className="text-gray-500">Business Email:</span>
                              <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.contact?.email}</span>
                            </div>
                          )}
                          {showDetailsModal.data.business.contact?.website && (
                            <div>
                              <span className="text-gray-500">Website:</span>
                              <span className="ml-2 font-medium text-blue-600">
                                <a href={showDetailsModal.data.business.contact?.website} target="_blank" rel="noopener noreferrer">
                                  {showDetailsModal.data.business.contact?.website}
                                </a>
                              </span>
                            </div>
                          )}
                          {showDetailsModal.data.business.website && (
                            <div>
                              <span className="text-gray-500">Business Website:</span>
                              <span className="ml-2 font-medium text-blue-600">
                                <a href={showDetailsModal.data.business.website} target="_blank" rel="noopener noreferrer">
                                  {showDetailsModal.data.business.website}
                                </a>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location Information */}
                      {(showDetailsModal.data.business.location?.address || showDetailsModal.data.business.location?.city || showDetailsModal.data.business.location?.state) && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-3">Location Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {showDetailsModal.data.business.location?.address && (
                              <div>
                                <span className="text-gray-500">Address:</span>
                                <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.location.address}</span>
                              </div>
                            )}
                            {showDetailsModal.data.business.location?.city && (
                              <div>
                                <span className="text-gray-500">City:</span>
                                <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.location.city}</span>
                              </div>
                            )}
                            {showDetailsModal.data.business.location?.state && (
                              <div>
                                <span className="text-gray-500">State:</span>
                                <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.location.state}</span>
                              </div>
                            )}
                            {showDetailsModal.data.business.location?.country && (
                              <div>
                                <span className="text-gray-500">Country:</span>
                                <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.location.country}</span>
                              </div>
                            )}
                            {showDetailsModal.data.business.location?.postalCode && (
                              <div>
                                <span className="text-gray-500">Postal Code:</span>
                                <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.location.postalCode}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Verification Status */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Verification Status</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <Shield className={`h-4 w-4 ${showDetailsModal.data.business.aadhaarVerified ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className={`text-sm ${showDetailsModal.data.business.aadhaarVerified ? 'text-green-600' : 'text-gray-500'}`}>
                              Aadhaar {showDetailsModal.data.business.aadhaarVerified ? 'Verified' : 'Not Verified'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className={`h-4 w-4 ${showDetailsModal.data.business.gstVerified ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className={`text-sm ${showDetailsModal.data.business.gstVerified ? 'text-green-600' : 'text-gray-500'}`}>
                              GST {showDetailsModal.data.business.gstVerified ? 'Verified' : 'Not Verified'}
                            </span>
                          </div>
                          {showDetailsModal.data.business.verificationStatus && (
                            <div>
                              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                                showDetailsModal.data.business.verificationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                showDetailsModal.data.business.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {showDetailsModal.data.business.verificationStatus.charAt(0).toUpperCase() + showDetailsModal.data.business.verificationStatus.slice(1)}
                              </span>
                            </div>
                          )}
                          {showDetailsModal.data.business.subscriptionStatus && (
                            <div>
                              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                                showDetailsModal.data.business.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' :
                                showDetailsModal.data.business.subscriptionStatus === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {showDetailsModal.data.business.subscriptionStatus.charAt(0).toUpperCase() + showDetailsModal.data.business.subscriptionStatus.slice(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Verification History */}
                      {showDetailsModal.data.business.verifiedAt && showDetailsModal.data.business.verifiedBy && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-3">Verification History</h4>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Verified At:</span>
                                <span className="ml-2 font-medium text-black">{formatDate(showDetailsModal.data.business.verifiedAt)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Verified By:</span>
                                <span className="ml-2 font-medium text-black">{showDetailsModal.data.business.verifiedBy.fullName} (@{showDetailsModal.data.business.verifiedBy.username})</span>
                              </div>
                            </div>
                            {showDetailsModal.data.business.verificationRemarks && (
                              <div className="mt-3">
                                <span className="text-gray-500">Remarks:</span>
                                <p className="mt-1 text-gray-700 bg-white p-3 rounded border">
                                  {showDetailsModal.data.business.verificationRemarks}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {showDetailsModal.data.business.tags && showDetailsModal.data.business.tags.length > 0 && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-3">Tags</h4>
                          <div className="flex flex-wrap gap-2">
                            {showDetailsModal.data.business.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Business Insights */}
                      {showDetailsModal.data.business.insights && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-3">Business Insights</h4>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">{showDetailsModal.data.business.insights?.views || 0}</div>
                              <div className="text-sm text-gray-500">Views</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">{showDetailsModal.data.business.insights?.clicks || 0}</div>
                              <div className="text-sm text-gray-500">Clicks</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">{showDetailsModal.data.business.insights?.conversions || 0}</div>
                              <div className="text-sm text-gray-500">Conversions</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Timeline</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Created At:</span>
                            <span className="ml-2 font-medium text-black">{formatDate(showDetailsModal.data.business.createdAt)}</span>
                          </div>
                          {showDetailsModal.data.business.updatedAt && (
                            <div>
                              <span className="text-gray-500">Last Updated:</span>
                              <span className="ml-2 font-medium text-black">{formatDate(showDetailsModal.data.business.updatedAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}