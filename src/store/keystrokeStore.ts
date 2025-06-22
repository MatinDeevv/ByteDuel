import { create } from 'zustand';

export interface KeystrokeEvent {
  timestamp: number;
  type: 'edit' | 'cursor' | 'selection';
  content: string;
  position: number;
}

interface KeystrokeStore {
  keystrokes: KeystrokeEvent[];
  isRecording: boolean;
  recordKeystroke: (event: KeystrokeEvent) => void;
  startRecording: () => void;
  stopRecording: () => void;
  clearKeystrokes: () => void;
  getReplayData: () => KeystrokeEvent[];
}

export const useKeystrokeStore = create<KeystrokeStore>((set, get) => ({
  keystrokes: [],
  isRecording: true,

  recordKeystroke: (event: KeystrokeEvent) => {
    const { isRecording } = get();
    if (!isRecording) return;

    set((state) => ({
      keystrokes: [...state.keystrokes, event],
    }));
  },

  startRecording: () => {
    set({ isRecording: true });
  },

  stopRecording: () => {
    set({ isRecording: false });
  },

  clearKeystrokes: () => {
    set({ keystrokes: [] });
  },

  getReplayData: () => {
    return get().keystrokes;
  },
}));