// Admin-specific types for the admin portal

export interface User {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  profileImageUrl: string;
  status: 'active' | 'suspended' | 'pending';
  isVerified: boolean;
  isBusinessProfile: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
  lastActive: string;
}

export interface Post {
  _id: string;
  userId: {
    _id: string;
    username: string;
    profileImageUrl: string;
  };
  caption: string;
  contentType: 'normal' | 'service' | 'product' | 'business';
  media: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl: string;
  }>;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  status: 'active' | 'pending' | 'rejected' | 'deleted';
  createdAt: string;
}

export interface Comment {
  _id: string;
  postId: string;
  userId: {
    _id: string;
    username: string;
    profileImageUrl: string;
  };
  content: string;
  status: 'active' | 'pending' | 'rejected' | 'deleted';
  createdAt: string;
}

export interface Report {
  _id: string;
  reporterId: string;
  reporterName: string;
  reportedContent: {
    type: 'post' | 'comment' | 'user' | 'business';
    id: string;
    preview: string;
  };
  reason: 'spam' | 'harassment' | 'nudity' | 'violence' | 'fake_news' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
}

export interface Business {
  _id: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string;
  coverImageUrl: string;
  ownerId: string;
  ownerName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  status: 'active' | 'pending' | 'suspended' | 'rejected';
  isVerified: boolean;
  followersCount: number;
  postsCount: number;
  createdAt: string;
}

export interface AnalyticsData {
  userGrowth: Array<{
    date: string;
    users: number;
  }>;
  contentCreation: Array<{
    date: string;
    posts: number;
    comments: number;
  }>;
  engagementRate: Array<{
    date: string;
    rate: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    count: number;
  }>;
  topPosts: Post[];
  recentReports: Report[];
}

export interface AdminPermissions {
  verifyAadhaar: boolean;
  manageReports: boolean;
  manageUsers: boolean;
  manageBusiness: boolean;
  systemSettings: boolean;
  viewAnalytics: boolean;
  deleteContent: boolean;
  banUsers: boolean;
}

export interface ActivityLogEntry {
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  _id: string;
  timestamp: string;
}

export interface AdminUser {
  permissions: AdminPermissions;
  _id: string;
  uid: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdBy: string | null;
  activityLog: ActivityLogEntry[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  lastLogin: string;
  profileImageUrl?: string; // Optional for backward compatibility
}

export interface Notification {
  _id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}