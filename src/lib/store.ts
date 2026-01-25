import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AdminUser, Notification } from '@/types/admin';
import { adminAPI } from '@/api/admin';

interface AuthState {
  user: AdminUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AdminUser) => void;
  clearError: () => void;
  initializeAuth: () => void;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, '_id' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

interface AdminStore extends AuthState, NotificationState, UIState {}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      // Auth State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      login: async (email: string, password: string) => {
        try {
          //console.log('🔐 Admin Login: Starting login process...');
          set({ isLoading: true, error: null });

          const response = await adminAPI.login({ email, password });
          //console.log('🔐 Admin Login: API response received:', response);
          
          if (response.success) {
            const { admin, accessToken, refreshToken } = response.data;
            //console.log('🔐 Admin Login: Login successful, storing data...');
            
            // Store tokens and admin data in localStorage for persistence
            if (typeof window !== 'undefined') {
              localStorage.setItem('adminAccessToken', accessToken);
              localStorage.setItem('adminRefreshToken', refreshToken);
              localStorage.setItem('adminUser', JSON.stringify(admin));
            }
            
            set({
              user: admin,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            
            //console.log('🔐 Admin Login: State updated successfully');
            //console.log('🔐 Admin Login: isAuthenticated =', true);
          } else {
            console.error('🔐 Admin Login: API returned success=false');
            throw new Error(response.message || 'Login failed');
          }
        } catch (error: any) {
          console.error('🔐 Admin Login: Error occurred:', error);
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Login failed',
          });
          throw error;
        }
      },
      
      logout: async () => {
        try {
          //console.log('🚪 Logout: Starting logout process...');
          set({ isLoading: true });
          
          // Try to call logout API
          try {
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/logout`, {
              method: 'POST',
              credentials: 'include'
            });
          } catch (apiError) {
            //console.log('🚪 Logout: API call failed, but continuing with local logout:', apiError);
          }
          
          // Clear stored data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminAccessToken');
            localStorage.removeItem('adminRefreshToken');
          }
          
          set({ 
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            notifications: [],
            unreadCount: 0
          });
          
          //console.log('🚪 Logout: Logout completed successfully');
        } catch (error: any) {
          console.error('🚪 Logout: Error during logout:', error);
          // Even if everything fails, clear local state
          if (typeof window !== 'undefined') {
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminAccessToken');
            localStorage.removeItem('adminRefreshToken');
          }
          
          set({ 
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Logout failed',
            notifications: [],
            unreadCount: 0
          });
        }
      },
      
      setUser: (user: AdminUser) => {
        //console.log('🏪 Store: Setting user and marking as authenticated:', user);
        set({ 
          user, 
          isAuthenticated: true,
          error: null 
        });
      },

      clearError: () => set({ error: null }),

      initializeAuth: () => {
        try {
          //console.log('🔄 InitAuth: Starting auth initialization...');
          if (typeof window === 'undefined') {
            // Skip initialization on server-side
            return;
          }

          const storedAccessToken = localStorage.getItem('adminAccessToken');
          const storedRefreshToken = localStorage.getItem('adminRefreshToken');
          const storedAdminString = localStorage.getItem('adminUser');

          //console.log('🔄 InitAuth: Stored data check:', {
          //  hasAccessToken: !!storedAccessToken,
          //  hasRefreshToken: !!storedRefreshToken,
          //  hasAdmin: !!storedAdminString
          // });

          if (storedAccessToken && storedRefreshToken && storedAdminString) {
            try {
              const storedAdmin = JSON.parse(storedAdminString);
              //console.log('🔄 InitAuth: All data found, restoring auth state...');
              set({
                user: storedAdmin,
                accessToken: storedAccessToken,
                refreshToken: storedRefreshToken,
                isAuthenticated: true,
              });
              //console.log('🔄 InitAuth: Auth state restored successfully');
            } catch (parseError) {
              console.error('🔄 InitAuth: Error parsing stored admin data:', parseError);
              // Clear corrupted data
              if (typeof window !== 'undefined') {
                localStorage.removeItem('adminUser');
                localStorage.removeItem('adminAccessToken');
                localStorage.removeItem('adminRefreshToken');
              }
              set({
                user: null,
                accessToken: null,
                refreshToken: null,
                isAuthenticated: false,
              });
            }
          } else {
            //console.log('🔄 InitAuth: Missing data, clearing auth state...');
            // If any piece is missing, clear everything
            if (typeof window !== 'undefined') {
              localStorage.removeItem('adminUser');
              localStorage.removeItem('adminAccessToken');
              localStorage.removeItem('adminRefreshToken');
            }
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
            });
          }
        } catch (error) {
          console.error('🔄 InitAuth: Error during initialization:', error);
          // If there's an error reading from storage, clear everything
          if (typeof window !== 'undefined') {
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminAccessToken');
            localStorage.removeItem('adminRefreshToken');
          }
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },
  
  // Notification State
  notifications: [],
  unreadCount: 0,
  
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      _id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    set(state => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
  
  markAsRead: (id: string) => {
    set(state => ({
      notifications: state.notifications.map(notif =>
        notif._id === id ? { ...notif, isRead: true } : notif
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },
  
  markAllAsRead: () => {
    set(state => ({
      notifications: state.notifications.map(notif => ({ ...notif, isRead: true })),
      unreadCount: 0,
    }));
  },
  
  removeNotification: (id: string) => {
    set(state => ({
      notifications: state.notifications.filter(notif => notif._id !== id),
      unreadCount: state.notifications.find(n => n._id === id)?.isRead ? state.unreadCount : Math.max(0, state.unreadCount - 1),
    }));
  },
  
  // UI State
  sidebarCollapsed: false,
  
  toggleSidebar: () => {
    set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },
  
  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },
}),
{
  name: 'admin-auth', // Key for localStorage
  storage: createJSONStorage(() => {
    // Only use localStorage on the client-side
    if (typeof window !== 'undefined') {
      return localStorage;
    }
    // Return a no-op storage for server-side
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }),
  partialize: (state) => ({
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    isAuthenticated: state.isAuthenticated,
  }),
  onRehydrateStorage: () => (state) => {
    //console.log('💾 Persist: Rehydrating state from localStorage:', state);
  },
}
)
);