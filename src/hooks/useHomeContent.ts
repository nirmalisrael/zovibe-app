import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  searchAlbums,
  searchSongs,
  type JioSaavnAlbumListItem,
  type JioSaavnSong,
} from '../api/jiosaavn';
import {
  HOME_ALBUM_SECTIONS,
  HOME_SEEDS,
  albumMatchesHomeSection,
  buildTrendingDiscoveryTerms,
  type HomeAlbumSection,
} from '../constants/homeSeed';
import {
  getHomeAlbumSectionsFromLangPrefs,
  getLanguageQuerySuffix,
  getLanguageMatchTokensForPrefs,
  type LanguageFilterId,
} from '../constants/languages';
import { queryKeys } from './queryKeys';

type TrendingKey = 'trending';

function buildHomeAlbumQueries(sections: readonly HomeAlbumSection[]) {
  return sections.flatMap((section) =>
    (HOME_SEEDS[section] ?? []).map((term) => ({
      queryKey: queryKeys.homeAlbums(section, term),
      queryFn: async () => {
        try {
          const suffix = getLanguageQuerySuffix(section as LanguageFilterId);
          const q = `${term}${suffix}`.trim();
          const albums = await searchAlbums(q, 0, 5);
          const filtered = (albums || []).filter((a) => albumMatchesHomeSection(a, section));
          return { section, term, albums: filtered };
        } catch {
          return { section, term, albums: [] };
        }
      },
      staleTime: 5 * 60 * 1000,
    }))
  );
}

function useSectionSongs(section: TrendingKey, terms: readonly string[]) {
  return useQueries({
    queries: terms.map((term) => ({
      queryKey: queryKeys.homeSongs(section, term),
      queryFn: async () => {
        try {
          const songs = await searchSongs(term, 0, 12);
          return { term, songs: songs || [] };
        } catch {
          return { term, songs: [] };
        }
      },
      staleTime: 5 * 60 * 1000,
    })),
  });
}

function mergeAlbumsBySection(
  results: { data?: { section: HomeAlbumSection; albums: JioSaavnAlbumListItem[] } }[]
): Record<HomeAlbumSection, JioSaavnAlbumListItem[]> {
  const maps: Record<HomeAlbumSection, Map<string, JioSaavnAlbumListItem>> = {} as Record<
    HomeAlbumSection,
    Map<string, JioSaavnAlbumListItem>
  >;
  for (const s of HOME_ALBUM_SECTIONS) {
    maps[s] = new Map();
  }
  for (const q of results) {
    const d = q.data;
    if (!d) continue;
    const { section, albums } = d;
    const m = maps[section];
    if (!m) continue;
    for (const a of (albums || [])) {
      if (a?.id) m.set(a.id, a);
    }
  }
  return HOME_ALBUM_SECTIONS.reduce(
    (acc, s) => {
      acc[s] = maps[s] ? [...maps[s].values()] : [];
      return acc;
    },
    {} as Record<HomeAlbumSection, JioSaavnAlbumListItem[]>
  );
}

function flattenSongs(results: ReturnType<typeof useSectionSongs>): JioSaavnSong[] {
  const map = new Map<string, JioSaavnSong>();
  for (const q of results) {
    const data = q.data;
    if (!data?.songs) continue;
    for (const s of data.songs) {
      if (s?.id && !map.has(s.id)) map.set(s.id, s);
    }
  }
  return [...map.values()];
}

function songMatchesLanguageTokens(song: JioSaavnSong, tokens: string[] | null): boolean {
  if (!tokens) return true;
  const L = (song.language || '').toLowerCase();
  if (!L) return false;
  return tokens.some((t) => L.includes(t));
}

function toSongTimestamp(song: JioSaavnSong): number {
  const releaseTs = song.releaseDate ? Date.parse(song.releaseDate) : Number.NaN;
  if (!Number.isNaN(releaseTs)) return releaseTs;
  const y = Number(song.year);
  if (!Number.isNaN(y) && y > 1900) return Date.UTC(y, 0, 1);
  return 0;
}

/**
 * @param albumSections Sections to load (from {@link getHomeAlbumSectionsFromLangPrefs} or full catalog).
 * @param langPrefs Raw prefs for trending language filter; empty → no trending filter.
 */
export function useHomeContent(
  albumSections: readonly HomeAlbumSection[] = HOME_ALBUM_SECTIONS,
  langPrefs: readonly string[] = []
) {
  const sectionsSig = albumSections.join(',');
  const albumQueries = useMemo(() => buildHomeAlbumQueries(albumSections), [sectionsSig]);
  const albumResults = useQueries({ queries: albumQueries });
  const langPrefsKey = langPrefs.join('|');
  const prefSections = useMemo(
    () => getHomeAlbumSectionsFromLangPrefs([...langPrefs]),
    [langPrefsKey]
  );
  const trendingTerms = useMemo(
    () => buildTrendingDiscoveryTerms(prefSections),
    [prefSections?.join(',')]
  );
  const trendingQ = useSectionSongs('trending', trendingTerms);

  const albumsBySection = mergeAlbumsBySection(albumResults);

  const trendTokens = useMemo(() => getLanguageMatchTokensForPrefs([...langPrefs]), [langPrefsKey]);

  const flatTrending = flattenSongs(trendingQ);
  const trendingSongs = flatTrending
    .filter((s) => songMatchesLanguageTokens(s, trendTokens))
    .sort((a, b) => toSongTimestamp(b) - toSongTimestamp(a));

  const hasContent =
    Object.values(albumsBySection).some((list) => (list?.length ?? 0) > 0) || trendingSongs.length > 0;
  const isInitialLoading =
    !hasContent &&
    (!albumResults.every((q) => q.isFetched) || !trendingQ.every((q) => q.isFetched));
  const isFetching =
    albumResults.some((q) => q.isFetching) || trendingQ.some((q) => q.isFetching);
  const isError =
    !hasContent &&
    albumResults.length > 0 &&
    albumResults.every((q) => q.isError);

  return {
    albumsBySection,
    tamilAlbums: albumsBySection.tamil,
    hindiAlbums: albumsBySection.hindi,
    teluguAlbums: albumsBySection.telugu,
    malayalamAlbums: albumsBySection.malayalam,
    kannadaAlbums: albumsBySection.kannada,
    punjabiAlbums: albumsBySection.punjabi,
    bengaliAlbums: albumsBySection.bengali,
    marathiAlbums: albumsBySection.marathi,
    englishAlbums: albumsBySection.english,
    trendingSongs,
    isInitialLoading,
    isFetching,
    isError,
    refetch: () => {
      albumResults.forEach((q) => void q.refetch());
      trendingQ.forEach((q) => void q.refetch());
    },
  };
}
