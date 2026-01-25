'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/store';
import {
  BarChart3,
  Users,
  Flag,
  Building2,
  Settings,
  ChevronDown,
  ChevronRight,
  Home,
  Activity,
  Shield,
  UserCheck,
  FileSearch,
  UsersIcon,
  LogOut,
  MessageSquare,
  Wallet,
  ShoppingBag,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: Home,
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Report Management',
    href: '/admin/reports',
    icon: Flag,
  },
  {
    title: 'Business Management',
    icon: Building2,
    children: [
      { title: 'All Businesses', href: '/admin/businesses', icon: Building2 },
      { title: 'Pending Verifications', href: '/admin/businesses/pending', icon: FileSearch },
      // { title: 'Verification History', href: '/admin/businesses/history', icon: Activity },
    ],
  },
  {
    title: 'Aadhaar Verification',
    icon: UserCheck,
    children: [
      { title: 'Pending Verifications', href: '/admin/aadhaar/pending', icon: FileSearch },
      { title: 'Verification History', href: '/admin/aadhaar/history', icon: Activity },
    ],
  },
  // {
  //   title: 'Analytics',
  //   href: '/admin/analytics',
  //   icon: BarChart3,
  // },
  {
    title: 'Activity Log',
    href: '/admin/activity',
    icon: Activity,
  },
  {
    title: 'User Feedback',
    href: '/admin/feedback',
    icon: MessageSquare,
  },
  {
    title: 'Orders & Escrow',
    icon: Wallet,
    children: [
      { title: 'All Orders', href: '/admin/orders', icon: ShoppingBag },
      { title: 'Disputed Orders', href: '/admin/orders/disputes', icon: AlertTriangle },
      { title: 'Transactions', href: '/admin/orders/transactions', icon: Receipt },
    ],
  },
  // {
  //   title: 'Admin Management',
  //   icon: Shield,
  //   children: [
  //     { title: 'All Admins', href: '/admin/admins', icon: UsersIcon },
  //     { title: 'Create Admin', href: '/admin/admins/create', icon: Settings },
  //   ],
  // },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { user, logout } = useAdminStore();

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const handleLogout = async () => {
    try {
      //console.log('🚪 Sidebar: Starting logout...');
      
      // Call logout API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      //console.log('🚪 Sidebar: Logout API response:', response.status);
      
      // Clear all admin-related localStorage data
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('admin-auth'); // Zustand persist key
      
      // Clear store state
      await logout();
      
      //console.log('🚪 Sidebar: Logout completed, redirecting to login...');
      
      // Redirect to login page
      router.push('/admin/login');
      
    } catch (error) {
      console.error('🚪 Sidebar: Logout error:', error);
      
      // Even if API fails, clear local data and redirect
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('admin-auth');
      
      await logout();
      router.push('/admin/login');
    }
  };

  const isActive = (href: string) => pathname === href;
  const isExpanded = (title: string) => expandedItems.includes(title);

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 lg:block">
      <div className="h-full flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <img 
              src="/Findernate.ico" 
              alt="Findernate Logo" 
              className="h-10 w-10"
              style={{ color: 'inherit' }}
            />
            <p className='text-[#ffd65c] text-xl font-bold ml-2'>FiNDERNATE</p>
          </div>
        </div>

        {/* User Profile - Sticky */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              
              if (item.children) {
                return (
                  <li key={item.title}>
                    <button
                      onClick={() => toggleExpanded(item.title)}
                      className={cn(
                        "sidebar-item w-full justify-between",
                        isExpanded(item.title) && "bg-yellow-50 text-yellow-600"
                      )}
                    >
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 mr-3" />
                        <span>{item.title}</span>
                      </div>
                      {isExpanded(item.title) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    
                    {isExpanded(item.title) && (
                      <ul className="mt-2 ml-8 space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <li key={child.title}>
                              <Link
                                href={child.href}
                                className={cn(
                                  "sidebar-item text-sm",
                                  isActive(child.href) && "active"
                                )}
                              >
                                <ChildIcon className="h-4 w-4 mr-3" />
                                <span>{child.title}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className={cn(
                      "sidebar-item",
                      isActive(item.href) && "active"
                    )}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer with Sign Out - Always at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white mt-auto">
          <button
            onClick={handleLogout}
            className="sidebar-item w-full text-red-600 hover:bg-red-50 mb-3"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Sign Out</span>
          </button>
          <div className="text-xs text-gray-500 text-center">
            Admin Portal v1.0
          </div>
        </div>
      </div>
    </div>
  );
}