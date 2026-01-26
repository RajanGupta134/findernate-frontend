"use client";

import { HelpCircle, LogOut, Shield, ChevronRight, X, Lock, Unlock, Building2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/api/auth";
import { useUserStore } from "@/store/useUserStore";
import { PaymentMethodsModal } from "./business/PaymentMethodModal";
import PlanSelectionModal from "./business/PlanSelectionModal";
import BusinessDetailsModal from "./business/BusinessDetailsModal";
import BusinessVerificationModal from "./business/BusinessVerificationModal";
import BankDetailsModal from "./business/BankDetailsModal";
import SuccessToast from "@/components/SuccessToast"; // Update path as needed
// import { CreateBusinessRequest, UpdateBusinessRequest } from "@/types";
import { useEffect } from "react";
import { getUserProfile } from "@/api/user";
import { HelpCenterModal } from "./HelpCenterModal";
import PrivacySettings from "./PrivacySettings";
// import { toast } from "react-toastify";


const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  //const [muteNotifications, setMuteNotifications] = useState(false);
  //const [hideAddress, setHideAddress] = useState(false);
  //const [hideNumber, setHideNumber] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showBusinessPlans, setShowBusinessPlans] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBusinessDetailsModal, setShowBusinessDetailsModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showEditBusinessDetails, setShowEditBusinessDetails] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [successToast, setSuccessToast] = useState({ show: false, message: "" });
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [accountPrivacy, setAccountPrivacy] = useState<'public' | 'private'>('public');
  const [isFullPrivate, setIsFullPrivate] = useState<boolean>(false);
  const router = useRouter();
  const { logout: logoutUser, user, updateUser } = useUserStore();
  const [isBusinessProfile, setIsBusinessProfile] = useState<boolean>(user?.isBusinessProfile === true);

  // Hydrate business flag and privacy settings from backend to avoid stale store values
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getUserProfile();
        
        const profile = data?.userId ?? data; // tolerate either shape
        if (isMounted) {
          if (typeof profile?.isBusinessProfile === 'boolean') {
            setIsBusinessProfile(profile.isBusinessProfile);
            updateUser({ isBusinessProfile: profile.isBusinessProfile });
          }
          // Persist onboarding completion flag from profile load if available
          // Hydrate nested completion flag if provided
          const nestedCompleted = (profile as any)?.business?.isProfileCompleted ?? (profile as any)?.businessProfile?.isProfileCompleted;
          if (typeof nestedCompleted === 'boolean') {
            updateUser({ isProfileCompleted: nestedCompleted });
          } else if (typeof (profile as any)?.isProfileCompleted === 'boolean') {
            updateUser({ isProfileCompleted: (profile as any).isProfileCompleted });
          }
          
          if (profile?.privacy) {
            setAccountPrivacy(profile.privacy);
          }
          // Set full private state based on privacy field or a dedicated fullPrivate field
          if (typeof profile?.isFullPrivate === 'boolean') {
            setIsFullPrivate(profile.isFullPrivate);
          } else if (profile?.privacy === 'private') {
            // If no specific fullPrivate field, assume full privacy when privacy is private
            setIsFullPrivate(true);
          }
        }
      } catch {
        // ignore; fallback to store
      }
    })();
    return () => { isMounted = false; };
  }, [updateUser]);

  // Helper: if not a business profile, open upgrade flow; otherwise run the action
  const requireBusiness = (action?: () => void) => () => {
    if (!isBusinessProfile) {
      setShowBusinessPlans(true);
      return;
    }
    if (action) action();
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirmation(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      setIsLoggingOut(true);
      // Call the logout API
      await logout();
      // Clear user store
      logoutUser();
      localStorage.removeItem('token');
      // Close the confirmation modal
      setShowLogoutConfirmation(false);
      // Close the settings modal
      onClose();
      // Redirect to login page
      router.push('/signin');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if API fails, clear local state and redirect
      logoutUser();
      localStorage.removeItem('token');
      setShowLogoutConfirmation(false);
      onClose();
      router.push('/signin');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirmation(false);
  };

  const handleUpgradeClick = () => {
    setShowBusinessPlans(true);
  };


  const handlePlanSelect = (plan: string) => {
    setSelectedPlan(plan);
    setShowBusinessPlans(false);
    if (plan === "Small Business" || plan === "Corporate") {
      setShowPaymentModal(true);
    }
    // If "Free", handle free upgrade logic here if needed
  };

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
  };



  const handleBusinessDetailsSubmit = () => {
    // API call will be handled inside the modal component
    setShowBusinessDetailsModal(false);
    setSuccessToast({ show: true, message: "Business details created successfully!" });
    setTimeout(() => setSuccessToast({ show: false, message: "" }), 3000); // Hide after 3 seconds
    onClose()
    // Optionally show a success message or refresh data
    
    // Immediately reflect upgrade in client store
    try { updateUser({ isBusinessProfile: true, isProfileCompleted: true }); } catch {}
  };

  const handleEditBusinessDetailsSubmit = () => {
    // API call will be handled inside the modal component  
    setShowEditBusinessDetails(false);
    setSuccessToast({ show: true, message: "Business details updated successfully!" });
    setTimeout(() => {setSuccessToast({ show: false, message: "" });
     onClose()
    }, 3000);
   
    // Optionally show a success message or refresh data
    
  };

  return (
    <>
      {!showVerificationModal && (
      <div 
        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        onClick={onClose}
      >
          <div 
            className="bg-white w-full max-w-md max-h-[90vh] rounded-xl shadow-lg overflow-y-auto hide-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white px-4 py-4 flex items-center justify-center border-b border-gray-200">
          {/* <ChevronLeft
            className="w-6 h-6 text-gray-600 absolute left-4 cursor-pointer hover:text-gray-800 transition-colors"
            onClick={onClose}
          /> */}
          <h1 className="text-2xl font-medium text-black">Settings</h1>
          <X
            className="w-6 h-6 text-gray-600 absolute right-4 cursor-pointer hover:text-gray-800 transition-colors"
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="px-4 py-2">
          <SettingItem
            icon={<Shield />}
            title="Upgrade Business Profile"
            onClick={handleUpgradeClick}
          />
          {/* <SettingItem
            icon={<Globe />}
            title="Language"
            right={
              <div className="flex items-center gap-2 text-gray-600">
                <span>English</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            }
          />
          <SettingToggle
            icon={<Volume2 />}
            title="Mute Notification"
            enabled={muteNotifications}
            onToggle={() => setMuteNotifications(!muteNotifications)}
          />
          <SettingItem icon={<Bell />} title="Custom Notification" /> */}
          {/* <SettingItem icon={<User />} title="Account" />
          <SettingItem icon={<Layers />} title="About App" /> */}
          <SettingItem 
            icon={<HelpCircle />} 
            title="Help Center" 
            onClick={() => setShowHelpCenter(true)}
          />
          <SettingItem
            icon={accountPrivacy === 'private' ? <Lock /> : <Unlock />}
            title="Privacy Settings"
            onClick={() => setShowPrivacySettings(true)}
          />
        </div>

        <div className="h-px bg-gray-200 mx-4"></div>

        <div className="px-4 py-6">
          <h2 className="text-gray-500 font-medium text-sm mb-4">Business Info</h2>
          <div className="space-y-0">
            {!user?.isProfileCompleted && (
              <SettingItem
                icon={<Shield />}
                title="Add Your Business Details"
                onClick={() => setShowBusinessDetailsModal(true)}
              />
            )}
            <SettingItem 
              icon={<Shield />} 
              title="View/Edit Your Business Details" 
              onClick={requireBusiness(() => setShowEditBusinessDetails(true))}
            />
            <SettingItem
              icon={<Shield />}
              title="Complete your KYC"
              onClick={requireBusiness(() => setShowVerificationModal(true))}
            />
            <SettingItem
              icon={<Building2 />}
              title="Bank Account Details"
              onClick={requireBusiness(() => setShowBankDetailsModal(true))}
            />
            {/* <SettingItem
              icon={<Shield />}
              title="Promote Your Business"
              onClick={requireBusiness()}
            /> */}
            {/* TODO: Add back in when we have a way to hide the address and number */}
            {/* <SettingToggle
              icon={<MapPin />}
              title="Hide Address"
              enabled={hideAddress}
              onToggle={requireBusiness(() => setHideAddress(!hideAddress))}
            />
            <SettingToggle
              icon={<Phone />}
              title="Hide Number"
              enabled={hideNumber}
              onToggle={requireBusiness(() => setHideNumber(!hideNumber))}
            /> */}
          </div>
        </div>

        <div className="h-px bg-gray-200 mx-4"></div>

        <div className="px-4 py-2">
          <button 
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-between py-4 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="text-red-500 font-medium">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            </div>
            {isLoggingOut ? (
              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
        
        <SuccessToast show={successToast.show} message={successToast.message} />
      </div>
    </div>
      )}

    {/* Logout Confirmation Modal */}
    {showLogoutConfirmation && (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
        <div className="bg-white w-full max-w-sm mx-4 rounded-xl shadow-lg p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            
            <div className="flex gap-3">
              <button
                onClick={handleLogoutCancel}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                disabled={isLoggingOut}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoggingOut ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Logging out...
                  </div>
                ) : (
                  'Logout'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Plan Selection Modal */}
    <PlanSelectionModal
      isOpen={showBusinessPlans}
      onClose={() => setShowBusinessPlans(false)}
      onSelectPlan={handlePlanSelect}
    />
    
    {/* Payment Modal */}
    <PaymentMethodsModal
      isOpen={showPaymentModal}
      onClose={handlePaymentModalClose}
    />
    
    {/* Business Details Modal - CREATE MODE (after payment) */}
    <BusinessDetailsModal
      isOpen={showBusinessDetailsModal}
      onClose={() => setShowBusinessDetailsModal(false)}
      onSubmit={handleBusinessDetailsSubmit}
      // isEdit is false by default, so it will use POST API
    />
    
    {/* Edit Business Details Modal - EDIT MODE */}
    <BusinessDetailsModal
      isOpen={showEditBusinessDetails}
      onClose={() => setShowEditBusinessDetails(false)}
      onSubmit={handleEditBusinessDetailsSubmit}
      isEdit={true} // This will fetch data on mount and use PATCH API
    />

    {/* Business Verification Modal */}
    <BusinessVerificationModal
      isOpen={showVerificationModal}
      onClose={() => { setShowVerificationModal(false); onClose(); }}
      onSubmit={() => {
        // Don't close immediately - let the BusinessVerificationModal handle its own closing
        // The modal will auto-close after showing the success message
      }}
    />

    {/* Bank Details Modal */}
    <BankDetailsModal
      isOpen={showBankDetailsModal}
      onClose={() => setShowBankDetailsModal(false)}
      onSuccess={() => {
        setShowBankDetailsModal(false);
        setSuccessToast({ show: true, message: "Bank details saved successfully!" });
        setTimeout(() => setSuccessToast({ show: false, message: "" }), 3000);
      }}
    />

    {/* Help Center Modal */}
    <HelpCenterModal
      isOpen={showHelpCenter}
      onClose={() => setShowHelpCenter(false)}
    />

    {/* Privacy Settings Modal */}
    {showPrivacySettings && (
      <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center" onClick={() => setShowPrivacySettings(false)}>
        <div className="bg-white w-full max-w-lg mx-4 rounded-xl shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 z-10 bg-white px-6 py-4 flex items-center justify-between border-b border-gray-200 rounded-t-xl">
            <h2 className="text-xl font-semibold text-gray-900">Privacy Settings</h2>
            <button
              onClick={() => setShowPrivacySettings(false)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
          <div className="p-6">
            <PrivacySettings
              userPrivacy={accountPrivacy}
              isFullPrivate={isFullPrivate}
              onPrivacyUpdate={(privacy) => setAccountPrivacy(privacy as 'public' | 'private')}
              onFullPrivacyUpdate={(fullPrivate) => setIsFullPrivate(fullPrivate)}
            />
          </div>
        </div>
      </div>
    )}
  </>
  );
};

const SettingItem = ({
  icon,
  title,
  right,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) => (
  <div
    className="flex items-center justify-between py-4 cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-center gap-3">
      <span className="text-gray-600">{icon}</span>
      <span className="text-gray-900 font-medium">{title}</span>
    </div>
    {right ?? <ChevronRight className="w-5 h-5 text-gray-400" />}
  </div>
);

// Unused component retained for future toggles
/*
const SettingToggle = ({
  icon,
  title,
  enabled,
  onToggle,
  isLoading = false,
}: {
  icon: React.ReactNode;
  title: string;
  enabled: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}): JSX.Element => (
  <div className="flex items-center justify-between py-4">
    <div className="flex items-center gap-3">
      <span className="text-gray-600">{icon}</span>
      <span className="text-gray-900 font-medium">{title}</span>
    </div>
    <label className={`inline-flex items-center ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={enabled}
        onChange={onToggle}
        disabled={isLoading}
      />
      <div
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
          enabled ? "bg-gray-400" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
            enabled ? "translate-x-6" : "translate-x-0.5"
          }`}
        ></div>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </label>
  </div>
);
*/

export default SettingsModal;