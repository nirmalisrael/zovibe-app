import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  searchAlbums,
  searchArtists,
  searchSongs,
  type JioSaavnAlbumListItem,
  type JioSaavnArtistListItem,
  type JioSaavnSong,
} from '../api/jiosaavn';

export function useSearch(debounceMs = 300) {
  const [raw, setRaw] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(raw.trim()), debounceMs);
    return () => clearTimeout(t);
  }, [raw, debounceMs]);

  const enabled = debounced.length >= 2;
  const [songsQ, albumsQ, artistsQ] = useQueries({
    queries: [
      {
        queryKey: ['search', 'songs', debounced],
        queryFn: () => searchSongs(debounced, 0, 20),
        enabled,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['search', 'albums', debounced],
        queryFn: () => searchAlbums(debounced, 0, 20),
        enabled,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['search', 'artists', debounced],
        queryFn: () => searchArtists(debounced, 0, 20),
        enabled,
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const data = useMemo<{
    songs: JioSaavnSong[];
    albums: JioSaavnAlbumListItem[];
    artists: JioSaavnArtistListItem[];
  }>(
    () => ({
      songs: songsQ.data ?? [],
      albums: albumsQ.data ?? [],
      artists: artistsQ.data ?? [],
    }),
    [songsQ.data, albumsQ.data, artistsQ.data]
  );

  const isPending = songsQ.isPending || albumsQ.isPending || artistsQ.isPending;
  const isFetching = songsQ.isFetching || albumsQ.isFetching || artistsQ.isFetching;
  const isError = songsQ.isError || albumsQ.isError || artistsQ.isError;
  const error = songsQ.error ?? albumsQ.error ?? artistsQ.error ?? null;
  const refetch = () => {
    void songsQ.refetch();
    void albumsQ.refetch();
    void artistsQ.refetch();
  };

  return {
    raw,
    setRaw,
    debounced,
    data,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  };
}
