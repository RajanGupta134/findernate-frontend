'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/layout/AdminLayout';
import { adminOrdersAPI } from '@/api/adminOrders';
import { Order, getOrderStatusLabel, getOrderStatusColor, getPaymentStatusLabel, getPaymentStatusColor } from '@/api/orders';
import { ShoppingBag, Search, Filter, ChevronLeft, ChevronRight, Eye, DollarSign, RefreshCw, CheckCircle } from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [confirmReason, setConfirmReason] = useState('');
  const [refundPercentage, setRefundPercentage] = useState(100);

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, paymentFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminOrdersAPI.getAllOrders(
        statusFilter || undefined,
        paymentFilter || undefined,
        page
      );
      setOrders(response.orders);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePayment = async () => {
    if (!selectedOrder || !releaseReason) return;
    try {
      setActionLoading(true);
      await adminOrdersAPI.manualReleasePayment(selectedOrder._id, releaseReason);
      alert('Payment released successfully!');
      setShowReleaseModal(false);
      setSelectedOrder(null);
      setReleaseReason('');
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to release payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundPayment = async () => {
    if (!selectedOrder || !refundReason) return;
    try {
      setActionLoading(true);
      await adminOrdersAPI.manualRefundPayment(selectedOrder._id, refundReason, refundPercentage);
      alert('Payment refunded successfully!');
      setShowRefundModal(false);
      setSelectedOrder(null);
      setRefundReason('');
      setRefundPercentage(100);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to refund payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder || !confirmReason) return;
    try {
      setActionLoading(true);
      await adminOrdersAPI.manualConfirmPayment(selectedOrder._id, confirmReason);
      alert('Payment confirmed and released successfully!');
      setShowConfirmModal(false);
      setSelectedOrder(null);
      setConfirmReason('');
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm payment');
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-7 w-7 text-yellow-500" />
              All Orders
            </h1>
            <p className="text-gray-600 mt-1">Manage and monitor all platform orders</p>
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-black"
            >
              <option value="">All Statuses</option>
              <option value="payment_received">Payment Received</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="confirmed">Confirmed</option>
              <option value="disputed">Disputed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-black"
            >
              <option value="">All Payments</option>
              <option value="pending">Pending</option>
              <option value="held">Held in Escrow</option>
              <option value="released">Released</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{order.productDetails.name}</p>
                          <p className="text-xs text-gray-500">#{order.orderNumber}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{order.buyerId?.fullName || 'Guest'}</p>
                        <p className="text-xs text-gray-500">@{order.buyerId?.username || 'guest'}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{order.sellerId?.fullName}</p>
                        <p className="text-xs text-gray-500">@{order.sellerId?.username}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(order.amount)}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.orderStatus)}`}>
                          {getOrderStatusLabel(order.orderStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                          {getPaymentStatusLabel(order.paymentStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {order.paymentStatus === 'pending' && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowConfirmModal(true);
                              }}
                              className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                              title="Confirm Payment"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {order.paymentStatus === 'held' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowReleaseModal(true);
                                }}
                                className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                title="Release Payment"
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowRefundModal(true);
                                }}
                                className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                title="Refund Payment"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {/* Release Payment Modal */}
      {showReleaseModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Release Payment</h3>
            <p className="text-sm text-gray-600 mb-2">
              Order: <strong>#{selectedOrder.orderNumber}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Amount: <strong>{formatCurrency(selectedOrder.amount)}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <textarea
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                placeholder="Enter reason for manual release..."
                className="w-full p-3 border border-gray-200 rounded-lg resize-none h-24"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReleaseModal(false);
                  setSelectedOrder(null);
                  setReleaseReason('');
                }}
                className="flex-1 py-2 border border-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReleasePayment}
                disabled={actionLoading || !releaseReason}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Payment Modal */}
      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Refund Payment</h3>
            <p className="text-sm text-gray-600 mb-2">
              Order: <strong>#{selectedOrder.orderNumber}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Amount: <strong>{formatCurrency(selectedOrder.amount)}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Refund Percentage</label>
              <select
                value={refundPercentage}
                onChange={(e) => setRefundPercentage(Number(e.target.value))}
                className="w-full p-3 border border-gray-200 rounded-lg"
              >
                <option value={100}>100% - Full Refund ({formatCurrency(selectedOrder.amount)})</option>
                <option value={75}>75% ({formatCurrency(selectedOrder.amount * 0.75)})</option>
                <option value={50}>50% ({formatCurrency(selectedOrder.amount * 0.5)})</option>
                <option value={25}>25% ({formatCurrency(selectedOrder.amount * 0.25)})</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund..."
                className="w-full p-3 border border-gray-200 rounded-lg resize-none h-24"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setSelectedOrder(null);
                  setRefundReason('');
                  setRefundPercentage(100);
                }}
                className="flex-1 py-2 border border-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRefundPayment}
                disabled={actionLoading || !refundReason}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {showConfirmModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-black">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-black">
            <h3 className="text-black font-semibold mb-4">Confirm Payment</h3>
            <p className="text-sm text-gray-600 mb-2">
              Order: <strong>#{selectedOrder.orderNumber}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Amount: <strong>{formatCurrency(selectedOrder.amount)}</strong>
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                <strong>Demo/Sandbox Mode:</strong> This will simulate the complete payment flow
                (payment verification → escrow hold → instant release). The order will be marked as
                &quot;Confirmed&quot; and payment as &quot;Released&quot;.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <textarea
                value={confirmReason}
                onChange={(e) => setConfirmReason(e.target.value)}
                placeholder="e.g., Demo approval, Sandbox testing, Manual verification..."
                className="w-full p-3 border border-gray-200 rounded-lg resize-none h-24"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedOrder(null);
                  setConfirmReason('');
                }}
                className="flex-1 py-2 border border-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={actionLoading || !confirmReason}
                className="flex-1 py-2 bg-blue-500 text-black rounded-lg disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm & Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
