import axiosInstance from './base';
import { Story, StoryAnalytics, CreateStoryRequest, StoryUploadResponse, DeleteStoryResponse } from '@/types/story';

export const storyAPI = {
  // Upload a new story
  uploadStory: async (data: CreateStoryRequest): Promise<StoryUploadResponse> => {
    console.log('📤 [API] Uploading story to backend...');

    const formData = new FormData();
    formData.append('media', data.media);
    if (data.caption) {
      formData.append('caption', data.caption);
    }

    try {
      const response = await axiosInstance.post('/stories/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ [API] Story uploaded successfully:', response.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ [API] Story upload failed:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  // Fetch stories feed (from followed users + self)
  fetchStoriesFeed: async (): Promise<Story[]> => {
    console.log('📖 [API] Fetching stories feed from backend...');

    try {
      const response = await axiosInstance.get('/stories/feed');
      console.log('✅ [API] Stories feed received:', {
        statusCode: response.data.statusCode || response.status,
        count: response.data.data?.length || 0,
        success: response.data.success
      });

      return response.data.data;
    } catch (error: any) {
      console.error('❌ [API] Failed to fetch stories feed:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  // Fetch stories by specific user
  fetchStoriesByUser: async (userId: string): Promise<Story[]> => {
    const response = await axiosInstance.get(`/stories/user/${userId}`);
    return response.data.data;
  },

  // Mark story as seen
  markStorySeen: async (storyId: string): Promise<void> => {
    console.log('📊 Marking story as seen:', storyId);
    try {
      const response = await axiosInstance.post('/stories/seen', { storyId });
      console.log('✅ Story marked as seen successfully:', response.data);
    } catch (error: any) {
      console.error('❌ Failed to mark story as seen:', {
        storyId,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error; // Re-throw to let caller handle
    }
  },

  // Get story viewers/analytics
  fetchStoryViewers: async (
    storyId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<StoryAnalytics> => {
    const response = await axiosInstance.get(
      `/stories/${storyId}/viewers?page=${page}&limit=${limit}`
    );
    return response.data.data;
  },

  // Save a story
  saveStory: async (storyId: string) => {
    const response = await axiosInstance.post('/stories/save', { storyId });
    return response.data;
  },

  // Get saved stories
  getSavedStories: async () => {
    const response = await axiosInstance.get('/stories/saved');
    return response.data.data;
  },

  // Unsave a story
  unsaveStory: async (storyId: string) => {
    const response = await axiosInstance.delete(`/stories/save/${storyId}`);
    return response.data;
  },

  // Delete a story
  deleteStory: async (storyId: string): Promise<DeleteStoryResponse> => {
    const response = await axiosInstance.delete<DeleteStoryResponse>(`/stories/${storyId}`);
    return response.data;
  },
};