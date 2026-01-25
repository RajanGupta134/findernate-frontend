"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Eye, Users } from "lucide-react";
import { Story, StoryAnalytics as StoryAnalyticsType, StoryViewer } from "@/types/story";
import { storyAPI } from "@/api/story";
import { useUserStore } from "@/store/useUserStore";

interface StoryAnalyticsProps {
  story: Story;
  onClose: () => void;
  onViewerCountUpdate?: (count: number) => void;
}

export default function StoryAnalytics({ story, onClose, onViewerCountUpdate }: StoryAnalyticsProps) {
  const [analytics, setAnalytics] = useState<StoryAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { user: currentUser } = useUserStore();

  // Remove duplicates - keep unique viewers only
  const processViewers = (viewers: StoryViewer[]): StoryViewer[] => {
    // Remove duplicates based on user ID
    const uniqueViewers = viewers.filter((viewer, index, self) =>
      index === self.findIndex(v => v._id === viewer._id)
    );

    // Exclude current user from viewers list (should not see own name)
    const withoutSelf = uniqueViewers.filter(v => {
      const sameId = currentUser?._id && v._id === currentUser._id;
      const sameUsername = currentUser?.username && v.username && v.username === currentUser.username;
      return !sameId && !sameUsername;
    });

    // Sort by view time if available (first view to last view), otherwise by username
    return withoutSelf.sort((a, b) => {
      if (a.viewedAt && b.viewedAt) {
        return new Date(a.viewedAt).getTime() - new Date(b.viewedAt).getTime();
      }
      // Fallback to alphabetical by username if no timestamps
      return a.username.localeCompare(b.username);
    });
  };

  // Fetch story viewers
  const fetchViewers = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await storyAPI.fetchStoryViewers(story._id, page, 20);
      
      if (page === 1) {
        const processedData = {
          ...data,
          viewers: processViewers(data.viewers)
        };
        setAnalytics(processedData);
        
        // Update the viewer count in the parent component
        if (onViewerCountUpdate) {
          onViewerCountUpdate(processedData.pagination.total);
        }
      } else {
        // Append new viewers for pagination and process combined list
        setAnalytics(prev => {
          if (!prev) return data;
          
          const combinedViewers = [...prev.viewers, ...data.viewers];
          const processedViewers = processViewers(combinedViewers);
          
          return {
            ...data,
            viewers: processedViewers
          };
        });
      }
      
      setCurrentPage(page);
    } catch (err) {
      setError("Failed to load story viewers");
      console.error("Error fetching story viewers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load more viewers
  const loadMoreViewers = () => {
    if (analytics && analytics.pagination.hasNextPage) {
      fetchViewers(currentPage + 1);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const storyTime = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - storyTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays}d ago`;
  };

  // Initial load
  useEffect(() => {
    fetchViewers(1);
  }, [story._id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <Eye size={20} className="text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-500">Story Views</h2>
              <p className="text-sm text-gray-500">
                {analytics ? `${analytics.pagination.total} views` : 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Story Preview */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200">
              {(story.mediaType === 'video' || story.postType === 'video') ? (
                <video
                  src={story.mediaUrl}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <Image
                  src={story.mediaUrl}
                  alt="Story preview"
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {story.caption || 'Your story'}
              </p>
              <p className="text-xs text-gray-500">
                {formatTimeAgo(story.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Viewers List */}
        <div className="flex-1 overflow-y-auto">
          {loading && currentPage === 1 ? (
            <div className="p-4">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded animate-pulse mb-1" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={() => fetchViewers(1)}
                className="mt-2 text-blue-600 text-sm hover:underline"
              >
                Try again
              </button>
            </div>
          ) : analytics && analytics.viewers.length > 0 ? (
            <div className="p-4">
              <div className="space-y-3">
                {analytics.viewers.map((viewer) => (
                  <div key={viewer._id} className="flex items-center space-x-3">
                    <div className="relative w-10 h-10">
                      <Image
                        src={viewer.profileImageUrl || '/placeholderimg.png'}
                        alt={viewer.username}
                        fill
                        className="rounded-full object-cover border border-gray-200"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {viewer.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {analytics.pagination.hasNextPage && (
                <div className="mt-4 text-center">
                  <button
                    onClick={loadMoreViewers}
                    disabled={loading}
                    className="text-blue-600 text-sm hover:underline disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Users size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No views yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Views will appear here when people see your story
              </p>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        {analytics && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Eye size={16} />
                <span>{analytics.pagination.total} views</span>
              </div>
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <span>Posted {formatTimeAgo(story.createdAt)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}