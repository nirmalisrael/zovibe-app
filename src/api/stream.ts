import type { JioSaavnSong } from './jiosaavn';

export type AudioQualityPreference = 'high' | 'normal';

export function getStreamUrl(
  song: JioSaavnSong,
  preference: AudioQualityPreference = 'high'
): string {
  const urls = song.downloadUrl;
  if (!urls?.length) return '';
  const preferredHigh = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
  const preferredNormal = ['96kbps', '48kbps', '160kbps', '320kbps', '12kbps'];
  const order = preference === 'high' ? preferredHigh : preferredNormal;
  for (const q of order) {
    const match = urls.find((u) => u.quality === q);
    if (match?.url) return match.url;
  }
  return urls[urls.length - 1]?.url ?? '';
}

export function getCoverUrl(song: JioSaavnSong, quality = '500x500'): string {
  const imgs = song.image;
  if (!imgs?.length) return '';
  return (
    imgs.find((i) => i.quality === quality)?.url ?? imgs[imgs.length - 1]?.url ?? ''
  );
}
