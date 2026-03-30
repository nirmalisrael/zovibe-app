import { create } from 'zustand';
import type { MockAPIUser } from '../api/mockapi';
import { sanitizeLangPrefs } from '../constants/languages';

interface AuthState {
  userId: string | null;
  user: MockAPIUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  langPrefs: string[];
  setUser: (user: MockAPIUser) => void;
  setGuest: (guest: boolean) => void;
  setLangPrefs: (prefs: string[]) => void;
  refreshUser: (user: MockAPIUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  user: null,
  isAuthenticated: false,
  isGuest: false,
  langPrefs: [],
  setUser: (user) =>
    set({
      userId: user.id,
      user,
      isAuthenticated: true,
      isGuest: false,
    }),
  setGuest: (guest) =>
    set((s) => ({
      isGuest: guest,
      ...(guest
        ? { isAuthenticated: false, userId: null, user: null }
        : { isAuthenticated: s.isAuthenticated }),
    })),
  setLangPrefs: (prefs) => set({ langPrefs: sanitizeLangPrefs(prefs) }),
  refreshUser: (user) => set({ user, userId: user.id }),
  logout: () =>
    set({
      userId: null,
      user: null,
      isAuthenticated: false,
      isGuest: false,
    }),
}));
