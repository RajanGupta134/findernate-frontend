export interface Story {
  _id: string;
  userId: {
    _id: string;
    username: string;
    profileImageUrl: string;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  postType?: 'image' | 'video'; // For compatibility
  caption?: string;
  viewers: string[];
  isArchived: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryUser {
  _id: string;
  username: string;
  profileImageUrl: string;
  stories: Story[];
  hasNewStories: boolean;
  isCurrentUser: boolean;
}

export interface StoryFeed {
  users: StoryUser[];
  currentUser: StoryUser | null;
}

export interface StoryViewer {
  _id: string;
  username: string;
  profileImageUrl: string;
  viewedAt?: string; // When they viewed the story
}

export interface StoryAnalytics {
  viewers: StoryViewer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CreateStoryRequest {
  media: File;
  caption?: string;
}

export interface StoryUploadResponse {
  _id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  expiresAt: string;
  createdAt: string;
}

export interface DeleteStoryResponse {
  statusCode: number;
  data: {
    storyId: string;
  };
  message: string;
  success: boolean;
}