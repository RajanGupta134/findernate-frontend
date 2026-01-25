import axios from "./base";

// Subscription types
export type SubscriptionPlan = 'free' | 'small_business' | 'corporate';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface Subscription {
  _id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  paymentId?: string;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionBadge {
  type: 'corporate' | 'small_business';
  label: 'Corporate' | 'Small Business';
  color: string;
  isPaid: boolean;
}

export interface SubscriptionStatusResponse {
  subscription: Subscription | null;
  tier: SubscriptionPlan;
  features: {
    calling: {
      hasAccess: boolean;
      audioCall: boolean;
      videoCall: boolean;
    };
  };
}

export interface UpgradePrompt {
  title: string;
  message: string;
  plans: {
    name: string;
    price: number;
    features: string[];
  }[];
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: SubscriptionPlan;
}

// Get current user's subscription status
export const getSubscriptionStatus = async (): Promise<SubscriptionStatusResponse> => {
  const response = await axios.get('/subscription/status');
  return response.data.data;
};

// Get upgrade prompt information for free users
export const getUpgradePrompt = async (): Promise<UpgradePrompt> => {
  const response = await axios.get('/subscription/upgrade-prompt');
  return response.data.data;
};

// Check if user has access to a specific feature
export const checkFeatureAccess = async (feature: string): Promise<boolean> => {
  const response = await axios.get(`/subscription/feature/${feature}/access`);
  return response.data.data.hasAccess;
};

// Create subscription order (Razorpay)
export const createSubscriptionOrder = async (plan: SubscriptionPlan): Promise<CreateOrderResponse> => {
  const response = await axios.post('/subscription/create-order', { plan });
  return response.data.data;
};

// Verify payment and activate subscription
export const verifySubscriptionPayment = async (paymentData: VerifyPaymentRequest): Promise<Subscription> => {
  const response = await axios.post('/subscription/verify-payment', paymentData);
  return response.data.data;
};

// Cancel subscription
export const cancelSubscription = async (): Promise<void> => {
  await axios.post('/subscription/cancel');
};

// Get subscription history
export const getSubscriptionHistory = async (): Promise<Subscription[]> => {
  const response = await axios.get('/subscription/history');
  return response.data.data;
};
