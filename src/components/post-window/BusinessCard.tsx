// components/BusinessPostCard.jsx

import { Building2, Megaphone } from 'lucide-react';
import { useState } from 'react';
import ProductServiceDetails from '../ProductServiceDetails';
import { FeedPost } from '@/types';

interface BusinessPostCardProps {
  post?: FeedPost;
}

const BusinessPostCard = ({ post }: BusinessPostCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Extract business data from post customization
  const businessData = post?.customization?.business;
  const businessName = businessData?.businessName || 'Business';
  const businessType = businessData?.businessType || 'General';
  const businessDescription = businessData?.description || post?.description || 'No description available';
  const businessCategory = businessData?.category || 'Business';
  
  return (
    // Main card container
    <div className="w-full max-w-full rounded-2xl border border-violet-500 bg-violet-200/70 p-2 sm:p-3 md:p-4 shadow-md font-sans overflow-hidden" onClick={(e) => e.stopPropagation()}>
      
      {/* Header section: Business Name */}
      <div className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-gray-700" />
          <h1 className="font-bold text-gray-800">{businessName}</h1>
        </div>
      </div>

      {/* Business Type Section - removed from UI */}
      {false && (
        <div className="rounded-lg border border-amber-400 bg-amber-100 p-3">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-amber-600" />
            <span className="text-xs font-bold uppercase text-amber-600">
              {businessType}
            </span>
          </div>
          <p className="mt-1 font-semibold text-orange-800">
            {businessCategory}
          </p>
        </div>
      )}
      
      {/* Description Section */}
      <div className="mt-3 rounded-lg border border-red-300 bg-red-50/70 p-3">
        <div>
          <p className="mt-1 text-sm text-gray-600">{businessDescription}</p>
          
          {/* View Details Button */}
          <div className="mt-3 flex justify-end">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(true);
              }}
              className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:opacity-90 transition-opacity"
            >
              VIEW DETAILS
            </button>
          </div>
        </div>
      </div>
      
      {/* Business Details Modal */}
      {showDetails && post && (
        <ProductServiceDetails 
          post={post} 
          onClose={() => setShowDetails(false)} 
        />
      )}
    </div>
  );
};

export default BusinessPostCard;