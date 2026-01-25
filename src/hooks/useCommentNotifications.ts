'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'react-toastify';
import { refreshUnreadCounts } from './useUnreadCounts';
import { usePushNotifications } from './usePushNotifications';

interface CommentNotificationData {
  postId: string;
  commentId: string;
  commenterUsername: string;
  postOwnerId: string;
  commentContent: string;
}

interface CommentLikeNotificationData {
  commentId: string;
  likerUsername: string;
  commentOwnerId: string;
}

interface CommentReplyNotificationData {
  parentCommentId: string;
  replyId: string;
  replierUsername: string;
  originalCommenterUserId: string;
  replyContent: string;
}

export const useCommentNotifications = () => {
  const { user } = useUserStore();
  const router = useRouter();
  const { showGeneralNotification, subscription } = usePushNotifications();

  useEffect(() => {
    if (!user?._id) return;

    // Handle new comment notifications from local events
    const handleNewComment = (event: CustomEvent<CommentNotificationData>) => {
      const data = event.detail;
      // Only show notification if it's on the current user's post
      if (data.postOwnerId === user._id && data.commenterUsername !== user.username) {
        toast.success(
          `${data.commenterUsername} commented on your post: "${data.commentContent}"`,
          {
            onClick: () => router.push(`/post/${data.postId}`),
            autoClose: 5000,
            closeOnClick: true,
            style: { cursor: 'pointer' }
          }
        );
        
        // Show push notification if enabled
        if (subscription) {
          showGeneralNotification({
            title: 'New Comment',
            body: `${data.commenterUsername} commented: "${data.commentContent}"`,
            url: `/post/${data.postId}`,
            type: 'comment',
            senderName: data.commenterUsername
          });
        }
        
        // Refresh unread counts to update notification badge
        refreshUnreadCounts();
      }
    };

    // Handle comment like notifications from local events
    const handleCommentLike = (event: CustomEvent<CommentLikeNotificationData>) => {
      const data = event.detail;
      // Only show notification if it's the current user's comment
      if (data.commentOwnerId === user._id && data.likerUsername !== user.username) {
        toast.info(
          `${data.likerUsername} liked your comment`,
          {
            autoClose: 3000,
            closeOnClick: true
          }
        );
        
        // Show push notification if enabled
        if (subscription) {
          showGeneralNotification({
            title: 'Comment Liked',
            body: `${data.likerUsername} liked your comment`,
            url: '/notifications',
            type: 'like',
            senderName: data.likerUsername
          });
        }
        
        // Refresh unread counts to update notification badge
        refreshUnreadCounts();
      }
    };

    // Handle comment reply notifications from local events
    const handleCommentReply = (event: CustomEvent<CommentReplyNotificationData>) => {
      const data = event.detail;
      // Only show notification if it's a reply to the current user's comment
      if (data.originalCommenterUserId === user._id && data.replierUsername !== user.username) {
        toast.info(
          `${data.replierUsername} replied to your comment: "${data.replyContent}"`,
          {
            autoClose: 5000,
            closeOnClick: true
          }
        );
        
        // Show push notification if enabled
        if (subscription) {
          showGeneralNotification({
            title: 'New Reply',
            body: `${data.replierUsername} replied: "${data.replyContent}"`,
            url: '/notifications',
            type: 'reply',
            senderName: data.replierUsername
          });
        }
        
        // Refresh unread counts to update notification badge
        refreshUnreadCounts();
      }
    };

    // Listen to custom events
    window.addEventListener('comment-notification', handleNewComment as EventListener);
    window.addEventListener('comment-like-notification', handleCommentLike as EventListener);
    window.addEventListener('comment-reply-notification', handleCommentReply as EventListener);

    // Cleanup function
    return () => {
      window.removeEventListener('comment-notification', handleNewComment as EventListener);
      window.removeEventListener('comment-like-notification', handleCommentLike as EventListener);
      window.removeEventListener('comment-reply-notification', handleCommentReply as EventListener);
    };
  }, [user?._id, user?.username, router]);
};

// Utility functions to emit notifications from anywhere in the app
export const emitCommentNotification = (data: CommentNotificationData) => {
  window.dispatchEvent(new CustomEvent('comment-notification', { detail: data }));
};

export const emitCommentLikeNotification = (data: CommentLikeNotificationData) => {
  window.dispatchEvent(new CustomEvent('comment-like-notification', { detail: data }));
};

export const emitCommentReplyNotification = (data: CommentReplyNotificationData) => {
  window.dispatchEvent(new CustomEvent('comment-reply-notification', { detail: data }));
};