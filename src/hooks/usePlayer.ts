import { useCallback } from 'react';
import TrackPlayer, { RepeatMode as RNTPRepeat, State, isPlaying as getIsPlayingUi } from 'react-native-track-player';
import type { JioSaavnSong } from '../api/jiosaavn';
import { buildTrack } from '../utils/buildTrack';
import { usePlayerStore, type RepeatMode } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { skipToNextInQueue, skipToPreviousInQueue } from '../player/queueSkip';

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
    await skipToNextInQueue();
  }, []);

  const skipToPrevious = useCallback(async () => {
    await skipToPreviousInQueue();
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    const { playing } = await getIsPlayingUi();
    await TrackPlayer.seekTo(seconds);
    // Some platforms briefly leave the player non-Playing after seek; nudge play if user was listening.
    if (playing) {
      await TrackPlayer.play();
    }
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

  /** Stop playback, clear RNTP queue, hide mini player (swipe-down dismiss). */
  const dismissMiniPlayer = useCallback(async () => {
    try {
      await TrackPlayer.reset();
    } catch {
      /* ignore */
    }
    usePlayerStore.getState().setQueue([]);
    usePlayerStore.getState().setIsPlaying(false);
  }, []);

  const skipToQueueIndex = useCallback(async (index: number) => {
    const songs = usePlayerStore.getState().queue;
    if (index < 0 || index >= songs.length) return;
    try {
      await TrackPlayer.skip(index);
      usePlayerStore.getState().setCurrentSong(songs[index] ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    playQueue,
    togglePlay,
    pause,
    play,
    skipToNext,
    skipToPrevious,
    skipToQueueIndex,
    seekTo,
    cycleRepeat,
    toggleShuffle,
    applyRepeatFromStore,
    dismissMiniPlayer,
  };
}
