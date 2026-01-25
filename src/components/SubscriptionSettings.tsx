"use client";

import React, { useEffect, useState } from 'react';
import { Crown, Check, X, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import {
  getSubscriptionStatus,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  cancelSubscription,
  SubscriptionStatusResponse,
  SubscriptionPlan
} from '@/api/subscription';
import SubscriptionBadge from './ui/SubscriptionBadge';

const SubscriptionSettings: React.FC = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const data = await getSubscriptionStatus();
      setSubscriptionData(data);
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setProcessing(true);
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
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'FinderNate',
        description: `${plan === 'small_business' ? 'Small Business' : 'Corporate'} Subscription`,
        order_id: orderData.orderId,
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
            fetchSubscriptionStatus();
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
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? Your benefits will remain active until the end of the current billing period.')) {
      return;
    }

    setProcessing(true);
    try {
      await cancelSubscription();
      alert('Subscription cancelled successfully');
      fetchSubscriptionStatus();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

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
      ]
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
      ]
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  const currentPlan = subscriptionData?.tier || 'free';
  const isActive = subscriptionData?.subscription?.status === 'active';

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Current Subscription Status */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Subscription</h2>
              <p className="text-sm text-gray-600">Manage your subscription and billing</p>
            </div>
          </div>
          {currentPlan !== 'free' && (
            <SubscriptionBadge
              badge={
                currentPlan === 'corporate'
                  ? { type: 'corporate', label: 'Corporate', color: '#F59E0B', isPaid: true }
                  : { type: 'small_business', label: 'Small Business', color: '#3B82F6', isPaid: true }
              }
              size="lg"
            />
          )}
        </div>

        {currentPlan === 'free' ? (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Free Plan</p>
                <p className="text-sm text-gray-600">
                  You're currently on the free plan. Upgrade to unlock premium features like unlimited calling and priority visibility.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Billing Cycle</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {subscriptionData?.subscription?.startDate && subscriptionData?.subscription?.endDate ? (
                    <>
                      {new Date(subscriptionData.subscription.startDate).toLocaleDateString()} -{' '}
                      {new Date(subscriptionData.subscription.endDate).toLocaleDateString()}
                    </>
                  ) : (
                    'N/A'
                  )}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Status</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {isActive ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="font-medium text-blue-900 mb-2">Your Benefits:</p>
              <div className="grid md:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-blue-800">Unlimited Audio Calls</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-blue-800">Unlimited Video Calls</span>
                </div>
                {currentPlan === 'corporate' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-blue-800">Priority Post Visibility</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-blue-800">Dedicated Support</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Cancel Button */}
            {isActive && (
              <button
                onClick={handleCancelSubscription}
                disabled={processing}
                className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        )}
      </div>

      {/* Available Plans */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {currentPlan === 'free' ? 'Choose a Plan' : 'Upgrade or Change Plan'}
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`
                border-2 rounded-xl p-6
                ${currentPlan === plan.id ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white'}
              `}
            >
              <div className="mb-4">
                <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                <div className="mt-2 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.currency}{plan.price}
                  </span>
                  <span className="ml-2 text-gray-600">/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {currentPlan === plan.id ? (
                <div className="text-center py-2 px-4 bg-yellow-100 text-yellow-800 font-semibold rounded-lg">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={processing}
                  className="
                    w-full bg-gradient-to-r from-yellow-500 to-orange-500
                    text-white font-bold py-3 px-6 rounded-lg
                    hover:from-yellow-600 hover:to-orange-600
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all shadow-md hover:shadow-lg
                  "
                >
                  {processing ? 'Processing...' : currentPlan === 'free' ? 'Subscribe' : 'Change Plan'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSettings;
