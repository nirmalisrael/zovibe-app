import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchSongs } from '../api/jiosaavn';
import { songMatchesLanguageFilter, type LanguageFilterId } from '../constants/languages';
import { queryKeys } from './queryKeys';

export function useSearch(language: LanguageFilterId, debounceMs = 350, enabled = true) {
  const [raw, setRaw] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(raw.trim()), debounceMs);
    return () => clearTimeout(timer);
  }, [raw, debounceMs]);

  const searchQuery = useQuery({
    queryKey: queryKeys.searchSongs(debounced),
    queryFn: ({ signal }) => searchSongs(debounced, 0, 20, signal),
    enabled: enabled && debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const songs = useMemo(() => {
    const results = searchQuery.data ?? [];
    return results.filter((song) => songMatchesLanguageFilter(song, language));
  }, [language, searchQuery.data]);

  return {
    raw,
    setRaw,
    debounced,
    songs,
    isPending: searchQuery.isPending,
    isFetching: searchQuery.isFetching,
    isError: searchQuery.isError,
    isSuccess: searchQuery.isSuccess,
    refetch: searchQuery.refetch,
  };
}
