import { useCallback, useEffect, useRef, useState } from 'react';
import { SEARCH_CATEGORIES, type SearchCategory } from '../constants/search';
import { getSecure, KEY_RECENT_SEARCHES, setSecure } from '../utils/storage';

const MAX_RECENT_SEARCHES = 8;

export interface RecentSearch {
  query: string;
  category: SearchCategory;
}

function parseRecentSearches(raw: string | null): RecentSearch[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .flatMap((item): RecentSearch[] => {
        if (
          !item ||
          typeof item !== 'object' ||
          !('query' in item) ||
          typeof item.query !== 'string' ||
          !item.query.trim()
        ) {
          return [];
        }

        const category =
          'category' in item &&
          typeof item.category === 'string' &&
          SEARCH_CATEGORIES.includes(item.category as SearchCategory)
            ? item.category as SearchCategory
            : 'songs';
        return [{ query: item.query.trim(), category }];
      })
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const recentSearchesRef = useRef<RecentSearch[]>([]);
  const hasLocalChanges = useRef(false);

  useEffect(() => {
    let active = true;
    void getSecure(KEY_RECENT_SEARCHES).then((raw) => {
      if (!active || hasLocalChanges.current) return;
      const loaded = parseRecentSearches(raw);
      recentSearchesRef.current = loaded;
      setRecentSearches(loaded);
    });

    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: RecentSearch[]) => {
    recentSearchesRef.current = next;
    hasLocalChanges.current = true;
    setRecentSearches(next);
    void setSecure(KEY_RECENT_SEARCHES, JSON.stringify(next)).catch((error: unknown) => {
      console.warn('Could not save recent searches', error);
    });
  }, []);

  const addRecentSearch = useCallback(
    (query: string, category: SearchCategory) => {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) return;

      const next = [
        { query: normalizedQuery, category },
        ...recentSearchesRef.current.filter(
          (item) =>
            item.category !== category ||
            item.query.toLowerCase() !== normalizedQuery.toLowerCase()
        ),
      ].slice(0, MAX_RECENT_SEARCHES);

      persist(next);
    },
    [persist]
  );

  const clearRecentSearches = useCallback(() => {
    persist([]);
  }, [persist]);

  return { recentSearches, addRecentSearch, clearRecentSearches };
}
