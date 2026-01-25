import axiosInstance from './base';

// Types
export interface PaymentLinkDetails {
  postId: string;
  amount: number;
  productDetails: {
    name: string;
    description?: string;
    price: number;
    images?: string[];
    category?: string;
  };
  post: {
    _id: string;
    postType: string;
    contentType: string;
    caption?: string;
    media?: Array<{
      type: string;
      url: string;
      thumbnailUrl?: string;
    }>;
  };
  seller: {
    _id: string;
    fullName: string;
    username: string;
    profileImageUrl?: string;
    isBusinessProfile: boolean;
    isBlueTickVerified: boolean;
  };
  paymentLinkId?: string;
}

export interface CreateOrderResponse {
  razorpayOrderId: string;
  razorpayKeyId: string;
  amount: number;
  currency: string;
  orderId: string;
  orderNumber: string;
  seller: {
    name: string;
    username: string;
  };
}

export interface BuyerDetails {
  fullName: string;
  email: string;
  phoneNumber: string;
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

export interface VerifyPaymentResponse {
  order: {
    _id: string;
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
    amount?: number;
    productDetails?: {
      name: string;
    };
    seller?: {
      name: string;
      username: string;
    };
  };
}

export interface CreateShareableLinkResponse {
  paymentLink: {
    linkId: string;
    paymentUrl: string;
    shortUrl: string;
    postId: string;
    amount: number;
    productDetails: {
      name: string;
      description?: string;
      price: number;
      images?: string[];
    };
    expiresAt: string;
    seller: {
      id: string;
      name: string;
      username: string;
      avatar?: string;
      isBusinessProfile: boolean;
      isBlueTickVerified: boolean;
    };
  };
}

// API Functions

/**
 * Get shareable payment link details (PUBLIC - no auth required)
 * Used when someone accesses /post/:postId/pay/:amount
 */
export const getShareablePaymentDetails = async (
  postId: string,
  amount: number
): Promise<PaymentLinkDetails> => {
  const response = await axiosInstance.get(`/payments/post/${postId}/pay/${amount}`);
  return response.data.data;
};

/**
 * Create Razorpay order for shareable payment link
 * Can be used by guests (no auth) or logged-in users
 */
export const createShareableOrder = async (
  postId: string,
  amount: number,
  shippingAddress: ShippingAddress,
  buyerDetails?: BuyerDetails
): Promise<CreateOrderResponse> => {
  const response = await axiosInstance.post('/payments/post/create-order', {
    postId,
    amount,
    shippingAddress,
    buyerDetails,
  });
  return response.data.data;
};

/**
 * Verify payment after Razorpay checkout
 * Requires authentication
 */
export const verifyPayment = async (
  orderId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<VerifyPaymentResponse> => {
  const response = await axiosInstance.post('/payments/verify', {
    orderId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });
  return response.data.data;
};

/**
 * Create shareable payment link (Business accounts only)
 * Requires authentication
 */
export const createShareablePaymentLink = async (
  postId: string,
  amount: number
): Promise<CreateShareableLinkResponse> => {
  const response = await axiosInstance.post('/payments/create-shareable-link', {
    postId,
    amount,
  });
  return response.data.data;
};

/**
 * Get payment link details by linkId
 */
export const getPaymentLinkDetails = async (linkId: string) => {
  const response = await axiosInstance.get(`/payments/link/${linkId}`);
  return response.data.data;
};

/**
 * Create Razorpay order for chat payment link
 * Requires authentication
 */
export const createRazorpayOrder = async (
  linkId: string,
  shippingAddress: ShippingAddress
): Promise<CreateOrderResponse> => {
  const response = await axiosInstance.post('/payments/create-order', {
    linkId,
    shippingAddress,
  });
  return response.data.data;
};

// Razorpay Types
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      close: () => void;
    };
  }
}

/**
 * Load Razorpay script dynamically
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Open Razorpay checkout
 */
export const openRazorpayCheckout = (options: RazorpayOptions): void => {
  if (typeof window !== 'undefined' && window.Razorpay) {
    const rzp = new window.Razorpay(options);
    rzp.open();
  } else {
    console.error('Razorpay SDK not loaded');
  }
};
