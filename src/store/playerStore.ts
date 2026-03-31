import { create } from 'zustand';
import type { JioSaavnSong } from '../api/jiosaavn';

export type RepeatMode = 'off' | 'track' | 'queue';

interface PlayerState {
  currentSong: JioSaavnSong | null;
  queue: JioSaavnSong[];
  isPlaying: boolean;
  shuffle: boolean;
  progress: number;
  repeat: RepeatMode;
  setCurrentSong: (song: JioSaavnSong | null) => void;
  setQueue: (songs: JioSaavnSong[], startIndex?: number) => void;
  setIsPlaying: (v: boolean) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  queue: [],
  isPlaying: false,
  shuffle: false,
  progress: 0,
  repeat: 'off',
  setCurrentSong: (song) => set({ currentSong: song }),
  setQueue: (songs, startIndex = 0) =>
    set({
      queue: songs,
      currentSong: songs[startIndex] ?? null,
    }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  toggleShuffle: () => set({ shuffle: !get().shuffle }),
  cycleRepeat: () => {
    const order: RepeatMode[] = ['off', 'queue', 'track'];
    const i = order.indexOf(get().repeat);
    set({ repeat: order[(i + 1) % order.length] });
  },
}));
