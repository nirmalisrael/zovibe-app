import { MOCKAPI_BASE } from '../constants/api';
import { utf8ToBase64 } from '../utils/encoding';
import type { UserEntity } from '../entities/user';
import type { PlaylistEntity } from '../entities/playlist';
import { initialsFromFullName } from '../entities/user';

const BASE = MOCKAPI_BASE;

export type MockAPIUser = UserEntity;
export type MockAPIPlaylistRow = PlaylistEntity;

export function parseJsonArray<T>(raw: string, fallback: T[]): T[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export async function registerUser(
  fullName: string,
  username: string,
  email: string,
  password: string
): Promise<MockAPIUser> {
  const u = username.trim().toLowerCase();
  if (/\s/.test(u)) throw new Error('Username cannot contain spaces');
  if (!u.length) throw new Error('Username is required');

  const existing = (await fetch(`${BASE}/users?username=${encodeURIComponent(u)}`).then((r) =>
    r.json()
  )) as MockAPIUser[];
  if (Array.isArray(existing) && existing.length > 0) throw new Error('Username already taken');

  const name = fullName.trim();
  const avatar = initialsFromFullName(name || u);

  const res = await fetch(`${BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      username: u,
      email: email.trim(),
      password: utf8ToBase64(password),
      avatar,
      createdAt: new Date().toISOString(),
      likedSongs: '[]',
      recentlyPlayed: '[]',
      playlists: '[]',
    }),
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json() as Promise<MockAPIUser>;
}

export async function loginUser(username: string, password: string): Promise<MockAPIUser> {
  const u = username.trim().toLowerCase();
  const users = (await fetch(`${BASE}/users?username=${encodeURIComponent(u)}`).then((r) =>
    r.json()
  )) as MockAPIUser[];
  if (!Array.isArray(users) || users.length === 0) throw new Error('User not found');
  const user = users[0];
  if (user.password !== utf8ToBase64(password)) throw new Error('Wrong password');
  return user;
}

export async function getUser(userId: string): Promise<MockAPIUser> {
  const res = await fetch(`${BASE}/users/${userId}`);
  if (!res.ok) throw new Error('User not found');
  return res.json() as Promise<MockAPIUser>;
}

export async function updateUser(
  userId: string,
  data: Partial<Record<string, string>>
): Promise<MockAPIUser> {
  const res = await fetch(`${BASE}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json() as Promise<MockAPIUser>;
}

export async function likeSong(
  userId: string,
  songId: string,
  currentLiked: string[]
): Promise<MockAPIUser> {
  const updated = [...new Set([...currentLiked, songId])];
  return updateUser(userId, { likedSongs: JSON.stringify(updated) });
}

export async function unlikeSong(
  userId: string,
  songId: string,
  currentLiked: string[]
): Promise<MockAPIUser> {
  const updated = currentLiked.filter((id) => id !== songId);
  return updateUser(userId, { likedSongs: JSON.stringify(updated) });
}

export async function addRecentlyPlayed(
  userId: string,
  songId: string,
  current: string[]
): Promise<MockAPIUser> {
  const filtered = current.filter((id) => id !== songId);
  const updated = [songId, ...filtered].slice(0, 20);
  return updateUser(userId, { recentlyPlayed: JSON.stringify(updated) });
}

export async function getUserPlaylists(userId: string): Promise<MockAPIPlaylistRow[]> {
  const res = await fetch(`${BASE}/playlists?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as MockAPIPlaylistRow[];
  return Array.isArray(data) ? data : [];
}

export async function createPlaylist(
  userId: string,
  name: string,
  description = ''
): Promise<MockAPIPlaylistRow> {
  const res = await fetch(`${BASE}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      name,
      description,
      songIds: '[]',
      coverUrl: '',
      createdAt: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error('Could not create playlist');
  return res.json() as Promise<MockAPIPlaylistRow>;
}

export async function updatePlaylist(
  playlistId: string,
  data: Partial<Pick<MockAPIPlaylistRow, 'name' | 'description' | 'songIds' | 'coverUrl'>>
): Promise<MockAPIPlaylistRow> {
  const body: Record<string, string> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.description !== undefined) body.description = data.description;
  if (data.songIds !== undefined) body.songIds = data.songIds;
  if (data.coverUrl !== undefined) body.coverUrl = data.coverUrl;
  const res = await fetch(`${BASE}/playlists/${playlistId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Update playlist failed');
  return res.json() as Promise<MockAPIPlaylistRow>;
}

export async function addSongToPlaylist(
  playlistId: string,
  songId: string,
  currentIds: string[]
): Promise<MockAPIPlaylistRow> {
  const updated = [...new Set([...currentIds, songId])];
  return updatePlaylist(playlistId, { songIds: JSON.stringify(updated) });
}

export async function removeSongFromPlaylist(
  playlistId: string,
  songId: string,
  currentIds: string[]
): Promise<MockAPIPlaylistRow> {
  const updated = currentIds.filter((id) => id !== songId);
  return updatePlaylist(playlistId, { songIds: JSON.stringify(updated) });
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  await fetch(`${BASE}/playlists/${playlistId}`, { method: 'DELETE' });
}
