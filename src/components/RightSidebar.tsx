"use client";

import SuggestedUsers from '@/components/SuggestedUsers';
import TrendingBusiness from '@/components/TrendingBusiness';
import { useUserStore } from '@/store/useUserStore';
import Link from 'next/link';

export default function RightSidebar() {
  const { user } = useUserStore();

  return (
    <div className="p-6 h-full space-y-6">
      {/* Login/Signup buttons for non-authenticated users */}
      {!user && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Join Findernate</h3>
          <div className="flex gap-2">
            <Link 
              href="/signin" 
              className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center"
            >
              Login
            </Link>
            <Link 
              href="/signup" 
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-yellow-600 hover:to-orange-600 transition-colors text-center"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
      
      <SuggestedUsers />
      <TrendingBusiness />
    </div>
  );
}