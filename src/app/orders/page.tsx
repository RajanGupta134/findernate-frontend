'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  getBuyerOrderHistory,
  getSellerOrderHistory,
  getBuyerOrderStatistics,
  getSellerOrderStatistics,
  exportOrdersToCSV,
  reportIssue,
  Order,
  OrderHistoryFilters,
  BuyerStatistics,
  SellerStatistics,
  getOrderStatusLabel,
  getOrderStatusColor,
  getPaymentStatusLabel,
  getPaymentStatusColor,
} from '@/api/orders';
import { useUserStore } from '@/store/useUserStore';
import { Download, Search, TrendingUp, Package, Filter, X, AlertTriangle } from 'lucide-react';

type TabType = 'buying' | 'selling';
type ViewMode = 'orders' | 'statistics';

const OrdersPage = () => {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabType>('buying');
  const [viewMode, setViewMode] = useState<ViewMode>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [statistics, setStatistics] = useState<BuyerStatistics | SellerStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [filters, setFilters] = useState<OrderHistoryFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [orderStats, setOrderStats] = useState<any>(null);

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (viewMode === 'orders') {
      fetchOrders();
    } else {
      fetchStatistics();
    }
  }, [activeTab, filters, user, viewMode]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response =
        activeTab === 'buying'
          ? await getBuyerOrderHistory(filters)
          : await getSellerOrderHistory(filters);

      setOrders(response.orders);
      setTotalPages(response.totalPages);
      setTotalOrders(response.total);
      setOrderStats(response.stats);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response =
        activeTab === 'buying'
          ? await getBuyerOrderStatistics()
          : await getSellerOrderStatistics();

      setStatistics(response);
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportOrdersToCSV(
        activeTab === 'buying' ? 'buyer' : 'seller',
        filters.status,
        filters.startDate,
        filters.endDate
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error exporting orders:', err);
      alert('Failed to export orders');
    }
  };

  const updateFilter = (key: keyof OrderHistoryFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1, // Reset to page 1 when filters change
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  const openDisputeModal = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation(); // Prevent navigation to order details
    setSelectedOrder(order);
    setDisputeReason('');
    setDisputeDescription('');
    setShowDisputeModal(true);
  };

  const handleDispute = async () => {
    if (!selectedOrder || !disputeReason) return;
    try {
      setDisputeLoading(true);
      await reportIssue(selectedOrder._id, disputeReason, disputeDescription);
      setShowDisputeModal(false);
      setSelectedOrder(null);
      alert('Dispute submitted successfully. The payment is held until resolution by admin.');
      fetchOrders(); // Refresh orders to show updated status
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit dispute');
    } finally {
      setDisputeLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg text-gray-700 font-semibold ml-2">Order History</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'orders' ? 'statistics' : 'orders')}
                className="p-2 hover:bg-gray-100 rounded-full"
                title={viewMode === 'orders' ? 'View Statistics' : 'View Orders'}
              >
                {viewMode === 'orders' ? <TrendingUp className="w-5 h-5 text-gray-800" /> : <Package className="w-5 h-5 text-gray-800" />}
              </button>
              {viewMode === 'orders' && (
                <button
                  onClick={handleExport}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  title="Export to CSV"
                >
                  <Download className="w-5 h-5 text-gray-900 " />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-b">
            <button
              onClick={() => {
                setActiveTab('buying');
                setFilters((prev) => ({ ...prev, page: 1 }));
              }}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
                activeTab === 'buying'
                  ? 'border-[#ffd65c] text-[#ffd65c]'
                  : 'border-transparent text-gray-800 hover:text-gray-700'
              }`}
            >
              My Purchases
            </button>
            {user.isBusinessProfile && (
              <button
                onClick={() => {
                  setActiveTab('selling');
                  setFilters((prev) => ({ ...prev, page: 1 }));
                }}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
                  activeTab === 'selling'
                    ? 'border-[#ffd65c] text-[#ffd65c]'
                    : 'border-transparent text-gray-800 hover:text-gray-700'
                }`}
              >
                My Sales
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {viewMode === 'orders' ? (
          <>
            {/* Stats Summary */}
            {orderStats && (
              <div className="grid text-gray-900 grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-700 mb-1">Total Orders</p>
                  <p className="text-2xl font-semibold">{orderStats.totalOrders || 0}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-700 mb-1">
                    {activeTab === 'buying' ? 'Total Spent' : 'Total Earned'}
                  </p>
                  <p className="text-2xl font-semibold text-[#ffd65c]">
                    {formatCurrency(activeTab === 'buying' ? orderStats.totalSpent : orderStats.totalEarned || 0)}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-700 mb-1">Completed</p>
                  <p className="text-2xl font-semibold text-green-600">{orderStats.completedOrders || 0}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-700 mb-1">Pending</p>
                  <p className="text-2xl font-semibold text-blue-600">{orderStats.pendingOrders || 0}</p>
                </div>
              </div>
            )}

            {/* Filter Toggle */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-[#ffd65c] transition"
              >
                <Filter className="w-4 h-4 text-gray-700" />
                <span className="text-sm text-gray-700">Filters</span>
              </button>

              {(filters.search || filters.status || filters.startDate || filters.minAmount) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-900 hover:text-gray-800 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="bg-white rounded-xl p-4 mb-4 shadow-sm space-y-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by order number or product name..."
                      value={filters.search || ''}
                      onChange={(e) => updateFilter('search', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 text-gray-600 rounded-lg focus:outline-none focus:border-[#ffd65c]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={filters.startDate || ''}
                      onChange={(e) => updateFilter('startDate', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 text-gray-600 rounded-lg focus:outline-none focus:border-[#ffd65c]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={filters.endDate || ''}
                      onChange={(e) => updateFilter('endDate', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 text-gray-600 rounded-lg focus:outline-none focus:border-[#ffd65c]"
                    />
                  </div>

                  {/* Amount Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={filters.minAmount || ''}
                      onChange={(e) => updateFilter('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full px-4 py-2 border border-gray-200 text-gray-600 rounded-lg focus:outline-none focus:border-[#ffd65c]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="10000"
                      value={filters.maxAmount || ''}
                      onChange={(e) => updateFilter('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full px-4 py-2 border border-gray-200 text-gray-600 rounded-lg focus:outline-none focus:border-[#ffd65c]"
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Order Status</label>
                    <select
                      value={filters.status || ''}
                      onChange={(e) => updateFilter('status', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 text-gray-600 rounded-lg focus:outline-none focus:border-[#ffd65c]"
                    >
                      <option value="">All Statuses</option>
                      <option value="payment_received">Payment Received</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="disputed">Disputed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>

                  {/* Payment Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Payment Status</label>
                    <select
                      value={filters.paymentStatus || ''}
                      onChange={(e) => updateFilter('paymentStatus', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 text-gray-600 rounded-lg focus:outline-none focus:border-[#ffd65c]"
                    >
                      <option value="">All Payment Status</option>
                      <option value="pending">Pending</option>
                      <option value="held">Held in Escrow</option>
                      <option value="released">Released</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                {/* Sort Options */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                    <select
                      value={filters.sortBy || 'createdAt'}
                      onChange={(e) => updateFilter('sortBy', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 text-gray-600 rounded-lg focus:outline-none focus:border-[#ffd65c]"
                    >
                      <option value="createdAt">Date</option>
                      <option value="amount">Amount</option>
                      <option value="orderStatus">Status</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <select
                      value={filters.sortOrder || 'desc'}
                      onChange={(e) => updateFilter('sortOrder', e.target.value as 'asc' | 'desc')}
                      className="w-full px-4 py-2 border border-gray-200  text-gray-600 rounded-lg focus:outline-none focus:border-[#ffd65c]"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ffd65c]"></div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
                <p className="text-red-600">{error}</p>
                <button onClick={fetchOrders} className="mt-2 text-sm text-red-700 underline">
                  Try again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && orders.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No orders found</h3>
                <p className="text-sm text-gray-500">
                  {filters.search || filters.status
                    ? 'Try adjusting your filters'
                    : activeTab === 'buying'
                    ? 'Your purchases will appear here'
                    : 'Orders from customers will appear here'}
                </p>
              </div>
            )}

            {/* Orders List */}
            {!loading && !error && orders.length > 0 && (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    onClick={() => router.push(`/orders/${order._id}`)}
                    className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition"
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {order.postId?.media?.[0] ? (
                          <Image
                            src={order.postId.media[0].thumbnailUrl || order.postId.media[0].url}
                            alt={order.productDetails.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : order.productDetails.images?.[0] ? (
                          <Image
                            src={order.productDetails.images[0]}
                            alt={order.productDetails.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-800 truncate">{order.productDetails.name}</h3>
                            <p className="text-sm text-gray-500">
                              {activeTab === 'buying' ? (
                                <>Seller: {order.sellerId?.fullName || order.sellerId?.username}</>
                              ) : (
                                <>Buyer: {order.buyerId?.fullName || order.buyerId?.username}</>
                              )}
                            </p>
                          </div>
                          <p className="font-semibold text-[#ffd65c]">{formatCurrency(order.amount)}</p>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(
                              order.orderStatus
                            )}`}
                          >
                            {getOrderStatusLabel(order.orderStatus)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                              order.paymentStatus
                            )}`}
                          >
                            {getPaymentStatusLabel(order.paymentStatus)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">Order #{order.orderNumber}</p>
                          <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                        </div>

                        {/* Dispute Button - For buyers on eligible orders */}
                        {activeTab === 'buying' &&
                          !order.dispute &&
                          !['cancelled', 'refunded', 'payment_pending'].includes(order.orderStatus) && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <button
                              onClick={(e) => openDisputeModal(e, order)}
                              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              Dispute
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => updateFilter('page', Math.max(1, (filters.page || 1) - 1))}
                  disabled={filters.page === 1}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-500 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {filters.page} of {totalPages} ({totalOrders} total orders)
                </span>
                <button
                  onClick={() => updateFilter('page', Math.min(totalPages, (filters.page || 1) + 1))}
                  disabled={filters.page === totalPages}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-500 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Statistics View */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ffd65c]"></div>
              </div>
            )}

            {!loading && statistics && (
              <div className="space-y-6">
                {/* Overall Stats */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg text-gray-700 font-semibold mb-4">Overall Statistics</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Orders</p>
                      <p className="text-2xl text-black font-semibold mt-1">{statistics.overall.totalOrders}</p>
                    </div>
                    {'totalSpent' in statistics.overall && (
                      <div>
                        <p className="text-sm text-gray-500">Total Spent</p>
                        <p className="text-2xl font-semibold mt-1 text-[#ffd65c]">
                          {formatCurrency(statistics.overall.totalSpent)}
                        </p>
                      </div>
                    )}
                    {'totalRevenue' in statistics.overall && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Total Revenue</p>
                          <p className="text-2xl font-semibold mt-1 text-[#ffd65c]">
                            {formatCurrency(statistics.overall.totalRevenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Earned</p>
                          <p className="text-2xl font-semibold mt-1 text-green-600">
                            {formatCurrency(statistics.overall.totalEarned)}
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Average Order</p>
                      <p className="text-2xl text-gray-500 font-semibold mt-1">
                        {formatCurrency(statistics.overall.averageOrderValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Completed</p>
                      <p className="text-2xl font-semibold mt-1 text-green-600">{statistics.overall.completedOrders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pending</p>
                      <p className="text-2xl font-semibold mt-1 text-blue-600">{statistics.overall.pendingOrders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Disputed</p>
                      <p className="text-2xl font-semibold mt-1 text-red-600">{statistics.overall.disputedOrders}</p>
                    </div>
                  </div>
                </div>

                {/* Monthly Trend */}
                {statistics.monthlyTrend && statistics.monthlyTrend.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg text-gray-800 font-semibold mb-4">Last 6 Months Trend</h2>
                    <div className="space-y-2">
                      {statistics.monthlyTrend.map((trend, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="text-sm text-gray-600">
                            {getMonthName(trend._id.month)} {trend._id.year}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 font-medium">
                              {'totalSpent' in trend && formatCurrency(trend.totalSpent || 0)}
                              {'totalRevenue' in trend && formatCurrency(trend.totalRevenue || 0)}
                            </span>
                            <span className="text-sm text-gray-500">{trend.orderCount} orders</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category/Product Stats */}
                {'categoryStats' in statistics && statistics.categoryStats.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg text-gray-800 font-semibold mb-4">Top Categories</h2>
                    <div className="space-y-2">
                      {statistics.categoryStats.map((cat, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="text-sm text-gray-600">{cat._id || 'Uncategorized'}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 font-medium">{formatCurrency(cat.totalSpent)}</span>
                            <span className="text-sm text-gray-500">{cat.orderCount} orders</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {'productStats' in statistics && statistics.productStats.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Top Products</h2>
                    <div className="space-y-2">
                      {statistics.productStats.map((prod, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="text-sm text-gray-600">{prod._id}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">{formatCurrency(prod.totalRevenue)}</span>
                            <span className="text-sm text-gray-500">{prod.orderCount} sales</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ratings (for sellers) */}
                {'ratings' in statistics && statistics.ratings.totalRatings > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Customer Ratings</h2>
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-4xl font-bold text-[#ffd65c]">
                          {statistics.ratings.averageRating.toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Average Rating</p>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">{statistics.ratings.totalRatings}</p>
                        <p className="text-sm text-gray-500 mt-1">Total Reviews</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Breakdown */}
                {statistics.statusBreakdown && statistics.statusBreakdown.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg text-gray-800 font-semibold mb-4">Order Status Breakdown</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {statistics.statusBreakdown.map((status, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">{getOrderStatusLabel(status._id as any)}</p>
                          <p className="text-xl text-gray-500 font-semibold mt-1">{status.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Dispute Order</h3>
            <p className="text-sm text-gray-600 mb-4">
              Submit a dispute for order #{selectedOrder.orderNumber}. The payment will be held until the issue is resolved by admin.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full p-3 border border-gray-200 text-gray-600 rounded-lg focus:outline-none focus:border-[#ffd65c]"
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
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="w-full p-3 border border-gray-200 text-gray-600 rounded-lg resize-none h-24 focus:outline-none focus:border-[#ffd65c]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDisputeModal(false);
                  setSelectedOrder(null);
                }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDispute}
                disabled={disputeLoading || !disputeReason}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disputeLoading ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
