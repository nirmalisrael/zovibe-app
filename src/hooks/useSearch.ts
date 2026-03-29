import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchAll } from '../api/jiosaavn';
import { queryKeys } from './queryKeys';

export function useSearch(debounceMs = 300) {
  const [raw, setRaw] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(raw.trim()), debounceMs);
    return () => clearTimeout(t);
  }, [raw, debounceMs]);

  const query = useQuery({
    queryKey: queryKeys.search(debounced),
    queryFn: () => searchAll(debounced),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  return {
    raw,
    setRaw,
    debounced,
    ...query,
  };
}
