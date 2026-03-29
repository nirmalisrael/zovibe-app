import { create } from 'zustand';
import type { AudioQualityPreference } from '../api/stream';
import type { LanguageFilterId } from '../constants/languages';

interface SettingsState {
  audioQuality: AudioQualityPreference;
  homeLanguageFilter: LanguageFilterId;
  setAudioQuality: (q: AudioQualityPreference) => void;
  setHomeLanguageFilter: (f: LanguageFilterId) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  audioQuality: 'high',
  homeLanguageFilter: 'all',
  setAudioQuality: (audioQuality) => set({ audioQuality }),
  setHomeLanguageFilter: (homeLanguageFilter) => set({ homeLanguageFilter }),
}));
