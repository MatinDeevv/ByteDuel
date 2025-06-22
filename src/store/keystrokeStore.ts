import { create } from 'zustand';

interface KeystrokeEvent {
  timestamp: number;
  type: 'edit' | 'cursor' | 'selection';
  content: string;
  position: number;
}

interface KeystrokeState {
  keystrokes: KeystrokeEvent[];
  isRecording: boolean;
  sessionId: string | null;
}

interface KeystrokeActions {
  startRecording: (sessionId: string) => void;
  stopRecording: () => void;
  recordKeystroke: (event: KeystrokeEvent) => void;
  clearKeystrokes: () => void;
  getKeystrokes: () => KeystrokeEvent[];
}

type KeystrokeStore = KeystrokeState & KeystrokeActions;

export const useKeystrokeStore = create<KeystrokeStore>((set, get) => ({
  // State
  keystrokes: [],
  isRecording: false,
  sessionId: null,

  // Actions
  startRecording: (sessionId: string) => {
    set({
      isRecording: true,
      sessionId,
      keystrokes: [],
    });
  },

  stopRecording: () => {
    set({
      isRecording: false,
      sessionId: null,
    });
  },

  recordKeystroke: (event: KeystrokeEvent) => {
    const { isRecording } = get();
    if (!isRecording) return;

    set((state) => ({
      keystrokes: [...state.keystrokes, event],
    }));
  },

  clearKeystrokes: () => {
    set({ keystrokes: [] });
  },

  getKeystrokes: () => {
    return get().keystrokes;
  },
}));