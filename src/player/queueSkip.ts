import TrackPlayer from 'react-native-track-player';
import { usePlayerStore } from '../store/playerStore';

/** Next track — matches in-app controls (shuffle = random index in queue). */
export async function skipToNextInQueue(): Promise<void> {
  try {
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
