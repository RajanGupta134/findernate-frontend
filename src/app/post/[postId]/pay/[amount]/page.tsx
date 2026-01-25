'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  getShareablePaymentDetails,
  createShareableOrder,
  verifyPayment,
  loadRazorpayScript,
  openRazorpayCheckout,
  PaymentLinkDetails,
  ShippingAddress,
  BuyerDetails,
  RazorpayResponse,
} from '@/api/payments';
import { useUserStore } from '@/store/useUserStore';

const PaymentPage = () => {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const amount = parseInt(params.amount as string);

  const user = useUserStore((state) => state.user);
  const isAuthenticated = user !== null;

  const [paymentDetails, setPaymentDetails] = useState<PaymentLinkDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{ orderNumber: string; orderId: string } | null>(null);

  // Form state
  const [step, setStep] = useState<'details' | 'shipping' | 'payment'>('details');
  const [buyerDetails, setBuyerDetails] = useState<BuyerDetails>({
    fullName: '',
    email: '',
    phoneNumber: '',
  });
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });

  // Load payment details
  useEffect(() => {
    const loadPaymentDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!postId || isNaN(amount) || amount <= 0) {
          setError('Invalid payment link');
          return;
        }

        const details = await getShareablePaymentDetails(postId, amount);
        setPaymentDetails(details);

        // Pre-fill buyer details if logged in
        if (user) {
          setBuyerDetails({
            fullName: user.fullName || '',
            email: user.email || '',
            phoneNumber: '',
          });
          setShippingAddress((prev) => ({
            ...prev,
            fullName: user.fullName || '',
          }));
        }
      } catch (err: any) {
        console.error('Error loading payment details:', err);
        setError(err.response?.data?.message || 'Failed to load payment details');
      } finally {
        setLoading(false);
      }
    };

    loadPaymentDetails();
  }, [postId, amount, user]);

  // Load Razorpay script
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const handleProceedToShipping = () => {
    if (!isAuthenticated) {
      // Validate guest buyer details
      if (!buyerDetails.fullName || !buyerDetails.email || !buyerDetails.phoneNumber) {
        alert('Please fill in all your details');
        return;
      }
    }
    setStep('shipping');
  };

  const handleProceedToPayment = () => {
    if (
      !shippingAddress.fullName ||
      !shippingAddress.phoneNumber ||
      !shippingAddress.addressLine1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.postalCode
    ) {
      alert('Please fill in all required shipping details');
      return;
    }
    setStep('payment');
  };

  const handlePayment = async () => {
    if (!paymentDetails) return;

    try {
      setProcessing(true);

      // Create Razorpay order
      const orderResponse = await createShareableOrder(
        postId,
        amount,
        shippingAddress,
        !isAuthenticated ? buyerDetails : undefined
      );

      // Open Razorpay checkout
      openRazorpayCheckout({
        key: orderResponse.razorpayKeyId,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'FinderNate',
        description: `Payment for ${paymentDetails.productDetails.name}`,
        image: '/logo.png',
        order_id: orderResponse.razorpayOrderId,
        handler: async (response: RazorpayResponse) => {
          try {
            // Verify payment
            const verifyResponse = await verifyPayment(
              orderResponse.orderId,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            setOrderDetails({
              orderNumber: verifyResponse.order.orderNumber,
              orderId: verifyResponse.order._id,
            });
            setPaymentSuccess(true);
          } catch (verifyError: any) {
            console.error('Payment verification failed:', verifyError);
            setError('Payment verification failed. Please contact support.');
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: buyerDetails.fullName || user?.fullName || '',
          email: buyerDetails.email || user?.email || '',
          contact: buyerDetails.phoneNumber || shippingAddress.phoneNumber || '',
        },
        notes: {
          postId: postId,
          amount: amount.toString(),
        },
        theme: {
          color: '#ffd65c',
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      });
    } catch (err: any) {
      console.error('Error creating order:', err);
      setError(err.response?.data?.message || 'Failed to create order');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd65c] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (paymentSuccess && orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-4">Your order has been placed successfully.</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="text-lg font-semibold text-gray-800">{orderDetails.orderNumber}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            The seller will be notified and will ship your order soon.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-[#ffd65c] text-black font-semibold rounded-lg hover:bg-[#e6c152] transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (!paymentDetails) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold ml-2">Secure Checkout</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {['Details', 'Shipping', 'Payment'].map((label, idx) => {
            const stepNames = ['details', 'shipping', 'payment'] as const;
            const currentIdx = stepNames.indexOf(step);
            const isActive = idx <= currentIdx;
            return (
              <div key={label} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive ? 'bg-[#ffd65c] text-black' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {idx + 1}
                </div>
                <span className={`ml-2 text-sm ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
                {idx < 2 && <div className={`w-12 h-0.5 mx-3 ${idx < currentIdx ? 'bg-[#ffd65c]' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
        </div>

        {/* Product Card */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            {paymentDetails.post.media?.[0] && (
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <Image
                  src={paymentDetails.post.media[0].thumbnailUrl || paymentDetails.post.media[0].url}
                  alt={paymentDetails.productDetails.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">{paymentDetails.productDetails.name}</h3>
              {paymentDetails.productDetails.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{paymentDetails.productDetails.description}</p>
              )}
              <div className="flex items-center mt-2">
                <span className="text-lg font-bold text-[#ffd65c]">₹{amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          {/* Seller Info */}
          <div className="flex items-center mt-4 pt-4 border-t border-gray-100">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              {paymentDetails.seller.profileImageUrl ? (
                <Image
                  src={paymentDetails.seller.profileImageUrl}
                  alt={paymentDetails.seller.fullName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="ml-3">
              <p className="font-medium text-gray-800 flex items-center">
                {paymentDetails.seller.fullName}
                {paymentDetails.seller.isBlueTickVerified && (
                  <svg className="w-4 h-4 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                )}
              </p>
              <p className="text-sm text-gray-500">@{paymentDetails.seller.username}</p>
            </div>
            {paymentDetails.seller.isBusinessProfile && (
              <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Business</span>
            )}
          </div>
        </div>

        {/* Step Content */}
        {step === 'details' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Your Details</h2>
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 w-20">Name:</span>
                  <span className="font-medium">{user?.fullName}</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 w-20">Email:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <p className="text-sm text-green-600 mt-2">✓ Logged in as {user?.username}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 mb-4">Please provide your details to continue as a guest</p>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={buyerDetails.fullName}
                  onChange={(e) => setBuyerDetails({ ...buyerDetails, fullName: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c]"
                />
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={buyerDetails.email}
                  onChange={(e) => setBuyerDetails({ ...buyerDetails, email: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c]"
                />
                <input
                  type="tel"
                  placeholder="Phone Number *"
                  value={buyerDetails.phoneNumber}
                  onChange={(e) => setBuyerDetails({ ...buyerDetails, phoneNumber: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c]"
                />
              </div>
            )}
            <button
              onClick={handleProceedToShipping}
              className="w-full mt-6 py-3 bg-[#ffd65c] text-black font-semibold rounded-lg hover:bg-[#e6c152] transition"
            >
              Continue to Shipping
            </button>
          </div>
        )}

        {step === 'shipping' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full Name *"
                value={shippingAddress.fullName}
                onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c]"
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={shippingAddress.phoneNumber}
                onChange={(e) => setShippingAddress({ ...shippingAddress, phoneNumber: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c]"
              />
              <input
                type="text"
                placeholder="Address Line 1 *"
                value={shippingAddress.addressLine1}
                onChange={(e) => setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c]"
              />
              <input
                type="text"
                placeholder="Address Line 2 (Optional)"
                value={shippingAddress.addressLine2}
                onChange={(e) => setShippingAddress({ ...shippingAddress, addressLine2: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c]"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City *"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c]"
                />
                <input
                  type="text"
                  placeholder="State *"
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="PIN Code *"
                  value={shippingAddress.postalCode}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c]"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={shippingAddress.country}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c]"
                  disabled
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setStep('details')}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
              >
                Back
              </button>
              <button
                onClick={handleProceedToPayment}
                className="flex-1 py-3 bg-[#ffd65c] text-black font-semibold rounded-lg hover:bg-[#e6c152] transition"
              >
                Review Order
              </button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            {/* Order Details */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>₹{amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-[#ffd65c]">₹{amount.toLocaleString()}</span>
              </div>
            </div>

            {/* Shipping Address Preview */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-800 mb-2">Shipping to:</h3>
              <p className="text-sm text-gray-600">
                {shippingAddress.fullName}<br />
                {shippingAddress.addressLine1}<br />
                {shippingAddress.addressLine2 && <>{shippingAddress.addressLine2}<br /></>}
                {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postalCode}<br />
                Phone: {shippingAddress.phoneNumber}
              </p>
            </div>

            {/* Escrow Notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">Secure Payment</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Your payment is held securely until you confirm delivery. You can raise a dispute if there&apos;s any issue.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('shipping')}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
              >
                Back
              </button>
              <button
                onClick={handlePayment}
                disabled={processing}
                className="flex-1 py-3 bg-[#ffd65c] text-black font-semibold rounded-lg hover:bg-[#e6c152] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
                    Processing...
                  </>
                ) : (
                  `Pay ₹${amount.toLocaleString()}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
