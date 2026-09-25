import type { Track } from 'react-native-track-player';
import type { JioSaavnSong } from '../api/jiosaavn';
import { getStreamUrl, getCoverUrl, type AudioQualityPreference } from '../api/stream';
import { getPrimaryArtistNames, getAlbumNameSafe, cleanHtmlEntities } from './songHelpers';

export function buildTrack(
  song: JioSaavnSong,
  audioQuality: AudioQualityPreference = 'high'
): Track {
  return {
    id: song.id,
    url: getStreamUrl(song, audioQuality),
    title: cleanHtmlEntities(song.name ?? 'Unknown track'),
    artist: getPrimaryArtistNames(song),
    album: getAlbumNameSafe(song),
    artwork: getCoverUrl(song, '500x500'),
    duration: song.duration,
  };
}
