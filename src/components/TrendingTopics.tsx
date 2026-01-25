"use client";

import { useState, useEffect } from 'react';
import { getPopularSearches, PopularSearch } from '@/api/search';

// Fallback data for hashtag topics (non-search pages)
const fallbackTopics = [
  { hashtag: '#design', posts: 12500 },
  { hashtag: '#business', posts: 8900 },
  { hashtag: '#technology', posts: 15200 },
  { hashtag: '#health', posts: 6700 },
  { hashtag: '#travel', posts: 9800 },
  { hashtag: '#food', posts: 11300 },
  { hashtag: '#fitness', posts: 7600 },
  { hashtag: '#photography', posts: 13400 },
  { hashtag: '#marketing', posts: 5900 },
  { hashtag: '#startup', posts: 4200 }
];

interface TrendingTopicsProps {
  isSearchPage?: boolean;
  onTrendingClick?: (term: string) => void;
}

export default function TrendingTopics({ isSearchPage = false, onTrendingClick }: TrendingTopicsProps) {
  const [searches, setSearches] = useState<PopularSearch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSearchPage) {
      fetchPopularSearches();
    }
  }, [isSearchPage]);

  const fetchPopularSearches = async () => {
    try {
      setLoading(true);
      const response = await getPopularSearches();
      if (response.data && Array.isArray(response.data)) {
        setSearches(response.data);
      }
    } catch (error) {
      console.error('Error fetching popular searches:', error);
      setSearches([]); // Clear on error
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const title = isSearchPage ? "Trending Searches" : "Trending Topics";

  return (
    <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header with Icon */}
      <div className="flex items-center gap-2 mb-4">
       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up w-5 h-5 text-gray-600"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {isSearchPage ? (
            searches.length > 0 ? (
              searches.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors border cursor-pointer"
                  onClick={() => onTrendingClick?.(item.keyword)}
                >
                  <div>
                    <p className="font-medium text-yellow-600 hover:text-yellow-800 transition-colors">
                      {item.keyword}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCount(item.searchCount)} searches
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full opacity-60"></div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No trending searches available
              </div>
            )
          ) : (
            fallbackTopics.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors border cursor-pointer"
              >
                <div>
                  <p className="font-medium text-yellow-600 hover:text-yellow-800 transition-colors">
                    {item.hashtag}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCount(item.posts)} posts
                  </p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full opacity-60"></div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
