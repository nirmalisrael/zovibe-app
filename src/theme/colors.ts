export const darkColors = {
  bg: {
    primary: '#0B0B0F',
    secondary: '#141419',
    tertiary: '#1C1C23',
    surface: '#141419',
    raised: '#1C1C23',
    player: '#18181F',
  },
  brand: {
    primary: '#8B5CF6',
    dark: '#7C3AED',
    light: '#A78BFA',
    pale: '#EDE9FE',
    glow: '#C4B5FD',
  },
  accent: {
    pink: '#EC4899',
    cyan: '#06B6D4',
    amber: '#F59E0B',
    green: '#10B981',
  },
  text: {
    primary: '#F8F8FA',
    secondary: '#A1A1AA',
    tertiary: '#71717A',
    muted: '#71717A',
    inverse: '#0B0B0F',
  },
  border: {
    default: '#292932',
    subtle: '#1C1C23',
    strong: '#8B5CF6',
  },
  player: {
    bg: '#18181F',
    progressTrack: '#3F3F46',
    progressActive: '#8B5CF6',
  },
  lang: {
    tamil: { bg: '#20121D', text: '#EC4899', border: '#EC489940' },
    hindi: { bg: '#221A0F', text: '#F59E0B', border: '#F59E0B40' },
    telugu: { bg: '#16162C', text: '#818CF8', border: '#818CF840' },
    malayalam: { bg: '#10221A', text: '#10B981', border: '#10B98140' },
    kannada: { bg: '#241C10', text: '#FBBF24', border: '#FBBF2440' },
    punjabi: { bg: '#241420', text: '#F472B6', border: '#F472B640' },
    bengali: { bg: '#1E142B', text: '#C084FC', border: '#C084FC40' },
    marathi: { bg: '#102222', text: '#2DD4BF', border: '#2DD4BF40' },
    english: { bg: '#101E2B', text: '#06B6D4', border: '#06B6D440' },
    indian: { bg: '#1A162D', text: '#A78BFA', border: '#A78BFA40' },
  },
  error: '#EF4444',
} as const;

export const lightColors = {
  bg: {
    primary: '#F8F8FA',
    secondary: '#F1F1F5',
    tertiary: '#E4E4E9',
    surface: '#FFFFFF',
    raised: '#FFFFFF',
    player: '#FFFFFF',
  },
  brand: {
    primary: '#7C3AED',
    dark: '#6D28D9',
    light: '#8B5CF6',
    pale: '#EDE9FE',
    glow: '#DDD6FE',
  },
  accent: {
    pink: '#DB2777',
    cyan: '#0891B2',
    amber: '#D97706',
    green: '#059669',
  },
  text: {
    primary: '#111116',
    secondary: '#52525B',
    tertiary: '#71717A',
    muted: '#A1A1AA',
    inverse: '#F8F8FA',
  },
  border: {
    default: '#E4E4E9',
    subtle: '#ECECEF',
    strong: '#8B5CF6',
  },
  player: {
    bg: '#FFFFFF',
    progressTrack: '#E4E4E9',
    progressActive: '#7C3AED',
  },
  lang: darkColors.lang,
  error: '#DC2626',
} as const;

/** Default active theme: Midnight Black + Electric Violet */
export const colors = darkColors;
