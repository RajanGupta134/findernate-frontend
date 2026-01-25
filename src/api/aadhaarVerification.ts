import axios from 'axios';

export interface AadhaarVerificationBusiness {
  _id: string;
  businessName: string;
  aadhaarNumber: string;
  gstNumber?: string;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  location: string | { city?: string; state?: string };
  createdAt: string;
  userId: {
    _id: string;
    username: string;
    fullName: string;
    email: string;
    phoneNumber: string;
  };
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalBusinesses: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PendingAadhaarResponse {
  statusCode: number;
  data: {
    businesses: AadhaarVerificationBusiness[];
    pagination: PaginationInfo;
  };
  message: string;
  success: boolean;
}

export interface VerifyAadhaarRequest {
  status: 'approved' | 'rejected';
  remarks: string;
}

export interface VerifyAadhaarResponse {
  statusCode: number;
  data: any;
  message: string;
  success: boolean;
}

export interface AadhaarHistoryBusiness {
  _id: string;
  businessName: string;
  aadhaarNumber: string | null;
  verificationStatus: 'approved' | 'rejected';
  verificationRemarks: string;
  verifiedAt: string;
  userId: {
    _id: string;
    username: string;
    email: string;
    fullName: string;
  };
  verifiedBy: {
    _id: string;
    username: string;
    fullName: string;
  };
}

export interface AadhaarHistoryResponse {
  statusCode: number;
  data: {
    businesses: AadhaarHistoryBusiness[];
    pagination: PaginationInfo;
  };
  message: string;
  success: boolean;
}

class AadhaarVerificationAPI {
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

  async getPendingVerifications(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PendingAadhaarResponse> {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/aadhaar-verification/pending`,
        {
          params: {
            page: params.page || 1,
            limit: params.limit || 20,
            ...(params.search && { search: params.search }),
          },
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch pending verifications';
      throw new Error(message);
    }
  }

  async verifyAadhaar(businessId: string, data: VerifyAadhaarRequest): Promise<VerifyAadhaarResponse> {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/aadhaar-verification/verify/${businessId}`,
        data,
        {
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to verify Aadhaar';
      throw new Error(message);
    }
  }

  async getVerificationHistory(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'approved' | 'rejected' | 'all';
  }): Promise<AadhaarHistoryResponse> {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/aadhaar-verification/history`,
        {
          params: {
            page: params.page || 1,
            limit: params.limit || 20,
            ...(params.search && { search: params.search }),
            ...(params.status && params.status !== 'all' && { status: params.status }),
          },
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch verification history';
      throw new Error(message);
    }
  }
}

export const aadhaarVerificationAPI = new AadhaarVerificationAPI();