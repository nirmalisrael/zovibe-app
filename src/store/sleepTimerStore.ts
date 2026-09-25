import { create } from 'zustand';

export type SleepTimerOption = 5 | 10 | 15 | 30 | 45 | 60 | 'end_of_track';

export type SleepTimerMode = 'minutes' | 'end_of_track';

interface SleepTimerState {
  isActive: boolean;
  mode: SleepTimerMode | null;
  targetEndTime: number | null; // epoch ms
  selectedMinutes: number | null;
  remainingSeconds: number | null;
  setTimerMinutes: (minutes: number) => void;
  setTimerEndOfTrack: () => void;
  clearTimer: () => void;
  updateRemainingSeconds: (seconds: number) => void;
}

export const useSleepTimerStore = create<SleepTimerState>((set, get) => ({
  isActive: false,
  mode: null,
  targetEndTime: null,
  selectedMinutes: null,
  remainingSeconds: null,

  setTimerMinutes: (minutes: number) => {
    const targetEndTime = Date.now() + minutes * 60 * 1000;
    set({
      isActive: true,
      mode: 'minutes',
      targetEndTime,
      selectedMinutes: minutes,
      remainingSeconds: minutes * 60,
    });
  },

  setTimerEndOfTrack: () => {
    set({
      isActive: true,
      mode: 'end_of_track',
      targetEndTime: null,
      selectedMinutes: null,
      remainingSeconds: null,
    });
  },

  clearTimer: () => {
    set({
      isActive: false,
      mode: null,
      targetEndTime: null,
      selectedMinutes: null,
      remainingSeconds: null,
    });
  },

  updateRemainingSeconds: (seconds: number) => {
    if (get().remainingSeconds === seconds) return;
    set({ remainingSeconds: seconds });
  },
}));
