'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Send, Smile, Type, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Comment, createComment } from '@/api/comment';
import { useUserStore } from '@/store/useUserStore';
import { emitCommentNotification, emitCommentReplyNotification } from '@/hooks/useCommentNotifications';
import EmojiPicker, { EmojiClickData, EmojiStyle } from 'emoji-picker-react';
import { FontStyle, FontFamily, FontSize } from '@/types';

const fontFamilyOptions: { value: FontFamily; label: string; className: string }[] = [
  { value: 'default', label: 'Default', className: 'font-sans' },
  { value: 'serif', label: 'Serif', className: 'font-serif' },
  { value: 'mono', label: 'Mono', className: 'font-mono' },
  { value: 'cursive', label: 'Cursive', className: 'font-cursive' },
  { value: 'fantasy', label: 'Fantasy', className: 'font-fantasy' },
];

const fontSizeOptions: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'base', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
];

const getFontClasses = (fontStyle: FontStyle): string => {
  const familyClass = fontFamilyOptions.find(f => f.value === fontStyle.fontFamily)?.className || 'font-sans';
  const sizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[fontStyle.fontSize];
  return `${familyClass} ${sizeClass}`;
};

interface AddCommentProps {
  postId: string;
  postOwnerId?: string;
  parentCommentId?: string;
  originalCommenterUserId?: string;
  originalCommenterUsername?: string;
  onCommentAdded: (comment: Comment) => void;
  placeholder?: string;
  shouldFocus?: boolean;
}

const AddComment = ({
  postId,
  postOwnerId,
  parentCommentId,
  originalCommenterUserId,
  originalCommenterUsername,
  onCommentAdded,
  placeholder = "Add a comment...",
  shouldFocus = false
}: AddCommentProps) => {
  const { user } = useUserStore();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [fontStyle, setFontStyle] = useState<FontStyle>({ fontFamily: 'default', fontSize: 'base' });
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [shouldFocus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-emoji-button]')) {
          setShowEmojiPicker(false);
        }
      }
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-font-button]')) {
          setShowFontDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setContent(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const commentData = {
        postId,
        content: content.trim(),
        ...(parentCommentId && { parentCommentId }),
        ...(originalCommenterUserId && { replyToUserId: originalCommenterUserId }),
        fontStyle
      };

      const newComment = await createComment(commentData);

      const commentWithUser: Comment = {
        ...newComment,
        userId: user?._id || newComment.userId || '',
        user: {
          _id: user?._id || '',
          username: user?.username || '',
          fullName: user?.fullName || '',
          profileImageUrl: user?.profileImageUrl || ''
        },
        replyToUserId: newComment.replyToUserId || (originalCommenterUserId && originalCommenterUsername ? {
          _id: originalCommenterUserId,
          username: originalCommenterUsername,
          fullName: originalCommenterUsername,
          profileImageUrl: ''
        } : undefined),
        likes: newComment.likes || [],
        likesCount: Array.isArray(newComment.likes) ? newComment.likes.length : 0,
        isLikedBy: false,
        replies: [],
        fontStyle
      };

      onCommentAdded(commentWithUser);
      setContent('');

      if (user?.username) {
        if (parentCommentId && originalCommenterUserId) {
          emitCommentReplyNotification({
            parentCommentId,
            replyId: newComment._id,
            replierUsername: user.username,
            originalCommenterUserId,
            replyContent: content.trim()
          });
        } else if (postOwnerId) {
          emitCommentNotification({
            postId,
            commentId: newComment._id,
            commenterUsername: user.username,
            postOwnerId,
            commentContent: content.trim()
          });
        }
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">Please log in to comment</p>
      </div>
    );
  }

  const fontClasses = getFontClasses(fontStyle);

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      {/* User Profile Image */}
      <div className="flex-shrink-0">
        {user.profileImageUrl ? (
          <Image
            src={user.profileImageUrl}
            alt={user.username || 'Your profile'}
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-button-gradient flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {getInitials(user.fullName || user.username || 'You')}
            </span>
          </div>
        )}
      </div>

      {/* Comment Input */}
      <div className="flex-1 flex gap-2 relative">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-20 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${fontClasses}`}
            disabled={isSubmitting}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              data-emoji-button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-1 rounded transition-colors ${
                showEmojiPicker
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-font-button
              onClick={() => setShowFontDropdown(!showFontDropdown)}
              className={`p-1 rounded transition-colors flex items-center ${
                showFontDropdown
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Type className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="bg-yellow-600 hover:bg-yellow-700 text-white rounded-full px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-[9999] sm:hidden"
              onClick={() => setShowEmojiPicker(false)}
            />
            <div
              ref={emojiPickerRef}
              className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-1 z-[10000]"
            >
              <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl border-t sm:border border-gray-200 overflow-hidden">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  width={typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 320}
                  height={350}
                  searchDisabled={false}
                  skinTonesDisabled={false}
                  previewConfig={{ showPreview: false }}
                  emojiStyle={EmojiStyle.GOOGLE}
                />
              </div>
            </div>
          </>
        )}

        {/* Font Dropdown */}
        {showFontDropdown && (
          <div
            ref={fontDropdownRef}
            className="absolute right-0 top-full mt-1 z-[10000] bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]"
          >
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Font Style</label>
              <div className="space-y-1">
                {fontFamilyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFontStyle({ ...fontStyle, fontFamily: option.value })}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${option.className} ${
                      fontStyle.fontFamily === option.value
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Size</label>
              <div className="flex gap-1">
                {fontSizeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFontStyle({ ...fontStyle, fontSize: option.value })}
                    className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors ${
                      fontStyle.fontSize === option.value
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default AddComment;
