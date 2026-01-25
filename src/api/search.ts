import axios from './base';

export interface SearchResponse {
  statusCode: number;
  data: {
    results: any[];
    users: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
  success: boolean;
}

export const searchAllContent = async (
  q: string,
  near?: string,
  limit: number = 10,
  contentType?: string,
  postType?: string,
  startDate?: string,
  endDate?: string,
  distance?: number,
  coordinates?: string
): Promise<SearchResponse> => {
  const params: Record<string, string | number> = { q, limit };
  
  // Add optional parameters only if they are provided
  // If coordinates are provided, prioritize them over 'near'
  if (coordinates) {
    params.coordinates = coordinates;
    if (distance) params.distance = distance;
  } else if (near) {
    params.near = near;
  }
  
  if (contentType) params.contentType = contentType;
  if (postType) params.postType = postType;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  // Make sure this matches your actual API endpoint
  const response = await axios.get('/users/searchAllContent', { params });
  return response.data;
};

export const searchUsers = async (query: string): Promise<SearchResponse> => {
  const response = await axios.get('/users/profile/search', { params: { query } });
  return response.data;
};

// Get popular searches
export interface PopularSearch {
  keyword: string;
  searchCount: number;
}

export const getPopularSearches = async (limit: number = 10) => {
  const response = await axios.get(`/users/popular-searches?limit=${limit}`);
  return response.data;
};
