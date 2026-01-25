'use client';

import { useState } from 'react';
import { createShareablePaymentLink } from '@/api/payments';

interface CreatePaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  productName: string;
  productImage?: string;
  suggestedPrice?: number;
}

const CreatePaymentLinkModal = ({
  isOpen,
  onClose,
  postId,
  productName,
  productImage,
  suggestedPrice,
}: CreatePaymentLinkModalProps) => {
  const [amount, setAmount] = useState<string>(suggestedPrice?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateLink = async () => {
    const numericAmount = parseInt(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await createShareablePaymentLink(postId, numericAmount);
      setPaymentLink(response.paymentLink.paymentUrl);
    } catch (err: any) {
      console.error('Error creating payment link:', err);
      setError(err.response?.data?.message || 'Failed to create payment link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!paymentLink) return;

    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (!paymentLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay for ${productName}`,
          text: `Complete payment of ₹${amount} for ${productName}`,
          url: paymentLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleClose = () => {
    setAmount(suggestedPrice?.toString() || '');
    setPaymentLink(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Payment Link</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!paymentLink ? (
            <>
              {/* Product Preview */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                {productImage && (
                  <img src={productImage} alt={productName} className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{productName}</p>
                  <p className="text-sm text-gray-500">Post ID: {postId.slice(0, 8)}...</p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd65c] text-lg"
                  />
                </div>
                {suggestedPrice && (
                  <p className="text-sm text-gray-500 mt-1">
                    Suggested price: ₹{suggestedPrice.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[500, 1000, 2000, 5000, 10000].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                      amount === quickAmount.toString()
                        ? 'bg-[#ffd65c] border-[#ffd65c] text-black'
                        : 'border-gray-200 hover:border-[#ffd65c]'
                    }`}
                  >
                    ₹{quickAmount.toLocaleString()}
                  </button>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg mb-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreateLink}
                disabled={loading || !amount}
                className="w-full py-3 bg-[#ffd65c] text-black font-semibold rounded-lg hover:bg-[#e6c152] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Payment Link'
                )}
              </button>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Payment Link Created!</h3>
                <p className="text-sm text-gray-500 mb-4">Share this link with your customer</p>
              </div>

              {/* Amount Display */}
              <div className="bg-[#ffd65c]/10 rounded-lg p-4 mb-4 text-center">
                <p className="text-sm text-gray-600">Amount</p>
                <p className="text-2xl font-bold text-[#ffd65c]">₹{parseInt(amount).toLocaleString()}</p>
              </div>

              {/* Link Display */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Payment URL</p>
                <p className="text-sm text-gray-800 break-all font-mono">{paymentLink}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition flex items-center justify-center"
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 py-3 bg-[#ffd65c] text-black font-semibold rounded-lg hover:bg-[#e6c152] transition flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share
                </button>
              </div>

              {/* Create Another */}
              <button
                onClick={() => {
                  setPaymentLink(null);
                  setAmount('');
                }}
                className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-700"
              >
                Create another link
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePaymentLinkModal;
