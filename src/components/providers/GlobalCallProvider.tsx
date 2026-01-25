'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { socketManager } from '@/utils/socket';
import { callAPI } from '@/api/call';
import { streamAPI } from '@/api/stream';
import { pushNotificationManager, CallNotificationData } from '@/utils/pushNotifications';
import { IncomingCallModal } from '@/components/call/IncomingCallModal';
import { VideoCallModal } from '@/components/call/VideoCallModal';
import { useUserStore } from '@/store/useUserStore';
import '@/utils/serviceWorkerCleanup'; // Make cleanup function available globally

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerImage?: string;
  chatId: string;
  callType: 'voice' | 'video';
}

interface CurrentCall {
  callId: string;
  chatId: string;
  callType: 'voice' | 'video';
  isInitiator: boolean;
  streamCallType?: 'audio_room' | 'default';
}

interface GlobalCallContextType {
  incomingCall: IncomingCall | null;
  currentCall: CurrentCall | null;
  isVideoCallOpen: boolean;
  streamToken: string | null;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  setCurrentCall: (call: CurrentCall | null) => void;
  setIsVideoCallOpen: (open: boolean) => void;
  setStreamToken: (token: string | null) => void;
  setRouteBeforeCall: (route: string | null) => void;
}

const GlobalCallContext = createContext<GlobalCallContextType | null>(null);

export const useGlobalCall = () => {
  const context = useContext(GlobalCallContext);
  if (!context) {
    throw new Error('useGlobalCall must be used within GlobalCallProvider');
  }
  return context;
};

export const GlobalCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [currentCall, setCurrentCall] = useState<CurrentCall | null>(null);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [streamToken, setStreamToken] = useState<string | null>(null);
  const [routeBeforeCall, setRouteBeforeCall] = useState<string | null>(null);
  const { user } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();

  // Use refs to avoid re-registering socket listeners
  const currentCallRef = React.useRef<CurrentCall | null>(null);
  const incomingCallRef = React.useRef<IncomingCall | null>(null);
  const routeBeforeCallRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  React.useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  React.useEffect(() => {
    routeBeforeCallRef.current = routeBeforeCall;
  }, [routeBeforeCall]);

  // Initialize socket connection globally (so it works on all pages)
  useEffect(() => {
    if (!user) {
      console.log('🔌 GlobalCallProvider: Waiting for user to be loaded...');
      return;
    }

    const { validateAndGetToken } = useUserStore.getState();
    const validToken = validateAndGetToken();

    if (validToken) {
      console.log('🔌 GlobalCallProvider: Initializing socket connection for user:', user.username);
      socketManager.connect(validToken);
    } else {
      console.warn('🔌 GlobalCallProvider: No valid token found');
    }
  }, [user]);

  // Clean up any stuck active calls on mount
  useEffect(() => {
    const cleanupActiveCall = async () => {
      try {
        const activeCall = await callAPI.getActiveCall();
        if (activeCall) {
          console.log('🧹 Found stuck active call, cleaning up:', activeCall._id);
          await callAPI.endCall(activeCall._id, { endReason: 'cancelled' });
        }
      } catch (error) {
        console.error('Failed to cleanup active call:', error);
      }
    };

    if (user) {
      cleanupActiveCall();
    }
  }, [user]);

  // Handle incoming call from Socket (backup - FCM is primary)
  useEffect(() => {
    if (!user) return;

    const handleIncomingCall = (data: any) => {
      console.log('📞 Incoming call received via Socket:', data);

      setIncomingCall({
        callId: data.callId,
        callerId: data.caller._id,
        callerName: data.caller.fullName || data.caller.username,
        callerImage: data.caller.profileImageUrl,
        chatId: data.chatId,
        callType: data.callType
      });
    };

    const handleCallDeclined = (data: any) => {
      console.log('📞 Call declined:', data);
      if (currentCallRef.current?.callId === data.callId) {
        // Store route before clearing states
        const savedRoute = routeBeforeCallRef.current;

        // Clear states first to close modal
        setIsVideoCallOpen(false);
        setCurrentCall(null);
        setStreamToken(null);
        setRouteBeforeCall(null);

        // Small delay to ensure modal closes before navigation
        setTimeout(() => {
          if (savedRoute) {
            console.log('📍 Navigating back to route after decline:', savedRoute);
            router.push(savedRoute);
          }
        }, 100);
      }
    };

    const handleCallEnded = (data: any) => {
      console.log('📞 Call ended:', data);
      const isCurrentCall = currentCallRef.current?.callId === data.callId;
      const isIncomingCall = incomingCallRef.current?.callId === data.callId;

      if (isCurrentCall || isIncomingCall) {
        // Store route before clearing states
        const savedRoute = routeBeforeCallRef.current;

        // Clear all call-related states
        setIsVideoCallOpen(false);
        setCurrentCall(null);
        setIncomingCall(null); // Clear incoming call if it exists
        setStreamToken(null);
        setRouteBeforeCall(null);

        // Small delay to ensure modal closes before navigation
        setTimeout(() => {
          if (savedRoute) {
            console.log('📍 Navigating back to route after end:', savedRoute);
            router.push(savedRoute);
          }
        }, 100);
      }
    };

    socketManager.on('incoming_call', handleIncomingCall);
    socketManager.on('call_declined', handleCallDeclined);
    socketManager.on('call_ended', handleCallEnded);

    return () => {
      socketManager.off('incoming_call', handleIncomingCall);
      socketManager.off('call_declined', handleCallDeclined);
      socketManager.off('call_ended', handleCallEnded);
    };
  }, [user]);

  // Handle incoming call from FCM (primary method)
  useEffect(() => {
    if (!user) return;

    // Handle FCM foreground messages
    const handleFCMCall = (data: CallNotificationData) => {
      console.log('📞 Incoming call received via FCM:', data);

      setIncomingCall({
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        callerImage: data.callerImage,
        chatId: data.chatId,
        callType: data.callType
      });
    };

    // Setup FCM listener
    pushNotificationManager.setupFCMListener(handleFCMCall);

    // Handle service worker messages (from notification actions)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      if (type === 'ACCEPT_CALL') {
        console.log('📞 Accept call from notification:', data);
        setIncomingCall({
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerImage: data.callerImage,
          chatId: data.chatId,
          callType: data.callType
        });

        // Auto-accept the call
        setTimeout(() => {
          acceptCall();
        }, 100);
      } else if (type === 'DECLINE_CALL') {
        console.log('📞 Decline call from notification:', data);
        if (data.callId) {
          callAPI.declineCall(data.callId).catch(console.error);
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [user]);

  // Accept incoming call
  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      // Store current route before opening call modal
      setRouteBeforeCall(pathname);
      console.log('📍 Storing route before call:', pathname);

      // Step 1: Get token immediately (cached if available - instant!)
      const tokenPromise = streamAPI.getStreamToken();

      // Step 2: Start backend call (don't wait)
      const acceptPromise = callAPI.acceptCall(incomingCall.callId);

      // Step 3: Wait for both to complete
      const [, token] = await Promise.all([acceptPromise, tokenPromise]);

      console.log('📞 Call accepted:', incomingCall.callId);

      // Step 4: Create Stream.io call and get streamCallType from backend
      const streamCallData = await streamAPI.createStreamCall({
        callId: incomingCall.callId,
        callType: incomingCall.callType,
        members: [incomingCall.callerId],
        video_enabled: incomingCall.callType === 'video'  // Enable video for video calls
      });

      console.log('📞 Stream.io call created with type:', streamCallData.streamCallType);

      // Step 5: Open modal with correct streamCallType from backend response
      setStreamToken(token);
      setCurrentCall({
        callId: incomingCall.callId,
        chatId: incomingCall.chatId,
        callType: incomingCall.callType,


        isInitiator: false,
        streamCallType: streamCallData.streamCallType
      });
      setIncomingCall(null);
      setIsVideoCallOpen(true);

      // Don't navigate - modal is global and works on all pages
      // User can continue on their current page during the call

    } catch (error: any) {
      console.error('Failed to accept call:', error);
      // Close modal on error
      setIsVideoCallOpen(false);
      setCurrentCall(null);
      setStreamToken(null);
      setRouteBeforeCall(null);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to accept call';
      alert(errorMessage);
    }
  };

  // Decline incoming call
  const declineCall = async () => {
    if (!incomingCall) return;

    try {
      await callAPI.declineCall(incomingCall.callId);
      console.log('📞 Call declined:', incomingCall.callId);
      setIncomingCall(null);

    } catch (error) {
      console.error('Failed to decline call:', error);
      setIncomingCall(null);
    }
  };

  // End current call
  const endCall = async () => {
    if (!currentCall) return;

    const callId = currentCall.callId;
    const savedRoute = routeBeforeCallRef.current;

    // Optimistic update - clear state immediately for better UX
    setIsVideoCallOpen(false);
    setCurrentCall(null);
    setStreamToken(null);
    setRouteBeforeCall(null);

    // Small delay to ensure modal closes before navigation
    setTimeout(() => {
      if (savedRoute) {
        console.log('📍 Navigating back to route:', savedRoute);
        router.push(savedRoute);
      }
    }, 100);

    try {
      // Make API call in background (with timeout protection)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('End call API timeout')), 10000)
      );

      await Promise.race([
        callAPI.endCall(callId, { endReason: 'normal' }),
        timeoutPromise
      ]);

      console.log('📞 Call ended successfully:', callId);
    } catch (error) {
      console.error('Failed to end call (state already cleared):', error);
      // State already cleared, so user experience is not affected
    }
  };

  const contextValue: GlobalCallContextType = {
    incomingCall,
    currentCall,
    isVideoCallOpen,
    streamToken,
    acceptCall,
    declineCall,
    endCall,
    setCurrentCall,
    setIsVideoCallOpen,
    setStreamToken,
    setRouteBeforeCall
  };

  return (
    <GlobalCallContext.Provider value={contextValue}>
      {children}

      {/* Incoming Call Modal - Shows on any page */}
      {incomingCall && (
        <IncomingCallModal
          isOpen={true}
          callerName={incomingCall.callerName}
          callerImage={incomingCall.callerImage}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {/* Active Call Modal - Shows on any page */}
      {isVideoCallOpen && currentCall && streamToken && user && (
        <VideoCallModal
          isOpen={isVideoCallOpen}
          onClose={endCall}
          apiKey={process.env.NEXT_PUBLIC_STREAM_API_KEY || 'znpxrpjt6gjn'}
          token={streamToken}
          userId={user._id}
          userName={user.fullName || user.username || 'User'}
          userImage={user.profileImageUrl}
          callId={currentCall.callId}
          callType={currentCall.callType}
          streamCallType={currentCall.streamCallType}
        />
      )}
    </GlobalCallContext.Provider>
  );
};
