'use client';

import React, { useEffect, useState } from 'react';
import {
  CallingState,
  SpeakerLayout,
  StreamCall,
  StreamTheme,
  StreamVideo,
  StreamVideoClient,
  useCallStateHooks,
  type User
} from '@stream-io/video-react-sdk';
import { X, Phone, Mic, MicOff } from 'lucide-react';
import Image from 'next/image';
import { CallControls as CustomCallControls } from './CallControls';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  token: string;
  userId: string;
  userName: string;
  userImage?: string;
  callId: string;
  callType?: 'voice' | 'video';
  streamCallType?: 'audio_room' | 'default';
}

// Wrapper component that integrates Stream SDK with custom CallControls
const CallControlsWrapper: React.FC<{ callType: 'voice' | 'video'; onCallEnd: () => void }> = ({ callType, onCallEnd }) => {
  const { useMicrophoneState, useCameraState, useScreenShareState } = useCallStateHooks();
  const { microphone } = useMicrophoneState();
  const { camera } = useCameraState();
  const { screenShare } = useScreenShareState();

  const handleToggleAudio = async () => {
    if (microphone.enabled) {
      await microphone.disable();
    } else {
      await microphone.enable();
    }
  };

  const handleToggleVideo = async () => {
    if (camera.enabled) {
      await camera.disable();
    } else {
      await camera.enable();
    }
  };

  const handleSwitchCamera = async () => {
    try {
      // Flip between front and rear cameras
      await camera.flip();
      console.log('📷 Camera flipped successfully');
    } catch (error) {
      console.error('❌ Failed to flip camera:', error);
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (screenShare.enabled) {
        await screenShare.disable();
        console.log('🖥️ Screen sharing stopped');
      } else {
        await screenShare.enable();
        console.log('🖥️ Screen sharing started');
      }
    } catch (error) {
      console.error('❌ Failed to toggle screen share:', error);
    }
  };

  return (
    <CustomCallControls
      isAudioEnabled={microphone.enabled}
      isVideoEnabled={camera.enabled}
      isScreenSharing={screenShare.enabled}
      onToggleAudio={handleToggleAudio}
      onToggleVideo={handleToggleVideo}
      onSwitchCamera={handleSwitchCamera}
      onToggleScreenShare={handleToggleScreenShare}
      onEndCall={onCallEnd}
      callType={callType}
    />
  );
};

const CallLayout: React.FC<{ callType?: 'voice' | 'video'; onCallEnd: () => void }> = ({ callType = 'video', onCallEnd }) => {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();

  // Auto-close when call ends or is left
  React.useEffect(() => {
    if (callingState === CallingState.LEFT || callingState === CallingState.IDLE) {
      console.log('📞 Call state changed to LEFT/IDLE - auto-closing modal');
      onCallEnd();
    }
  }, [callingState, onCallEnd]);

  // Hide all menu items except "Enter fullscreen" and ensure menu visibility
  React.useEffect(() => {
    const hideMenuItems = () => {
      // Find all menu containers
      const menus = document.querySelectorAll('[role="menu"], [class*="menu"]');

      menus.forEach((menu) => {
        const buttons = menu.querySelectorAll('button');
        buttons.forEach((button) => {
          const text = button.textContent || '';
          // Only show "Enter fullscreen" option
          if (!text.toLowerCase().includes('fullscreen') && !text.toLowerCase().includes('entire screen')) {
            (button as HTMLElement).style.display = 'none';
          } else {
            // Ensure fullscreen option is visible on mobile with proper styling
            (button as HTMLElement).style.display = 'flex';
            (button as HTMLElement).style.visibility = 'visible';
            (button as HTMLElement).style.opacity = '1';
          }
        });
      });

      // Ensure three-dot menu button is visible on mobile
      const menuButtons = document.querySelectorAll('[class*="menu-button"], [class*="MenuButton"], button[aria-haspopup="menu"]');
      menuButtons.forEach((btn) => {
        (btn as HTMLElement).style.display = 'flex';
        (btn as HTMLElement).style.visibility = 'visible';
        (btn as HTMLElement).style.opacity = '1';
        (btn as HTMLElement).style.zIndex = '10';
      });
    };

    // Run immediately
    hideMenuItems();

    // Run on mutations (when menu opens)
    const observer = new MutationObserver(hideMenuItems);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  // Show connecting screen only for initial states, not for LEFT/ENDED
  if (callingState !== CallingState.JOINED) {
    // If call was left or ended, don't show connecting screen
    if (callingState === CallingState.LEFT || callingState === CallingState.IDLE) {
      return null;
    }

    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">
            Connecting to {callType === 'voice' ? 'voice' : 'video'} call...
          </p>
        </div>
      </div>
    );
  }

  // Audio call UI - show avatars
  if (callType === 'voice') {
    return (
      <StreamTheme>
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative">
          {/* IMPORTANT: Hidden SpeakerLayout to handle audio playback */}
          <div className="absolute inset-0 opacity-0 pointer-events-none">
            <SpeakerLayout participantsBarPosition="top" />
          </div>

          {/* Audio call participants - avatars (visible UI) */}
          <div className="flex-1 flex items-center justify-center relative z-10">
            <div className="flex flex-wrap items-center justify-center gap-8 p-8">
              {participants.map((participant) => (
                <div key={participant.sessionId} className="flex flex-col items-center">
                  {/* Avatar */}
                  <div className="relative mb-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500 shadow-2xl">
                      {participant.image ? (
                        <Image
                          src={participant.image}
                          alt={participant.name || 'User'}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-4xl font-bold">
                            {(participant.name || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Animated ring for active speaker */}
                    <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-75"></div>

                    {/* Mic status indicator */}
                    <div className={`absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                      participant.audioStream
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}>
                      {participant.audioStream ? (
                        <Mic className="w-5 h-5 text-white" />
                      ) : (
                        <MicOff className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <p className="text-white text-xl font-semibold mb-1">
                    {participant.name || 'Unknown'}
                  </p>

                  {/* Status */}
                  <p className="text-gray-400 text-sm">
                    {participant.audioStream ? 'Speaking...' : 'Muted'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Audio indicator */}
          <div className="flex-shrink-0 flex items-center justify-center py-4 relative z-10">
            <div className="flex items-center gap-3 text-gray-400">
              <Phone className="w-5 h-5" />
              <span className="text-sm">Voice Call in Progress</span>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex-shrink-0 flex items-center justify-center py-6 bg-gray-800/90 backdrop-blur-sm relative z-10">
            <CallControlsWrapper callType={callType} onCallEnd={onCallEnd} />
          </div>
        </div>
      </StreamTheme>
    );
  }

  // Video call UI - show video feeds
  return (
    <StreamTheme>
      <div className="w-full h-full flex flex-col bg-gray-900" style={{ maxWidth: '100%', width: '100%' }}>
        {/* Video area - force full width */}
        <div className="flex-1 overflow-hidden bg-gray-900" style={{ width: '100%', maxWidth: '100%' }}>
          <div style={{ width: '100%', height: '100%', maxWidth: '100%' }}>
            <SpeakerLayout participantsBarPosition="top" />
          </div>
        </div>

        {/* Control buttons - inside the same StreamCall context */}
        <div className="flex-shrink-0 flex items-center justify-center py-6 bg-gray-800/90 backdrop-blur-sm">
          <CallControlsWrapper callType={callType} onCallEnd={onCallEnd} />
        </div>
      </div>
    </StreamTheme>
  );
};

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  token,
  userId,
  userName,
  userImage,
  callId,
  callType = 'video',
  streamCallType = 'default'
}) => {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Mark as closing to hide content immediately
      setIsClosing(true);

      // Clear client and call immediately to prevent "Connecting..." screen
      setClient(null);
      setCall(null);

      // The cleanup function will handle Stream.io cleanup
      return;
    }

    // Reset closing state when modal opens
    setIsClosing(false);

    // Don't initialize Stream.io if we're still connecting (waiting for real callId)
    if (callId === 'connecting') {
      return;
    }

    // Declare these outside async function so cleanup can access them
    let videoClient: StreamVideoClient | null = null;
    let videoCall: any = null;
    let isCancelled = false; // Flag to track if effect was cleaned up

    const initializeCall = async () => {
      try {
        const user: User = {
          id: userId,
          name: userName,
          image: userImage || `https://getstream.io/random_svg/?id=${userId}&name=${userName}`,
        };

        // Initialize Stream Video client
        console.log('📞 Initializing Stream.io client...');
        videoClient = new StreamVideoClient({ apiKey, user, token });

        // Check if cancelled before setting state
        if (isCancelled) {
          console.log('📞 Initialization cancelled, cleaning up...');
          videoClient.disconnectUser().catch(console.error);
          return;
        }

        setClient(videoClient);

        // Use the streamCallType from backend
        // Backend returns 'default' for both voice and video calls
        // Video is controlled through settings (disabled for voice calls)
        console.log('📞 Using Stream.io call type:', streamCallType);

        // Get the existing call that was already created by backend
        videoCall = videoClient.call(streamCallType, callId);

        // Check if cancelled before setting state
        if (isCancelled) {
          console.log('📞 Initialization cancelled, cleaning up...');
          // Don't call leave() here - the call hasn't been joined yet
          videoClient.disconnectUser().catch(console.error);
          return;
        }

        // Set call state immediately for faster UI
        setCall(videoCall);

        // Step 1: Join the call first
        console.log('📞 Joining existing call...');
        await videoCall.join({
          create: false
        });

        // Check if cancelled after joining
        if (isCancelled) {
          console.log('📞 Join completed but effect cancelled, leaving call...');
          // Check if call is still in a state that can be left
          if (videoCall.state.callingState !== 'left') {
            videoCall.leave().catch((err: any) => {
              // Ignore "already left" errors
              if (!err?.message?.includes('already been left')) {
                console.error(err);
              }
            });
          }
          videoClient.disconnectUser().catch(console.error);
          return;
        }

        console.log('📞 Successfully joined call!');

        // Listen for call end events to auto-close modal
        const handleCallEnded = () => {
          console.log('📞 Stream.io call ended - auto-closing modal');
          if (!isCancelled) {
            onClose();
          }
        };

        // Subscribe to call ended event
        videoCall.on('call.ended', handleCallEnded);

        // Also listen for when all participants leave
        videoCall.on('call.session_participant_left', (event: any) => {
          console.log('📞 Participant left:', event);
          // Give a small delay to check if there are any participants left
          setTimeout(() => {
            const remoteParticipants = videoCall.state.remoteParticipants || [];
            console.log('📞 Remote participants count:', remoteParticipants.length);
            if (remoteParticipants.length === 0 && !isCancelled) {
              console.log('📞 All remote participants left - closing call');
              onClose();
            }
          }, 500);
        });

        // Step 2: Enable microphone after joining
        try {
          await videoCall.microphone.enable();
          console.log('📞 Microphone enabled');

          // Wait a bit for microphone to initialize
          await new Promise(resolve => setTimeout(resolve, 500));

          // Debug: Check microphone state
          const micState = videoCall.microphone.state;
          console.log('📞 Microphone state:', micState);

          // Debug: Check if audio track is publishing
          const localParticipant = videoCall.state.localParticipant;
          console.log('📞 Local participant:', localParticipant);
          console.log('📞 Publishing tracks:', localParticipant?.publishedTracks);

        } catch (micError) {
          console.error('❌ Failed to enable microphone:', micError);
          alert('Failed to enable microphone. Please check your microphone permissions.');
        }

        // Step 3: For video calls, enable camera
        if (callType === 'video') {
          try {
            // Enable camera with front-facing mode (user = front camera, environment = back camera)
            await videoCall.camera.enable({
              facingMode: 'user' // Front camera (selfie camera on mobile)
            });
            console.log('📞 Camera enabled with front-facing mode');
          } catch (cameraError) {
            console.error('❌ Failed to enable camera:', cameraError);
            // Continue even if camera fails - audio works
          }
        }

        // Small delay to let media streams activate
        await new Promise(resolve => setTimeout(resolve, 300));

        // Debug: Log all participants and their tracks
        console.log('📞 All call participants:', videoCall.state.participants);
        console.log('📞 Call state:', videoCall.state.callingState);
      } catch (error) {
        console.error('📞 Failed to initialize call:', error);
        // Show error to user
        alert('Failed to initialize call. Please check your connection and try again.');
        // Close the modal on error
        onClose();
      }
    };

    initializeCall();

    return () => {
      // Set cancellation flag immediately
      isCancelled = true;

      // Cleanup on unmount - use parallel cleanup with timeout
      const cleanupPromises: Promise<unknown>[] = [];

      if (videoCall) {
        // Only attempt to leave if the call hasn't been left already
        const callState = videoCall.state?.callingState;
        if (callState && callState !== 'left') {
          cleanupPromises.push(
            Promise.race([
              videoCall.leave(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]).catch((err) => {
              // Ignore "already left" errors
              if (!err?.message?.includes('already been left')) {
                console.warn('Call cleanup on unmount failed:', err);
              }
            })
          );
        }
      }

      if (videoClient) {
        cleanupPromises.push(
          Promise.race([
            videoClient.disconnectUser(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]).catch((err) => console.warn('Client cleanup on unmount failed:', err))
        );
      }

      if (cleanupPromises.length > 0) {
        Promise.allSettled(cleanupPromises).then(() => {
          console.log('📞 Cleanup on unmount completed');
        });
      }
    };
  }, [isOpen, apiKey, token, userId, userName, userImage, callId, callType, streamCallType, onClose]);

  const handleClose = async () => {
    // Hide content immediately to prevent showing connecting screen
    setIsClosing(true);

    // Optimistic UI update - close modal immediately for better UX
    onClose();

    // Helper function to add timeout to promises
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
        ),
      ]);
    };

    try {
      // Parallelize cleanup operations with timeout protection
      const cleanupPromises: Promise<unknown>[] = [];

      if (call) {
        // Only attempt to leave if the call hasn't been left already
        const callState = call.state?.callingState;
        if (callState && callState !== 'left') {
          cleanupPromises.push(
            withTimeout(call.leave(), 5000).catch((err) => {
              // Ignore "already left" errors
              if (!err?.message?.includes('already been left')) {
                console.warn('Call leave failed or timed out:', err);
              }
            })
          );
        }
      }

      if (client) {
        cleanupPromises.push(
          withTimeout(client.disconnectUser(), 5000).catch((err) => {
            console.warn('Client disconnect failed or timed out:', err);
          })
        );
      }

      // Wait for all cleanup operations to complete (or timeout)
      await Promise.allSettled(cleanupPromises);
      console.log('📞 Call cleanup completed');
    } catch (error) {
      console.error('Error during call cleanup:', error);
      // UI already closed, so just log the error
    }
  };

  // Don't render anything if modal is closed or closing
  if (!isOpen || isClosing) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Global CSS override for full-width video and menu visibility */}
      <style jsx global>{`
        .str-video__call-layout,
        .str-video__speaker-layout,
        .str-video__participant-list,
        .str-video__call-layout > *,
        .str-video__speaker-layout > * {
          max-width: 100% !important;
          width: 100% !important;
        }

        /* Make menu items visible with proper contrast */
        [role="menu"],
        [role="menuitem"],
        [class*="menu"] button,
        [class*="Menu"] button,
        .str-video__menu button,
        .str-video__generic-menu button {
          color: white !important;
          background-color: rgba(31, 41, 55, 0.95) !important;
        }

        /* Menu container styling */
        [role="menu"],
        [class*="menu"],
        [class*="Menu"],
        .str-video__menu,
        .str-video__generic-menu {
          background-color: rgba(31, 41, 55, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(8px) !important;
        }

        /* Menu button hover state */
        [role="menu"] button:hover,
        [role="menuitem"]:hover,
        [class*="menu"] button:hover,
        [class*="Menu"] button:hover,
        .str-video__menu button:hover,
        .str-video__generic-menu button:hover {
          background-color: rgba(59, 130, 246, 0.5) !important;
          color: white !important;
        }

        /* Ensure menu button (three dots) is visible */
        [class*="menu-button"],
        [class*="MenuButton"],
        button[aria-haspopup="menu"],
        .str-video__menu-toggle {
          color: white !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
      `}</style>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg"
        title="End call"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Video call container - full screen */}
      <div className="w-full h-full bg-gray-900">
        {client && call && !isClosing ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallLayout callType={callType} onCallEnd={handleClose} />
            </StreamCall>
          </StreamVideo>
        ) : !isClosing ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-white text-lg">Connecting...</p>
              <p className="text-gray-400 text-sm mt-2">Please wait</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
