import { useEffect, useState } from 'react';
import { fetchUserData } from '@/utils/userDataFetcher';
import { FeedPost } from '@/types';

export function useUserDataFetcher(posts: FeedPost[]): FeedPost[] {
  const [enrichedPosts, setEnrichedPosts] = useState<FeedPost[]>(posts);

  useEffect(() => {
    const enrichPostsWithUserData = async () => {
      const postsNeedingUserData = posts.filter(post => 
        !post.username || 
        post.username.startsWith('User') || 
        post.username === 'Anonymous User' ||
        post.username === 'Unknown User'
      );

      if (postsNeedingUserData.length === 0) {
        setEnrichedPosts(posts);
        return;
      }

      //console.log(`Fetching user data for ${postsNeedingUserData.length} posts`);

      const enrichedPostsData = await Promise.all(
        posts.map(async (post) => {
          // Skip if we already have good user data
          if (post.username && 
              !post.username.startsWith('User') && 
              post.username !== 'Anonymous User' &&
              post.username !== 'Unknown User') {
            return post;
          }

          // Extract userId - it might be in different places depending on the API
          let userId: string | null = null;
          
          // Try different ways to get the userId
          if (typeof post.userId === 'string') {
            userId = post.userId;
          } else if (typeof post.userId === 'object' && post.userId?._id) {
            userId = post.userId._id;
          }

          if (!userId) {
            console.warn(`No userId found for post ${post._id}`);
            return post;
          }

          try {
            const userData = await fetchUserData(userId);
            return {
              ...post,
              username: userData.username,
              profileImageUrl: userData.profileImageUrl
            };
          } catch (error) {
            console.error(`Failed to enrich user data for post ${post._id}:`, error);
            return post;
          }
        })
      );

      setEnrichedPosts(enrichedPostsData);
    };

    enrichPostsWithUserData();
  }, [posts]);

  return enrichedPosts;
}