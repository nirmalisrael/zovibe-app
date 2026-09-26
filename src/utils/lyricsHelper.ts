import type { JioSaavnSong } from '../api/jiosaavn';
import { getLyrics } from '../api/jiosaavn';
import { cleanHtmlEntities } from './songHelpers';

const TAMIL_VOWELS: Record<string, string> = {
  'அ': 'a',
  'ஆ': 'aa',
  'இ': 'i',
  'ஈ': 'ee',
  'உ': 'u',
  'ஊ': 'oo',
  'எ': 'e',
  'ஏ': 'e',
  'ஐ': 'ai',
  'ஒ': 'o',
  'ஓ': 'o',
  'ஔ': 'au',
  'ஃ': 'k',
};

const TAMIL_CONSONANTS: Record<string, string> = {
  'க': 'k',
  'ங': 'ng',
  'ச': 's',
  'ஞ': 'ny',
  'ட': 't',
  'ண': 'n',
  'த': 'th',
  'ந': 'n',
  'ப': 'p',
  'ம': 'm',
  'ய': 'y',
  'ர': 'r',
  'ல': 'l',
  'வ': 'v',
  'ழ': 'zh',
  'ள': 'l',
  'ற': 'r',
  'ன': 'n',
  'ஜ': 'j',
  'ஷ': 'sh',
  'ஸ': 's',
  'ஹ': 'h',
  'க்ஷ': 'ksh',
};

const TAMIL_MATRAS: Record<string, string> = {
  'ா': 'aa',
  'ி': 'i',
  'ீ': 'ee',
  'ு': 'u',
  'ூ': 'oo',
  'ெ': 'e',
  'ே': 'e',
  'ை': 'ai',
  'ொ': 'o',
  'ோ': 'o',
  'ௌ': 'au',
};

const VIRAMA = '்';

/**
 * Checks if a string contains any Tamil Unicode characters (\u0B80 - \u0BFF).
 */
export function isTamilText(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

/**
 * High-accuracy phonetic Tamil-to-English (Tanglish) transliterator.
 * Allows Tamil song lyrics to be sung naturally in English/Roman alphabet.
 */
export function tamilToEnglishTransliterate(text: string): string {
  if (!text) return '';

  let res = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    const c1 = text[i + 1];
    const c2 = text[i + 2];
    const c3 = text[i + 3];

    // ── Conjuncts lookahead (e.g. ந்த், ம்ப, ண்ட, ன்ற) ──
    if (ch === 'ந' && c1 === VIRAMA && c2 === 'த') {
      const base = 'ndh';
      if (c3 === VIRAMA) {
        res += base;
        i += 4;
        continue;
      } else if (c3 && TAMIL_MATRAS[c3]) {
        res += base + TAMIL_MATRAS[c3];
        i += 4;
        continue;
      } else {
        res += base + 'a';
        i += 3;
        continue;
      }
    }

    if (ch === 'ம' && c1 === VIRAMA && c2 === 'ப') {
      const base = 'mb';
      if (c3 === VIRAMA) {
        res += base;
        i += 4;
        continue;
      } else if (c3 && TAMIL_MATRAS[c3]) {
        res += base + TAMIL_MATRAS[c3];
        i += 4;
        continue;
      } else {
        res += base + 'a';
        i += 3;
        continue;
      }
    }

    if (ch === 'ண' && c1 === VIRAMA && c2 === 'ட') {
      const base = 'nd';
      if (c3 === VIRAMA) {
        res += base;
        i += 4;
        continue;
      } else if (c3 && TAMIL_MATRAS[c3]) {
        res += base + TAMIL_MATRAS[c3];
        i += 4;
        continue;
      } else {
        res += base + 'a';
        i += 3;
        continue;
      }
    }

    if (ch === 'ன' && c1 === VIRAMA && c2 === 'ற') {
      const base = 'ndr';
      if (c3 === VIRAMA) {
        res += base;
        i += 4;
        continue;
      } else if (c3 && TAMIL_MATRAS[c3]) {
        res += base + TAMIL_MATRAS[c3];
        i += 4;
        continue;
      } else {
        res += base + 'a';
        i += 3;
        continue;
      }
    }

    // ── Independent Vowel ──
    if (TAMIL_VOWELS[ch]) {
      res += TAMIL_VOWELS[ch];
      i += 1;
      continue;
    }

    // ── Consonant + (Virama | Matra | Inherent 'a') ──
    if (TAMIL_CONSONANTS[ch]) {
      if (c1 === VIRAMA) {
        res += TAMIL_CONSONANTS[ch];
        i += 2;
        continue;
      } else if (c1 && TAMIL_MATRAS[c1]) {
        res += TAMIL_CONSONANTS[ch] + TAMIL_MATRAS[c1];
        i += 2;
        continue;
      } else {
        res += TAMIL_CONSONANTS[ch] + 'a';
        i += 1;
        continue;
      }
    }

    // Default: pass through punctuation, spaces, numbers, Latin letters
    res += ch;
    i += 1;
  }

  // Smooth out common lyrical phonetics for singing
  return res
    .replace(/\banpae\b|\banpe\b/gi, 'anbe')
    .replace(/\bkaatha\b/gi, 'kaadha')
    .replace(/\bkaathal\b/gi, 'kaadhal')
    .replace(/\bvaentaam\b|\bventaam\b/gi, 'vendaam')
    .replace(/\bneethaan\b/gi, 'needhaan')
    .replace(/kkindr/gi, 'kkindr');
}

/**
 * Clean track title for lyrics searching (removes parenthesized suffixes like "(From ...)", "(The Pain of Love)").
 */
export function cleanLyricsSearchTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*-\s*.*$/, '')
    .trim();
}

/**
 * Fetches lyrics with multi-provider fallback (LRCLIB track, LRCLIB search, JioSaavn).
 */
export async function fetchSongLyrics(song: JioSaavnSong): Promise<string> {
  const cleanTitle = cleanLyricsSearchTitle(song.name);
  const primaryArtist = song.artists?.primary?.[0]?.name?.split(',')[0]?.trim() || '';

  // 1. Try LRCLIB exact match
  if (cleanTitle) {
    try {
      const u = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}${
        primaryArtist ? `&artist_name=${encodeURIComponent(primaryArtist)}` : ''
      }`;
      const res = await fetch(u);
      if (res.ok) {
        const data = (await res.json()) as { plainLyrics?: string; syncedLyrics?: string };
        const raw = data.plainLyrics || data.syncedLyrics;
        if (raw && raw.trim().length > 20) {
          return cleanHtmlEntities(raw.trim());
        }
      }
    } catch {
      /* continue to fallback */
    }
  }

  // 2. Try LRCLIB search query
  if (cleanTitle) {
    try {
      const q = primaryArtist ? `${cleanTitle} ${primaryArtist}` : cleanTitle;
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const list = (await res.json()) as Array<{ plainLyrics?: string; syncedLyrics?: string }>;
        if (Array.isArray(list)) {
          const match = list.find(
            (item) => (item.plainLyrics && item.plainLyrics.trim().length > 20) ||
                      (item.syncedLyrics && item.syncedLyrics.trim().length > 20)
          );
          if (match) {
            const raw = match.plainLyrics || match.syncedLyrics;
            if (raw) return cleanHtmlEntities(raw.trim());
          }
        }
      }
    } catch {
      /* continue to fallback */
    }
  }

  // 3. Fallback: JioSaavn lyrics endpoint
  try {
    const jioLyrics = await getLyrics(song.id);
    if (jioLyrics && jioLyrics.trim().length > 20) {
      return cleanHtmlEntities(jioLyrics.trim());
    }
  } catch {
    /* ignore */
  }

  return '';
}
