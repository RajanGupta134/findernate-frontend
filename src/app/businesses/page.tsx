"use client";

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import LocationInput from "@/components/ui/LocationInput";
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';
//import FloatingHeader from '@/components/FloatingHeader';
import { getExploreFeed } from '@/api/exploreFeed';
import { transformExploreFeedToFeedPost } from '@/utils/transformExploreFeed';
import { FeedPost } from '@/types';
import { getCommentsByPost, Comment } from '@/api/comment';

const BusinessesPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedPrice, setSelectedPrice] = useState("");
  const [sortBy, setSortBy] = useState("likes");
  const [businesses, setBusinesses] = useState<FeedPost[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const categories = [
    "Retail & Shopping",
    "Food & Dining", 
    "Health & Wellness",
    "Professional Services",
    "Entertainment & Recreation",
    "Automotive",
    "Home & Garden",
    "Technology"
  ];

  // Remove static locations array - using LocationInput component with API

  const priceOptions = [
    { value: '', label: 'All Prices' },
    { value: '0-5000', label: 'Under ₹5,000' },
    { value: '5000-25000', label: '₹5,000 - ₹25,000' },
    { value: '25000-50000', label: '₹25,000 - ₹50,000' },
    { value: '50000-100000', label: '₹50,000 - ₹1,00,000' },
    { value: '100000+', label: 'Above ₹1,00,000' },
  ];

  const sortOptions = [
    { value: 'likes', label: 'Most Liked' },
    { value: 'views', label: 'Most Viewed' },
    { value: 'engagement', label: 'Most Engaging' },
    { value: 'time', label: 'Recently Added' },
  ];

  const getPriceLabel = (value: string) => (priceOptions.find(o => o.value === value)?.label || 'All Prices');
  const getSortLabel = (value: string) => (sortOptions.find(o => o.value === value)?.label || 'Sort');

  const closeAllDropdowns = () => {
    setCategoryDropdownOpen(false);
    setPriceDropdownOpen(false);
    setSortDropdownOpen(false);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedLocation("");
    setSelectedPrice("");
    setSortBy("time"); // Reset to default sort
  };

  const fetchBusinesses = async (pageNum: number = 1, reset: boolean = false) => {
    setLoading(true);
    try {
      const response = await getExploreFeed({
        page: pageNum,
        limit: 20, // Fetch more data for better filtering
        types: 'business',
        sortBy: 'time' // Use consistent sorting for base data
      });
      
      const transformedData = transformExploreFeedToFeedPost(response.data.feed);
      
      //console.log('Transformed business data:', transformedData.slice(0, 2));
      
      // Fetch comments for all business posts
      const businessesWithComments = await Promise.all(
        transformedData.map(async (business) => {
          try {
            //console.log(`Fetching comments for business: ${business._id}`);
            const commentsResponse = await getCommentsByPost(business._id, 1, 5); // Fetch first 5 comments
            //console.log(`Comments response for business ${business._id}:`, commentsResponse);
            
            // Handle different possible response structures
            let comments: Comment[] = [];
            let totalComments = 0;
            
            if (commentsResponse) {
              // Check if response has comments array directly
              if (Array.isArray(commentsResponse.comments)) {
                comments = commentsResponse.comments;
                totalComments = commentsResponse.totalComments || commentsResponse.total || comments.length;
              } else if (Array.isArray(commentsResponse)) {
                // If response is directly an array
                comments = commentsResponse;
                totalComments = comments.length;
              } else {
                //console.log('Unexpected comments response structure:', commentsResponse);
              }
            }
            
            //console.log(`Processed ${comments.length} comments for business ${business._id}, total: ${totalComments}`);
            
            return {
              ...business,
              comments: comments,
              // Update engagement comments count with actual comment count
              engagement: {
                ...business.engagement,
                comments: totalComments || business.engagement.comments,
              },
            };
          } catch (error) {
            console.error(`Failed to fetch comments for business ${business._id}:`, error);
            return business; // Return business without comments if fetch fails
          }
        })
      );
      
      if (reset) {
        setAllBusinesses(businessesWithComments);
        setBusinesses(businessesWithComments);
      } else {
        const newAllBusinesses = [...allBusinesses, ...businessesWithComments];
        setAllBusinesses(newAllBusinesses);
        setBusinesses(newAllBusinesses);
      }
      
      setHasNextPage(response.data.pagination.hasNextPage);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data only once on component mount
  useEffect(() => {
    fetchBusinesses(1, true);
    setPage(1);
  }, []);

  // Apply filters whenever filter criteria or data changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCategory, selectedLocation, selectedPrice, sortBy, allBusinesses]);

  const applyFilters = () => {
    let filtered = [...allBusinesses];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(business => 
        business.caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(business => 
        business.tags.some(tag => tag.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        business.contentType.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Apply location filter
    if (selectedLocation) {
      filtered = filtered.filter(business => {
        if (!business.location) return false;
        
        // Handle both string and object location types
        const locationName = typeof business.location === 'string' 
          ? business.location 
          : business.location.name;
          
        return locationName?.toLowerCase().includes(selectedLocation.toLowerCase());
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'likes':
        filtered.sort((a, b) => b.engagement.likes - a.engagement.likes);
        break;
      case 'views':
        filtered.sort((a, b) => b.engagement.views - a.engagement.views);
        break;
      case 'engagement':
        filtered.sort((a, b) => 
          (b.engagement.likes + b.engagement.comments + b.engagement.shares) - 
          (a.engagement.likes + a.engagement.comments + a.engagement.shares)
        );
        break;
      case 'time':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        break;
    }

    setBusinesses(filtered);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchBusinesses(nextPage, false);
    }
  };

  // Use businesses state directly as it's already filtered
  const filteredBusinesses = businesses;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* FloatingHeader */}
        {/*<FloatingHeader
          paragraph="Discover local businesses and services in your area"
          heading="Businesses"
          username="user"
          accountBadge={false}
          showCreateButton={true}
          onCreateClick={() => setShowCreatePostModal(true)}
        />

        {/* Search and Filters Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm mb-6">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search businesses, providers, or keywords..."
              className="w-full pl-10 pr-4 text-black py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Category Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setCategoryDropdownOpen(v => !v);
                  setPriceDropdownOpen(false);
                  setSortDropdownOpen(false);
                }}
                className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="truncate">{selectedCategory || 'All Categories'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {categoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setSelectedCategory(''); setCategoryDropdownOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${selectedCategory === '' ? 'bg-yellow-50 text-yellow-800' : 'text-gray-700'}`}
                  >
                    All Categories
                  </button>
                  {categories.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => { setSelectedCategory(category); setCategoryDropdownOpen(false); }}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${selectedCategory === category ? 'bg-yellow-50 text-yellow-800' : 'text-gray-700'}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location Input with API */}
            <LocationInput
              selectedLocation={selectedLocation || "All Locations"}
              onLocationSelect={(location) => setSelectedLocation(location === "All Locations" ? "" : location)}
              placeholder="Search location..."
              className="w-full"
            />

            {/* Price Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPriceDropdownOpen(v => !v);
                  setCategoryDropdownOpen(false);
                  setSortDropdownOpen(false);
                }}
                className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="truncate">{getPriceLabel(selectedPrice)}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${priceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {priceDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                  {priceOptions.map(opt => (
                    <button
                      key={opt.value || 'all'}
                      type="button"
                      onClick={() => { setSelectedPrice(opt.value); setPriceDropdownOpen(false); }}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${selectedPrice === opt.value ? 'bg-yellow-50 text-yellow-800' : 'text-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSortDropdownOpen(v => !v);
                  setCategoryDropdownOpen(false);
                  setPriceDropdownOpen(false);
                }}
                className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="truncate">{getSortLabel(sortBy)}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setSortBy(opt.value); setSortDropdownOpen(false); }}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${sortBy === opt.value ? 'bg-yellow-50 text-yellow-800' : 'text-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Clear Filters
            </button>
          </div>

          {(categoryDropdownOpen || priceDropdownOpen || sortDropdownOpen) && (
            <div className="fixed inset-0 z-40" onClick={closeAllDropdowns} />
          )}
        </div>
      </div>

      {/* Businesses Content - Constrained Width, Centered */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Businesses Grid */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">All Businesses</h2>
          <span className="text-sm text-gray-500">
            {filteredBusinesses.length} businesses found
          </span>
        </div>

        {loading && businesses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <p className="text-gray-600">Loading businesses...</p>
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Businesses Found
            </h2>
            <p className="text-gray-600">
              Try adjusting your search criteria or check back later.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-8">
              {filteredBusinesses.map((business) => (
                <div key={business._id} className="w-full">
                  <PostCard post={business} />
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Loading..." : "Load More Businesses"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Create Post Modal */}
      {showCreatePostModal && (
        <CreatePostModal closeModal={() => setShowCreatePostModal(false)} />
      )}
    </div>
  );
};

export default BusinessesPage;
