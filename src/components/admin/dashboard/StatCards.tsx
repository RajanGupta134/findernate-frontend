'use client';

import { Users, Flag, Building2, UserCheck, AlertTriangle, UserPlus, Clock, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { dashboardAPI, DashboardStats } from '@/api/dashboard';
import PieCharts from './PieCharts';

export default function StatCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await dashboardAPI.getDashboardStats();
      
      if (response.success) {
        setStats(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch stats');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message || 'Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchDashboardStats}
          className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: 'Total Users',
      value: stats.overview.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Users',
      value: stats.overview.activeUsers,
      icon: UserCheck,
      color: 'bg-green-500',
    },
    {
      title: 'Total Businesses',
      value: stats.overview.totalBusinesses,
      icon: Building2,
      color: 'bg-purple-500',
    },
    {
      title: 'Verified Businesses',
      value: stats.overview.verifiedBusinesses,
      icon: Shield,
      color: 'bg-indigo-500',
    },
    {
      title: 'Total Reports',
      value: stats.overview.totalReports,
      icon: Flag,
      color: 'bg-orange-500',
    },
    {
      title: 'Pending Reports',
      value: stats.pending.reports,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      title: 'Pending Aadhaar',
      value: stats.pending.aadhaarVerifications,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'Pending Business',
      value: stats.pending.businessVerifications,
      icon: Clock,
      color: 'bg-teal-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <PieCharts stats={stats} />
    </div>
  );
}