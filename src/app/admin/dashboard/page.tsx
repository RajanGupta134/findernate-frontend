'use client';

import AdminLayout from '@/components/admin/layout/AdminLayout';
import StatCards from '@/components/admin/dashboard/StatCards';
import EscrowCard from '@/components/admin/dashboard/EscrowCard';

export default function DashboardPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back! Here's what's happening with your platform today.
          </p>
        </div>

        {/* Escrow Wallet Card */}
        <EscrowCard />

        {/* Stats Cards */}
        <StatCards />
      </div>
    </AdminLayout>
  );
}