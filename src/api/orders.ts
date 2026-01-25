import axiosInstance from './base';

// Types
export interface OrderProduct {
  name: string;
  description?: string;
  price: number;
  images?: string[];
  category?: string;
}

export interface ShippingInfo {
  trackingId?: string;
  carrier?: string;
  shippedAt?: string;
  deliveredAt?: string;
  packingVideoUrl?: string;
  packingImages?: string[];
}

export interface ShippingAddress {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface Dispute {
  reason: string;
  description?: string;
  evidence?: string[];
  status: 'open' | 'resolved';
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface BuyerProof {
  openingVideoUrl?: string;
  paymentScreenshot?: string;
  uploadedAt?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  buyerId: {
    _id: string;
    fullName: string;
    username: string;
    profileImageUrl?: string;
    phoneNumber?: string;
  };
  sellerId: {
    _id: string;
    fullName: string;
    username: string;
    profileImageUrl?: string;
    phoneNumber?: string;
  };
  postId?: {
    _id: string;
    media?: Array<{ url: string; thumbnailUrl?: string }>;
    caption?: string;
  };
  productDetails: OrderProduct;
  amount: number;
  platformFee: number;
  sellerAmount: number;
  shippingAddress: ShippingAddress;
  shippingInfo?: ShippingInfo;
  orderStatus: 'payment_pending' | 'payment_received' | 'processing' | 'shipped' | 'delivered' | 'confirmed' | 'disputed' | 'refunded' | 'cancelled';
  paymentStatus: 'pending' | 'held' | 'released' | 'refunded' | 'failed';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  dispute?: Dispute;
  buyerProof?: BuyerProof;
  buyerRating?: number;
  buyerReview?: string;
  sellerRating?: number;
  sellerReview?: string;
  deliveryConfirmedAt?: string;
  paymentReleasedAt?: string;
  isShareableOrder?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

export interface OrderStats {
  totalOrders: number;
  totalSpent?: number;
  totalEarned?: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
}

export interface EnhancedOrdersResponse extends OrdersResponse {
  stats: OrderStats;
}

export interface CategoryStats {
  _id: string;
  totalSpent: number;
  orderCount: number;
}

export interface ProductStats {
  _id: string;
  totalRevenue: number;
  orderCount: number;
  averagePrice: number;
}

export interface MonthlyTrend {
  _id: {
    year: number;
    month: number;
  };
  totalSpent?: number;
  totalRevenue?: number;
  totalEarned?: number;
  orderCount: number;
}

export interface StatusBreakdown {
  _id: string;
  count: number;
}

export interface BuyerStatistics {
  overall: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    completedOrders: number;
    pendingOrders: number;
    disputedOrders: number;
    cancelledOrders: number;
  };
  categoryStats: CategoryStats[];
  monthlyTrend: MonthlyTrend[];
  statusBreakdown: StatusBreakdown[];
}

export interface SellerStatistics {
  overall: {
    totalOrders: number;
    totalRevenue: number;
    totalEarned: number;
    platformFees: number;
    averageOrderValue: number;
    completedOrders: number;
    pendingOrders: number;
    disputedOrders: number;
    cancelledOrders: number;
  };
  productStats: ProductStats[];
  monthlyTrend: MonthlyTrend[];
  statusBreakdown: StatusBreakdown[];
  ratings: {
    averageRating: number;
    totalRatings: number;
  };
}

export interface OrderHistoryFilters {
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ==========================================
// BUYER APIs
// ==========================================

export const getBuyerOrders = async (
  status?: string,
  page: number = 1,
  limit: number = 20
): Promise<OrdersResponse> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await axiosInstance.get(`/orders/buyer?${params.toString()}`);
  return response.data.data;
};

// Enhanced buyer order history with advanced filtering
export const getBuyerOrderHistory = async (
  filters: OrderHistoryFilters = {}
): Promise<EnhancedOrdersResponse> => {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', filters.status);
  if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.minAmount) params.append('minAmount', filters.minAmount.toString());
  if (filters.maxAmount) params.append('maxAmount', filters.maxAmount.toString());
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  params.append('page', (filters.page || 1).toString());
  params.append('limit', (filters.limit || 20).toString());

  const response = await axiosInstance.get(`/orders/buyer/history?${params.toString()}`);
  return response.data.data;
};

// Get buyer order statistics
export const getBuyerOrderStatistics = async (
  year?: number,
  month?: number
): Promise<BuyerStatistics> => {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());

  const response = await axiosInstance.get(`/orders/buyer/statistics?${params.toString()}`);
  return response.data.data;
};

export const getOrderDetails = async (orderId: string): Promise<{ order: Order }> => {
  const response = await axiosInstance.get(`/orders/${orderId}`);
  return response.data.data;
};

export const confirmDelivery = async (
  orderId: string,
  rating?: number,
  review?: string,
  openingVideoUrl?: string
): Promise<{ order: Order }> => {
  const response = await axiosInstance.post(`/orders/${orderId}/confirm`, {
    rating,
    review,
    openingVideoUrl,
  });
  return response.data.data;
};

export const reportIssue = async (
  orderId: string,
  reason: string,
  description?: string,
  evidence?: string[]
): Promise<{ order: Order }> => {
  const response = await axiosInstance.post(`/orders/${orderId}/report`, {
    reason,
    description,
    evidence,
  });
  return response.data.data;
};

export const uploadOpeningVideo = async (
  orderId: string,
  openingVideoUrl: string
): Promise<{ order: Order }> => {
  const response = await axiosInstance.post(`/orders/${orderId}/opening-video`, {
    openingVideoUrl,
  });
  return response.data.data;
};

export const uploadPaymentProof = async (
  orderId: string,
  paymentScreenshot: string
): Promise<{ order: Order }> => {
  const response = await axiosInstance.post(`/orders/${orderId}/payment-proof`, {
    paymentScreenshot,
  });
  return response.data.data;
};

// ==========================================
// SELLER APIs
// ==========================================

export const getSellerOrders = async (
  status?: string,
  page: number = 1,
  limit: number = 20
): Promise<OrdersResponse> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await axiosInstance.get(`/orders/seller?${params.toString()}`);
  return response.data.data;
};

// Enhanced seller order history with advanced filtering
export const getSellerOrderHistory = async (
  filters: OrderHistoryFilters = {}
): Promise<EnhancedOrdersResponse> => {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', filters.status);
  if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.minAmount) params.append('minAmount', filters.minAmount.toString());
  if (filters.maxAmount) params.append('maxAmount', filters.maxAmount.toString());
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  params.append('page', (filters.page || 1).toString());
  params.append('limit', (filters.limit || 20).toString());

  const response = await axiosInstance.get(`/orders/seller/history?${params.toString()}`);
  return response.data.data;
};

// Get seller order statistics
export const getSellerOrderStatistics = async (
  year?: number,
  month?: number
): Promise<SellerStatistics> => {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());

  const response = await axiosInstance.get(`/orders/seller/statistics?${params.toString()}`);
  return response.data.data;
};

export const markOrderShipped = async (
  orderId: string,
  trackingId?: string,
  carrier?: string,
  packingVideoUrl?: string,
  packingImages?: string[]
): Promise<{ order: Order }> => {
  const response = await axiosInstance.post(`/orders/${orderId}/ship`, {
    trackingId,
    carrier,
    packingVideoUrl,
    packingImages,
  });
  return response.data.data;
};

export const markOrderDelivered = async (orderId: string): Promise<{ order: Order }> => {
  const response = await axiosInstance.post(`/orders/${orderId}/deliver`);
  return response.data.data;
};

export const uploadPackingMedia = async (
  orderId: string,
  packingVideoUrl?: string,
  packingImages?: string[]
): Promise<{ order: Order }> => {
  const response = await axiosInstance.post(`/orders/${orderId}/packing-media`, {
    packingVideoUrl,
    packingImages,
  });
  return response.data.data;
};

export const rateBuyer = async (
  orderId: string,
  rating: number,
  review?: string
): Promise<{ order: Order }> => {
  const response = await axiosInstance.post(`/orders/${orderId}/rate-buyer`, {
    rating,
    review,
  });
  return response.data.data;
};

// ==========================================
// EXPORT ORDERS
// ==========================================

export const exportOrdersToCSV = async (
  type: 'buyer' | 'seller' = 'buyer',
  status?: string,
  startDate?: string,
  endDate?: string
): Promise<Blob> => {
  const params = new URLSearchParams();
  params.append('type', type);
  if (status) params.append('status', status);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await axiosInstance.get(`/orders/export?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
};

// ==========================================
// ORDER STATUS HELPERS
// ==========================================

export const getOrderStatusLabel = (status: Order['orderStatus']): string => {
  const labels: Record<Order['orderStatus'], string> = {
    payment_pending: 'Payment Pending',
    payment_received: 'Payment Received',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    confirmed: 'Confirmed',
    disputed: 'Disputed',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
};

export const getOrderStatusColor = (status: Order['orderStatus']): string => {
  const colors: Record<Order['orderStatus'], string> = {
    payment_pending: 'bg-yellow-100 text-yellow-800',
    payment_received: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-cyan-100 text-cyan-800',
    confirmed: 'bg-green-100 text-green-800',
    disputed: 'bg-red-100 text-red-800',
    refunded: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getPaymentStatusLabel = (status: Order['paymentStatus']): string => {
  const labels: Record<Order['paymentStatus'], string> = {
    pending: 'Pending',
    held: 'Held in Escrow',
    released: 'Released',
    refunded: 'Refunded',
    failed: 'Failed',
  };
  return labels[status] || status;
};

export const getPaymentStatusColor = (status: Order['paymentStatus']): string => {
  const colors: Record<Order['paymentStatus'], string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    held: 'bg-orange-100 text-orange-800',
    released: 'bg-green-100 text-green-800',
    refunded: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Check if buyer can confirm delivery
export const canConfirmDelivery = (order: Order): boolean => {
  return order.orderStatus === 'delivered' || order.orderStatus === 'shipped';
};

// Check if buyer can report issue
export const canReportIssue = (order: Order): boolean => {
  return ['payment_received', 'shipped', 'delivered'].includes(order.orderStatus);
};

// Check if seller can ship
export const canShipOrder = (order: Order): boolean => {
  return order.orderStatus === 'payment_received' || order.orderStatus === 'processing';
};

// Check if seller can mark delivered
export const canMarkDelivered = (order: Order): boolean => {
  return order.orderStatus === 'shipped';
};
