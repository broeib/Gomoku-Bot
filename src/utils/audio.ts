// Safe Storage Helper
function getStoredValue(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function setStoredValue(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Check localStorage for sound preference
    const saved = getStoredValue('gomoku_sound_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    setStoredValue('gomoku_sound_muted', String(this.isMuted));
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    setStoredValue('gomoku_sound_muted', String(muted));
  }

  // Realistic wooden board stone clack sound
  public playStoneSound() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // 1. High transient impact click
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      const clickFilter = this.ctx.createBiquadFilter();

      clickOsc.type = 'triangle';
      const baseFreq = 380 + (Math.random() * 80 - 40);
      clickOsc.frequency.setValueAtTime(baseFreq * 2.5, now);
      clickOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.04);

      clickFilter.type = 'lowpass';
      clickFilter.frequency.setValueAtTime(2500, now);

      clickGain.gain.setValueAtTime(0.7, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      clickOsc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(this.ctx.destination);

      clickOsc.start(now);
      clickOsc.stop(now + 0.05);

      // 2. Body wood resonance thump
      const bodyOsc = this.ctx.createOscillator();
      const bodyGain = this.ctx.createGain();
      
      bodyOsc.type = 'sine';
      bodyOsc.frequency.setValueAtTime(140 + Math.random() * 20, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

      bodyGain.gain.setValueAtTime(0.5, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(this.ctx.destination);

      bodyOsc.start(now);
      bodyOsc.stop(now + 0.1);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  // Triumphant win chime (pentatonic victory sequence)
  public playWinSound() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const start = this.ctx.currentTime;

      notes.forEach((freq, index) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start + index * 0.12);

        gain.gain.setValueAtTime(0, start + index * 0.12);
        gain.gain.linearRampToValueAtTime(0.3, start + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + index * 0.12 + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start + index * 0.12);
        osc.stop(start + index * 0.12 + 0.5);
      });
    } catch {}
  }

  // Minor defeat tone
  public playLossSound() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const notes = [440, 392, 349.23, 293.66]; // A4, G4, F4, D4
      const start = this.ctx.currentTime;

      notes.forEach((freq, index) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start + index * 0.14);

        gain.gain.setValueAtTime(0, start + index * 0.14);
        gain.gain.linearRampToValueAtTime(0.25, start + index * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + index * 0.14 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start + index * 0.14);
        osc.stop(start + index * 0.14 + 0.4);
      });
    } catch {}
  }

  // Undo move sound (reverse tap)
  public playUndoSound() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  // Soft UI click
  public playClickSound() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {}
  }
}

export const soundManager = new SoundEngine();
