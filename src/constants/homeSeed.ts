/**
 * JioSaavn search seeds for Home carousels (artists / scene terms per language).
 * @see HOME_ALBUM_SECTIONS — keep keys in sync with {@link LANGUAGE_CATALOG} minus `indian`.
 */
export const HOME_ALBUM_SECTIONS = [
  'tamil',
  'hindi',
  'telugu',
  'malayalam',
  'kannada',
  'punjabi',
  'bengali',
  'marathi',
  'english',
] as const;

export type HomeAlbumSection = (typeof HOME_ALBUM_SECTIONS)[number];

export const HOME_SEEDS: Record<HomeAlbumSection | 'trending', readonly string[]> = {
  tamil: ['anirudh', 'sid sriram', 'yuvan shankar raja', 'vijay antony', 'harris jayaraj'],
  hindi: ['arijit singh', 'pritam', 'ar rahman', 'atif aslam', 'shankar ehsaan loy'],
  telugu: ['ss thaman', 'devi sri prasad', 'ram miryala', 'manisharma', 'mickey j meyer'],
  malayalam: ['gopi sundar', 'shaan rahman', 'm jayachandran', 'vidyasagar', 'stephen devassy'],
  kannada: ['arjun janya', 'v harikrishna', 'charan raj', 'b ajaneesh loknath', 'ravi basrur'],
  punjabi: ['diljit dosanjh', 'ap dhillon', 'karan aujla', 'sidhu moose wala', 'badshah'],
  bengali: ['anupam roy', 'arijit singh', 'jeet gannguli', 'pritam', 'imran mahmudul'],
  marathi: ['ajay atul', 'avdhoot gupte', 'nilesh moharir', 'sameer kulkarni', 'amitraj'],
  english: ['the weeknd', 'ed sheeran', 'coldplay', 'imagine dragons'],
  /**
   * "Trending" is approximated from "latest/new release" discovery searches
   * (no dedicated global trending endpoint in current API spec).
   */
  trending: ['new release songs india'],
};

const TRENDING_DISCOVERY_BY_SECTION: Record<HomeAlbumSection, readonly string[]> = {
  tamil: ['latest tamil songs', 'new tamil songs'],
  hindi: ['latest hindi songs', 'new bollywood songs'],
  telugu: ['latest telugu songs', 'new telugu songs'],
  malayalam: ['latest malayalam songs', 'new malayalam songs'],
  kannada: ['latest kannada songs', 'new kannada songs'],
  punjabi: ['latest punjabi songs', 'new punjabi songs'],
  bengali: ['latest bengali songs', 'new bangla songs'],
  marathi: ['latest marathi songs', 'new marathi songs'],
  english: ['latest english songs', 'new international songs'],
};

/**
 * Build trending discovery keywords from allowed sections (typically user language prefs).
 * Falls back to a general India new-release query when prefs are empty.
 */
export function buildTrendingDiscoveryTerms(
  sections: readonly HomeAlbumSection[] | null
): string[] {
  if (!sections || sections.length === 0) return [...HOME_SEEDS.trending];
  const terms: string[] = [];
  for (const section of sections) {
    terms.push(...TRENDING_DISCOVERY_BY_SECTION[section]);
  }
  return [...new Set(terms)];
}

/** Substrings to match JioSaavn `language` on albums/songs to the home section (lowercase). */
const SECTION_LANG_FRAGMENTS: Record<HomeAlbumSection, readonly string[]> = {
  tamil: ['tamil'],
  telugu: ['telugu'],
  hindi: ['hindi'],
  malayalam: ['malayalam'],
  kannada: ['kannada'],
  punjabi: ['punjabi'],
  bengali: ['bengali', 'bangla'],
  marathi: ['marathi'],
  english: ['english', 'international'],
};

/** Drop albums whose API language does not match the carousel section (e.g. Telugu results under Tamil Hits). */
export function albumMatchesHomeSection(album: { language?: string }, section: HomeAlbumSection): boolean {
  const lang = (album.language || '').trim().toLowerCase();
  if (!lang) return true;
  const frags = SECTION_LANG_FRAGMENTS[section];
  return frags.some((f) => lang.includes(f));
}

/** Carousel heading + SearchResults screen title per home section */
export const HOME_CAROUSEL_META: Record<HomeAlbumSection, { carouselTitle: string; searchTitle: string }> = {
  tamil: { carouselTitle: 'Tamil Hits', searchTitle: 'Tamil Hits' },
  hindi: { carouselTitle: 'Hindi Vibes', searchTitle: 'Hindi Vibes' },
  telugu: { carouselTitle: 'Telugu Picks', searchTitle: 'Telugu' },
  malayalam: { carouselTitle: 'Malayalam', searchTitle: 'Malayalam' },
  kannada: { carouselTitle: 'Kannada', searchTitle: 'Kannada' },
  punjabi: { carouselTitle: 'Punjabi', searchTitle: 'Punjabi' },
  bengali: { carouselTitle: 'Bengali', searchTitle: 'Bengali' },
  marathi: { carouselTitle: 'Marathi', searchTitle: 'Marathi' },
  english: { carouselTitle: 'English Picks', searchTitle: 'English Picks' },
};
