import axios from 'axios';
import { Order, OrdersResponse } from './orders';

// Types
export interface EscrowTransaction {
  _id: string;
  orderId: string;
  orderNumber: string;
  buyerId?: string;
  sellerId?: string;
  type: 'credit' | 'debit' | 'hold' | 'release' | 'refund';
  amount: number;
  description?: string;
  createdAt: string;
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

export interface OrderAnalytics {
  summary: {
    totalOrders: number;
    totalAmount: number;
    totalPlatformFee: number;
    avgOrderValue: number;
  };
  orderStatusBreakdown: Array<{ _id: string; count: number }>;
  paymentStatusBreakdown: Array<{ _id: string; count: number }>;
}

class AdminOrdersAPI {
  private getAuthHeaders() {
    if (typeof window !== 'undefined') {
      const adminAccessToken = localStorage.getItem('adminAccessToken');
      if (adminAccessToken) {
        return {
          Authorization: `Bearer ${adminAccessToken}`,
          'Content-Type': 'application/json',
        };
      }
    }
    return {
      'Content-Type': 'application/json',
    };
  }

  private getBaseUrl() {
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
  }

  // Get escrow dashboard
  async getEscrowDashboard(): Promise<EscrowDashboard> {
    const response = await axios.get(`${this.getBaseUrl()}/v1/admin/escrow/dashboard`, {
      headers: this.getAuthHeaders(),
      withCredentials: true,
    });
    return response.data.data;
  }

  // Get escrow transactions
  async getEscrowTransactions(
    type?: 'hold' | 'release' | 'refund',
    page: number = 1,
    limit: number = 50
  ): Promise<{ transactions: EscrowTransaction[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await axios.get(`${this.getBaseUrl()}/v1/admin/escrow/transactions?${params.toString()}`, {
      headers: this.getAuthHeaders(),
      withCredentials: true,
    });
    return response.data.data;
  }

  // Get all orders
  async getAllOrders(
    status?: string,
    paymentStatus?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<OrdersResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (paymentStatus) params.append('paymentStatus', paymentStatus);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await axios.get(`${this.getBaseUrl()}/v1/admin/escrow/orders?${params.toString()}`, {
      headers: this.getAuthHeaders(),
      withCredentials: true,
    });
    return response.data.data;
  }

  // Get disputed orders
  async getDisputedOrders(page: number = 1, limit: number = 20): Promise<OrdersResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await axios.get(`${this.getBaseUrl()}/v1/admin/escrow/disputes?${params.toString()}`, {
      headers: this.getAuthHeaders(),
      withCredentials: true,
    });
    return response.data.data;
  }

  // Resolve dispute
  async resolveDispute(
    orderId: string,
    resolution: string,
    action: 'refund_buyer' | 'release_seller' | 'partial_refund',
    refundPercentage: number = 100,
    forceResolve: boolean = false
  ): Promise<{ order: Order; warning?: string }> {
    const response = await axios.post(
      `${this.getBaseUrl()}/v1/admin/escrow/disputes/${orderId}/resolve`,
      { resolution, action, refundPercentage, forceResolve },
      {
        headers: this.getAuthHeaders(),
        withCredentials: true,
      }
    );
    return response.data.data;
  }

  // Manual release payment
  async manualReleasePayment(orderId: string, reason: string): Promise<{ order: Order }> {
    const response = await axios.post(
      `${this.getBaseUrl()}/v1/admin/escrow/orders/${orderId}/release`,
      { reason },
      {
        headers: this.getAuthHeaders(),
        withCredentials: true,
      }
    );
    return response.data.data;
  }

  // Manual refund payment
  async manualRefundPayment(orderId: string, reason: string, refundPercentage: number = 100): Promise<{ order: Order }> {
    const response = await axios.post(
      `${this.getBaseUrl()}/v1/admin/escrow/orders/${orderId}/refund`,
      { reason, refundPercentage },
      {
        headers: this.getAuthHeaders(),
        withCredentials: true,
      }
    );
    return response.data.data;
  }

  // Manual confirm pending payment (Demo/Sandbox)
  async manualConfirmPayment(orderId: string, reason: string): Promise<{ order: Order }> {
    const response = await axios.post(
      `${this.getBaseUrl()}/v1/admin/escrow/orders/${orderId}/confirm`,
      { reason },
      {
        headers: this.getAuthHeaders(),
        withCredentials: true,
      }
    );
    return response.data.data;
  }

  // Get order analytics
  async getOrderAnalytics(startDate?: string, endDate?: string): Promise<OrderAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await axios.get(`${this.getBaseUrl()}/v1/admin/escrow/analytics?${params.toString()}`, {
      headers: this.getAuthHeaders(),
      withCredentials: true,
    });
    return response.data.data;
  }
}

export const adminOrdersAPI = new AdminOrdersAPI();
