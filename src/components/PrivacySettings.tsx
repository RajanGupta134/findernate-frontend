'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { toggleAccountPrivacy, toggleFullAccountPrivacy } from '@/api/privacy';
import { toast } from 'react-toastify';
import { useUserStore } from '@/store/useUserStore';

interface PrivacySettingsProps {
  userPrivacy?: string;
  isFullPrivate?: boolean;
  onPrivacyUpdate?: (privacy: string) => void;
  onFullPrivacyUpdate?: (isFullPrivate: boolean) => void;
  showFollowRequestContext?: boolean; // New prop to show Account Privacy toggle when follow requests are relevant
}

const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  userPrivacy = 'public',
  isFullPrivate = false,
  onPrivacyUpdate,
  onFullPrivacyUpdate,
  showFollowRequestContext = false
}) => {
  const [privacy, setPrivacy] = useState(userPrivacy);
  const [fullPrivate, setFullPrivate] = useState(isFullPrivate);
  const [loading, setLoading] = useState({
    privacy: false,
    fullPrivacy: false
  });

  const { updateUser } = useUserStore();

  // Sync local state when props change
  useEffect(() => {
    console.log('PrivacySettings: userPrivacy prop changed to:', userPrivacy);
    setPrivacy(userPrivacy);
    // Also set fullPrivate based on privacy value
    setFullPrivate(userPrivacy === 'private');
  }, [userPrivacy]);

  useEffect(() => {
    console.log('PrivacySettings: isFullPrivate prop changed to:', isFullPrivate);
    setFullPrivate(isFullPrivate);
  }, [isFullPrivate]);

  const handlePrivacyToggle = async () => {
    setLoading(prev => ({ ...prev, privacy: true }));
    try {
      console.log('Making privacy toggle request with token:', localStorage.getItem('token') ? 'Token exists' : 'No token');
      const response = await toggleAccountPrivacy();
      console.log('Privacy toggle response:', response);
      const newPrivacy = response.data.privacy;

      setPrivacy(newPrivacy);
      updateUser({ privacy: newPrivacy });
      onPrivacyUpdate?.(newPrivacy);

      toast.success(`Account is now ${newPrivacy}`, {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update privacy settings', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(prev => ({ ...prev, privacy: false }));
    }
  };


  const handleFullPrivacyToggle = async () => {
    setLoading(prev => ({ ...prev, fullPrivacy: true }));
    try {
      const newPrivacy = fullPrivate ? 'public' : 'private';

      // Call the full privacy API which handles both profile and posts privacy
      const response = await toggleFullAccountPrivacy(newPrivacy);

      const newFullPrivate = !fullPrivate;

      // Update local states
      setFullPrivate(newFullPrivate);
      setPrivacy(newPrivacy); // Also update the regular privacy state

      // Update parent components
      onFullPrivacyUpdate?.(newFullPrivate);
      onPrivacyUpdate?.(newPrivacy);

      console.log('Full privacy toggled:', { newFullPrivate, newPrivacy });

      // Update user store
      updateUser({ privacy: newPrivacy });

      toast.success(`Account and all posts are now ${newPrivacy}`, {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update total account privacy', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(prev => ({ ...prev, fullPrivacy: false }));
    }
  };

  return (
    <div>
    <div className="space-y-4">
        {/* Account Privacy - Show when privacy is 'private' or when showFollowRequestContext is true */}
        {/*{(privacy === 'private' || showFollowRequestContext) && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {privacy === 'private' ? (
                <Lock className="w-5 h-5 text-red-500" />
              ) : (
                <Unlock className="w-5 h-5 text-green-500" />
              )}
              <div>
                <h4 className="font-medium text-gray-800">Account Privacy</h4>
                <p className="text-sm text-gray-600">
                  {privacy === 'private'
                    ? 'Your account is private. Only approved followers can see your posts.'
                    : 'Your account is public. Anyone can see your posts.'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center">
              {loading.privacy ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-3"></div>
              ) : null}
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacy === 'private'}
                  onChange={handlePrivacyToggle}
                  disabled={loading.privacy}
                  className="sr-only"
                />
                <div className={`relative w-11 h-6 rounded-full transition-colors ${
                  privacy === 'private' ? 'bg-red-500' : 'bg-green-500'
                } ${loading.privacy ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    privacy === 'private' ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </label>
            </div>
          </div>
        )}*/}

        {/* Total Account Privacy */}
        {/* Toggle color logic: Red when privacy='private' OR fullPrivate=true (same condition that triggers follow request modal in PrivacyAwareProfile) */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {privacy === 'private' ? (
              <Lock className="w-5 h-5 text-red-500" />
            ) : (
              <Unlock className="w-5 h-5 text-green-500" />
            )}
            <div>
              <h4 className="font-medium text-gray-800">Total Account Privacy</h4>
              <p className="text-sm text-gray-600">
                {privacy === 'private'
                  ? 'Your profile and all posts are private. Only approved followers can see your content.'
                  : 'Makes both your profile AND all your posts private in one click.'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center">
            {loading.privacy ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-3"></div>
            ) : null}
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacy === 'private'}
                onChange={handlePrivacyToggle}
                disabled={loading.privacy}
                className="sr-only"
              />
              <div className={`relative w-11 h-6 rounded-full transition-colors ${
                // Show red when privacy is 'private', gray when 'public'
                privacy === 'private' ? 'bg-red-500' : 'bg-gray-300'
              } ${loading.privacy ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  privacy === 'private' ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </label>
          </div>
        </div>

      </div>

      {privacy === 'private' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Private Account:</strong> When your account is private, new followers need your approval.
            You can manage follow requests in the notifications section.
          </p>
        </div>
      )}
    </div>
  );
};

export default PrivacySettings;