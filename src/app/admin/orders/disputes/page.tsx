'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/layout/AdminLayout';
import { adminOrdersAPI } from '@/api/adminOrders';
import { Order, getOrderStatusLabel, getOrderStatusColor, getPaymentStatusLabel, getPaymentStatusColor } from '@/api/orders';
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, Scale, DollarSign, Undo2, X } from 'lucide-react';

type ResolutionAction = 'refund_buyer' | 'release_seller' | 'partial_refund';

export default function DisputedOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Resolution modal states
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState<ResolutionAction>('refund_buyer');
  const [refundPercentage, setRefundPercentage] = useState(100);
  const [forceResolve, setForceResolve] = useState(false);
  const [insufficientBalanceError, setInsufficientBalanceError] = useState<string | null>(null);

  useEffect(() => {
    fetchDisputedOrders();
  }, [page]);

  const fetchDisputedOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminOrdersAPI.getDisputedOrders(page);
      setOrders(response.orders);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Error fetching disputed orders:', err);
      setError(err.message || 'Failed to load disputed orders');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedOrder || !resolution) return;
    try {
      setActionLoading(true);
      setInsufficientBalanceError(null);
      const result = await adminOrdersAPI.resolveDispute(
        selectedOrder._id,
        resolution,
        action,
        action === 'partial_refund' ? refundPercentage : 100,
        forceResolve
      );
      if (result.warning) {
        alert(`Dispute resolved with warning: ${result.warning}`);
      } else {
        alert('Dispute resolved successfully!');
      }
      setShowResolveModal(false);
      setSelectedOrder(null);
      setResolution('');
      setAction('refund_buyer');
      setRefundPercentage(100);
      setForceResolve(false);
      fetchDisputedOrders();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to resolve dispute';
      // Check if it's an insufficient balance error
      if (errorMessage.includes('Insufficient escrow balance')) {
        setInsufficientBalanceError(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getActionLabel = (action: ResolutionAction) => {
    switch (action) {
      case 'refund_buyer':
        return 'Full Refund to Buyer';
      case 'release_seller':
        return 'Release to Seller';
      case 'partial_refund':
        return 'Partial Refund';
      default:
        return action;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-7 w-7 text-red-500" />
              Disputed Orders
            </h1>
            <p className="text-gray-600 mt-1">Review and resolve order disputes</p>
          </div>
          <button
            onClick={fetchDisputedOrders}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Dispute Resolution Guidelines</p>
              <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                <li><strong>Refund to Buyer:</strong> Use when seller failed to deliver or product significantly misrepresented</li>
                <li><strong>Release to Seller:</strong> Use when buyer is at fault or product delivered as described</li>
                <li><strong>Partial Refund:</strong> Use when both parties share responsibility</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Disputed Orders List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No disputed orders</p>
              <p className="text-sm text-gray-400 mt-1">All orders are running smoothly</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.map((order) => (
                <div key={order._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{order.productDetails.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(order.orderStatus)}`}>
                          {getOrderStatusLabel(order.orderStatus)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-gray-500">Buyer</p>
                          <p className="text-sm font-medium">{order.buyerId?.fullName || 'Guest'}</p>
                          <p className="text-xs text-gray-500">@{order.buyerId?.username || 'guest'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Seller</p>
                          <p className="text-sm font-medium">{order.sellerId?.fullName}</p>
                          <p className="text-xs text-gray-500">@{order.sellerId?.username}</p>
                        </div>
                      </div>

                      {order.dispute?.reason && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <p className="text-xs font-medium text-red-700">Dispute Reason:</p>
                          <p className="text-sm text-red-600 mt-1">{order.dispute.reason}</p>
                          {order.dispute.description && (
                            <p className="text-sm text-red-500 mt-1">{order.dispute.description}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(order.amount)}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(order.createdAt)}</p>

                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowResolveModal(true);
                        }}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                      >
                        <Scale className="h-4 w-4" />
                        Resolve Dispute
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Resolve Dispute Modal */}
      {showResolveModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Scale className="h-5 w-5 text-amber-500" />
                Resolve Dispute
              </h3>
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedOrder(null);
                  setResolution('');
                  setAction('refund_buyer');
                  setRefundPercentage(100);
                  setForceResolve(false);
                  setInsufficientBalanceError(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                Order: <strong>#{selectedOrder.orderNumber}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Amount: <strong>{formatCurrency(selectedOrder.amount)}</strong>
              </p>
              {selectedOrder.dispute?.reason && (
                <p className="text-sm text-gray-600 mt-2">
                  Reason: <span className="text-red-600">{selectedOrder.dispute.reason}</span>
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Action *</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="action"
                    value="refund_buyer"
                    checked={action === 'refund_buyer'}
                    onChange={(e) => setAction(e.target.value as ResolutionAction)}
                    className="text-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <Undo2 className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Full Refund to Buyer</p>
                      <p className="text-xs text-gray-500">Refund entire amount to buyer</p>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="action"
                    value="release_seller"
                    checked={action === 'release_seller'}
                    onChange={(e) => setAction(e.target.value as ResolutionAction)}
                    className="text-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Release to Seller</p>
                      <p className="text-xs text-gray-500">Release full payment to seller</p>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="action"
                    value="partial_refund"
                    checked={action === 'partial_refund'}
                    onChange={(e) => setAction(e.target.value as ResolutionAction)}
                    className="text-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">Partial Refund</p>
                      <p className="text-xs text-gray-500">Refund a percentage to buyer</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {action === 'partial_refund' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Refund Percentage</label>
                <select
                  value={refundPercentage}
                  onChange={(e) => setRefundPercentage(Number(e.target.value))}
                  className="w-full p-3 border border-gray-200 rounded-lg"
                >
                  <option value={75}>75% ({formatCurrency(selectedOrder.amount * 0.75)})</option>
                  <option value={50}>50% ({formatCurrency(selectedOrder.amount * 0.5)})</option>
                  <option value={25}>25% ({formatCurrency(selectedOrder.amount * 0.25)})</option>
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes *</label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Explain the resolution decision..."
                className="w-full p-3 border border-gray-200 rounded-lg resize-none h-24"
              />
            </div>

            {insufficientBalanceError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 mb-3">{insufficientBalanceError}</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceResolve}
                    onChange={(e) => setForceResolve(e.target.checked)}
                    className="rounded border-red-300 text-red-500 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-red-700">
                    Force resolve without fund movement
                  </span>
                </label>
                <p className="text-xs text-red-500 mt-1">
                  This will update the order status without moving funds in the escrow wallet.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedOrder(null);
                  setResolution('');
                  setAction('refund_buyer');
                  setRefundPercentage(100);
                  setForceResolve(false);
                  setInsufficientBalanceError(null);
                }}
                className="flex-1 py-2 border border-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveDispute}
                disabled={actionLoading || !resolution}
                className="flex-1 py-2 bg-amber-500 text-white rounded-lg disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
