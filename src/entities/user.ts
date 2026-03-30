/**
 * MockAPI `/users` resource — canonical shape for the app.
 * `name` = display name (e.g. "Nirmal Israel"); `username` = login handle (e.g. "nirmalisrael").
 */
export interface UserEntity {
  id: string;
  /** Full display name, e.g. "Nirmal Israel". Omit on legacy MockAPI rows until you add the column. */
  name?: string;
  /** Unique login handle (no spaces) */
  username: string;
  email: string;
  /** Base64-encoded password (obfuscation only — not production-grade) */
  password: string;
  /** Short initials for avatar chip, usually derived from `name` */
  avatar: string;
  createdAt: string;
  /** JSON string: string[] of JioSaavn song ids */
  likedSongs: string;
  /** JSON string: string[] of song ids, max 20 */
  recentlyPlayed: string;
  /** JSON string (often `[]`); playlist rows live on `/playlists` */
  playlists: string;
}

/** Two letters from first + last word, or first two chars of a single word */
export function initialsFromFullName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return '??';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? '';
    const b = parts[parts.length - 1][0] ?? '';
    return (a + b).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

export function displayNameOrUsername(user: Pick<UserEntity, 'name' | 'username'>): string {
  const n = user.name?.trim();
  if (n) return n;
  return user.username ?? '';
}

/** Avatar letters: stored value, or computed from display name / username */
export function resolveUserAvatar(user: Pick<UserEntity, 'avatar' | 'name' | 'username'>): string {
  const a = user.avatar?.trim();
  if (a) return a.slice(0, 2).toUpperCase();
  return initialsFromFullName(displayNameOrUsername(user));
}
