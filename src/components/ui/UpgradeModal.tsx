"use client";

import React, { useEffect, useState } from 'react';
import { X, Crown, Phone, Video, CheckCircle } from 'lucide-react';
import {
  createSubscriptionOrder,
  verifySubscriptionPayment,
  SubscriptionPlan
} from '@/api/subscription';



interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  onUpgradeSuccess?: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  feature = 'calling',
  onUpgradeSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('small_business');

  const plans = [
    {
      id: 'small_business' as SubscriptionPlan,
      name: 'Small Business',
      price: 999,
      currency: '₹',
      period: 'month',
      features: [
        'Unlimited Audio Calls',
        'Unlimited Video Calls',
        'Priority Customer Support',
        'Business Profile Badge',
        'Advanced Analytics'
      ],
      recommended: true
    },
    {
      id: 'corporate' as SubscriptionPlan,
      name: 'Corporate',
      price: 2999,
      currency: '₹',
      period: 'month',
      features: [
        'Everything in Small Business',
        'Priority Post Visibility',
        'Corporate Badge',
        'Dedicated Account Manager',
        'API Access',
        'Custom Integrations'
      ],
      recommended: false
    }
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setLoading(true);
    try {
      // Create order
      const orderData = await createSubscriptionOrder(plan);

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      // Open Razorpay payment modal
      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'FinderNate',
        description: `${plan === 'small_business' ? 'Small Business' : 'Corporate'} Subscription`,
        order_id: orderData.razorpayOrderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            await verifySubscriptionPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan
            });

            // Success
            alert('Subscription activated successfully!');
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
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upgrade to Premium</h2>
              <p className="text-sm text-gray-600">
                {feature === 'calling' ? 'Unlock calling features and more' : 'Get access to premium features'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Feature Highlight for Calling */}
        {feature === 'calling' && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className="bg-blue-500 p-3 rounded-full">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div className="bg-purple-500 p-3 rounded-full">
                  <Video className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  Calling Features Require Premium
                </h3>
                <p className="text-sm text-gray-600">
                  Upgrade to enjoy unlimited audio and video calls with your connections
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plans */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`
                  relative border-2 rounded-xl p-6 cursor-pointer transition-all
                  ${selectedPlan === plan.id
                    ? 'border-yellow-500 bg-yellow-50 shadow-lg'
                    : 'border-gray-200 hover:border-yellow-300'
                  }
                  ${plan.recommended ? 'ring-2 ring-yellow-400' : ''}
                `}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      RECOMMENDED
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.currency}{plan.price}
                    </span>
                    <span className="ml-2 text-gray-600">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {selectedPlan === plan.id && (
                  <div className="mt-4 text-center">
                    <CheckCircle className="w-6 h-6 text-yellow-500 mx-auto" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="mt-8 text-center">
            <button
              onClick={() => handleUpgrade(selectedPlan)}
              disabled={loading}
              className="
                bg-gradient-to-r from-yellow-500 to-orange-500
                text-white font-bold py-4 px-12 rounded-full
                hover:from-yellow-600 hover:to-orange-600
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-lg hover:shadow-xl
                transform hover:scale-105
              "
            >
              {loading ? 'Processing...' : `Upgrade to ${plans.find(p => p.id === selectedPlan)?.name}`}
            </button>
            <p className="mt-4 text-sm text-gray-500">
              Cancel anytime. No hidden fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
