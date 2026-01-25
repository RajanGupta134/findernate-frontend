import { useAdminStore } from '@/lib/store';

export const useAdminPermissions = () => {
  const user = useAdminStore((state) => state.user);
  
  return {
    canViewAnalytics: user?.permissions?.viewAnalytics || false,
    canVerifyAadhaar: user?.permissions?.verifyAadhaar || false,
    canManageReports: user?.permissions?.manageReports || false,
    canManageUsers: user?.permissions?.manageUsers || false,
    canManageBusiness: user?.permissions?.manageBusiness || false,
    canAccessSystemSettings: user?.permissions?.systemSettings || false,
    canDeleteContent: user?.permissions?.deleteContent || false,
    canBanUsers: user?.permissions?.banUsers || false,
  };
};