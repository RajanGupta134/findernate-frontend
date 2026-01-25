/**
 * Utility functions to safely render data and prevent React object rendering errors
 */

/**
 * Safely converts any value to a string for rendering
 * Prevents React "Objects are not valid as a React child" errors
 */
export const safeString = (val: any, fallback: string = 'N/A'): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' && val.trim() !== '') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') {
    console.warn('Attempted to render object as string:', val);
    return fallback;
  }
  return fallback;
};

/**
 * Safely extracts contact information from a contact object
 */
export const safeContactInfo = (contact: any) => {
  if (!contact || typeof contact !== 'object') {
    return { email: null, phone: null, website: null, address: null };
  }

  return {
    email: safeString(contact.email, null as any) || null,
    phone: safeString(contact.phone, null as any) || null,
    website: safeString(contact.website, null as any) || null,
    address: safeString(contact.address, null as any) || null,
  };
};

/**
 * Safely extracts location information from a location object
 */
export const safeLocationInfo = (location: any) => {
  if (!location || typeof location !== 'object') {
    return { city: null, state: null, address: null, country: null, postalCode: null };
  }

  return {
    city: safeString(location.city, null as any) || null,
    state: safeString(location.state, null as any) || null,
    address: safeString(location.address, null as any) || null,
    country: safeString(location.country, null as any) || null,
    postalCode: safeString(location.postalCode, null as any) || null,
  };
};

/**
 * Formats location object as a readable string
 */
export const formatLocation = (location: any): string => {
  if (typeof location === 'string') return location;

  const loc = safeLocationInfo(location);
  const parts = [loc.city, loc.state, loc.country].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'N/A';
};

/**
 * Safely gets array length
 */
export const safeArrayLength = (arr: any): number => {
  if (Array.isArray(arr)) return arr.length;
  return 0;
};

/**
 * Safely renders nested user properties
 */
export const safeUserInfo = (user: any) => {
  if (!user || typeof user !== 'object') {
    return { fullName: 'N/A', username: 'N/A', email: 'N/A' };
  }

  return {
    fullName: safeString(user.fullName),
    username: safeString(user.username),
    email: safeString(user.email),
  };
};
