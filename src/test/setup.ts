import '@testing-library/jest-dom';
import { vi } from 'vitest';

// In-Memory localStorage mock for node/jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock Web Audio API
class AudioContextMock {
  state = 'running';
  currentTime = 0;
  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    };
  }
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: {
        setValueAtTime: () => {},
      },
      connect: () => {},
    };
  }
  resume() {
    return Promise.resolve();
  }
  destination = {};
}

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: AudioContextMock,
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: AudioContextMock,
});

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

// Mock window.confirm
window.confirm = () => true;

// Mock window.alert
window.alert = () => {};

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});
