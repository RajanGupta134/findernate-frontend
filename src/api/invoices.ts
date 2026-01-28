import axiosInstance from './base';

export interface InvoiceItem {
  name: string;
  description?: string;
  category?: string;
  images?: string[];
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceParty {
  id: string;
  fullName: string;
  username?: string;
  profileImageUrl?: string;
  phoneNumber?: string;
  email?: string;
}

export interface Invoice {
  invoiceNumber: string;
  orderReferenceId: string;
  orderId: string;
  issueDate: string;
  dueDate: string;
  seller: InvoiceParty;
  buyer: InvoiceParty;
  shippingAddress: {
    fullName: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  shipping: number;
  platformFee: number;
  total: number;
  sellerAmount: number;
  currency: string;
  paymentStatus: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  paymentReleasedAt?: string;
  orderStatus: string;
  deliveryConfirmedAt?: string;
  shippingInfo?: {
    trackingId?: string;
    carrier?: string;
    shippedAt?: string;
    deliveredAt?: string;
  };
  buyerRating?: number;
  buyerReview?: string;
  sellerRating?: number;
  sellerReview?: string;
  isShareableOrder?: boolean;
}

export interface InvoiceSummary {
  invoiceNumber: string;
  orderReferenceId: string;
  orderId: string;
  issueDate: string;
  productName: string;
  productImage?: string;
  amount: number;
  currency: string;
  orderStatus: string;
  paymentStatus: string;
  counterParty: {
    fullName: string;
    username?: string;
    profileImageUrl?: string;
  };
}

export interface InvoicesResponse {
  invoices: InvoiceSummary[];
  total: number;
  page: number;
  totalPages: number;
}

// Get invoice for a specific order
export const getInvoice = async (orderId: string): Promise<{ invoice: Invoice }> => {
  const response = await axiosInstance.get(`/invoices/${orderId}`);
  return response.data.data;
};

// Get invoice by order reference number
export const getInvoiceByOrderNumber = async (orderNumber: string): Promise<{ invoice: Invoice }> => {
  const response = await axiosInstance.get(`/invoices/ref/${orderNumber}`);
  return response.data.data;
};

// Get all invoices for the authenticated user
export const getUserInvoices = async (
  type: 'buyer' | 'seller' = 'buyer',
  page: number = 1,
  limit: number = 20
): Promise<InvoicesResponse> => {
  const params = new URLSearchParams();
  params.append('type', type);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await axiosInstance.get(`/invoices?${params.toString()}`);
  return response.data.data;
};
