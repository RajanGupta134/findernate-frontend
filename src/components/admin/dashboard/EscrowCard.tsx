'use client';

import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Clock, AlertTriangle, CheckCircle, RefreshCw, IndianRupee } from 'lucide-react';
import { dashboardAPI, EscrowDashboard } from '@/api/dashboard';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function EscrowCard() {
  const [escrowData, setEscrowData] = useState<EscrowDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEscrowData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await dashboardAPI.getEscrowDashboard();
      if (response.success) {
        setEscrowData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch escrow data');
      }
    } catch (err: any) {
      console.error('Error fetching escrow data:', err);
      setError(err.message || 'Failed to load escrow data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEscrowData();
  }, []);

  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-yellow-500" />
            Escrow Wallet
          </h2>
        </div>
        <p className="text-red-600 text-center py-4">{error}</p>
        <button
          onClick={fetchEscrowData}
          className="mx-auto block px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!escrowData) return null;

  const { wallet, orderStats } = escrowData;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-yellow-500" />
          Escrow Wallet
        </h2>
        <button
          onClick={fetchEscrowData}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Wallet Balances */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Total Balance</span>
          </div>
          <p className="text-2xl font-bold text-yellow-800">{formatCurrency(wallet.totalBalance)}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-700">Held</span>
          </div>
          <p className="text-2xl font-bold text-orange-800">{formatCurrency(wallet.heldBalance)}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Released</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{formatCurrency(wallet.releasedBalance)}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Refunded</span>
          </div>
          <p className="text-2xl font-bold text-red-800">{formatCurrency(wallet.refundedBalance)}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Platform Earnings</span>
          </div>
          <p className="text-2xl font-bold text-purple-800">{formatCurrency(wallet.platformEarnings)}</p>
        </div>
      </div>

      {/* Order Stats */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Order Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Release</p>
              <p className="text-lg font-bold text-gray-900">{orderStats.pendingRelease}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Disputed</p>
              <p className="text-lg font-bold text-gray-900">{orderStats.disputed}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-lg font-bold text-gray-900">{orderStats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      {wallet.lastUpdated && (
        <p className="text-xs text-gray-400 mt-4 text-right">
          Last updated: {new Date(wallet.lastUpdated).toLocaleString('en-IN')}
        </p>
      )}
    </div>
  );
}
