export const queryKeys = {
  homeAlbums: (section: string, term: string) => ['home', 'album', section, term] as const,
  homeSongs: (section: string, term: string) => ['home', 'song', section, term] as const,
  search: (q: string) => ['search', q] as const,
  song: (id: string) => ['song', id] as const,
  album: (id: string) => ['album', id] as const,
  artist: (id: string) => ['artist', id] as const,
  lyrics: (id: string) => ['lyrics', id] as const,
  user: (id: string) => ['user', id] as const,
  playlists: (userId: string) => ['playlists', userId] as const,
  playlist: (id: string) => ['playlist', id] as const,
  likedSongs: (ids: string) => ['likedSongs', ids] as const,
};
