# Audio Call Implementation Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Call Flow](#call-flow)
5. [Technical Details](#technical-details)
6. [API Reference](#api-reference)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The audio call system is a comprehensive WebRTC-based solution that enables real-time voice and video communication between users. It integrates with Stream.io for media handling and uses Socket.io for signaling and call management.

### Key Features
- **Voice and Video Calls**: Supports both audio-only and video calls
- **Real-time Communication**: WebRTC peer-to-peer connection with TURN/STUN servers
- **Call Management**: Initiate, accept, decline, and end calls
- **Push Notifications**: FCM-based notifications for incoming calls
- **Global State Management**: Works across all pages via React Context
- **Connection Resilience**: Automatic retry with TURN fallback
- **Ringtone Management**: Audio feedback for incoming/outgoing calls

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ VideoCallModal│  │IncomingCallModal│  │ useVideoCall │   │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  State Management Layer                       │
│              ┌──────────────────────────┐                    │
│              │   GlobalCallProvider     │                    │
│              │  (React Context)         │                    │
│              └──────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────────┐            ┌──────────────────────┐
│   Stream.io SDK      │            │   WebRTC Manager      │
│  (Media Handling)    │            │  (P2P Connection)     │
└──────────────────────┘            └──────────────────────┘
        │                                       │
        └───────────────────┬───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Communication Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ SocketManager│  │  Call API    │  │ Stream API   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Backend API │
                    └───────────────┘
```

### Technology Stack
- **Frontend Framework**: Next.js (App Router)
- **Media SDK**: Stream.io Video React SDK (`@stream-io/video-react-sdk`)
- **WebRTC**: Native browser WebRTC APIs
- **Signaling**: Socket.io client
- **State Management**: React Context API
- **Notifications**: Firebase Cloud Messaging (FCM)

---

## Core Components

### 1. GlobalCallProvider (`src/components/providers/GlobalCallProvider.tsx`)

**Purpose**: Global state management for all call-related operations across the application.

**Key Responsibilities**:
- Manages incoming call state
- Manages active call state
- Handles call acceptance/decline/end
- Integrates with Socket.io for real-time call events
- Integrates with FCM for push notifications
- Renders call modals globally

**State Variables**:
```typescript
interface GlobalCallContextType {
  incomingCall: IncomingCall | null;
  currentCall: CurrentCall | null;
  isVideoCallOpen: boolean;
  streamToken: string | null;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  // ... setters
}
```

**Key Methods**:
- `acceptCall()`: Accepts incoming call, fetches Stream.io token, creates call, opens modal
- `declineCall()`: Declines incoming call via API
- `endCall()`: Ends active call, cleans up resources, navigates back

**Socket Event Listeners**:
- `incoming_call`: Receives call initiation from backend
- `call_declined`: Handles when other party declines
- `call_ended`: Handles when call ends

**FCM Integration**:
- Listens for foreground call notifications
- Handles service worker messages for notification actions (accept/decline)

---

### 2. useVideoCall Hook (`src/hooks/useVideoCall.ts`)

**Purpose**: React hook for initiating calls from chat interface.

**Usage**:
```typescript
const { initiateCall, isInitiating } = useVideoCall({ user });

// Initiate a call
await initiateCall(chat, 'voice'); // or 'video'
```

**Key Features**:
- Parallel token fetching and call initiation for performance
- Automatic Stream.io call creation
- Route preservation before opening call modal
- Error handling with user feedback

**Call Flow**:
1. Get Stream.io token (cached if available)
2. Initiate backend call (parallel)
3. Create Stream.io call
4. Store current route
5. Open call modal

---

### 3. VideoCallModal (`src/components/call/VideoCallModal.tsx`)

**Purpose**: Main UI component for active calls (both voice and video).

**Features**:
- Stream.io SDK integration
- Separate UI for voice vs video calls
- Voice calls: Avatar-based UI with participant cards
- Video calls: Full video layout with SpeakerLayout
- Custom call controls integration
- Auto-cleanup on call end
- Connection state management

**Props**:
```typescript
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
```

**Voice Call UI**:
- Large participant avatars with animated rings
- Mic status indicators
- Speaking/muted status labels
- Hidden SpeakerLayout for audio playback

**Video Call UI**:
- Full-screen video layout
- SpeakerLayout with participant bar
- Video controls

**Lifecycle**:
1. Initialize Stream.io client
2. Get/create call object
3. Join call
4. Enable microphone (and camera for video)
5. Render appropriate UI based on call type
6. Cleanup on unmount/close

---

### 4. WebRTCManager (`src/utils/webrtc.ts`)

**Purpose**: Low-level WebRTC peer connection management (currently not actively used, as Stream.io handles media).

**Note**: This class exists but is primarily for future WebRTC-only implementation. Current implementation uses Stream.io SDK.

**Key Features**:
- RTCPeerConnection management
- ICE candidate handling
- Offer/Answer exchange
- TURN/STUN server configuration
- Connection retry logic
- Call quality stats

**ICE Servers Configuration**:
```typescript
private iceServers: RTCIceServer[] = [
  // Google STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  
  // Custom TURN server
  {
    urls: [
      `turn:${TURN_SERVER_URL}?transport=udp`,
      `turn:${TURN_SERVER_URL}?transport=tcp`
    ],
    username: TURN_USERNAME,
    credential: TURN_PASSWORD
  },
  
  // Backup TURN servers
  {
    urls: [
      'turn:openrelay.metered.ca:80?transport=tcp',
      'turn:openrelay.metered.ca:80?transport=udp',
      'turn:openrelay.metered.ca:443?transport=tcp'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];
```

**Methods**:
- `startCall()`: Initiator side - creates offer
- `prepareForIncomingCall()`: Receiver side - prepares for offer
- `acceptCall()`: Receiver side - processes offer, creates answer
- `sendPendingOffer()`: Sends stored offer after acceptance
- `endCall()`: Cleans up all resources
- `toggleAudio()` / `toggleVideo()`: Media control

---

### 5. SocketManager (`src/utils/socket.ts`)

**Purpose**: Socket.io client for real-time communication and signaling.

**Call-Related Methods**:
```typescript
// Call management
initiateCall(receiverId, chatId, callType, callId)
acceptCall(callId, callerId)
declineCall(callId, callerId)
endCall(callId, participants, endReason)

// WebRTC signaling (if using WebRTC directly)
sendWebRTCOffer(callId, receiverId, offer)
sendWebRTCAnswer(callId, callerId, answer)
sendICECandidate(callId, receiverId, candidate)
```

**Socket Events**:
- `incoming_call`: New call received
- `call_accepted`: Call accepted by receiver
- `call_declined`: Call declined
- `call_ended`: Call ended
- `webrtc_offer`: WebRTC offer received
- `webrtc_answer`: WebRTC answer received
- `webrtc_ice_candidate`: ICE candidate received

**Connection Management**:
- Auto-reconnect with exponential backoff
- Token refresh on auth failure
- Connection state tracking

---

### 6. RingtoneManager (`src/utils/ringtone.ts`)

**Purpose**: Audio feedback for incoming/outgoing calls.

**Features**:
- Plays ringtone audio file (`/audio/ringtone.mp3`)
- Browser beep fallback if audio file unavailable
- Different tones for incoming vs outgoing
- Auto-stop on call acceptance/connection

**Methods**:
```typescript
startRingtone(type: 'outgoing' | 'incoming')
stopRingtone()
isRingtonePlaying(): boolean
setVolume(volume: number)
```

**Browser Beep Fallback**:
- Uses Web Audio API (AudioContext)
- Different frequencies: 440Hz (outgoing) vs 523Hz (incoming)
- Repeats every 2 seconds

---

## Call Flow

### Initiating a Call

```
User clicks call button
    │
    ▼
useVideoCall.initiateCall()
    │
    ├─► Get Stream.io token (parallel)
    │   └─► streamAPI.getStreamToken() [cached if available]
    │
    └─► Initiate backend call (parallel)
        └─► callAPI.initiateCall()
            └─► Backend creates call record
                └─► Backend emits 'incoming_call' via Socket.io
                    └─► Backend sends FCM notification
    │
    ▼
Wait for both promises
    │
    ▼
Create Stream.io call
    └─► streamAPI.createStreamCall()
        └─► Backend creates Stream.io call
            └─► Returns streamCallType
    │
    ▼
Store current route
    │
    ▼
Open VideoCallModal
    └─► Initialize Stream.io client
        └─► Join call
            └─► Enable microphone
                └─► Enable camera (if video)
```

### Receiving a Call

```
Backend emits 'incoming_call' event
    │
    ├─► Socket.io listener (backup)
    │   └─► GlobalCallProvider.handleIncomingCall()
    │
    └─► FCM notification (primary)
        └─► pushNotificationManager.setupFCMListener()
            └─► GlobalCallProvider.handleFCMCall()
    │
    ▼
Show IncomingCallModal
    │
    ├─► User clicks Accept
    │   │
    │   └─► GlobalCallProvider.acceptCall()
    │       │
    │       ├─► Get Stream.io token (parallel)
    │       │
    │       ├─► Accept backend call (parallel)
    │       │   └─► callAPI.acceptCall()
    │       │
    │       └─► Create Stream.io call
    │           └─► streamAPI.createStreamCall()
    │       │
    │       └─► Open VideoCallModal
    │           └─► Join call
    │               └─► Enable microphone
    │
    └─► User clicks Decline
        └─► GlobalCallProvider.declineCall()
            └─► callAPI.declineCall()
```

### During a Call

```
VideoCallModal renders
    │
    ├─► Stream.io SDK manages media
    │   ├─► Microphone stream
    │   ├─► Camera stream (if video)
    │   └─► Remote streams
    │
    ├─► CallControls component
    │   ├─► Toggle audio
    │   ├─► Toggle video
    │   ├─► Switch camera
    │   ├─► Screen share
    │   └─► End call
    │
    └─► Stream.io handles:
        ├─► Peer connection
        ├─► Media encoding/decoding
        ├─► Network adaptation
        └─► Quality monitoring
```

### Ending a Call

```
User clicks End Call
    │
    ▼
VideoCallModal.handleClose()
    │
    ├─► Optimistic UI update (close immediately)
    │
    ├─► call.leave() (Stream.io)
    │
    ├─► client.disconnectUser() (Stream.io)
    │
    └─► GlobalCallProvider.endCall()
        │
        ├─► callAPI.endCall() (backend)
        │
        └─► Navigate back to saved route
```

---

## Technical Details

### Stream.io Integration

**Why Stream.io?**
- Handles WebRTC complexity (ICE, signaling, media)
- Provides TURN servers
- Quality adaptation
- Cross-platform support
- Built-in UI components

**Call Types**:
- `audio_room`: Audio-only call (Stream.io audio room)
- `default`: Standard call (supports video)

**Token Management**:
- Tokens are cached for performance
- Token is fetched in parallel with call initiation
- Token is refreshed when needed

**Call Creation**:
```typescript
// Backend creates Stream.io call
POST /stream/call/create
{
  callId: string,
  callType: 'voice' | 'video',
  members: string[],
  video_enabled: boolean
}

// Response
{
  streamCallType: 'audio_room' | 'default',
  callId: string
}
```

### Socket.io Signaling

**Events Emitted**:
- `call_initiate`: Notify receiver of new call
- `call_accept`: Notify caller of acceptance
- `call_decline`: Notify caller of decline
- `call_end`: Notify participants of call end

**Events Received**:
- `incoming_call`: New call received
- `call_accepted`: Call accepted
- `call_declined`: Call declined
- `call_ended`: Call ended

### FCM Push Notifications

**Notification Payload**:
```typescript
{
  type: 'call',
  callId: string,
  callerId: string,
  callerName: string,
  callerImage?: string,
  chatId: string,
  callType: 'voice' | 'video'
}
```

**Service Worker Actions**:
- `ACCEPT_CALL`: Auto-accepts call
- `DECLINE_CALL`: Declines call

### Route Preservation

**Purpose**: Return user to previous page after call ends.

**Implementation**:
```typescript
// Before opening call
setRouteBeforeCall(pathname);

// After call ends
if (savedRoute) {
  router.push(savedRoute);
}
```

---

## API Reference

### Call API (`src/api/call.ts`)

#### `initiateCall(data: InitiateCallRequest): Promise<Call>`
Initiates a new call.

**Request**:
```typescript
{
  receiverId: string;
  chatId: string;
  callType: 'voice' | 'video';
}
```

**Response**: `Call` object

**Endpoint**: `POST /calls/initiate`

---

#### `acceptCall(callId: string): Promise<Call>`
Accepts an incoming call.

**Endpoint**: `PATCH /calls/:callId/accept`

---

#### `declineCall(callId: string): Promise<Call>`
Declines an incoming call.

**Endpoint**: `PATCH /calls/:callId/decline`

---

#### `endCall(callId: string, data?: EndCallRequest): Promise<Call>`
Ends an active call.

**Request** (optional):
```typescript
{
  endReason?: 'normal' | 'declined' | 'missed' | 'failed' | 'network_error' | 'cancelled';
}
```

**Endpoint**: `PATCH /calls/:callId/end`

---

#### `getCallHistory(page?: number, limit?: number): Promise<CallHistoryResponse>`
Gets call history.

**Endpoint**: `GET /calls/history?page=1&limit=20`

---

#### `getActiveCall(): Promise<Call | null>`
Gets currently active call.

**Endpoint**: `GET /calls/active`

---

### Stream API (`src/api/stream.ts`)

#### `getStreamToken(forceRefresh?: boolean): Promise<string>`
Gets Stream.io user token (cached).

**Endpoint**: `POST /stream/token`

**Caching**: Token is cached until `forceRefresh=true` or logout

---

#### `createStreamCall(data: CreateStreamCallRequest): Promise<CreateStreamCallResponse>`
Creates a Stream.io call.

**Request**:
```typescript
{
  callId: string;
  callType: 'voice' | 'video';
  members: string[];
  video_enabled?: boolean;
}
```

**Response**:
```typescript
{
  streamCallType: 'audio_room' | 'default';
  callId: string;
}
```

**Endpoint**: `POST /stream/call/create`

---

## Configuration

### Environment Variables

```env
# Stream.io
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key

# TURN Server (for WebRTC fallback)
NEXT_PUBLIC_TURN_SERVER_URL=your_turn_server_url
NEXT_PUBLIC_TURN_SERVER_USERNAME=your_turn_username
NEXT_PUBLIC_TURN_SERVER_PASSWORD=your_turn_password

# Backend API
NEXT_PUBLIC_API_BASE_URL=your_backend_url
```

### Stream.io Setup

1. Create Stream.io account
2. Get API key and secret
3. Configure backend to generate tokens:
   ```typescript
   import { StreamClient } from '@stream-io/node-sdk';
   
   const streamClient = new StreamClient(
     process.env.STREAM_API_KEY,
     process.env.STREAM_API_SECRET
   );
   
   const token = streamClient.createToken(userId);
   ```

### TURN Server Setup (Optional)

For WebRTC-only implementation or fallback:
1. Set up TURN server (e.g., coturn)
2. Configure environment variables
3. Test connectivity

---

## Troubleshooting

### Common Issues

#### 1. Call Not Connecting

**Symptoms**: Call modal shows "Connecting..." indefinitely

**Solutions**:
- Check Stream.io token is valid
- Verify backend call creation succeeded
- Check browser console for errors
- Verify microphone/camera permissions

**Debug Steps**:
```typescript
// Check Stream.io client
console.log('Client:', client);
console.log('Call:', call);
console.log('Call state:', call.state.callingState);
```

---

#### 2. No Audio/Video

**Symptoms**: Call connects but no media

**Solutions**:
- Check browser permissions (Settings > Privacy > Microphone/Camera)
- Verify Stream.io token has correct permissions
- Check browser console for media errors
- Try different browser

**Debug Steps**:
```typescript
// Check microphone state
console.log('Mic enabled:', call.microphone.state.status);
console.log('Camera enabled:', call.camera.state.status);

// Check published tracks
console.log('Published tracks:', call.state.localParticipant.publishedTracks);
```

---

#### 3. Incoming Call Not Received

**Symptoms**: Call initiated but receiver doesn't see notification

**Solutions**:
- Check Socket.io connection: `socketManager.isSocketConnected()`
- Verify FCM setup and permissions
- Check backend is emitting `incoming_call` event
- Check browser console for socket errors

**Debug Steps**:
```typescript
// Check socket connection
console.log('Socket connected:', socketManager.isSocketConnected());

// Listen for incoming_call
socketManager.on('incoming_call', (data) => {
  console.log('Incoming call received:', data);
});
```

---

#### 4. Call Modal Not Closing

**Symptoms**: Call ends but modal remains open

**Solutions**:
- Check `onClose` callback is called
- Verify Stream.io cleanup (`call.leave()`, `client.disconnectUser()`)
- Check for errors in cleanup process

**Debug Steps**:
```typescript
// Add logging to handleClose
console.log('Closing call...');
console.log('Call state:', call.state.callingState);
```

---

#### 5. Token Fetch Failures

**Symptoms**: "Failed to fetch Stream.io token" error

**Solutions**:
- Verify backend `/stream/token` endpoint works
- Check authentication token is valid
- Verify Stream.io API key/secret configured
- Check network connectivity

---

### Debugging Tips

1. **Enable Verbose Logging**:
   - Uncomment console.log statements in WebRTCManager
   - Add logging to GlobalCallProvider methods

2. **Check Stream.io Dashboard**:
   - Monitor call sessions
   - Check token validity
   - View call analytics

3. **Browser DevTools**:
   - Network tab: Check API calls
   - Console: Check for errors
   - Application > Permissions: Verify media permissions

4. **Socket.io Debug**:
   ```typescript
   // Enable Socket.io debug logging
   localStorage.debug = 'socket.io-client:*';
   ```

---

## File Structure

```
src/
├── components/
│   ├── call/
│   │   ├── VideoCallModal.tsx       # Main call UI
│   │   ├── IncomingCallModal.tsx    # Incoming call UI
│   │   └── CallControls.tsx         # Call control buttons
│   └── providers/
│       └── GlobalCallProvider.tsx   # Global call state
├── hooks/
│   └── useVideoCall.ts              # Call initiation hook
├── api/
│   ├── call.ts                      # Call API endpoints
│   └── stream.ts                    # Stream.io API
├── utils/
│   ├── socket.ts                    # Socket.io manager
│   ├── webrtc.ts                    # WebRTC manager (future use)
│   └── ringtone.ts                  # Ringtone manager
└── utils/
    └── pushNotifications.ts         # FCM integration
```

---

## Future Enhancements

1. **Screen Sharing**: Already implemented in CallControls, can be enhanced
2. **Call Recording**: Stream.io supports recording
3. **Group Calls**: Extend to support multiple participants
4. **Call Quality Metrics**: Real-time quality indicators
5. **Call History UI**: Display call history in UI
6. **Call Notifications**: Enhanced notification handling
7. **WebRTC Fallback**: Use WebRTCManager if Stream.io fails

---

## Additional Resources

- [Stream.io Video SDK Documentation](https://getstream.io/video/docs/)
- [WebRTC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.io Client Documentation](https://socket.io/docs/v4/client-api/)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)

---

**Last Updated**: Based on current codebase analysis
**Version**: 1.0.0

