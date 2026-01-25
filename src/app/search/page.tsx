"use client";

import SearchBar from "@/components/ui/SearchBar";
import LocationInput from "@/components/ui/LocationInput";
import { useEffect, useState, Suspense, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Users,
  Hash,
  Package,
  Building,
  Wrench,
  ChevronDown,
  Plus,
  Calendar,
  Image,
  Film,
  Clapperboard,
  X,
} from "lucide-react";
//import FloatingHeader from "@/components/FloatingHeader";
import { searchAllContent, searchUsers } from "@/api/search";
import { FeedPost, SearchUser } from "@/types";
import UserCard from "@/components/UserCard";
import TrendingTopics from "@/components/TrendingTopics";
import TrendingBusiness from "@/components/TrendingBusiness";
import PostCard from "@/components/PostCard";
// import { Button } from "@/components/ui/button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ImageModal from "@/components/ImageModal";
import { getCommentsByPost, Comment } from "@/api/comment";
import { getFollowing } from "@/api/user";
import { useUserStore } from "@/store/useUserStore";

// Search component that uses useSearchParams
function SearchContent() {
  const searchParams = useSearchParams();
  const { user: currentUser } = useUserStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayQuery, setDisplayQuery] = useState("");
  const [isDefaultSearch, setIsDefaultSearch] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [contentTypeDropdownOpen, setContentTypeDropdownOpen] = useState(false);
  const [postTypeDropdownOpen, setPostTypeDropdownOpen] = useState(false);
  const [results, setResults] = useState<FeedPost[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);
  const [selectedPostType, setSelectedPostType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentCoordinates, setCurrentCoordinates] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [followingList, setFollowingList] = useState<string[]>([]);

  const tabs = [
    { id: "All", label: "All", icon: Search },
    { id: "Users", label: "Users", icon: Users },
    { id: "Posts", label: "Posts", icon: Hash },
  ];

  const contentTypes = [
    { id: "all", label: "All", icon: Search },
    { id: "normal", label: "Normal", icon: Hash },
    { id: "product", label: "Product", icon: Package },
    { id: "service", label: "Service", icon: Wrench },
    { id: "business", label: "Business", icon: Building },
  ];

  const postTypes = [
    { id: "image", label: "Image", icon: Image },
    { id: "video", label: "Video", icon: Film },
    { id: "reel", label: "Reel", icon: Clapperboard },
  ];

  // Remove the static locations array - now using LocationInput component with API

  // const getCurrentLocation = () => {
  //   if (navigator.geolocation) {
  //     setLoading(true);
  //     navigator.geolocation.getCurrentPosition(
  //       (position) => {
  //         const { latitude, longitude } = position.coords;
  //         setCurrentCoordinates(`${longitude}|${latitude}`);
  //         setUseCurrentLocation(true);
  //         setSelectedLocation("Current Location");
  //         setLoading(false);
  //       },
  //       (error) => {
  //         console.error("Error getting location:", error);
  //         setError("Unable to get your current location. Please allow location access.");
  //         setLoading(false);
  //       }
  //     );
  //   } else {
  //     setError("Geolocation is not supported by this browser.");
  //   }
  // };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location === "All Locations" ? "" : location);
    setUseCurrentLocation(false);
    setCurrentCoordinates(null);
  };

  // Fetch current user's following list on mount
  useEffect(() => {
    const fetchFollowingList = async () => {
      if (currentUser?._id) {
        try {
          const followingData = await getFollowing(currentUser._id);
          console.log('📥 Raw API response from getFollowing:', followingData);
          // Extract user IDs from following data
          const followingIds = followingData.map((user: any) => user._id || user);
          console.log('📥 Extracted following IDs:', followingIds);
          setFollowingList(followingIds);
        } catch (error) {
          console.error('Failed to fetch following list:', error);
          setFollowingList([]);
        }
      } else {
        // If no current user, set empty list to unblock searches
        console.log('📥 No current user, setting empty followingList');
        setFollowingList([]);
      }
    };

    fetchFollowingList();
  }, [currentUser?._id]);

  // Focus search input on component mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Helper function to enrich users with correct isFollowing state
  const enrichUsersWithFollowingState = (users: SearchUser[]): SearchUser[] => {
    return users.map((user, idx) => {
      console.log(`🔧 Enriching user ${idx}:`, {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        entireUserObject: user
      });
      return {
        ...user,
        isFollowing: followingList.includes(user._id)
      };
    });
  };

  const handleContentTypeSelect = (type: string) => {
    if (type === "all") {
      setSelectedContentType(null);
    } else {
      setSelectedContentType(type === selectedContentType ? null : type);
    }
    setContentTypeDropdownOpen(false);
  };

  const handlePostTypeSelect = (type: string) => {
    setSelectedPostType(type === selectedPostType ? null : type);
    setPostTypeDropdownOpen(false);
  };

  const clearAllFilters = () => {
    setSelectedLocation("");
    setSelectedContentType(null);
    setSelectedPostType(null);
    setStartDate(null);
    setEndDate(null);
    setActiveTab("All");
    setUseCurrentLocation(false);
    setCurrentCoordinates(null);
    setSearchRadius(5);
  };

  const hasActiveFilters = () => {
    return (
      selectedLocation !== "" || // Updated to match new empty string pattern
      selectedContentType !== null ||
      selectedPostType !== null ||
      startDate !== null ||
      endDate !== null ||
      activeTab !== "All" ||
      useCurrentLocation ||
      searchRadius !== 5
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setResults([]);
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const locationParam = !useCurrentLocation && selectedLocation !== "" 
        ? selectedLocation.split(',')[0].toLowerCase().trim() // Extract city name and lowercase it
        : undefined;

      // Map UI post type to API-accepted value (image -> photo)
      const apiPostType = selectedPostType === 'image' ? 'photo' : selectedPostType || undefined;

      const response = await searchAllContent(
        searchQuery,
        locationParam,
        10,
        selectedContentType === "all" ? undefined : selectedContentType || undefined,
        apiPostType,
        startDate ? startDate.toISOString().split('T')[0] : undefined,
        endDate ? endDate.toISOString().split('T')[0] : undefined,
        useCurrentLocation && currentCoordinates ? searchRadius : undefined,
        useCurrentLocation && currentCoordinates ? currentCoordinates : undefined
      );
      //console.log("Search params:", {
      //  query: searchQuery,
      //  location: locationParam,
      //  contentType: selectedContentType === "all" ? undefined : selectedContentType || undefined,
      //  postType: selectedPostType || undefined,
      //  useCurrentLocation,
      //  coordinates: currentCoordinates,
      //  radius: searchRadius
      // });
      
      console.log("🌐 API response from searchAllContent:", {
        resultsCount: response.data.results?.length,
        usersCount: response.data.users?.length,
        users: response.data.users
      });

      let filteredResults = response.data.results || [];
      let filteredUsers = response.data.users || [];

      console.log('🌐 filteredUsers from API (before normalization):', filteredUsers);
      console.log('🔍 BADGE CHECK - User data:', filteredUsers.map((u: any) => ({
        username: u.username,
        subscriptionBadge: u.subscriptionBadge,
        allKeys: Object.keys(u)
      })));
      
      // Normalize Mongoose documents to plain objects (extract from _doc if present)
      filteredUsers = filteredUsers.map((user: any) => {
        if (user._doc) {
          // Mongoose document structure - extract actual data from _doc
          return { ...user._doc };
        }
        return user;
      });

      console.log('🌐 filteredUsers after normalization:', filteredUsers);
      console.log('🔍 BADGE CHECK - After normalization:', filteredUsers.map((u: any) => ({
        username: u.username,
        subscriptionBadge: u.subscriptionBadge,
        allKeys: Object.keys(u)
      })));

      // Client-side location filtering for posts if not using current location
      if (!useCurrentLocation && selectedLocation !== "") {
        //console.log("Applying client-side location filtering for:", selectedLocation);
        
        filteredResults = filteredResults.filter((post) => {
          // Check if post has location in customization for different content types
          const postLocation = post.customization?.normal?.location?.name || 
                               post.customization?.product?.location?.name ||
                               post.customization?.service?.location?.name ||
                               post.customization?.business?.location?.name;
          
          if (postLocation) {
            // Normalize location names for comparison
            const normalizedPostLocation = postLocation.toLowerCase().trim();
            const normalizedSelectedLocation = selectedLocation.toLowerCase().trim();
            const selectedCity = selectedLocation.split(',')[0].toLowerCase().trim();
            
            //console.log("Comparing post location:", normalizedPostLocation, "with selected:", normalizedSelectedLocation);
            
            // Check for various matching patterns
            const isMatch = normalizedPostLocation.includes(selectedCity) ||
                           normalizedSelectedLocation.includes(normalizedPostLocation) ||
                           normalizedPostLocation === normalizedSelectedLocation ||
                           normalizedPostLocation.includes(normalizedSelectedLocation) ||
                           selectedCity === normalizedPostLocation;
            
            return isMatch;
          }
          
          // If post doesn't have location data, exclude it when location filter is applied
          return false;
        });

        // Filter users by location as well
        filteredUsers = filteredUsers.filter((user) => {
          if (user.location) {
            const normalizedUserLocation = user.location.toLowerCase().trim();
            const normalizedSelectedLocation = selectedLocation.toLowerCase().trim();
            const selectedCity = selectedLocation.split(',')[0].toLowerCase().trim();
            
            //console.log("Comparing user location:", normalizedUserLocation, "with selected:", normalizedSelectedLocation);
            
            const isMatch = normalizedUserLocation.includes(selectedCity) ||
                           normalizedSelectedLocation.includes(normalizedUserLocation) ||
                           normalizedUserLocation === normalizedSelectedLocation ||
                           selectedCity === normalizedUserLocation;
            
            return isMatch;
          }
          
          // If user doesn't have location data, exclude them when location filter is applied
          return false;
        });
        
        //console.log("Filtered results:", filteredResults.length, "posts,", filteredUsers.length, "users");
      }

      const flattenedResults = filteredResults.map((post) => ({
        ...post,
        username: post.userId?.username,
        profileImageUrl: post.userId?.profileImageUrl,
        tags: post.customization?.normal?.tags || 
              post.customization?.service?.tags || 
              post.customization?.product?.tags || 
              post.customization?.business?.tags || 
              post.tags || 
              [],
      }));
      
      // Fetch comments for all posts to get accurate comment counts
      const postsWithComments = await Promise.all(
        flattenedResults.map(async (post) => {
          try {
            //console.log(`Fetching comments for post: ${post._id}`);
            const commentsResponse = await getCommentsByPost(post._id, 1, 5); // Fetch first 5 comments
            //console.log(`Comments response for post ${post._id}:`, commentsResponse);
            
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
            
            //console.log(`Processed ${comments.length} comments for post ${post._id}, total: ${totalComments}`);
            
            return {
              ...post,
              comments: comments,
              // Update engagement comments count with actual comment count
              engagement: {
                ...post.engagement,
                comments: totalComments || post.engagement.comments,
              },
            };
          } catch (error) {
            console.error(`Failed to fetch comments for post ${post._id}:`, error);
            return post; // Return post without comments if fetch fails
          }
        })
      );
      
      setResults(postsWithComments);
      // Don't set users if this is the default search
      if (!isDefaultSearch) {
        // Set raw users - enrichment will happen in useMemo
        console.log('🔍 handleSearch: Setting raw users for ALL tab. Count:', filteredUsers.length);
        filteredUsers.forEach((u, i) => {
          console.log(`  User ${i}:`, {
            _id: u._id,
            username: u.username,
            fullName: u.fullName,
            isFollowing: u.isFollowing
          });
        });
        setUsers(filteredUsers);
      } else {
        console.log('🔍 handleSearch: Default search - clearing users');
        setUsers([]);
      }
      setShowAllUsers(false);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to fetch results. Please try again.");
      setResults([]);
      setUsers([]);
    } finally {
      setLoading(false);
      // Maintain focus on search input after search completes
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

  const handleUserSearch = async () => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await searchUsers(searchQuery);
      const rawUsers = response.data.users || response.data || [];
      // Set raw users - enrichment will happen in useMemo
      console.log('👥 handleUserSearch: Setting raw users for USERS tab. Count:', rawUsers.length);
      rawUsers.forEach((u: any, i: number) => {
        console.log(`  User ${i}:`, {
          _id: u._id,
          username: u.username,
          fullName: u.fullName,
          isFollowing: u.isFollowing
        });
      });
      setUsers(rawUsers);
      setResults([]);
      setShowAllUsers(false);
    } catch (err) {
      console.error("Error searching users:", err);
      setError("Failed to fetch users. Please try again.");
      setUsers([]);
    } finally {
      setLoading(false);
      // Maintain focus on search input after search completes
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

  // Set search query from URL params on mount, or default to "a"
  useEffect(() => {
    const queryFromUrl = searchParams.get('q');
    if (queryFromUrl) {
      const decodedQuery = decodeURIComponent(queryFromUrl);
      setSearchQuery(decodedQuery);
      setDisplayQuery(decodedQuery);
      setIsDefaultSearch(false);
    } else {
      // Set default search query to "a" when page mounts, but don't show it in search bar
      setSearchQuery("a");
      setDisplayQuery("");
      setIsDefaultSearch(true);
    }
  }, [searchParams]);

  // Auto-trigger search when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        if (activeTab === "Users") {
          handleUserSearch();
        } else {
          handleSearch();
        }
      } else {
        setResults([]);
        setUsers([]);
      }
    }, 500); // Increased debounce delay to 500ms

    return () => clearTimeout(timer);
  }, [
    searchQuery,
    activeTab,
    selectedLocation,
    selectedContentType,
    selectedPostType,
    startDate,
    endDate,
    useCurrentLocation,
    currentCoordinates,
    searchRadius
  ]);

  // Always enrich users with latest following state before displaying
  const enrichedUsersForDisplay = useMemo(() => {
    console.log('🔄 MEMO START: FollowingList:', followingList);
    console.log('🔄 MEMO START: Users array length:', users.length);
    users.forEach((u, i) => console.log(`  Raw user ${i}:`, u));
    
    const enriched = enrichUsersWithFollowingState(users);
    
    console.log('🔄 MEMO END: Enriched users:', enriched);
    enriched.forEach(u => {
      console.log(`  ✅ User ${u.username} (${u._id}): isFollowing=${u.isFollowing}`);
    });
    return enriched;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, followingList]);

  const displayedUsers = showAllUsers ? enrichedUsersForDisplay : enrichedUsersForDisplay.slice(0, 2);
  const hasMoreUsers = users.length > 2;

  // Handler for trending search click
  const handleTrendingClick = (term: string) => {
    setSearchQuery(term);
  };

  const handlePostClick = (post: FeedPost) => {
    setSelectedPost(post);
    setShowImageModal(true);
  };

  // Handler for syncing followingList after UserCard performs follow action
  const handleFollowUpdate = (userId: string) => {
    console.log('📍 FOLLOW UPDATE called for userId:', userId);
    
    // Optimistically update followingList immediately for instant UI response
    setFollowingList(prev => {
      const isCurrentlyFollowing = prev.includes(userId);
      const updated = isCurrentlyFollowing 
        ? prev.filter(id => id !== userId)  // Remove if unfollowing
        : [...prev, userId];                 // Add if following
      
      console.log('📍 Optimistic followingList update:', {
        userId,
        wasFollowing: isCurrentlyFollowing,
        nowFollowing: !isCurrentlyFollowing,
        updatedList: updated
      });
      
      return updated;
    });
    
    // Then refresh from API in background to confirm (in case of conflicts)
    setTimeout(async () => {
      if (currentUser?._id) {
        try {
          const followingData = await getFollowing(currentUser._id);
          const followingIds = followingData.map((user: any) => user._id || user);
          console.log('📍 Confirmed followingList from API:', followingIds);
          setFollowingList(followingIds);
        } catch (error) {
          console.error('Failed to refresh following list:', error);
        }
      }
    }, 500); // Small delay to let the API update complete
  };

  return (
    <>
      <div className="min-h-screen flex flex-col gap-10 hide-scrollbar">
        <div className="flex-1 xl:pr-[23rem] px-4 xl:px-0">
          <div className="w-full xl:ml-4">
            {/* <div className="[&>*]:!max-w-full [&>*]:xl:!max-w-[54rem]">
              <FloatingHeader
                paragraph="Discover businesses, products, services, and more"
                heading="Search"
                username="John Doe"
                width="w-full"
                accountBadge={true}
              />
            </div> */}

            <div className="w-full relative [&>*]:!max-w-full [&>*]:xl:!max-w-[54rem] mt-5">
              <SearchBar
                ref={searchInputRef}
                value={displayQuery}
                placeholder="Search businesses, products, services..."
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  setDisplayQuery(value);
                  setSearchQuery(value);
                  setIsDefaultSearch(false);
                }}
              />
              {/* Loading indicator that doesn't block input */}
              {loading && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-500 border-t-transparent"></div>
                </div>
              )}
              {/* <Button
                variant="custom"
                onClick={activeTab === "Users" ? handleUserSearch : handleSearch}
                disabled={!searchQuery.trim() || loading}
                className="absolute right-10 top-1/2 -translate-y-1/2 bg-button-gradient cursor-pointer disabled:bg-gray-300 text-black px-6 py-4 rounded-xl transition-colors flex items-center"
              >
                {loading ? "Searching..." : "Search"}
              </Button> */}
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters() && (
              <div className="flex justify-start mt-4">
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#cc9b2e] transition-colors"
                >
                  <X size={16} />
                  Clear all filters
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-6 mt-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-[#fefdf5] text-[#b8871f] border-[#e6c045]"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Advanced Search Filters */}
            <div className="flex flex-wrap gap-4 xl:gap-3 mb-8">
              {/* Location Input with API */}
              <LocationInput
                selectedLocation={selectedLocation || "All Locations"}
                onLocationSelect={handleLocationSelect}
                placeholder="Search location..."
                className="w-56 xl:w-52"
                disabled={loading}
              />

              {/* Radius Slider - Only show when using current location */}
              {/* {useCurrentLocation && (
                <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 min-w-[200px]">
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Radius:</span>
                  <div className="flex-1 flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="200"
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(Number(e.target.value))}
                      disabled={loading}
                      className={`flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      style={{
                        background: `linear-gradient(to right, #eab308 0%, #eab308 ${((searchRadius - 1) / 199) * 100}%, #e5e7eb ${((searchRadius - 1) / 199) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <span className="text-sm font-medium text-gray-900 min-w-[40px] text-right">{searchRadius} km</span>
                  </div>
                </div>
              */}

              {/* Content Type Dropdown */}
              {activeTab !== "Users" && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setContentTypeDropdownOpen(!contentTypeDropdownOpen);
                      setPostTypeDropdownOpen(false);
                    }}
                    disabled={loading}
                    className={`flex items-center justify-between w-44 xl:w-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span className="truncate">
                      {selectedContentType 
                        ? contentTypes.find(t => t.id === selectedContentType)?.label || "All" 
                        : "All"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        contentTypeDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {contentTypeDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                      {contentTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => handleContentTypeSelect(type.id)}
                          className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                            (type.id === "all" && selectedContentType === null) || selectedContentType === type.id
                              ? "bg-[#fefdf5] text-[#b8871f]"
                              : "text-gray-700"
                          }`}
                        >
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Post Type Dropdown */}
              {activeTab !== "Users" && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setPostTypeDropdownOpen(!postTypeDropdownOpen);
                      setContentTypeDropdownOpen(false);
                    }}
                    disabled={loading}
                    className={`flex items-center justify-between w-44 xl:w-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span className="truncate">
                      {selectedPostType 
                        ? postTypes.find(t => t.id === selectedPostType)?.label || "Post Type" 
                        : "Post Type"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        postTypeDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {postTypeDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                      {postTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => handlePostTypeSelect(type.id)}
                          className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                            selectedPostType === type.id
                              ? "bg-[#fefdf5] text-[#b8871f]"
                              : "text-gray-700"
                          }`}
                        >
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Date Range Picker */}
              <div className={`flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}>
                <Calendar className="w-4 h-4 text-gray-500" />
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  placeholderText="Start Date"
                  className="w-28 xl:w-24 bg-transparent text-sm focus:outline-none text-black"
                  disabled={loading}
                />
                <span className="text-gray-400">to</span>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate || undefined}
                  placeholderText="End Date"
                  className="w-28 xl:w-24 bg-transparent text-sm focus:outline-none text-black"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Click outside to close dropdowns */}
            {(contentTypeDropdownOpen || postTypeDropdownOpen) && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  setContentTypeDropdownOpen(false);
                  setPostTypeDropdownOpen(false);
                }}
              />
            )}

            {/* Search Results Info */}
            {searchQuery.trim() && !loading && !isDefaultSearch && (
              <div className="mb-4 text-sm text-gray-600">
                {results.length > 0 || users.length > 0 ? (
                  <p>
                    Found {results.length} posts and {users.length} users
                    {selectedLocation !== "" && !useCurrentLocation && (
                      <span className="text-[#cc9b2e]"> in {selectedLocation}</span>
                    )}
                    {useCurrentLocation && (
                      <span className="text-[#cc9b2e]"> within {searchRadius}km of your location</span>
                    )}
                  </p>
                ) : (
                  <p>No results found for {searchQuery}
                    {selectedLocation !== "" && !useCurrentLocation && (
                      <span> in {selectedLocation}</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-center my-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ffd65c]"></div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-4 text-black">
            {/* User Cards Section - Hide if default search */}
            {!isDefaultSearch && (activeTab === "Users" || activeTab === "All") ? (
              <>
                {displayedUsers.map((user, idx) => (
                  <div key={user._id ?? user.username ?? `user-${idx}`} className="w-full max-w-2xl">
                    <UserCard user={user} onFollow={handleFollowUpdate} />
                  </div>
                ))}

                {hasMoreUsers && !showAllUsers && !loading && (
                  <button
                    onClick={() => setShowAllUsers(true)}
                    className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4 group"
                  >
                    <div className="flex items-center justify-center gap-3 text-gray-600 group-hover:text-[#cc9b2e]">
                      <Plus size={20} className="transition-transform group-hover:scale-110" />
                      <span className="font-medium">
                        Show {users.length - 2} more users
                      </span>
                    </div>
                  </button>
                )}

                {showAllUsers && hasMoreUsers && !loading && (
                  <button
                    onClick={() => setShowAllUsers(false)}
                    className="w-full max-w-2xl bg-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-3"
                  >
                    <div className="flex items-center justify-center gap-2 text-gray-600 hover:text-[#cc9b2e]">
                      <ChevronDown size={16} className="rotate-180 transition-transform" />
                      <span className="font-medium text-sm">Show less</span>
                    </div>
                  </button>
                )}
              </>
            ) : null}

            {/* Search Results - Posts */}
            {activeTab !== "Users" && (
              <>
                {results.map((item) => (
                  <div key={item._id} className="w-full px-4 sm:px-6">
                    <PostCard 
                      post={item} 
                      onPostClick={() => handlePostClick(item)}
                    />
                  </div>
                ))}
              </>
            )}

            {/* No Results Message */}
            {!loading && results.length === 0 && users.length === 0 && searchQuery.trim() && (
              <div className="text-gray-500 text-center py-8">
                <Search size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No results found</p>
                <p className="text-sm">Try adjusting your search terms or filters</p>
              </div>
            )}
          </div>
        </div>

        <div className="hidden xl:block w-[23rem] fixed p-5 right-0 top-0 h-full bg-white border-l border-gray-200 overflow-y-auto">
          <div className="mb-5">
            <TrendingTopics isSearchPage={true} onTrendingClick={handleTrendingClick} />
          </div>
          <TrendingBusiness />
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        post={selectedPost}
      />
    </>

  );
}

// Main component with Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd65c] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading search...</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}