import { getUserById } from '@/api/user';

// Cache for user data to avoid repeated API calls
const userCache = new Map<string, { username: string; profileImageUrl: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchUserData(userId: string): Promise<{ username: string; profileImageUrl: string }> {
  // Check cache first
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { username: cached.username, profileImageUrl: cached.profileImageUrl };
  }

  try {
    //console.log(`Fetching user data for ${userId}`);
    const userData = await getUserById(userId);
    
    const result = {
      username: userData.userId?.username || userData.userId?.fullName || `User${userId.slice(-4)}`,
      profileImageUrl: userData.userId?.profileImageUrl || ''
    };

    // Cache the result
    userCache.set(userId, {
      ...result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error(`Failed to fetch user data for ${userId}:`, error);
    
    // Return fallback data
    const fallback = {
      username: `User${userId.slice(-4)}`,
      profileImageUrl: ''
    };

    // Cache the fallback to avoid repeated failed requests
    userCache.set(userId, {
      ...fallback,
      timestamp: Date.now()
    });

    return fallback;
  }
}

export function clearUserCache() {
  userCache.clear();
}

export function getCachedUserData(userId: string): { username: string; profileImageUrl: string } | null {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { username: cached.username, profileImageUrl: cached.profileImageUrl };
  }
  return null;
}