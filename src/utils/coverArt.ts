import type { Track } from 'react-native-track-player';
import type { JioSaavnSong } from '../api/jiosaavn';
import { getCoverUrl } from '../api/stream';

/** RNTP may expose artwork as a remote URL string; numbers are local resource IDs. */
function artworkFromTrack(track: Track | undefined): string | null {
  const a = track?.artwork;
  if (a == null) return null;
  if (typeof a === 'string' && a.trim().length > 0) return a.trim();
  return null;
}

/**
 * Best cover for the full-screen player: prefer the active track’s artwork (what RNTP loaded),
 * then fall back to parsing `song.image` with resilient quality matching.
 */
export function resolveNowPlayingCoverUrl(track: Track | undefined, song: JioSaavnSong): string {
  return artworkFromTrack(track) ?? getCoverUrl(song, '500x500');
}
