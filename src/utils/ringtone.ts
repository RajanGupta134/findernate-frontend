class RingtoneManager {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio('/audio/ringtone.mp3');
      this.audio.loop = true;
      this.audio.volume = 0.7;
      this.audio.preload = 'auto'; // Preload audio for instant playback
      
      // Handle audio loading errors gracefully
      this.audio.onerror = () => {
        console.warn('Ringtone audio file not found. Using browser beep as fallback.');
        this.audio = null;
      };
      
      // Preload the audio file immediately
      this.audio.load();
    }
  }

  async startRingtone(type: 'outgoing' | 'incoming' = 'outgoing') {
    if (this.isPlaying) return;

    try {
      // Request audio permissions if needed
      if (this.audio) {
        //console.log(`🔔 Starting ${type} ringtone`);
        this.isPlaying = true;
        await this.audio.play();
      } else {
        // Fallback: Use browser beep
        this.playBrowserBeep(type);
      }
    } catch (error) {
      console.warn('Failed to play ringtone:', error);
      // Fallback: Use browser beep
      this.playBrowserBeep(type);
    }
  }

  stopRingtone() {
    if (!this.isPlaying) {
      //console.log('🔕 Ringtone already stopped');
      return;
    }

    //console.log('🔕 Stopping ringtone');
    this.isPlaying = false;

    // Stop HTML audio
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      //console.log('🔕 HTML audio stopped');
    }

    // Clear any browser beep intervals
    this.stopBrowserBeep();
    //console.log('🔕 Browser beep stopped');
  }

  // Fallback browser beep using AudioContext
  private beepInterval: NodeJS.Timeout | null = null;
  private audioContext: AudioContext | null = null;

  private playBrowserBeep(type: 'outgoing' | 'incoming') {
    if (typeof window === 'undefined') return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isPlaying = true;

      const playBeep = () => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);
        
        // Different tones for outgoing vs incoming
        const frequency = type === 'outgoing' ? 440 : 523; // A4 vs C5
        oscillator.frequency.setValueAtTime(frequency, this.audioContext!.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.5);
        
        oscillator.start(this.audioContext!.currentTime);
        oscillator.stop(this.audioContext!.currentTime + 0.5);
      };

      // Play immediately then repeat every 2 seconds
      playBeep();
      this.beepInterval = setInterval(playBeep, 2000);
      
      //console.log(`🔔 Playing browser beep for ${type} call`);
    } catch (error) {
      console.warn('Failed to create browser beep:', error);
    }
  }

  private stopBrowserBeep() {
    if (this.beepInterval) {
      clearInterval(this.beepInterval);
      this.beepInterval = null;
      //console.log('🔕 Browser beep interval cleared');
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
        //console.log('🔕 AudioContext closed');
      } catch (error) {
        console.warn('Error closing AudioContext:', error);
      }
      this.audioContext = null;
    }
  }

  // Check if ringtone is currently playing
  isRingtonePlaying(): boolean {
    return this.isPlaying;
  }

  // Set ringtone volume (0-1)
  setVolume(volume: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }
}

// Export singleton instance
export const ringtoneManager = new RingtoneManager();