import axios from './base';
import { FontStyle } from '@/types';
import { SubscriptionBadge } from './subscription';

export interface Comment {
  _id: string;
  postId: string;
  userId: string | {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
    subscriptionBadge?: SubscriptionBadge | null;
  };
  content: string;
  parentCommentId?: string;
  rootCommentId?: string;
  replyToUserId?: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
    subscriptionBadge?: SubscriptionBadge | null;
  };
  depth?: number;
  likes: Array<{
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
  }>;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
    subscriptionBadge?: SubscriptionBadge | null;
  };
  replies?: Comment[];
  likesCount: number;
  isLikedBy: boolean;
  replyCount?: number;
  fontStyle?: FontStyle;
}

export interface CreateCommentData {
  postId: string;
  content: string;
  parentCommentId?: string;
  replyToUserId?: string;
  fontStyle?: FontStyle;
}

// Get comments for a post  
export const getCommentsByPost = async (postId: string, page: number = 1, limit: number = 20) => {
  // Validate parameters before making request
  if (!postId || typeof postId !== 'string' || postId.trim() === '') {
    throw new Error('Invalid postId: postId must be a non-empty string');
  }
  
  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Invalid page: page must be a positive integer');
  }
  
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Invalid limit: limit must be between 1 and 100');
  }
  
  const response = await axios.get('/posts/comments', {
    params: { postId: postId.trim(), page, limit }
  });
  return response.data.data;
};

// Create a new comment
export const createComment = async (data: CreateCommentData) => {
  const response = await axios.post('/posts/comment', data);
  return response.data.data;
};

// Get single comment
export const getCommentById = async (commentId: string) => {
  const response = await axios.get(`/posts/comment/${commentId}`);
  return response.data.data;
};

// Update comment
export const updateComment = async (commentId: string, content: string) => {
  const response = await axios.put(`/posts/comment/${commentId}`, { content });
  return response.data.data;
};

// Delete comment
export const deleteComment = async (commentId: string) => {
  const response = await axios.delete(`/posts/comment/${commentId}`);
  return response.data;
};

// Like comment
export const likeComment = async (commentId: string) => {
  const response = await axios.post('/posts/like-comment', { commentId });
  return response.data;
};

// Unlike comment
export const unlikeComment = async (commentId: string) => {
  const response = await axios.post('/posts/unlike-comment', { commentId });
  return response.data;
};