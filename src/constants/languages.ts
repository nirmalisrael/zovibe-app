export const LANGUAGE_OPTIONS = ['tamil', 'hindi', 'english', 'indian'] as const;

export type LanguageFilterId = (typeof LANGUAGE_OPTIONS)[number] | 'all';

export const LANGUAGE_LABELS: Record<string, string> = {
  tamil: 'Tamil',
  hindi: 'Hindi',
  english: 'English',
  indian: 'All Indian',
  all: 'All',
};
