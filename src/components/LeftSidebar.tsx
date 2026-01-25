"use client";

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { discoverItems, navigationItems } from '@/constants/uiItems';
import { Plus, LogOut } from 'lucide-react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useMessageCounts } from '@/hooks/useMessageCounts';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { callAPI } from './../api/call';
import { useUserStore } from '@/store/useUserStore';
import { logout } from '@/api/auth';

interface leftSidebarProps {
	togglePost?: () => void;
	onItemClick?: () => void;
}

export default function LeftSidebar({togglePost, onItemClick}: leftSidebarProps) {
	const { isAuthenticated } = useAuthGuard();
	const { totalCount } = useMessageCounts();
	const { unreadNotifications, unreadMessages } = useUnreadCounts();
	const [isActive, setIsActive] = useState(0);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();

  // Compute active index from current route so programmatic navigations are reflected
  useEffect(() => {
    const allItems = [...navigationItems, ...discoverItems];
    let activeIndex = -1;
    // Prefer exact match for home route
    if (pathname === '/') {
      activeIndex = allItems.findIndex((item) => item.route === '/');
    } else {
      // Find first whose route is a prefix of pathname (excluding '/')
      activeIndex = allItems.findIndex(
        (item) => item.route !== '/' && pathname.startsWith(item.route)
      );
    }
    if (activeIndex === -1) activeIndex = 0;
    setIsActive(activeIndex);
    try {
      localStorage.setItem('sidebarActiveIndex', String(activeIndex));
    } catch {}
  }, [pathname]);

	const router = useRouter();
	const { logout: logoutUser } = useUserStore();

	const handleLogout = async () => {
		try {
			setIsLoggingOut(true);
			await logout(); // API call
			logoutUser(); // Clear store
			localStorage.removeItem('token');
			router.push('/signin');
		} catch (error) {
			console.error('Logout failed:', error);
			// Even if API fails, clear local state and redirect
			logoutUser();
			localStorage.removeItem('token');
			router.push('/signin');
		} finally {
			setIsLoggingOut(false);
		}
	};

  return (
	<div className="h-full flex flex-col">
	  {/* Logo - Fixed at top */}
	  <Link href="/">
	  <div className='sticky top-0 bg-white z-10 border-b pl-3 pr-6 pt-6 pb-4'>
	  <div className="mb-4">
		<div className="flex items-center w-[13rem]">
		  <Image
		  src={'/Findernate_Logo.png'}
		  alt='Company-Logo'
		  width={220}
		  height={160}
		  className="text-xl font-bold p-0 m-0 object-contain"
		/>
		</div>
	  </div>
	  </div>
	  </Link>

	  {/* Scrollable content area */}
	  <div className="flex-1 overflow-y-auto px-6 pb-6">
		{/* Navigation */}
		<nav className="mb-8 mt-2">
		  <ul className="space-y-2">
			{navigationItems.map((item, index) => (
			  <li key={index}>
				<button
				  onClick={()=> {
                   setIsActive(index);
                   localStorage.setItem('sidebarActiveIndex', String(index));
                   router.push(item.route);
                   onItemClick?.();
                 }}
				  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
					index===isActive
					  ? 'bg-[#fefdf5] text-[#cc9b2e] border border-[#e6c045] font-medium'
					  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>
				  {item.label === 'Reels' ? (
					<item.icon className="w-6 h-6 border-0" />
				  ) : (
					<item.icon className="w-6 h-6" />
				  )}
				  <span className="flex-1 text-left">{item.label}</span>
				  {item.label === 'Messages' && unreadMessages > 0 && (
					<span className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5">
					  {unreadMessages > 99 ? '99+' : unreadMessages}
					</span>
				  )}
				  {item.label === 'Notifications' && unreadNotifications > 0 && (
					<span className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5">
					  {unreadNotifications > 99 ? '99+' : unreadNotifications}
					</span>
				  )}
				</button>
			  </li>
			))}
		  </ul>
		</nav>

		{/* Create Post Button - Only show for authenticated users */}
		{isAuthenticated && (
		  <div className="mb-8">
			<Button 
			onClick={togglePost}
			variant='custom' 
			className="flex gap-3 w-full h-[3rem] bg-[#ffd65c] hover:bg-[#e6c045] text-black font-medium py-3 rounded-xl transition-all duration-600 shadow-sm hover:shadow-md transform hover:scale-105">
			  <Plus size={20}/> Create Post
			</Button>
		  </div>
		)}

		{/* Discover Section */}
		<div>
		  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
			Discover
		  </h3>
		  <ul className="space-y-2">
			{discoverItems.map((item, i) => {
			  const index = navigationItems.length + i;
			  return(
			  <li key={index}>
				<button 
				  onClick={()=> {
 					  setIsActive(index);
                     localStorage.setItem('sidebarActiveIndex', String(index));
                     router.push(item.route);
                     onItemClick?.();
				  }}
					className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200
							  ${index===isActive
							  ? 'bg-[#fefdf5] text-[#cc9b2e] border border-[#e6c045] font-medium'
							  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>
				  <item.icon className="w-6 h-6" />
				  <span>{item.label}</span>
				</button>
			  </li>
			  )
			})}
		  </ul>
		</div>

		{/* Logout Section */}
		<div className="mt-8 pt-6 border-t border-gray-200">
		  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
			Account
		  </h3>
		  <button
			onClick={handleLogout}
			disabled={isLoggingOut}
			className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
		  >
			<LogOut className="w-6 h-6" />
			<span className="flex-1 text-left font-medium">
			  {isLoggingOut ? 'Logging out...' : 'Logout'}
			</span>
		  </button>
		</div>
	  </div>
	</div>
  );
}