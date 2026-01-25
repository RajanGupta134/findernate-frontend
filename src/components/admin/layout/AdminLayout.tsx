'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/store';
import Sidebar from './Sidebar';
import '@/app/admin/admin.css';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, user, initializeAuth } = useAdminStore();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize authentication on mount
  useEffect(() => {
    //console.log('🏗️ AdminLayout: Initializing auth...');
    initializeAuth();
    setIsInitialized(true);
  }, [initializeAuth]);

  // Check authentication after initialization
  useEffect(() => {
    if (isInitialized) {
      //console.log('🏗️ AdminLayout: Auth state changed - isAuthenticated:', isAuthenticated, 'user:', !!user);
      if (!isAuthenticated) {
        //console.log('🏗️ AdminLayout: Not authenticated, redirecting to login...');
        router.push('/admin/login');
      }
    }
  }, [isAuthenticated, router, isInitialized]);

  // Show loading until initialized and authenticated
  if (!isInitialized || !isAuthenticated || !user) {
    //console.log('🏗️ AdminLayout: Showing loading state - initialized:', isInitialized, 'isAuthenticated:', isAuthenticated, 'user:', !!user);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Sidebar />
        <div className="ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffd65c] mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading admin panel...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-10 mt-2">
        <main className="min-h-screen p-1">
          {children}
        </main>
      </div>
    </div>
  );
}