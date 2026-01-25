'use client';
import { getTrendingBusinessOwners } from '@/api/user';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Type definitions
interface Business {
  _id: string;
  businessName: string;
  category: string;
  description: string;
  logoUrl: string;
  followersCount: number;
  isFollowing: boolean;
}

// Axios response wrapper type
interface AxiosResponse {
  data: {
    data: {
      businesses: Business[];
    };
  };
  status: number;
  statusText: string;
}

export default function TrendingBusiness() {
  const [businessOwners, setBusinessOwners] = useState<Business[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const formatFollowers = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  useEffect(() => {
    const fetchBusinessOwners = async (): Promise<void> => {
      try {
        setLoading(true);
        const response: AxiosResponse = await getTrendingBusinessOwners();
        //console.log("trending business owners", response);
        
        // Extract businesses array from the Axios response structure
        // response.data.data.businesses (because of Axios wrapper)
        if (response && response.data && response.data.data && response.data.data.businesses) {
          setBusinessOwners(response.data.data.businesses);
        } else {
          setBusinessOwners([]);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching business owners:', err);
        setError("Failed to load business owners");
        setBusinessOwners([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBusinessOwners();
  }, []);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = e.target as HTMLImageElement;
    target.src = "/placeholder.jpg";
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-300 p-6 cursor-pointer">
      {/* SVG and Heading aligned */}
      <div className="flex items-center gap-2 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-building2 text-yellow-700"
        >
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path>
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path>
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path>
          <path d="M10 6h4"></path>
          <path d="M10 10h4"></path>
          <path d="M10 14h4"></path>
          <path d="M10 18h4"></path>
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">Trending Business Owners</h3>
      </div>

      {/* Business List */}
      <div className="space-y-1 max-h-80 overflow-y-auto pr-2 hide-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500 text-sm">{error}</div>
          </div>
        ) : businessOwners.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 text-sm">No business owners found</div>
          </div>
        ) : (
          businessOwners.map((business: Business) => (
            <Link
              key={business._id}
              href={`/business/${encodeURIComponent(business.businessName)}`}
              className="flex items-center justify-start gap-6 p-2 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
            >
              <Image
                src="/placeholder.jpg"
                alt={`${business.businessName} logo`}
                width={25}
                height={25}
                className="w-12 h-12 rounded-full object-cover"
                onError={handleImageError}
              />
              <div className="flex flex-col">
                <p className="font-semibold text-gray-900 text-sm transition-colors">{business.businessName}</p>
                <span className="text-yellow-600 text-xs capitalize">{business.category}</span>
                <p className="text-xs text-gray-500">{formatFollowers(business.followersCount)} followers</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}