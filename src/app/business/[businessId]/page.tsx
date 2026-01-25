'use client';

import { getBusinessProfile } from '@/api/user';
import { getUserPosts } from '@/api/homeFeed';
//import FloatingHeader from '@/components/FloatingHeader';
import PostCard from '@/components/PostCard';
import ProfilePostsSection from '@/components/ProfilePostsSection';
import { FeedPost } from '@/types';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Building2, Users } from 'lucide-react';
import Image from 'next/image';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthDialog } from '@/components/AuthDialog';

interface BusinessProfile {
  _id: string;
  businessName: string;
  category: string;
  description: string;
  logoUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  location?: string;
  website?: string;
  email?: string;
  createdAt: string;
  profileImageUrl?: string;
  username?: string;
  fullName?: string;
}

const BusinessProfilePage = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [businessData, setBusinessData] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const params = useParams();
  // Decode the business name from URL (handles spaces and special characters)
  const businessName = decodeURIComponent(params.businessId as string);
  const { requireAuth, showAuthDialog, closeAuthDialog } = useAuthGuard();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
                // Try to fetch business profile
        let businessResponse;
        try {
          businessResponse = await getBusinessProfile(businessName);
          //console.log("Business profile API response:", businessResponse);
        } catch (apiError) {
          console.error('Business profile API failed, using fallback:', apiError);
          // Create fallback business data using the business name from URL
          const displayName = businessName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          businessResponse = {
            data: {
              _id: businessName,
              businessName: displayName || 'Business Owner',
              category: 'General',
              description: 'Business profile information will be available soon.',
              logoUrl: '',
              followersCount: 0,
              followingCount: 0,
              postsCount: 0,
              isFollowing: false,
              username: businessName.toLowerCase().replace(/\s+/g, '') || 'businessowner',
              createdAt: new Date().toISOString()
            }
          };
        }
        
        if (businessResponse.data) {
          setBusinessData(businessResponse.data);
          
          // Try to fetch business posts
          try {
            if (businessResponse.data._id) {
              const postsResponse = await getUserPosts(businessResponse.data._id);
              const postsWithUserInfo = (postsResponse.data?.posts || []).map((post: any) => ({
                ...post,
                username: businessResponse.data.username || businessResponse.data.businessName,
                profileImageUrl: businessResponse.data.profileImageUrl || businessResponse.data.logoUrl,
                tags: Array.isArray(post.tags) ? post.tags : 
                      Array.isArray(post.hashtags) ? post.hashtags :
                      (post.tags ? [post.tags] : 
                       post.hashtags ? [post.hashtags] : []),
                location: post.location || 
                         post.customization?.normal?.location ||
                         (businessResponse.data?.location ? businessResponse.data.location : null),
                engagement: {
                  likes: post.engagement?.likes || 0,
                  comments: post.engagement?.comments || 0,
                  shares: post.engagement?.shares || 0,
                  ...post.engagement
                }
              }));
              setPosts(postsWithUserInfo);
            }
          } catch (postsError) {
            console.error('Error fetching business posts:', postsError);
            // Set empty posts array if posts fetch fails
            setPosts([]);
          }
        } else {
          throw new Error("Business profile data not found");
        }
        
      } catch (error) {
        console.error('Error in business profile page:', error);
        setError('Unable to load business profile');
      } finally {
        setLoading(false);
      }
    };

    if (businessName) {
      fetchData();
    }
  }, [businessName]);

  const handleFollowToggle = async () => {
    if (!businessData || isFollowLoading) return;
    
    // Check authentication before allowing follow action
    requireAuth(async () => {
      setIsFollowLoading(true);
      try {
        // TODO: Implement follow/unfollow business API call
        // const response = await followBusiness(businessData._id);
        //console.log('Follow/unfollow business:', businessData._id);
        
        // Update local state
        setBusinessData(prev => prev ? {
          ...prev,
          isFollowing: !prev.isFollowing,
          followersCount: prev.isFollowing ? prev.followersCount - 1 : prev.followersCount + 1
        } : null);
        
      } catch (error) {
        console.error('Error toggling follow status:', error);
      } finally {
        setIsFollowLoading(false);
      }
    });
  };

  const getJoinedDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    } catch (error) {
      console.error('Error parsing date:', error);
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 max-w-6xl mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p>Loading business profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 max-w-6xl mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="text-lg font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!businessData) {
    return (
      <div className="bg-gray-50 max-w-6xl mx-auto p-4 min-h-screen flex items-center justify-center">
        <p>Business not found</p>
      </div>
    );
  }

  return (
    <div className='bg-gray-50 max-w-6xl mx-auto pt-5'>
      {/*<FloatingHeader
        paragraph="Discover amazing businesses and their content"
        heading="Business Profile"
        username={businessData.businessName}
        accountBadge={true}
      />*/}

      <div className='flex flex-col gap-6'>
        {/* Business Profile Card */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm w-full">
          {/* Banner */}
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-32 w-full relative">
            <div className="absolute -bottom-12 left-4 sm:left-6">
              <div className="relative">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 sm:border-4 border-white bg-white p-1">
                  {businessData.logoUrl ? (
                    <Image
                      src={businessData.logoUrl}
                      alt={businessData.businessName}
                      width={128}
                      height={128}
                      className="rounded-full w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-button-gradient flex items-center justify-center text-black font-bold text-lg sm:text-2xl">
                      <Building2 className="w-8 h-8" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="pt-16 px-4 sm:px-6 pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4">
              <div className="flex-1 w-full sm:mr-4">
                {/* Business Name and Category */}
                <div className="flex items-center gap-2 mb-0">
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                    {businessData.businessName}
                  </h1>
                  <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                    Business <Building2 className="w-3 h-3" />
                  </span>
                </div>

                <p className="text-gray-500 text-sm mb-2">@{businessData.username || businessData.businessName.toLowerCase().replace(/\s+/g, '')}</p>

                {/* Description */}
                <p className="mt-2 text-sm text-gray-800">
                  {businessData.description || "No description available"}
                </p>

                {/* Business Info */}
                <div className="flex items-center gap-3 sm:gap-4 mt-4 text-xs sm:text-sm text-gray-600 flex-wrap">
                  {/* Category */}
                  <div className="flex items-center gap-1">
                    🏢
                    <span className="capitalize">{businessData.category}</span>
                  </div>

                  {/* Location */}
                  {businessData.location && (
                    <div className="flex items-center gap-1">
                      📍
                      <span>{businessData.location}</span>
                    </div>
                  )}

                  {/* Website */}
                  {businessData.website && (
                    <div className="flex items-center gap-1">
                      🔗
                      <a
                        href={businessData.website.startsWith('http') ? businessData.website : `https://${businessData.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-yellow-700 underline hover:text-yellow-800"
                      >
                        {businessData.website}
                      </a>
                    </div>
                  )}

                  {/* Email */}
                  {businessData.email && (
                    <div className="flex items-center gap-1">
                      📧
                      <span>{businessData.email}</span>
                    </div>
                  )}

                  {/* Joined Date */}
                  {businessData.createdAt && (
                    <div className="flex items-center gap-1">
                      📅 Joined {getJoinedDate(businessData.createdAt)}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading}
                  className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                    businessData.isFollowing 
                      ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  {isFollowLoading ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : businessData.isFollowing ? (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Unfollow</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 sm:gap-6 mt-6 text-sm text-gray-700 font-medium flex-wrap">
              <span>
                <strong className="text-black">{businessData.followingCount || 0}</strong> Following
              </span>
              <span>
                <strong className="text-black">{businessData.followersCount}</strong> Followers
              </span>
              <span>
                <strong className="text-black">{businessData.postsCount || 0}</strong> Posts
              </span>
            </div>
          </div>
        </div>
        
        {/* Posts Section */}
        <div className='w-full'>
          <ProfilePostsSection
            PostCard={PostCard}
            posts={posts}
            isOtherUser={true}
            isFullPrivate={false}
          />
        </div>
      </div>
      
      {/* Auth Dialog */}
      <AuthDialog isOpen={showAuthDialog} onClose={closeAuthDialog} />
    </div>
  );
};

export default BusinessProfilePage; 