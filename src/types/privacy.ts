export interface FollowRequest {
  _id: string;
  requesterId: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
  };
  recipientId: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
  };
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface PrivacySettings {
  privacy: 'public' | 'private';
  isPhoneNumberHidden: boolean;
  isAddressHidden: boolean;
}

export interface FollowState {
  isFollowing: boolean;
  isPending: boolean;
}

export interface UserPrivacy {
  _id: string;
  username: string;
  fullName: string;
  profileImageUrl?: string;
  privacy: 'public' | 'private';
  isPhoneNumberHidden?: boolean;
  isAddressHidden?: boolean;
}

export interface FollowResponse {
  data: {
    isFollowing: boolean;
    isPending: boolean;
    followedUser?: {
      _id: string;
      username: string;
      fullName: string;
      profileImageUrl?: string;
    };
    targetUser?: {
      _id: string;
      username: string;
      fullName: string;
      profileImageUrl?: string;
    };
    timestamp: string;
  };
  message: string;
  success: boolean;
}

export interface PrivacyToggleResponse {
  data: {
    privacy: 'public' | 'private';
    isPrivate: boolean;
  };
  message: string;
  success: boolean;
}

export type PrivacyLevel = 'everyone' | 'followers' | 'nobody';

export interface MessagingPrivacySettings {
  onlineStatus: PrivacyLevel;
  lastSeen: PrivacyLevel;
}

export interface OnlineStatusResponse {
  online: boolean;
  lastSeen: string | null;
  canSeeStatus: boolean;
}