import { useEffect } from 'react';
import TrackPlayer, {
  Event,
  State,
  usePlaybackState,
  useIsPlaying,
} from 'react-native-track-player';
import { usePlayerStore } from '../../store/playerStore';
import { useSleepTimerStore } from '../../store/sleepTimerStore';

function syncCurrentSongFromActiveTrack(trackId: string | undefined, index: number | undefined) {
  const { queue } = usePlayerStore.getState();
  if (trackId != null && trackId !== '') {
    const song = queue.find((s) => s.id === trackId);
    if (song) {
      usePlayerStore.getState().setCurrentSong(song);
      return;
    }
  }
  if (index != null && index >= 0 && index < queue.length) {
    usePlayerStore.getState().setCurrentSong(queue[index]);
  }
}

/**
 * Keeps Zustand `isPlaying` aligned with RNTP everywhere (mini player, lists),
 * not only on Now Playing. Fixes “wave still animates after last track” and
 * lock-screen / notification toggles.
 *
 * `PlaybackActiveTrackChanged` keeps `currentSong` in sync when the track advances
 * automatically (end of song / repeat) — MiniPlayer and SongRow only read the store.
 *
 * Handles global Sleep Timer pause triggers (both countdown minutes and end-of-track).
 */
export function PlaybackStoreSync() {
  const playback = usePlaybackState();
  const { playing: uiPlaying } = useIsPlaying();

  const isSleepActive = useSleepTimerStore((s) => s.isActive);
  const sleepMode = useSleepTimerStore((s) => s.mode);
  const targetEndTime = useSleepTimerStore((s) => s.targetEndTime);

  useEffect(() => {
    const target =
      uiPlaying !== undefined ? uiPlaying : playback.state === State.Playing;
    if (usePlayerStore.getState().isPlaying !== target) {
      usePlayerStore.getState().setIsPlaying(target);
    }
  }, [uiPlaying, playback.state]);

  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (e) => {
      const tid = e.track?.id;
      const trackId = typeof tid === 'string' ? tid : tid != null ? String(tid) : undefined;
      syncCurrentSongFromActiveTrack(trackId, e.index);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      usePlayerStore.getState().setIsPlaying(false);
    });
    return () => sub.remove();
  }, []);

  // ── Sleep Timer: Countdown mode (minutes) ──
  useEffect(() => {
    if (!isSleepActive || sleepMode !== 'minutes' || !targetEndTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.round((targetEndTime - now) / 1000));
      useSleepTimerStore.getState().updateRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        clearInterval(interval);
        void TrackPlayer.pause();
        usePlayerStore.getState().setIsPlaying(false);
        useSleepTimerStore.getState().clearTimer();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSleepActive, sleepMode, targetEndTime]);

  // ── Sleep Timer: End of track mode ──
  useEffect(() => {
    if (!isSleepActive || sleepMode !== 'end_of_track') return;

    let initialTrackId: string | undefined;
    void TrackPlayer.getActiveTrack().then((t) => {
      initialTrackId = t?.id;
    });

    const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (e) => {
      if (initialTrackId !== undefined && e.track?.id !== initialTrackId) {
        void TrackPlayer.pause();
        usePlayerStore.getState().setIsPlaying(false);
        useSleepTimerStore.getState().clearTimer();
      }
    });

    const queueEndedSub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      void TrackPlayer.pause();
      usePlayerStore.getState().setIsPlaying(false);
      useSleepTimerStore.getState().clearTimer();
    });

    return () => {
      sub.remove();
      queueEndedSub.remove();
    };
  }, [isSleepActive, sleepMode]);

  return null;
}
