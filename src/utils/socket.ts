import { io, Socket } from 'socket.io-client';
import { Message } from '@/api/message';

class SocketManager {
  private socket: Socket | null = null;
  private isConnected = false;
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private authFailureCount = 0;
  private maxAuthFailures = 3;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    if (!token) {
      console.warn('Socket connection attempted without token');
      return;
    }

    // Clear any pending reconnection attempts
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    const serverUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (!serverUrl) {
      console.error('❌ NEXT_PUBLIC_API_BASE_URL environment variable is not set. Cannot establish socket connection.');
      this.emit('connection_error', new Error('Server URL not configured'));
      return;
    }
    
    //console.log(`Attempting socket connection (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.socket = io(serverUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
  }

  private reconnectWithFreshToken() {
    this.authFailureCount++;
    
    // Check if we've exceeded maximum authentication failures
    if (this.authFailureCount >= this.maxAuthFailures) {
      console.error(`Maximum authentication failures (${this.maxAuthFailures}) reached. Stopping reconnection attempts.`);
      this.emit('auth_failure_permanent', { 
        message: 'Authentication failed permanently. Please log in again.' 
      });
      this.reset();
      return;
    }

    // Check if we've exceeded maximum reconnection attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection.`);
      this.emit('connection_failed_permanent', {
        message: 'Failed to establish connection after multiple attempts'
      });
      this.reset();
      return;
    }

    // Disconnect current socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }

    // Import userStore dynamically to avoid circular dependencies
    import('@/store/useUserStore').then(({ useUserStore }) => {
      const validToken = useUserStore.getState().validateAndGetToken();
      
      if (!validToken) {
        console.error('No valid token available for reconnection. Stopping attempts.');
        this.emit('auth_failure_permanent', { 
          message: 'No valid authentication token available' 
        });
        this.reset();
        return;
      }

      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
      
      //console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeoutId = setTimeout(() => {
        this.connect(validToken);
      }, delay);
    }).catch(error => {
      console.error('Failed to import userStore:', error);
      this.reset();
    });
  }

  private reset() {
    this.reconnectAttempts = 0;
    this.authFailureCount = 0;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      //console.log('Successfully connected to server');
      this.isConnected = true;
      
      // Reset counters on successful connection
      this.reconnectAttempts = 0;
      this.authFailureCount = 0;
      this.reconnectDelay = 1000; // Reset delay
      
      if (this.reconnectTimeoutId) {
        clearTimeout(this.reconnectTimeoutId);
        this.reconnectTimeoutId = null;
      }
      
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', () => {
      //console.log('Disconnected from server');
      this.isConnected = false;
      this.emit('connection_status', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      
      // Handle authentication errors specifically
      if (error.message?.includes('Authentication error') || error.message?.includes('Invalid token')) {
        console.warn('Socket authentication failed - token may be expired');
        this.reconnectWithFreshToken();
      } else {
        // For non-auth errors, try regular reconnection with backoff
        this.reconnectAttempts++;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
          //console.log(`Reconnecting after connection error in ${delay}ms`);
          
          this.reconnectTimeoutId = setTimeout(() => {
            import('@/store/useUserStore').then(({ useUserStore }) => {
              const token = useUserStore.getState().validateAndGetToken();
              if (token) {
                this.connect(token);
              }
            });
          }, delay);
        } else {
          console.error('Maximum connection attempts reached');
          this.emit('connection_failed_permanent', { message: 'Connection failed permanently' });
        }
      }
      
      this.emit('connection_error', error);
    });

    // Handle authentication errors that come through as regular socket events
    this.socket.on('error', (error) => {
      console.error('Socket error event:', error);
      if (error.message?.includes('Authentication error') || error.message?.includes('Invalid token')) {
        console.warn('Socket authentication error received');
        this.reconnectWithFreshToken();
      }
    });

    // Message events
    this.socket.on('new_message', (data: { chatId: string; message: Message }) => {
      this.emit('new_message', data);
    });

    this.socket.on('messages_read', (data: { chatId: string; readBy: any; messageIds?: string[] }) => {
      this.emit('messages_read', data);
    });

    this.socket.on('message_deleted', (data: { chatId: string; messageId: string; deletedBy: any }) => {
      this.emit('message_deleted', data);
    });

    // New deletion events for messaging features
    this.socket.on('message_deleted_for_everyone', (data: { chatId: string; messageId: string; deletedBy: any; deletedAt: string }) => {
      this.emit('message_deleted_for_everyone', data);
    });

    this.socket.on('message_deleted_for_me', (data: { chatId: string; messageId: string }) => {
      this.emit('message_deleted_for_me', data);
    });

    // Message delivery status events
    this.socket.on('messages_delivered', (data: { messageIds: string[]; deliveredTo: any; deliveredAt: string }) => {
      this.emit('messages_delivered', data);
    });

    this.socket.on('message_restored', (data: { chatId: string; messageId: string; restoredMessage: Message; restoredBy: any }) => {
      this.emit('message_restored', data);
    });

    // Typing events
    this.socket.on('user_typing', (data: { userId: string; username: string; fullName: string; chatId: string }) => {
      this.emit('user_typing', data);
    });

    this.socket.on('user_stopped_typing', (data: { userId: string; chatId: string }) => {
      this.emit('user_stopped_typing', data);
    });

    // Online status events
    this.socket.on('user_status_changed', (data: { userId: string; status: string; timestamp: string }) => {
      this.emit('user_status_changed', data);
    });

    this.socket.on('user_offline', (data: { userId: string; timestamp: string; lastSeenAt?: string }) => {
      this.emit('user_offline', data);
    });

    // ===== CHAT REQUEST EVENT LISTENERS =====

    // Chat request declined event
    this.socket.on('chat_request_declined', (data: { chatId: string; declinedBy: { _id: string; username: string; fullName: string } }) => {
      this.emit('chat_request_declined', data);
    });

    // Chat request accepted event
    this.socket.on('chat_request_accepted', (data: { chatId: string; acceptedBy: { _id: string; username: string; fullName: string } }) => {
      this.emit('chat_request_accepted', data);
    });

    // ===== CALL EVENT LISTENERS =====
    
    // Call management events
    this.socket.on('incoming_call', (data) => {
      console.log('📞 [SocketManager] Received incoming_call event from backend:', data);
      this.emit('incoming_call', data);
      console.log('✅ [SocketManager] incoming_call event emitted to app listeners');
    });

    this.socket.on('call_accepted', (data) => {
      this.emit('call_accepted', data);
    });

    this.socket.on('call_declined', (data) => {
      this.emit('call_declined', data);
    });

    this.socket.on('call_ended', (data) => {
      this.emit('call_ended', data);
    });

    this.socket.on('call_status_update', (data) => {
      this.emit('call_status_update', data);
    });

    // WebRTC signaling events
    this.socket.on('webrtc_offer', (data) => {
      //console.log('🔄 Socket: Received WebRTC offer event:', data.callId, 'from:', data.senderId);
      this.emit('webrtc_offer', data);
    });

    this.socket.on('webrtc_answer', (data) => {
      //console.log('🔄 Socket: Received WebRTC answer event:', data.callId, 'from:', data.senderId);
      this.emit('webrtc_answer', data);
    });

    this.socket.on('webrtc_ice_candidate', (data) => {
      //console.log('🔄 Socket: Received ICE candidate event:', data.callId, 'from:', data.senderId);
      this.emit('webrtc_ice_candidate', data);
    });
  }

  // Join a chat room
  joinChat(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_chat', chatId);
    }
  }

  // Leave a chat room
  leaveChat(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_chat', chatId);
    }
  }

  // Send a message through socket (for immediate UI update)
  sendMessage(chatId: string, message: string, messageType = 'text', replyTo?: string) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', {
        chatId,
        message,
        messageType,
        replyTo
      });
    }
  }

  // Start typing
  startTyping(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { chatId });
    }
  }

  // Stop typing
  stopTyping(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { chatId });
    }
  }

  // Mark messages as read
  markRead(chatId: string, messageIds?: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('mark_read', { chatId, messageIds });
    }
  }

  // Delete message (legacy - defaults to delete for everyone)
  deleteMessage(chatId: string, messageId: string) {
    if (this.socket?.connected) {
      this.socket.emit('delete_message', { chatId, messageId, deleteType: 'for_everyone' });
    }
  }

  // Delete message for everyone (24-hour time limit)
  deleteMessageForEveryone(chatId: string, messageId: string) {
    if (this.socket?.connected) {
      this.socket.emit('delete_message', { chatId, messageId, deleteType: 'for_everyone' });
    }
  }

  // Delete message for me only (no time limit)
  deleteMessageForMe(chatId: string, messageId: string) {
    if (this.socket?.connected) {
      this.socket.emit('delete_message', { chatId, messageId, deleteType: 'for_me' });
    }
  }

  // Confirm delivery of messages
  confirmDelivery(messageIds: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('confirm_delivery', { messageIds });
    }
  }

  // Restore message
  restoreMessage(chatId: string, messageId: string, restoredMessage: Message) {
    if (this.socket?.connected) {
      this.socket.emit('restore_message', { chatId, messageId, restoredMessage });
    }
  }

  // Set online status
  setOnlineStatus(status: string) {
    if (this.socket?.connected) {
      this.socket.emit('set_online_status', status);
    }
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  disconnect() {
    this.reset();
    this.eventListeners.clear();
  }

  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }

  isReady() {
    return this.isSocketConnected();
  }

  // Check if a user is online (placeholder - would need backend implementation)
  isUserOnline(userId: string): boolean {
    // This would typically check against a list of online users from the server
    // For now, return false as placeholder
    return false;
  }

  // Emit events to specific chat room
  emitToChat(chatId: string, event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit('chat_event', {
        chatId,
        event,
        data
      });
    }
  }

  // ===== CALL SIGNALING METHODS =====
  
  // Call management
  initiateCall(receiverId: string, chatId: string, callType: string, callId: string) {
    console.log('📤 [SocketManager] initiateCall called:', { receiverId, chatId, callType, callId, connected: this.socket?.connected });

    if (this.socket?.connected) {
      this.socket.emit('call_initiate', { receiverId, chatId, callType, callId });
      console.log('✅ [SocketManager] call_initiate event emitted to backend');
    } else {
      console.error('❌ [SocketManager] Cannot initiate call - socket not connected');
    }
  }

  acceptCall(callId: string, callerId: string) {
    if (this.socket?.connected) {
      this.socket.emit('call_accept', { callId, callerId });
    }
  }

  declineCall(callId: string, callerId: string) {
    if (this.socket?.connected) {
      this.socket.emit('call_decline', { callId, callerId });
    }
  }

  endCall(callId: string, participants: string[], endReason: string = 'normal') {
    if (this.socket?.connected) {
      this.socket.emit('call_end', { callId, participants, endReason });
    }
  }

  // WebRTC signaling
  sendWebRTCOffer(callId: string, receiverId: string, offer: RTCSessionDescriptionInit) {
    if (this.socket?.connected) {
      //console.log('🔄 Socket: Sending WebRTC offer via socket to receiver:', receiverId);
      this.socket.emit('webrtc_offer', { callId, receiverId, offer });
      //console.log('🔄 Socket: WebRTC offer emitted successfully');
    } else {
      console.error('❌ Socket: Cannot send WebRTC offer - socket not connected');
    }
  }

  sendWebRTCAnswer(callId: string, callerId: string, answer: RTCSessionDescriptionInit) {
    if (this.socket?.connected) {
      this.socket.emit('webrtc_answer', { callId, callerId, answer });
    }
  }

  sendICECandidate(callId: string, receiverId: string, candidate: any) {
    if (this.socket?.connected) {
      this.socket.emit('webrtc_ice_candidate', { callId, receiverId, candidate });
    }
  }

  updateCallStatus(callId: string, participants: string[], status: string, metadata?: any) {
    if (this.socket?.connected) {
      this.socket.emit('call_status_update', { callId, participants, status, metadata });
    }
  }
}

// Export singleton instance
export const socketManager = new SocketManager();
export default socketManager;