
// types/signup.ts
import { Comment } from './api/comment';
import { SubscriptionBadge } from './api/subscription';

// Font customization types
export type FontFamily = 'default' | 'serif' | 'mono' | 'cursive' | 'fantasy';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface FontStyle {
  fontFamily: FontFamily;
  fontSize: FontSize;
}

export interface SignupData {
  phone: string;
  countryCode: string;
  otp: string;
  fullName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  category: string;
  about: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface Country {
  code: string;
  flag: string;
  name: string;
}

export interface BaseStepProps {
  data: SignupData;
  updateData: (data: Partial<SignupData>) => void;
  onNext: () => void;
}

export interface StepWithBackProps extends BaseStepProps {
  onPrev: () => void;
}

export type PhoneStepProps = BaseStepProps

export type OTPStepProps = StepWithBackProps

export type PersonalInfoStepProps = StepWithBackProps

export type UsernameStepProps = StepWithBackProps

export interface WelcomeStepProps {
  data: SignupData;
}

export interface ProductDetailsFormProps {
  formData: {
    postType: string;
    mentions: string[];
    mood: string;
    activity: string;
    settings: {
      visibility: string;
      allowComments: boolean;
      allowLikes: boolean;
    };
    product: {
      name: string;
      price: number;
      currency: string;
      inStock: boolean;
      link: string;
      deliveryOptions: string;
    };
    status: string;
    fontStyle?: FontStyle;
  }

  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  categories?: string[];
}

// Regular post
export interface RegularPostPayload {
  description: string;
  location: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  tags: string[];
  image: File[];
  postType: 'Regular';
  caption: string;
  mood: string;
  activity: string;
  mentions: string[];
  settings: {
    visibility: string;
    allowComments: boolean;
    allowLikes: boolean;
  };
  status: string;
  fontStyle?: FontStyle;
}

export interface ServiceDetailsFormProps {
  formData: {
    postType: string;
    mentions: string[]; // Array of user IDs
    settings: {
      visibility: string;
      allowComments: boolean;
      allowLikes: boolean;
    };
    status: string;
    // Service-specific fields
    service: {
      name: string;
      description: string;
      price: number;
      currency: string;
      category: string;
      subcategory: string;
      duration: number; // Keep as string for input, convert to number for API
      serviceType: string; // 'in-person', 'online', 'hybrid'
      availability: {
        schedule: Array<{
          day: string;
          timeSlots: Array<{
            startTime: string;
            endTime: string;
          }>;
        }>;
        timezone: string;
        bookingAdvance: string; // string for input, convert to number for API
        maxBookingsPerDay: string; // string for input, convert to number for API
      };
      location: {
        type: string; // 'studio', 'home', etc.
        address: string;
        city: string;
        state: string;
        country: string;
        coordinates?: {
          type: 'Point';
          coordinates: [number, number]; // [lng, lat] (optional)
        };
      };
      requirements: string[];
      deliverables: string[];
      tags: string[];
      link: string;
      deliveryOptions: string;
    };
    fontStyle?: FontStyle;
  }

  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  categories?: string[];
}

export interface BusinessPostFormProps {
  formData: {
    postType: string;
    mentions: string[]; // Array of user IDs
    settings: {
      visibility: string;
      allowComments: boolean;
      allowLikes: boolean;
    };
    status: string;

    business: {
      businessName: string;
      businessType: string;
      description: string;
      category: string;
      subcategory: string;
      contact: {
        phone: string;
        email: string;
        website: string;
        socialMedia: Array<{
          platform: string;
          url: string;
        }>;
      };
      location: {
        address: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
      };
      hours: Array<{
        day: string;
        openTime: string;
        closeTime: string;
        isClosed: boolean;
      }>;
      features: string[];
      priceRange: string;
      rating: number;
      tags: string[];
      announcement: string;
      promotions: Array<{
        title: string;
        description: string;
        discount: number;
        validUntil: string; // ISO date string
        isActive: boolean;
      }>;
      link: string;
      deliveryOptions: string;
    },
    fontStyle?: FontStyle;
  }
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

}

export type MediaItem = {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  duration?: number | null;
  dimensions?: {
    width: number;
    height: number;
  };
};

export interface FeedPost {
  _id: string;
  userId?: {
    _id: string;
    username: string;
    profileImageUrl: string;
    subscriptionBadge?: SubscriptionBadge | null;
    isBusinessProfile?: boolean;
    review?: {
      averageRating: number;
      totalReviews: number;
    };
  };
  username: string
  profileImageUrl: string
  description: string
  caption: string
  contentType: string
  postType: string
  createdAt: string
  media: MediaItem[]
  isLikedBy: boolean;
  likedBy: string[];
  feedScore?: number;

  engagement: {
    comments: number;
    impressions: number;
    likes: number;
    reach: number;
    saves: number;
    shares: number;
    views: number;
  };
  location: {
    name: string;
    coordinates?: {
      type: string;
      coordinates: [number, number];
    };
  } | string | null;

  tags: string[];
  hashtags?: string[] | string; // Allow both array and string
  tag?: string[] | string; // Alternative field name
  settings?: {
    privacy?: 'private' | 'public';
    visibility?: string;
    allowComments?: boolean;
    allowLikes?: boolean;
  };
  customization?: {
    product?: {
      name: string;
      price: string;
      currency: string;
      inStock: boolean;
      link: string;
      location?: {
        name: string;
      };
      tags?: string[];
    };
    service?: {
      name: string;
      description: string;
      price: string;
      currency: string;
      category: string;
      subcategory: string;
      duration: number;
      serviceType: string;
      location?: {
        name: string;
      };
      tags?: string[];
      link?: string;
    };
    business?: {
      businessName: string;
      businessType: string;
      description: string;
      category: string;
      subcategory: string;
      location?: {
        name: string;
      };
      tags?: string[];
    };
    normal?: {
      location?: {
        name: string;
      };
      tags?: string[];
    };
  };
  comments?: Comment[];
}


export interface SearchUser {
  _id: string;
  username: string;
  fullName: string;
  profileImageUrl?: string;
  bio?: string;
  subscriptionBadge?: SubscriptionBadge | null;
  isBusinessProfile?: boolean;
  // Allow for Mongoose-style _doc property
  _doc?: Partial<SearchUser>;
  location?: string;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
}

export interface SearchResult {
  _id: string;
  caption: string;
  postType: string;
  contentType: string;
  userId: SearchUser;
  media?: { url: string; type: string }[];
}

export interface UserProfile {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  isBusinessProfile: boolean;
  businessId?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  profileImageUrl: string;
  bio: string;
  link: string;
  location: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  privacy?: 'public' | 'private';
  isFullPrivate?: boolean;
  // Blue tick verification flag controls showing the verification badge
  isBlueTickVerified?: boolean;
  // Subscription badge for paid users
  subscriptionBadge?: SubscriptionBadge | null;
}

// Below are the types for create,and update business details

// Social Media interface
export interface SocialMedia {
  platform: string;
  url: string;
}

// Contact interface for CREATE request
export interface CreateContactInfo {
  phone: string;
  email: string;
  website: string;
  socialMedia: SocialMedia[];
}

// Contact interface for UPDATE request
export interface UpdateContactInfo {
  email: string;
  phone: string;
  website: string;
}

// Location interface for CREATE request
export interface CreateBusinessLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

// Location interface for UPDATE request
export interface UpdateBusinessLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Create Business Request Type
export interface CreateBusinessRequest {
  businessName: string;
  businessType: string;
  description: string;
  category: string;
  contact: CreateContactInfo;
  location: CreateBusinessLocation;
  tags: string[];
  website: string;
  gstNumber: string | null;
  aadhaarNumber: string | null;
}

// Update Business Request Type  
export interface UpdateBusinessRequest {
  businessName: string;
  businessType: string;
  description: string;
  category: string;
  contact: UpdateContactInfo;
  location: UpdateBusinessLocation;
  website: string;
  tags: string[];
  gstNumber?: string | null;
  aadhaarNumber?: string | null;
}

export interface SavedPost {
  _id: string;
  userId: string;
  postId: FeedPost | null;
  savedAt: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface SavedPostsResponse {
  statusCode: number;
  data: {
    savedPosts: SavedPost[];
    pagination: {
      totalPosts: number;
      currentPage: number;
      totalPages: number;
      postsPerPage: number;
    };
  };
  message: string;
  success: boolean;
}