import { describe, it, expect, beforeEach } from 'vitest';
import { soundManager } from '../utils/audio';

describe('Sound Engine (Web Audio API)', () => {
  beforeEach(() => {
    localStorage.clear();
    soundManager.setMuted(false);
  });

  it('should initialize unmuted by default', () => {
    expect(soundManager.getIsMuted()).toBe(false);
  });

  it('should toggle mute state and persist in localStorage', () => {
    const muted = soundManager.toggleMute();
    expect(muted).toBe(true);
    expect(soundManager.getIsMuted()).toBe(true);
    expect(localStorage.getItem('gomoku_sound_muted')).toBe('true');

    const unmuted = soundManager.toggleMute();
    expect(unmuted).toBe(false);
    expect(soundManager.getIsMuted()).toBe(false);
    expect(localStorage.getItem('gomoku_sound_muted')).toBe('false');
  });

  it('should safely execute sound effects without errors when unmuted', () => {
    expect(() => soundManager.playStoneSound()).not.toThrow();
    expect(() => soundManager.playWinSound()).not.toThrow();
    expect(() => soundManager.playLossSound()).not.toThrow();
    expect(() => soundManager.playUndoSound()).not.toThrow();
    expect(() => soundManager.playClickSound()).not.toThrow();
  });

  it('should skip audio execution when muted', () => {
    soundManager.setMuted(true);
    expect(() => soundManager.playStoneSound()).not.toThrow();
    expect(() => soundManager.playWinSound()).not.toThrow();
  });
});
