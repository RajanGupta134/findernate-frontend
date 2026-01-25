import axios from "./base";
import { followEvents } from "@/utils/followEvents";

interface UsernameSuggestionsResponse {
    suggestions: string[];
    isAvailable: boolean;
    originalUsername: string;
    message: string;
}

export const getUserProfile = async () => {
    const response = await axios.get('/users/profile')

    return response.data.data
}

export const getOtherUserProfile = async (username: string) => {
    try {
        const response = await axios.get(`/users/profile/other`, {
            params: {
                identifier: username
            },
        });

        console.log('getOtherUserProfile API Response:', {
            username: username,
            isFollowedBy: response.data.data.isFollowedBy,
            fullData: response.data.data
        });

        return response.data.data;
    } catch (error: any) {
        throw error;
    }
}

export const editProfile = async (data: {
    fullName?: string;
    bio?: string;
    location?: string;
    link?: string;
    profileImageUrl?: string;
}) => {
    const response = await axios.put('/users/profile', data);
    return response.data.data;
}

export const uploadProfileImage = async (imageFile: File) => {
    const formData = new FormData();
    formData.append('profileImage', imageFile);

    const response = await axios.post('/users/profile/upload-image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.data;
}

export const followUser = async (userId: string) => {
    try {
        const response = await axios.post('/users/follow', { userId });
        
        // Emit follow event for message panel integration
        followEvents.emit(userId, true);
        
        return response.data;
    } catch (error: any) {
        
        // Handle specific cases where we want to return success-like response
        if (error.response?.status === 400 && 
            (error.response?.data?.message === 'Already following' || 
             error.response?.data?.message?.includes('Already following'))) {
            // If already following, emit event and return success response
            followEvents.emit(userId, true);
            return { success: true, message: 'Already following' };
        }
        
        throw error;
    }
}

export const unfollowUser = async (userId: string) => {
    try {
        console.log('Unfollow API called with userId:', userId);
        console.log('Request payload:', { userId });

        const response = await axios.post('/users/unfollow', { userId });

        console.log('Unfollow API response:', response.data);

        // Emit unfollow event for message panel integration
        followEvents.emit(userId, false);

        return response.data;
    } catch (error: any) {
        console.error('Unfollow API error:', {
            status: error.response?.status,
            message: error.response?.data?.message,
            data: error.response?.data,
            userId: userId
        });

        // Handle specific cases where we want to return success-like response
        if (error.response?.status === 400 &&
            (error.response?.data?.message === 'Not following this user' ||
             error.response?.data?.message?.includes('Not following'))) {
            // If not following, emit event and return success response
            followEvents.emit(userId, false);
            return { success: true, message: 'Not following this user' };
        }

        throw error;
    }
}

export const getFollowers = async (userId: string) => {
    const response = await axios.get(`/users/followers/${userId}`);
    const result = Array.isArray(response.data.data) ? response.data.data : [];
    return result;
}

export const getFollowing = async (userId: string) => {
    const response = await axios.get(`/users/following/${userId}`);
    const result = Array.isArray(response.data.data) ? response.data.data : [];
    return result;
}

export const getUserById = async (userId: string) => {
    const response = await axios.get(`/users/profile/other?identifier=${userId}`);
    return response.data.data;
}

export const getSuggestedUsers = async () => {
    const response = await axios.get('/suggestions/suggested-for-you');
    // Return the suggestions array, not the whole data object
    return response.data.data?.suggestions || [];
}

export const getUsernameSuggestions = async (username: string): Promise<UsernameSuggestionsResponse> => {
    const response = await axios.get(`/users/username-suggestions`, {
        params: { username }
    });
    return response.data.data;
}

export const getTrendingBusinessOwners = async () => {
    const response = await axios.get('/business-owners/trending-business-owners')
    return response
}

export const getBusinessProfile = async (businessName: string) => {
    try {
        // Try to get business profile by name first
        const response = await axios.get(`/business-owners/profile/${businessName}`);
        
        // Handle different response structures
        if (response.data && response.data.data) {
            return response.data; // Standard structure
        } else if (response.data) {
            return { data: response.data }; // Direct data structure
        } else {
            throw new Error('Invalid response structure');
        }
    } catch (error: any) {
        throw error;
    }
}

// Block user functionality
export const blockUser = async (blockedUserId: string, reason?: string) => {
    try {
        const response = await axios.post('/users/block', { 
            blockedUserId,
            reason
        });
        return response.data;
    } catch (error: any) {
        throw error;
    }
}

export const unblockUser = async (blockedUserId: string) => {
    try {
        const response = await axios.post('/users/unblock', { 
            blockedUserId 
        });
        return response.data;
    } catch (error: any) {
        throw error;
    }
}

export const getBlockedUsers = async () => {
    try {
        const response = await axios.get('/users/blocked-users');
        // Normalize various possible response shapes
        const payload = response?.data;
        const blockedList = Array.isArray(payload?.blockedUsers)
            ? payload.blockedUsers
            : Array.isArray(payload?.data?.blockedUsers)
            ? payload.data.blockedUsers
            : Array.isArray(payload?.data)
            ? payload.data
            : [];
        return blockedList;
    } catch (error: any) {
        throw error;
    }
}

export const checkIfUserBlocked = async (userId: string) => {
    try {
        const response = await axios.get(`/users/check-block/${userId}`);
        return response.data?.isBlocked || false;
    } catch (error: any) {
        throw error;
    }
}

// Account Privacy function
export const updateAccountPrivacy = async (privacy: 'public' | 'private') => {
    try {
        const response = await axios.put('/users/privacy/account', { privacy });
        return response.data;
    } catch (error: any) {
        throw error;
    }
}