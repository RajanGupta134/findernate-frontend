"use client";

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Users, Lock, ChevronDown, AlertTriangle } from 'lucide-react';
import { messageAPI } from '@/api/message';

type PrivacyLevel = 'everyone' | 'followers' | 'nobody';

interface PrivacySettings {
  onlineStatus: PrivacyLevel;
  lastSeen: PrivacyLevel;
  canSeeOthersStatus?: boolean;
}

export const MessagingPrivacySettings: React.FC = () => {
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    onlineStatus: 'everyone',
    lastSeen: 'everyone',
    canSeeOthersStatus: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOnlineDropdown, setShowOnlineDropdown] = useState(false);
  const [showLastSeenDropdown, setShowLastSeenDropdown] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const settings = await messageAPI.getMessagingPrivacy();
      setPrivacySettings(settings);
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: PrivacyLevel) => {
    setSaving(true);
    try {
      const updatedSettings = await messageAPI.updateMessagingPrivacy({
        [key]: value
      });
      setPrivacySettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update privacy setting:', error);
      alert('Failed to update privacy settings');
    } finally {
      setSaving(false);
      setShowOnlineDropdown(false);
      setShowLastSeenDropdown(false);
    }
  };

  const getPrivacyIcon = (level: PrivacyLevel) => {
    switch (level) {
      case 'everyone':
        return <Eye className="w-4 h-4" />;
      case 'followers':
        return <Users className="w-4 h-4" />;
      case 'nobody':
        return <Lock className="w-4 h-4" />;
    }
  };

  const getPrivacyLabel = (level: PrivacyLevel) => {
    switch (level) {
      case 'everyone':
        return 'Everyone';
      case 'followers':
        return 'Followers Only';
      case 'nobody':
        return 'Nobody';
    }
  };

  const PrivacyDropdown = ({
    value,
    onChange,
    isOpen,
    onToggle
  }: {
    value: PrivacyLevel;
    onChange: (value: PrivacyLevel) => void;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        {getPrivacyIcon(value)}
        <span className="text-sm text-gray-700">{getPrivacyLabel(value)}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px]">
            {(['everyone', 'followers', 'nobody'] as PrivacyLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => onChange(level)}
                className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 ${
                  value === level ? 'bg-gray-100' : ''
                } first:rounded-t-lg last:rounded-b-lg`}
              >
                {getPrivacyIcon(level)}
                <span className="text-sm text-gray-700">{getPrivacyLabel(level)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="px-4 py-6">
        <h2 className="text-gray-500 font-medium text-sm mb-4">Messaging Privacy</h2>
        <div className="text-center py-4 text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h2 className="text-gray-500 font-medium text-sm mb-4">Messaging Privacy</h2>
      <div className="space-y-4">
        {/* Online Status */}
        <div className="flex items-center justify-between py-3">
          <div className="flex flex-col">
            <span className="text-gray-900 font-medium">Online Status</span>
            <span className="text-xs text-gray-500 mt-1">
              Control who can see when you're online
            </span>
          </div>
          <PrivacyDropdown
            value={privacySettings.onlineStatus}
            onChange={(value) => updateSetting('onlineStatus', value)}
            isOpen={showOnlineDropdown}
            onToggle={() => setShowOnlineDropdown(!showOnlineDropdown)}
          />
        </div>

        {/* Last Seen */}
        <div className="flex items-center justify-between py-3">
          <div className="flex flex-col">
            <span className="text-gray-900 font-medium">Last Seen</span>
            <span className="text-xs text-gray-500 mt-1">
              Control who can see your last seen time
            </span>
          </div>
          <PrivacyDropdown
            value={privacySettings.lastSeen}
            onChange={(value) => updateSetting('lastSeen', value)}
            isOpen={showLastSeenDropdown}
            onToggle={() => setShowLastSeenDropdown(!showLastSeenDropdown)}
          />
        </div>

        {/* Privacy Reciprocity Warning */}
        {privacySettings.canSeeOthersStatus === false && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Privacy Reciprocity Active</p>
                <p className="text-xs text-amber-700 mt-1">
                  Since you've hidden your status, you cannot see other users' online status or last seen information.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-gray-600">
            <strong>How it works:</strong> If you set your online status or last seen to "Nobody", you won't be able to see others' status either. This ensures fair privacy for all users.
          </p>
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <p className="text-gray-700">Updating settings...</p>
          </div>
        </div>
      )}
    </div>
  );
};
