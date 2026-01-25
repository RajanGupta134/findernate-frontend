"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { BadgeCheck, Settings, Pencil, Shield, Check, X, UserPlus, UserMinus, MessageCircle, Flag, Ban, UserX, Share2 } from "lucide-react";
import ReportModal from './ReportModal';
import BlockedUsersModal from './BlockedUsersModal';
import BlockConfirmModal from './BlockConfirmModal';
import ShareModal from './ShareModal';
import ProfilePictureModal from './ProfilePictureModal';
import { Button } from "./ui/button";
import SettingsModal from "./SettingsModal";
import SubscriptionBadge from "./ui/SubscriptionBadge";
import { UserProfile as UserProfileType } from "@/types";
import { followUser, unfollowUser, editProfile, blockUser, unblockUser, checkIfUserBlocked, uploadProfileImage } from "@/api/user";
import { toggleAccountPrivacy } from "@/api/privacy";
import { storyAPI } from "@/api/story";
import { Story } from "@/types/story";
import StoryViewer from "./StoryViewer";
import { messageAPI } from "@/api/message";
import { useRouter } from "next/navigation";
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop';
import { useUserStore } from "@/store/useUserStore";
import { AxiosError } from "axios";
import FollowersModal from "./FollowersModal";
import { searchLocations, LocationSuggestion } from '@/api/location';
import StarRating from './StarRating';
import { getBusinessRatingSummary, rateBusiness } from '@/api/business';
import PrivacySettings from './PrivacySettings';
import { toast } from "react-toastify";
import { inMemoryStateManager } from '@/utils/inMemoryState';

interface UserProfileProps {
  userData: UserProfileType | null;
  isCurrentUser?: boolean;
  onProfileUpdate?: (updatedData: Partial<UserProfileType>) => void;
}


// Constants for localStorage keys
const FOLLOW_STORAGE_KEY = 'user_follow_states';

const UserProfile = ({ userData, isCurrentUser = false, onProfileUpdate }: UserProfileProps) => {
  const { user: currentUser } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [profile, setProfile] = useState<UserProfileType | null>(userData);
  const [isFollowing, setIsFollowing] = useState(userData?.isFollowing || false);
  const [followersCount, setFollowersCount] = useState(userData?.followersCount || 0);

  // Helper functions for follow state persistence
  const getFollowStateFromStorage = (userId: string): boolean | null => {
    try {
      const stored = localStorage.getItem(FOLLOW_STORAGE_KEY);
      if (!stored) return null;
      const followStates = JSON.parse(stored);
      return followStates[userId] || null;
    } catch {
      return null;
    }
  };

  const saveFollowStateToStorage = (userId: string, isFollowed: boolean): void => {
    try {
      const stored = localStorage.getItem(FOLLOW_STORAGE_KEY);
      const followStates = stored ? JSON.parse(stored) : {};
      followStates[userId] = isFollowed;
      localStorage.setItem(FOLLOW_STORAGE_KEY, JSON.stringify(followStates));
    } catch (error) {
      console.warn('Failed to save follow state to localStorage:', error);
    }
  };

  // Sync profile with userData when it changes (for real-time updates)
  useEffect(() => {
    if (userData) {
      setProfile(userData);
    }
  }, [userData]);

  // Sync business profile status from user store for current user
  useEffect(() => {
    if (isCurrentUser && currentUser?.isBusinessProfile !== undefined && profile) {
      // Update profile state when user store's isBusinessProfile changes
      if (profile.isBusinessProfile !== currentUser.isBusinessProfile) {
        setProfile(prev => prev ? { ...prev, isBusinessProfile: currentUser.isBusinessProfile } : null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentUser, currentUser?.isBusinessProfile]);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: userData?.fullName || '',
    username: userData?.username || '',
    location: userData?.location || '',
    link: userData?.link || '',
    bio: userData?.bio || '',
    profileImageUrl: userData?.profileImageUrl || '',
  });
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showBlockConfirmModal, setShowBlockConfirmModal] = useState(false);
  const [businessRating, setBusinessRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [userPrivacy, setUserPrivacy] = useState<'public' | 'private'>(() => {
    console.log('UserProfile: Initial userData.privacy:', userData?.privacy);
    return userData?.privacy || 'public';
  });
  const [isToggling, setIsToggling] = useState(false);
  const [isUploadingProfilePic, setIsUploadingProfilePic] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);

  // Location suggestion states
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSearchTimeout, setLocationSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const fetchBusinessRating = useCallback(async (businessId: string) => {
    try {
      setRatingLoading(true);
      
      // //console.log('🔍 DEBUG: Fetching business rating for businessId:', businessId);
      // //console.log('🔍 DEBUG: Current user (me):', currentUser?._id);
      // //console.log('🔍 DEBUG: Profile being viewed:', userData._id, userData.username);
      // //console.log('🔍 DEBUG: Are we on our own profile?', isCurrentUser);
      // //console.log('🔍 DEBUG: userData.isBusinessProfile:', userData.isBusinessProfile);
      
      // Skip if this is our own profile
      if (isCurrentUser) {
        // //console.log('❌ Cannot rate own business - this is our own profile');
        setBusinessRating(0);
        setTotalRatings(0);
        return;
      }
      
      // Fetch business rating using the businessId directly
      // //console.log('🔄 Fetching business rating for businessId:', businessId);
      const ratingResponse = await getBusinessRatingSummary(businessId);
      // //console.log('⭐ Business rating response:', ratingResponse);
      
      if (ratingResponse.data?.business) {
        setBusinessRating(ratingResponse.data.business.averageRating || 0);
        setTotalRatings(ratingResponse.data.business.totalRatings || 0);
        // //console.log('✅ Successfully fetched business rating');
      } else {
        // //console.log('⚠️ No business data in rating response');
        setBusinessRating(0);
        setTotalRatings(0);
      }
    } catch (error) {
      // console.error('❌ Error fetching business rating:', error);
      setBusinessRating(0);
      setTotalRatings(0);
    } finally {
      setRatingLoading(false);
    }
  }, [isCurrentUser, userData?._id, userData?.username, userData?.isBusinessProfile, currentUser?._id]);

  const fetchBusinessByUserId = useCallback(async (userId: string) => {
    try {
      console.log('🏢 Fetching business document by userId:', userId);

      // Import the business API function
      const { getBusinessProfileDetails } = await import('@/api/business');

      const businessResponse = await getBusinessProfileDetails(userId);
      console.log('🏢 Business response:', businessResponse);

      if (businessResponse?.data?.business?._id) {
        const realBusinessId = businessResponse.data.business._id;
        console.log('✅ Found real businessId:', realBusinessId);
        setBusinessId(realBusinessId);
        fetchBusinessRating(realBusinessId);
      } else {
        console.log('❌ No business document found - user may need to complete business setup');
        // Show rating component but with no existing ratings
        setBusinessId('no-business-doc');
        setBusinessRating(0);
        setTotalRatings(0);
      }
    } catch (error: any) {
      console.error('❌ Error fetching business document:', error);
      if (error?.response?.status === 404) {
        console.log('📝 Business document not found - user needs to complete business registration');
      }
      // Still show rating component but indicate no business document exists
      setBusinessId('no-business-doc');
      setBusinessRating(0);
      setTotalRatings(0);
    }
  }, [fetchBusinessRating]);

  // Helper function to check if all stories have been viewed by current user
  const areAllStoriesViewed = () => {
    if (!currentUser || !currentUser._id || !userStories.length) return false;
    
    const allViewed = userStories.every(story => {
      // Safety check: ensure viewers array exists
      if (!story.viewers || !Array.isArray(story.viewers)) {
        return false; // If viewers is undefined/null, treat as unviewed
      }
      return story.viewers.includes(currentUser._id);
    });
    
    
    return allViewed;
  };

  // Update internal state if userData prop changes
  useEffect(() => {
    if (!userData) return;
    
    setProfile(userData);
    
    // Check localStorage first for follow state, then fall back to API data
    const storedFollowState = getFollowStateFromStorage(userData._id);
    const initialFollowState = storedFollowState !== null ? storedFollowState : (userData.isFollowing || false);
    setIsFollowing(initialFollowState);
    
    setFollowersCount(userData.followersCount);
    setFormData({
      fullName: userData.fullName,
      username: userData.username,
      location: userData.location,
      link: userData.link,
      bio: userData.bio,
      profileImageUrl: userData.profileImageUrl,
    });
    setUserPrivacy(userData.privacy || 'public');

    // Sync location to global store if this is the current user
    if (isCurrentUser && userData.location) {
      try {
        useUserStore.getState().updateUser({
          location: userData.location,
        });
      } catch {}
    }

    // Fetch stories for other users when component loads
    if (!isCurrentUser && userData?._id) {
      fetchUserStories(userData._id);
      checkBlockStatus(userData._id);
      
      // Fetch business rating if this is a business profile
      if (userData?.isBusinessProfile) {
        if (userData.businessId) {
          // Has proper businessId - use it directly
          console.log('✅ BUSINESS WITH ID: Using businessId:', userData.businessId);
          setBusinessId(userData.businessId);
          fetchBusinessRating(userData.businessId);
        } else {
          // Business profile but no businessId - need to fetch business document first
          console.log('🔍 BUSINESS NO ID: Fetching business document for userId:', userData._id);
          fetchBusinessByUserId(userData._id);
        }
      } else {
        console.log('❌ NOT A BUSINESS: Skipping rating fetch');
        // Reset business-related state if not a business profile
        setBusinessId(null);
        setBusinessRating(0);
        setTotalRatings(0);
      }
    }
  }, [userData, isCurrentUser, fetchBusinessRating, fetchBusinessByUserId]);

  // Click outside handler for location dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target as Node)
      ) {
        setShowLocationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (locationSearchTimeout) {
        clearTimeout(locationSearchTimeout);
      }
    };
  }, [locationSearchTimeout]);

  const fetchUserStories = async (userId: string) => {
    try {
      const stories = await storyAPI.fetchStoriesByUser(userId);
      setUserStories(stories);
    } catch (error) {
      // console.error('Error fetching user stories:', error);
      setUserStories([]);
    }
  };

  const handleRatingSubmit = async () => {
    console.log('🚀 RATING SUBMIT: Button clicked', { selectedRating, businessId });

    if (selectedRating === 0) {
      console.log('❌ No rating selected');
      return;
    }

    if (!businessId || businessId === 'no-business-doc') {
      console.log('❌ Cannot submit rating - no valid businessId or business document not found');
      alert('Cannot rate this business profile. The business registration may be incomplete.');
      return;
    }
    
    // Require authentication before rating
    const token = useUserStore.getState().validateAndGetToken();
    if (!token) {
      alert('Please sign in to rate this business.');
      router.push('/signin');
      return;
    }

    // //console.log('🚀 DEBUG: Submitting rating...');
    // //console.log('🚀 DEBUG: Business ID to rate:', businessId);
    // //console.log('🚀 DEBUG: Rating value:', selectedRating);
    // //console.log('🚀 DEBUG: Current user (me):', currentUser?._id);
    // //console.log('🚀 DEBUG: Profile being rated:', userData._id, userData.username);
    
    try {
      setSubmittingRating(true);
      await rateBusiness(businessId, selectedRating);
      // //console.log('✅ Rating submitted successfully:', response);
      
      // Refresh the business rating after successful submission using the businessId
      await fetchBusinessRating(businessId);
      
      // Close modal and reset selected rating
      setShowRatingModal(false);
      setSelectedRating(0);
      toast.success('Rating submitted successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error: any) {
      // Surface backend error message to the user (e.g., 401/403/validation)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit rating';
      console.error('Error submitting rating:', error?.response || error);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  const checkBlockStatus = async (userId: string) => {
    try {
      const blocked = await checkIfUserBlocked(userId);
      setIsBlocked(blocked);
    } catch (error) {
      // console.error('Error checking block status:', error);
      setIsBlocked(false);
    }
  };

  // Debug the createdAt value
  //// //console.log('Profile createdAt:', profile?.createdAt);

  const getJoinedDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    } catch (error) {
      // console.error('Error parsing date:', error);
      return 'N/A';
    }
  };

  // Location search functionality
  const searchLocationSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    try {
      const suggestions = await searchLocations(query);
      setLocationSuggestions(suggestions);
      setShowLocationSuggestions(suggestions.length > 0);
    } catch (error) {
      // console.error('Error fetching location suggestions:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  };

  const handleLocationInputChange = (value: string) => {
    handleInputChange("location", value);

    // Clear previous timeout
    if (locationSearchTimeout) {
      clearTimeout(locationSearchTimeout);
    }

    // Debounce location search
    const timeout = setTimeout(() => {
      searchLocationSuggestions(value);
    }, 300);

    setLocationSearchTimeout(timeout);
  };

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    // Extract city and state from suggestion
    const formatLocationForProfile = (suggestion: LocationSuggestion) => {
      const address = suggestion.address;
      
      // Try to get city/town name
      const city = address.town || address.city || suggestion.name;
      
      // Get state
      const state = address.state;
      
      // Format as "City, State" or just "City" if no state
      if (city && state) {
        return `${city}, ${state}`;
      } else if (city) {
        return city;
      } else {
        return suggestion.name; // Fallback to suggestion name
      }
    };

    const formattedLocation = formatLocationForProfile(suggestion);
    handleInputChange("location", formattedLocation);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

  const joinedDate = getJoinedDate(profile?.createdAt || '');

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle clicking the camera icon to update profile picture
  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the profile picture click
    fileInputRef.current?.click();
  };

  const handleImageClick = async () => {
    const hasProfilePicture = formData.profileImageUrl || profile?.profileImageUrl;

    if (isCurrentUser && isEditing) {
      // For current user in edit mode, allow image change
      fileInputRef.current?.click();
    } else if (!isCurrentUser && userStories.length > 0) {
      // For other users with stories, show stories
      await fetchAndShowStories();
    } else if (hasProfilePicture) {
      // For users with profile picture but no stories (or current user not editing), show picture modal
      setShowProfilePictureModal(true);
    } else if (!isCurrentUser) {
      // For other users without stories or profile picture, try fetching stories
      await fetchAndShowStories();
    }
  };

  const fetchAndShowStories = async () => {
    if (storiesLoading || !profile) return;
    
    setStoriesLoading(true);
    try {
      const stories = await storyAPI.fetchStoriesByUser(profile._id);
      setUserStories(stories);
      
      if (stories.length > 0) {
        setShowStoryViewer(true);
      } else {
        // User has no stories
        // //console.log('User has no stories to show');
      }
    } catch (error) {
      // console.error('Error fetching user stories:', error);
    } finally {
      setStoriesLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // Utility to crop the image using canvas
  async function getCroppedImg(imageSrc: string, crop: Area): Promise<string> {
    const image = new window.Image();
    image.src = imageSrc;
    await new Promise((resolve) => { image.onload = resolve; });
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  // Resize a data URL to a max size (maintains aspect ratio)
  async function resizeImageDataUrl(
    dataUrl: string,
    maxWidth = 512,
    maxHeight = 512,
    quality = 0.85,
    mimeType: 'image/jpeg' | 'image/webp' = 'image/jpeg'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        const newW = Math.round(width * ratio);
        const newH = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No 2d context'));
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, newW, newH);
        const out = canvas.toDataURL(mimeType, quality);
        resolve(out);
      };
      img.onerror = () => reject(new Error('Failed to load image for resizing'));
      img.src = dataUrl;
    });
  }



  const handleCropSave = async () => {
    if (selectedImage && croppedAreaPixels) {
      const croppedImg = await getCroppedImg(selectedImage, croppedAreaPixels);

      // If not in edit mode, directly upload the cropped image
      if (!isEditing) {
        setShowCropper(false);
        setSelectedImage(null);
        setIsUploadingProfilePic(true);

        try {
          // Resize to safe dimensions before upload
          const resizedDataUrl = await resizeImageDataUrl(croppedImg, 512, 512, 0.85, 'image/jpeg');

          // Convert data URL to File
          const imageFile = dataURLtoFile(resizedDataUrl, 'profile-image.jpg');

          // Upload to backend
          const uploadResponse = await uploadProfileImage(imageFile);

          // Update local profile state
          setProfile(prev => ({
            ...prev,
            ...uploadResponse
          }));

          // Update form data
          setFormData(prev => ({
            ...prev,
            profileImageUrl: uploadResponse.profileImageUrl
          }));

          // Sync to global user store
          try {
            useUserStore.getState().updateUser({
              profileImageUrl: uploadResponse.profileImageUrl,
            });
          } catch {}

          // Call the parent's onProfileUpdate if provided
          if (onProfileUpdate) {
            onProfileUpdate(uploadResponse);
          }

          // Show success feedback
          toast.success('Profile picture updated successfully!', {
            position: 'top-center',
            autoClose: 2000
          });

        } catch (error) {
          console.error('Error uploading profile picture:', error);
          toast.error('Failed to upload profile picture. Please try again.', {
            position: 'top-center',
            autoClose: 3000
          });
        } finally {
          setIsUploadingProfilePic(false);
        }
      } else {
        // In edit mode, just update form data (will be saved when user clicks Save Profile button)
        setFormData((prev) => ({
          ...prev,
          profileImageUrl: croppedImg,
        }));
        setShowCropper(false);
        setSelectedImage(null);
      }
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImage(null);
  };

  // Helper function to convert data URL to File
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleSave = async () => {
    try {
      let updatedProfile: any = {};

      // If image is a data URL (newly selected), upload to backend first
      if (formData.profileImageUrl && formData.profileImageUrl.startsWith('data:')) {
        try {
          // Resize to safe dimensions before upload
          const resizedDataUrl = await resizeImageDataUrl(formData.profileImageUrl, 512, 512, 0.85, 'image/jpeg');

          // Convert data URL to File
          const imageFile = dataURLtoFile(resizedDataUrl, 'profile-image.jpg');

          // Upload to backend using the upload-image endpoint
          const uploadResponse = await uploadProfileImage(imageFile);

          console.log('Profile image uploaded successfully:', uploadResponse);

          // The upload endpoint returns the updated profile with new image URL
          updatedProfile = uploadResponse;
        } catch (uploadError) {
          console.error('Error uploading profile image:', uploadError);
          throw new Error('Failed to upload profile image. Please try again.');
        }
      }

      // Prepare data for editProfile API - only non-image fields
      const profileData = {
        fullName: formData.fullName,
        bio: formData.bio,
        location: formData.location,
        link: formData.link,
      };

      // Call the editProfile API for other fields
      const editResponse = await editProfile(profileData);

      // Merge both responses (image upload + profile edit)
      updatedProfile = { ...editResponse, ...updatedProfile };
      
      // Debug: Log the response
      // //console.log('API Response:', updatedProfile);
      
      // Update local profile state with the response from API
      setProfile(prev => ({
        ...prev,
        ...updatedProfile
      }));

      // Sync to global user store so StoriesBar shows latest avatar/name
      try {
        useUserStore.getState().updateUser({
          fullName: updatedProfile.fullName,
          username: updatedProfile.username,
          profileImageUrl: updatedProfile.profileImageUrl,
          location: updatedProfile.location,
        });
      } catch {}
      
      // Call the parent's onProfileUpdate if provided
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }
      
      // Exit editing mode
      setIsEditing(false);
      
      // Show success feedback (optional)
      // //console.log('Profile updated successfully');
      
    } catch (error: any) {
      // console.error('Error updating profile:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to update profile';
      alert(errorMessage);
      
      // Keep editing mode active so user can try again
      // Don't exit editing mode on error
    }
  };

  const handlePrivacyToggle = async () => {
    if (isToggling) return;

    setIsToggling(true);

    try {
      const response = await toggleAccountPrivacy();
      const newPrivacy = response.data.privacy;

      setUserPrivacy(newPrivacy);

      // Update user store
      useUserStore.getState().updateUser({ privacy: newPrivacy });

      // Update profile state
      setProfile(prev => prev ? { ...prev, privacy: newPrivacy } : null);
    } catch (error: any) {
      console.error('Error toggling privacy:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to update privacy settings';
      alert(errorMessage);
    } finally {
      setIsToggling(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    
    // Reset form data to original profile data
    setFormData({
      fullName: profile.fullName,
      username: profile.username,
      location: profile.location,
      link: profile.link,
      bio: profile.bio,
      profileImageUrl: profile.profileImageUrl,
    });
    // Reset privacy to original value
    setUserPrivacy(profile.privacy || 'public');
    setIsEditing(false);
  };

  const handleFollowToggle = async () => {
    if (isFollowLoading || !profile) return;

    // Debug check
    console.log('Attempting to follow/unfollow user:', {
      targetUserId: profile._id,
      currentlyFollowing: isFollowing,
      token: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,
      profile: profile
    });

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        console.log('Calling unfollowUser with profile._id:', profile._id);
        const result = await unfollowUser(profile._id);
        
        // Check if it was a "Not following this user" case
        if (result.message === 'Not following this user') {
          setIsFollowing(false);
          // Don't decrement count since we weren't following
        } else {
          setIsFollowing(false);
          setFollowersCount(prev => prev - 1);
        }
        
        // Save to localStorage and inMemoryStateManager
        saveFollowStateToStorage(profile._id, false);
        inMemoryStateManager.setUserFollowState(profile._id, false);
      } else {
        const result = await followUser(profile._id);
        
        // Check if it was an "Already following" case
        if (result.message === 'Already following') {
          setIsFollowing(true);
          // Don't increment count since we were already following
        } else {
          setIsFollowing(true);
          setFollowersCount(prev => prev + 1);
        }
        
        // Save to localStorage and inMemoryStateManager
        saveFollowStateToStorage(profile._id, true);
        inMemoryStateManager.setUserFollowState(profile._id, true);
      }
    } catch (error: any) {
      // console.error('Error toggling follow status:', error);
      
      // Get error message from API response
      const errorMessage = error?.response?.data?.message || error?.message || '';
      
      // Handle specific error cases
      if (errorMessage === 'Already following') {
        // Update state to reflect reality - user is already following
        setIsFollowing(true);
        // Don't change followers count since we're already following
        // //console.log('User was already following - updating UI state');
        // Save to localStorage and inMemoryStateManager
        saveFollowStateToStorage(profile._id, true);
        inMemoryStateManager.setUserFollowState(profile._id, true);
      } else if (errorMessage === 'Not following this user') {
        // Update state to reflect reality - user is not following
        setIsFollowing(false);
        // //console.log('User was not following - updating UI state');
        // Save to localStorage and inMemoryStateManager
        saveFollowStateToStorage(profile._id, false);
        inMemoryStateManager.setUserFollowState(profile._id, false);
      } else if (errorMessage === 'Cannot follow yourself') {
        // Handle self-follow attempt
        // //console.log('Cannot follow yourself');
        alert('You cannot follow yourself');
      } else {
        // Show user-friendly error message for other errors
        alert(errorMessage || 'Failed to update follow status');
        
        // Reset state on other errors to initial userData values
        setIsFollowing(userData?.isFollowing || false);
        setFollowersCount(userData?.followersCount || 0);
      }
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleMessageClick = async () => {
    if (creatingChat || !profile) return;
    
    // Prevent messaging blocked users
    if (isBlocked) {
      alert('You cannot message users you have blocked.');
      return;
    }
    
    setCreatingChat(true);
    try {
      // Get current user from store
      const currentUser = useUserStore.getState().user;
      
      if (!currentUser || !currentUser._id) {
        alert('Please log in to send messages');
        return;
      }
      
      // Create a direct chat with both users (current user + target user)
      const participants = [currentUser._id, profile._id];
      // //console.log('Creating chat with participants:', participants);
      
      const chat = await messageAPI.createChat(participants, 'direct');
      
      // Navigate to the chat page with the created chat selected
      router.push(`/chats?chatId=${chat._id}`);
    } catch (error) {
      const axiosError = error as AxiosError;
      // console.error('Error creating chat:', axiosError);
      
      if (axiosError.response?.status === 404) {
        alert('Chat functionality is not available on this server yet. Please contact the administrator.');
      } else {
        const errorMessage = axiosError.response?.data as string || 'Failed to create chat';
        alert(errorMessage);
      }
    } finally {
      setCreatingChat(false);
    }
  };

  const handleOpenReport = () => {
    // Prevent self-reporting
    if (isCurrentUser) return;
    // Require auth
    if (!currentUser?._id) {
      router.push('/signin');
      return;
    }
    setShowReportModal(true);
  };

  const handleBlockClick = () => {
    if (isCurrentUser || isBlocking) return;
    
    // Require auth
    if (!currentUser?._id) {
      router.push('/signin');
      return;
    }

    if (isBlocked) {
      // If already blocked, unblock directly
      handleUnblock();
    } else {
      // If not blocked, show confirmation modal
      setShowBlockConfirmModal(true);
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    
    try {
      setIsBlocking(true);
      await blockUser(profile._id);
      setIsBlocked(true);
      setShowBlockConfirmModal(false);
      
      // If currently following, unfollow them
      if (isFollowing) {
        try {
          await unfollowUser(profile._id);
          setIsFollowing(false);
          setFollowersCount(prev => prev - 1);
        } catch (unfollowError) {
          // console.error('Error unfollowing user during block:', unfollowError);
          // Still proceed with block even if unfollow fails
          setIsFollowing(false);
          setFollowersCount(prev => prev - 1);
        }
      }
      
    } catch (error: any) {
      // console.error('Error blocking user:', error);
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to block user';
      alert(errorMessage);
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblock = async () => {
    if (isBlocking || !profile) return;

    try {
      setIsBlocking(true);
      await unblockUser(profile._id);
      setIsBlocked(false);
      
    } catch (error: any) {
      // console.error('Error unblocking user:', error);
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to unblock user';
      alert(errorMessage);
    } finally {
      setIsBlocking(false);
    }
  };

  // Handle followers/following click
  const handleFollowersClick = (tab: 'followers' | 'following') => {
    if (!profile) return;
    
    setFollowersModalTab(tab);
    setShowFollowersModal(true);
  };

  // Early return if userData is null or undefined
  if (!userData || !profile) {
    return (
      <div className="bg-white rounded-xl overflow-hidden shadow-sm w-full p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm w-full">
      {/* Cropper Modal */}
      {showCropper && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white p-6 rounded-xl shadow-lg relative w-[90vw] max-w-xs flex flex-col items-center">
            <div className="w-64 h-64 relative bg-gray-100">
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
                showGrid={false}
              />
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleCropCancel}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Banner */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-32 w-full relative">
        <div className="absolute -bottom-12 left-4 sm:left-6">
          <div
            className={`relative ${
              (isCurrentUser && isEditing) ||
              (!isCurrentUser && userStories.length > 0) ||
              (formData.profileImageUrl || profile?.profileImageUrl)
                ? 'cursor-pointer'
                : ''
            }`}
            onClick={handleImageClick}
          >
            {/* Story ring wrapper for other users with stories */}
            <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full ${
              !isCurrentUser && userStories.length > 0 
                ? areAllStoriesViewed() 
                  ? 'bg-gray-400 p-[3px]'  // Grey for viewed stories
                  : 'bg-gradient-to-r from-yellow-400 to-yellow-600 p-[2px]'  // Yellow gradient for unviewed stories
                : ''
            }`}>
              <div className={`w-full h-full rounded-full ${
                !isCurrentUser && userStories.length > 0 
                  ? 'bg-white p-1' 
                  : ''
              }`}>
                {formData.profileImageUrl ? (
                  <>
                    <Image
                      src={formData.profileImageUrl}
                      alt={profile.fullName}
                      width={128}
                      height={128}
                      className={`rounded-full w-full h-full object-cover ${
                        !isCurrentUser && userStories.length > 0 
                          ? 'border-0' 
                          : 'border-2 sm:border-4 border-white'
                      }`}
                    />
                  </>
                ) : profile?.profileImageUrl ? (
                  <>
                    <Image
                      src={profile.profileImageUrl}
                      alt={profile.fullName}
                      width={128}
                      height={128}
                      className={`rounded-full w-full h-full object-cover ${
                        !isCurrentUser && userStories.length > 0 
                          ? 'border-0' 
                          : 'border-2 sm:border-4 border-white'
                      }`}
                    />
                  </>
                ) : (
                  <>
                    <div className={`w-full h-full rounded-full bg-button-gradient flex items-center justify-center text-black font-bold text-lg sm:text-2xl ${
                      !isCurrentUser && userStories.length > 0 
                        ? 'border-0' 
                        : 'border-2 sm:border-4 border-white'
                    }`}>
                      {profile?.fullName ? getInitials(profile.fullName) : 
                       profile?.username ? getInitials(profile.username) : 
                       '?'}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Camera icon for current user - always visible for quick DP update */}
            {isCurrentUser && (
              <div
                onClick={isUploadingProfilePic ? undefined : handleCameraClick}
                className={`absolute bottom-0 right-0 bg-yellow-500 rounded-full p-2 sm:p-2.5 shadow-lg transition-all duration-200 ${
                  isUploadingProfilePic
                    ? 'cursor-wait'
                    : 'cursor-pointer hover:bg-yellow-600 hover:scale-110'
                }`}
                title={isUploadingProfilePic ? 'Uploading...' : 'Update profile picture'}
              >
                {isUploadingProfilePic ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <CameraIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </div>
            )}
            
            {/* Loading overlay */}
            {storiesLoading && (
              <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              </div>
            )}
            {/* File input for profile picture upload - always available for current user */}
            {isCurrentUser && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            )}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="pt-16 px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4">
          <div className="flex-1 w-full sm:mr-4">
            {/* Name and Username */}
            <div className="flex items-center gap-2 mb-0 flex-wrap">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  className="text-xl font-semibold text-gray-900 border-b-2 border-yellow-300 bg-transparent focus:outline-none focus:border-yellow-500 px-1"
                  placeholder="Your name"
                />
              ) : (
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                  {profile?.fullName}
                </h1>
              )}
              <SubscriptionBadge badge={profile?.subscriptionBadge} size="md" />
              {profile?.isBusinessProfile && (
                <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  Business Account <Shield className="w-3 h-3" />
                </span>
              )}
            </div>

            <p className="text-gray-500 text-sm mb-2">{"@" + profile?.username}</p>

            {/* Bio */}
            {isEditing ? (
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                className="w-full mt-2 text-sm text-gray-800 border-2 border-yellow-300 rounded-md p-2 focus:outline-none focus:border-yellow-500 resize-none"
                rows={3}
                placeholder="Tell people about yourself..."
              />
            ) : (
              <p className="mt-2 text-sm text-gray-800">
                {profile?.bio || (isCurrentUser ? "Add a bio to tell people about yourself" : null)}
              </p>
            )}

            {/* Location, Website, Email, Joined */}
            <div className="flex items-center gap-3 sm:gap-4 mt-4 text-xs sm:text-sm text-gray-600 flex-wrap">
              {/* Location with suggestions */}
              {(profile?.location || isEditing) && (
                <div className="flex items-center gap-1 relative">
                  📍
                  {isEditing ? (
                    <div className="relative">
                      <input
                        ref={locationInputRef}
                        type="text"
                        value={formData.location || ''}
                        onChange={(e) => handleLocationInputChange(e.target.value)}
                        className="border-b border-gray-300 bg-transparent focus:outline-none focus:border-yellow-500 px-1 min-w-[120px]"
                        placeholder="Search location..."
                      />
                      
                      {/* Location Suggestions Dropdown */}
                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <div
                          ref={locationDropdownRef}
                          className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto min-w-[250px]"
                        >
                          {locationSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.place_id}
                              type="button"
                              onClick={() => handleLocationSelect(suggestion)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-start">
                                <span className="text-gray-400 mr-2 text-xs">📍</span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-gray-900 truncate">
                                    {suggestion.name}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {suggestion.display_name}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>{profile.location || "No location added"}</span>
                  )}
                </div>
              )}

              {/* Website/Link */}
              {(profile?.link || isEditing) && (
                <div className="flex items-center gap-1">
                  🔗
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.link}
                      onChange={(e) => handleInputChange("link", e.target.value)}
                      className="text-yellow-700 underline border-b border-gray-300 bg-transparent focus:outline-none focus:border-yellow-500 px-1"
                      placeholder="Website URL"
                    />
                  ) : (
                    <a
                      href={profile.link.startsWith('http') ? profile.link : `https://${profile.link}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-yellow-700 underline hover:text-yellow-800"
                    >
                      {profile.link}
                    </a>
                  )}
                </div>
              )}

              {/* Email for current user or if verified - TEMPORARILY HIDDEN */}
              {/* {(isCurrentUser || profile?.isEmailVerified) && profile?.email && (
                <div className="flex items-center gap-1">
                  📧
                  <span className="flex items-center gap-1">
                    {profile.email}
                    {profile.isEmailVerified && (
                      <span className="text-green-600" title="Verified">✓</span>
                    )}
                  </span>
                </div>
              )} */}

              {/* Joined Date */}
              {joinedDate !== 'N/A' && (
                <div className="flex items-center gap-1">
                  📅 Joined {joinedDate}
                </div>
              )}

              {/* Business Rating - Only show for business profiles and other users */}
              {profile?.isBusinessProfile && !isCurrentUser && (
                <div className="flex items-center gap-2">
                  {ratingLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
                      <span className="text-sm text-gray-500">Loading rating...</span>
                    </div>
                  ) : (
                    <StarRating
                      currentRating={businessRating}
                      readonly={true}
                      size="sm"
                      showRateButton={true}
                      onRateClick={() => setShowRatingModal(true)}
                    />
                  )}
                  {totalRatings > 0 && !ratingLoading && (
                    <span className="text-xs text-gray-500">
                      ({totalRatings} rating{totalRatings !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full sm:w-auto justify-start">
            {isCurrentUser ? (
              <>
                {isEditing ? (
                  <div className="flex flex-col gap-3 w-full sm:w-auto">

                    {/* Save/Cancel Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSave}
                        className="bg-yellow-600 hover:bg-yellow-700 text-black px-3 sm:px-4 py-1.5 rounded-md text-sm sm:text-md font-medium flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" /> <span className="hidden sm:inline">Save</span>
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="border px-3 sm:px-4 py-1.5 rounded-md text-sm sm:text-md font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                      >
                        <X className="w-4 h-4" /> <span className="hidden sm:inline">Cancel</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="border px-3 sm:px-4 py-1.5 rounded-md text-sm sm:text-md font-medium text-black hover:bg-gray-100 flex items-center gap-1"
                    >
                      <Pencil className="w-4 h-4" /> <span className="hidden sm:inline">Edit Profile</span>
                    </Button>
                    <Button
                      onClick={() => setShowSettings(true)}
                      className="border px-2.5 py-1.5 rounded-md text-black hover:bg-gray-100"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setShowBlockedUsersModal(true)}
                      className="border px-2.5 py-1.5 rounded-md text-black hover:bg-gray-100"
                      title="Blocked Users"
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setShowShareModal(true)}
                      className="border px-2.5 py-1.5 rounded-md text-blue-600 hover:bg-blue-50"
                      title="Share Profile"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Show follow and message buttons only if user is not blocked */}
                {!isBlocked && (
                  <>
                    <Button
                      onClick={handleFollowToggle}
                      disabled={isFollowLoading}
                      className={`px-3 sm:px-4 py-1.5 rounded-md text-sm sm:text-md font-medium flex items-center gap-1 ${
                        isFollowing 
                          ? 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500' 
                          : 'bg-yellow-600 hover:bg-yellow-700 text-black'
                      }`}
                    >
                      {isFollowLoading ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : isFollowing ? (
                        <>
                          <span className="sm:hidden">Unfollow</span>
                          <UserMinus className="w-4 h-4 hidden sm:block" />
                          <span className="hidden sm:inline">Unfollow</span>
                        </>
                      ) : (
                        <>
                          <span className="sm:hidden">Follow</span>
                          <UserPlus className="w-4 h-4 hidden sm:block" />
                          <span className="hidden sm:inline">Follow</span>
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={handleMessageClick}
                      disabled={creatingChat}
                      variant="outline"
                      className="border px-3 sm:px-4 py-1.5 rounded-md text-sm sm:text-md font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingChat ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {creatingChat ? 'Creating...' : 'Message'}
                      </span>
                    </Button>
                  </>
                )}
                
                {/* Always show block/unblock and report buttons */}
                <Button
                  onClick={handleBlockClick}
                  disabled={isBlocking}
                  variant="outline"
                  className={`border px-2.5 py-1.5 rounded-md text-sm sm:text-md font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isBlocked 
                      ? 'text-green-600 hover:bg-green-50 border-green-300' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label={isBlocked ? "Unblock User" : "Block User"}
                >
                  {isBlocking ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isBlocked ? (isBlocking ? 'Unblocking...' : 'Unblock') : (isBlocking ? 'Blocking...' : 'Block')}
                  </span>
                </Button>
                <Button
                  onClick={() => setShowShareModal(true)}
                  variant="outline"
                  className="border px-2.5 py-1.5 rounded-md text-sm sm:text-md font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-1"
                  aria-label="Share Profile"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
                <Button
                  onClick={handleOpenReport}
                  variant="outline"
                  className="border px-2.5 py-1.5 rounded-md text-sm sm:text-md font-medium text-red-600 hover:bg-red-50 flex items-center gap-1"
                  aria-label="Report User"
                >
                  <Flag className="w-4 h-4" />
                  <span className="hidden sm:inline">Report</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

        {/* Privacy Settings Modal */}
        {showPrivacyModal && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center" onClick={() => setShowPrivacyModal(false)}>
            <div className="bg-white w-full max-w-lg mx-4 rounded-xl shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 bg-white px-6 py-4 flex items-center justify-between border-b border-gray-200 rounded-t-xl">
                <h2 className="text-xl font-semibold text-gray-900">Privacy Settings</h2>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="p-6">
                <PrivacySettings
                  userPrivacy={userPrivacy}
                  onPrivacyUpdate={(privacy) => {
                    console.log('UserProfile: Privacy updated to:', privacy);
                    setUserPrivacy(privacy as 'public' | 'private');
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 sm:gap-6 mt-6 text-sm text-gray-700 font-medium flex-wrap">
          <button
            onClick={() => handleFollowersClick('following')}
            className="hover:text-yellow-600 transition-colors cursor-pointer"
          >
            <strong className="text-black">{profile?.followingCount}</strong>{" "}
            Following
          </button>
          <button
            onClick={() => handleFollowersClick('followers')}
            className="hover:text-yellow-600 transition-colors cursor-pointer"
          >
            <strong className="text-black">{followersCount}</strong>{" "}
            Followers
          </button>
        </div>
      </div>

      {/* Story Viewer Modal */}
      {showStoryViewer && userStories.length > 0 && (
        <StoryViewer
          storyUser={{
            _id: profile._id,
            username: profile.username,
            profileImageUrl: profile.profileImageUrl,
            stories: userStories,
            hasNewStories: true,
            isCurrentUser: false,
          }}
          initialStoryIndex={0}
          allStoryUsers={[{
            _id: profile._id,
            username: profile.username,
            profileImageUrl: profile.profileImageUrl,
            stories: userStories,
            hasNewStories: true,
            isCurrentUser: false,
          }]}
          onClose={() => setShowStoryViewer(false)}
          onStoryViewed={(storyId) => {
            // Mark story as viewed
            // //console.log('Story viewed:', storyId);
          }}
        />
      )}

      {/* Followers Modal */}
      <FollowersModal
        userId={profile._id}
        username={profile.username}
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        initialTab={followersModalTab}
      />
      {/* Report User Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="user"
        contentId={profile._id}
        title={`Report @${profile.username}`}
      />

      {/* Blocked Users Modal */}
      {isCurrentUser && (
        <BlockedUsersModal
          isOpen={showBlockedUsersModal}
          onClose={() => setShowBlockedUsersModal(false)}
        />
      )}

      {/* Block Confirmation Modal */}
      <BlockConfirmModal
        isOpen={showBlockConfirmModal}
        onClose={() => setShowBlockConfirmModal(false)}
        onConfirm={handleBlock}
        username={profile.username}
        isBlocking={isBlocking}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        userData={profile!}
      />

      {/* Profile Picture Modal */}
      <ProfilePictureModal
        isOpen={showProfilePictureModal}
        onClose={() => setShowProfilePictureModal(false)}
        imageUrl={formData.profileImageUrl || profile?.profileImageUrl || null}
        userName={profile?.fullName || profile?.username || 'User'}
      />

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rate {profile.fullName}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Share your experience with this business
            </p>

            <div className="flex justify-center mb-6">
              <StarRating
                currentRating={selectedRating}
                onRatingChange={setSelectedRating}
                size="lg"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedRating(0);
                }}
                disabled={submittingRating}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleRatingSubmit}
                disabled={selectedRating === 0 || submittingRating}
                className="flex-1 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingRating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Rating'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CameraIcon = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export default UserProfile;