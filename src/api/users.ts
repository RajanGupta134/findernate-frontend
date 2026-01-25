import axios from 'axios';

export interface User {
  _id: string;
  uid: string;
  username: string;
  email: string;
  fullName: string;
  fullNameLower: string;
  phoneNumber: string;
  isPhoneNumberHidden: boolean;
  isAddressHidden: boolean;
  followers: string[];
  following: string[];
  posts: string[];
  isBusinessProfile: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  accountStatus: 'active' | 'banned' | 'deactivated';
  createdAt: string;
  updatedAt: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
}

export interface UsersPagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UsersResponse {
  statusCode: number;
  data: {
    users: User[];
    pagination: UsersPagination;
  };
  message: string;
  success: boolean;
}

class UsersAPI {
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

  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    accountStatus?: string;
  }): Promise<UsersResponse> {
    try {
      const queryParams: any = {
        page: params.page || 1,
        limit: params.limit || 20,
      };

      // Only add search param if it's 3+ characters
      if (params.search && params.search.trim().length >= 3) {
        queryParams.search = params.search.trim();
      }

      // Add accountStatus if not 'all'
      if (params.accountStatus && params.accountStatus !== 'all') {
        queryParams.accountStatus = params.accountStatus;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/users`,
        {
          params: queryParams,
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch users';
      throw new Error(message);
    }
  }

  async updateUserStatus(userId: string, accountStatus: 'active' | 'banned' | 'deactivated', reason?: string): Promise<any> {
    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/users/${userId}/status`,
        { 
          accountStatus,
          ...(reason && { reason })
        },
        {
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to update user status';
      throw new Error(message);
    }
  }

  async deleteUser(userId: string): Promise<any> {
    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/users/${userId}`,
        {
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to delete user';
      throw new Error(message);
    }
  }
}

export const usersAPI = new UsersAPI();