import apiClient from './base';

/**
 * Stream.io Video API
 *
 * Backend implementation required:
 *
 * POST /api/v1/stream/token
 *
 * Request headers:
 * - Authorization: Bearer <user_jwt_token>
 *
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     token: string,          // Stream.io user token (JWT)
 *     userId: string,         // User ID in your system
 *     expiresAt?: string      // Optional token expiration
 *   },
 *   message: string
 * }
 *
 * Backend should:
 * 1. Verify user authentication
 * 2. Generate Stream.io token using Stream SDK with your API secret
 * 3. Return the token for the authenticated user
 *
 * Example Node.js implementation:
 *
 * import { StreamClient } from '@stream-io/node-sdk';
 *
 * const streamClient = new StreamClient(
 *   process.env.STREAM_API_KEY,
 *   process.env.STREAM_API_SECRET
 * );
 *
 * const token = streamClient.createToken(userId);
 *
 * res.json({
 *   success: true,
 *   data: { token, userId },
 *   message: 'Token generated successfully'
 * });
 */

export interface StreamTokenResponse {
  token: string;
  userId: string;
  expiresAt?: string;
}

export interface CreateStreamCallRequest {
  callId: string;
  callType: 'voice' | 'video';
  members: string[];
  video_enabled?: boolean;  // Set to false to start call with video off
}

export interface CreateStreamCallResponse {
  streamCallType: 'audio_room' | 'default';
  callId: string;
}

// Cache for Stream.io token
let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string> | null = null;

export const streamAPI = {
  // Get Stream.io token for video calls (with caching)
  getStreamToken: async (forceRefresh: boolean = false): Promise<string> => {
    try {
      // Return cached token if available and not forcing refresh
      if (cachedToken && !forceRefresh) {
        console.log('📞 Using cached Stream.io token');
        return cachedToken;
      }

      // If a fetch is already in progress, wait for it
      if (tokenFetchPromise) {
        console.log('📞 Waiting for in-progress token fetch');
        return tokenFetchPromise;
      }

      // Start new fetch
      console.log('📞 Fetching new Stream.io token');
      tokenFetchPromise = apiClient.post<{ success: boolean; data: StreamTokenResponse; message: string }>('/stream/token')
        .then(response => {
          cachedToken = response.data.data.token;
          tokenFetchPromise = null;
          return cachedToken;
        })
        .catch(error => {
          tokenFetchPromise = null;
          console.error('Failed to fetch Stream.io token:', error);
          throw error;
        });

      return tokenFetchPromise;
    } catch (error: any) {
      console.error('Failed to fetch Stream.io token:', error);
      throw error;
    }
  },

  // Pre-fetch and cache token (call this on login or app start)
  prefetchStreamToken: async (): Promise<void> => {
    try {
      await streamAPI.getStreamToken(true);
      console.log('📞 Stream.io token pre-fetched successfully');
    } catch (error) {
      console.warn('📞 Failed to pre-fetch Stream.io token:', error);
      // Don't throw - this is just a performance optimization
    }
  },

  // Clear cached token (call this on logout)
  clearCachedToken: (): void => {
    cachedToken = null;
    tokenFetchPromise = null;
  },

  // Create Stream.io call with proper settings
  createStreamCall: async (data: CreateStreamCallRequest): Promise<CreateStreamCallResponse> => {
    try {
      const response = await apiClient.post<{ success: boolean; data: CreateStreamCallResponse; message: string }>('/stream/call/create', data);
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to create Stream.io call:', error);
      throw error;
    }
  }
};
