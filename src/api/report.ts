import apiClient from './base';

export interface ReportRequest {
  type: 'post' | 'story' | 'comment' | 'user';
  contentId: string;
  reason: 'spam' | 'harassment' | 'nudity' | 'violence' | 'hateSpeech' | 'scam' | 'other';
  description?: string;
}

export interface Report {
  _id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedPostId?: string;
  reportedCommentId?: string;
  reportedStoryId?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

export interface ReportResponse {
  success: boolean;
  data: Report;
  message: string;
}

export interface ReportsListResponse {
  success: boolean;
  data: {
    reports: Report[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalReports: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message: string;
}

// Report content (posts, comments, users, stories)
export const reportContent = async (reportData: ReportRequest): Promise<Report> => {
  const response = await apiClient.post<ReportResponse>('/posts/report', reportData);
  return response.data.data;
};

// Keep backward compatibility with old function names
export const reportPost = async (postId: string, reason: ReportRequest['reason'], description?: string): Promise<Report> => {
  return reportContent({
    type: 'post',
    contentId: postId,
    reason,
    description
  });
};

export const reportUser = async (userId: string, reason: ReportRequest['reason'], description?: string): Promise<Report> => {
  return reportContent({
    type: 'user',
    contentId: userId,
    reason,
    description
  });
};

export const reportComment = async (commentId: string, reason: ReportRequest['reason'], description?: string): Promise<Report> => {
  return reportContent({
    type: 'comment',
    contentId: commentId,
    reason,
    description
  });
};

export const reportStory = async (storyId: string, reason: ReportRequest['reason'], description?: string): Promise<Report> => {
  return reportContent({
    type: 'story',
    contentId: storyId,
    reason,
    description
  });
};

// Get reports (for admin/moderation)
export const getReports = async (params?: {
  reportId?: string;
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  page?: number;
  limit?: number;
}): Promise<ReportsListResponse['data']> => {
  const response = await apiClient.get<ReportsListResponse>('/posts/reports', { params });
  return response.data.data;
};

// Update report status (for admin/moderation)
export const updateReportStatus = async (reportId: string, status: Report['status']): Promise<Report> => {
  const response = await apiClient.put<ReportResponse>(`/posts/report/${reportId}/status`, { status });
  return response.data.data;
};

export const reportReasons = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'nudity', label: 'Nudity or Sexual Content' },
  { value: 'violence', label: 'Violence or Harmful Content' },
  { value: 'hateSpeech', label: 'Hate Speech' },
  { value: 'scam', label: 'Scam or Fraud' },
  { value: 'other', label: 'Other' }
] as const;