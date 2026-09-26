import { useEffect, useRef } from 'react';
import TrackPlayer, {
  Event,
  State,
  usePlaybackState,
  useIsPlaying,
} from 'react-native-track-player';
import { usePlayerStore } from '../../store/playerStore';
import { useSleepTimerStore } from '../../store/sleepTimerStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getSongSuggestions } from '../../api/jiosaavn';
import { buildTrack } from '../../utils/buildTrack';
import type { JioSaavnSong } from '../../api/jiosaavn';

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
 * YouTube-style Vibe Auto-recommendations: Pre-fetches matching tone/vibe songs
 * when nearing the end of the queue and seamlessly advances on queue completion.
 *
 * Handles global Sleep Timer pause triggers (both countdown minutes and end-of-track).
 */
export function PlaybackStoreSync() {
  const playback = usePlaybackState();
  const { playing: uiPlaying } = useIsPlaying();

  const isSleepActive = useSleepTimerStore((s) => s.isActive);
  const sleepMode = useSleepTimerStore((s) => s.mode);
  const targetEndTime = useSleepTimerStore((s) => s.targetEndTime);

  const fetchedSuggestionsRef = useRef<Set<string>>(new Set());

  const loadVibeSuggestionsForSong = async (song: JioSaavnSong) => {
    if (fetchedSuggestionsRef.current.has(song.id)) return;
    fetchedSuggestionsRef.current.add(song.id);

    try {
      const suggestions = await getSongSuggestions(song.id, 10, song);
      const { queue } = usePlayerStore.getState();
      const existingIds = new Set(queue.map((s) => s.id));
      const filtered = suggestions.filter((s) => !existingIds.has(s.id));
      if (filtered.length > 0) {
        const audioQuality = useSettingsStore.getState().audioQuality;
        const tracks = filtered.map((s) => buildTrack(s, audioQuality));
        await TrackPlayer.add(tracks);
        usePlayerStore.getState().appendToQueue(filtered);
      }
    } catch {
      /* ignore background pre-fetch error */
    }
  };

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

      // Pre-fetch vibe suggestions when within 2 songs of queue end
      const { queue, repeat } = usePlayerStore.getState();
      const isSleep = useSleepTimerStore.getState().isActive;
      if (!isSleep && repeat === 'off' && e.index != null && e.index >= Math.max(0, queue.length - 2)) {
        const activeSong = (trackId ? queue.find((s) => s.id === trackId) : null) ?? queue[e.index];
        if (activeSong) {
          void loadVibeSuggestionsForSong(activeSong);
        }
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      const { queue, repeat, currentSong } = usePlayerStore.getState();
      const isSleep = useSleepTimerStore.getState().isActive;

      // When queue naturally ends and repeat is off, auto-switch to next vibe suggestion
      if (!isSleep && repeat === 'off' && currentSong) {
        try {
          const suggestions = await getSongSuggestions(currentSong.id, 10, currentSong);
          const existingIds = new Set(queue.map((s) => s.id));
          const filtered = suggestions.filter((s) => !existingIds.has(s.id));
          if (filtered.length > 0) {
            const audioQuality = useSettingsStore.getState().audioQuality;
            const tracks = filtered.map((s) => buildTrack(s, audioQuality));
            await TrackPlayer.add(tracks);
            usePlayerStore.getState().appendToQueue(filtered);
            await TrackPlayer.play();
            usePlayerStore.getState().setIsPlaying(true);
            return;
          }
        } catch {
          /* fallback to pause */
        }
      }

      usePlayerStore.getState().setIsPlaying(false);
    });
    return () => sub.remove();
  }, []);

  // ── Sleep Timer: Countdown mode (minutes) ──
  useEffect(() => {
    if (!isSleepActive || sleepMode !== 'minutes' || !targetEndTime) return;

    const checkTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.round((targetEndTime - now) / 1000));
      useSleepTimerStore.getState().updateRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        void TrackPlayer.pause();
        usePlayerStore.getState().setIsPlaying(false);
        useSleepTimerStore.getState().clearTimer();
        return true;
      }
      return false;
    };

    if (checkTimer()) return;

    const interval = setInterval(() => {
      if (checkTimer()) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSleepActive, sleepMode, targetEndTime]);

  // ── Sleep Timer: End of track mode ──
  useEffect(() => {
    if (!isSleepActive || sleepMode !== 'end_of_track') return;

    let initialTrackId: string | undefined = usePlayerStore.getState().currentSong?.id;
    void TrackPlayer.getActiveTrack().then((t) => {
      if (t?.id != null) {
        initialTrackId = String(t.id);
      }
    });

    const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (e) => {
      const nextId = e.track?.id != null ? String(e.track.id) : undefined;
      if (initialTrackId !== undefined && nextId !== undefined && nextId !== initialTrackId) {
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
