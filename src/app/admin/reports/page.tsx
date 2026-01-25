'use client';

import AdminLayout from '@/components/admin/layout/AdminLayout';
import { Search, Filter, Eye, CheckCircle, XCircle, Trash2, Flag, AlertTriangle, Clock, Calendar, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { reportsAPI, Report, ReportsStats, ReportsPagination } from '@/api/reports';

export default function ReportManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportsStats>({ pending: 0, reviewed: 0, resolved: 0, dismissed: 0 });
  const [pagination, setPagination] = useState<ReportsPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState<{ reportId: string; action: 'resolve' | 'dismiss' } | null>(null);
  const [actionData, setActionData] = useState<{
    action: 'delete_content' | 'ban_user' | 'suspend_user' | '';
    remarks: string;
  }>({ action: '', remarks: '' });

  const fetchReports = async (page = 1, search = '', status = 'all', reason = 'all', type = 'all') => {
    try {
      setIsLoading(true);
      setError(null);
      
      //console.log('🔍 Fetching reports:', { page, search, status, reason, type });
      
      const response = await reportsAPI.getReports({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        reason: reason !== 'all' ? reason : undefined,
        type: type !== 'all' ? type : undefined,
      });

      //console.log('✅ API Response:', response);

      if (response.success) {
        setReports(response.data.reports);
        setStats(response.data.stats);
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.message || 'Failed to fetch data');
      }
    } catch (err: any) {
      //console.error('❌ Error fetching reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(currentPage, searchQuery, statusFilter, reasonFilter, typeFilter);
  }, [currentPage, searchQuery, statusFilter, reasonFilter, typeFilter]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleReasonFilter = (reason: string) => {
    setReasonFilter(reason);
    setCurrentPage(1);
  };

  const handleTypeFilter = (type: string) => {
    setTypeFilter(type);
    setCurrentPage(1);
  };

  const handleOpenActionModal = (reportId: string, action: 'resolve' | 'dismiss') => {
    setShowActionModal({ reportId, action });
    setActionData({ action: '', remarks: '' });
  };

  const handleCloseActionModal = () => {
    setShowActionModal(null);
    setActionData({ action: '', remarks: '' });
  };

  const handleSubmitAction = async () => {
    if (!showActionModal) return;

    const status = showActionModal.action === 'resolve' ? 'resolved' : 'dismissed';
    
    try {
      setIsUpdating(showActionModal.reportId);
      //console.log(`🔄 Updating report ${showActionModal.reportId} to ${status}`);
      
      const updateData: any = { status };
      
      // Only add action and remarks if action is selected (for resolved reports)
      if (status === 'resolved' && actionData.action) {
        updateData.action = actionData.action;
        updateData.remarks = actionData.remarks.trim() || `Report ${status} with ${actionData.action}`;
      } else if (status === 'dismissed') {
        updateData.remarks = actionData.remarks.trim() || 'Report dismissed by admin';
      }
      
      await reportsAPI.updateReportStatus(showActionModal.reportId, updateData);
      
      //console.log('✅ Report updated successfully');
      
      // Close modal and refresh list
      handleCloseActionModal();
      await fetchReports(currentPage, searchQuery, statusFilter, reasonFilter, typeFilter);
    } catch (err: any) {
      //console.error('❌ Error updating report:', err);
      setError(err.message || 'Failed to update report');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      setIsUpdating(reportId);
      //console.log(`🗑️ Deleting report ${reportId}`);
      
      await reportsAPI.deleteReport(reportId);
      
      //console.log('✅ Report deleted successfully');
      
      // Refresh the reports list
      await fetchReports(currentPage, searchQuery, statusFilter, reasonFilter, typeFilter);
    } catch (err: any) {
      //console.error('❌ Error deleting report:', err);
      setError(err.message || 'Failed to delete report');
    } finally {
      setIsUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      reviewed: { color: 'bg-blue-100 text-blue-800', icon: Eye, text: 'Reviewed' },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Resolved' },
      dismissed: { color: 'bg-gray-100 text-gray-800', icon: XCircle, text: 'Dismissed' }
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

  const getReasonBadge = (reason: string) => {
    const reasonConfig = {
      spam: { color: 'bg-orange-100 text-orange-800', text: 'Spam' },
      harassment: { color: 'bg-red-100 text-red-800', text: 'Harassment' },
      nudity: { color: 'bg-pink-100 text-pink-800', text: 'Nudity' },
      violence: { color: 'bg-purple-100 text-purple-800', text: 'Violence' },
      hateSpeech: { color: 'bg-red-100 text-red-800', text: 'Hate Speech' },
      scam: { color: 'bg-yellow-100 text-yellow-800', text: 'Scam' },
      other: { color: 'bg-gray-100 text-gray-800', text: 'Other' }
    };

    const config = reasonConfig[reason as keyof typeof reasonConfig];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getContentType = (report: Report) => {
    if (report.reportedPostId) return 'Post';
    if (report.reportedCommentId) return 'Comment';
    if (report.reportedStoryId) return 'Story';
    if (report.reportedUserId) return 'User';
    return 'Unknown';
  };

  const getReportedContent = (report: Report) => {
    if (report.reportedPostId) return report.reportedPostId.caption;
    if (report.reportedCommentId) return report.reportedCommentId.content;
    if (report.reportedStoryId) return 'Story content';
    if (report.reportedUserId) return `User: ${report.reportedUserId.fullName}`;
    return 'Unknown content';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report Management</h1>
          <p className="text-gray-600 mt-2">
            Review and take action on user reports and content violations
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search reports by reporter, content, or reason..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black"
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black"
            value={reasonFilter}
            onChange={(e) => handleReasonFilter(e.target.value)}
          >
            <option value="all">All Reasons</option>
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="nudity">Nudity</option>
            <option value="violence">Violence</option>
            <option value="hateSpeech">Hate Speech</option>
            <option value="scam">Scam</option>
            <option value="other">Other</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black"
            value={typeFilter}
            onChange={(e) => handleTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="post">Posts</option>
            <option value="user">Users</option>
            <option value="comment">Comments</option>
            <option value="story">Stories</option>
          </select>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{pagination?.totalReports || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <Flag className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                <p className="text-sm text-gray-500">Needs attention</p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.resolved}</p>
                <p className="text-sm text-gray-500">{pagination?.totalReports ? ((stats.resolved / pagination.totalReports) * 100).toFixed(1) : '0.0'}% resolution rate</p>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dismissed</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.dismissed}</p>
                <p className="text-sm text-gray-500">Reviewed: {stats.reviewed}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              All Reports ({reports.length})
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
                <span className="ml-3 text-gray-600">Loading reports...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No reports found</p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {getContentType(report)} Report
                          </h3>
                          {getStatusBadge(report.status)}
                          {getReasonBadge(report.reason)}
                        </div>
                        <p className="text-gray-600">
                          Reported by: <span className="font-medium text-black">{report.reporterId.fullName}</span> (@{report.reporterId.username})
                        </p>
                        {report.reportedUserId && (
                          <p className="text-gray-600">
                            Target: <span className="font-medium text-black">{report.reportedUserId.fullName}</span> (@{report.reportedUserId.username})
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-1">Report Description</p>
                      <p className="text-gray-700">{report.description}</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-1">Reported Content</p>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700 truncate">
                          {getReportedContent(report)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Reported: {formatDate(report.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Flag className="h-4 w-4" />
                        <span>Type: {getContentType(report)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                      <Eye className="h-4 w-4" />
                    </button>
                    {report.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleOpenActionModal(report._id, 'resolve')}
                          disabled={isUpdating === report._id}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50" 
                          title="Resolve"
                        >
                          {isUpdating === report._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleOpenActionModal(report._id, 'dismiss')}
                          disabled={isUpdating === report._id}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50" 
                          title="Dismiss"
                        >
                          {isUpdating === report._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleDeleteReport(report._id)}
                      disabled={isUpdating === report._id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" 
                      title="Delete"
                    >
                      {isUpdating === report._id ? (
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
              Showing {((pagination.currentPage - 1) * 20) + 1} to {Math.min(pagination.currentPage * 20, pagination.totalReports)} of {pagination.totalReports} results
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

        {/* Action Modal */}
        {showActionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {showActionModal.action === 'resolve' ? 'Resolve Report' : 'Dismiss Report'}
              </h3>
              
              {showActionModal.action === 'resolve' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action to Take
                  </label>
                  <select
                    value={actionData.action}
                    onChange={(e) => setActionData(prev => ({ ...prev, action: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black"
                  >
                    <option value="">No specific action</option>
                    <option value="delete_content">Delete Content</option>
                    <option value="ban_user">Ban User</option>
                    <option value="suspend_user">Suspend User</option>
                  </select>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={actionData.remarks}
                  onChange={(e) => setActionData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder={showActionModal.action === 'resolve' 
                    ? "Explain why this report was resolved..." 
                    : "Explain why this report was dismissed..."
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCloseActionModal}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAction}
                  disabled={isUpdating !== null}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {showActionModal.action === 'resolve' ? 'Resolving...' : 'Dismissing...'}
                    </div>
                  ) : (
                    showActionModal.action === 'resolve' ? 'Resolve' : 'Dismiss'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}