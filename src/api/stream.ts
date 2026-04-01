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
  return urls.at(-1)?.url ?? '';
}

/** Prefer larger artwork; JioSaavn `quality` strings vary by endpoint. */
const COVER_QUALITY_ORDER = ['500x500', '250x250', '150x150', '50x50'] as const;

function normQuality(q: string | undefined): string {
  return (q ?? '').toLowerCase().replaceAll(/\s/g, '');
}

export function getCoverUrl(song: JioSaavnSong, quality = '500x500'): string {
  const imgs = song.image;
  if (!imgs?.length) return '';

  const want = normQuality(quality);
  const exact = imgs.find((i) => normQuality(i.quality) === want)?.url;
  if (exact) return exact;

  for (const q of COVER_QUALITY_ORDER) {
    const n = normQuality(q);
    const hit = imgs.find((i) => normQuality(i.quality) === n)?.url;
    if (hit) return hit;
  }

  const any = imgs.find((i) => typeof i.url === 'string' && i.url.trim().length > 0)?.url;
  if (any) return any;

  return imgs.at(-1)?.url?.trim() ?? '';
}
