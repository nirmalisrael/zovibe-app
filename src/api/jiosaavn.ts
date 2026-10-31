/**
 * JioSaavn HTTP client (`JIOSAAVN_BASE`) — paths and query params match the hosted OpenAPI
 * (search: `query`/`page`/`limit`; album/playlist detail: `id`; song detail: `/api/songs/{id}`).
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
  album: { id: string | null; name: string | null; url: string | null };
  year: string | null;
  releaseDate: string | null;
  duration: number | null;
  playCount: number | null;
  label: string | null;
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
  language?: string;
  songCount?: number;
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

async function fetchJson<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal
): Promise<T> {
  const url = buildUrl(path, params);
  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) throw new Error(`JioSaavn ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

function decodeHtmlEntities(value: string): string;
function decodeHtmlEntities(value: string | null): string | null;
function decodeHtmlEntities(value: string | null): string | null {
  if (value === null) return null;

  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    quot: '"',
  };

  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot|#39);/gi, (entity, code: string) => {
    if (code[0] !== '#') {
      return namedEntities[code.toLowerCase()] ?? entity;
    }

    const isHex = code[1]?.toLowerCase() === 'x';
    const point = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
      ? String.fromCodePoint(point)
      : entity;
  });
}

function normalizeImages(images: unknown): JioSaavnImage[] | undefined {
  const values = Array.isArray(images) ? images : images ? [images] : [];
  const normalized = values.filter(
    (image): image is JioSaavnImage =>
      image !== null &&
      typeof image === 'object' &&
      'url' in image &&
      typeof image.url === 'string'
  );
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeSongText(song: JioSaavnSong): JioSaavnSong {
  return {
    ...song,
    name: decodeHtmlEntities(song.name),
    album: song.album
      ? { ...song.album, name: decodeHtmlEntities(song.album.name) }
      : song.album,
    artists: song.artists
      ? {
          ...song.artists,
          primary: song.artists.primary?.map((artist) => ({
            ...artist,
            name: decodeHtmlEntities(artist.name),
          })),
          all: song.artists.all?.map((artist) => ({
            ...artist,
            name: decodeHtmlEntities(artist.name),
          })),
        }
      : song.artists,
  };
}

/** Unwrap common API envelopes: { data }, { data: { results } }, top-level array */
function asSongArray(raw: unknown): JioSaavnSong[] {
  if (Array.isArray(raw)) return raw.map((song) => normalizeSongText(song as JioSaavnSong));
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const data = o.data;
    if (Array.isArray(data)) return data.map((song) => normalizeSongText(song as JioSaavnSong));
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.results)) return d.results.map((song) => normalizeSongText(song as JioSaavnSong));
      if (Array.isArray(d.songs)) return d.songs.map((song) => normalizeSongText(song as JioSaavnSong));
    }
    if (Array.isArray(o.results)) return o.results.map((song) => normalizeSongText(song as JioSaavnSong));
    if (Array.isArray(o.songs)) return o.songs.map((song) => normalizeSongText(song as JioSaavnSong));
  }
  return [];
}

function asAlbumArray(raw: unknown): JioSaavnAlbumListItem[] {
  let items: JioSaavnAlbumListItem[] = [];
  if (Array.isArray(raw)) items = raw as JioSaavnAlbumListItem[];
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const data = o.data;
    if (Array.isArray(data)) items = data as JioSaavnAlbumListItem[];
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.results)) items = d.results as JioSaavnAlbumListItem[];
      if (Array.isArray(d.albums)) items = d.albums as JioSaavnAlbumListItem[];
    }
    if (Array.isArray(o.results)) items = o.results as JioSaavnAlbumListItem[];
  }
  return items.map((album) => ({
    ...album,
    name: decodeHtmlEntities(album.name),
    image: normalizeImages(album.image),
  }));
}

function asArtistArray(raw: unknown): JioSaavnArtistListItem[] {
  let items: JioSaavnArtistListItem[] = [];
  if (Array.isArray(raw)) items = raw as JioSaavnArtistListItem[];
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const data = o.data;
    if (Array.isArray(data)) items = data as JioSaavnArtistListItem[];
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.results)) items = d.results as JioSaavnArtistListItem[];
      if (Array.isArray(d.artists)) items = d.artists as JioSaavnArtistListItem[];
    }
    if (Array.isArray(o.results)) items = o.results as JioSaavnArtistListItem[];
  }
  return items.map((artist) => ({
    ...artist,
    name: decodeHtmlEntities(artist.name),
    image: normalizeImages(artist.image),
  }));
}

function asPlaylistArray(raw: unknown): JioSaavnPlaylist[] {
  let items: JioSaavnPlaylist[] = [];
  if (Array.isArray(raw)) items = raw as JioSaavnPlaylist[];
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const data = o.data;
    if (Array.isArray(data)) items = data as JioSaavnPlaylist[];
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.results)) items = d.results as JioSaavnPlaylist[];
      if (Array.isArray(d.playlists)) items = d.playlists as JioSaavnPlaylist[];
    }
    if (Array.isArray(o.results)) items = o.results as JioSaavnPlaylist[];
    if (Array.isArray(o.playlists)) items = o.playlists as JioSaavnPlaylist[];
  }
  return items.map((playlist) => ({
    ...playlist,
    name: decodeHtmlEntities(playlist.name),
    image: normalizeImages(playlist.image),
  }));
}

/** GET /api/songs/{id} returns `data` as a song array in OpenAPI; some proxies return one object. */
function asSingleSongFromDetailResponse(raw: unknown): JioSaavnSong | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const data = o.data ?? o;
  if (Array.isArray(data)) {
    const first = data[0];
    if (first && typeof first === 'object' && 'id' in first) {
      return normalizeSongText(first as JioSaavnSong);
    }
    return null;
  }
  if (data && typeof data === 'object' && 'id' in data) {
    return normalizeSongText(data as JioSaavnSong);
  }
  return null;
}

export async function searchSongs(
  query: string,
  page = 0,
  limit = 20,
  signal?: AbortSignal
): Promise<JioSaavnSong[]> {
  const json = await fetchJson<unknown>('/api/search/songs', { query, page, limit }, signal);
  return asSongArray(json);
}

export async function searchAlbums(
  query: string,
  page = 0,
  limit = 10,
  signal?: AbortSignal
): Promise<JioSaavnAlbumListItem[]> {
  const json = await fetchJson<unknown>('/api/search/albums', { query, page, limit }, signal);
  return asAlbumArray(json);
}

export async function searchArtists(
  query: string,
  page = 0,
  limit = 10,
  signal?: AbortSignal
): Promise<JioSaavnArtistListItem[]> {
  const json = await fetchJson<unknown>('/api/search/artists', { query, page, limit }, signal);
  return asArtistArray(json);
}

export async function searchPlaylists(
  query: string,
  page = 0,
  limit = 10,
  signal?: AbortSignal
): Promise<JioSaavnPlaylist[]> {
  const json = await fetchJson<unknown>('/api/search/playlists', { query, page, limit }, signal);
  return asPlaylistArray(json);
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
    if (data?.id) {
      return {
        ...data,
        name: decodeHtmlEntities(data.name),
        image: normalizeImages(data.image),
        songs: data.songs?.map(normalizeSongText),
      };
    }
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
    if (data?.id) {
      return {
        ...data,
        name: decodeHtmlEntities(data.name),
        image: normalizeImages(data.image),
        songs: data.songs?.map(normalizeSongText),
      };
    }
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
