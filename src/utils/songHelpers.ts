/** Decode common HTML entities from JioSaavn text responses. */
export function cleanHtmlEntities(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

/** JioSaavn search payloads often omit or slim nested `artists` / `album`. */
export function getPrimaryArtistNames(song: {
  artists?: { primary?: Array<{ name?: string }>; all?: Array<{ name?: string }> };
  primaryArtists?: string;
  singers?: string;
  artist?: string;
}): string {
  const primary = song.artists?.primary;
  if (Array.isArray(primary) && primary.length > 0) {
    const s = primary
      .map((a) => (typeof a?.name === 'string' ? cleanHtmlEntities(a.name) : ''))
      .filter(Boolean)
      .join(', ');
    if (s) return s;
  }
  const all = song.artists?.all;
  if (Array.isArray(all) && all.length > 0) {
    const s = all
      .map((a) => (typeof a?.name === 'string' ? cleanHtmlEntities(a.name) : ''))
      .filter(Boolean)
      .join(', ');
    if (s) return s;
  }
  if (typeof song.primaryArtists === 'string' && song.primaryArtists.trim()) {
    return cleanHtmlEntities(song.primaryArtists);
  }
  if (typeof song.singers === 'string' && song.singers.trim()) {
    return cleanHtmlEntities(song.singers);
  }
  if (typeof song.artist === 'string' && song.artist.trim()) {
    return cleanHtmlEntities(song.artist);
  }
  return 'Unknown artist';
}

export function getAlbumNameSafe(song: { album?: { name?: string } | string }): string {
  if (typeof song.album === 'string' && song.album.trim()) {
    return cleanHtmlEntities(song.album);
  }
  if (song.album && typeof song.album === 'object' && typeof song.album.name === 'string' && song.album.name.trim()) {
    return cleanHtmlEntities(song.album.name);
  }
  return 'Unknown album';
}
