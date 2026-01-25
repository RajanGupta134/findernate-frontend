'use client'
import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Menu, X } from 'lucide-react';
import LeftSidebar from "@/components/LeftSidebar";
import CreatePostModal from "@/components/CreatePostModal";
import PushNotificationProvider from "@/components/providers/PushNotificationProvider";
import { GlobalCallProvider } from "@/components/providers/GlobalCallProvider";
import { useCommentNotifications } from "@/hooks/useCommentNotifications";
import NotificationDebugInit from "@/components/utils/NotificationDebugInit";

const MainLayout = ({children}:{children:React.ReactNode}) => {

  const pathname = usePathname();
  const noSidebarRoutes = ['/onboarding','/signup', '/signin', '/forgot-password', '/reset-password', '/admin/login'];
  const isNoSidebar = noSidebarRoutes.some(path => pathname.startsWith(path));
  const [postToggle, setPostToggle] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Initialize comment notifications
  useCommentNotifications();

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // Changed from 768 to 1024 (lg breakpoint)
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false); // Close mobile sidebar on larger screens
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
		return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

	// Listen for global event to open mobile sidebar (used by reels page arrow)
	useEffect(() => {
		const handleOpenSidebar = () => {
			setSidebarOpen(true);
		};
		window.addEventListener('open-mobile-sidebar', handleOpenSidebar as EventListener);
		return () => {
			window.removeEventListener('open-mobile-sidebar', handleOpenSidebar as EventListener);
		};
	}, []);

  const handlePostOpen = () => setPostToggle(true);
  const handlePostClose = () => {
    setPostToggle(false);
  };

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);

    // Dispatch event when sidebar closes
    if (!newState) {
      try {
        const evt = new Event('close-mobile-sidebar');
        window.dispatchEvent(evt);
      } catch {}
    }
  };

  return (
    <PushNotificationProvider>
      <GlobalCallProvider>
        {/* Initialize notification debug utilities */}
        <NotificationDebugInit />

        {/* Hamburger Menu for mobile and medium screens (hidden on reels page) */}
        {!isNoSidebar && isMobile && !pathname.startsWith('/reels') && (
          <div className="fixed bottom-4 left-4 z-50 lg:hidden">
            <button
              onClick={toggleSidebar}
              className="p-3 bg-white rounded-full shadow-xl border border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-900"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        )}

        {/* Sidebar Overlay for mobile and medium screens */}
        {!isNoSidebar && isMobile && sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} />
        )}

        {/* Left Sidebar */}
        {!isNoSidebar && (
          <div className={`
            ${isMobile
              ? `fixed left-0 top-0 h-full bg-white border-r border-gray-200 overflow-y-auto z-50 transform transition-transform duration-300 ${
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`
              : 'w-64 fixed left-0 h-full bg-white border-r border-gray-200 overflow-y-auto hidden lg:block'
            }
            w-64
          `}>
            <LeftSidebar togglePost={handlePostOpen} onItemClick={() => {
              if (isMobile) {
                setSidebarOpen(false);
                // Dispatch event when sidebar closes
                try {
                  const evt = new Event('close-mobile-sidebar');
                  window.dispatchEvent(evt);
                } catch {}
              }
            }} />
          </div>
        )}

        {/* Create Post Modal - Rendered via Portal */}
        {postToggle && typeof document !== 'undefined' &&
          createPortal(
            <CreatePostModal closeModal={handlePostClose}/>,
            document.body
          )
        }

        <div className={`${!isNoSidebar && !isMobile ? 'lg:ml-64' : ''} min-h-screen bg-gray-50 overflow-x-hidden max-w-full`}>
          {children}
        </div>

        {/* Toast Container */}
        <ToastContainer
          style={{
            zIndex: 20000
          }}
        />
      </GlobalCallProvider>
    </PushNotificationProvider>
  )
}

export default MainLayout
