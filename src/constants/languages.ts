/**
 * Single catalog for supported languages (ids + labels).
 * User-facing filters are driven by onboarding prefs where it makes sense; users can still widen filters in Profile.
 */

export const LANGUAGE_CATALOG = [
  { id: 'tamil', label: 'Tamil' },
  { id: 'hindi', label: 'Hindi' },
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
 * Explore language chips: user's onboarding choices + "All".
 * If nothing is stored yet, show the full catalog so the screen stays usable.
 */
export function getExploreLanguagePillIds(langPrefs: string[]): LanguageFilterId[] {
  const s = sanitizeLangPrefs(langPrefs);
  const ordered: LanguageFilterId[] =
    s.length > 0 ? [...s, 'all'] : [...LANGUAGE_CATALOG.map((x) => x.id), 'all'];
  return [...new Set(ordered)];
}

/** Profile / Home: every supported language plus "All" so users can override without re-onboarding */
export function getProfileHomeFilterOptions(): LanguageFilterId[] {
  return ['all', ...LANGUAGE_CATALOG.map((x) => x.id)];
}

/** Initial home/explore filter from prefs: single preference → that language; otherwise show everything */
export function defaultHomeLanguageFilter(langPrefs: string[]): LanguageFilterId {
  const s = sanitizeLangPrefs(langPrefs);
  if (s.length === 1) return s[0];
  return 'all';
}

/** Suffix for genre / discovery search queries on Explore */
export function getLanguageQuerySuffix(filter: LanguageFilterId): string {
  switch (filter) {
    case 'tamil':
      return ' tamil';
    case 'hindi':
      return ' hindi';
    case 'english':
      return ' english';
    case 'indian':
      return ' indian';
    default:
      return '';
  }
}

/** @deprecated use getLanguageLabel */
export const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries([
  ['all', 'All'],
  ...LANGUAGE_CATALOG.map((x) => [x.id, x.label] as const),
]);
