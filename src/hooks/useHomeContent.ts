import { useQueries } from '@tanstack/react-query';
import { searchAlbums, searchSongs, type JioSaavnAlbumListItem, type JioSaavnSong } from '../api/jiosaavn';
import { HOME_SEEDS } from '../constants/homeSeed';
import { queryKeys } from './queryKeys';

type SectionKey = 'tamil' | 'hindi' | 'english' | 'trending';

function useSectionAlbums(section: SectionKey, terms: readonly string[]) {
  return useQueries({
    queries: terms.map((term) => ({
      queryKey: queryKeys.homeAlbums(section, term),
      queryFn: async () => {
        const albums = await searchAlbums(term, 0, 5);
        return { term, albums };
      },
      staleTime: 5 * 60 * 1000,
    })),
  });
}

function useSectionSongs(section: SectionKey, terms: readonly string[]) {
  return useQueries({
    queries: terms.map((term) => ({
      queryKey: queryKeys.homeSongs(section, term),
      queryFn: async () => {
        const songs = await searchSongs(term, 0, 8);
        return { term, songs };
      },
      staleTime: 5 * 60 * 1000,
    })),
  });
}

function flattenAlbums(
  results: ReturnType<typeof useSectionAlbums>
): JioSaavnAlbumListItem[] {
  const map = new Map<string, JioSaavnAlbumListItem>();
  for (const q of results) {
    const data = q.data;
    if (!data) continue;
    for (const a of data.albums) {
      if (a?.id && !map.has(a.id)) map.set(a.id, a);
    }
  }
  return [...map.values()];
}

function flattenSongs(results: ReturnType<typeof useSectionSongs>): JioSaavnSong[] {
  const map = new Map<string, JioSaavnSong>();
  for (const q of results) {
    const data = q.data;
    if (!data) continue;
    for (const s of data.songs) {
      if (s?.id && !map.has(s.id)) map.set(s.id, s);
    }
  }
  return [...map.values()];
}

function anyLoading(results: { isPending: boolean; isFetching: boolean }[]) {
  return results.some((r) => r.isPending || r.isFetching);
}

export function useHomeContent() {
  const tamilQ = useSectionAlbums('tamil', HOME_SEEDS.tamil);
  const hindiQ = useSectionAlbums('hindi', HOME_SEEDS.hindi);
  const englishQ = useSectionAlbums('english', HOME_SEEDS.english);
  const trendingQ = useSectionSongs('trending', HOME_SEEDS.trending);

  return {
    tamilAlbums: flattenAlbums(tamilQ),
    hindiAlbums: flattenAlbums(hindiQ),
    englishAlbums: flattenAlbums(englishQ),
    trendingSongs: flattenSongs(trendingQ),
    isLoading:
      anyLoading(tamilQ) ||
      anyLoading(hindiQ) ||
      anyLoading(englishQ) ||
      anyLoading(trendingQ),
    isError:
      tamilQ.some((q) => q.isError) ||
      hindiQ.some((q) => q.isError) ||
      englishQ.some((q) => q.isError) ||
      trendingQ.some((q) => q.isError),
    refetch: () => {
      tamilQ.forEach((q) => void q.refetch());
      hindiQ.forEach((q) => void q.refetch());
      englishQ.forEach((q) => void q.refetch());
      trendingQ.forEach((q) => void q.refetch());
    },
  };
}
