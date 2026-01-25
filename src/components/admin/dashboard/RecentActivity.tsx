'use client';

import { Clock, User, FileText, Flag, Building2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const activities = [
  {
    id: 1,
    type: 'user',
    title: 'New user registered',
    description: 'John Doe joined the platform',
    time: '2 minutes ago',
    icon: User,
    color: 'text-blue-500',
  },
  {
    id: 2,
    type: 'post',
    title: 'New post created',
    description: 'Sarah Jones posted about photography services',
    time: '5 minutes ago',
    icon: FileText,
    color: 'text-green-500',
  },
  {
    id: 3,
    type: 'report',
    title: 'Report submitted',
    description: 'Spam report for post #123',
    time: '10 minutes ago',
    icon: Flag,
    color: 'text-red-500',
  },
  {
    id: 4,
    type: 'business',
    title: 'Business verified',
    description: 'Tech Solutions Inc. verified successfully',
    time: '15 minutes ago',
    icon: Building2,
    color: 'text-purple-500',
  },
  {
    id: 5,
    type: 'user',
    title: 'User suspended',
    description: 'Mike Wilson account suspended for violations',
    time: '1 hour ago',
    icon: User,
    color: 'text-red-500',
  },
  {
    id: 6,
    type: 'post',
    title: 'Post approved',
    description: 'Emma Davis product post approved',
    time: '2 hours ago',
    icon: FileText,
    color: 'text-green-500',
  },
];

export default function RecentActivity() {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        <button className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
          View all
        </button>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg bg-gray-50 ${activity.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                <p className="text-sm text-gray-600">{activity.description}</p>
                <div className="flex items-center mt-1">
                  <Clock className="h-3 w-3 text-gray-400 mr-1" />
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button className="w-full text-sm text-gray-600 hover:text-gray-900 font-medium">
          Load more activity
        </button>
      </div>
    </div>
  );
}