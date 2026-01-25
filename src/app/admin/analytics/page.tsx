'use client';

import AdminLayout from '@/components/admin/layout/AdminLayout';

export default function AnalyticsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-2">
              Platform analytics and insights
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="btn-secondary">
              Export Data
            </button>
            <button className="btn-primary">
              Generate Report
            </button>
          </div>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">2,250</div>
              <div className="text-sm text-gray-600">Total Users</div>
              <div className="text-xs text-green-600 mt-1">+12.5% from last month</div>
            </div>
          </div>
          <div className="card p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">1,089</div>
              <div className="text-sm text-gray-600">Total Posts</div>
              <div className="text-xs text-green-600 mt-1">+8.2% from last month</div>
            </div>
          </div>
          <div className="card p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">156</div>
              <div className="text-sm text-gray-600">Active Businesses</div>
              <div className="text-xs text-green-600 mt-1">+5.7% from last month</div>
            </div>
          </div>
          <div className="card p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">4.8%</div>
              <div className="text-sm text-gray-600">Engagement Rate</div>
              <div className="text-xs text-green-600 mt-1">+0.3% from last week</div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>User Growth Chart</p>
                <p className="text-sm">Will display user registration trends over time</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Distribution</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <p>Content Distribution Chart</p>
                <p className="text-sm">Will display content by category and type</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Analytics */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">89%</div>
              <div className="text-sm text-gray-600">User Retention</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">2.3M</div>
              <div className="text-sm text-gray-600">Total Views</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">45K</div>
              <div className="text-sm text-gray-600">Daily Active Users</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}