import axios from './base';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminPermissions {
  verifyAadhaar: boolean;
  manageReports: boolean;
  manageUsers: boolean;
  manageBusiness: boolean;
  systemSettings: boolean;
  viewAnalytics: boolean;
  deleteContent: boolean;
  banUsers: boolean;
}

export interface ActivityLogEntry {
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  _id: string;
  timestamp: string;
}

export interface AdminUser {
  permissions: AdminPermissions;
  _id: string;
  uid: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdBy: string | null;
  activityLog: ActivityLogEntry[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  lastLogin: string;
}

export interface AdminLoginResponse {
  statusCode: number;
  data: {
    admin: AdminUser;
    accessToken: string;
    refreshToken: string;
  };
  message: string;
  success: boolean;
}

export interface AdminLogoutResponse {
  statusCode: number;
  data: {};
  message: string;
  success: boolean;
}

class AdminAPI {
  async login(credentials: AdminLoginRequest): Promise<AdminLoginResponse> {
    try {
      const response = await axios.post('/admin/login', credentials, {
        withCredentials: true, // Important for cookies
      });
      return response.data;
    } catch (error: any) {
      // Extract error message from axios error response
      const message = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(message);
    }
  }

  async logout(): Promise<AdminLogoutResponse> {
    try {
      const response = await axios.post('/admin/logout', {}, {
        withCredentials: true, // Important for cookies
      });
      return response.data;
    } catch (error: any) {
      // Extract error message from axios error response
      const message = error.response?.data?.message || error.message || 'Logout failed';
      throw new Error(message);
    }
  }

  // Helper method to check if user is authenticated (has valid token)
  isAuthenticated(): boolean {
    // Only check on client-side
    if (typeof window === 'undefined') return false;

    // Check if we have admin tokens in localStorage or cookies
    return !!(localStorage.getItem('adminAccessToken') || document.cookie.includes('adminAccessToken'));
  }

  // Helper method to get stored admin data
  getStoredAdmin(): AdminUser | null {
    try {
      const adminData = localStorage.getItem('adminUser');
      return adminData ? JSON.parse(adminData) : null;
    } catch {
      return null;
    }
  }

  // Helper method to clear stored admin data
  clearStoredAdmin(): void {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
  }
}

export const adminAPI = new AdminAPI();