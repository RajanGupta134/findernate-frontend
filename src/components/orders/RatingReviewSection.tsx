'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Order, rateBuyer } from '@/api/orders';
import StarRating from './StarRating';

interface RatingReviewSectionProps {
  order: Order;
  isBuyer: boolean;
  isSeller: boolean;
  onOrderUpdate: (order: Order) => void;
}

const RatingReviewSection = ({
  order,
  isBuyer,
  isSeller,
  onOrderUpdate,
}: RatingReviewSectionProps) => {
  const [showRateBuyerModal, setShowRateBuyerModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Backend field naming:
  // buyerRating / buyerReview = rating BY the buyer (about the seller)
  // sellerRating / sellerReview = rating BY the seller (about the buyer)

  // Buyer has rated the seller
  const buyerHasRatedSeller = order.buyerRating !== undefined && order.buyerRating !== null;

  // Seller has rated the buyer
  const sellerHasRatedBuyer = order.sellerRating !== undefined && order.sellerRating !== null;

  // Seller can rate buyer if order is confirmed/delivered and seller hasn't rated yet
  const canSellerRateBuyer =
    isSeller &&
    ['confirmed', 'delivered'].includes(order.orderStatus) &&
    !sellerHasRatedBuyer;

  const handleRateBuyer = async () => {
    if (!ratingValue) return;

    try {
      setLoading(true);
      const response = await rateBuyer(order._id, ratingValue, reviewText || undefined);
      onOrderUpdate(response.order);
      setShowRateBuyerModal(false);
      setRatingValue(5);
      setReviewText('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  // Don't show section if no ratings and no ability to rate
  const hasContent = buyerHasRatedSeller || sellerHasRatedBuyer || canSellerRateBuyer;
  if (!hasContent) return null;

  return (
    <>
      <div className="bg-white rounded-2xl p-4">
        <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          Ratings & Reviews
        </h3>

        <div className="space-y-4">
          {/* Buyer's Rating of Seller (buyerRating = rating BY buyer) */}
          {buyerHasRatedSeller && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {order.buyerId?.profileImageUrl ? (
                    <Image
                      src={order.buyerId.profileImageUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="font-medium text-gray-800">{order.buyerId?.fullName}</p>
                      <p className="text-xs text-gray-500">Rated the seller</p>
                    </div>
                    <StarRating rating={order.buyerRating!} size="sm" showValue />
                  </div>
                  {order.buyerReview && (
                    <p className="text-sm text-gray-600 mt-2 bg-white p-3 rounded-lg">
                      &ldquo;{order.buyerReview}&rdquo;
                    </p>
                  )}
                  {order.deliveryConfirmedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(order.deliveryConfirmedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Seller's Rating of Buyer (sellerRating = rating BY seller) */}
          {sellerHasRatedBuyer && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {order.sellerId?.profileImageUrl ? (
                    <Image
                      src={order.sellerId.profileImageUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="font-medium text-gray-800">{order.sellerId?.fullName}</p>
                      <p className="text-xs text-gray-500">Rated the buyer</p>
                    </div>
                    <StarRating rating={order.sellerRating!} size="sm" showValue />
                  </div>
                  {order.sellerReview && (
                    <p className="text-sm text-gray-600 mt-2 bg-white p-3 rounded-lg">
                      &ldquo;{order.sellerReview}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Seller: Rate Buyer Button */}
          {canSellerRateBuyer && (
            <button
              onClick={() => setShowRateBuyerModal(true)}
              className="w-full py-3 border-2 border-dashed border-[#ffd65c] rounded-xl text-[#d4a84a] font-medium hover:bg-[#ffd65c]/10 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
              Rate Buyer
            </button>
          )}

          {/* Pending Ratings Notice */}
          {isBuyer && !buyerHasRatedSeller && ['delivered', 'shipped'].includes(order.orderStatus) && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
              <div className="flex items-center gap-2 text-yellow-700 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>
                  You can rate the seller when confirming delivery.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rate Buyer Modal */}
      {showRateBuyerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Rate Buyer</h3>
            <p className="text-sm text-gray-600 mb-4">
              Share your experience with this buyer to help the community.
            </p>

            {/* Buyer Info */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                {order.buyerId?.profileImageUrl ? (
                  <Image
                    src={order.buyerId.profileImageUrl}
                    alt=""
                    width={48}
                    height={48}
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
              <div>
                <p className="font-medium text-gray-800">{order.buyerId?.fullName}</p>
                <p className="text-sm text-gray-500">@{order.buyerId?.username}</p>
              </div>
            </div>

            {/* Rating Stars */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How was your experience?
              </label>
              <div className="flex justify-center">
                <StarRating
                  rating={ratingValue}
                  size="lg"
                  editable
                  onChange={setRatingValue}
                />
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {ratingValue === 1 && 'Poor'}
                {ratingValue === 2 && 'Fair'}
                {ratingValue === 3 && 'Good'}
                {ratingValue === 4 && 'Very Good'}
                {ratingValue === 5 && 'Excellent'}
              </p>
            </div>

            {/* Review Text */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Write a review (optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this buyer..."
                className="w-full p-3 border border-gray-200 rounded-xl resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#ffd65c] focus:border-transparent"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {reviewText.length}/500
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRateBuyerModal(false);
                  setRatingValue(5);
                  setReviewText('');
                }}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRateBuyer}
                disabled={loading || !ratingValue}
                className="flex-1 py-3 bg-[#ffd65c] text-black rounded-xl font-medium hover:bg-[#e6c152] transition disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RatingReviewSection;
