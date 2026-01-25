# Audio Transmission During Audio Calls (Camera Disabled)

## Overview

This document explains how audio is transmitted during audio calls when the camera is disabled. The system uses **Stream.io SDK** which handles audio and video tracks **independently**, allowing audio to work perfectly even when the camera is disabled.

---

## Key Principle: Independent Media Tracks

**Stream.io SDK treats audio and video as separate, independent tracks.** This means:
- ✅ Audio can be enabled/disabled independently of video
- ✅ Video can be enabled/disabled independently of audio
- ✅ Disabling camera does NOT affect audio transmission
- ✅ Audio tracks are published separately from video tracks

---

## Audio Transmission Flow

### 1. Call Initialization

When a call starts (voice or video), the following sequence occurs:

```typescript
// Location: src/components/call/VideoCallModal.tsx (lines 396-430)

// Step 1: Join the Stream.io call
await videoCall.join({ create: false });

// Step 2: Enable microphone (ALWAYS, regardless of call type)
await videoCall.microphone.enable();
console.log('📞 Microphone enabled');

// Step 3: Enable camera (ONLY for video calls)
if (callType === 'video') {
  await videoCall.camera.enable({ facingMode: 'user' });
} else {
  // For voice calls, camera is NEVER enabled
  // Audio continues to work normally
}
```

**Key Points:**
- Microphone is **always enabled** after joining, regardless of call type
- Camera is **only enabled** if `callType === 'video'`
- For voice calls (`callType === 'voice'`), camera is **never requested**

---

### 2. Stream.io SDK Internal Handling

When `videoCall.microphone.enable()` is called:

```typescript
// Stream.io SDK internally:
1. Requests microphone permission from browser
2. Gets audio stream via getUserMedia({ audio: true })
3. Creates audio track
4. Publishes audio track to Stream.io servers
5. Audio track is sent to other participants via WebRTC
```

**Important:** Stream.io SDK does NOT request video when enabling microphone. The constraints are separate:

```javascript
// When microphone.enable() is called:
navigator.mediaDevices.getUserMedia({ 
  audio: true,  // ✅ Audio requested
  video: false  // ❌ Video NOT requested
})

// When camera.enable() is called:
navigator.mediaDevices.getUserMedia({ 
  audio: false, // ❌ Audio NOT requested (already have it)
  video: true   // ✅ Video requested
})
```

---

### 3. Audio Track Publishing

Stream.io SDK publishes tracks independently:

```typescript
// Location: src/components/call/VideoCallModal.tsx (lines 408-411)

// Debug: Check if audio track is publishing
const localParticipant = videoCall.state.localParticipant;
console.log('📞 Publishing tracks:', localParticipant?.publishedTracks);

// Output example:
// publishedTracks: ['audio']  // For voice calls
// publishedTracks: ['audio', 'video']  // For video calls
```

**Track States:**
- `publishedTracks` array contains `'audio'` when microphone is enabled
- `publishedTracks` array contains `'video'` when camera is enabled
- These are **independent** - disabling camera removes `'video'` but keeps `'audio'`

---

### 4. Audio Call UI (Camera Disabled)

For voice calls, the UI shows avatars instead of video:

```typescript
// Location: src/components/call/VideoCallModal.tsx (lines 171-251)

if (callType === 'voice') {
  return (
    <div>
      {/* Hidden SpeakerLayout for audio playback */}
      <div className="absolute inset-0 opacity-0 pointer-events-none">
        <SpeakerLayout participantsBarPosition="top" />
      </div>

      {/* Visible: Participant avatars */}
      {participants.map((participant) => (
        <div>
          {/* Avatar with mic status indicator */}
          <div className={participant.audioStream ? 'bg-green-500' : 'bg-red-500'}>
            {participant.audioStream ? <Mic /> : <MicOff />}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Key Points:**
- `SpeakerLayout` is hidden but still renders (handles audio playback)
- UI shows participant avatars with mic status
- `participant.audioStream` indicates if audio is being received
- Camera is never shown or requested

---

### 5. Toggling Camera During Video Calls

If you disable camera during a video call, audio continues:

```typescript
// Location: src/components/call/VideoCallModal.tsx (lines 46-52)

const handleToggleVideo = async () => {
  if (camera.enabled) {
    await camera.disable();  // ❌ Stops video track
    // ✅ Audio track continues working
  } else {
    await camera.enable();  // ✅ Starts video track
    // ✅ Audio track still working
  }
};
```

**What Happens:**
1. `camera.disable()` stops the video track
2. Video track is removed from `publishedTracks`
3. Audio track remains in `publishedTracks`
4. Audio transmission continues normally
5. Remote participants still receive your audio

---

## Technical Details

### Stream.io SDK Media Management

Stream.io SDK uses separate managers for audio and video:

```typescript
// Microphone Manager (independent)
videoCall.microphone.enable()   // Starts audio track
videoCall.microphone.disable()   // Stops audio track
videoCall.microphone.state       // Audio track state

// Camera Manager (independent)
videoCall.camera.enable()        // Starts video track
videoCall.camera.disable()      // Stops video track
videoCall.camera.state           // Video track state
```

**State Objects:**
```typescript
microphone.state = {
  status: 'enabled' | 'disabled',
  hasBrowserPermission: boolean,
  deviceId?: string,
  // ... other audio-specific state
}

camera.state = {
  status: 'enabled' | 'disabled',
  hasBrowserPermission: boolean,
  deviceId?: string,
  facingMode?: 'user' | 'environment',
  // ... other video-specific state
}
```

---

### Browser MediaStream API

Under the hood, Stream.io uses browser's `MediaStream` API:

```javascript
// Audio-only stream (voice calls)
const audioStream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: false  // ✅ Explicitly disabled
});

// Audio track is separate from video track
const audioTrack = audioStream.getAudioTracks()[0];
// audioTrack.kind === 'audio'
// audioTrack.enabled === true
```

**Track Independence:**
- Audio tracks and video tracks are separate objects
- Each track has its own `enabled` property
- Disabling one doesn't affect the other

---

### WebRTC Peer Connection

Stream.io SDK uses WebRTC internally:

```javascript
// Stream.io creates RTCPeerConnection
const peerConnection = new RTCPeerConnection(config);

// Audio track added separately
peerConnection.addTrack(audioTrack, audioStream);
// ✅ Audio track in peer connection

// Video track added separately (if enabled)
if (videoTrack) {
  peerConnection.addTrack(videoTrack, videoStream);
  // ✅ Video track in peer connection
}

// Removing video track doesn't affect audio
peerConnection.removeTrack(videoTrack);
// ✅ Audio track still in peer connection
```

---

## Code Flow Diagram

### Voice Call (Camera Never Enabled)

```
User initiates voice call
    │
    ▼
VideoCallModal.initializeCall()
    │
    ├─► videoCall.join()
    │
    ├─► videoCall.microphone.enable()
    │   │
    │   ├─► Browser: getUserMedia({ audio: true, video: false })
    │   │
    │   ├─► Stream.io: Create audio track
    │   │
    │   ├─► Stream.io: Publish audio track
    │   │
    │   └─► WebRTC: Add audio track to peer connection
    │
    └─► Camera NOT enabled (callType === 'voice')
        │
        └─► Audio continues transmitting ✅
```

### Video Call with Camera Disabled

```
User disables camera during video call
    │
    ▼
CallControls.handleToggleVideo()
    │
    ├─► camera.disable()
    │   │
    │   ├─► Browser: Stop video track
    │   │
    │   ├─► Stream.io: Unpublish video track
    │   │
    │   └─► WebRTC: Remove video track from peer connection
    │
    └─► Microphone still enabled
        │
        └─► Audio continues transmitting ✅
```

---

## Verification & Debugging

### Check Audio Transmission

```typescript
// In browser console during call:

// 1. Check microphone state
console.log('Microphone:', videoCall.microphone.state);
// Should show: { status: 'enabled', ... }

// 2. Check published tracks
console.log('Published tracks:', videoCall.state.localParticipant.publishedTracks);
// Should include: ['audio']

// 3. Check remote participants receiving audio
const remoteParticipants = videoCall.state.remoteParticipants;
remoteParticipants.forEach(p => {
  console.log(`${p.name} audio stream:`, p.audioStream);
  // Should show: MediaStream object if audio is being received
});

// 4. Check camera state (should be disabled for voice calls)
console.log('Camera:', videoCall.camera.state);
// For voice calls: { status: 'disabled', ... }
```

### Check Audio Track in Browser

```javascript
// In browser DevTools > Application > Media Streams

// You should see:
// - Audio track: enabled, active
// - Video track: (none for voice calls, or disabled for video calls with camera off)
```

---

## Common Scenarios

### Scenario 1: Voice Call (Camera Never Enabled)

**What Happens:**
1. ✅ Microphone is enabled
2. ✅ Audio track is published
3. ❌ Camera is never requested
4. ✅ Audio transmits normally

**Code Path:**
```typescript
// VideoCallModal.tsx line 419
if (callType === 'video') {
  await videoCall.camera.enable();  // ❌ NOT executed for voice calls
}
// Audio already enabled at line 398 ✅
```

---

### Scenario 2: Video Call → Disable Camera

**What Happens:**
1. ✅ Microphone is enabled
2. ✅ Camera is enabled initially
3. User clicks "Disable Camera"
4. ❌ Camera is disabled
5. ✅ Audio continues transmitting

**Code Path:**
```typescript
// CallControlsWrapper.tsx line 46-52
const handleToggleVideo = async () => {
  if (camera.enabled) {
    await camera.disable();  // ❌ Stops video
    // ✅ Audio still enabled (separate track)
  }
};
```

---

### Scenario 3: Video Call → Disable Camera → Re-enable Camera

**What Happens:**
1. ✅ Microphone enabled
2. ✅ Camera enabled
3. User disables camera → ❌ Video stops, ✅ Audio continues
4. User re-enables camera → ✅ Video resumes, ✅ Audio still working

**Code Path:**
```typescript
// Camera and microphone are independent
await camera.disable();   // Video off
await camera.enable();    // Video on
// Microphone state unchanged ✅
```

---

## Important Notes

### 1. Stream.io SDK Independence

Stream.io SDK is designed with audio/video independence:
- Each media type has its own manager
- Enabling/disabling one doesn't affect the other
- Tracks are published/unpublished independently

### 2. Browser Permissions

Browser permissions are separate:
- Microphone permission: Required for audio
- Camera permission: Required for video
- Denying camera permission doesn't affect microphone

### 3. Network Bandwidth

When camera is disabled:
- ✅ Audio bandwidth: ~50-100 kbps (continues)
- ❌ Video bandwidth: 0 kbps (saved)
- Total bandwidth reduced, improving call quality

### 4. Call Type vs Camera State

- **Voice calls**: Camera is never enabled (by design)
- **Video calls**: Camera can be toggled on/off
- **Audio transmission**: Works in both cases

---

## Troubleshooting

### Issue: No Audio During Voice Call

**Check:**
1. Microphone permission granted?
   ```typescript
   console.log(videoCall.microphone.state.hasBrowserPermission);
   ```

2. Microphone enabled?
   ```typescript
   console.log(videoCall.microphone.state.status);
   // Should be 'enabled'
   ```

3. Audio track published?
   ```typescript
   console.log(videoCall.state.localParticipant.publishedTracks);
   // Should include 'audio'
   ```

### Issue: Audio Stops When Disabling Camera

**This should NOT happen.** If it does:

1. Check if microphone was accidentally disabled:
   ```typescript
   console.log(videoCall.microphone.state.status);
   ```

2. Check published tracks:
   ```typescript
   console.log(videoCall.state.localParticipant.publishedTracks);
   // Should still include 'audio'
   ```

3. Verify Stream.io SDK version (should be latest)

---

## Summary

**Audio transmission during audio calls (camera disabled) works because:**

1. ✅ **Stream.io SDK treats audio and video as independent tracks**
2. ✅ **Microphone is enabled separately from camera**
3. ✅ **Audio track is published independently of video track**
4. ✅ **Disabling camera only affects video track, not audio**
5. ✅ **Browser MediaStream API supports independent track management**
6. ✅ **WebRTC peer connection handles tracks separately**

**Key Code Locations:**
- `src/components/call/VideoCallModal.tsx` (lines 396-430): Call initialization
- `src/components/call/VideoCallModal.tsx` (lines 171-251): Voice call UI
- `src/components/call/VideoCallModal.tsx` (lines 32-91): CallControlsWrapper
- `src/components/call/CallControls.tsx`: Toggle controls

**Bottom Line:** Audio transmission is completely independent of camera state. Disabling camera (or never enabling it for voice calls) does NOT affect audio transmission in any way.

---

**Last Updated**: Based on current codebase analysis
**Version**: 1.0.0

