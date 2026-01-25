'use client';

import { useState, useEffect } from 'react';
import { User, Calendar, MessageSquare, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/admin/layout/AdminLayout';

interface FeedbackUser {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  profileImageUrl?: string;
}

interface Feedback {
  _id: string;
  userId: FeedbackUser;
  message: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface FeedbackResponse {
  statusCode: number;
  data: {
    feedback: Feedback[];
    pagination: PaginationInfo;
  };
  message: string;
  success: boolean;
}

export default function UserFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchFeedback = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('adminAccessToken');
      if (!token) {
        setError('Admin access token not found');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/feedback/admin/all?page=${page}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch feedback: ${response.statusText}`);
      }

      const data: FeedbackResponse = await response.json();
      
      if (data.success) {
        setFeedbacks(data.data.feedback);
        setPagination(data.data.pagination);
      } else {
        setError(data.message || 'Failed to fetch feedback');
      }
    } catch (err: any) {
      console.error('Error fetching feedback:', err);
      setError(err.message || 'An error occurred while fetching feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback(currentPage);
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd65c]"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-[#ffd65c]" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Feedback</h1>
                <p className="text-gray-600 mt-1">
                  View and manage feedback from users submitted through the Help Center
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchFeedback(currentPage)}
              className="flex items-center gap-2 px-4 py-2 bg-[#ffd65c] text-black rounded-lg hover:bg-[#e6c045] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          
          {pagination && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {feedbacks.length} of {pagination.totalItems} feedback messages
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Feedback List */}
        {feedbacks.length === 0 && !loading ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback yet</h3>
            <p className="text-gray-600">No user feedback has been submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div
                key={feedback._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  {/* User Info */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    {feedback.userId.profileImageUrl ? (
                      <img
                        src={feedback.userId.profileImageUrl}
                        alt={feedback.userId.fullName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-[#ffd65c] to-[#cc9b2e] rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {getUserInitials(feedback.userId.fullName)}
                        </span>
                      </div>
                    )}
                    
                    {/* User Details and Message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {feedback.userId.fullName}
                        </h3>
                        <span className="text-sm text-gray-500">
                          @{feedback.userId.username}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {feedback.userId.email}
                      </p>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900 whitespace-pre-wrap">
                          {feedback.message}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Date */}
                  <div className="flex items-center gap-1 text-sm text-gray-500 ml-4">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(feedback.submittedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      page === pagination.currentPage
                        ? 'bg-[#ffd65c] text-white text-shadow'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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