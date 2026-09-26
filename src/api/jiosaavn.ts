/**
 * JioSaavn HTTP client (`JIOSAAVN_BASE`) — paths and query params match the hosted OpenAPI
 * (search: `query`/`page`/`limit`; album/playlist: `id`; song detail: `/api/songs/{id}`).
 */
import { JIOSAAVN_BASE } from '../constants/api';

export interface JioSaavnImage {
  quality: string;
  url: string;
}

export interface JioSaavnDownloadUrl {
  quality: string;
  url: string;
}

export interface JioSaavnSong {
  id: string;
  name: string;
  album: { id: string; name: string; url: string };
  year: string;
  releaseDate: string;
  duration: number;
  label: string;
  artists: {
    primary: Array<{ id: string; name: string; image: JioSaavnImage[] }>;
    all: Array<{ id: string; name: string }>;
  };
  image: JioSaavnImage[];
  downloadUrl: JioSaavnDownloadUrl[];
  language: string;
  hasLyrics: boolean;
  lyricsId: string | null;
}

export interface JioSaavnAlbumListItem {
  id: string;
  name: string;
  image?: JioSaavnImage[];
  language?: string;
  year?: string;
  artists?: { primary?: Array<{ id: string; name: string }> };
}

export interface JioSaavnArtistListItem {
  id: string;
  name: string;
  image?: JioSaavnImage[];
  role?: string;
}

export interface JioSaavnAlbumDetail extends JioSaavnAlbumListItem {
  songs?: JioSaavnSong[];
}

export interface JioSaavnArtistDetail extends JioSaavnArtistListItem {
  topSongs?: JioSaavnSong[];
  songs?: JioSaavnSong[];
  albums?: JioSaavnAlbumListItem[];
}

export interface JioSaavnPlaylist {
  id: string;
  name: string;
  description?: string;
  image?: JioSaavnImage[];
  songs?: JioSaavnSong[];
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const u = new URL(path, JIOSAAVN_BASE);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
    });
  }
  return u.toString();
}

async function fetchJson<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = buildUrl(path, params);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JioSaavn ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

import { cleanHtmlEntities } from '../utils/songHelpers';

function normalizeSongItem(raw: unknown): JioSaavnSong {
  if (!raw || typeof raw !== 'object') {
    return raw as JioSaavnSong;
  }
  const r = raw as Record<string, unknown>;
  const name = cleanHtmlEntities(
    typeof r.name === 'string' ? r.name : (typeof r.title === 'string' ? r.title : 'Unknown track')
  );

  let duration = 0;
  if (typeof r.duration === 'number' && Number.isFinite(r.duration)) {
    duration = r.duration;
  } else if (typeof r.duration === 'string') {
    duration = Number.parseFloat(r.duration) || 0;
  }

  // Format artists
  let artists = r.artists as JioSaavnSong['artists'] | undefined;
  if (!artists || (!artists.primary?.length && !artists.all?.length)) {
    const primaryStr = typeof r.primaryArtists === 'string' ? r.primaryArtists : '';
    const singersStr = typeof r.singers === 'string' ? r.singers : '';
    const artistStr = typeof r.artist === 'string' ? r.artist : '';
    const combined = primaryStr || singersStr || artistStr;
    const artistList = combined
      ? combined
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((n) => ({
            id: '',
            name: cleanHtmlEntities(n),
            image: [] as JioSaavnImage[],
          }))
      : [];

    artists = {
      primary: artistList,
      all: artistList,
    };
  }

  // Format album
  let album = r.album as JioSaavnSong['album'] | string | undefined;
  let normalizedAlbum: JioSaavnSong['album'];
  if (typeof album === 'string') {
    normalizedAlbum = { id: '', name: cleanHtmlEntities(album), url: '' };
  } else if (album && typeof album === 'object') {
    normalizedAlbum = {
      id: String(album.id ?? ''),
      name: cleanHtmlEntities(String(album.name ?? '')),
      url: String(album.url ?? ''),
    };
  } else {
    normalizedAlbum = { id: '', name: '', url: '' };
  }

  return {
    ...(r as unknown as JioSaavnSong),
    name,
    duration,
    artists,
    album: normalizedAlbum,
    image: Array.isArray(r.image) ? (r.image as JioSaavnImage[]) : [],
    downloadUrl: Array.isArray(r.downloadUrl) ? (r.downloadUrl as JioSaavnDownloadUrl[]) : [],
  };
}

/** Unwrap common API envelopes: { data }, { data: { results } }, top-level array */
function asSongArray(raw: unknown): JioSaavnSong[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const data = o.data;
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.results)) list = d.results;
      else if (Array.isArray(d.songs)) list = d.songs;
    } else if (Array.isArray(o.results)) {
      list = o.results;
    } else if (Array.isArray(o.songs)) {
      list = o.songs;
    }
  }
  return list.map(normalizeSongItem);
}

function asAlbumArray(raw: unknown): JioSaavnAlbumListItem[] {
  if (Array.isArray(raw)) return raw as JioSaavnAlbumListItem[];
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const data = o.data;
    if (Array.isArray(data)) return data as JioSaavnAlbumListItem[];
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.results)) return d.results as JioSaavnAlbumListItem[];
      if (Array.isArray(d.albums)) return d.albums as JioSaavnAlbumListItem[];
    }
    if (Array.isArray(o.results)) return o.results as JioSaavnAlbumListItem[];
  }
  return [];
}

function asArtistArray(raw: unknown): JioSaavnArtistListItem[] {
  if (Array.isArray(raw)) return raw as JioSaavnArtistListItem[];
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const data = o.data;
    if (Array.isArray(data)) return data as JioSaavnArtistListItem[];
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.results)) return d.results as JioSaavnArtistListItem[];
      if (Array.isArray(d.artists)) return d.artists as JioSaavnArtistListItem[];
    }
    if (Array.isArray(o.results)) return o.results as JioSaavnArtistListItem[];
  }
  return [];
}

/** GET /api/songs/{id} returns `data` as a song array in OpenAPI; some proxies return one object. */
function asSingleSongFromDetailResponse(raw: unknown): JioSaavnSong | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const data = o.data ?? o;
  if (Array.isArray(data)) {
    const first = data[0];
    if (first && typeof first === 'object' && 'id' in first) return first as JioSaavnSong;
    return null;
  }
  if (data && typeof data === 'object' && 'id' in data) return data as JioSaavnSong;
  return null;
}

export async function searchSongs(query: string, page = 0, limit = 20): Promise<JioSaavnSong[]> {
  const json = await fetchJson<unknown>('/api/search/songs', { query, page, limit });
  return asSongArray(json);
}

export async function searchAlbums(query: string, page = 0, limit = 10): Promise<JioSaavnAlbumListItem[]> {
  const json = await fetchJson<unknown>('/api/search/albums', { query, page, limit });
  return asAlbumArray(json);
}

export async function searchArtists(query: string, page = 0, limit = 10): Promise<JioSaavnArtistListItem[]> {
  const json = await fetchJson<unknown>('/api/search/artists', { query, page, limit });
  return asArtistArray(json);
}

export async function searchAll(query: string): Promise<{
  songs: JioSaavnSong[];
  albums: JioSaavnAlbumListItem[];
  artists: JioSaavnArtistListItem[];
}> {
  const [allRes, songsRes] = await Promise.allSettled([
    fetchJson<unknown>('/api/search', { query }),
    fetchJson<unknown>('/api/search/songs', { query, limit: 20 }),
  ]);

  const allData =
    allRes.status === 'fulfilled' && allRes.value && typeof allRes.value === 'object'
      ? (((allRes.value as Record<string, unknown>).data ?? allRes.value) as Record<string, unknown>)
      : {};

  const richSongs = songsRes.status === 'fulfilled' ? asSongArray(songsRes.value) : [];
  const basicSongs = asSongArray(allData.songs ?? allData);

  const songs = richSongs.length > 0 ? richSongs : basicSongs;

  return {
    songs,
    albums: asAlbumArray(allData.albums ?? []),
    artists: asArtistArray(allData.artists ?? []),
  };
}

export async function getSongById(id: string): Promise<JioSaavnSong | null> {
  const json = await fetchJson<unknown>(`/api/songs/${encodeURIComponent(id)}`);
  return asSingleSongFromDetailResponse(json);
}

export async function getAlbumById(id: string): Promise<JioSaavnAlbumDetail | null> {
  const json = await fetchJson<unknown>('/api/albums', { id });
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    const data = (o.data ?? o) as JioSaavnAlbumDetail;
    if (data?.id) return data;
  }
  return null;
}

export async function getArtistById(id: string): Promise<JioSaavnArtistDetail | null> {
  const json = await fetchJson<unknown>(`/api/artists/${encodeURIComponent(id)}`);
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    const data = (o.data ?? o) as JioSaavnArtistDetail;
    if (data?.id) return data;
  }
  return null;
}

export async function getArtistSongs(id: string): Promise<JioSaavnSong[]> {
  const json = await fetchJson<unknown>(`/api/artists/${encodeURIComponent(id)}/songs`);
  return asSongArray(json);
}

export async function getArtistAlbums(id: string): Promise<JioSaavnAlbumListItem[]> {
  const json = await fetchJson<unknown>(`/api/artists/${encodeURIComponent(id)}/albums`);
  return asAlbumArray(json);
}

export async function getPlaylistById(id: string): Promise<JioSaavnPlaylist | null> {
  const json = await fetchJson<unknown>('/api/playlists', { id });
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    const data = (o.data ?? o) as JioSaavnPlaylist;
    if (data?.id) return data;
  }
  return null;
}

export async function getSongSuggestions(
  songId: string,
  limit = 10,
  currentSong?: JioSaavnSong | null
): Promise<JioSaavnSong[]> {
  try {
    const json = await fetchJson<unknown>(`/api/songs/${encodeURIComponent(songId)}/suggestions`, { limit });
    const list = asSongArray(json);
    if (list.length > 0) return list;
  } catch {
    /* fallback below */
  }

  if (currentSong?.artists?.primary?.[0]?.name) {
    try {
      const artistSongs = await searchSongs(currentSong.artists.primary[0].name, 0, limit);
      const filtered = artistSongs.filter((s) => s.id !== songId);
      if (filtered.length > 0) return filtered;
    } catch {
      /* ignore */
    }
  }
  return [];
}

export async function getLyrics(songId: string): Promise<string> {
  const json = await fetchJson<unknown>(`/api/songs/${encodeURIComponent(songId)}/lyrics`);
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    const data = o.data ?? o;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (typeof d.lyrics === 'string') return d.lyrics;
      if (typeof d.snippet === 'string') return d.snippet;
    }
    if (typeof o.lyrics === 'string') return o.lyrics;
  }
  return '';
}

