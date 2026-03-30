/**
 * MockAPI `/playlists` resource — one row per user playlist.
 */
export interface PlaylistEntity {
  id: string;
  userId: string;
  name: string;
  description: string;
  /** JSON string: string[] of JioSaavn song ids */
  songIds: string;
  coverUrl: string;
  createdAt: string;
}
