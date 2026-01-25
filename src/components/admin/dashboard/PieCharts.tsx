'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DashboardStats } from '@/api/dashboard';

interface PieChartsProps {
  stats: DashboardStats;
}

const COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  indigo: '#6366F1',
  orange: '#F59E0B',
  red: '#EF4444',
  yellow: '#EAB308',
  teal: '#14B8A6',
  gray: '#6B7280',
};

export default function PieCharts({ stats }: PieChartsProps) {
  // User Status Distribution
  const userStatusData = [
    { name: 'Active Users', value: stats.overview.activeUsers, color: COLORS.green },
    { name: 'Deactivated', value: stats.overview.totalUsers - stats.overview.activeUsers, color: COLORS.gray },
  ];

  // Business Status Distribution
  const businessStatusData = [
    { name: 'Verified', value: stats.overview.verifiedBusinesses, color: COLORS.indigo },
    { name: 'Unverified', value: stats.overview.totalBusinesses - stats.overview.verifiedBusinesses, color: COLORS.orange },
  ];

  // Pending Items Distribution
  const pendingData = [
    { name: 'Reports', value: stats.pending.reports, color: COLORS.red },
    { name: 'Aadhaar', value: stats.pending.aadhaarVerifications, color: COLORS.yellow },
    { name: 'Business', value: stats.pending.businessVerifications, color: COLORS.teal },
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">Count: {data.value}</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    // Always show the value
    return entry.value.toString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      {/* User Status Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Status</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
            <Pie
              data={userStatusData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
              minAngle={5}
            >
              {userStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={50}
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value, entry) => (
                <span style={{ color: entry.color }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Business Status Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Status</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
            <Pie
              data={businessStatusData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
              minAngle={5}
            >
              {businessStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={50}
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value, entry) => (
                <span style={{ color: entry.color }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Pending Items Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Items</h3>
        {pendingData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
              <Pie
                data={pendingData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={renderCustomLabel}
                labelLine={false}
                minAngle={5}
              >
                {pendingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={50}
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
              <p className="text-gray-600">No pending items</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}