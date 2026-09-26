import TrackPlayer from 'react-native-track-player';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { getSongSuggestions } from '../api/jiosaavn';
import { buildTrack } from '../utils/buildTrack';

/** Next track — matches in-app controls (shuffle = random index; end of queue = tone-matched YouTube vibe suggestion). */
export async function skipToNextInQueue(): Promise<void> {
  try {
    const { shuffle, queue, repeat } = usePlayerStore.getState();
    const cur = (await TrackPlayer.getActiveTrackIndex()) ?? 0;

    if (shuffle && queue.length > 1) {
      let next = cur;
      let guard = 0;
      while (next === cur && guard < 20) {
        next = Math.floor(Math.random() * queue.length);
        guard += 1;
      }
      if (next !== cur) {
        await TrackPlayer.skip(next);
        return;
      }
    }

    if (cur < queue.length - 1) {
      await TrackPlayer.skipToNext();
      return;
    }

    // At end of queue
    if (repeat === 'queue') {
      await TrackPlayer.skip(0);
      return;
    }
    if (repeat === 'track') {
      await TrackPlayer.seekTo(0);
      await TrackPlayer.play();
      return;
    }

    // YouTube-style vibe suggestion for matching tone/vibe
    const currentSong = queue[cur] ?? usePlayerStore.getState().currentSong;
    if (currentSong) {
      const suggestions = await getSongSuggestions(currentSong.id, 10, currentSong);
      const existingIds = new Set(queue.map((s) => s.id));
      const filtered = suggestions.filter((s) => !existingIds.has(s.id));
      if (filtered.length > 0) {
        const audioQuality = useSettingsStore.getState().audioQuality;
        const tracks = filtered.map((s) => buildTrack(s, audioQuality));
        await TrackPlayer.add(tracks);
        usePlayerStore.getState().appendToQueue(filtered);
        await TrackPlayer.skipToNext();
        await TrackPlayer.play();
        usePlayerStore.getState().setIsPlaying(true);
        return;
      }
    }

    await TrackPlayer.skipToNext();
  } catch {
    try {
      await TrackPlayer.skipToNext();
    } catch {
      /* queue may be at end */
    }
  }
}

/** Previous track — same shuffle behavior as usePlayer. */
export async function skipToPreviousInQueue(): Promise<void> {
  try {
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
  } catch {
    try {
      await TrackPlayer.skipToPrevious();
    } catch {
      /* at start of queue */
    }
  }
}
