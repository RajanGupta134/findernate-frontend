import axios from 'axios';

export interface DashboardOverview {
  totalUsers: number;
  totalBusinesses: number;
  totalReports: number;
  activeUsers: number;
  verifiedBusinesses: number;
}

export interface DashboardPending {
  reports: number;
  aadhaarVerifications: number;
  businessVerifications: number;
}

export interface DashboardRecent {
  newUsers: number;
  newBusinesses: number;
  newReports: number;
}

export interface EscrowWallet {
  totalBalance: number;
  heldBalance: number;
  releasedBalance: number;
  refundedBalance: number;
  platformEarnings: number;
  lastUpdated: string;
}

export interface EscrowOrderStats {
  pendingRelease: number;
  disputed: number;
  completed: number;
}

export interface EscrowDashboard {
  wallet: EscrowWallet;
  orderStats: EscrowOrderStats;
}

export interface EscrowDashboardResponse {
  statusCode: number;
  data: EscrowDashboard;
  message: string;
  success: boolean;
}

export interface DashboardStats {
  overview: DashboardOverview;
  pending: DashboardPending;
  recent: DashboardRecent;
}

export interface DashboardResponse {
  statusCode: number;
  data: DashboardStats;
  message: string;
  success: boolean;
}

class DashboardAPI {
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

  async getDashboardStats(): Promise<DashboardResponse> {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/dashboard/stats`,
        {
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch dashboard stats';
      throw new Error(message);
    }
  }

  async getEscrowDashboard(): Promise<EscrowDashboardResponse> {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/escrow/dashboard`,
        {
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch escrow dashboard';
      throw new Error(message);
    }
  }
}

export const dashboardAPI = new DashboardAPI();