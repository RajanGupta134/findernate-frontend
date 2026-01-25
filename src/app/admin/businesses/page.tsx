'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/layout/AdminLayout';
import { Search, Building2, CheckCircle, XCircle, Eye, Star, Calendar, Globe, MapPin, Mail, Phone } from 'lucide-react';
import { businessesAPI, Business, BusinessesData } from '@/api/businesses';
import { safeString, formatLocation, safeArrayLength } from '@/utils/safeRender';

export default function AllBusinessesPage() {
  const [businessesData, setBusinessesData] = useState<BusinessesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isVerifiedFilter, setIsVerifiedFilter] = useState('all');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchBusinesses = async (
    page: number = 1, 
    search?: string, 
    isVerified?: string, 
    subscriptionStatus?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params: any = { page, limit: 20 };
      
      if (search && search.length >= 3) {
        params.search = search;
      }
      
      if (isVerified !== 'all') {
        params.isVerified = isVerified === 'true';
      }
      
      if (subscriptionStatus !== 'all') {
        params.subscriptionStatus = subscriptionStatus;
      }

      const response = await businessesAPI.getBusinesses(params);
      
      if (response.success) {
        setBusinessesData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch businesses');
      }
    } catch (err: any) {
      console.error('Error fetching businesses:', err);
      setError(err.message || 'Failed to load businesses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses(currentPage, searchQuery, isVerifiedFilter, subscriptionStatusFilter);
  }, [currentPage, searchQuery, isVerifiedFilter, subscriptionStatusFilter]);

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

  const handleVerificationFilter = (value: string) => {
    setIsVerifiedFilter(value);
    setCurrentPage(1);
  };

  const handleSubscriptionFilter = (value: string) => {
    setSubscriptionStatusFilter(value);
    setCurrentPage(1);
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

  const getVerificationBadge = (isVerified?: boolean) => {
    return isVerified ? (
      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Verified
      </span>
    ) : (
      <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Unverified
      </span>
    );
  };

  const getSubscriptionBadge = (status?: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800'
    };

    const displayStatus = status || 'inactive';

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[displayStatus as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
      </span>
    );
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
          <h1 className="text-3xl font-bold text-gray-900">All Businesses</h1>
          <p className="text-gray-600 mt-2">
            View and manage all business accounts on the platform
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by business name or category..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black"
            value={isVerifiedFilter}
            onChange={(e) => handleVerificationFilter(e.target.value)}
          >
            <option value="all">All Verification</option>
            <option value="true">Verified Only</option>
            <option value="false">Unverified Only</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black"
            value={subscriptionStatusFilter}
            onChange={(e) => handleSubscriptionFilter(e.target.value)}
          >
            <option value="all">All Subscriptions</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Businesses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{pagination?.totalBusinesses || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {businesses.filter(b => b.isVerified).length}
                </p>
                <p className="text-sm text-gray-500">
                  {businesses.length > 0 
                    ? `${((businesses.filter(b => b.isVerified).length / businesses.length) * 100).toFixed(1)}% verified`
                    : '0% verified'
                  }
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {businesses.filter(b => b.subscriptionStatus === 'active').length}
                </p>
                <p className="text-sm text-gray-500">
                  {businesses.length > 0 
                    ? `${((businesses.filter(b => b.subscriptionStatus === 'active').length / businesses.length) * 100).toFixed(1)}% active`
                    : '0% active'
                  }
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Page</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{businesses.length}</p>
                <p className="text-sm text-gray-500">businesses shown</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-100">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Businesses List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              All Businesses ({pagination?.totalBusinesses || 0})
            </h2>
          </div>
          
          {isLoading ? (
            <div className="divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, i) => (
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
                onClick={() => fetchBusinesses(currentPage, searchQuery, isVerifiedFilter, subscriptionStatusFilter)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                Retry
              </button>
            </div>
          ) : !businesses.length ? (
            <div className="p-6 text-center">
              <p className="text-gray-600">No businesses found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {businesses.map((business: Business) => (
                <div key={business._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {business.businessName}
                          </h3>
                          <p className="text-gray-600">Owner: {business.userId?.fullName || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{business.category || 'N/A'}</p>
                        </div>
                        <div className="flex gap-2">
                          {getVerificationBadge(business.isVerified)}
                          {getSubscriptionBadge(business.subscriptionStatus)}
                          {getPlanBadge(business.plan)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-gray-500">
                        <div>
                          <p className="text-sm text-gray-500">Business Type</p>
                          <p className="font-medium">{business.businessType || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Location</p>
                          <p className="font-medium">
                            {formatLocation(business.location)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Views</p>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4 text-blue-400" />
                            <p className="font-medium">{business.insights?.views || 0}</p>
                          </div>
                        </div>
                        {business.contact?.email && (
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium text-sm">{safeString(business.contact.email)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-500">Joined</p>
                          <p className="font-medium">{formatDate(business.createdAt)}</p>
                        </div>
                      </div>
                      
                      {/* Additional Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                        {business.contact?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{safeString(business.contact.phone)}</span>
                          </div>
                        )}
                        {business.contact?.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 truncate">{safeString(business.contact.website)}</span>
                          </div>
                        )}
                        {business.location?.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{safeString(business.location.address)}</span>
                          </div>
                        )}
                        {business.userId?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{safeString(business.userId.email)}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {safeArrayLength(business.tags) > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-2">Tags:</p>
                          <div className="flex flex-wrap gap-2">
                            {business.tags?.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {safeString(tag)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
      </div>
    </AdminLayout>
  );
}