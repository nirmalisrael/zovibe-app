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

/** Unwrap common API envelopes: { data }, { data: { results } }, top-level array */
function asSongArray(raw: unknown): JioSaavnSong[] {
  if (Array.isArray(raw)) return raw as JioSaavnSong[];
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const data = o.data;
    if (Array.isArray(data)) return data as JioSaavnSong[];
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.results)) return d.results as JioSaavnSong[];
      if (Array.isArray(d.songs)) return d.songs as JioSaavnSong[];
    }
    if (Array.isArray(o.results)) return o.results as JioSaavnSong[];
    if (Array.isArray(o.songs)) return o.songs as JioSaavnSong[];
  }
  return [];
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
  const json = await fetchJson<unknown>('/api/search', { query });
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    const data = (o.data ?? o) as Record<string, unknown>;
    return {
      songs: asSongArray(data.songs ?? data),
      albums: asAlbumArray(data.albums ?? []),
      artists: asArtistArray(data.artists ?? []),
    };
  }
  return { songs: [], albums: [], artists: [] };
}

export async function getSongById(id: string): Promise<JioSaavnSong | null> {
  const json = await fetchJson<unknown>(`/api/songs/${encodeURIComponent(id)}`);
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    const data = o.data ?? o;
    if (data && typeof data === 'object' && 'id' in (data as object)) {
      return data as JioSaavnSong;
    }
  }
  return null;
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
