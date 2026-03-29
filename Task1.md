# ZOVIBE — Cursor AI Full Build Prompt (v2)
> Open Cursor AI → New Project → paste this entire file as the first prompt in Agent mode (Auto model)

---

## 🎯 MISSION

Build **Zovibe** — a production-quality React Native music streaming mobile app using
**Expo SDK 55** (New Architecture, React Native 0.83, React 19.2).

Music content comes from the **JioSaavn unofficial API** — focused on Tamil, Hindi,
and Indian music broadly. User authentication and profile data is stored in **MockAPI**.
No Navidrome, no self-hosted server, no user-provided URLs.

Build target: **Expo Dev Client** via EAS Build (not Expo Go — RNTP requires native modules).

---

## 🌐 API ARCHITECTURE

### 1. Music API — JioSaavn (Unofficial, Self-Deploy)

The app uses the open-source JioSaavn API by sumitkolhe, deployed to Vercel.
Source: https://github.com/sumitkolhe/jiosaavn-api

**Base URL constant** (the developer must deploy their own instance to Vercel — free):
```typescript
// src/constants/api.ts
export const JIOSAAVN_BASE = 'https://zovibe-app.vercel.app'; // this is created for 
// ^ Replace with your own Vercel deployment URL after deploying the repo above
```

**Key endpoints used:**

| Purpose | Endpoint |
|---|---|
| Search songs | `GET /api/search/songs?query={q}&page=0&limit=20` |
| Search albums | `GET /api/search/albums?query={q}&page=0&limit=10` |
| Search artists | `GET /api/search/artists?query={q}&page=0&limit=10` |
| Search all | `GET /api/search?query={q}` |
| Get song by ID | `GET /api/songs/{id}` |
| Get album by ID | `GET /api/albums?id={id}` |
| Get artist by ID | `GET /api/artists/{id}` |
| Get artist songs | `GET /api/artists/{id}/songs` |
| Get artist albums | `GET /api/artists/{id}/albums` |
| Get playlist | `GET /api/playlists?id={id}` |
| Get lyrics | `GET /api/songs/{id}/lyrics` |

**Song object response shape** (important — map this correctly):
```typescript
interface JioSaavnSong {
  id: string;
  name: string;                      // song title
  album: { id: string; name: string; url: string };
  year: string;
  releaseDate: string;
  duration: number;                  // in seconds
  label: string;
  artists: {
    primary: Array<{ id: string; name: string; image: Array<{ quality: string; url: string }> }>;
    all: Array<{ id: string; name: string }>;
  };
  image: Array<{ quality: string; url: string }>;  // ["50x50", "150x150", "500x500"]
  downloadUrl: Array<{ quality: string; url: string }>; // ["12kbps","48kbps","96kbps","160kbps","320kbps"]
  language: string;                  // "tamil", "hindi", "english", etc.
  hasLyrics: boolean;
  lyricsId: string | null;
}
```

**Getting the stream URL** — use the highest available quality:
```typescript
export function getStreamUrl(song: JioSaavnSong): string {
  const urls = song.downloadUrl;
  // Prefer 320kbps → 160kbps → 96kbps
  const preferred = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
  for (const q of preferred) {
    const match = urls.find(u => u.quality === q);
    if (match?.url) return match.url;
  }
  return urls[urls.length - 1]?.url ?? '';
}

export function getCoverUrl(song: JioSaavnSong, quality = '500x500'): string {
  return song.image.find(i => i.quality === quality)?.url
    ?? song.image[song.image.length - 1]?.url ?? '';
}
```

**No authentication required** for JioSaavn API. All calls are plain GET requests.

**Tamil/Indian focus** — when loading home screen content use these hardcoded search seeds:
```typescript
export const HOME_SEEDS = {
  tamil:   ['anirudh', 'sid sriram', 'yuvan shankar raja', 'vijay antony', 'harris jayaraj'],
  hindi:   ['arijit singh', 'pritam', 'ar rahman', 'atif aslam', 'shankar ehsaan loy'],
  english: ['the weeknd', 'ed sheeran', 'coldplay', 'imagine dragons'],
  trending:['kutty story', 'beast mode', 'arabic kuthu', 'butta bomma', 'kesariya'],
};
```

---

### 2. User Data — MockAPI

**Your MockAPI base URL:**
```typescript
export const MOCKAPI_BASE = 'https://69c8e90f68edf52c954e1563.mockapi.io/zovibe';
```

**Resources to create in MockAPI dashboard:**

#### `/users` resource — fields:
| Field | Type | Notes |
|---|---|---|
| `id` | String (auto) | MockAPI auto-generates |
| `username` | String | Unique username |
| `email` | String | User email |
| `password` | String | Store hashed (use simple btoa for now — not production) |
| `avatar` | String | Initials or placeholder |
| `createdAt` | String | ISO date string |
| `likedSongs` | String | JSON stringified array of song IDs |
| `recentlyPlayed` | String | JSON stringified array of song IDs (max 20) |
| `playlists` | String | JSON stringified array of playlist objects |

#### `/playlists` resource — fields:
| Field | Type | Notes |
|---|---|---|
| `id` | String (auto) | |
| `userId` | String | Owner user ID |
| `name` | String | Playlist name |
| `description` | String | Optional |
| `songIds` | String | JSON stringified array of JioSaavn song IDs |
| `coverUrl` | String | URL or empty |
| `createdAt` | String | ISO date |

**MockAPI service** (`src/api/mockapi.ts`):
```typescript
const BASE = 'https://69c8e90f68edf52c954e1563.mockapi.io/zovibe';

// AUTH — register
export async function registerUser(username: string, email: string, password: string) {
  // Check if username exists first
  const existing = await fetch(`${BASE}/users?username=${username}`).then(r => r.json());
  if (existing.length > 0) throw new Error('Username already taken');
  
  return fetch(`${BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username, email,
      password: btoa(password),  // basic obfuscation only
      avatar: username.slice(0,2).toUpperCase(),
      createdAt: new Date().toISOString(),
      likedSongs: '[]',
      recentlyPlayed: '[]',
      playlists: '[]',
    }),
  }).then(r => r.json());
}

// AUTH — login
export async function loginUser(username: string, password: string) {
  const users = await fetch(`${BASE}/users?username=${username}`).then(r => r.json());
  if (users.length === 0) throw new Error('User not found');
  const user = users[0];
  if (user.password !== btoa(password)) throw new Error('Wrong password');
  return user;
}

// Get user by ID
export async function getUser(userId: string) {
  return fetch(`${BASE}/users/${userId}`).then(r => r.json());
}

// Update user fields (likedSongs, recentlyPlayed, etc.)
export async function updateUser(userId: string, data: Partial<Record<string, string>>) {
  return fetch(`${BASE}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json());
}

// Add song to liked songs
export async function likeSong(userId: string, songId: string, currentLiked: string[]) {
  const updated = [...new Set([...currentLiked, songId])];
  return updateUser(userId, { likedSongs: JSON.stringify(updated) });
}

// Remove song from liked songs
export async function unlikeSong(userId: string, songId: string, currentLiked: string[]) {
  const updated = currentLiked.filter(id => id !== songId);
  return updateUser(userId, { likedSongs: JSON.stringify(updated) });
}

// Add to recently played (max 20)
export async function addRecentlyPlayed(userId: string, songId: string, current: string[]) {
  const filtered = current.filter(id => id !== songId);
  const updated = [songId, ...filtered].slice(0, 20);
  return updateUser(userId, { recentlyPlayed: JSON.stringify(updated) });
}

// Playlist CRUD
export async function getUserPlaylists(userId: string) {
  return fetch(`${BASE}/playlists?userId=${userId}`).then(r => r.json());
}

export async function createPlaylist(userId: string, name: string, description = '') {
  return fetch(`${BASE}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId, name, description,
      songIds: '[]',
      coverUrl: '',
      createdAt: new Date().toISOString(),
    }),
  }).then(r => r.json());
}

export async function addSongToPlaylist(playlistId: string, songId: string, currentIds: string[]) {
  const updated = [...new Set([...currentIds, songId])];
  return fetch(`${BASE}/playlists/${playlistId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songIds: JSON.stringify(updated) }),
  }).then(r => r.json());
}

export async function deletePlaylist(playlistId: string) {
  return fetch(`${BASE}/playlists/${playlistId}`, { method: 'DELETE' }).then(r => r.json());
}
```

---

## 📁 EXACT FOLDER STRUCTURE

```
zovibe-v1-app/
├── index.js                        ← RNTP PlaybackService registration
├── app.json                        ← Expo SDK 55 config
├── package.json
├── tsconfig.json
├── babel.config.js
│
├── src/
│   ├── App.tsx                     ← Root: fonts, RNTP setup, QueryClient, Nav
│   │
│   ├── api/
│   │   ├── jiosaavn.ts             ← All JioSaavn API calls
│   │   ├── mockapi.ts              ← MockAPI user/playlist CRUD (code above)
│   │   └── stream.ts               ← getStreamUrl, getCoverUrl helpers
│   │
│   ├── store/
│   │   ├── authStore.ts            ← userId, user object, isAuthenticated
│   │   ├── playerStore.ts          ← currentTrack, queue, isPlaying
│   │   └── settingsStore.ts        ← audioQuality, language filter prefs
│   │
│   ├── hooks/
│   │   ├── usePlayer.ts            ← RNTP wrapper
│   │   ├── useNowPlaying.ts        ← Live RNTP progress + metadata
│   │   ├── useSearch.ts            ← Debounced JioSaavn search
│   │   ├── useLikedSongs.ts        ← Like/unlike with optimistic updates
│   │   └── useHomeContent.ts       ← Fetches Tamil/Hindi/trending sections
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx       ← Auth gate
│   │   ├── MainNavigator.tsx       ← Bottom tab nav
│   │   └── types.ts
│   │
│   ├── screens/
│   │   ├── SplashScreen.tsx        ← Animated Zovibe logo on dark bg
│   │   ├── OnboardingScreen.tsx    ← Language preference picker (Tamil/Hindi/All)
│   │   ├── LoginScreen.tsx         ← Login form
│   │   ├── RegisterScreen.tsx      ← Register form
│   │   ├── HomeScreen.tsx
│   │   ├── ExploreScreen.tsx
│   │   ├── LibraryScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── NowPlayingScreen.tsx
│   │   ├── AlbumScreen.tsx
│   │   ├── ArtistScreen.tsx
│   │   ├── PlaylistScreen.tsx      ← User's own playlist detail
│   │   ├── MoodScreen.tsx          ← Mood-based filtered view
│   │   ├── SearchResultsScreen.tsx ← Full search results
│   │   └── LyricsScreen.tsx        ← Lyrics overlay
│   │
│   ├── components/
│   │   ├── player/
│   │   │   ├── MiniPlayer.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── PlayerControls.tsx
│   │   │   └── VolumeSlider.tsx
│   │   ├── cards/
│   │   │   ├── SongRow.tsx         ← Track list row with like button
│   │   │   ├── AlbumCard.tsx       ← Square card 120px
│   │   │   ├── ArtistCard.tsx      ← Circular card
│   │   │   └── PlaylistCard.tsx
│   │   ├── home/
│   │   │   ├── MoodPillRow.tsx
│   │   │   ├── SectionCarousel.tsx ← Horizontal scroll section
│   │   │   └── GreetingHeader.tsx
│   │   └── ui/
│   │       ├── ZText.tsx           ← Branded text with SpaceGrotesk
│   │       ├── ZButton.tsx         ← Primary / ghost / icon variants
│   │       ├── ZInput.tsx          ← Styled text input
│   │       ├── CoverImage.tsx      ← FastImage with fallback
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorState.tsx
│   │       ├── ScreenWrapper.tsx
│   │       └── LanguageBadge.tsx   ← Shows "Tamil"/"Hindi"/"English" pill
│   │
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── borderRadius.ts
│   │   └── index.ts
│   │
│   ├── constants/
│   │   ├── api.ts                  ← JIOSAAVN_BASE, MOCKAPI_BASE
│   │   ├── moods.ts                ← Mood → search query mapping
│   │   ├── languages.ts            ← Language filter constants
│   │   └── homeSeed.ts             ← HOME_SEEDS object
│   │
│   └── utils/
│       ├── formatTime.ts           ← seconds → mm:ss
│       ├── buildTrack.ts           ← JioSaavnSong → RNTP Track
│       └── storage.ts              ← expo-secure-store helpers
│
└── assets/
    ├── fonts/
    │   ├── SpaceGrotesk-Light.ttf
    │   ├── SpaceGrotesk-Regular.ttf
    │   ├── SpaceGrotesk-Medium.ttf
    │   └── SpaceGrotesk-Bold.ttf
    ├── icon.png
    └── splash.png
```

---

## 📦 PACKAGE.JSON — EXPO SDK 55

```json
{
  "name": "zovibe",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "build:dev": "eas build --profile development --platform android"
  },
  "dependencies": {
    "expo": "~55.0.0",
    "expo-dev-client": "~55.0.0",
    "expo-font": "~55.0.0",
    "expo-status-bar": "~55.0.0",
    "expo-secure-store": "~55.0.0",
    "expo-build-properties": "~55.0.0",
    "expo-splash-screen": "~55.0.0",
    "expo-linear-gradient": "~55.0.0",
    "expo-blur": "~55.0.0",
    "react": "19.2.0",
    "react-native": "0.83.0",
    "react-native-track-player": "^4.1.0",
    "react-native-safe-area-context": "~5.0.0",
    "react-native-screens": "~4.0.0",
    "react-native-reanimated": "~3.17.0",
    "react-native-gesture-handler": "~2.21.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "@expo/vector-icons": "^14.0.4",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react-native-fast-image": "^8.6.3"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "typescript": "^5.3.0",
    "@types/react": "~19.0.0",
    "@types/react-native": "~0.73.0"
  }
}
```

> **SDK 55 note:** All `expo-*` packages now use the same major version as the SDK (55.x.x). Do NOT mix SDK 52 package versions. New Architecture is mandatory in SDK 55 — do not add `newArchEnabled` to app.json, it's removed.

---

## ⚙️ APP.JSON — SDK 55

```json
{
  "expo": {
    "name": "Zovibe",
    "slug": "zovibe",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#0D0D1A"
    },
    "ios": {
      "bundleIdentifier": "com.zovibe.app",
      "infoPlist": {
        "UIBackgroundModes": ["audio"],
        "NSAllowsArbitraryLoads": true
      }
    },
    "android": {
      "package": "com.zovibe.app",
      "usesCleartextTraffic": true,
      "permissions": [
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
      ]
    },
    "plugins": [
      "expo-dev-client",
      ["expo-build-properties", {
        "android": {
          "usesCleartextTraffic": true,
          "compileSdkVersion": 35,
          "targetSdkVersion": 35
        }
      }],
      ["expo-font", {
        "fonts": [
          "./assets/fonts/SpaceGrotesk-Light.ttf",
          "./assets/fonts/SpaceGrotesk-Regular.ttf",
          "./assets/fonts/SpaceGrotesk-Medium.ttf",
          "./assets/fonts/SpaceGrotesk-Bold.ttf"
        ]
      }]
    ]
  }
}
```

---

## 🎨 THEME

### Colors (`src/theme/colors.ts`)
```typescript
export const colors = {
  bg: {
    primary:   '#0D0D1A',
    secondary: '#1A1035',
    tertiary:  '#2D1B69',
    surface:   '#0A0A14',
  },
  brand: {
    primary:   '#7C3AED',
    light:     '#A78BFA',
    pale:      '#EDE9FE',
    glow:      '#C4B5FD',
  },
  accent: {
    cyan:      '#06B6D4',
    pink:      '#EC4899',
    amber:     '#EF9F27',
    green:     '#1D9E75',
  },
  text: {
    primary:   '#E0D9FF',
    secondary: '#7C6FCD',
    tertiary:  '#4A3F7A',
    inverse:   '#0D0D1A',
  },
  border: {
    default:   '#2D2450',
    subtle:    '#1A1035',
    strong:    '#7C3AED',
  },
  lang: {
    tamil:     { bg: '#1F0E20', text: '#EC4899', border: '#EC489950' },
    hindi:     { bg: '#1A1A0A', text: '#EF9F27', border: '#EF9F2750' },
    english:   { bg: '#0E1F30', text: '#06B6D4', border: '#06B6D450' },
    indian:    { bg: '#1A1050', text: '#A78BFA', border: '#A78BFA50' },
  },
};
```

### Typography (`src/theme/typography.ts`)
```typescript
export const fonts = {
  light:   'SpaceGrotesk-Light',
  regular: 'SpaceGrotesk-Regular',
  medium:  'SpaceGrotesk-Medium',
  bold:    'SpaceGrotesk-Bold',
};
export const fontSize = {
  xs: 10, sm: 12, md: 14, base: 16,
  lg: 18, xl: 22, '2xl': 28, '3xl': 36, '4xl': 48,
};
```

### Spacing (`src/theme/spacing.ts`)
```typescript
// 4px grid
export const spacing = { 0:0, 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 8:32, 10:40, 12:48 };
export const layout = {
  screenPadding: 16, cardPadding: 12, sectionGap: 24,
  miniPlayerHeight: 64, tabBarHeight: 80,
};
```

### Icons — `@expo/vector-icons` → `Ionicons` set

| UI Element | Icon |
|---|---|
| Home tab | `home` / `home-outline` |
| Explore tab | `compass` / `compass-outline` |
| Library tab | `library` / `library-outline` |
| Profile tab | `person` / `person-outline` |
| Play / Pause | `play` / `pause` |
| Skip fwd/back | `play-skip-forward` / `play-skip-back` |
| Shuffle | `shuffle` |
| Repeat | `repeat` |
| Heart | `heart` / `heart-outline` |
| Search | `search` |
| Back | `chevron-back` |
| More | `ellipsis-horizontal` |
| Add | `add-circle-outline` |
| Queue | `list` |
| Language | `language-outline` |
| Lyrics | `text-outline` |
| Close | `close` |

---

## 📱 SCREEN SPECIFICATIONS

### SplashScreen
- Full screen `#0D0D1A`
- Zovibe pulse SVG icon animates in (scale 0 → 1, spring easing)
- `zovibe` wordmark fades in below icon (SpaceGrotesk-Light, 48px, `#A78BFA`)
- After 2.5s → check `expo-secure-store` for `zovibe_user_id`
- If found → fetch user from MockAPI → set auth store → navigate Home
- If not found → navigate Onboarding

### OnboardingScreen
- Single-screen language preference selector (shown only once on first launch)
- Title: "What do you want to hear?" in SpaceGrotesk-Medium 22px
- 4 large cards in 2×2 grid:
  - 🎵 Tamil music (`#1F0E20` bg, `#EC4899` text)
  - 🎵 Hindi / Bollywood (`#1A1A0A` bg, `#EF9F27` text)
  - 🎵 English (`#0E1F30` bg, `#06B6D4` text)
  - 🎵 All Indian (`#1A1050` bg, `#A78BFA` text)
- Multi-select allowed
- "Continue" button → save preference to `expo-secure-store` as `zovibe_lang_prefs`
- Navigate to LoginScreen

### LoginScreen
- Zovibe pulse icon (40px) + wordmark centered at top
- Email/Username input + Password input (ZInput components)
- "Sign in" primary button → calls `loginUser()` → saves userId to secure-store → Home
- "Create account" ghost link → RegisterScreen
- Error toast on wrong credentials (red `#E24B4A` snackbar at bottom)

### RegisterScreen
- Username, Email, Password, Confirm Password fields
- Password validation (min 6 chars)
- "Create account" → calls `registerUser()` → auto-login → Home
- "Already have an account?" link → LoginScreen

### HomeScreen
- Status bar transparent, dark-content, `#0D0D1A` bg
- Top bar: `zovibe` wordmark left, avatar circle right (navigate to Profile)
- Time-based greeting: "காலை வணக்கம்" (morning Tamil), "Good afternoon", "Vanakkam" etc.
- MiniPlayer above content if track loaded
- **"Your Vibe" section** — MoodPillRow: Chill / Focus / Party / Sad / Workout
  - Each mood maps to Tamil/Hindi search seeds (see moods.ts below)
- **"Tamil Hits" section** — horizontal AlbumCard carousel from `HOME_SEEDS.tamil`
- **"Hindi Vibes" section** — horizontal AlbumCard carousel from `HOME_SEEDS.hindi`
- **"Trending Now" section** — SongRow list from `HOME_SEEDS.trending` searches
- **"English Picks" section** — horizontal AlbumCard carousel from `HOME_SEEDS.english`
- Each section has a "See all →" that opens SearchResultsScreen with that query

### ExploreScreen
- Search bar with debounced 300ms search via JioSaavn API
- While typing: show search results in 3 sections (Songs / Albums / Artists)
- When empty: show genre grid (2-col) + Language filter row at top
- **Language filter row**: Tamil | Hindi | English | All — filters genre grid + trending
- **Genre grid** (2-col, 70px height each):
  - Kollywood (Tamil cinema) → `#1F0E20` / `#EC4899`
  - Bollywood → `#1A1A0A` / `#EF9F27`
  - Indie Tamil → `#1A1050` / `#A78BFA`
  - Devotional → `#0A2010` / `#5DCAA5`
  - Electronic/EDM → `#0E1F30` / `#06B6D4`
  - Retro Hits → `#2A0A0A` / `#F09595`
  - English Pop → `#0A1A2A` / `#60A5FA`
  - Hip-Hop / Rap → `#1A0A2A` / `#C084FC`
- Tapping genre → calls JioSaavn search with genre name + language → SearchResultsScreen

### LibraryScreen
- Custom pill tab at top: My Playlists | Liked Songs | History
- **My Playlists**: fetches from MockAPI `/playlists?userId=`. FAB "+" creates new playlist
- **Liked Songs**: reads `user.likedSongs` array → fetches song details from JioSaavn by IDs → SongRow list
- **History**: reads `user.recentlyPlayed` → fetches song details → SongRow list
- Empty state with create prompt when playlists is empty

### NowPlayingScreen (modal, full screen)
- Presented as full-screen modal over MainNavigator
- Background: `#0D0D1A` with subtle blur of album art color using `expo-blur`
- Back chevron top-left, ellipsis top-right
- Large album art (240×240, radius 20) centered with CoverImage
- Song title (bold 18px) + Artist name (14px secondary) + Language badge pill
- Heart icon right of title (calls `likeSong`/`unlikeSong` MockAPI)
- ProgressBar — seekable, real-time from RNTP
- PlayerControls: shuffle → prev → play/pause (52px circle `#7C3AED`) → next → repeat
- VolumeSlider
- "Lyrics" button → opens LyricsScreen if `song.hasLyrics`
- Auto-adds to `recentlyPlayed` in MockAPI when track starts

### AlbumScreen
- Back button, album art (180×180), title + artist + year + language badge
- "Play all" + "Shuffle" buttons
- SongRow list with track numbers
- Tap track → load full album into RNTP queue → start at tapped index

### ArtistScreen
- Artist name header (from JioSaavn artist name)
- "Top Songs" horizontal SongRow scroll
- "Albums" horizontal AlbumCard scroll
- Tap album → AlbumScreen

### PlaylistScreen (user's own playlist)
- Fetches playlist from MockAPI, then fetches each song from JioSaavn by ID
- Edit name button (inline rename)
- Delete playlist button (confirm dialog)
- "Play all" + "Shuffle" buttons
- SongRow list with long-press to remove song from playlist

### LyricsScreen
- Full-screen dark overlay modal
- Fetches lyrics via JioSaavn `/api/songs/{id}/lyrics`
- Shows lyrics in scrollable view
- SpaceGrotesk-Light font, 16px, `#E0D9FF`, line-height 28
- Close button top-right

### ProfileScreen
- Avatar circle (64px, initials, `#2D1B69` bg, 2px `#7C3AED` border)
- Username bold, email muted, "Member since [date]"
- Stats row: Liked Songs | Playlists | History count (read from MockAPI user object)
- Language preferences row with edit button → back to OnboardingScreen
- Settings:
  - Audio quality switch: High (320kbps) / Normal (96kbps)
  - Language filter for home screen
- "Sign out" at bottom → clears secure-store → navigates to LoginScreen

---

## 🎵 PLAYBACK SERVICE (`index.js`)

```javascript
import { registerRootComponent } from 'expo';
import TrackPlayer, { Capability } from 'react-native-track-player';
import App from './src/App';

async function PlaybackService() {
  TrackPlayer.addEventListener('remote-play', () => TrackPlayer.play());
  TrackPlayer.addEventListener('remote-pause', () => TrackPlayer.pause());
  TrackPlayer.addEventListener('remote-next', () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener('remote-previous', () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener('remote-stop', () => TrackPlayer.destroy());
}

TrackPlayer.registerPlaybackService(() => PlaybackService);
registerRootComponent(App);
```

**RNTP setup in `App.tsx`:**
```typescript
await TrackPlayer.setupPlayer({ maxCacheSize: 1024 * 5 }); // 5MB cache
await TrackPlayer.updateOptions({
  capabilities: [
    Capability.Play, Capability.Pause,
    Capability.SkipToNext, Capability.SkipToPrevious,
    Capability.Stop, Capability.SeekTo,
  ],
  compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
  notificationCapabilities: [
    Capability.Play, Capability.Pause,
    Capability.SkipToNext, Capability.SkipToPrevious,
  ],
  progressUpdateEventThrottle: 1000,
});
```

**Track object builder (`src/utils/buildTrack.ts`):**
```typescript
import { Track } from 'react-native-track-player';
import type { JioSaavnSong } from '../api/jiosaavn';
import { getStreamUrl, getCoverUrl } from '../api/stream';

export function buildTrack(song: JioSaavnSong): Track {
  return {
    id: song.id,
    url: getStreamUrl(song),
    title: song.name,
    artist: song.artists.primary.map(a => a.name).join(', '),
    album: song.album.name,
    artwork: getCoverUrl(song, '500x500'),
    duration: song.duration,
  };
}
```

---

## 🎭 MOODS (`src/constants/moods.ts`)

```typescript
export type MoodType = 'chill' | 'focus' | 'party' | 'sad' | 'workout';

export const MOODS: Record<MoodType, {
  label: string; labelTamil: string;
  color: string; bg: string;
  searches: string[];
}> = {
  chill: {
    label: 'Chill', labelTamil: 'நிதானம்',
    color: '#06B6D4', bg: '#0E1F30',
    searches: ['sid sriram chill', 'yuvan slow', 'arijit soft', 'lo-fi tamil'],
  },
  focus: {
    label: 'Focus', labelTamil: 'கவனம்',
    color: '#A78BFA', bg: '#1A1050',
    searches: ['ar rahman instrumental', 'harris jayaraj background', 'classical carnatic'],
  },
  party: {
    label: 'Party', labelTamil: 'பார்ட்டி',
    color: '#EC4899', bg: '#1F0E20',
    searches: ['arabic kuthu', 'mass bgm remix', 'bollywood party hits', 'vijay dance'],
  },
  sad: {
    label: 'Sad', labelTamil: 'வலி',
    color: '#7C6FCD', bg: '#1A1035',
    searches: ['sid sriram emotional', 'yuvan sad songs', 'arijit singh sad', 'breakup tamil'],
  },
  workout: {
    label: 'Workout', labelTamil: 'உடற்பயிற்சி',
    color: '#EF9F27', bg: '#1A1A0A',
    searches: ['kutty story mass', 'beast mode bgm', 'peppy hindi workout', 'high energy tamil'],
  },
};
```

---

## 🧭 NAVIGATION

```
RootNavigator (Stack)
├── SplashScreen
├── OnboardingScreen
├── AuthStack (Stack)
│   ├── LoginScreen
│   └── RegisterScreen
└── MainNavigator (Tab) — shown when isAuthenticated
    ├── HomeTab (Stack)
    │   ├── HomeScreen
    │   ├── AlbumScreen
    │   ├── ArtistScreen
    │   ├── SearchResultsScreen
    │   └── MoodScreen
    ├── ExploreTab (Stack)
    │   ├── ExploreScreen
    │   ├── AlbumScreen
    │   ├── ArtistScreen
    │   └── SearchResultsScreen
    ├── LibraryTab (Stack)
    │   ├── LibraryScreen
    │   └── PlaylistScreen
    └── ProfileTab (Stack)
        └── ProfileScreen

NowPlayingScreen  → full-screen modal over MainNavigator
LyricsScreen      → modal over NowPlayingScreen
```

**Tab bar config:**
```typescript
tabBarStyle: {
  backgroundColor: '#0A0A14',
  borderTopColor: '#1A1035',
  borderTopWidth: 1,
  height: 80,
  paddingBottom: 16,
}
tabBarActiveTintColor: '#A78BFA'
tabBarInactiveTintColor: '#3D3060'
```

---

## 🔐 AUTH FLOW (MockAPI-based)

1. App launch → SplashScreen checks `expo-secure-store` for `zovibe_user_id`
2. If `zovibe_user_id` found → `getUser(id)` from MockAPI → populate `authStore` → go to Main
3. If not found → OnboardingScreen (first time) or LoginScreen (returning)
4. On login success → store `zovibe_user_id` in secure-store
5. On register success → auto-login, store id in secure-store
6. On sign out → delete `zovibe_user_id` from secure-store → clear authStore → LoginScreen

---

## 🎛️ STATE MANAGEMENT

```typescript
// authStore.ts
interface AuthState {
  userId: string | null;
  user: MockAPIUser | null;
  isAuthenticated: boolean;
  langPrefs: string[];            // ['tamil', 'hindi', 'english']
  setUser: (user: MockAPIUser) => void;
  setLangPrefs: (prefs: string[]) => void;
  logout: () => void;
}

// playerStore.ts
interface PlayerState {
  currentSong: JioSaavnSong | null;
  queue: JioSaavnSong[];
  isPlaying: boolean;
  shuffle: boolean;
  repeat: 'off' | 'track' | 'queue';
  setCurrentSong: (song: JioSaavnSong) => void;
  setQueue: (songs: JioSaavnSong[], startIndex?: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}
```

---

## 🚀 CODE QUALITY RULES

1. **TypeScript strict mode** — no `any`
2. **React Query** (`@tanstack/react-query`) for all API fetches — `staleTime: 5 * 60 * 1000`
3. **react-native-fast-image** for all cover art
4. **expo-secure-store** for user ID persistence — never AsyncStorage for auth
5. **Error boundaries** on every screen — show ErrorState with retry
6. **Loading skeletons** — show shimmer/pulse while fetching (Animated API or Reanimated)
7. **MiniPlayer** always visible above tab bar when queue is non-empty
8. **LanguageBadge** shown on every SongRow and AlbumCard (`song.language`)
9. **New Architecture only** — no legacy bridge patterns (SDK 55 requirement)
10. All song IDs from JioSaavn are strings — never `parseInt()`

---

## ❓ EXPO GO STATUS FOR THIS APP

**Short answer: Expo Go will NOT work for RNTP. Use Dev Client.**

| Scenario | Works? | Notes |
|---|---|---|
| Expo Go + UI screens only (no audio) | ✅ | For early layout work only |
| Expo Go + RNTP | ❌ | RNTP requires native modules |
| Dev Client (EAS Build) | ✅ | Full app including background audio |
| Dev Client (local `npx expo run:android`) | ✅ | Requires Android Studio |

**One-time dev setup:**
```bash
# Deploy JioSaavn API to your Vercel (free):
# 1. Fork https://github.com/sumitkolhe/jiosaavn-api
# 2. Connect to Vercel → Deploy
# 3. Copy your Vercel URL into src/constants/api.ts

# Build Dev Client APK:
eas build --profile development --platform android
# Install on phone, then every session:
npx expo start --dev-client
```

**Once Dev Client APK is installed on your phone:**
- Same WiFi network → QR scan → instant hot reload ✅
- Identical daily experience to Expo Go ✅
- Background audio + lock screen controls work ✅

---

## 📋 MOCKAPI SETUP CHECKLIST

From your MockAPI dashboard at `mockapi.io/projects/zovibe`:
1. Create resource: **`users`** with fields: `username`, `email`, `password`, `avatar`, `createdAt`, `likedSongs`, `recentlyPlayed`, `playlists`
2. Create resource: **`playlists`** with fields: `userId`, `name`, `description`, `songIds`, `coverUrl`, `createdAt`
3. Set both resources to generate 0 default items
4. Your base URL is already: `https://69c8e90f68edf52c954e1563.mockapi.io/zovibe`

---

## 📝 DELIVER — COMPLETE FILE LIST

Generate ALL files in the folder structure above. Each file must be fully implemented — no `// TODO` placeholders. The complete app must:

- [ ] Show Tamil/Hindi/English songs from JioSaavn on the home screen without any user login
- [ ] Allow register + login via MockAPI
- [ ] Stream songs at 320kbps with react-native-track-player
- [ ] Show lock screen controls and background playback
- [ ] Like songs and save to MockAPI user profile
- [ ] Create and manage playlists stored in MockAPI
- [ ] Search JioSaavn across Tamil, Hindi, English catalog
- [ ] Show lyrics for supported songs
- [ ] Persist login across app restarts via expo-secure-store
- [ ] Build with `eas build --profile development`
- [ ] Respect New Architecture (SDK 55 — no legacy bridge)

---