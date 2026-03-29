import { useCallback } from 'react';
import TrackPlayer, { RepeatMode as RNTPRepeat, State } from 'react-native-track-player';
import type { JioSaavnSong } from '../api/jiosaavn';
import { buildTrack } from '../utils/buildTrack';
import { usePlayerStore, type RepeatMode } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';

function mapRepeat(mode: RepeatMode): RNTPRepeat {
  switch (mode) {
    case 'track':
      return RNTPRepeat.Track;
    case 'queue':
      return RNTPRepeat.Queue;
    default:
      return RNTPRepeat.Off;
  }
}

export function usePlayer() {
  const audioQuality = useSettingsStore((s) => s.audioQuality);

  const playQueue = useCallback(
    async (songs: JioSaavnSong[], startIndex = 0) => {
      if (!songs.length) return;
      const tracks = songs.map((s) => buildTrack(s, audioQuality));
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      const idx = Math.min(Math.max(0, startIndex), tracks.length - 1);
      if (idx > 0) await TrackPlayer.skip(idx);
      usePlayerStore.getState().setQueue(songs, idx);
      const repeat = usePlayerStore.getState().repeat;
      await TrackPlayer.setRepeatMode(mapRepeat(repeat));
      await TrackPlayer.play();
      usePlayerStore.getState().setIsPlaying(true);
    },
    [audioQuality]
  );

  const togglePlay = useCallback(async () => {
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === State.Playing) {
      await TrackPlayer.pause();
      usePlayerStore.getState().setIsPlaying(false);
    } else {
      await TrackPlayer.play();
      usePlayerStore.getState().setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
    usePlayerStore.getState().setIsPlaying(false);
  }, []);

  const play = useCallback(async () => {
    await TrackPlayer.play();
    usePlayerStore.getState().setIsPlaying(true);
  }, []);

  const skipToNext = useCallback(async () => {
    const { shuffle, queue } = usePlayerStore.getState();
    if (shuffle && queue.length > 1) {
      const cur = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
      let next = cur;
      let guard = 0;
      while (next === cur && guard < 20) {
        next = Math.floor(Math.random() * queue.length);
        guard += 1;
      }
      if (next !== cur) await TrackPlayer.skip(next);
    } else {
      await TrackPlayer.skipToNext();
    }
  }, []);

  const skipToPrevious = useCallback(async () => {
    const { shuffle, queue } = usePlayerStore.getState();
    if (shuffle && queue.length > 1) {
      const cur = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
      let prev = cur;
      let guard = 0;
      while (prev === cur && guard < 20) {
        prev = Math.floor(Math.random() * queue.length);
        guard += 1;
      }
      if (prev !== cur) await TrackPlayer.skip(prev);
    } else {
      await TrackPlayer.skipToPrevious();
    }
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    await TrackPlayer.seekTo(seconds);
  }, []);

  const applyRepeatFromStore = useCallback(async () => {
    const mode = usePlayerStore.getState().repeat;
    await TrackPlayer.setRepeatMode(mapRepeat(mode));
  }, []);

  const cycleRepeat = useCallback(async () => {
    usePlayerStore.getState().cycleRepeat();
    const mode = usePlayerStore.getState().repeat;
    await TrackPlayer.setRepeatMode(mapRepeat(mode));
  }, []);

  const toggleShuffle = useCallback(() => {
    usePlayerStore.getState().toggleShuffle();
  }, []);

  return {
    playQueue,
    togglePlay,
    pause,
    play,
    skipToNext,
    skipToPrevious,
    seekTo,
    cycleRepeat,
    toggleShuffle,
    applyRepeatFromStore,
  };
}
