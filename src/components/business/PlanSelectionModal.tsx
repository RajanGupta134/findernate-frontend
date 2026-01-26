import React, { useState } from "react";
import {
  createSubscriptionOrder,
  verifySubscriptionPayment,
  SubscriptionPlan
} from '@/api/subscription';

type PlanSelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (plan: string) => void;
  currentPlan?: SubscriptionPlan;
  onUpgradeSuccess?: () => void;
};

// Helper to load Razorpay script
const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(script);
  });
};

// Map display names to API plan types
const planNameToApiPlan: Record<string, SubscriptionPlan> = {
  'Free': 'free',
  'Small Business': 'small_business',
  'Corporate': 'corporate'
};

// Map API plan types to display names
const apiPlanToDisplayName: Record<SubscriptionPlan, string> = {
  'free': 'Free',
  'small_business': 'Small Business',
  'corporate': 'Corporate'
};

const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
  currentPlan = 'free',
  onUpgradeSuccess,
}) => {
  const [processing, setProcessing] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  if (!isOpen) return null;

  // Get display name for current plan
  const currentPlanDisplay = apiPlanToDisplayName[currentPlan] || 'Free';

  const handleUpgrade = async (planDisplayName: string) => {
    const plan = planNameToApiPlan[planDisplayName];

    // If selecting free plan, just call onSelectPlan
    if (plan === 'free') {
      onSelectPlan?.(planDisplayName);
      return;
    }

    setProcessing(true);
    setProcessingPlan(planDisplayName);

    try {
      // 1. Create order via API
      const orderData = await createSubscriptionOrder(plan);

      // 2. Load Razorpay script if needed
      await loadRazorpayScript();

      // 3. Open Razorpay checkout modal
      const options: RazorpayOptions = {
        key: orderData.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'FinderNate',
        description: `${planDisplayName} Subscription`,
        order_id: orderData.razorpayOrderId,
        handler: async (response: RazorpayResponse) => {
          try {
            // 4. Verify payment
            await verifySubscriptionPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan
            });

            // 5. Success - notify parent and close
            onSelectPlan?.(planDisplayName);
            onUpgradeSuccess?.();
            onClose();
          } catch (error) {
            console.error('Payment verification failed:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#F59E0B'
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setProcessingPlan(null);
          }
        }
      };

      const razorpay = new window.Razorpay!(options);
      razorpay.open();
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to initiate payment. Please try again.');
      setProcessing(false);
      setProcessingPlan(null);
    }
  };

  const renderButton = (planName: string, isFree: boolean = false) => {
    const isCurrentPlan = currentPlanDisplay === planName;
    const isProcessingThis = processingPlan === planName;

    if (isCurrentPlan) {
      return (
        <button
          className="w-full bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-lg cursor-default text-sm sm:text-base"
          disabled
        >
          Current Plan
        </button>
      );
    }

    if (isFree) {
      return (
        <button
          className="w-full bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-300 text-sm sm:text-base"
          onClick={() => onSelectPlan?.('Free')}
        >
          Choose Free
        </button>
      );
    }

    return (
      <button
        className="w-full bg-yellow-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        disabled={processing}
        onClick={() => handleUpgrade(planName)}
      >
        {isProcessingThis ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Processing...</span>
          </>
        ) : (
          'Upgrade Now'
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <div className="p-4 sm:p-6 lg:p-8">
          <button
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-800 z-10"
            onClick={onClose}
            disabled={processing}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-xl sm:text-2xl font-bold text-center text-black mb-4 sm:mb-6 pr-8">Choose Your Plan</h2>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Free Plan */}
            <div className="border rounded-lg p-4 sm:p-6 text-center">
              <h3 className="text-lg sm:text-xl font-semibold text-black">Free</h3>
              <p className="text-xl sm:text-2xl font-bold my-2 text-black">₹0</p>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">/Forever</p>
              <ul className="text-xs sm:text-sm text-left space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 text-black">
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Basic business profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Up to 10 posts per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Community support</span>
                </li>
              </ul>
              {renderButton('Free', true)}
            </div>

            {/* Small Business Plan */}
            <div className="border-2 border-yellow-400 bg-yellow-50 rounded-lg p-4 sm:p-6 text-center relative">
              <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
              <h3 className="text-lg sm:text-xl font-semibold text-black">Small Business</h3>
              <p className="text-xl sm:text-2xl font-bold my-2 text-black">₹999</p>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">/per month</p>
              <ul className="text-xs sm:text-sm text-left space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 text-black">
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Enhanced business profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Unlimited posts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Product catalog (up to 50 items)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Basic advertising tools</span>
                </li>
              </ul>
              {renderButton('Small Business')}
            </div>

            {/* Corporate Plan */}
            <div className="border rounded-lg p-4 sm:p-6 text-center">
              <h3 className="text-lg sm:text-xl font-semibold text-black">Corporate</h3>
              <p className="text-xl sm:text-2xl font-bold my-2 text-black">₹2999</p>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">/per month</p>
              <ul className="text-xs sm:text-sm text-left space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 text-black">
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Premium business profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Unlimited everything</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Advanced analytics & insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Unlimited product catalog</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Advanced advertising & promotion</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>API access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>White-label options</span>
                </li>
              </ul>
              {renderButton('Corporate')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanSelectionModal;
