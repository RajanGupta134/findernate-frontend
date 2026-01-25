"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { searchLocations, LocationSuggestion } from '@/api/location';

interface LocationInputProps {
  selectedLocation: string;
  onLocationSelect: (location: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const LocationInput: React.FC<LocationInputProps> = ({
  selectedLocation,
  onLocationSelect,
  placeholder = "Search location...",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);


  // Debounced search for location suggestions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchLocations(searchQuery);
        setSuggestions(results);
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  };

  const handleLocationClick = (location: string) => {
    onLocationSelect(location);
    setIsOpen(false);
    setSearchQuery("");
  };

  const formatLocationName = (suggestion: LocationSuggestion) => {
    // Try to create a clean, readable format
    const parts: string[] = [];
    if (suggestion.name) parts.push(suggestion.name);
    if (suggestion.address?.city && suggestion.address.city !== suggestion.name) {
      parts.push(suggestion.address.city);
    }
    if (suggestion.address?.state) parts.push(suggestion.address.state);
    if (suggestion.address?.country) parts.push(suggestion.address.country);
    
    return parts.join(', ') || suggestion.display_name;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : selectedLocation}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
          readOnly={!isOpen}
        />
        
        {/* Map Pin Icon */}
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        
        {/* Dropdown Arrow */}
        <ChevronDown 
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
          
          {/* All Locations Option */}
          <button
            onClick={() => handleLocationClick("All Locations")}
            className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
              selectedLocation === "All Locations" ? "bg-yellow-50 text-yellow-800" : "text-gray-700"
            }`}
          >
            <MapPin className="w-4 h-4" />
            All Locations
          </button>


          {/* Loading state */}
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
              Searching locations...
            </div>
          )}

          {/* Search suggestions */}
          {suggestions.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                Search Results
              </div>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  onClick={() => handleLocationClick(formatLocationName(suggestion))}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                >
                  <MapPin className="w-4 h-4" />
                  <div>
                    <div className="font-medium">{formatLocationName(suggestion)}</div>
                    {suggestion.display_name !== formatLocationName(suggestion) && (
                      <div className="text-xs text-gray-500 truncate">{suggestion.display_name}</div>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}

          {/* No results found */}
          {!loading && searchQuery.length >= 2 && suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">
              No locations found for "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationInput;