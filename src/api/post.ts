import axios from './base';
import { BusinessPostFormProps, ProductDetailsFormProps, ServiceDetailsFormProps } from '@/types';
import buildFormData from '@/utils/formDataBuilder';

export type EditPostPayload = {
  caption?: string;
  description?: string;
  mood?: string;
  activity?: string;
  tags?: string[];
};

export const createRegularPost = async (data: {
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
  postType: string;
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
}) => {
  const formData = new FormData();

  formData.append('description', data.description);
  formData.append('postType', data.postType);
  formData.append('caption', data.caption);
  formData.append('mood', data.mood);
  formData.append('activity', data.activity);
  formData.append('status', data.status);

  // Send complete location object for better coordinate resolution
  formData.append('location', JSON.stringify(data.location));
  formData.append('settings', JSON.stringify(data.settings));
  formData.append('tags', JSON.stringify(data.tags));
  formData.append('mentions', JSON.stringify(data.mentions));

  data.image.forEach((file) => {
    formData.append('image', file);
  });
  const response = await axios.post('/posts/create/normal', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response;
};

export const createProductPost = async ({ formData }: { formData: ProductDetailsFormProps['formData'] }) => {
  const fd = new FormData();
  buildFormData(fd, formData);
  const response = await axios.post('/posts/create/product', fd, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const createServicePost = async ({ formData }: { formData: ServiceDetailsFormProps['formData'] }) => {
  const fd = new FormData();
  buildFormData(fd, formData);
  const response = await axios.post('/posts/create/service', fd, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const createBusinessPost = async ({ formData }: { formData: BusinessPostFormProps['formData'] }) => {
  const fd = new FormData();
  buildFormData(fd, formData);
  const response = await axios.post('/posts/create/business', fd, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Get single post
export const getPostById = async (postId: string) => {
  const response = await axios.get(`/posts/${postId}`);
  return response.data.data;
};


// Like/Unlike functions
export const likePost = async (postId: string) => {
  try {
    const response = await axios.post('/posts/like', { postId }, { timeout: 10000 });
    return response.data;
  } catch (error: unknown) {
    const err = error as Error;
    const axiosError = error as {
      response?: {
        data?: unknown;
        status?: number;
        statusText?: string;
      };
      message?: string;
      code?: string;
      config?: { url?: string; method?: string };
    };

    throw error;
  }
};

export const unlikePost = async (postId: string) => {
  try {
    // Try the request with explicit JSON data
    const requestData = { postId };

    const response = await axios.post('/posts/unlike', requestData, {
      timeout: 15000,  // Reduced timeout to fail faster
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: unknown) {
    const err = error as Error;
    const axiosError = error as {
      response?: {
        data?: unknown;
        status?: number;
        statusText?: string;
      };
      message?: string;
      code?: string;
      config?: { url?: string; method?: string };
    };

    throw error;
  }
};

export const savePost = async (postId: string, privacy: 'private' | 'public' = 'private') => {
  try {

    // Ensure we're sending exactly the format specified by the backend
    const requestData = {
      postId: postId,
      privacy: privacy
    };

    const headers = {
      'Content-Type': 'application/json'
    };
    const response = await axios.post('/posts/save', requestData, { headers });


    return response.data;
  } catch (error) {
    throw error;
  }
}

export const getPrivateSavedPosts = async (page: number = 1, limit: number = 10) => {
  try {
    const response = await axios.get(`/posts/saved/?page=${page}&limit=${limit}`)
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Deprecated - /posts/saved/public endpoint is removed from backend
// Use getPrivateSavedPosts() which now uses the unified /posts/saved/ endpoint
// export const getPublicSavedPosts = async (page: number = 1, limit: number = 10) => {
//   try {
//     const response = await axios.get(`/posts/saved/public?page=${page}&limit=${limit}`)
//     return response.data;
//   } catch (error) {
//     throw error;
//   }
// }

// Legacy function - removed as /posts/saved/private endpoint is deprecated on backend
// Use getPrivateSavedPosts() which now uses the unified /posts/saved/ endpoint
// export const getSavedPost = async () => {
//   const response = await axios.get('/posts/saved/private?page=1&limit=100')
//   return response.data
// }

export const unsavePost = async (postId: string) => {
  const response = await axios.delete(`/posts/save/${postId}`)
  return response.data
}

// Get another user's public saved posts
export const getUserPublicSavedPosts = async (userId: string, page: number = 1, limit: number = 10) => {
  try {
    const response = await axios.get(`/posts/saved/user/${userId}?page=${page}&limit=${limit}`)
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Toggle saved post privacy between private and public
// Note: Backend doesn't have a direct toggle endpoint, so we unsave and re-save with new privacy
export const toggleSavedPostPrivacy = async (postId: string, privacy: 'private' | 'public') => {
  try {
    // First unsave the post
    await unsavePost(postId);

    // Then re-save with new privacy
    const response = await savePost(postId, privacy);
    return response;
  } catch (error) {
    throw error;
  }
}

// Note: Use getPrivateSavedPosts() to get all saved posts and check if postId exists in the list
export const deletePost = async (postId: string) => {
  const response = await axios.delete(`/posts/${postId}`)
  return response.data
}

// Edit/Update post (user can only edit their own posts)
export const editPost = async (postId: string, payload: EditPostPayload) => {
  // Example endpoint provided by user shows /posts/edit/:postId
  const response = await axios.put(`/posts/edit/${postId}`, payload);
  return response.data;
}

// Toggle post privacy between private and public
export const togglePostPrivacy = async (postId: string, privacy: 'private' | 'public') => {
  try {
    const response = await axios.put(`/posts/${postId}/privacy`, { privacy });
    return response.data;
  } catch (error) {
    throw error;
  }
}