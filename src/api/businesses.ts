import axios from 'axios';

export interface BusinessContact {
  phone?: string;
  email?: string;
  website?: string;
  socialMedia?: {
    platform: string;
    url: string;
  }[];
}

export interface BusinessLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: {
    type: string;
    coordinates: number[];
  };
  isLiveLocationEnabled?: boolean;
}

export interface BusinessInsights {
  views: number;
  clicks: number;
  conversions: number;
}

export interface BusinessUser {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
}

export interface VerifiedBy {
  _id: string;
  username: string;
  fullName: string;
}

export interface Business {
  _id: string;
  userId?: BusinessUser;
  businessName: string;
  businessType?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  contact?: BusinessContact;
  location?: BusinessLocation;
  tags?: string[];
  website?: string;
  gstNumber?: string | null;
  aadhaarNumber?: string | null;
  isVerified?: boolean;
  followers?: string[];
  plan: string;
  subscriptionStatus?: 'active' | 'inactive' | 'suspended';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  gstVerified?: boolean;
  aadhaarVerified?: boolean;
  insights?: BusinessInsights;
  createdAt: string;
  updatedAt?: string;
  verificationRemarks?: string;
  verifiedAt?: string;
  verifiedBy?: VerifiedBy;
}

export interface BusinessDetailsData {
  business: Business;
  verificationHistory: {
    verifiedAt: string;
    verifiedBy: VerifiedBy;
  };
}

export interface BusinessDetailsResponse {
  statusCode: number;
  data: BusinessDetailsData;
  message: string;
  success: boolean;
}

export interface BusinessPagination {
  currentPage: number;
  totalPages: number;
  totalBusinesses: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface BusinessesData {
  businesses: Business[];
  pagination: BusinessPagination;
}

export interface BusinessesResponse {
  statusCode: number;
  data: BusinessesData;
  message: string;
  success: boolean;
}

export interface BusinessesParams {
  page?: number;
  limit?: number;
  search?: string;
  isVerified?: boolean;
  subscriptionStatus?: 'active' | 'inactive' | 'suspended' | 'all';
}

class BusinessesAPI {
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

  async getBusinesses(params: BusinessesParams = {}): Promise<BusinessesResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) {
        queryParams.append('page', params.page.toString());
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.search && params.search.trim().length >= 3) {
        queryParams.append('search', params.search.trim());
      }
      if (params.isVerified !== undefined) {
        queryParams.append('isVerified', params.isVerified.toString());
      }
      if (params.subscriptionStatus && params.subscriptionStatus !== 'all') {
        queryParams.append('subscriptionStatus', params.subscriptionStatus);
      }

      const queryString = queryParams.toString();
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/businesses${queryString ? `?${queryString}` : ''}`;

      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
        withCredentials: true,
      });
      
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch businesses';
      throw new Error(message);
    }
  }

  async updateBusinessStatus(businessId: string, isVerified: boolean, remarks?: string): Promise<any> {
    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/businesses/${businessId}/verification`,
        { 
          isVerified,
          ...(remarks && { remarks })
        },
        {
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to update business status';
      throw new Error(message);
    }
  }

  async getPendingBusinessVerifications(params: BusinessesParams = {}): Promise<BusinessesResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) {
        queryParams.append('page', params.page.toString());
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.search && params.search.trim().length >= 3) {
        queryParams.append('search', params.search.trim());
      }

      const queryString = queryParams.toString();
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/businesses/pending-verification${queryString ? `?${queryString}` : ''}`;

      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
        withCredentials: true,
      });
      
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch pending business verifications';
      throw new Error(message);
    }
  }

  async approveBusinessVerification(businessId: string, remarks?: string, approveGst: boolean = true, approveAadhaar: boolean = true): Promise<any> {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/businesses/${businessId}/verify`,
        { 
          status: "approved",
          ...(remarks && { remarks }),
          approveGst,
          approveAadhaar
        },
        {
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to approve business verification';
      throw new Error(message);
    }
  }

  async rejectBusinessVerification(businessId: string, remarks?: string): Promise<any> {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/businesses/${businessId}/verify`,
        { 
          status: "rejected",
          ...(remarks && { remarks })
        },
        {
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to reject business verification';
      throw new Error(message);
    }
  }

  async getBusinessDetails(businessId: string): Promise<BusinessDetailsResponse> {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/businesses/${businessId}/details`,
        {
          headers: this.getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch business details';
      throw new Error(message);
    }
  }
}

export const businessesAPI = new BusinessesAPI();