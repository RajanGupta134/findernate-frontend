import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AxiosError } from 'axios';
import PlanSelectionModal from './business/PlanSelectionModal';
import BusinessDetailsModal from './business/BusinessDetailsModal';
import BusinessVerificationModal from './business/BusinessVerificationModal';
import BankDetailsModal from './business/BankDetailsModal';
import FollowRequestManager from './FollowRequestManager';
import { ChevronDown, ShoppingBag, Building2 } from 'lucide-react';
import { UpdateBusinessCategory, UpdateBusinessSubCategory, GetBusinessCategory, switchToBusiness, switchToPersonal, toggleProductPosts, toggleServicePosts, getMyBusinessId, GetBusinessDetails } from '@/api/business';
import { useUserStore } from '@/store/useUserStore';
import { getUserProfile } from '@/api/user';
import { toast } from 'react-toastify';
import { toggleServiceAutofill, toggleProductAutofill, getServicePreviousData, getProductPreviousData } from '@/api/serviceAutofill';
import { getSubscriptionStatus, SubscriptionPlan } from '@/api/subscription';

const businessCategories = [
  'Technology & Software',
  'E-commerce & Retail',
  'Health & Wellness',
  'Education & Training',
  'Finance & Accounting',
  'Marketing & Advertising',
  'Real Estate',
  'Travel & Hospitality',
  'Food & Beverage',
  'Fashion & Apparel',
  'Automotive',
  'Construction & Engineering',
  'Legal & Consulting',
  'Entertainment & Media',
  'Art & Design',
  'Logistics & Transportation',
  'Agriculture & Farming',
  'Manufacturing & Industrial',
  'Non-profit & NGOs',
  'Telecommunications'
];

export default function AccountSettings() {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showBusinessDetailsModal, setShowBusinessDetailsModal] = useState(false);
  const [showEditBusinessDetails, setShowEditBusinessDetails] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionPlan>('free');
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [currentCategory, setCurrentCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [isLoadingCategory, setIsLoadingCategory] = useState(true);
  const [subCategory, setSubCategory] = useState('');
  const [subCategoryInput, setSubCategoryInput] = useState('');
  const [isSavingSubCategory, setIsSavingSubCategory] = useState(false);
  const [showSubCategoryInput, setShowSubCategoryInput] = useState(false);
  const [subCategoryMessage, setSubCategoryMessage] = useState('');
  const [showBusinessOptions, setShowBusinessOptions] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [servicePostsAllowed, setServicePostsAllowed] = useState(false);
  const [productPostsAllowed, setProductPostsAllowed] = useState(false);
  const [togglingService, setTogglingService] = useState(false);
  const [togglingProduct, setTogglingProduct] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [serviceAutofillEnabled, setServiceAutofillEnabled] = useState(false);
  const [productAutofillEnabled, setProductAutofillEnabled] = useState(false);
  const [togglingServiceAutofill, setTogglingServiceAutofill] = useState(false);
  const [togglingProductAutofill, setTogglingProductAutofill] = useState(false);
  const { user, updateUser } = useUserStore();
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  // Keep local flag in sync with store
  useEffect(() => {
    setIsBusiness(Boolean(user?.isBusinessProfile));
  }, [user?.isBusinessProfile]);


  // Hydrate from backend to avoid stale store values
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getUserProfile();
        const profile = data?.userId ?? data;
        const flag = Boolean(profile?.isBusinessProfile);
        const privacy = (profile?.privacy || 'public') as 'public' | 'private';

        if (isMounted) {
          setIsBusiness(flag);

          // Extract businessId from profile if available
          const profileBusinessId = profile?.businessId || profile?.business?._id || profile?.business?.id;
          if (profileBusinessId) {
            setBusinessId(profileBusinessId);
            // Also store in localStorage as backup
            localStorage.setItem('businessId', profileBusinessId);

          } else if (flag) {
            // If business account but no businessId in profile, try localStorage
            const storedBusinessId = localStorage.getItem('businessId');
            if (storedBusinessId) {
              setBusinessId(storedBusinessId);

            }
          }

          // Update user store with all relevant fields including privacy and toggle flags
          // Try to pick nested completion flag if provided by backend
          const nestedCompleted = (profile as any)?.business?.isProfileCompleted ?? (profile as any)?.businessProfile?.isProfileCompleted;
          updateUser({
            isBusinessProfile: flag,
            privacy: privacy,
            productEnabled: typeof profile?.productEnabled !== 'undefined' ? Boolean(profile.productEnabled) : undefined,
            serviceEnabled: typeof profile?.serviceEnabled !== 'undefined' ? Boolean(profile.serviceEnabled) : undefined,
            // Persist onboarding completion flag if backend returns it (may be nested under business profile)
            isProfileCompleted: typeof nestedCompleted === 'boolean' ? nestedCompleted : (typeof (profile as any)?.isProfileCompleted === 'boolean' ? (profile as any).isProfileCompleted : user?.isProfileCompleted)
          });

          // Initialize toggles from profile fields if available
          if (typeof profile?.serviceEnabled !== 'undefined') {
            setServicePostsAllowed(Boolean(profile.serviceEnabled));
          }
          if (typeof profile?.productEnabled !== 'undefined') {
            setProductPostsAllowed(Boolean(profile.productEnabled));
          }

          // Fetch autofill status for service and product
          if (flag) {
            try {
              const serviceAutofillResponse = await getServicePreviousData();
              if (serviceAutofillResponse?.data?.autoFillEnabled !== undefined) {
                setServiceAutofillEnabled(Boolean(serviceAutofillResponse.data.autoFillEnabled));
              }
            } catch (err) {
              console.error('Failed to fetch service autofill status:', err);
            }

            try {
              const productAutofillResponse = await getProductPreviousData();
              if (productAutofillResponse?.data?.autoFillEnabled !== undefined) {
                setProductAutofillEnabled(Boolean(productAutofillResponse.data.autoFillEnabled));
              }
            } catch (err) {
              console.error('Failed to fetch product autofill status:', err);
            }
          }
        }
      } catch {
        // ignore; fallback to store value
      }
    })();
    return () => { isMounted = false; };
  }, [updateUser]);

  // Fetch current business category and businessId on component mount
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!isBusiness) {
        setIsLoadingCategory(false);
        return;
      }

      try {
        // Fetch business category
        const categoryResponse = await GetBusinessCategory();
        setCurrentCategory(categoryResponse.data?.category || '');
        
        // Try to fetch business ID if not already set from user profile
        if (!businessId) {
          try {
            const id = await getMyBusinessId();
            if (id) {
              setBusinessId(id);
              
            }
          } catch {
            
          }
        }
      } catch (error: unknown) {
        console.error('Failed to fetch business data:', error);
        setCurrentCategory('');
      } finally {
        setIsLoadingCategory(false);
      }
    };

    fetchBusinessData();
  }, [isBusiness, businessId]);

  // Fetch current business subcategory
  useEffect(() => {
    const fetchSubCategory = async () => {
      if (!isBusiness) {
        setSubCategory('');
        setSubCategoryInput('');
        return;
      }

      try {
        const response = await GetBusinessCategory();
        const currentSubCategory = response.data?.subcategory || '';
        setSubCategory(currentSubCategory);
        setSubCategoryInput(currentSubCategory);
      } catch (error: unknown) {
        console.error('Failed to fetch business subcategory:', error);
        setSubCategory('');
        setSubCategoryInput('');
      }
    };

    fetchSubCategory();
  }, [isBusiness]);

  // Fallback: If business but completion flag missing, hydrate from business profile once
  useEffect(() => {
    const hydrateCompletionFromBusiness = async () => {
      if (!user?.isBusinessProfile) return;
      if (typeof user?.isProfileCompleted !== 'undefined') return;
      try {
        const resp = await GetBusinessDetails();
        const completed = Boolean(resp?.data?.business?.isProfileCompleted ?? resp?.data?.isProfileCompleted ?? false);
        updateUser({ isProfileCompleted: completed });
        
      } catch (e) {
        // ignore
      }
    };
    hydrateCompletionFromBusiness();
  }, [user?.isBusinessProfile, user?.isProfileCompleted, updateUser]);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showCategoryDropdown) return;
      const target = event.target as Node;
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoryDropdown]);

  const handleCategoryUpdate = async (category: string) => {
    try {
      setIsUpdatingCategory(true);
      setUpdateMessage('Updating category...');
      
      await UpdateBusinessCategory(category);
      setCurrentCategory(category);
      setUpdateMessage('Category updated successfully!');
      setTimeout(() => setUpdateMessage(''), 3000);
    } catch (error: unknown) {
      console.error('Failed to update category:', error);
      
      // Check if it's a 404 error (business profile not found)
      const axiosError = error as AxiosError<{ message?: string }>;
      if (axiosError.response?.status === 404) {
        setUpdateMessage('Business profile not found. Please add your business details first.');
        setTimeout(() => {
          setUpdateMessage('');
          setShowBusinessDetailsModal(true); // Open the business details modal
        }, 1000);
      } else {
        setUpdateMessage(axiosError.response?.data?.message || 'Failed to update category');
        setTimeout(() => setUpdateMessage(''), 5000);
      }
    } finally {
      setIsUpdatingCategory(false);
      setShowCategoryDropdown(false); // Close the dropdown
    }
  };

  const handleSaveSubCategory = async () => {
    if (!subCategoryInput.trim()) {
      toast.error('Subcategory cannot be empty.');
      return;
    }

    if (!currentCategory) {
      toast.error('Please set a business category first before adding a subcategory.');
      return;
    }

    try {
      setIsSavingSubCategory(true);
      setSubCategoryMessage('Saving subcategory...');
      
      await UpdateBusinessSubCategory(subCategoryInput.trim(), currentCategory);
      setSubCategory(subCategoryInput.trim());
      setSubCategoryMessage('Subcategory updated successfully!');
      setShowSubCategoryInput(false); // Hide input after successful save
      setTimeout(() => setSubCategoryMessage(''), 3000);
    } catch (error: unknown) {
      console.error('Failed to update subcategory:', error);
      
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || 'Failed to update subcategory';
      setSubCategoryMessage(errorMessage);
      toast.error(errorMessage);
      setTimeout(() => setSubCategoryMessage(''), 5000);
    } finally {
      setIsSavingSubCategory(false);
    }
  };

  const handleUpdateSubCategory = () => {
    setShowSubCategoryInput(true);
  };

  const handleCancelSubCategory = () => {
    setShowSubCategoryInput(false);
    setSubCategoryInput(subCategory); // Reset to current value
    setSubCategoryMessage('');
  };

  const handleBusinessDetailsSubmit = async () => {
    setShowBusinessDetailsModal(false);
    setIsBusiness(true);
    try { updateUser({ isBusinessProfile: true, isProfileCompleted: true }); } catch {}
    setUpdateMessage('Business account created successfully! You can now update your business category.');
    
    // Refresh the business category after creating the profile
    try {
      const response = await GetBusinessCategory();
      setCurrentCategory(response.data?.category || '');
    } catch {
      
    }
    // Mark onboarding as completed after adding business details
    try { updateUser({ isProfileCompleted: true }); } catch {}
    
    setTimeout(() => setUpdateMessage(''), 5000);
  };

  const handleEditBusinessDetailsSubmit = () => {
    // API call will be handled inside the modal component  
    setShowEditBusinessDetails(false);
    setUpdateMessage('Business details updated successfully!');
    setTimeout(() => {
      setUpdateMessage('');
      // Optionally close the settings modal
    }, 3000);
  };

  // Switch to business account
  const handleSwitchToBusiness = async () => {
    if (!isBusiness) {
    try {
        setIsSwitching(true);
        setUpdateMessage('Switching to business account...');
        const response = await switchToBusiness();
        
        // Extract and store businessId from response
        const businessIdFromResponse = response?.data?.businessId || response?.businessId;
        const profileCompletedFromResponse = response?.data?.businessProfile?.isProfileCompleted ?? response?.data?.isProfileCompleted ?? response?.isProfileCompleted;
        if (businessIdFromResponse) {
          setBusinessId(businessIdFromResponse);
          // Also store in localStorage as backup
          localStorage.setItem('businessId', businessIdFromResponse);
          
        } else {
          
        }
        
        // Update local state
        setIsBusiness(true);
        
        // Update user store - this will trigger real-time UI updates
        updateUser({ isBusinessProfile: true, isProfileCompleted: typeof profileCompletedFromResponse === 'boolean' ? profileCompletedFromResponse : (user?.isProfileCompleted ?? false) });
        
        // Force a small delay to ensure state propagation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setUpdateMessage('Successfully switched to business account!');
        try { toast.success('Switched to business account'); } catch {}
        setTimeout(() => setUpdateMessage(''), 3000);
      } catch (error: unknown) {
        console.error('Failed to switch to business:', error);
        const axiosError = error as AxiosError<{ message?: string }>;
        const errMsg = axiosError.response?.data?.message || 'Failed to switch to business account';
        setUpdateMessage(errMsg);
        try { toast.error(errMsg); } catch {}
        setTimeout(() => setUpdateMessage(''), 5000);
      } finally {
        setIsSwitching(false);
      }
    }
  };

  // Switch to personal account
  const handleSwitchToPersonal = async () => {
    if (isBusiness) {
    try {
        setIsSwitching(true);
        setUpdateMessage('Switching to personal account...');
        await switchToPersonal();
        
        // Clear businessId when switching to personal
        setBusinessId(null);
        localStorage.removeItem('businessId');
        
        
        // Update local state
        setIsBusiness(false);
        
        // Update user store - this will trigger real-time UI updates
        updateUser({ isBusinessProfile: false, isProfileCompleted: undefined });
        
        // Force a small delay to ensure state propagation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setUpdateMessage('Successfully switched to personal account!');
        try { toast.success('Switched to personal account'); } catch {}
        setTimeout(() => setUpdateMessage(''), 3000);
        
        // Hide business options when switching to personal
        setShowBusinessOptions(false);
      } catch (error: unknown) {
        console.error('Failed to switch to personal:', error);
        const axiosError = error as AxiosError<{ message?: string }>;
        const errMsg = axiosError.response?.data?.message || 'Failed to switch to personal account';
        setUpdateMessage(errMsg);
        try { toast.error(errMsg); } catch {}
        setTimeout(() => setUpdateMessage(''), 5000);
      } finally {
        setIsSwitching(false);
      }
    }
  };

  // Posts allowed toggles
  const handleToggleServicePosts = async () => {
    if (!isBusiness || togglingService) return;
    
    // Check if we have businessId
    if (!businessId) {
      try { toast.error('Business ID not found. Please try again.'); } catch {}
      return;
    }
    
    const previous = servicePostsAllowed;
    try {
      setTogglingService(true);
      setServicePostsAllowed(!previous);
      const response = await toggleServicePosts(businessId);
      // If backend returns a canonical value, try to honor it
      const backendValue = Boolean(response?.data?.servicePostsAllowed ?? response?.servicePostsAllowed ?? !previous);
      setServicePostsAllowed(backendValue);
      try { updateUser({ serviceEnabled: backendValue }); } catch {}
    } catch (error: unknown) {
      setServicePostsAllowed(previous);
      const axiosError = error as AxiosError<{ message?: string }>;
      const errMsg = axiosError.response?.data?.message || 'Failed to toggle service posts';
      try { toast.error(errMsg); } catch {}
    } finally {
      setTogglingService(false);
    }
  };

  const handleToggleProductPosts = async () => {
    if (!isBusiness || togglingProduct) return;
    
    // Check if we have businessId
    if (!businessId) {
      try { toast.error('Business ID not found. Please try again.'); } catch {}
      return;
    }
    
    const previous = productPostsAllowed;
    try {
      setTogglingProduct(true);
      setProductPostsAllowed(!previous);
      const response = await toggleProductPosts(businessId);
      const backendValue = Boolean(response?.data?.productPostsAllowed ?? response?.productPostsAllowed ?? !previous);
      setProductPostsAllowed(backendValue);
      try { updateUser({ productEnabled: backendValue }); } catch {}
    } catch (error: unknown) {
      setProductPostsAllowed(previous);
      const axiosError = error as AxiosError<{ message?: string }>;
      const errMsg = axiosError.response?.data?.message || 'Failed to toggle product posts';
      try { toast.error(errMsg); } catch {}
    } finally {
      setTogglingProduct(false);
    }
  };

  // Autofill toggle handlers
  const handleToggleServiceAutofill = async () => {
    if (togglingServiceAutofill) return;
    
    const previous = serviceAutofillEnabled;
    try {
      setTogglingServiceAutofill(true);
      setServiceAutofillEnabled(!previous);
      const response = await toggleServiceAutofill(!previous);
      const backendValue = Boolean(response?.data?.enableAutoFill ?? !previous);
      setServiceAutofillEnabled(backendValue);
      toast.success(`Service autofill ${backendValue ? 'enabled' : 'disabled'} successfully`);
    } catch (error: unknown) {
      setServiceAutofillEnabled(previous);
      const axiosError = error as AxiosError<{ message?: string }>;
      const errMsg = axiosError.response?.data?.message || 'Failed to toggle service autofill';
      toast.error(errMsg);
    } finally {
      setTogglingServiceAutofill(false);
    }
  };

  const handleToggleProductAutofill = async () => {
    if (togglingProductAutofill) return;

    const previous = productAutofillEnabled;
    try {
      setTogglingProductAutofill(true);
      setProductAutofillEnabled(!previous);
      const response = await toggleProductAutofill(!previous);
      const backendValue = Boolean(response?.data?.enableAutoFill ?? !previous);
      setProductAutofillEnabled(backendValue);
      toast.success(`Product autofill ${backendValue ? 'enabled' : 'disabled'} successfully`);
    } catch (error: unknown) {
      setProductAutofillEnabled(previous);
      const axiosError = error as AxiosError<{ message?: string }>;
      const errMsg = axiosError.response?.data?.message || 'Failed to toggle product autofill';
      toast.error(errMsg);
    } finally {
      setTogglingProductAutofill(false);
    }
  };

  // Fetch subscription status
  const fetchSubscriptionStatus = useCallback(async () => {
    if (!isBusiness) return;

    try {
      setIsLoadingSubscription(true);
      const status = await getSubscriptionStatus();
      setCurrentSubscription(status.tier || 'free');
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
      setCurrentSubscription('free');
    } finally {
      setIsLoadingSubscription(false);
    }
  }, [isBusiness]);

  // Fetch subscription status when business account is active
  useEffect(() => {
    if (isBusiness) {
      fetchSubscriptionStatus();
    }
  }, [isBusiness, fetchSubscriptionStatus]);

  // Listen for custom event to open upgrade plan modal
  useEffect(() => {
    const handleOpenUpgradeModal = () => {
      // Expand business options if not already expanded
      if (isBusiness) {
        setShowBusinessOptions(true);
        setShowPlanModal(true);
      }
    };

    window.addEventListener('openUpgradePlanModal', handleOpenUpgradeModal);
    return () => {
      window.removeEventListener('openUpgradePlanModal', handleOpenUpgradeModal);
    };
  }, [isBusiness]);

  // Handle successful upgrade
  const handleUpgradeSuccess = () => {
    fetchSubscriptionStatus();
    toast.success('Subscription upgraded successfully!');
  };

  // Get display name for current subscription
  const getSubscriptionDisplayName = (plan: SubscriptionPlan): string => {
    switch (plan) {
      case 'small_business':
        return 'Small Business';
      case 'corporate':
        return 'Corporate';
      default:
        return 'Free';
    }
  };

  return (
    <div id="account-settings-section" className="w-full mx-auto p-4 sm:p-6 bg-white">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-black">Account Settings</h1>
        {isBusiness && showBusinessOptions && (
          <button
            onClick={() => setShowBusinessOptions(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Collapse business options"
          >
            <ChevronDown className="w-4 h-4 rotate-180" />
            <span className="hidden sm:inline">Collapse</span>
          </button>
        )}
      </div>
      
      {/* Success Message */}
      {updateMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{updateMessage}</p>
        </div>
      )}

      
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">{isBusiness ? 'Business Account' : 'Personal Account'}</h2>
            {isBusiness ? (
              <button
                type="button"
                onClick={() => setShowBusinessOptions(!showBusinessOptions)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg text-sm sm:text-base font-medium"
              >
                <span>Manage Business</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showBusinessOptions ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <p className="text-sm sm:text-base text-gray-600">Switch to business account</p>
            )}
          </div>
          <button
            className={`px-4 sm:px-6 py-2 md:mr-4 lg:mr-6 cursor-pointer rounded-lg transition-colors bg-yellow-500 text-white hover:bg-yellow-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base md:w-56 lg:w-56`}
            onClick={() => {
              if (!isBusiness) {
                handleSwitchToBusiness();
              } else {
                handleSwitchToPersonal();
              }
            }}
            disabled={isSwitching}
          >
            {isSwitching ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Switching...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">{isBusiness ? 'Switch to Personal' : 'Switch to Business'}</span>
                <span className="sm:hidden">{isBusiness ? 'Switch to Personal' : 'Switch to Business'}</span>
              </>
            )}
          </button>
        </div>
      </div>

             {/* Business Category Section */}
        {isBusiness && showBusinessOptions && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-blue-50 rounded-lg border border-blue-100">
            <div>
                             <div className="flex items-center justify-between mb-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Business Category</h3>
                <div className="relative" ref={categoryDropdownRef}>
                  <button 
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    disabled={isUpdatingCategory}
                    className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base md:w-56 lg:w-56"
                  >
                    <span className="hidden sm:inline">{isUpdatingCategory ? 'Updating...' : 'Update Category'}</span>
                    <span className="sm:hidden">{isUpdatingCategory ? 'Updating...' : 'Update'}</span>
                    {isUpdatingCategory ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {showCategoryDropdown && (
                    <div className="absolute right-0 mt-2 w-48 sm:w-64 bg-white border border-gray-300 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                      {businessCategories.map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            handleCategoryUpdate(category);
                            setShowCategoryDropdown(false);
                          }}
                          className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-200 last:border-b-0 text-gray-800 font-medium transition-colors duration-150 text-sm sm:text-base"
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {isLoadingCategory ? (
                <p className="text-sm sm:text-base text-gray-500">Loading category...</p>
              ) : (
                <p className="text-sm sm:text-base text-blue-600">
                  Current category: {currentCategory || 'No category set'}
                </p>
              )}
              {updateMessage && (
                <p className={`text-xs sm:text-sm mt-1 ${updateMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                  {updateMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Business Sub-Category Section */}
        {isBusiness && showBusinessOptions && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-yellow-50 rounded-lg border border-green-100">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Business Sub-Category</h3>
                <div className="flex gap-2">
                  {showSubCategoryInput ? (
                    <>
                      <button
                        onClick={handleCancelSubCategory}
                        className="px-4 sm:px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base md:w-32 lg:w-32"
                      >
                        <span className="hidden sm:inline">Cancel</span>
                        <span className="sm:hidden">Cancel</span>
                      </button>
                      <button
                        onClick={handleSaveSubCategory}
                        disabled={isSavingSubCategory}
                        className="px-4 sm:px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base md:w-32 lg:w-32"
                      >
                        {isSavingSubCategory ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="hidden sm:inline">Saving...</span>
                            <span className="sm:hidden">Saving...</span>
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline">Save</span>
                            <span className="sm:hidden">Save</span>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleUpdateSubCategory}
                      className="px-4 sm:px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base md:w-56 lg:w-56"
                    >
                      <span className="hidden sm:inline">Update Subcategory</span>
                      <span className="sm:hidden">Update</span>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-3">
                Current subcategory: <span className="font-medium text-yellow-600">{subCategory || 'No subcategory set'}</span>
              </p>
              {showSubCategoryInput && (
                <input
                  type="text"
                  value={subCategoryInput}
                  onChange={(e) => setSubCategoryInput(e.target.value)}
                  placeholder="e.g., Photography, Web Design, Tutoring, Consulting"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm sm:text-base text-black placeholder-gray-600 mb-3"
                />
              )}
              {subCategoryMessage && (
                <p className={`text-xs sm:text-sm mt-1 ${subCategoryMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                  {subCategoryMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Add Business Details Section - hidden after profile completion */}
        {isBusiness && showBusinessOptions && !user?.isProfileCompleted && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-yellow-50 rounded-lg border border-yellow-100">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Add Business Details</h3>
                <button
                  onClick={() => setShowBusinessDetailsModal(true)}
                  className="px-4 sm:px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base md:w-56 lg:w-56"
                >
                  <span className="hidden sm:inline">Add Business Details</span>
                  <span className="sm:hidden">Add Details</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <p className="text-sm sm:text-base text-gray-700">
                Add your business information, contact details, and other relevant information.
              </p>
            </div>
          </div>
        )}

        {/* Edit Business Details Section */}
        {isBusiness && showBusinessOptions && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-orange-50 rounded-lg border border-orange-100">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Edit Business Details</h3>
                <button
                  onClick={() => setShowEditBusinessDetails(true)}
                  className="px-4 sm:px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base md:w-56 lg:w-56"
                >
                  <span className="hidden sm:inline">Edit Business Details</span>
                  <span className="sm:hidden">Edit Details</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm sm:text-base text-gray-700">
                View and edit your existing business information, contact details, and other relevant information.
              </p>
            </div>
          </div>
        )}

        {/* Posts Allowed Section - Service/Product Toggles */}
        {isBusiness && showBusinessOptions && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-purple-50 rounded-lg border border-purple-100">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Posts Allowed</h3>
              </div>
              
              <div className="space-y-4">
                {/* Service Toggle */}
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                          <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Service</h4>
                        <p className="text-sm text-gray-500">Allow service-related posts</p>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleServicePosts}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                        servicePostsAllowed ? 'bg-purple-600' : 'bg-gray-200'
                      } ${togglingService ? 'opacity-60 cursor-not-allowed' : ''}`}
                      disabled={togglingService}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          servicePostsAllowed ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* Service Autofill Checkbox */}
                  {servicePostsAllowed && (
                    <div className="flex items-center justify-between gap-2 pl-4 sm:pl-13 pt-2 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                        <label className="text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                          Enable Autofill
                        </label>
                        <span className="text-xs text-gray-500 truncate">(Auto-fill from previous posts)</span>
                      </div>
                      <button
                        onClick={handleToggleServiceAutofill}
                        disabled={togglingServiceAutofill}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex-shrink-0 ${
                          serviceAutofillEnabled ? 'bg-blue-600' : 'bg-gray-200'
                        } ${togglingServiceAutofill ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            serviceAutofillEnabled ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>

                {/* Product Toggle */}
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Product</h4>
                        <p className="text-sm text-gray-500">Allow product-related posts</p>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleProductPosts}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                        productPostsAllowed ? 'bg-purple-600' : 'bg-gray-200'
                      } ${togglingProduct ? 'opacity-60 cursor-not-allowed' : ''}`}
                      disabled={togglingProduct}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          productPostsAllowed ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* Product Autofill Checkbox */}
                  {productPostsAllowed && (
                    <div className="flex items-center justify-between gap-2 pl-4 sm:pl-13 pt-2 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                        <label className="text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                          Enable Autofill
                        </label>
                        <span className="text-xs text-gray-500 truncate">(Auto-fill from previous posts)</span>
                      </div>
                      <button
                        onClick={handleToggleProductAutofill}
                        disabled={togglingProductAutofill}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 flex-shrink-0 ${
                          productAutofillEnabled ? 'bg-green-600' : 'bg-gray-200'
                        } ${togglingProductAutofill ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            productAutofillEnabled ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {(servicePostsAllowed || productPostsAllowed) && (
                <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                  <p className="text-sm text-purple-700">
                    <span className="font-semibold">Enabled:</span>
                    {servicePostsAllowed && <span className="ml-1">Service posts</span>}
                    {servicePostsAllowed && productPostsAllowed && <span className="mx-1">•</span>}
                    {productPostsAllowed && <span className="ml-1">Product posts</span>}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

       {/* Business Verification Section */}
       {isBusiness && showBusinessOptions && (
         <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-green-50 rounded-lg border border-green-100">
           <div>
             <div className="flex items-center justify-between mb-2">
               <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                 Business Verification
                 <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                 </svg>
               </h3>
               <button
                 onClick={() => setShowVerificationModal(true)}
                 className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base md:w-56 lg:w-56"
               >
                 <span className="hidden sm:inline">Verify Business</span>
                 <span className="sm:hidden">Verify</span>
               </button>
             </div>
             <p className="text-sm sm:text-base text-gray-700">
               Submit business details and documents to request verification.
             </p>
           </div>
         </div>
       )}

       {/* Bank Account Details Section */}
       {isBusiness && showBusinessOptions && (
         <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-blue-50 rounded-lg border border-blue-100">
           <div>
             <div className="flex items-center justify-between mb-2">
               <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                 Bank Account Details
                 <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
               </h3>
               <button
                 onClick={() => setShowBankDetailsModal(true)}
                 className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base md:w-56 lg:w-56"
               >
                 <span className="hidden sm:inline">Manage Bank Details</span>
                 <span className="sm:hidden">Bank Details</span>
               </button>
             </div>
             <p className="text-sm sm:text-base text-gray-700">
               Add your bank account details to receive payments from sales via escrow system.
             </p>
           </div>
         </div>
       )}

       {/* Subscription Plan Section */}
       {isBusiness && showBusinessOptions && (
         <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-yellow-50 rounded-lg border border-yellow-100">
           <div>
             <div className="flex items-center justify-between mb-2">
               <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                 Subscription Plan
                 <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                 </svg>
               </h3>
               <button
                 onClick={() => setShowPlanModal(true)}
                 disabled={isLoadingSubscription}
                 className="px-4 sm:px-6 py-2 bg-button-gradient text-black rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base md:w-56 lg:w-56 disabled:opacity-50"
               >
                 <span className="hidden sm:inline">Manage Plan</span>
                 <span className="sm:hidden">Manage</span>
               </button>
             </div>
             <p className="text-sm sm:text-base text-gray-700">
               Current plan:{' '}
               {isLoadingSubscription ? (
                 <span className="text-gray-500">Loading...</span>
               ) : (
                 <span className={`font-medium ${currentSubscription !== 'free' ? 'text-yellow-600' : ''}`}>
                   {getSubscriptionDisplayName(currentSubscription)}
                 </span>
               )}
             </p>
           </div>
         </div>
       )}

       {/* Follow Requests Section - Only show if account is private */}
       {user?.privacy === 'private' && (
         <div className="mb-6 sm:mb-8">
           <FollowRequestManager />
         </div>
       )}

       {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        currentPlan={currentSubscription}
        onUpgradeSuccess={handleUpgradeSuccess}
      />

      {/* Business Details Modal */}
      <BusinessDetailsModal
        isOpen={showBusinessDetailsModal}
        onClose={() => setShowBusinessDetailsModal(false)}
        onSubmit={handleBusinessDetailsSubmit}
      />

      {/* Edit Business Details Modal */}
      <BusinessDetailsModal
        isOpen={showEditBusinessDetails}
        onClose={() => setShowEditBusinessDetails(false)}
        onSubmit={handleEditBusinessDetailsSubmit}
        isEdit={true}
      />

      {/* Business Verification Modal */}
      <BusinessVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSubmit={() => {
          // Modal will auto-close after 3 seconds
          // Show success toast after modal closes
          setTimeout(() => {
            try {
              toast.success('Verification documents submitted successfully! We will review and get back to you soon.', {
                autoClose: 5000
              });
            } catch {}
          }, 3100); // Slightly after modal closes (3000ms)
        }}
      />

      {/* Bank Details Modal */}
      <BankDetailsModal
        isOpen={showBankDetailsModal}
        onClose={() => setShowBankDetailsModal(false)}
        onSuccess={() => {
          setShowBankDetailsModal(false);
          try {
            toast.success('Bank details saved successfully!');
          } catch {}
        }}
      />
    </div>
  );
}