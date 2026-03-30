import { create } from 'zustand';
import type { AudioQualityPreference } from '../api/stream';
import type { LanguageFilterId } from '../constants/languages';
import { setSecure, KEY_HOME_LANG_FILTER } from '../utils/storage';

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
  setHomeLanguageFilter: (homeLanguageFilter) => {
    set({ homeLanguageFilter });
    void setSecure(KEY_HOME_LANG_FILTER, homeLanguageFilter);
  },
}));
