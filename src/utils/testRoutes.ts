// Utility to test which routes are available on the server
import axiosInstance from '@/api/base';

export const testServerRoutes = async () => {
  const baseRoutes = [
    '/users',
    '/posts', 
    '/stories',
    '/reels',
    '/explore',
    '/business',
    '/chats', // This is what we need
    '/media'
  ];

  //console.log('Testing server routes...');
  
  for (const route of baseRoutes) {
    try {
      // Try a simple GET request to each route
      await axiosInstance.get(route);
      //console.log(`✅ Route ${route} is available`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        //console.log(`❌ Route ${route} returns 404 - not available`);
      } else if (error.response?.status === 401) {
        //console.log(`🔐 Route ${route} requires authentication (but exists)`);
      } else {
        //console.log(`⚠️ Route ${route} returned status: ${error.response?.status}`);
      }
    }
  }
};