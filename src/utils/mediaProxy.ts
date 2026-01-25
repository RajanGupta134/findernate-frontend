/**
 * Converts a Cloudinary URL to use our proxy endpoint to handle authentication
 * @param cloudinaryUrl - The original Cloudinary URL
 * @returns The proxied URL that goes through our API route
 */
export function getProxiedMediaUrl(cloudinaryUrl: string): string {
  try {
    // Check if it's a Cloudinary URL
    if (!cloudinaryUrl.includes('res.cloudinary.com')) {
      return cloudinaryUrl; // Return as-is if not a Cloudinary URL
    }
    
    // Extract the path after 'res.cloudinary.com/'
    const cloudinaryDomain = 'res.cloudinary.com/';
    const startIndex = cloudinaryUrl.indexOf(cloudinaryDomain);
    
    if (startIndex === -1) {
      return cloudinaryUrl; // Return as-is if pattern not found
    }
    
    const pathAfterDomain = cloudinaryUrl.substring(startIndex + cloudinaryDomain.length);
    
    // Create the proxied URL
    const proxiedUrl = `/api/media/${pathAfterDomain}`;
    
    //console.log('Converting Cloudinary URL:', {
    //  original: cloudinaryUrl,
    //  proxied: proxiedUrl
    // });
    
    return proxiedUrl;
    
  } catch (error) {
    console.error('Error converting Cloudinary URL:', error);
    return cloudinaryUrl; // Return original URL on error
  }
}

/**
 * Checks if a URL is a Cloudinary URL that needs proxying
 */
export function needsProxy(url: string): boolean {
  return url.includes('res.cloudinary.com') && url.includes('/documents/');
}
