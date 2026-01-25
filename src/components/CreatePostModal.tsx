'use client'
import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, MapPin, Globe, Lock } from 'lucide-react';
import Image from 'next/image';
import { Button } from './ui/button';
import { isAxiosError } from 'axios';
import ProductDetailsForm from './posting/ProductDetailsForm';
import ServiceDetailsForm from './posting/ServiceDetailsForm';
import BusinessDetailsForm from './posting/BusinessDetailsForm';
import { createProductPost, createRegularPost, createServicePost, createBusinessPost } from '@/api/post';
import { GetBusinessDetails } from '@/api/business';
import { ProductDetailsFormProps, RegularPostPayload, ServiceDetailsFormProps, BusinessPostFormProps } from '@/types';
import RegularPostForm from './posting/RegularDetailsForm';
import { useUserStore } from '@/store/useUserStore';
// import { getUserProfile } from '@/api/user';
import TagInput from './TagInput';
import { toast } from 'react-toastify';
import { searchLocations, LocationSuggestion } from '@/api/location';
import { storyAPI } from '@/api/story';
import { postRefreshEvents } from '@/utils/postRefreshEvents';
import BusinessDetailsModal from './business/BusinessDetailsModal';
import CategorySelect from './CategorySelect';

// Categories for all post types
const postCategories = [
  'Personal',
  'Entertainment & Media',
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
  'Art & Design',
  'Logistics & Transportation',
  'Agriculture & Farming',
  'Manufacturing & Industrial',
  'Non-profit & NGOs',
  'Telecommunications',
  'Other'
];

interface createPostModalProps {
  closeModal: () => void;
}

const CreatePostModal = ({ closeModal }: createPostModalProps) => {
  const { user } = useUserStore();

  // Temporarily show all post types everywhere (unused flag removed)

  // Content type selection (Post, Story, Reel)
  const [contentType, setContentType] = useState('Post');
  const [previousContentType, setPreviousContentType] = useState('');

  // Set default post type to Regular for normal users, allow business types only for business accounts
  const [postType, setPostType] = useState('Regular');
  const [previousPostType, setPreviousPostType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only allow business post types if user has business profile
  const isBusinessProfile = user?.isBusinessProfile ?? false;
  const allowProduct = isBusinessProfile && (user?.productEnabled ?? false);
  const allowService = isBusinessProfile && (user?.serviceEnabled ?? false);
  const allowBusiness = isBusinessProfile;

  const [sharedForm, setSharedForm] = useState({
    description: '',
    image: [] as File[], // array of File objects or URLs
    location: {
      name: '',
      address: '',
      city: '',
      state: '',
      country: ''
    },
    tags: [] as string[],
    category: 'Personal', // Default to Personal
    customCategory: '', // For when user selects "Other"
  });

  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showReelVisibility, setShowReelVisibility] = useState(false);
  const [reelVisibility, setReelVisibility] = useState(false);

  // Post privacy state
  const [postPrivacy, setPostPrivacy] = useState<'public' | 'private'>('public');

  // Location suggestion states
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSearchTimeout, setLocationSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  // Track whether we've already initialized location from profile to avoid re-filling
  const [hasInitializedLocation, setHasInitializedLocation] = useState(false);

  // Business profile modal state
  const [showBusinessProfileModal, setShowBusinessProfileModal] = useState(false);

  // Debug logging for modal state changes
  useEffect(() => {
  }, [showBusinessProfileModal]);

  // Function to clear specific post type form data
  const clearPostTypeForm = React.useCallback((type: string) => {
    switch (type) {
      case 'Regular':
        setRegularForm({
          postType: 'photo',
          mood: 'Content',
          activity: 'Chilling',
          mentions: [],
          settings: {
            visibility: postPrivacy,
            allowComments: true,
            allowLikes: true,
          },
          status: 'scheduled',
        });
        break;
      case 'Product':
        setProductForm({
          postType: 'photo',
          mentions: [],
          mood: 'testing',
          activity: 'testing',
          settings: {
            visibility: postPrivacy,
            allowComments: true,
            allowLikes: true,
          },
          product: {
            name: '',
            price: 0,
            currency: '',
            link: '',
            inStock: true,
            deliveryOptions: 'online',
          },
          status: 'scheduled',
        });
        break;
      case 'Service':
        setServiceForm({
          postType: 'photo',
          mentions: [],
          settings: {
            visibility: postPrivacy,
            allowComments: true,
            allowLikes: true,
          },
          status: 'scheduled',
          service: {
            name: '',
            description: '',
            price: 0,
            currency: 'INR',
            category: '',
            subcategory: '',
            duration: 0,
            serviceType: '', // 'in-person', 'online', 'hybrid'
            availability: {
              schedule: [], // [{ day: 'Monday', timeSlots: [{ startTime: '', endTime: '' }] }]
              timezone: '',
              bookingAdvance: '',
              maxBookingsPerDay: '',
            },
            location: {
              type: '', // 'studio', 'home', etc.
              address: '',
              city: '',
              state: '',
              country: '',
              coordinates: undefined, // { type: 'Point', coordinates: [lng, lat] } or undefined
            },
            requirements: [],
            deliverables: [],
            tags: [],
            link: '',
            deliveryOptions: 'online',
          }
        });
        break;
      case 'Business':
        setBusinessForm({
          formData: {
            postType: 'photo',
            caption: '',
            description: '',
            image: [],
            mentions: [],
            settings: {
              visibility: postPrivacy,
              allowComments: true,
              allowLikes: true,
            },
            status: 'scheduled',
            business: {
              businessName: '',
              businessType: '',
              description: '',
              category: '',
              subcategory: '',
              contact: {
                phone: '',
                email: '',
                website: '',
                socialMedia: [],
              },
              location: {
                address: '',
                city: '',
                state: '',
                country: '',
                postalCode: '',
              },
              hours: [],
              features: [],
              priceRange: '',
              rating: 0,
              tags: [],
              announcement: '',
              promotions: [],
              link: '',
              deliveryOptions: 'online',
            }
          }
        });
        break;
    }
  }, []);

  // Reset form data when content type changes
  const resetFormData = React.useCallback(() => {
    setSharedForm({
      description: '',
      image: [],
      location: {
        name: '',
        address: '',
        city: '',
        state: '',
        country: ''
      },
      tags: [],
      category: 'Personal',
      customCategory: '',
    });

    // Reset all post type forms
    clearPostTypeForm('Regular');
    clearPostTypeForm('Product');
    clearPostTypeForm('Service');
    clearPostTypeForm('Business');

    setPostType('Regular');
    setVideoDuration(null);
    setShowReelVisibility(false);
    setReelVisibility(false);
    setError(null);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  }, [clearPostTypeForm]);

  // Watch for content type changes and reset form data
  useEffect(() => {
    if (contentType !== previousContentType && previousContentType !== '') {
      resetFormData();
    }
    setPreviousContentType(contentType);
  }, [contentType, previousContentType, resetFormData]);

  // Watch for post type changes and clear form data when switching
  useEffect(() => {
    if (postType !== previousPostType && previousPostType !== '') {
      // Clear the form data for the post type being switched away from
      clearPostTypeForm(previousPostType);

      // Also clear the common description field when switching between post types
      setSharedForm(prev => ({
        ...prev,
        description: ''
      }));
    }
    setPreviousPostType(postType);
  }, [postType, previousPostType, clearPostTypeForm]);

  // Flags come from global store: no fetch here for instant updates

  // Ensure selected postType remains valid if business profile status changes
  useEffect(() => {
    if (!isBusinessProfile) {
      // If user is not a business profile, reset to Regular and clear business forms
      if (postType === 'Product' || postType === 'Service' || postType === 'Business') {
        clearPostTypeForm(postType); // Clear the current business form
        setPostType('Regular');
        // Clear description when switching from business to personal account
        setSharedForm(prev => ({
          ...prev,
          description: ''
        }));
      }
    } else {
      // If user is a business profile, reset invalid post types
      if (postType === 'Product' && !allowProduct) {
        clearPostTypeForm('Product');
        setPostType('Regular');
        setSharedForm(prev => ({
          ...prev,
          description: ''
        }));
      }
      if (postType === 'Service' && !allowService) {
        clearPostTypeForm('Service');
        setPostType('Regular');
        setSharedForm(prev => ({
          ...prev,
          description: ''
        }));
      }
      if (postType === 'Business' && !allowBusiness) {
        clearPostTypeForm('Business');
        setPostType('Regular');
        setSharedForm(prev => ({
          ...prev,
          description: ''
        }));
      }
    }
  }, [isBusinessProfile, allowProduct, allowService, allowBusiness, postType]);

  // Prefill Business post fields from business profile when Business type is selected
  useEffect(() => {
    let cancelled = false;
    const prefillFromBusinessProfile = async () => {
      if (!isBusinessProfile || postType !== 'Business') return;
      try {
        const resp = await GetBusinessDetails();
        const biz = resp?.data?.business || resp?.business || resp;
        if (!biz || cancelled) return;

        setBusinessForm(prev => {
          const next = { ...prev };
          next.formData.business.businessName = biz.businessName || next.formData.business.businessName;
          next.formData.business.businessType = biz.category || next.formData.business.businessType;
          next.formData.business.category = biz.category || next.formData.business.category;
          next.formData.business.subcategory = biz.subcategory || next.formData.business.subcategory;
          next.formData.business.description = biz.description || next.formData.business.description;
          next.formData.business.link = biz.website || next.formData.business.link;
          // Tags from business can help; keep existing if already set
          if (Array.isArray(biz.tags) && biz.tags.length > 0 && (!next.formData.business.tags || next.formData.business.tags.length === 0)) {
            next.formData.business.tags = biz.tags.slice(0, 10);
          }
          // Contact
          if (biz.contact) {
            next.formData.business.contact.phone = biz.contact.phone || next.formData.business.contact.phone;
            next.formData.business.contact.email = biz.contact.email || next.formData.business.contact.email;
            next.formData.business.contact.website = biz.contact.website || next.formData.business.contact.website;
            next.formData.business.contact.socialMedia = Array.isArray(biz.contact.socialMedia) ? biz.contact.socialMedia : next.formData.business.contact.socialMedia;
          }
          // Location
          if (biz.location) {
            next.formData.business.location.address = biz.location.address || next.formData.business.location.address;
            next.formData.business.location.city = biz.location.city || next.formData.business.location.city;
            next.formData.business.location.state = biz.location.state || next.formData.business.location.state;
            next.formData.business.location.country = biz.location.country || next.formData.business.location.country;
          }
          return next;
        });

        // Also prefill shared location name for convenience if empty
        setSharedForm(prev => {
          if (prev.location?.name) return prev;
          const composed = [biz?.location?.city, biz?.location?.state].filter(Boolean).join(', ');
          return {
            ...prev,
            location: {
              name: composed || prev.location.name,
              address: biz?.location?.address || '',
              city: biz?.location?.city || '',
              state: biz?.location?.state || '',
              country: biz?.location?.country || ''
            }
          };
        });
      } catch {
        // Ignore errors; user can still fill manually
      }
    };
    prefillFromBusinessProfile();
    return () => { cancelled = true; };
  }, [isBusinessProfile, postType]);

  // Initialize location from user profile ONCE when empty
  useEffect(() => {
    if (!hasInitializedLocation && user?.location && !sharedForm.location.name) {
      setSharedForm(prev => ({
        ...prev,
        location: {
          name: user.location || '',
          address: '',
          city: '',
          state: '',
          country: ''
        }
      }));
      setHasInitializedLocation(true);
    }
  }, [user?.location, sharedForm.location.name, hasInitializedLocation]);

  // Update all form settings when privacy changes
  useEffect(() => {
    setRegularForm(prev => ({
      ...prev,
      settings: { ...prev.settings, visibility: postPrivacy }
    }));
    setProductForm(prev => ({
      ...prev,
      settings: { ...prev.settings, visibility: postPrivacy }
    }));
    setServiceForm(prev => ({
      ...prev,
      settings: { ...prev.settings, visibility: postPrivacy }
    }));
    setBusinessForm(prev => ({
      formData: {
        ...prev.formData,
        settings: { ...prev.formData.settings, visibility: postPrivacy }
      }
    }));
  }, [postPrivacy]);

  // Removed duplicate location initialization effects to avoid overwriting manual edits

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
    } catch {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  };

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSharedForm({ ...sharedForm, location: { name: value, address: '', city: '', state: '', country: '' } });
    // Mark as initialized so profile prefill won't reapply after manual edits
    if (!hasInitializedLocation) {
      setHasInitializedLocation(true);
    }

    // Clear previous timeout
    if (locationSearchTimeout) {
      clearTimeout(locationSearchTimeout);
    }

    // Debounce location search
    const timeout = setTimeout(() => {
      searchLocationSuggestions(value);
    }, 500);

    setLocationSearchTimeout(timeout);
  };

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    const address = suggestion.address;

    // Extract location details for better coordinate resolution
    const city = address.town || address.city || '';
    const state = address.state || '';
    const country = address.country || '';
    const postcode = address.postcode || '';

    // Build full address string
    const addressParts = [
      suggestion.name,
      city,
      state,
      postcode,
      country
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    // Format display name as "City, State" or just "City" if no state
    let displayName = '';
    if (city && state) {
      displayName = `${city}, ${state}`;
    } else if (city) {
      displayName = city;
    } else {
      displayName = suggestion.name;
    }

    // Store complete location object for better backend resolution
    const completeLocation = {
      name: displayName,
      address: fullAddress,
      city: city,
      state: state,
      country: country
    };

    setSharedForm({ ...sharedForm, location: completeLocation });
    // Ensure we don't re-fill from profile after a selection
    if (!hasInitializedLocation) {
      setHasInitializedLocation(true);
    }
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

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

  // Image compression utility
  const compressImage = (file: File, quality: number = 0.8, maxWidth: number = 1920): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new window.Image();

      img.onload = () => {
        // Calculate new dimensions
        const { width, height } = img;
        const aspectRatio = width / height;

        let newWidth = width;
        let newHeight = height;

        if (width > maxWidth) {
          newWidth = maxWidth;
          newHeight = maxWidth / aspectRatio;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw and compress
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Video compression utility using canvas and ffmpeg-like approach
  const compressVideo = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Set compressed dimensions (reduce by 50% if too large)
        const maxWidth = 1280;
        const maxHeight = 720;

        let { videoWidth: width, videoHeight: height } = video;
        const aspectRatio = width / height;

        if (width > maxWidth) {
          width = maxWidth;
          height = maxWidth / aspectRatio;
        }
        if (height > maxHeight) {
          height = maxHeight;
          width = maxHeight * aspectRatio;
        }

        canvas.width = width;
        canvas.height = height;

        // Create MediaRecorder for video compression
        const stream = canvas.captureStream(25); // 25 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 1000000 // 1Mbps
        });

        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: 'video/webm' });
          const compressedFile = new File([compressedBlob],
            file.name.replace(/\.[^/.]+$/, '.webm'), {
            type: 'video/webm',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        };

        // Start recording and play video
        mediaRecorder.start();
        video.currentTime = 0;
        video.play();

        video.ontimeupdate = () => {
          if (video.currentTime < video.duration) {
            ctx.drawImage(video, 0, 0, width, height);
          } else {
            video.pause();
            mediaRecorder.stop();
            URL.revokeObjectURL(video.src);
          }
        };
      };

      video.onerror = () => reject(new Error('Failed to load video for compression'));
    });
  };

  // Optimize file based on type and size
  const optimizeFile = async (file: File): Promise<File> => {
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit for Cloudinary

    if (file.size <= maxSizeBytes) {
      return file; // No optimization needed
    }

    setIsOptimizing(true);

    try {
      if (file.type.startsWith('image/')) {
        // Compress image with progressive quality reduction
        let quality = 0.8;
        let optimizedFile = await compressImage(file, quality);

        // Keep reducing quality until under size limit
        while (optimizedFile.size > maxSizeBytes && quality > 0.3) {
          quality -= 0.1;
          optimizedFile = await compressImage(file, quality, 1280); // Also reduce max width
        }

        return optimizedFile;
      } else if (file.type === 'video/mp4') {
        // For large videos, use basic compression
        const optimizedFile = await compressVideo(file);
        return optimizedFile;
      }
    } catch {
      toast.error('File optimization failed. Please try a smaller file.');
    } finally {
      setIsOptimizing(false);
    }

    return file;
  };

  const detectVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        resolve(duration);
      };

      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const updatePostTypeBasedOnVideo = async (file: File) => {
    if (file.type === 'video/mp4' || file.type === 'video/quicktime' || file.type === 'video/webm') {
      try {
        const duration = await detectVideoDuration(file);
        setVideoDuration(duration);

        // Show reel visibility option if video is under 1 minute
        if (duration <= 60) { // 60 seconds = 1 minute
          setShowReelVisibility(true);
          // Don't automatically set to reel - let user choose
          setRegularForm(prev => ({ ...prev, postType: 'video' }));

          // Show notification about Reel availability
          toast.success(`Video is ${Math.round(duration)}s - Perfect for a Reel! 🎬`, {
            position: "top-right",
            autoClose: 3000,
          });
        } else {
          setShowReelVisibility(false);
          setReelVisibility(false);
          setRegularForm(prev => ({ ...prev, postType: 'video' }));

          // Show notification about video being too long for Reel
          toast.info(`Video is ${Math.round(duration)}s - Too long for Reel (max 60s)`, {
            position: "top-right",
            autoClose: 3000,
          });
        }
      } catch {
        // Default to video if we can't detect duration
        setShowReelVisibility(false);
        setReelVisibility(false);
        setRegularForm(prev => ({ ...prev, postType: 'video' }));
      }
    }
  };

  const [regularForm, setRegularForm] = useState({
    postType: 'photo',
    mood: 'Content', // Default mood since UI field is hidden
    activity: 'Chilling', // Default activity since UI field is hidden
    mentions: [] as string[],
    settings: {
      visibility: 'public' as 'public' | 'private',
      allowComments: true,
      allowLikes: true,
    },
    status: 'scheduled',
  });

  const [productForm, setProductForm] = useState({
    postType: 'photo',
    mentions: [] as string[],
    mood: 'testing',
    activity: 'testing',
    settings: {
      visibility: 'public',
      allowComments: true,
      allowLikes: true,
    },
    product: {
      name: '',
      price: 0,
      currency: '',
      link: '',
      inStock: true,
      deliveryOptions: 'online',
    },
    status: 'scheduled',
  });

  const [serviceForm, setServiceForm] = useState({
    // Shared post fields
    postType: 'photo', // or whatever type you need
    mentions: [], // Array of user IDs
    settings: {
      visibility: 'public',
      allowComments: true,
      allowLikes: true,
    },
    status: 'scheduled',

    // Service-specific fields (as an object)
    service: {
      name: '',
      description: '',
      price: 0,
      currency: 'INR',
      category: '',
      subcategory: '',
      duration: 0,
      serviceType: '', // 'in-person', 'online', 'hybrid'
      availability: {
        schedule: [], // [{ day: 'Monday', timeSlots: [{ startTime: '', endTime: '' }] }]
        timezone: '',
        bookingAdvance: '',
        maxBookingsPerDay: '',
      },
      location: {
        type: '', // 'studio', 'home', etc.
        address: '',
        city: '',
        state: '',
        country: '',
        coordinates: undefined, // { type: 'Point', coordinates: [lng, lat] } or undefined
      },
      requirements: [],
      deliverables: [],
      tags: [],
      link: '',
      deliveryOptions: 'online',
    }
  });

  const [businessForm, setBusinessForm] = useState({
    formData: {
      postType: 'photo',
      caption: '',
      description: '',
      image: [],
      mentions: [],
      settings: {
        visibility: 'public',
        allowComments: true,
        allowLikes: true,
      },
      status: 'scheduled',
      business: {
        businessName: '',
        businessType: '',
        description: '',
        category: '',
        subcategory: '',
        contact: {
          phone: '',
          email: '',
          website: '',
          socialMedia: [],
        },
        location: {
          address: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
        },
        hours: [],
        features: [],
        priceRange: '',
        rating: 0,
        tags: [],
        announcement: '',
        promotions: [],
        link: '',
        deliveryOptions: 'online',
      }
    },
  });

  const handleRegularChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRegularForm(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleProductChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const { name, value, type } = target;

    setProductForm((prev) => ({
      ...prev,
      product: {
        ...prev.product,
        [name]: name === 'price' ? (value === '' ? 0 : Number(value)) : (type === 'checkbox' ? (target as HTMLInputElement).checked : value),
      },
    }));
  };

  const handleServiceChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setServiceForm((prev) => {
      // 1. Fields inside service
      if (name in prev.service) {
        const computedValue =
          name === 'price'
            ? (value === '' ? 0 : Number(value))
            : (type === 'checkbox' ? (e.target as HTMLInputElement).checked : value);
        return {
          ...prev,
          service: {
            ...prev.service,
            [name]: computedValue,
          }
        };
      }
      // 2. Top-level fields
      if (name in prev) {
        return {
          ...prev,
          [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        };
      }
      // 3. Fields inside service.location
      if (name in prev.service.location) {
        return {
          ...prev,
          service: {
            ...prev.service,
            location: {
              ...prev.service.location,
              [name]: value,
            }
          }
        };
      }
      // 4. Fields inside service.availability
      if (name in prev.service.availability) {
        return {
          ...prev,
          service: {
            ...prev.service,
            availability: {
              ...prev.service.availability,
              [name]: value,
            }
          }
        };
      }
      // 5. Add more nested cases as needed (e.g., requirements, deliverables, tags, etc.)

      return prev; // fallback
    });
  };

  const handleBusinessChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setBusinessForm((prev) => {
      const formData = { ...prev.formData };

      // Handle location fields
      if (name === 'address') {
        formData.business.location.address = value;
      }
      // Handle promotion fields
      else if (name === 'discount' || name === 'isActive' || name === 'validUntil') {
        if (!formData.business.promotions[0]) {
          (formData.business.promotions as any)[0] = {
            title: '',
            description: '',
            discount: 0,
            validUntil: '',
            isActive: false
          };
        }

        if (name === 'discount') {
          (formData.business.promotions as any)[0].discount = Number(value);
        } else if (name === 'isActive') {
          (formData.business.promotions as any)[0].isActive = value === 'Active';
        } else if (name === 'validUntil') {
          (formData.business.promotions as any)[0].validUntil = value;
        }
      }
      // Handle all other business fields
      else if (name in formData.business) {
        formData.business[name] = value;
      }

      return { ...prev, formData };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Clear the input value immediately so selecting the same file again will trigger onChange
    try { (e.target as HTMLInputElement).value = ''; } catch { }

    // Check file limits based on content type
    const maxFiles = contentType === 'Post' ? 10 : 1;
    if (files.length + sharedForm.image.length > maxFiles) {
      const limitMessage = contentType === 'Post'
        ? 'You can upload a maximum of 10 files per post.'
        : `You can upload only 1 file for ${contentType.toLowerCase()}s.`;
      toast.error(limitMessage, {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Function to check if a file is a duplicate
    const isDuplicateFile = (newFile: File, existingFiles: File[]): boolean => {
      return existingFiles.some(existingFile =>
        existingFile.name === newFile.name &&
        existingFile.size === newFile.size &&
        existingFile.type === newFile.type &&
        existingFile.lastModified === newFile.lastModified
      );
    };

    // Filter out duplicate files
    const uniqueFiles = files.filter(file => {
      const isDuplicate = isDuplicateFile(file, sharedForm.image);
      if (isDuplicate) {
        toast.warning(`"${file.name}" is already added to this post.`, {
          position: "top-right",
          autoClose: 3000,
        });
      }
      return !isDuplicate;
    });

    // If no unique files to process, return early
    if (uniqueFiles.length === 0) {
      return;
    }

    const optimizedFiles: File[] = [];

    // Show optimization progress
    if (uniqueFiles.some(file => file.size > 10 * 1024 * 1024)) {
      toast.info('Large files detected. Optimizing for upload...', {
        position: "top-right",
        autoClose: 3000,
      });
    }

    // Optimize each unique file
    for (const file of uniqueFiles) {
      try {
        const optimizedFile = await optimizeFile(file);
        optimizedFiles.push(optimizedFile);

        // Check for MP4 videos and update post type accordingly
        if (file.type === 'video/mp4' || file.type === 'video/quicktime' || file.type === 'video/webm' || optimizedFile.type.startsWith('video/')) {
          await updatePostTypeBasedOnVideo(optimizedFile);
        }
      } catch {
        toast.error(`Failed to optimize ${file.name}. Please try a smaller file.`);
        return;
      }
    }

    setSharedForm((prev) => ({
      ...prev,
      image: [...prev.image, ...optimizedFiles]
    }));

    // Show success message if files were optimized
    const originalSize = uniqueFiles.reduce((acc, file) => acc + file.size, 0);
    const optimizedSize = optimizedFiles.reduce((acc, file) => acc + file.size, 0);

    if (originalSize > optimizedSize) {
      const savedMB = ((originalSize - optimizedSize) / 1024 / 1024).toFixed(1);
      toast.success(`Files optimized! Saved ${savedMB}MB of upload data.`, {
        position: "top-right",
        autoClose: 3000,
      });
    }

    // Show success message for added files
    if (optimizedFiles.length > 0) {
      const fileWord = optimizedFiles.length === 1 ? 'file' : 'files';
      toast.success(`${optimizedFiles.length} ${fileWord} added successfully.`, {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };

  const removeImage = (index: number) => {
    const removedFile = sharedForm.image[index];
    setSharedForm({ ...sharedForm, image: sharedForm.image.filter((_, i) => i !== index) });

    // Reset video duration and post type if removing a video
    if (removedFile.type === 'video/mp4' || removedFile.type === 'video/quicktime' || removedFile.type === 'video/webm') {
      setVideoDuration(null);
      setShowReelVisibility(false);
      setReelVisibility(false);
      setRegularForm(prev => ({ ...prev, postType: 'photo' }));

      // Show info if user had Reel selected but removed video
      if (contentType === 'Reel') {
        toast.info('Video removed. You can upload another video for your Reel.', {
          position: "top-right",
          autoClose: 3000,
        });
      }
    }
  };

  const organizeMediaForReel = (mediaFiles: File[]) => {
    if (!reelVisibility || !showReelVisibility) {
      return mediaFiles;
    }

    // Separate videos and images
    const videos = mediaFiles.filter(file => file.type === 'video/mp4' || file.type === 'video/quicktime' || file.type === 'video/webm');
    const images = mediaFiles.filter(file => file.type.startsWith('image/'));

    // Put videos first, then images
    return [...videos, ...images];
  };

  const buildPostPayload = () => {
    // Organize media if reel visibility is enabled
    const organizedMedia = organizeMediaForReel(sharedForm.image);

    // Determine final category (use customCategory if "Other" is selected and customCategory has value)
    const finalCategory = sharedForm.category === 'Other' && sharedForm.customCategory.trim()
      ? sharedForm.customCategory.trim()
      : sharedForm.category;

    // Create shared form with caption set to description value, organized media, and category
    const sharedFormWithCaption = {
      ...sharedForm,
      caption: sharedForm.description,
      image: organizedMedia,
      category: finalCategory
    };

    // Determine if we should set postType to 'reel' based on reel visibility toggle
    const shouldBeReel = reelVisibility && showReelVisibility;

    // Determine the final post type for each post type
    let finalRegularForm = { ...regularForm };
    let finalProductForm = { ...productForm };
    let finalServiceForm = { ...serviceForm };

    if (shouldBeReel) {
      finalRegularForm = { ...regularForm, postType: 'reel' };
      finalProductForm = { ...productForm, postType: 'reel' };
      finalServiceForm = { ...serviceForm, postType: 'reel' };
    }

    switch (postType) {
      case 'Regular':
        return { ...sharedFormWithCaption, ...finalRegularForm };
      case 'Product':
        return { ...sharedFormWithCaption, ...finalProductForm };
      case 'Service':
        return { ...sharedFormWithCaption, ...finalServiceForm };
      case 'Business':
        return {
          ...businessForm.formData,  // Get the business form data
          postType: shouldBeReel ? 'reel' : businessForm.formData.postType, // Set reel postType if applicable
          ...sharedFormWithCaption,  // Override with shared form data (images, etc.)
          business: businessForm.formData.business  // Keep the business object
        };
      default:
        return { ...sharedFormWithCaption };
    }
  };

  // Form validation function
  const validateForm = () => {
    // Stories and Reels require media
    if ((contentType === 'Story' || contentType === 'Reel') && sharedForm.image.length === 0) {
      toast.error(`${contentType} requires at least one image or video`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return false;
    }

    // Reels must have a video under 60 seconds
    if (contentType === 'Reel') {
      const hasVideo = sharedForm.image.some(file =>
        file.type === 'video/mp4' || file.type === 'video/quicktime' || file.type === 'video/webm'
      );

      if (!hasVideo) {
        toast.error('Reels require a video file', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return false;
      }

      if (videoDuration && videoDuration > 60) {
        toast.error(`Video is ${Math.round(videoDuration)} seconds long. Reel videos must be under 60 seconds.`, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return false;
      }
    }

    // Check if "Other" category is selected but custom category is empty
    if (sharedForm.category === 'Other' && !sharedForm.customCategory.trim()) {
      toast.error('Please enter a custom category or select a different category', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return false;
    }

    // Check location requirement based on delivery options (only for business accounts)
    const isLocationRequired = isBusinessProfile && (
      (postType === 'Product' && (productForm.product.deliveryOptions === 'offline' || productForm.product.deliveryOptions === 'both')) ||
      (postType === 'Service' && (serviceForm.service.deliveryOptions === 'offline' || serviceForm.service.deliveryOptions === 'both')) ||
      (postType === 'Business' && (businessForm.formData.business.deliveryOptions === 'offline' || businessForm.formData.business.deliveryOptions === 'both'))
    );

    if (isLocationRequired && !sharedForm.location.name?.trim()) {
      toast.error('Location is required for offline or both delivery options', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return false;
    }

    // Business-specific validation (only for business accounts)
    if (isBusinessProfile && postType === 'Business') {
      const business = businessForm.formData.business;

      if (!business.businessName?.trim()) {
        toast.error('Business name is required', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return false;
      }

      if (!business.link?.trim()) {
        toast.error('Business link is required', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return false;
      }

      if (!business.announcement?.trim()) {
        toast.error('Business announcement is required', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return false;
      }

      if (!business.location?.address?.trim()) {
        toast.error('Business location is required', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return false;
      }

      if (!business.description?.trim()) {
        toast.error('Business description is required', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return false;
      }
    }

    return true;
  };

  const handlePost = async () => {
    // Handle different content types
    if (contentType === 'Story') {
      // Story requires a single media (image or short video optionally)
      if (sharedForm.image.length === 0) {
        toast.error('Please add an image or video for your story', { position: 'top-right', autoClose: 3000 });
        return;
      }
      if (sharedForm.image.length > 1) {
        toast.error('Only one media can be uploaded for a story', { position: 'top-right', autoClose: 3000 });
        return;
      }

      const media = sharedForm.image[0];
      try {
        setLoading(true);
        setError(null);
        await storyAPI.uploadStory({ media, caption: sharedForm.description });
        toast.success('Story shared successfully!', { position: 'top-right', autoClose: 3000 });
        closeModal();
      } catch (_error) {
        const msg = isAxiosError(_error) ? ((_error.response?.data as any)?.message || _error.message) : 'Failed to share story';
        setError(msg);
        toast.error(msg, { position: 'top-right', autoClose: 4000 });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (contentType === 'Reel') {
      // Check if there's any video
      const hasVideo = sharedForm.image.some(file =>
        file.type === 'video/mp4' || file.type === 'video/quicktime' || file.type === 'video/webm'
      );

      if (!hasVideo) {
        toast.error('Please upload a video to create a Reel', {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      // Check if video is under 60 seconds
      if (videoDuration && videoDuration > 60) {
        toast.error(`Video is ${Math.round(videoDuration)} seconds long. Please upload a video under 60 seconds for Reels.`, {
          position: "top-right",
          autoClose: 4000,
        });
        return;
      }

      // Validate form before submission (same as regular posts)
      if (!validateForm()) {
        return;
      }

      // Organize media and build payload based on postType
      const organizedMedia = organizeMediaForReel(sharedForm.image);

      // Determine final category
      const finalCategory = sharedForm.category === 'Other' && sharedForm.customCategory.trim()
        ? sharedForm.customCategory.trim()
        : sharedForm.category;

      const sharedFormWithCaption = {
        ...sharedForm,
        caption: sharedForm.description,
        image: organizedMedia,
        category: finalCategory
      };

      try {
        setLoading(true);
        setError(null);
        let response;

        // Create reel based on selected postType
        if (postType === 'Regular') {
          const reelRegularForm = { ...regularForm, postType: 'reel' };
          const payload: RegularPostPayload = {
            ...sharedFormWithCaption,
            ...reelRegularForm,
          } as unknown as RegularPostPayload;
          console.log('[REEL CONTENT TYPE] Creating Regular Reel with payload:', payload);
          response = await createRegularPost(payload);
        } else if (postType === 'Product') {
          const reelProductForm = { ...productForm, postType: 'reel' };
          const payload = { ...sharedFormWithCaption, ...reelProductForm };
          console.log('[REEL CONTENT TYPE] Creating Product Reel with payload:', payload);
          response = await createProductPost({ formData: payload } as unknown as ProductDetailsFormProps);
        } else if (postType === 'Service') {
          const reelServiceForm = { ...serviceForm, postType: 'reel' };
          const payload = { ...sharedFormWithCaption, ...reelServiceForm };
          console.log('[REEL CONTENT TYPE] Creating Service Reel with payload:', payload);
          response = await createServicePost({ formData: payload } as unknown as ServiceDetailsFormProps);
        } else if (postType === 'Business') {
          const reelBusinessForm = {
            ...businessForm.formData,
            postType: 'reel',
            ...sharedFormWithCaption,
            business: businessForm.formData.business
          };
          console.log('[REEL CONTENT TYPE] Creating Business Reel with payload:', reelBusinessForm);
          response = await createBusinessPost({ formData: reelBusinessForm } as unknown as BusinessPostFormProps);
        }

        if (response && (response.status === 200 || response.status === 201)) {
          toast.success('Reel created successfully!', { position: 'top-right', autoClose: 3000 });
          postRefreshEvents.emitPostCreated(response.data || response);
          closeModal();
        } else {
          throw new Error('Reel creation failed - unexpected response');
        }
      } catch (_error) {
        let userMessage = 'Failed to create reel. Please try again.';
        if (isAxiosError(_error)) {
          userMessage = ((_error.response?.data as any)?.message || _error.message) || userMessage;

          // Check if the error is related to coordinate resolution
          const isCoordinateError = userMessage.toLowerCase().includes('could not resolve coordinates');

          // For normal reels, coordinate resolution errors are no longer thrown by backend
          // For product/service/business reels with offline delivery, coordinates are required
          const isOfflineDeliveryPost = isBusinessProfile && (
            (postType === 'Product' && (productForm.product.deliveryOptions === 'offline' || productForm.product.deliveryOptions === 'both')) ||
            (postType === 'Service' && (serviceForm.service.deliveryOptions === 'offline' || serviceForm.service.deliveryOptions === 'both')) ||
            (postType === 'Business' && (businessForm.formData.business.deliveryOptions === 'offline' || businessForm.formData.business.deliveryOptions === 'both'))
          );

          // Only show coordinate error for offline delivery posts
          if (isCoordinateError && isOfflineDeliveryPost) {
            userMessage = 'Location coordinates are required for offline delivery. Please provide a valid location.';
          } else if (isCoordinateError && postType === 'Regular') {
            // For normal reels, coordinate resolution failure should not block creation
            console.warn('Coordinate resolution failed for regular reel, but reel should still be created');
            // Don't show error to user - reel should succeed
            return;
          }
        } else if (_error instanceof Error) {
          userMessage = _error.message || userMessage;
        }

        setError(userMessage);
        toast.error(userMessage, { position: 'top-right', autoClose: 5000 });
      } finally {
        setLoading(false);
      }
      return;
    }

    // For regular posts, validate form before submission
    if (!validateForm()) {
      return;
    }

    const finalPayload = buildPostPayload();
    //console.log('Final payload for business post:', finalPayload);
    setLoading(true);
    setError(null);

    try {
      let response;

      if (postType === 'Regular') {
        const regularPayload = finalPayload as RegularPostPayload;
        console.log('[POST CONTENT TYPE] Creating Regular Post with payload:', regularPayload);
        response = await createRegularPost(regularPayload);
      } else if (postType === 'Product') {
        const productPayload = finalPayload;
        console.log('[POST CONTENT TYPE] Creating Product Post with payload:', productPayload);
        response = await createProductPost({ formData: productPayload } as unknown as ProductDetailsFormProps);
      } else if (postType === 'Service') {
        const servicePayload = finalPayload;
        console.log('[POST CONTENT TYPE] Creating Service Post with payload:', servicePayload);
        response = await createServicePost({ formData: servicePayload } as unknown as ServiceDetailsFormProps);
      } else if (postType === 'Business') {
        const businessPayload = finalPayload;
        console.log('[POST CONTENT TYPE] Creating Business Post with payload:', businessPayload);
        response = await createBusinessPost({ formData: businessPayload } as unknown as BusinessPostFormProps);
      }

      // Only show success toast if we actually got a successful response
      if (response && (response.status === 200 || response.status === 201 || response.success)) {
        const successMessage = postType === 'Business'
          ? 'Business post created successfully!'
          : 'Post created successfully!';

        toast.success(successMessage, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        // Optional: Check if location exists but coordinates weren't resolved
        // Show info message (not error) for normal posts
        if (postType === 'Regular' && response.data?.data) {
          const post = response.data.data;
          const location = post.customization?.normal?.location;
          if (location?.name && !location?.coordinates) {
            // Coordinates weren't resolved but post was created successfully
            // Show optional info message
            toast.info('Post created successfully. Location coordinates could not be resolved, but your post is published.', {
              position: "top-right",
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          }
        }

        // Emit post refresh event to update current page without reload
        postRefreshEvents.emitPostCreated(response.data || response);

        // Close modal immediately after successful post creation
        closeModal();
      } else {
        // Handle case where API doesn't return expected success response
        throw new Error('Post creation failed - unexpected response');
      }


    } catch (_error) {
      console.error('Error creating post:', _error);
      //console.log('Post type:', postType);

      let userMessage = 'Failed to create post. Please try again.';
      if (isAxiosError(_error)) {
        userMessage = (_error.response?.data as any)?.message || _error.message || userMessage;

        // Check if the error is related to coordinate resolution
        const isCoordinateError = userMessage.toLowerCase().includes('could not resolve coordinates');

        // For normal posts, coordinate resolution errors are no longer thrown by backend
        // But we still handle it gracefully if it somehow occurs
        // For product/service/business posts with offline delivery, coordinates are required
        const isOfflineDeliveryPost = isBusinessProfile && (
          (postType === 'Product' && (productForm.product.deliveryOptions === 'offline' || productForm.product.deliveryOptions === 'both')) ||
          (postType === 'Service' && (serviceForm.service.deliveryOptions === 'offline' || serviceForm.service.deliveryOptions === 'both')) ||
          (postType === 'Business' && (businessForm.formData.business.deliveryOptions === 'offline' || businessForm.formData.business.deliveryOptions === 'both'))
        );

        // Only show coordinate error for offline delivery posts
        if (isCoordinateError && isOfflineDeliveryPost) {
          userMessage = 'Location coordinates are required for offline delivery. Please provide a valid location.';
        } else if (isCoordinateError && postType === 'Regular') {
          // For normal posts, coordinate resolution failure should not block post creation
          // Backend now allows posts without coordinates, so this error shouldn't occur
          // But if it does, we'll treat it as a non-blocking issue
          console.warn('Coordinate resolution failed for regular post, but post should still be created');
          // Don't show error to user - post should succeed
          return;
        }

        // Check if the error is related to business profile not found
        const isBusinessProfileError = postType === 'Business' && (
          userMessage.toLowerCase().includes('business profile not found') ||
          userMessage.toLowerCase().includes('no business profile') ||
          userMessage.toLowerCase().includes('business not found') ||
          userMessage.toLowerCase().includes('business details not found') ||
          userMessage.toLowerCase().includes('please add business details') ||
          userMessage.toLowerCase().includes('complete your business profile') ||
          userMessage.toLowerCase().includes('business profile is required') ||
          userMessage.toLowerCase().includes('create business profile') ||
          _error.response?.status === 404 ||
          // Fallback: Any error when creating business post could be profile related
          (_error.response?.status !== undefined && _error.response.status >= 400 && _error.response.status < 500)
        );

        //console.log('Is business profile error:', isBusinessProfileError);

        if (isBusinessProfileError) {
          //console.log('Opening business profile modal...');

          toast.error('Business profile not found. Please add your business details first.', {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });

          // Open business profile modal
          setShowBusinessProfileModal(true);
          //console.log('Business modal state set to true');
          return; // Don't show the generic error
        }
      } else if (_error instanceof Error) {
        userMessage = _error.message || userMessage;
      }
      setError(userMessage);

      toast.error(userMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

    } finally {
      setLoading(false);
    }
  };

  // Reset error state when modal closes
  const handleCloseModal = () => {
    setError(null);
    closeModal();
  };

  // Business profile modal handlers
  const handleBusinessProfileSubmit = () => {
    //console.log('Business profile submitted:', data);
    setShowBusinessProfileModal(false);
    // Optionally, you can retry the business post creation here
    toast.success('Business profile added successfully! You can now create business posts.', {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  const handleBusinessProfileClose = () => {
    setShowBusinessProfileModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Create Post</h2>
          <button
            onClick={handleCloseModal}
            className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto subtle-scrollbar p-6">
          {/* User Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-button-gradient rounded-full flex items-center justify-center text-black font-semibold">
                {user?.profileImageUrl ? <Image src={user?.profileImageUrl} alt="Profile" width={48} height={48} className="rounded-full" /> : user?.fullName?.charAt(0)}
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-800">{user?.fullName}</h3>
                <p className="text-sm text-gray-500">{user?.username}</p>
              </div>
            </div>
            <Button
              onClick={handlePost}
              className="px-6 py-2 bg-button-gradient text-black rounded-lg hover:bg-[#b8871f] transition-colors cursor-pointer"
              disabled={loading || isOptimizing}
            >
              {loading ?
                `${contentType === 'Post' ? 'Posting' : contentType === 'Story' ? 'Sharing Story' : 'Creating Reel'}...` :
                `Submit ${contentType}`
              }
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}


          {/* Content Type Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Content Type</h3>
            <div className="flex space-x-4 mb-4">
              <Button
                variant='custom'
                onClick={() => setContentType('Post')}
                className={`px-6 py-2 rounded-lg border transition-colors ${contentType === 'Post'
                  ? 'border-[#ffd65c] bg-[#fefdf5] text-[#b8871f]'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  } flex-1 justify-center`}
              >
                📝 Post
              </Button>
              <Button
                variant='custom'
                onClick={() => setContentType('Reel')}
                className={`px-6 py-2 rounded-lg border transition-colors ${contentType === 'Reel'
                  ? 'border-[#ffd65c] bg-[#fefdf5] text-[#b8871f]'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  } flex-1 justify-center`}
              >
                🎬 Reel
              </Button>
              <Button
                variant='custom'
                onClick={() => setContentType('Story')}
                className={`px-6 py-2 rounded-lg border transition-colors ${contentType === 'Story'
                  ? 'border-[#ffd65c] bg-[#fefdf5] text-[#b8871f]'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  } flex-1 justify-center`}
              >
                📷 Story
              </Button>
            </div>
            {contentType === 'Reel' && videoDuration && videoDuration > 60 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ For Reels, videos should be under 60 seconds. Your current video is {Math.round(videoDuration)} seconds long.
                </p>
              </div>
            )}
          </div>

          {/* Media Section (moved up) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Media</span>
              <span className="text-sm text-gray-500">
                {sharedForm.image.length}/{contentType === 'Post' ? '10' : '1'}
              </span>
            </div>
            <div className={`border-2 border-dashed rounded-lg p-8 text-center ${(contentType === 'Post' ? sharedForm.image.length >= 10 : sharedForm.image.length >= 1)
              ? 'border-gray-200 bg-gray-50'
              : 'border-gray-300'
              }`}>
              <Camera className={`mx-auto mb-4 ${(contentType === 'Post' ? sharedForm.image.length >= 10 : sharedForm.image.length >= 1) ? 'text-gray-300' : 'text-gray-400'
                }`} size={48} />
              <h3 className={`text-lg font-medium mb-2 ${(contentType === 'Post' ? sharedForm.image.length >= 10 : sharedForm.image.length >= 1) ? 'text-gray-500' : 'text-gray-700'
                }`}>
                {contentType === 'Story' ? 'Add Story Media' :
                  contentType === 'Reel' ? 'Add Reel Video' :
                    'Add Photos & Videos'}
              </h3>
              <p className={`text-sm mb-4 ${(contentType === 'Post' ? sharedForm.image.length >= 10 : sharedForm.image.length >= 1) ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {contentType === 'Story' ? 'Upload images (JPG, PNG, GIF) or videos for your story' :
                  contentType === 'Reel' ? 'Upload a video (MP4, MOV, WebM) - videos under 60 seconds work best for Reels' :
                    'Upload up to 10 images (JPG, PNG, GIF) or videos (MP4, MOV, WebM)'}
              </p>
              <input
                type="file"
                multiple={contentType === 'Post'}
                accept="image/*,video/mp4,video/quicktime,video/mov"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload-top"
                disabled={contentType === 'Post' ? sharedForm.image.length >= 10 : sharedForm.image.length >= 1}
              />
              <label
                htmlFor="image-upload-top"
                className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${(contentType === 'Post' ? sharedForm.image.length >= 10 : sharedForm.image.length >= 1)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-button-gradient text-black hover:bg-[#b8871f] cursor-pointer'
                  }`}
              >
                📎 {
                  (contentType === 'Post' ? sharedForm.image.length >= 10 : sharedForm.image.length >= 1)
                    ? 'Maximum Files Reached'
                    : contentType === 'Story'
                      ? 'Add Story Media'
                      : contentType === 'Reel'
                        ? 'Add Reel Video'
                        : 'Add Images & Videos'
                }
              </label>
              <p className="text-xs text-gray-400 mt-2">
                Tip: Large files are automatically optimized. Videos (MP4, MOV, WebM) under 1 minute are eligible for reels with the &quot;Reel Visibility&quot; option below.
              </p>
              {isOptimizing && (
                <div className="mt-2 flex items-center justify-center text-yellow-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent mr-2"></div>
                  Optimizing files for upload...
                </div>
              )}
            </div>

            {/* File Counter */}
            {sharedForm.image.length > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-600 mt-4 mb-2">
                <span className="font-medium">
                  {sharedForm.image.length} of {contentType === 'Post' ? '10' : '1'} files uploaded
                </span>
                <span className="text-xs text-gray-500">
                  {contentType === 'Post'
                    ? (sharedForm.image.length >= 10 ? 'Maximum limit reached' : `${10 - sharedForm.image.length} more files allowed`)
                    : (sharedForm.image.length >= 1 ? 'Maximum limit reached' : '1 file allowed')
                  }
                </span>
              </div>
            )}

            {/* Media Preview */}
            {sharedForm.image.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {sharedForm.image.map((file, index) => (
                  <div key={index} className="relative">
                    {file.type.startsWith('image/') ? (
                      <div className="w-20 h-20 relative">
                        <Image
                          width={100}
                          height={100}
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg border"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg">
                          {(file.size / 1024 / 1024).toFixed(1)}MB
                        </div>
                      </div>
                    ) : (file.type === 'video/mp4' || file.type === 'video/quicktime' || file.type === 'video/webm') ? (
                      <div className="w-20 h-20 relative">
                        <video
                          src={URL.createObjectURL(file)}
                          className="w-full h-full object-cover rounded-lg border"
                          muted
                        />
                        <div className="absolute inset-0 bg-black/30 rounded-lg flex flex-col items-center justify-center p-1">
                          <div className="text-white text-xs font-semibold bg-black/50 px-1 rounded mb-1">
                            {(file.type === 'video/mp4' || file.type === 'video/quicktime' || file.type === 'video/webm') && videoDuration ?
                              `${Math.round(videoDuration)}s ${videoDuration <= 60 ? '(Reel)' : '(Video)'}` :
                              'Video'
                            }
                          </div>
                          <div className="text-white text-xs bg-black/50 px-1 rounded">
                            {(file.size / 1024 / 1024).toFixed(1)}MB
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post Content - Show for Posts and Reels */}
          {(contentType === 'Post' || contentType === 'Reel') && (
            <div className="mb-4">
              <label className='text-black text-bold ml-2'>Add Description or Caption</label>
              <textarea
                value={sharedForm.description}
                onChange={(e) => setSharedForm({ ...sharedForm, description: e.target.value })}
                placeholder="What's on your mind?"
                className="w-full h-32 p-4 border border-gray-300 placeholder:text-gray-500 text-black rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Category Selection - Show for Posts and Reels */}
          {(contentType === 'Post' || contentType === 'Reel') && (
            <div className="mb-6 relative z-[10001]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <CategorySelect
                value={sharedForm.category}
                onChange={(value) => {
                  setSharedForm({
                    ...sharedForm,
                    category: value,
                    customCategory: value === 'Other' ? sharedForm.customCategory : ''
                  });
                }}
                categories={postCategories}
              />

              {/* Custom Category Input - shown when "Other" is selected */}
              {sharedForm.category === 'Other' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={sharedForm.customCategory}
                    onChange={(e) => setSharedForm({ ...sharedForm, customCategory: e.target.value })}
                    placeholder="Enter custom category..."
                    className="w-full p-3 border border-gray-300 placeholder:text-gray-500 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          )}

          {/* Privacy Selection - Show for Posts and Reels */}
          {(contentType === 'Post' || contentType === 'Reel') && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Who can see this post?
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPostPrivacy('public')}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200
                    ${postPrivacy === 'public'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50/50'
                    }
                  `}
                >
                  <Globe className={`w-5 h-5 ${postPrivacy === 'public' ? 'text-green-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className="font-medium text-sm">Public</div>
                    <div className="text-xs opacity-75">Everyone can see</div>
                  </div>
                  {postPrivacy === 'public' && (
                    <svg className="w-5 h-5 text-green-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPostPrivacy('private')}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200
                    ${postPrivacy === 'private'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:bg-orange-50/50'
                    }
                  `}
                >
                  <Lock className={`w-5 h-5 ${postPrivacy === 'private' ? 'text-orange-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className="font-medium text-sm">Private</div>
                    <div className="text-xs opacity-75">Only followers</div>
                  </div>
                  {postPrivacy === 'private' && (
                    <svg className="w-5 h-5 text-orange-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Post Type Selection (radio buttons) - Only show for business accounts */}
          {(contentType === 'Post' || contentType === 'Reel') && isBusinessProfile && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Post Type
              </label>
              <div className="flex flex-wrap gap-2">
                {allowBusiness && (
                  <label className={`
                    relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none
                    transition-all duration-200 ease-in-out text-sm
                    ${postType === 'Business'
                      ? 'border-yellow-500 bg-yellow-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-yellow-300 hover:bg-yellow-50/50'
                    }
                  `}>
                    <input
                      type="radio"
                      name="postType"
                      value="Business"
                      checked={postType === 'Business'}
                      onChange={() => setPostType('Business')}
                      className="w-3.5 h-3.5 text-yellow-500 focus:ring-0 focus:ring-offset-0 border-gray-300"
                    />
                    <span className={`font-medium ${postType === 'Business' ? 'text-yellow-700' : 'text-gray-700'}`}>
                      Business
                    </span>
                    {postType === 'Business' && (
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                )}
                {allowService && (
                  <label className={`
                    relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none
                    transition-all duration-200 ease-in-out text-sm
                    ${postType === 'Service'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                    }
                  `}>
                    <input
                      type="radio"
                      name="postType"
                      value="Service"
                      checked={postType === 'Service'}
                      onChange={() => setPostType('Service')}
                      className="w-3.5 h-3.5 text-blue-500 focus:ring-0 focus:ring-offset-0 border-gray-300"
                    />
                    <span className={`font-medium ${postType === 'Service' ? 'text-blue-700' : 'text-gray-700'}`}>
                      Service
                    </span>
                    {postType === 'Service' && (
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                )}
                {allowProduct && (
                  <label className={`
                    relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none
                    transition-all duration-200 ease-in-out text-sm
                    ${postType === 'Product'
                      ? 'border-green-500 bg-green-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                    }
                  `}>
                    <input
                      type="radio"
                      name="postType"
                      value="Product"
                      checked={postType === 'Product'}
                      onChange={() => setPostType('Product')}
                      className="w-3.5 h-3.5 text-green-500 focus:ring-0 focus:ring-offset-0 border-gray-300"
                    />
                    <span className={`font-medium ${postType === 'Product' ? 'text-green-700' : 'text-gray-700'}`}>
                      Product
                    </span>
                    {postType === 'Product' && (
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                )}
              </div>
              {postType !== 'Business' && postType !== 'Service' && postType !== 'Product' && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  No selection will default to Regular Post
                </p>
              )}
            </div>
          )}


          {/* Post-specific forms (single rendering) */}
          {(contentType === 'Post' || contentType === 'Reel') && (
            <>
              {postType === 'Regular' && (
                <RegularPostForm
                  formData={regularForm}
                  onChange={handleRegularChange}
                />
              )}
              {isBusinessProfile && postType === 'Product' && (
                <ProductDetailsForm
                  formData={productForm}
                  onChange={handleProductChange}
                />
              )}
              {isBusinessProfile && postType === 'Service' && (
                <ServiceDetailsForm
                  formData={serviceForm}
                  onChange={handleServiceChange}
                  categories={['Consulting', 'Repair', 'Education', 'Other']}
                />
              )}
              {isBusinessProfile && postType === 'Business' && (
                <BusinessDetailsForm
                  formData={businessForm.formData}
                  onChange={handleBusinessChange}
                />
              )}
            </>
          )}

          {/* Show simple description input for Story only */}
          {contentType === 'Story' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-black mb-2">
                {contentType === 'Story' ? 'Story Caption' : 'Reel Caption'} (Optional)
              </label>
              <textarea
                value={sharedForm.description}
                onChange={(e) => setSharedForm({ ...sharedForm, description: e.target.value })}
                placeholder={`Add a caption to your ${contentType.toLowerCase()}...`}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none text-black placeholder:text-gray-500"
                rows={3}
                maxLength={500}
              />
              <div className="text-right text-xs text-black mt-1">
                {sharedForm.description.length}/500
              </div>
            </div>
          )}

          {/* Delivery Options - Only show for business post types and business accounts */}
          {isBusinessProfile && (postType === 'Product' || postType === 'Service' || postType === 'Business') && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Delivery Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deliveryOptions"
                    value="online"
                    checked={
                      postType === 'Product' ? productForm.product.deliveryOptions === 'online' :
                        postType === 'Service' ? serviceForm.service.deliveryOptions === 'online' :
                          businessForm.formData.business.deliveryOptions === 'online'
                    }
                    onChange={(e) => {
                      if (postType === 'Product') {
                        setProductForm(prev => ({
                          ...prev,
                          product: { ...prev.product, deliveryOptions: e.target.value }
                        }));
                      } else if (postType === 'Service') {
                        setServiceForm(prev => ({
                          ...prev,
                          service: { ...prev.service, deliveryOptions: e.target.value }
                        }));
                      } else if (postType === 'Business') {
                        setBusinessForm(prev => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            business: { ...prev.formData.business, deliveryOptions: e.target.value }
                          }
                        }));
                      }
                    }}
                    className="mr-3 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-gray-700">Online</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deliveryOptions"
                    value="offline"
                    checked={
                      postType === 'Product' ? productForm.product.deliveryOptions === 'offline' :
                        postType === 'Service' ? serviceForm.service.deliveryOptions === 'offline' :
                          businessForm.formData.business.deliveryOptions === 'offline'
                    }
                    onChange={(e) => {
                      if (postType === 'Product') {
                        setProductForm(prev => ({
                          ...prev,
                          product: { ...prev.product, deliveryOptions: e.target.value }
                        }));
                      } else if (postType === 'Service') {
                        setServiceForm(prev => ({
                          ...prev,
                          service: { ...prev.service, deliveryOptions: e.target.value }
                        }));
                      } else if (postType === 'Business') {
                        setBusinessForm(prev => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            business: { ...prev.formData.business, deliveryOptions: e.target.value }
                          }
                        }));
                      }
                    }}
                    className="mr-3 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-gray-700">Offline</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deliveryOptions"
                    value="both"
                    checked={
                      postType === 'Product' ? productForm.product.deliveryOptions === 'both' :
                        postType === 'Service' ? serviceForm.service.deliveryOptions === 'both' :
                          businessForm.formData.business.deliveryOptions === 'both'
                    }
                    onChange={(e) => {
                      if (postType === 'Product') {
                        setProductForm(prev => ({
                          ...prev,
                          product: { ...prev.product, deliveryOptions: e.target.value }
                        }));
                      } else if (postType === 'Service') {
                        setServiceForm(prev => ({
                          ...prev,
                          service: { ...prev.service, deliveryOptions: e.target.value }
                        }));
                      } else if (postType === 'Business') {
                        setBusinessForm(prev => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            business: { ...prev.formData.business, deliveryOptions: e.target.value }
                          }
                        }));
                      }
                    }}
                    className="mr-3 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-gray-700">Both</span>
                </label>
              </div>
            </div>
          )}

          {/* Location Input with Suggestions - Only show for Posts */}
          {contentType === 'Post' && (
            <div className="mb-6 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline mr-2" size={16} />
                Location {
                  isBusinessProfile && (postType === 'Product' || postType === 'Service' || postType === 'Business') ?
                    (
                      (postType === 'Product' && (productForm.product.deliveryOptions === 'offline' || productForm.product.deliveryOptions === 'both')) ||
                      (postType === 'Service' && (serviceForm.service.deliveryOptions === 'offline' || serviceForm.service.deliveryOptions === 'both')) ||
                      (postType === 'Business' && (businessForm.formData.business.deliveryOptions === 'offline' || businessForm.formData.business.deliveryOptions === 'both'))
                    ) ? '(Required)' : '(Optional)'
                    : '(Optional)'
                }
              </label>
              <input
                ref={locationInputRef}
                type="text"
                value={sharedForm.location.name}
                onChange={handleLocationInputChange}
                placeholder="Search for a location..."
                className="w-full p-3 border border-gray-300 placeholder:text-gray-500 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />

              {/* Location Suggestions Dropdown */}
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <div
                  ref={locationDropdownRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
                >
                  {locationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      type="button"
                      onClick={() => handleLocationSelect(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
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
          )}

          {/* Hashtags Input - Show for Posts and Reels */}
          {(contentType === 'Post' || contentType === 'Reel') && (
            <div className="mb-6">
              <TagInput tags={sharedForm.tags} setTags={(tags) => setSharedForm({ ...sharedForm, tags })} />
            </div>
          )}

          {/* Reel Visibility Option */}
          {showReelVisibility && (
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                      🎬 Reel Visibility
                    </h4>
                    <p className="text-xs text-yellow-700">
                      Your video is under 1 minute and eligible for reels. Enable this option to show it in the reels section.
                      {sharedForm.image.some(file => file.type.startsWith('image/')) &&
                        " Videos will appear first in the reel slider, followed by images."
                      }
                    </p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reelVisibility}
                      onChange={(e) => setReelVisibility(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${reelVisibility ? 'bg-yellow-500' : 'bg-gray-300'
                      }`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${reelVisibility ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button
            onClick={handleCloseModal}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            disabled={loading || isOptimizing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePost}
            className="px-6 py-2 bg-button-gradient text-black rounded-lg hover:bg-[#b8871f] transition-colors cursor-pointer"
            disabled={loading || isOptimizing}
          >
            {loading ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>

      {/* Business Details Modal */}
      <BusinessDetailsModal
        isOpen={showBusinessProfileModal}
        onClose={handleBusinessProfileClose}
        onSubmit={handleBusinessProfileSubmit}
        isEdit={false}
      />
    </div>
  );
};

export default CreatePostModal;