// Location suggestion using OpenStreetMap Nominatim API

export interface LocationSuggestion {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  address: {
    town?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export const searchLocations = async (query: string): Promise<LocationSuggestion[]> => {
  if (!query.trim() || query.length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
      {
        headers: {
          'User-Agent': 'FinderNate-App' // Required by Nominatim API
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    return [];
  }
};