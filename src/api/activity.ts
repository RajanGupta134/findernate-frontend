import axios from 'axios';

export interface Activity {
  _id: string;
  action: string;
  targetType: 'user' | 'business';
  targetId: string;
  details: string;
  timestamp: string;
}

export interface ActivityPagination {
  currentPage: number;
  totalActivities: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ActivityLogData {
  activities: Activity[];
  pagination: ActivityPagination;
}

export interface ActivityLogResponse {
  statusCode: number;
  data: ActivityLogData;
  message: string;
  success: boolean;
}

export interface ActivityLogParams {
  page?: number;
  limit?: number;
}

class ActivityAPI {
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

  async getActivityLog(params: ActivityLogParams = {}): Promise<ActivityLogResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) {
        queryParams.append('page', params.page.toString());
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }

      const queryString = queryParams.toString();
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/activity-log${queryString ? `?${queryString}` : ''}`;

      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
        withCredentials: true,
      });
      
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch activity log';
      throw new Error(message);
    }
  }
}

export const activityAPI = new ActivityAPI();