import { useEffect } from 'react';
import { useProgress, useActiveTrack, usePlaybackState, State } from 'react-native-track-player';
import { usePlayerStore } from '../store/playerStore';

export function useNowPlaying(updateInterval = 500) {
  const progress = useProgress(updateInterval);
  const activeTrack = useActiveTrack();
  const playback = usePlaybackState();
  const queue = usePlayerStore((s) => s.queue);

  useEffect(() => {
    const id = activeTrack?.id;
    if (!id) {
      usePlayerStore.getState().setCurrentSong(null);
      return;
    }
    const song = queue.find((s) => s.id === id);
    if (song) usePlayerStore.getState().setCurrentSong(song);
  }, [activeTrack?.id, queue]);

  useEffect(() => {
    const playing = playback.state === State.Playing;
    if (playback.state !== undefined) {
      usePlayerStore.getState().setIsPlaying(playing);
    }
  }, [playback.state]);

  return {
    position: progress.position,
    duration: progress.duration,
    buffered: progress.buffered,
    activeTrack,
    isPlaying: playback.state === State.Playing,
  };
}
