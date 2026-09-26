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
  appendToQueue: (newSongs: JioSaavnSong[]) => void;
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
  setCurrentSong: (song) => {
    if (get().currentSong?.id === song?.id) return;
    set({ currentSong: song });
  },
  setQueue: (songs, startIndex = 0) =>
    set({
      queue: songs,
      currentSong: songs[startIndex] ?? null,
    }),
  appendToQueue: (newSongs) => {
    const currentQueue = get().queue;
    const existingIds = new Set(currentQueue.map((s) => s.id));
    const toAdd = newSongs.filter((s) => !existingIds.has(s.id));
    if (toAdd.length === 0) return;
    set({ queue: [...currentQueue, ...toAdd] });
  },
  setIsPlaying: (v) => {
    if (get().isPlaying === v) return;
    set({ isPlaying: v });
  },
  toggleShuffle: () => set({ shuffle: !get().shuffle }),
  cycleRepeat: () => {
    const order: RepeatMode[] = ['off', 'queue', 'track'];
    const i = order.indexOf(get().repeat);
    set({ repeat: order[(i + 1) % order.length] });
  },
}));
