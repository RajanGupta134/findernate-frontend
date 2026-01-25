'use client';

import React from 'react';
import Image from 'next/image';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallModalProps {
  isOpen: boolean;
  callerName: string;
  callerImage?: string;
  callType: 'voice' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  callerName,
  callerImage,
  callType,
  onAccept,
  onDecline
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-700">
        {/* Call type indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className={`
            p-4 rounded-full
            ${callType === 'video' ? 'bg-blue-500/20' : 'bg-green-500/20'}
          `}>
            {callType === 'video' ? (
              <Video className="w-8 h-8 text-blue-400" />
            ) : (
              <Phone className="w-8 h-8 text-green-400" />
            )}
          </div>
        </div>

        {/* Caller info */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <Image
              src={callerImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(callerName)}&background=random`}
              alt={callerName}
              width={120}
              height={120}
              className="rounded-full border-4 border-gray-700 shadow-xl"
            />
            {/* Pulsing ring animation */}
            <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-75"></div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">{callerName}</h2>
          <p className="text-gray-400 text-lg">
            Incoming {callType} call...
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-8">
          {/* Decline button */}
          <button
            onClick={onDecline}
            className="group relative flex flex-col items-center"
            aria-label="Decline call"
          >
            <div className="
              w-16 h-16 rounded-full
              bg-red-500 hover:bg-red-600
              flex items-center justify-center
              transition-all duration-200
              transform hover:scale-110 active:scale-95
              shadow-lg hover:shadow-red-500/50
            ">
              <PhoneOff className="w-7 h-7 text-white" />
            </div>
            <span className="text-gray-300 text-sm mt-2 font-medium">Decline</span>
          </button>

          {/* Accept button */}
          <button
            onClick={onAccept}
            className="group relative flex flex-col items-center"
            aria-label="Accept call"
          >
            <div className={`
              w-16 h-16 rounded-full
              ${callType === 'video' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}
              flex items-center justify-center
              transition-all duration-200
              transform hover:scale-110 active:scale-95
              shadow-lg ${callType === 'video' ? 'hover:shadow-blue-500/50' : 'hover:shadow-green-500/50'}
            `}>
              {callType === 'video' ? (
                <Video className="w-7 h-7 text-white" />
              ) : (
                <Phone className="w-7 h-7 text-white" />
              )}
            </div>
            <span className="text-gray-300 text-sm mt-2 font-medium">Accept</span>
          </button>
        </div>

        {/* Ringtone indicator */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};
