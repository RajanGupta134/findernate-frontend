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
  uploadPaymentProof,
  uploadPackingMedia,
  Order,
  getOrderStatusLabel,
  getOrderStatusColor,
  getPaymentStatusLabel,
  getPaymentStatusColor,
  canConfirmDelivery,
  canShipOrder,
  canMarkDelivered,
} from '@/api/orders';
import { useUserStore } from '@/store/useUserStore';
import { useCloudinaryUpload, useMultipleCloudinaryUpload } from '@/hooks/useCloudinaryUpload';

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
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [showPackingMediaModal, setShowPackingMediaModal] = useState(false);
  const [showImagePreviewModal, setShowImagePreviewModal] = useState<string | null>(null);

  // Form state
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [carrier, setCarrier] = useState('');

  // Payment proof upload hook
  const paymentProofUpload = useCloudinaryUpload({
    folder: 'findernate/orders/payment-proofs',
    allowedTypes: ['image'],
    maxSizeMB: 10,
  });

  // Packing video upload hook
  const packingVideoUpload = useCloudinaryUpload({
    folder: 'findernate/orders/packing-media',
    allowedTypes: ['video'],
    maxSizeMB: 100,
  });

  // Packing images upload hook
  const packingImagesUpload = useMultipleCloudinaryUpload({
    folder: 'findernate/orders/packing-media',
    allowedTypes: ['image'],
    maxSizeMB: 10,
    maxFiles: 5,
  });

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

  const isBuyer = order?.buyerId?._id?.toString() === user?._id?.toString();
  const isSeller = order?.sellerId?._id?.toString() === user?._id?.toString();

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

      // Upload packing video if selected
      let packingVideoUrl: string | undefined;
      if (packingVideoUpload.file) {
        packingVideoUrl = await packingVideoUpload.uploadToCloudinary() || undefined;
      }

      // Upload packing images if selected
      let packingImages: string[] | undefined;
      if (packingImagesUpload.files.length > 0) {
        packingImages = await packingImagesUpload.uploadAllToCloudinary();
        if (packingImages.length === 0) packingImages = undefined;
      }

      const response = await markOrderShipped(
        orderId,
        trackingId || undefined,
        carrier || undefined,
        packingVideoUrl,
        packingImages
      );
      setOrder(response.order);
      setShowShipModal(false);

      // Clear upload states
      packingVideoUpload.clearFile();
      packingImagesUpload.clearFiles();
      setTrackingId('');
      setCarrier('');

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

  const handleUploadPaymentProof = async () => {
    if (!order || !paymentProofUpload.file) return;
    try {
      setActionLoading(true);
      const url = await paymentProofUpload.uploadToCloudinary();
      if (!url) {
        alert('Failed to upload payment proof');
        return;
      }
      const response = await uploadPaymentProof(orderId, url);
      setOrder(response.order);
      setShowPaymentProofModal(false);
      paymentProofUpload.clearFile();
      alert('Payment proof uploaded successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload payment proof');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadPackingMedia = async () => {
    if (!order) return;

    const hasVideo = packingVideoUpload.file;
    const hasImages = packingImagesUpload.files.length > 0;

    if (!hasVideo && !hasImages) {
      alert('Please select at least one file to upload');
      return;
    }

    try {
      setActionLoading(true);

      let packingVideoUrl: string | undefined;
      if (hasVideo) {
        packingVideoUrl = await packingVideoUpload.uploadToCloudinary() || undefined;
      }

      let packingImages: string[] | undefined;
      if (hasImages) {
        packingImages = await packingImagesUpload.uploadAllToCloudinary();
        if (packingImages.length === 0) packingImages = undefined;
      }

      const response = await uploadPackingMedia(orderId, packingVideoUrl, packingImages);
      setOrder(response.order);
      setShowPackingMediaModal(false);

      packingVideoUpload.clearFile();
      packingImagesUpload.clearFiles();

      alert('Packing media uploaded successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload packing media');
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

  // Check if buyer can upload payment proof
  const canUploadPaymentProof = (order: Order): boolean => {
    return (
      ['payment_received', 'processing', 'shipped', 'delivered'].includes(order.orderStatus) &&
      !order.buyerProof?.paymentScreenshot
    );
  };

  // Check if seller can upload packing media
  const canUploadPackingMedia = (order: Order): boolean => {
    return ['payment_received', 'processing', 'shipped'].includes(order.orderStatus);
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

        {/* Shipping Info & Tracking */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-medium text-gray-800 mb-3">Shipping & Tracking</h3>

          {order.shippingInfo ? (
            <>
              <div className="text-sm text-gray-600 space-y-2">
                {order.shippingInfo.carrier && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>Carrier: <strong>{order.shippingInfo.carrier}</strong></span>
                  </div>
                )}
                {order.shippingInfo.trackingId && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Tracking ID: <strong className="font-mono">{order.shippingInfo.trackingId}</strong></span>
                  </div>
                )}
                {order.shippingInfo.shippedAt && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Shipped: {formatDate(order.shippingInfo.shippedAt)}</span>
                  </div>
                )}
                {order.shippingInfo.deliveredAt && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Delivered: {formatDate(order.shippingInfo.deliveredAt)}</span>
                  </div>
                )}
              </div>

              {/* Packing Media Display */}
              {(order.shippingInfo.packingVideoUrl || (order.shippingInfo.packingImages && order.shippingInfo.packingImages.length > 0)) && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Packing Media</h4>

                  {/* Packing Video */}
                  {order.shippingInfo.packingVideoUrl && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Packing Video</p>
                      <video
                        src={order.shippingInfo.packingVideoUrl}
                        controls
                        className="w-full max-w-md rounded-lg"
                        preload="metadata"
                      />
                    </div>
                  )}

                  {/* Packing Images */}
                  {order.shippingInfo.packingImages && order.shippingInfo.packingImages.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Packing Images</p>
                      <div className="flex flex-wrap gap-2">
                        {order.shippingInfo.packingImages.map((img, index) => (
                          <button
                            key={index}
                            onClick={() => setShowImagePreviewModal(img)}
                            className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition"
                          >
                            <Image
                              src={img}
                              alt={`Packing image ${index + 1}`}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">No shipping information yet</p>
          )}

          {/* Seller: Upload Packing Media Button - Always show for seller when order status allows */}
          {isSeller && canUploadPackingMedia(order) && (
            <div className={order.shippingInfo ? "mt-4 pt-4 border-t" : "mt-3"}>
              <button
                onClick={() => setShowPackingMediaModal(true)}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#ffd65c] hover:text-[#d4a84a] transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {order.shippingInfo?.packingVideoUrl || order.shippingInfo?.packingImages?.length
                  ? 'Add More Packing Media'
                  : 'Upload Packing Media'}
              </button>
            </div>
          )}
        </div>

        {/* Buyer Proof Section */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-medium text-gray-800 mb-3">Buyer Proof</h3>

          {/* Payment Screenshot */}
          {order.buyerProof?.paymentScreenshot ? (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Payment Screenshot</p>
              <button
                onClick={() => setShowImagePreviewModal(order.buyerProof!.paymentScreenshot!)}
                className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition"
              >
                <Image
                  src={order.buyerProof.paymentScreenshot}
                  alt="Payment proof"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </button>
              {order.buyerProof.uploadedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Uploaded: {formatDate(order.buyerProof.uploadedAt)}
                </p>
              )}
            </div>
          ) : isBuyer && canUploadPaymentProof(order) ? (
            <button
              onClick={() => setShowPaymentProofModal(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#ffd65c] hover:text-[#d4a84a] transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Payment Screenshot
            </button>
          ) : (
            <p className="text-sm text-gray-400">No payment proof uploaded yet</p>
          )}

          {/* Opening Video (if exists) */}
          {order.buyerProof?.openingVideoUrl && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500 mb-2">Opening Video</p>
              <video
                src={order.buyerProof.openingVideoUrl}
                controls
                className="w-full max-w-md rounded-lg"
                preload="metadata"
              />
            </div>
          )}
        </div>

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
          {isBuyer && !order.dispute && !['cancelled', 'refunded', 'payment_pending'].includes(order.orderStatus) && (
            <button
              onClick={() => setShowReportModal(true)}
              className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
            >
              Dispute
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 my-8">
            <h3 className="text-lg font-semibold mb-4">Ship Order</h3>

            {/* Tracking Info */}
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

            {/* Packing Video */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Packing Video (optional)</label>
              <input
                type="file"
                ref={packingVideoUpload.fileInputRef}
                onChange={packingVideoUpload.handleFileSelect}
                accept="video/*"
                className="hidden"
              />
              {packingVideoUpload.file ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600 flex-1 truncate">{packingVideoUpload.file.name}</span>
                  <button
                    type="button"
                    onClick={packingVideoUpload.clearFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={packingVideoUpload.triggerFileSelect}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#ffd65c] hover:text-[#d4a84a] transition"
                >
                  Select Video
                </button>
              )}
            </div>

            {/* Packing Images */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Packing Images (optional, max 5)</label>
              <input
                type="file"
                ref={packingImagesUpload.fileInputRef}
                onChange={packingImagesUpload.handleFilesSelect}
                accept="image/*"
                multiple
                className="hidden"
              />
              {packingImagesUpload.files.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {packingImagesUpload.files.map((file, index) => (
                      <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        {packingImagesUpload.previews[index] && (
                          <Image
                            src={packingImagesUpload.previews[index]}
                            alt={`Preview ${index + 1}`}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => packingImagesUpload.removeFile(index)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {packingImagesUpload.files.length < 5 && (
                    <button
                      type="button"
                      onClick={packingImagesUpload.triggerFileSelect}
                      className="text-sm text-[#ffd65c] hover:underline"
                    >
                      + Add more images
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={packingImagesUpload.triggerFileSelect}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#ffd65c] hover:text-[#d4a84a] transition"
                >
                  Select Images
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowShipModal(false);
                  packingVideoUpload.clearFile();
                  packingImagesUpload.clearFiles();
                  setTrackingId('');
                  setCarrier('');
                }}
                className="flex-1 py-2 border border-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkShipped}
                disabled={actionLoading || packingVideoUpload.uploading || packingImagesUpload.uploading}
                className="flex-1 py-2 bg-[#ffd65c] text-black rounded-lg disabled:opacity-50"
              >
                {actionLoading || packingVideoUpload.uploading || packingImagesUpload.uploading
                  ? 'Uploading...'
                  : 'Mark Shipped'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Proof Upload Modal */}
      {showPaymentProofModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Upload Payment Proof</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a screenshot of your payment confirmation to help resolve any disputes.
            </p>

            <input
              type="file"
              ref={paymentProofUpload.fileInputRef}
              onChange={paymentProofUpload.handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            {paymentProofUpload.preview ? (
              <div className="mb-4">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={paymentProofUpload.preview}
                    alt="Payment proof preview"
                    fill
                    className="object-contain"
                  />
                  <button
                    type="button"
                    onClick={paymentProofUpload.clearFile}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 truncate">{paymentProofUpload.file?.name}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={paymentProofUpload.triggerFileSelect}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#ffd65c] hover:text-[#d4a84a] transition mb-4"
              >
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Click to select payment screenshot</span>
              </button>
            )}

            {paymentProofUpload.error && (
              <p className="text-sm text-red-500 mb-4">{paymentProofUpload.error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentProofModal(false);
                  paymentProofUpload.clearFile();
                }}
                className="flex-1 py-2 border border-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadPaymentProof}
                disabled={!paymentProofUpload.file || actionLoading || paymentProofUpload.uploading}
                className="flex-1 py-2 bg-[#ffd65c] text-black rounded-lg disabled:opacity-50"
              >
                {actionLoading || paymentProofUpload.uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Packing Media Upload Modal (for updating after shipping) */}
      {showPackingMediaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 my-8">
            <h3 className="text-lg font-semibold mb-4">Upload Packing Media</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload videos or images showing the product being packed. This helps build trust and resolve disputes.
            </p>

            {/* Packing Video */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Packing Video</label>
              <input
                type="file"
                ref={packingVideoUpload.fileInputRef}
                onChange={packingVideoUpload.handleFileSelect}
                accept="video/*"
                className="hidden"
              />
              {packingVideoUpload.file ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600 flex-1 truncate">{packingVideoUpload.file.name}</span>
                  <button
                    type="button"
                    onClick={packingVideoUpload.clearFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={packingVideoUpload.triggerFileSelect}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#ffd65c] hover:text-[#d4a84a] transition"
                >
                  Select Video
                </button>
              )}
            </div>

            {/* Packing Images */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Packing Images (max 5)</label>
              <input
                type="file"
                ref={packingImagesUpload.fileInputRef}
                onChange={packingImagesUpload.handleFilesSelect}
                accept="image/*"
                multiple
                className="hidden"
              />
              {packingImagesUpload.files.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {packingImagesUpload.files.map((file, index) => (
                      <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        {packingImagesUpload.previews[index] && (
                          <Image
                            src={packingImagesUpload.previews[index]}
                            alt={`Preview ${index + 1}`}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => packingImagesUpload.removeFile(index)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {packingImagesUpload.files.length < 5 && (
                    <button
                      type="button"
                      onClick={packingImagesUpload.triggerFileSelect}
                      className="text-sm text-[#ffd65c] hover:underline"
                    >
                      + Add more images
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={packingImagesUpload.triggerFileSelect}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#ffd65c] hover:text-[#d4a84a] transition"
                >
                  Select Images
                </button>
              )}
            </div>

            {(packingVideoUpload.error || packingImagesUpload.error) && (
              <p className="text-sm text-red-500 mb-4">
                {packingVideoUpload.error || packingImagesUpload.error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPackingMediaModal(false);
                  packingVideoUpload.clearFile();
                  packingImagesUpload.clearFiles();
                }}
                className="flex-1 py-2 border border-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadPackingMedia}
                disabled={
                  (!packingVideoUpload.file && packingImagesUpload.files.length === 0) ||
                  actionLoading ||
                  packingVideoUpload.uploading ||
                  packingImagesUpload.uploading
                }
                className="flex-1 py-2 bg-[#ffd65c] text-black rounded-lg disabled:opacity-50"
              >
                {actionLoading || packingVideoUpload.uploading || packingImagesUpload.uploading
                  ? 'Uploading...'
                  : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImagePreviewModal && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImagePreviewModal(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl"
            onClick={() => setShowImagePreviewModal(null)}
          >
            ×
          </button>
          <Image
            src={showImagePreviewModal}
            alt="Preview"
            width={800}
            height={800}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
