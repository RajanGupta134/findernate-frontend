import axios from 'axios';

export interface Report {
  _id: string;
  reporterId: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
  };
  reportedUserId?: {
    _id: string;
    username: string;
    fullName: string;
    accountStatus: string;
  };
  reportedPostId?: {
    _id: string;
    caption: string;
    media: string[];
    contentType: string;
  };
  reportedCommentId?: {
    _id: string;
    content: string;
    userId: string;
  };
  reportedStoryId?: {
    _id: string;
    media: string[];
    userId: string;
  };
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  description: string;
  createdAt: string;
}

export interface ReportsStats {
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
}

export interface ReportsPagination {
  currentPage: number;
  totalPages: number;
  totalReports: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ReportsResponse {
  statusCode: number;
  data: {
    reports: Report[];
    stats: ReportsStats;
    pagination: ReportsPagination;
  };
  message: string;
  success: boolean;
}

class ReportsAPI {
  private getAuthHeaders() {
    if (typeof window !== 'undefined') {
      const adminAccessToken = localStorage.getItem('adminAccessToken');
      if (adminAccessToken) {
        return {
          'Authorization': `Bearer ${adminAccessToken}`,
          'Content-Type': 'application/json',
        };
      }
    }
    return {
      'Content-Type': 'application/json',
    };
  }

  async getReports(params: {
    page?: number;
    limit?: number;
    status?: string;
    reason?: string;
    type?: string;
    search?: string;
  }): Promise<ReportsResponse> {
    try {
      const queryParams: any = {
        page: params.page || 1,
        limit: params.limit || 20,
      };

      // Add optional params only if they are not 'all'
      if (params.status && params.status !== 'all') {
        queryParams.status = params.status;
      }
      if (params.reason && params.reason !== 'all') {
        queryParams.reason = params.reason;
      }
      if (params.type && params.type !== 'all') {
        queryParams.type = params.type;
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/reports`,
        {
          params: queryParams,
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch reports';
      throw new Error(message);
    }
  }

  async updateReportStatus(reportId: string, data: {
    status: 'reviewed' | 'resolved' | 'dismissed';
    action?: 'delete_content' | 'ban_user' | 'suspend_user';
    remarks?: string;
  }): Promise<any> {
    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/reports/${reportId}/status`,
        data,
        {
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to update report status';
      throw new Error(message);
    }
  }

  async deleteReport(reportId: string): Promise<any> {
    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/reports/${reportId}`,
        {
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to delete report';
      throw new Error(message);
    }
  }
}

export const reportsAPI = new ReportsAPI();