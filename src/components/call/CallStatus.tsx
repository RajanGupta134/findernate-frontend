'use client';

import React, { useState, useEffect } from 'react';
import { formatCallDuration } from '@/api/call';

interface CallStatusProps {
  status?: 'initiated' | 'ringing' | 'connecting' | 'active' | 'ended' | 'declined' | 'missed' | 'failed';
  duration?: number;
  connectionState?: RTCPeerConnectionState | null;
  quality?: 'excellent' | 'good' | 'poor' | 'failed';
  size?: 'small' | 'medium' | 'large';
}

export const CallStatus: React.FC<CallStatusProps> = ({
  status,
  duration = 0,
  connectionState,
  quality,
  size = 'medium'
}) => {
  const [callDuration, setCallDuration] = useState(duration);
  const [isActive, setIsActive] = useState(false);

  // Update call duration every second when call is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Start timer when call is active OR when WebRTC is connected (even if status is still connecting)
    if (status === 'active' || (connectionState === 'connected' && status === 'connecting')) {
      setIsActive(true);
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setIsActive(false);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [status, connectionState]);

  // Reset duration when call ends
  useEffect(() => {
    if (status === 'ended' || status === 'declined' || status === 'failed') {
      setCallDuration(duration);
      setIsActive(false);
    }
  }, [status, duration]);

  const getStatusText = () => {
    switch (status) {
      case 'initiated':
        return 'Calling...';
      case 'ringing':
        return 'Ringing...';
      case 'connecting':
        return connectionState === 'connected' ? formatCallDuration(callDuration) : 'Connecting...';
      case 'active':
        return formatCallDuration(callDuration);
      case 'ended':
        return `Call ended • ${formatCallDuration(duration)}`;
      case 'declined':
        return 'Call declined';
      case 'missed':
        return 'Call missed';
      case 'failed':
        return 'Call failed';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'initiated':
      case 'ringing':
        return 'text-blue-400';
      case 'connecting':
        return connectionState === 'connected' ? 'text-green-400' : 'text-yellow-400';
      case 'active':
        return 'text-green-400';
      case 'ended':
        return 'text-gray-400';
      case 'declined':
      case 'missed':
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getQualityIndicator = () => {
    if (!quality || status !== 'active' || connectionState !== 'connected') return null;

    const qualityConfig = {
      excellent: { color: 'text-green-400', bars: 4, label: 'Excellent' },
      good: { color: 'text-yellow-400', bars: 3, label: 'Good' },
      poor: { color: 'text-orange-400', bars: 2, label: 'Poor' },
      failed: { color: 'text-red-400', bars: 1, label: 'Failed' }
    };

    const config = qualityConfig[quality];
    
    return (
      <div className="flex items-center gap-1 ml-2" title={`Connection quality: ${config.label}`}>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`w-1 h-3 rounded-sm ${
                bar <= config.bars 
                  ? config.color.replace('text-', 'bg-')
                  : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]}`}>
      <div className="flex items-center">
        <span className={getStatusColor()}>
          {getStatusText()}
        </span>
        
        {/* Animated dots for loading states */}
        {(status === 'initiated' || status === 'ringing' || 
          (status === 'connecting' && connectionState !== 'connected')) && (
          <div className="flex items-center ml-1">
            <div className={`w-1 h-1 rounded-full ${getStatusColor().replace('text-', 'bg-')} animate-pulse`} />
            <div className={`w-1 h-1 rounded-full ${getStatusColor().replace('text-', 'bg-')} animate-pulse ml-0.5`} style={{ animationDelay: '0.2s' }} />
            <div className={`w-1 h-1 rounded-full ${getStatusColor().replace('text-', 'bg-')} animate-pulse ml-0.5`} style={{ animationDelay: '0.4s' }} />
          </div>
        )}

        {/* Quality indicator */}
        {getQualityIndicator()}
      </div>
    </div>
  );
};