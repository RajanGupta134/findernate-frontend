import { FeedPost, MediaItem } from "@/types";

export type RawExploreFeedItem = {
  _id: string;
  userId: {
    _id: string;
    username: string;
    profileImageUrl?: string;
    review?: {
      averageRating: number;
      totalReviews: number;
    };
    fullName?: string;
  } | string;
  createdAt: string;
  updatedAt: string;
  _type: 'reel' | 'post';
  
  // For reels
  videoUrl?: string;
  caption?: string;
  thumbnailUrl?: string;
  hashtags?: string[];
  music?: {
    title: string;
    url: string;
  };
  likes?: string[]; // Array of user IDs for reels
  comments?: string[]; // Array of comment IDs for reels
  views?: number;
  isPublic?: boolean;
  isFeatured?: boolean;
  
  // For posts
  postType?: string;
  contentType?: string;
  description?: string;
  mentions?: string[];
  media?: MediaItem[];
  customization?: {
    product?: {
      name: string;
      price: number;
      currency: string;
      images: string[];
      tags: string[];
      variants: any[];
      specifications: any[];
    };
    service?: {
      name: string;
      description: string;
      price: number;
      currency: string;
      category: string;
      subcategory: string;
      duration: number;
      tags: string[];
    };
    business?: {
      businessName: string;
      businessType: string;
      description: string;
      category: string;
      tags: string[];
    };
    normal?: {
      mood?: string;
      activity?: string;
      location?: {
        name: string;
        coordinates: {
          type: string;
          coordinates: [number, number];
        };
      };
      tags?: string[];
    };
  };
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    views: number;
    reach: number;
    impressions: number;
  };
  settings?: {
    visibility: string;
    allowComments: boolean;
    allowLikes: boolean;
    customAudience: string[];
  };
};

// Helper function to shuffle array
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function transformExploreFeedToFeedPost(items: RawExploreFeedItem[]): FeedPost[] {
  return items.map((item: RawExploreFeedItem) => {
    // Helper function to get user info
    const getUserInfo = () => {
      if (typeof item.userId === 'object' && item.userId !== null) {
        return {
          username: item.userId.username || 'unknown_user',
          profileImageUrl: item.userId.profileImageUrl || '/placeholderimg.png'
        };
      }
      // Handle case where userId might be a string ID
      return {
        username: 'unknown_user',
        profileImageUrl: '/placeholderimg.png'
      };
    };

    const userInfo = getUserInfo();

    // Handle reels
    if (item._type === 'reel') {
      // For reels, check if media array exists (new API structure) or use legacy videoUrl
      const media = item.media && item.media.length > 0 
        ? item.media 
        : [{
            type: 'video' as const,
            url: item.videoUrl || '',
            thumbnailUrl: item.thumbnailUrl,
            duration: null,
            dimensions: undefined
          }];

      return {
        _id: item._id,
        username: userInfo.username,
        profileImageUrl: userInfo.profileImageUrl,
        userId: typeof item.userId === 'object' ? {
          ...item.userId,
          profileImageUrl: item.userId.profileImageUrl || '/placeholderimg.png'
        } : undefined,
        description: item.caption || item.description || '',
        caption: item.caption || item.description || '',
        contentType: item.contentType || 'reel',
        postType: 'video',
        createdAt: item.createdAt,
        media: media,
        engagement: {
          comments: item.engagement?.comments || item.comments?.length || 0,
          impressions: item.engagement?.impressions || 0,
          likes: item.engagement?.likes || item.likes?.length || 0,
          reach: item.engagement?.reach || 0,
          saves: item.engagement?.saves || 0,
          shares: item.engagement?.shares || 0,
          views: item.engagement?.views || item.views || 0,
        },
        location: item.customization?.normal?.location || null,
        tags: item.hashtags || [],
        isLikedBy: false,
        likedBy: [],
        customization: undefined // Reels typically don't have customization
      };
    }
    
    // Handle posts - get tags based on content type
    const getTags = () => {
      if (item.customization?.normal?.tags) return item.customization.normal.tags;
      if (item.customization?.product?.tags) return item.customization.product.tags;
      if (item.customization?.service?.tags) return item.customization.service.tags;
      if (item.customization?.business?.tags) return item.customization.business.tags;
      return item.hashtags || [];
    };

    // Transform customization to match FeedPost interface
    const transformedCustomization = item.customization ? {
      product: item.customization.product ? {
        name: item.customization.product.name,
        price: String(item.customization.product.price), // Convert number to string
        currency: item.customization.product.currency,
        inStock: true, // Default value since not in raw data
        link: '', // Default value since not in raw data
        location: undefined
      } : undefined,
      service: item.customization.service ? {
        name: item.customization.service.name,
        description: item.customization.service.description,
        price: String(item.customization.service.price), // Convert number to string
        currency: item.customization.service.currency,
        category: item.customization.service.category,
        subcategory: item.customization.service.subcategory,
        duration: item.customization.service.duration,
        serviceType: item.customization.service.category, // Use category as serviceType
        location: undefined
      } : undefined,
      business: item.customization.business ? {
        businessName: item.customization.business.businessName,
        businessType: item.customization.business.businessType,
        description: item.customization.business.description,
        category: item.customization.business.category,
        subcategory: '', // Default value since not in raw data
        location: undefined
      } : undefined,
      normal: item.customization.normal ? {
        location: item.customization.normal.location
      } : undefined
    } : undefined;

    // Validate and ensure media array has at least one valid item
    const ensureValidMedia = (): MediaItem[] => {
      if (!item.media || item.media.length === 0) {
        console.warn(`[transformExploreFeed] Post ${item._id} has no media, using placeholder`);
        return [{
          type: 'image' as const,
          url: '/placeholderimg.png',
          thumbnailUrl: undefined,
          duration: null,
          dimensions: undefined
        }];
      }

      // Filter out media items with empty/invalid URLs
      const validMedia = item.media.filter(m => m.url && m.url.trim().length > 0);

      if (validMedia.length === 0) {
        console.warn(`[transformExploreFeed] Post ${item._id} has no valid media URLs, using placeholder`);
        return [{
          type: 'image' as const,
          url: '/placeholderimg.png',
          thumbnailUrl: undefined,
          duration: null,
          dimensions: undefined
        }];
      }

      return validMedia;
    };

    // Handle posts
    return {
      _id: item._id,
      username: userInfo.username,
      profileImageUrl: userInfo.profileImageUrl,
      userId: typeof item.userId === 'object' ? {
        ...item.userId,
        profileImageUrl: item.userId.profileImageUrl || '/placeholderimg.png'
      } : undefined,
      description: item.description || item.caption || '',
      caption: item.caption || item.description || '',
      contentType: item.contentType || 'normal',
      postType: item.postType || 'photo',
      createdAt: item.createdAt,
      media: ensureValidMedia(),
      engagement: {
        comments: item.engagement?.comments || 0,
        impressions: item.engagement?.impressions || 0,
        likes: item.engagement?.likes || 0,
        reach: item.engagement?.reach || 0,
        saves: item.engagement?.saves || 0,
        shares: item.engagement?.shares || 0,
        views: item.engagement?.views || 0,
      },
      location: item.customization?.normal?.location || null,
      tags: getTags(),
      isLikedBy: false,
      likedBy: [],
      customization: transformedCustomization
    };
  });
}