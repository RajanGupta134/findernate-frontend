'use client';

import React from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, SwitchCamera, MonitorUp, MonitorX } from 'lucide-react';

interface CallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onSwitchCamera?: () => void;
  onToggleScreenShare?: () => void;
  callType: 'voice' | 'video';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export const CallControls: React.FC<CallControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  onSwitchCamera,
  onToggleScreenShare,
  callType,
  size = 'large',
  disabled = false
}) => {
  const sizeClasses = {
    small: {
      container: 'gap-2',
      button: 'w-10 h-10',
      icon: 'w-4 h-4',
      endButton: 'w-10 h-10'
    },
    medium: {
      container: 'gap-3',
      button: 'w-12 h-12',
      icon: 'w-5 h-5',
      endButton: 'w-12 h-12'
    },
    large: {
      container: 'gap-4',
      button: 'w-14 h-14',
      icon: 'w-6 h-6',
      endButton: 'w-16 h-16'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex items-center justify-center ${classes.container}`}>
      {/* Audio Toggle */}
      <button
        onClick={onToggleAudio}
        disabled={disabled}
        className={`
          ${classes.button} rounded-full flex items-center justify-center transition-all duration-200
          ${isAudioEnabled 
            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        `}
        title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isAudioEnabled ? (
          <Mic className={classes.icon} />
        ) : (
          <MicOff className={classes.icon} />
        )}
      </button>

      {/* Video Toggle (only for video calls) */}
      {callType === 'video' && (
        <button
          onClick={onToggleVideo}
          disabled={disabled}
          className={`
            ${classes.button} rounded-full flex items-center justify-center transition-all duration-200
            ${isVideoEnabled
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          `}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <Video className={classes.icon} />
          ) : (
            <VideoOff className={classes.icon} />
          )}
        </button>
      )}

      {/* Camera Switch (only for video calls when camera is enabled) */}
      {callType === 'video' && isVideoEnabled && onSwitchCamera && (
        <button
          onClick={onSwitchCamera}
          disabled={disabled}
          className={`
            ${classes.button} rounded-full flex items-center justify-center transition-all duration-200
            bg-gray-700 hover:bg-gray-600 text-white
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          `}
          title="Switch camera"
        >
          <SwitchCamera className={classes.icon} />
        </button>
      )}

      {/* Screen Share Toggle */}
      {onToggleScreenShare && (
        <button
          onClick={onToggleScreenShare}
          disabled={disabled}
          className={`
            ${classes.button} rounded-full flex items-center justify-center transition-all duration-200
            ${isScreenSharing
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          `}
          title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        >
          {isScreenSharing ? (
            <MonitorX className={classes.icon} />
          ) : (
            <MonitorUp className={classes.icon} />
          )}
        </button>
      )}

      {/* End Call */}
      <button
        onClick={onEndCall}
        disabled={disabled}
        className={`
          ${classes.endButton} rounded-full flex items-center justify-center transition-all duration-200
          bg-red-500 hover:bg-red-600 text-white shadow-lg
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        `}
        title="End call"
      >
        <PhoneOff className={classes.icon} />
      </button>
    </div>
  );
};