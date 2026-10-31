export const SEARCH_CATEGORIES = ['songs', 'albums', 'artists', 'playlists'] as const;

export type SearchCategory = (typeof SEARCH_CATEGORIES)[number];

export const SEARCH_CATEGORY_LABELS: Record<SearchCategory, string> = {
  songs: 'Songs',
  albums: 'Albums',
  artists: 'Artists',
  playlists: 'Playlists',
};

const EXPLICIT_CATEGORY_TERMS: Record<Exclude<SearchCategory, 'songs'>, string[]> = {
  playlists: [
    'playlist', 'playlists', 'mix', 'mixes', 'mixtape', 'mixtapes',
    'compilation', 'compilations', 'collection', 'collections', 'radio',
    'station', 'stations', 'playlist name', 'playlist names',
  ],
  albums: [
    'album', 'albums', 'soundtrack', 'soundtracks', 'ost', 'original soundtrack',
    'film album', 'movie album', 'ep', 'eps', 'lp', 'lps', 'discography',
    'discographies', 'album name', 'album names', 'album title', 'album titles',
  ],
  artists: [
    'artist', 'artists', 'singer', 'singers', 'vocalist', 'vocalists', 'band',
    'bands', 'rapper', 'rappers', 'composer', 'composers', 'music director',
    'playback singer', 'playback singers', 'musician', 'musicians', 'performer',
    'performers', 'who sings', 'who sang', 'singer profile', 'artist profile',
    'artist name', 'artist names', 'singer name', 'singer names', 'band name',
    'composer name',
  ],
};

const SONG_TERMS = [
  'song', 'songs', 'track', 'tracks', 'single', 'singles', 'lyrics', 'audio',
  'listen to', 'play', 'song name', 'song names', 'song title', 'song titles',
  'track name', 'track names', 'track title', 'track titles', 'name of song',
  'name of track', 'song lyrics',
];

const DISCOVERY_TERMS = [
  'trending', 'trend', 'viral', 'popular', 'latest', 'new', 'newest', 'fresh',
  'top', 'chart', 'charts', 'hits', 'top hits', 'top chart', 'top charts',
  'chartbuster', 'chartbusters', 'chart hit', 'chart hits', 'most played',
  'most popular', 'latest songs', 'latest song', 'new songs', 'new song',
  'fresh songs', 'fresh releases', 'new releases', 'latest releases', 'new music',
  'latest music', 'weekly hits', 'daily hits', 'top songs', 'top song',
  'hit songs', 'hit song', 'all time hits', 'evergreen hits', 'recent releases',
  'recently released', 'most streamed', 'most listened',
];

const MOOD_AND_ACTIVITY_TERMS = [
  'workout', 'gym', 'running', 'party', 'dance', 'chill', 'relax', 'focus',
  'study', 'sleep', 'meditation', 'road trip', 'driving', 'travel', 'romantic',
  'love songs', 'sad songs', 'breakup songs', 'heartbreak', 'wedding', 'devotional',
  'bhajan', 'bhakti', 'aarti', 'worship', 'qawwali', 'sufi', 'ganesh', 'navratri',
  'diwali', 'holi', 'lofi', 'lo fi', 'acoustic', 'instrumental', 'classical',
  'indie', 'motivation', 'motivational', 'kids', 'children', 'morning',
  'throwback', 'nostalgia', 'old is gold', 'retro',
];

function normalizeSearchIntentQuery(query: string): string {
  return query
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findTermPosition(query: string, terms: string[]): number {
  const paddedQuery = ` ${query} `;
  let firstPosition = -1;

  for (const term of terms) {
    const position = paddedQuery.indexOf(` ${term} `);
    if (position >= 0 && (firstPosition < 0 || position < firstPosition)) {
      firstPosition = position;
    }
  }

  return firstPosition;
}

export function detectSearchCategory(query: string): SearchCategory | null {
  const normalizedQuery = normalizeSearchIntentQuery(query);
  if (!normalizedQuery) return null;

  const explicitMatches = Object.entries(EXPLICIT_CATEGORY_TERMS)
    .map(([category, terms]) => ({
      category: category as Exclude<SearchCategory, 'songs'>,
      position: findTermPosition(normalizedQuery, terms),
    }))
    .filter((match) => match.position >= 0)
    .sort((left, right) => left.position - right.position);

  if (explicitMatches.length > 0) return explicitMatches[0].category;
  if (findTermPosition(normalizedQuery, DISCOVERY_TERMS) >= 0) return 'playlists';
  if (findTermPosition(normalizedQuery, SONG_TERMS) >= 0) return 'songs';
  if (findTermPosition(normalizedQuery, MOOD_AND_ACTIVITY_TERMS) >= 0) return 'playlists';

  return null;
}
