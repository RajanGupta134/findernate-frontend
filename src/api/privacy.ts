import axios from './base';

// Toggle account privacy (private/public)
export const toggleAccountPrivacy = async () => {
  const response = await axios.put('/users/privacy/account', {});
  return response.data;
};

// Toggle phone number visibility
export const togglePhoneVisibility = async () => {
  const response = await axios.put('/users/privacy/phone-number');
  return response.data;
};

// Toggle address visibility
export const toggleAddressVisibility = async () => {
  const response = await axios.put('/users/privacy/address');
  return response.data;
};

// Follow user (handles both public/private accounts)
export const followUser = async (userId: string) => {
  const response = await axios.post('/users/follow', { userId });
  return response.data;
};

// Unfollow user
export const unfollowUser = async (userId: string) => {
  const response = await axios.post('/users/unfollow', { userId });
  return response.data;
};

// Get pending follow requests (received)
export const getPendingFollowRequests = async () => {
  const response = await axios.get('/users/follow-requests/pending');
  return response.data;
};

// Get sent follow requests
export const getSentFollowRequests = async () => {
  const response = await axios.get('/users/follow-requests/sent');
  return response.data;
};

// Approve follow request
export const approveFollowRequest = async (requesterId: string) => {
  const response = await axios.post('/users/follow-request/approve', { requesterId });
  return response.data;
};

// Reject follow request
export const rejectFollowRequest = async (requesterId: string) => {
  const response = await axios.post('/users/follow-request/reject', { requesterId });
  return response.data;
};

// Get followers list
export const getFollowers = async (userId: string) => {
  const response = await axios.get(`/users/followers/${userId}`);
  return response.data;
};

// Get following list
export const getFollowing = async (userId: string) => {
  const response = await axios.get(`/users/following/${userId}`);
  return response.data;
};

// Toggle full account privacy
export const toggleFullAccountPrivacy = async (privacy: 'private' | 'public') => {
  const response = await axios.put('/users/privacy/account', { privacy });
  return response.data;
};