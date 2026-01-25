import apiClient from './base';

export interface CallParticipant {
  _id: string;
  username: string;
  fullName: string;
  profileImageUrl?: string;
}

export interface Call {
  _id: string;
  participants: CallParticipant[];
  initiator: CallParticipant;
  chatId: string;
  callType: 'voice' | 'video';
  status: 'initiated' | 'ringing' | 'connecting' | 'active' | 'ended' | 'declined' | 'missed' | 'failed';
  initiatedAt: string;
  startedAt?: string;
  endedAt?: string;
  duration: number;
  endReason?: 'normal' | 'declined' | 'missed' | 'failed' | 'network_error' | 'cancelled';
  metadata?: {
    initiatorDevice?: string;
    receiverDevice?: string;
    quality?: 'excellent' | 'good' | 'poor' | 'failed';
    connectionType?: 'wifi' | 'cellular' | 'unknown';
  };
  formattedDuration: string;
  wasAnswered: boolean;
  isOngoing: boolean;
}

export interface CallHistoryResponse {
  calls: Call[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCalls: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CallStatsResponse {
  totalCalls: number;
  answeredCalls: number;
  totalDuration: number;
  videoCalls: number;
  voiceCalls: number;
}

export interface InitiateCallRequest {
  receiverId: string;
  chatId: string;
  callType: 'voice' | 'video';
}

export interface UpdateCallStatusRequest {
  status: 'connecting' | 'active' | 'ended' | 'failed';
  metadata?: {
    quality?: 'excellent' | 'good' | 'poor' | 'failed';
    connectionType?: 'wifi' | 'cellular' | 'unknown';
  };
}

export interface EndCallRequest {
  endReason?: 'normal' | 'declined' | 'missed' | 'failed' | 'network_error' | 'cancelled';
}

export interface SessionDataRequest {
  sessionData: {
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    iceCandidates?: RTCIceCandidateInit[];
  };
}

// Error type for subscription restrictions
export interface SubscriptionError {
  errorCode: 'CALLING_FEATURE_RESTRICTED';
  subscriptionTier: 'free';
  requiresUpgrade: boolean;
  availablePlans: string[];
}

// API functions
export const callAPI = {
  // Initiate a call
  initiateCall: async (data: InitiateCallRequest): Promise<Call> => {
    try {
      const response = await apiClient.post<{ success: boolean; data: Call; message: string }>('/calls/initiate', data);
      return response.data.data;
    } catch (error: any) {
      // Check if error is subscription-related
      if (error.response?.status === 403 && error.response?.data?.data?.errorCode === 'CALLING_FEATURE_RESTRICTED') {
        throw {
          isSubscriptionError: true,
          ...error.response.data.data
        };
      }
      throw error;
    }
  },

  // Accept a call
  acceptCall: async (callId: string): Promise<Call> => {
    try {
      const response = await apiClient.patch<{ success: boolean; data: Call; message: string }>(`/calls/${callId}/accept`);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Decline a call
  declineCall: async (callId: string): Promise<Call> => {
    try {
      const response = await apiClient.patch<{ success: boolean; data: Call; message: string }>(`/calls/${callId}/decline`);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  },

  // End a call
  endCall: async (callId: string, data?: EndCallRequest): Promise<Call> => {
    try {
      const response = await apiClient.patch<{ success: boolean; data: Call; message: string }>(`/calls/${callId}/end`, data);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Note: updateCallStatus removed - use accept/decline/end endpoints instead

  // Get call history
  getCallHistory: async (page = 1, limit = 20): Promise<CallHistoryResponse> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: CallHistoryResponse; message: string }>(`/calls/history?page=${page}&limit=${limit}`);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Get active call
  getActiveCall: async (): Promise<Call | null> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: Call | null; message: string }>('/calls/active');
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Get call statistics
  getCallStats: async (days = 30): Promise<CallStatsResponse> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: CallStatsResponse; message: string }>(`/calls/stats?days=${days}`);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Store session data (for debugging/analytics)
  storeSessionData: async (callId: string, data: SessionDataRequest): Promise<void> => {
    try {
      await apiClient.post(`/calls/${callId}/session-data`, data);
    } catch (error: any) {
      throw error;
    }
  }
};

// Helper functions
export const formatCallDuration = (seconds: number): string => {
  if (seconds === 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const getCallStatusIcon = (status: Call['status']): string => {
  switch (status) {
    case 'initiated':
    case 'ringing':
      return '📞';
    case 'connecting':
      return '🔄';
    case 'active':
      return '📞';
    case 'ended':
      return '✅';
    case 'declined':
      return '❌';
    case 'missed':
      return '📵';
    case 'failed':
      return '⚠️';
    default:
      return '📞';
  }
};

export const getCallStatusColor = (status: Call['status']): string => {
  switch (status) {
    case 'initiated':
    case 'ringing':
    case 'connecting':
      return 'text-blue-600';
    case 'active':
      return 'text-green-600';
    case 'ended':
      return 'text-gray-600';
    case 'declined':
    case 'missed':
      return 'text-red-600';
    case 'failed':
      return 'text-orange-600';
    default:
      return 'text-gray-600';
  }
};