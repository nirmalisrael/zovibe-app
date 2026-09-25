import { useEffect } from 'react';
import {
  useProgress,
  useActiveTrack,
  usePlaybackState,
  useIsPlaying,
  State,
} from 'react-native-track-player';
import { usePlayerStore } from '../store/playerStore';

export function useNowPlaying(updateInterval = 500) {
  const progress = useProgress(updateInterval);
  const activeTrack = useActiveTrack();
  const playback = usePlaybackState();
  const { playing: uiPlaying } = useIsPlaying();
  const queue = usePlayerStore((s) => s.queue);

  const isPlaying =
    uiPlaying !== undefined ? uiPlaying : playback.state === State.Playing;

  useEffect(() => {
    const id = activeTrack?.id;
    if (!id) {
      // Avoid clearing during RNTP hydration: brief undefined activeTrack would flash "Nothing playing".
      if (usePlayerStore.getState().queue.length === 0 && usePlayerStore.getState().currentSong !== null) {
        usePlayerStore.getState().setCurrentSong(null);
      }
      return;
    }
    const currentSong = usePlayerStore.getState().currentSong;
    if (currentSong?.id !== id) {
      const song = queue.find((s) => s.id === id);
      if (song) usePlayerStore.getState().setCurrentSong(song);
    }
  }, [activeTrack?.id, queue]);

  useEffect(() => {
    const target =
      uiPlaying !== undefined ? uiPlaying : playback.state === State.Playing;
    if (usePlayerStore.getState().isPlaying !== target) {
      usePlayerStore.getState().setIsPlaying(target);
    }
  }, [uiPlaying, playback.state]);

  return {
    position: progress.position,
    duration: progress.duration,
    buffered: progress.buffered,
    activeTrack,
    isPlaying,
  };
}
