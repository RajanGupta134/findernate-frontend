'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/layout/AdminLayout';
import { adminOrdersAPI, EscrowTransaction, EscrowDashboard } from '@/api/adminOrders';
import { Receipt, ChevronLeft, ChevronRight, RefreshCw, ArrowDownCircle, ArrowUpCircle, Pause, Play, Undo2, Wallet } from 'lucide-react';

type TransactionType = '' | 'hold' | 'release' | 'refund';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [dashboard, setDashboard] = useState<EscrowDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TransactionType>('');

  useEffect(() => {
    fetchData();
  }, [page, typeFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [transactionsResponse, dashboardResponse] = await Promise.all([
        adminOrdersAPI.getEscrowTransactions(
          typeFilter || undefined,
          page,
          20
        ),
        adminOrdersAPI.getEscrowDashboard()
      ]);

      setTransactions(transactionsResponse.transactions);
      setTotalPages(transactionsResponse.totalPages);
      setDashboard(dashboardResponse);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
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
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'hold':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'release':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'refund':
        return <Undo2 className="h-4 w-4 text-red-500" />;
      case 'credit':
        return <ArrowDownCircle className="h-4 w-4 text-blue-500" />;
      case 'debit':
        return <ArrowUpCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Receipt className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'hold':
        return 'bg-yellow-100 text-yellow-700';
      case 'release':
        return 'bg-green-100 text-green-700';
      case 'refund':
        return 'bg-red-100 text-red-700';
      case 'credit':
        return 'bg-blue-100 text-blue-700';
      case 'debit':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'hold':
        return 'Payment Held';
      case 'release':
        return 'Payment Released';
      case 'refund':
        return 'Payment Refunded';
      case 'credit':
        return 'Credit';
      case 'debit':
        return 'Debit';
      default:
        return type;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="h-7 w-7 text-blue-500" />
              Escrow Transactions
            </h1>
            <p className="text-gray-600 mt-1">View all escrow wallet transactions</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Dashboard Stats */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Balance</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(dashboard.wallet.totalBalance)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Pause className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Held Balance</p>
                  <p className="text-lg font-bold text-yellow-600">{formatCurrency(dashboard.wallet.heldBalance)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Play className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Released</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(dashboard.wallet.releasedBalance)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Undo2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Refunded</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(dashboard.wallet.refundedBalance)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Platform Earnings</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(dashboard.wallet.platformEarnings)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as TransactionType);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-black"
          >
            <option value="">All Transactions</option>
            <option value="hold">Payments Held</option>
            <option value="release">Payments Released</option>
            <option value="refund">Payments Refunded</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionColor(transaction.type)}`}>
                            {getTransactionLabel(transaction.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">#{transaction.orderNumber}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className={`text-sm font-medium ${
                          transaction.type === 'refund' ? 'text-red-600' :
                          transaction.type === 'release' ? 'text-green-600' :
                          'text-gray-900'
                        }`}>
                          {transaction.type === 'refund' ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {transaction.description || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.createdAt)}
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
    </AdminLayout>
  );
}
