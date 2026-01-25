'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  getOrderDetails,
  confirmDelivery,
  reportIssue,
  markOrderShipped,
  markOrderDelivered,
  Order,
  getOrderStatusLabel,
  getOrderStatusColor,
  getPaymentStatusLabel,
  getPaymentStatusColor,
  canConfirmDelivery,
  canReportIssue,
  canShipOrder,
  canMarkDelivered,
} from '@/api/orders';
import { useUserStore } from '@/store/useUserStore';

const OrderDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const user = useUserStore((state) => state.user);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [carrier, setCarrier] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchOrder();
  }, [orderId, user]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await getOrderDetails(orderId);
      setOrder(response.order);
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const isBuyer = order?.buyerId?._id === user?._id;
  const isSeller = order?.sellerId?._id === user?._id;

  const handleConfirmDelivery = async () => {
    if (!order) return;
    try {
      setActionLoading(true);
      const response = await confirmDelivery(orderId, rating, review);
      setOrder(response.order);
      setShowConfirmModal(false);
      alert('Delivery confirmed! Payment has been released to the seller.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to confirm delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportIssue = async () => {
    if (!order || !reportReason) return;
    try {
      setActionLoading(true);
      const response = await reportIssue(orderId, reportReason, reportDescription);
      setOrder(response.order);
      setShowReportModal(false);
      alert('Issue reported. The payment is held until resolution.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to report issue');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkShipped = async () => {
    if (!order) return;
    try {
      setActionLoading(true);
      const response = await markOrderShipped(orderId, trackingId, carrier);
      setOrder(response.order);
      setShowShipModal(false);
      alert('Order marked as shipped!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark as shipped');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!order) return;
    try {
      setActionLoading(true);
      const response = await markOrderDelivered(orderId);
      setOrder(response.order);
      alert('Order marked as delivered!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark as delivered');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ffd65c]"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 text-center max-w-md">
          <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
          <button onClick={() => router.back()} className="text-[#ffd65c] underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold ml-2">Order Details</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Order Status Card */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusColor(order.orderStatus)}`}>
              {getOrderStatusLabel(order.orderStatus)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
              {getPaymentStatusLabel(order.paymentStatus)}
            </span>
          </div>
          <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
          <p className="text-xs text-gray-400 mt-1">Placed on {formatDate(order.createdAt)}</p>
        </div>

        {/* Product Card */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-medium text-gray-800 mb-3">Product</h3>
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {order.productDetails.images?.[0] ? (
                <Image
                  src={order.productDetails.images[0]}
                  alt={order.productDetails.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-800">{order.productDetails.name}</h4>
              {order.productDetails.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{order.productDetails.description}</p>
              )}
              <p className="text-lg font-bold text-[#ffd65c] mt-2">{formatCurrency(order.amount)}</p>
            </div>
          </div>
        </div>

        {/* Parties Card */}
        <div className="bg-white rounded-2xl p-4">
          <div className="space-y-4">
            {/* Seller */}
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Seller</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                  {order.sellerId?.profileImageUrl ? (
                    <Image src={order.sellerId.profileImageUrl} alt="" width={40} height={40} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{order.sellerId?.fullName}</p>
                  <p className="text-sm text-gray-500">@{order.sellerId?.username}</p>
                </div>
              </div>
            </div>

            {/* Buyer */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-800 mb-2">Buyer</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                  {order.buyerId?.profileImageUrl ? (
                    <Image src={order.buyerId.profileImageUrl} alt="" width={40} height={40} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{order.buyerId?.fullName}</p>
                  <p className="text-sm text-gray-500">@{order.buyerId?.username}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-medium text-gray-800 mb-2">Shipping Address</h3>
          <div className="text-sm text-gray-600">
            <p>{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}</p>
            <p>Phone: {order.shippingAddress.phoneNumber}</p>
          </div>
        </div>

        {/* Shipping Info */}
        {order.shippingInfo && (
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-medium text-gray-800 mb-2">Shipping Info</h3>
            <div className="text-sm text-gray-600 space-y-1">
              {order.shippingInfo.carrier && <p>Carrier: {order.shippingInfo.carrier}</p>}
              {order.shippingInfo.trackingId && <p>Tracking ID: {order.shippingInfo.trackingId}</p>}
              {order.shippingInfo.shippedAt && <p>Shipped: {formatDate(order.shippingInfo.shippedAt)}</p>}
              {order.shippingInfo.deliveredAt && <p>Delivered: {formatDate(order.shippingInfo.deliveredAt)}</p>}
            </div>
          </div>
        )}

        {/* Dispute Info */}
        {order.dispute && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <h3 className="font-medium text-red-800 mb-2">Dispute</h3>
            <div className="text-sm text-red-700 space-y-1">
              <p><strong>Reason:</strong> {order.dispute.reason}</p>
              {order.dispute.description && <p><strong>Description:</strong> {order.dispute.description}</p>}
              <p><strong>Status:</strong> {order.dispute.status}</p>
              {order.dispute.resolution && <p><strong>Resolution:</strong> {order.dispute.resolution}</p>}
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-medium text-gray-800 mb-3">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(order.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Shipping</span>
              <span className="text-green-600">Free</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-[#ffd65c]">{formatCurrency(order.amount)}</span>
            </div>
          </div>
        </div>

        {/* Escrow Notice */}
        {order.paymentStatus === 'held' && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">Payment Held in Escrow</p>
                <p className="text-xs text-blue-600 mt-1">
                  {isBuyer
                    ? 'Your payment is secure. Confirm delivery after receiving the product.'
                    : 'Payment will be released after buyer confirms delivery.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {/* Buyer Actions */}
          {isBuyer && canConfirmDelivery(order) && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition"
            >
              Confirm Delivery
            </button>
          )}
          {isBuyer && canReportIssue(order) && (
            <button
              onClick={() => setShowReportModal(true)}
              className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
            >
              Report Issue
            </button>
          )}

          {/* Seller Actions */}
          {isSeller && canShipOrder(order) && (
            <button
              onClick={() => setShowShipModal(true)}
              className="flex-1 py-3 bg-[#ffd65c] text-black font-semibold rounded-lg hover:bg-[#e6c152] transition"
            >
              Mark as Shipped
            </button>
          )}
          {isSeller && canMarkDelivered(order) && (
            <button
              onClick={handleMarkDelivered}
              disabled={actionLoading}
              className="flex-1 py-3 bg-[#ffd65c] text-black font-semibold rounded-lg hover:bg-[#e6c152] transition disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Mark as Delivered'}
            </button>
          )}
        </div>
      </div>

      {/* Confirm Delivery Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Confirm Delivery</h3>
            <p className="text-sm text-gray-600 mb-4">
              By confirming, the payment will be released to the seller. Make sure you have received the product.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rate this order</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className="text-2xl">
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Review (optional)</label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Write your review..."
                className="w-full p-3 border border-gray-200 rounded-lg resize-none h-24"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleConfirmDelivery}
                disabled={actionLoading}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Report Issue</h3>
            <p className="text-sm text-gray-600 mb-4">
              Payment will be held until the issue is resolved by admin.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg"
              >
                <option value="">Select a reason</option>
                <option value="Item not as described">Item not as described</option>
                <option value="Item damaged">Item damaged</option>
                <option value="Item not received">Item not received</option>
                <option value="Wrong item received">Wrong item received</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe the issue..."
                className="w-full p-3 border border-gray-200 rounded-lg resize-none h-24"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReportModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleReportIssue}
                disabled={actionLoading || !reportReason}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ship Order Modal */}
      {showShipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Ship Order</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tracking ID (optional)</label>
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter tracking ID"
                className="w-full p-3 border border-gray-200 rounded-lg"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Carrier (optional)</label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g., BlueDart, DTDC"
                className="w-full p-3 border border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowShipModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleMarkShipped}
                disabled={actionLoading}
                className="flex-1 py-2 bg-[#ffd65c] text-black rounded-lg disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Mark Shipped'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
