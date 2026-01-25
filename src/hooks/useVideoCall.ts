import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { callAPI } from '@/api/call';
import { streamAPI } from '@/api/stream';
import { Chat } from '@/api/message';
import { useGlobalCall } from '@/components/providers/GlobalCallProvider';

interface UseVideoCallProps {
  user: any;
  onSubscriptionRequired?: () => void;
}

export const useVideoCall = ({ user, onSubscriptionRequired }: UseVideoCallProps) => {
  const [isInitiating, setIsInitiating] = useState(false);
  const pathname = usePathname();

  // Use global call state from the provider
  const {
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
  } = useGlobalCall();

  // Initiate a call
  const initiateCall = useCallback(async (chat: Chat, callType: 'voice' | 'video') => {
    if (!user || chat.chatType !== 'direct') return;

    try {
      // Set initiating state immediately for button feedback
      setIsInitiating(true);

      // Get the other participant
      const otherParticipant = chat.participants.find((p: any) => p._id !== user._id);
      if (!otherParticipant) {
        console.error('No other participant found');
        setIsInitiating(false);
        return;
      }

      // Step 1: Get token immediately (cached if available - instant!)
      const tokenPromise = streamAPI.getStreamToken();

      // Step 2: Start backend call (don't wait)
      const callPromise = callAPI.initiateCall({
        receiverId: otherParticipant._id,
        chatId: chat._id,
        callType
      });

      // Step 3: Wait for both to complete
      const [call, token] = await Promise.all([callPromise, tokenPromise]);

      console.log('📞 Call initiated:', call);

      // Step 4: Create Stream.io call and get streamCallType from backend
      const streamCallData = await streamAPI.createStreamCall({
        callId: call._id,
        callType,
        members: [otherParticipant._id],
        video_enabled: callType === 'video'  // Enable video for video calls
      });

      console.log('📞 Stream.io call created with type:', streamCallData.streamCallType);

      // Step 5: Store current route before opening modal
      setRouteBeforeCall(pathname);
      console.log('📍 Storing route before call:', pathname);

      // Step 6: Open modal with correct streamCallType from backend response
      setStreamToken(token);
      setCurrentCall({
        callId: call._id,
        chatId: chat._id,
        callType,
        isInitiator: true,
        streamCallType: streamCallData.streamCallType  // ✅ Use backend's streamCallType, not hardcoded
      });
      setIsVideoCallOpen(true);

      // Reset initiating state after call is successfully opened
      setIsInitiating(false);

    } catch (error: any) {
      console.error('Failed to initiate call:', error);

      // Check if it's a subscription error
      if (error?.isSubscriptionError) {
        console.log('Subscription required for calling');
        onSubscriptionRequired?.();
      } else {
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to initiate call';
        alert(errorMessage);
      }

      // Close modal on error
      setIsVideoCallOpen(false);
      setCurrentCall(null);
      setStreamToken(null);
      setRouteBeforeCall(null);
      setIsInitiating(false);
    }
  }, [user, pathname, setCurrentCall, setIsVideoCallOpen, setStreamToken, setRouteBeforeCall]);

  return {
    isVideoCallOpen,
    incomingCall,
    currentCall,
    streamToken,
    isInitiating,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    setIsVideoCallOpen
  };
};
