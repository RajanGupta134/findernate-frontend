'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/layout/AdminLayout';
import { activityAPI, Activity, ActivityLogData } from '@/api/activity';
import { User, Building2, FileText, Shield, AlertTriangle } from 'lucide-react';

export default function ActivityPage() {
  const [activityData, setActivityData] = useState<ActivityLogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchActivityLog = async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await activityAPI.getActivityLog({ page, limit: 20 });
      
      if (response.success) {
        setActivityData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch activity log');
      }
    } catch (err: any) {
      console.error('Error fetching activity log:', err);
      setError(err.message || 'Failed to load activity log');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLog(currentPage);
  }, [currentPage]);

  const getActivityIcon = (action: string, targetType: string) => {
    switch (action) {
      case 'user_status_changed':
        return <User className="h-4 w-4" />;
      case 'business_verification_approved':
      case 'business_verification_rejected':
        return <Building2 className="h-4 w-4" />;
      case 'aadhaar_verification_approved':
      case 'aadhaar_verification_rejected':
        return <Shield className="h-4 w-4" />;
      case 'report_created':
      case 'report_resolved':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'user_status_changed':
        return 'bg-blue-500';
      case 'business_verification_approved':
      case 'aadhaar_verification_approved':
        return 'bg-green-500';
      case 'business_verification_rejected':
      case 'aadhaar_verification_rejected':
        return 'bg-red-500';
      case 'report_created':
        return 'bg-yellow-500';
      case 'report_resolved':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatActivityTitle = (action: string) => {
    switch (action) {
      case 'user_status_changed':
        return 'User Status Changed';
      case 'business_verification_approved':
        return 'Business Verification Approved';
      case 'business_verification_rejected':
        return 'Business Verification Rejected';
      case 'aadhaar_verification_approved':
        return 'Aadhaar Verification Approved';
      case 'aadhaar_verification_rejected':
        return 'Aadhaar Verification Rejected';
      case 'report_created':
        return 'Report Created';
      case 'report_resolved':
        return 'Report Resolved';
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const loadMoreActivities = () => {
    if (activityData?.pagination.hasNext) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
            <p className="text-gray-600 mt-2">
              Admin actions and system events
            </p>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          
          {isLoading && currentPage === 1 ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl animate-pulse">
                  <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={() => fetchActivityLog(currentPage)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                Retry
              </button>
            </div>
          ) : !activityData?.activities.length ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No activity logs found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activityData.activities.map((activity: Activity) => (
                <div key={activity._id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                  <div className={`w-2 h-2 ${getActivityColor(activity.action)} rounded-full mt-2`}></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="text-gray-600">
                          {getActivityIcon(activity.action, activity.targetType)}
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatActivityTitle(activity.action)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Target: {activity.targetType}</span>
                      <span>ID: {activity.targetId.slice(-8)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activityData?.pagination.hasNext && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button 
                onClick={loadMoreActivities}
                disabled={isLoading}
                className="w-full text-sm text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50"
              >
                {isLoading && currentPage > 1 ? 'Loading more...' : 'Load more activity'}
              </button>
            </div>
          )}

          {activityData && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {activityData.activities.length} of {activityData.pagination.totalActivities} activities
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}