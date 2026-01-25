// components/ProductCard.jsx

import { MapPin, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import ProductServiceDetails from '../ProductServiceDetails';
import { FeedPost } from '@/types';
import { shouldShowLocation, getLocationDisplayName } from '@/utils/locationUtils';

interface ProductCardProps {
  post?: FeedPost;
}

const ProductCard = ({ post }: ProductCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Extract product data from post customization
  const productData = post?.customization?.product;
  const productName = productData?.name || 'Product';
  const productPrice = productData?.price || 0;
  const productCurrency = productData?.currency || 'INR';
  const inStock = productData?.inStock !== false; // Default to true if not specified
  
  return (
    // Main card container
    <div className="w-full max-w-full rounded-2xl border border-violet-500 bg-violet-200/70 p-2 sm:p-3 md:p-4 shadow-md font-sans overflow-hidden" onClick={(e) => e.stopPropagation()}>
      
      {/* Top section: Product Name */}
      <div className="flex items-center gap-3 border border-violet-600 rounded-lg bg-violet-300/70 p-3 text-violet-900">
        <ShoppingBag size={22} className="text-violet-800" />
        <h1 className="text-lg font-lg">{productName}</h1>
      </div>

      {/* Bottom section: Details and Shop Now button */}
      <div className="mt-2 rounded-lg border border-orange-500 bg-gradient-to-br from-orange-100 to-amber-50 p-4">
        
        {/* Location Info - only show if location is valid */}
        {shouldShowLocation(post?.location) && (
          <div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-orange-600" />
              <span className="text-xs font-bold uppercase text-orange-600">Location</span>
            </div>
            <p className="mt-1 ml-1 text-sm text-gray-700">
              {getLocationDisplayName(post?.location)}
            </p>
          </div>
        )}

        {/* Price */}
        <div className="mt-2">
          <span className="text-lg font-bold text-gray-900">{productCurrency} {productPrice}</span>
        </div>

        {/* Divider */}
        <hr className="my-3 border-t border-orange-200" />

        {/* Stock Status & Shop Now Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={18} className={`${inStock ? 'text-green-500 fill-green-500' : 'text-red-500 fill-red-500'}`} />
            <span className={`text-sm font-bold ${inStock ? 'text-green-600' : 'text-red-600'}`}>
              {inStock ? 'IN STOCK' : 'OUT OF STOCK'}
            </span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(true);
            }}
            disabled={!inStock}
            className={`rounded-lg px-4 py-2 text-sm font-bold text-white shadow-md hover:opacity-90 ${
              inStock 
                ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {inStock ? 'VIEW DETAILS' : 'UNAVAILABLE'}
          </button>
        </div>
      </div>
      
      {/* Product Details Modal */}
      {showDetails && post && (
        <ProductServiceDetails 
          post={post} 
          onClose={() => setShowDetails(false)} 
        />
      )}
    </div>
  );
};

export default ProductCard;