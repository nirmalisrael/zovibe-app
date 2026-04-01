import { useEffect } from 'react';
import TrackPlayer, {
  Event,
  State,
  usePlaybackState,
  useIsPlaying,
} from 'react-native-track-player';
import { usePlayerStore } from '../../store/playerStore';

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
 */
export function PlaybackStoreSync() {
  const playback = usePlaybackState();
  const { playing: uiPlaying } = useIsPlaying();

  useEffect(() => {
    if (uiPlaying !== undefined) {
      usePlayerStore.getState().setIsPlaying(uiPlaying);
    } else if (playback.state !== undefined) {
      usePlayerStore.getState().setIsPlaying(playback.state === State.Playing);
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

  return null;
}
