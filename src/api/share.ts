import axios from './base';

export interface ShareLinkResponse {
  success: boolean;
  data: {
    shareLink: string;
    postType: string;
    contentType: string;
    preview: {
      caption: string | null;
      thumbnailUrl: string | null;
      author: {
        username: string;
        fullName: string;
        profileImageUrl: string;
      };
    };
  };
  message: string;
}

export interface SharedPostResponse {
  success: boolean;
  data: {
    post: {
      _id: string;
      postType: string;
      contentType: string;
      caption?: string;
      description?: string;
      media: Array<{
        type: string;
        url: string;
        thumbnailUrl?: string;
        duration?: number;
        dimensions?: {
          width: number;
          height: number;
        };
      }>;
      engagement: {
        likes: number;
        comments: number;
        shares: number;
        views: number;
      };
      createdAt: string;
      author: {
        username: string;
        fullName: string;
        profileImageUrl: string;
      };
      isLikedBy?: boolean;
      likedBy?: Array<{
        username: string;
        fullName: string;
        profileImageUrl: string;
      }>;
      product?: {
        name: string;
        description: string;
        price: number;
        currency: string;
        link?: string;
      };
      service?: {
        name: string;
        description: string;
        price: number;
        currency: string;
        link?: string;
      };
      business?: {
        businessName: string;
        description: string;
        category: string;
        link?: string;
      };
    };
    shareMetadata: {
      shareUrl: string;
      canShare: boolean;
      viewerCanInteract: boolean;
    };
  };
  message: string;
}

export interface TrackShareResponse {
  success: boolean;
  data: {
    shareCount: number;
    shareUrl: string;
  };
  message: string;
}

/**
 * Generate shareable link for a post
 * @param postId - Post ID
 * @returns Share link data
 */
export const generatePostShareLink = async (postId: string): Promise<ShareLinkResponse> => {
  const response = await axios.post(`/share/post/${postId}/generate`);
  return response.data;
};

/**
 * Generate shareable link for a reel
 * @param postId - Reel/Video post ID
 * @returns Share link data
 */
export const generateReelShareLink = async (postId: string): Promise<ShareLinkResponse> => {
  const response = await axios.post(`/share/reel/${postId}/generate`);
  return response.data;
};

/**
 * Get shared post data (public endpoint, works without auth)
 * @param postId - Post ID
 * @returns Post data
 */
export const getSharedPost = async (postId: string): Promise<SharedPostResponse> => {
  const response = await axios.get(`/share/post/${postId}`);
  return response.data;
};

/**
 * Get shared reel data (public endpoint, works without auth)
 * @param postId - Reel/Video post ID
 * @returns Reel data
 */
export const getSharedReel = async (postId: string): Promise<SharedPostResponse> => {
  const response = await axios.get(`/share/reel/${postId}`);
  return response.data;
};

/**
 * Track share event (increment share count)
 * @param postId - Post ID
 * @param platform - Platform where shared (optional)
 * @param referrer - Referrer URL (optional)
 * @returns Updated share count
 */
export const trackShare = async (
  postId: string,
  platform?: string,
  referrer?: string
): Promise<TrackShareResponse> => {
  const response = await axios.post('/share/track', {
    postId,
    platform,
    referrer,
  });
  return response.data;
};

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copied
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Share using native Web Share API if available
 * @param title - Share title
 * @param text - Share text
 * @param url - Share URL
 * @returns Promise that resolves when shared
 */
export const nativeShare = async (title: string, text: string, url: string): Promise<boolean> => {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return true;
    }
    return false;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      // User cancelled share
      return false;
    }
    console.error('Native share failed:', error);
    return false;
  }
};

/**
 * Generate WhatsApp share URL
 * @param url - URL to share
 * @param text - Optional text
 * @returns WhatsApp share URL
 */
export const getWhatsAppShareUrl = (url: string, text?: string): string => {
  const message = text ? `${text} ${url}` : url;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
};

/**
 * Generate Twitter/X share URL
 * @param url - URL to share
 * @param text - Optional text
 * @returns Twitter share URL
 */
export const getTwitterShareUrl = (url: string, text?: string): string => {
  const params = new URLSearchParams();
  if (text) params.append('text', text);
  params.append('url', url);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
};

/**
 * Generate Facebook share URL
 * @param url - URL to share
 * @returns Facebook share URL
 */
export const getFacebookShareUrl = (url: string): string => {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
};

/**
 * Generate Telegram share URL
 * @param url - URL to share
 * @param text - Optional text
 * @returns Telegram share URL
 */
export const getTelegramShareUrl = (url: string, text?: string): string => {
  const params = new URLSearchParams();
  params.append('url', url);
  if (text) params.append('text', text);
  return `https://t.me/share/url?${params.toString()}`;
};
