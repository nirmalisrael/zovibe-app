/**
 * Single catalog for supported languages (ids + labels).
 * User-facing filters are driven by onboarding prefs where it makes sense; users can still widen filters in Profile.
 * JioSaavn has strong coverage for Indian languages — ids match common API / search language tags.
 */

import { HOME_ALBUM_SECTIONS, type HomeAlbumSection } from './homeSeed';

export const LANGUAGE_CATALOG = [
  { id: 'tamil', label: 'Tamil' },
  { id: 'hindi', label: 'Hindi' },
  { id: 'telugu', label: 'Telugu' },
  { id: 'malayalam', label: 'Malayalam' },
  { id: 'kannada', label: 'Kannada' },
  { id: 'punjabi', label: 'Punjabi' },
  { id: 'bengali', label: 'Bengali' },
  { id: 'marathi', label: 'Marathi' },
  { id: 'english', label: 'English' },
  { id: 'indian', label: 'All Indian' },
] as const;

export type SupportedLanguageId = (typeof LANGUAGE_CATALOG)[number]['id'];

export type LanguageFilterId = SupportedLanguageId | 'all';

const SUPPORTED_IDS = new Set<string>(LANGUAGE_CATALOG.map((x) => x.id));

const LABEL_BY_ID: Record<SupportedLanguageId, string> = LANGUAGE_CATALOG.reduce(
  (acc, x) => {
    acc[x.id] = x.label;
    return acc;
  },
  {} as Record<SupportedLanguageId, string>
);

export const LANGUAGE_OPTIONS: readonly SupportedLanguageId[] = LANGUAGE_CATALOG.map((x) => x.id);

/** All Indian regional picks in onboarding (excludes English + the aggregate `indian`). */
export const INDIAN_REGIONAL_LANGUAGE_IDS: readonly SupportedLanguageId[] = LANGUAGE_CATALOG.filter(
  (x) => x.id !== 'english' && x.id !== 'indian'
).map((x) => x.id);

/**
 * Onboarding / Profile language cards: copy only. Order and ids come from {@link LANGUAGE_CATALOG}.
 * There is no remote API for these in the app today — add an endpoint later if the catalog must be dynamic.
 */
export const ONBOARDING_LANGUAGE_SUBTITLES: Record<SupportedLanguageId, string> = {
  tamil: 'Film & independent hits',
  hindi: 'Bollywood & chart toppers',
  telugu: 'Tollywood & Telugu chart',
  malayalam: 'Mollywood & Kerala sound',
  kannada: 'Sandalwood & Kannada hits',
  punjabi: 'Punjabi pop & bhangra',
  bengali: 'Tollywood (Bengal) & modern Bangla',
  marathi: 'Marathi film & indie',
  english: 'Global pop & more',
  indian: 'All regional Indian languages above',
};

/**
 * "All Indian" in onboarding: selects every regional language + `indian`.
 * Clearing any regional language clears `indian` so the bundle stays consistent.
 */
export function applyOnboardingLanguageToggle(
  prev: string[],
  toggledId: string
): SupportedLanguageId[] {
  const id = normalizeLanguageId(toggledId);
  if (!id) return sanitizeLangPrefs(prev);

  const set = new Set(sanitizeLangPrefs(prev));

  if (id === 'indian') {
    if (set.has('indian')) {
      set.delete('indian');
    } else {
      set.add('indian');
      for (const rid of INDIAN_REGIONAL_LANGUAGE_IDS) {
        set.add(rid);
      }
    }
    return sanitizeLangPrefs([...set]);
  }

  if (set.has(id)) {
    set.delete(id);
    if ((INDIAN_REGIONAL_LANGUAGE_IDS as readonly string[]).includes(id)) {
      set.delete('indian');
    }
  } else {
    set.add(id);
  }

  return sanitizeLangPrefs([...set]);
}

export function getLanguageLabel(id: LanguageFilterId): string {
  if (id === 'all') return 'All';
  return LABEL_BY_ID[id] ?? id;
}

export function normalizeLanguageId(raw: string): SupportedLanguageId | null {
  const s = raw.trim().toLowerCase();
  return SUPPORTED_IDS.has(s) ? (s as SupportedLanguageId) : null;
}

/** Keep only known ids, unique, preserve order */
export function sanitizeLangPrefs(prefs: string[]): SupportedLanguageId[] {
  const out: SupportedLanguageId[] = [];
  const seen = new Set<string>();
  for (const p of prefs) {
    const n = normalizeLanguageId(p);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

export function isValidLanguageFilterId(v: string): v is LanguageFilterId {
  return v === 'all' || SUPPORTED_IDS.has(v);
}

/**
 * Home album carousels to fetch/show from saved language prefs.
 * - Empty / guest prefs → `null` (no restriction: load full home catalog).
 * - `indian` expands to every regional section in {@link HOME_ALBUM_SECTIONS} except English.
 */
export function getHomeAlbumSectionsFromLangPrefs(langPrefs: string[]): HomeAlbumSection[] | null {
  const s = sanitizeLangPrefs(langPrefs);
  if (s.length === 0) return null;
  const set = new Set<HomeAlbumSection>();
  if (s.includes('indian')) {
    for (const id of INDIAN_REGIONAL_LANGUAGE_IDS) {
      if ((HOME_ALBUM_SECTIONS as readonly string[]).includes(id)) {
        set.add(id as HomeAlbumSection);
      }
    }
  }
  for (const id of s) {
    if (id === 'indian') continue;
    if ((HOME_ALBUM_SECTIONS as readonly string[]).includes(id)) {
      set.add(id as HomeAlbumSection);
    }
  }
  return HOME_ALBUM_SECTIONS.filter((sec) => set.has(sec));
}

/** Lowercase fragments to match JioSaavn `language` on songs/albums when filtering trending/home. */
export function getLanguageMatchTokensForPrefs(langPrefs: string[]): string[] | null {
  const s = sanitizeLangPrefs(langPrefs);
  if (s.length === 0) return null;
  const tokens = new Set<string>();
  for (const id of s) {
    if (id === 'indian') {
      for (const rid of INDIAN_REGIONAL_LANGUAGE_IDS) {
        tokens.add(rid.toLowerCase());
      }
    } else {
      tokens.add(id.toLowerCase());
    }
  }
  return tokens.size > 0 ? [...tokens] : null;
}

/**
 * Explore language chips: user's onboarding choices + "All".
 * If nothing is stored yet, show the full catalog so the screen stays usable.
 */
export function getExploreLanguagePillIds(langPrefs: string[]): LanguageFilterId[] {
  const s = sanitizeLangPrefs(langPrefs);
  const ordered: LanguageFilterId[] =
    s.length > 0 ? [...s, 'all'] : [...LANGUAGE_CATALOG.map((x) => x.id), 'all'];
  return [...new Set(ordered)];
}

/**
 * Default home chip after onboarding: one explicit pick → that id; otherwise `'all'`.
 * On Home, `'all'` still means “all languages I picked in onboarding”, not the whole catalog
 * (see {@link getHomeAlbumSectionsFromLangPrefs}).
 */
export function defaultHomeLanguageFilter(langPrefs: string[]): LanguageFilterId {
  const s = sanitizeLangPrefs(langPrefs);
  if (s.length === 1) return s[0];
  return 'all';
}

/** Suffix for genre / discovery search queries on Explore (matches JioSaavn-friendly language tags). */
export function getLanguageQuerySuffix(filter: LanguageFilterId): string {
  if (filter === 'all') return '';
  return ` ${filter}`;
}

/** @deprecated use getLanguageLabel */
export const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries([
  ['all', 'All'],
  ...LANGUAGE_CATALOG.map((x) => [x.id, x.label] as const),
]);
