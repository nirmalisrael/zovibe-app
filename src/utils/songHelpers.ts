/** JioSaavn search payloads often omit or slim nested `artists` / `album`. */

export function getPrimaryArtistNames(song: {
  artists?: { primary?: Array<{ name?: string }>; all?: Array<{ name?: string }> };
}): string {
  const primary = song.artists?.primary;
  if (Array.isArray(primary) && primary.length > 0) {
    const s = primary
      .map((a) => (typeof a?.name === 'string' ? a.name : ''))
      .filter(Boolean)
      .join(', ');
    if (s) return s;
  }
  const all = song.artists?.all;
  if (Array.isArray(all) && all.length > 0) {
    return all
      .map((a) => (typeof a?.name === 'string' ? a.name : ''))
      .filter(Boolean)
      .join(', ');
  }
  return 'Unknown artist';
}

export function getAlbumNameSafe(song: { album?: { name?: string } }): string {
  return typeof song.album?.name === 'string' && song.album.name ? song.album.name : 'Unknown album';
}
