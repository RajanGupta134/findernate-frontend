"use client";

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import LocationInput from "@/components/ui/LocationInput";
import PostCard from '@/components/PostCard';
//import FloatingHeader from '@/components/FloatingHeader';
import { getExploreFeed } from '@/api/exploreFeed';
import { transformExploreFeedToFeedPost } from '@/utils/transformExploreFeed';
import { searchAllContent } from '@/api/search';
import { FeedPost } from '@/types';
import CreatePostModal from '@/components/CreatePostModal';
import { getCommentsByPost, Comment } from '@/api/comment';

const ProductsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedPrice, setSelectedPrice] = useState("");
  const [sortBy, setSortBy] = useState("likes");
  const [products, setProducts] = useState<FeedPost[]>([]);
  const [allProducts, setAllProducts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showCreatePostModal, setCreatePostModal] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    "Electronics",
    "Fashion & Apparel", 
    "Home & Kitchen",
    "Books & Stationery",
    "Sports & Fitness",
    "Beauty & Personal Care",
    "Toys & Games",
    "Food & Beverages"
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
    setIsSearchMode(false);
  };

  const fetchProducts = async (pageNum: number = 1, reset: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      console.log('📦 [Products Page] Fetching products with filter: types=product');
      const response = await getExploreFeed({
        page: pageNum,
        limit: 20, // Fetch more data for better filtering
        types: 'product',
        sortBy: 'time' // Use consistent sorting for base data
      });

      console.log('📦 [Products Page] Backend response:', {
        totalItems: response.data.feed.length,
        postsCount: response.data.pagination.postsCount,
        sampleContentTypes: response.data.feed.slice(0, 3).map(item => ({
          id: item._id?.slice(-6),
          contentType: item.contentType
        }))
      });

      let transformedData = transformExploreFeedToFeedPost(response.data.feed);

      // Check if backend actually returned product posts
      const productPostsFromBackend = transformedData.filter(p =>
        p.contentType === 'product' ||
        p.contentType === 'Product' ||
        !!p.customization?.product
      );

      console.log(`📦 [Products Page] Backend returned ${productPostsFromBackend.length} actual product posts out of ${transformedData.length} total posts`);

      // ALWAYS USE FALLBACK: Backend filtering is broken, fetch all posts and filter on frontend
      if (pageNum === 1) {
        console.warn('⚠️ [Products Page] Using fallback: Fetching all posts and filtering by contentType on frontend');
        const fallbackResponse = await getExploreFeed({
          page: 1,
          limit: 50,
          types: 'all',
          sortBy: 'time'
        });

        console.log('📦 [Products Page] Fallback response:', {
          totalItems: fallbackResponse.data.feed.length,
          contentTypes: fallbackResponse.data.feed.reduce((acc, item) => {
            const type = item.contentType || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        });

        const allTransformed = transformExploreFeedToFeedPost(fallbackResponse.data.feed);

        // Filter for product posts on frontend
        transformedData = allTransformed.filter(post => {
          const isProduct = post.contentType === 'product' ||
                           post.contentType === 'Product' ||
                           post.postType === 'product' ||
                           !!post.customization?.product;

          if (isProduct) {
            console.log('✅ [Products Page] Found product post via fallback:', {
              id: post._id.slice(-6),
              contentType: post.contentType,
              caption: post.caption?.slice(0, 30)
            });
          }
          return isProduct;
        });

        console.log(`📦 [Products Page] Fallback filtering found ${transformedData.length} product posts`);
      }

      // Normalize / enrich product posts to guarantee PostCard requirements
      transformedData = transformedData.map(post => {
        // Fallback caption
        const productName = post.customization?.product?.name;
        const description = post.description || '';
        const captionFallback = post.caption || description || productName || 'Product Post';

        // Ensure media present (PostCard returns null without media)
        const hasValidMedia = Array.isArray(post.media) && post.media.some(m => (m.url || '').trim().length > 0);
        const media = hasValidMedia ? post.media : [{ type: 'image', url: '/placeholderimg.png' } as any];

        // Location fallback from customization.product.location
        const location = post.location || post.customization?.product?.location || null;

        // Tags fallback (merge existing + category if missing)
        const productCategory = post.customization?.product?.name;
        let tags = post.tags || post.hashtags || [];
        if (productCategory && !tags.includes(productCategory)) tags = [...tags, productCategory];

        return {
          ...post,
          caption: captionFallback,
          description: description,
          username: post.username || post.userId?.username || 'Unknown User',
          profileImageUrl: post.profileImageUrl || post.userId?.profileImageUrl || '/placeholderimg.png',
          media,
          location,
          tags
        };
      });

      //console.log('Transformed product data:', transformedData.slice(0, 2));

      // Fetch comments for all product posts
      const productsWithComments = await Promise.all(
        transformedData.map(async (product) => {
          try {
            //console.log(`Fetching comments for product: ${product._id}`);
            const commentsResponse = await getCommentsByPost(product._id, 1, 5); // Fetch first 5 comments
            //console.log(`Comments response for product ${product._id}:`, commentsResponse);
            
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
            
            //console.log(`Processed ${comments.length} comments for product ${product._id}, total: ${totalComments}`);
            
            return {
              ...product,
              comments: comments,
              // Update engagement comments count with actual comment count
              engagement: {
                ...product.engagement,
                comments: totalComments || product.engagement.comments,
              },
            };
          } catch (error) {
            console.error(`Failed to fetch comments for product ${product._id}:`, error);
            return product; // Return product without comments if fetch fails
          }
        })
      );
      
      if (reset) {
        setAllProducts(productsWithComments);
        setProducts(productsWithComments);
      } else {
        const newAllProducts = [...allProducts, ...productsWithComments];
        setAllProducts(newAllProducts);
        setProducts(newAllProducts);
      }
      
      setHasNextPage(response.data.pagination.hasNextPage);
    } catch (error: any) {
      console.error('Failed to fetch products:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load products';
      setError(errorMessage);

      // If this was the initial load and it failed, keep the page usable
      if (reset) {
        setProducts([]);
        setAllProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data only once on component mount
  useEffect(() => {
    fetchProducts(1, true);
    setPage(1);
  }, []);

  // Handle search functionality
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setIsSearchMode(false);
      return;
    }

    try {
      setLoading(true);
      setIsSearchMode(true);
      
      const response = await searchAllContent(
        searchTerm,
        selectedLocation || undefined,
        20,
        "product", // Default to product content type
        undefined,
        undefined,
        undefined
      );

      const flattenedResults = response.data.results.map((post) => ({
        ...post,
        username: post.userId?.username,
        profileImageUrl: post.userId?.profileImageUrl,
      }));

      // Normalize search results similar to fetchProducts
      const normalizedSearchResults = flattenedResults.map((post) => {
        const productName = post.customization?.product?.name;
        const description = post.description || '';
        const captionFallback = post.caption || description || productName || 'Product';
        const hasValidMedia = Array.isArray(post.media) && post.media.some(m => (m.url || '').trim().length > 0);
        const media = hasValidMedia ? post.media : [{ type: 'image', url: '/placeholderimg.png' }];
        const location = post.location || post.customization?.product?.location || null;
        const productCategory = post.customization?.product?.name;
        let tags = post.tags || [];
        if (productCategory && !tags.includes(productCategory)) tags = [...tags, productCategory];
        return { ...post, caption: captionFallback, media, location, tags };
      });

      //console.log('Product search results:', normalizedSearchResults.slice(0, 2));

      // Fetch comments for search results
      const searchResultsWithComments = await Promise.all(
        normalizedSearchResults.map(async (product) => {
          try {
            //console.log(`Fetching comments for search result product: ${product._id}`);
            const commentsResponse = await getCommentsByPost(product._id, 1, 5);
            //console.log(`Comments response for search product ${product._id}:`, commentsResponse);
            
            // Handle different possible response structures
            let comments: Comment[] = [];
            let totalComments = 0;
            
            if (commentsResponse) {
              if (Array.isArray(commentsResponse.comments)) {
                comments = commentsResponse.comments;
                totalComments = commentsResponse.totalComments || commentsResponse.total || comments.length;
              } else if (Array.isArray(commentsResponse)) {
                comments = commentsResponse;
                totalComments = comments.length;
              } else {
                //console.log('Unexpected search comments response structure:', commentsResponse);
              }
            }
            
            //console.log(`Processed ${comments.length} comments for search product ${product._id}, total: ${totalComments}`);
            
            return {
              ...product,
              comments: comments,
              // Update engagement comments count with actual comment count
              engagement: {
                ...product.engagement,
                comments: totalComments || product.engagement?.comments || 0,
              },
            };
          } catch (error) {
            console.error(`Failed to fetch comments for search product ${product._id}:`, error);
            return product;
          }
        })
      );
      
      setProducts(searchResultsWithComments);
    } catch (error) {
      console.error('Search error:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters whenever filter criteria or data changes
  useEffect(() => {
    if (isSearchMode) return; // Don't apply local filters in search mode
    applyFilters();
  }, [searchTerm, selectedCategory, selectedLocation, selectedPrice, sortBy, allProducts, isSearchMode]);

  // Auto-trigger search when search term changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        setIsSearchMode(false);
        applyFilters();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedLocation]);

  const applyFilters = () => {
    // Filter out products with missing essential data
    let filtered = allProducts.filter(product => 
      product && 
      product._id && 
      product.media && 
      product.media.length > 0
    );

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(product => 
        (product.caption || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.username || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        (product.tags || []).some(tag => tag.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        (product.contentType || '').toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Apply location filter
    if (selectedLocation) {
      filtered = filtered.filter(product => {
        if (!product.location) return false;
        
        // Handle both string and object location types
        const locationName = typeof product.location === 'string' 
          ? product.location 
          : product.location.name;
          
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

    setProducts(filtered);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, false);
    }
  };

  // Use products state directly as it's already filtered
  const filteredProducts = products;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        {/* FloatingHeader */}
        {/*<FloatingHeader
          paragraph="Discover amazing products from local sellers and businesses"
          heading="Products"
          username="user"
          accountBadge={false}
          showCreateButton={true}
          onCreateClick={() => {setCreatePostModal(true)}}
        />

        {/* Search and Filters Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm mb-6">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products, providers, or keywords..."
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

      {/* Products Content - Constrained Width, Centered */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Products Grid */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">All Products</h2>
          <span className="text-sm text-gray-500">
            {filteredProducts.length} products found
          </span>
        </div>

        {error && !loading && products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Failed to Load Products
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchProducts(1, true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : loading && products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Products Found
            </h2>
            <p className="text-gray-600">
              Try adjusting your search criteria or check back later.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-8">
              {filteredProducts.map((product) => (
                <div key={product._id} className="w-full">
                  <PostCard post={product} />
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
                  {loading ? "Loading..." : "Load More Products"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
        {/* Create Post Modal */}
      {showCreatePostModal && (
        <CreatePostModal closeModal={() => setCreatePostModal(false)} />
      )}
    </div>
  );
};

export default ProductsPage;
