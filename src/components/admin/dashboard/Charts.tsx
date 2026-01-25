'use client';

import { BarChart3, TrendingUp } from 'lucide-react';

export default function Charts() {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Analytics Overview</h2>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600 font-medium">+12.5%</span>
        </div>
      </div>

      {/* User Growth Chart */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">User Growth</h3>
        <div className="h-32 bg-gray-50 rounded-lg p-4">
          <div className="flex items-end justify-between h-full">
            {[1200, 1350, 1500, 1680, 1850, 2100, 2250].map((value, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="bg-gradient-to-t from-yellow-400 to-yellow-600 rounded-t w-8"
                  style={{ height: `${(value / 2500) * 100}%` }}
                />
                <span className="text-xs text-gray-500 mt-1">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][index]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Engagement Rate</span>
            <BarChart3 className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">4.8%</div>
          <div className="text-xs text-green-600 mt-1">+0.3% from last week</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Content Creation</span>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">89</div>
          <div className="text-xs text-green-600 mt-1">+7 posts today</div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Content by Category</h3>
        <div className="space-y-3">
          {[
            { category: 'Food & Beverage', count: 245, percentage: 22.5, color: 'bg-blue-500' },
            { category: 'Photography', count: 156, percentage: 14.3, color: 'bg-green-500' },
            { category: 'Fashion & Jewelry', count: 134, percentage: 12.3, color: 'bg-purple-500' },
            { category: 'Technology', count: 89, percentage: 8.2, color: 'bg-yellow-500' },
          ].map((item) => (
            <div key={item.category} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-700">{item.category}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color.replace('bg-', 'bg-')}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gradient Button Examples */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Gradient Button Variants</h3>
        <div className="flex flex-wrap gap-3">
          <button className="btn-gradient-sm">Small</button>
          <button className="btn-gradient">Standard</button>
          <button className="btn-gradient-lg">Large</button>
          <button className="btn-primary">Primary</button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          All buttons use the yellow gradient theme matching the original website
        </p>
      </div>
    </div>
  );
}