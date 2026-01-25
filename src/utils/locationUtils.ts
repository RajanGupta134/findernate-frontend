/**
 * Utility functions for handling location data in posts
 */

export interface LocationData {
  name?: string;
  [key: string]: unknown;
}

/**
 * Determines if a location should be displayed based on its value
 * Filters out common invalid/placeholder location values
 * 
 * @param location - The location data (string or object)
 * @returns boolean - whether the location should be shown
 */
export const shouldShowLocation = (location: string | LocationData | null | undefined): boolean => {
  if (!location) return false;
  
  const locationName = typeof location === 'string' 
    ? location 
    : location?.name || '';
  
  const normalizedLocationName = typeof locationName === 'string' ? locationName.trim() : '';
  
  return Boolean(
    normalizedLocationName &&
    !/^unknown location$/i.test(normalizedLocationName) &&
    !/^unknown$/i.test(normalizedLocationName) &&
    normalizedLocationName.toLowerCase() !== 'n/a' &&
    normalizedLocationName.toLowerCase() !== 'location not specified'
  );
};

/**
 * Gets a human-readable location name from location data
 * 
 * @param location - The location data (string or object)
 * @returns string - formatted location name or fallback
 */
export const getLocationDisplayName = (location: string | LocationData | null | undefined): string => {
  if (!location) return 'Not specified';
  
  if (typeof location === 'string') {
    return location;
  }
  
  return location?.name || 'Not specified';
};
