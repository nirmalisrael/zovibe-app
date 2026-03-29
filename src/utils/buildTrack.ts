import type { Track } from 'react-native-track-player';
import type { JioSaavnSong } from '../api/jiosaavn';
import { getStreamUrl, getCoverUrl, type AudioQualityPreference } from '../api/stream';

export function buildTrack(
  song: JioSaavnSong,
  audioQuality: AudioQualityPreference = 'high'
): Track {
  return {
    id: song.id,
    url: getStreamUrl(song, audioQuality),
    title: song.name,
    artist: song.artists.primary.map((a) => a.name).join(', '),
    album: song.album.name,
    artwork: getCoverUrl(song, '500x500'),
    duration: song.duration,
  };
}
