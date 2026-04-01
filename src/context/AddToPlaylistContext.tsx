import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { JioSaavnSong } from '../api/jiosaavn';
import { AddToPlaylistSheet } from '../components/playlists/AddToPlaylistSheet';
import { useAuthStore } from '../store/authStore';
import { Alert } from 'react-native';

type AddToPlaylistContextValue = Readonly<{
  openAddToPlaylist: (song: JioSaavnSong) => void;
}>;

const AddToPlaylistContext = createContext<AddToPlaylistContextValue | null>(null);

export function AddToPlaylistProvider({ children }: Readonly<{ children: ReactNode }>) {
  const userId = useAuthStore((s) => s.userId);
  const [song, setSong] = useState<JioSaavnSong | null>(null);

  const openAddToPlaylist = useCallback(
    (s: JioSaavnSong) => {
      if (!userId) {
        Alert.alert('Sign in required', 'Create an account or sign in to save songs to playlists.');
        return;
      }
      setSong(s);
    },
    [userId]
  );

  const value = useMemo(() => ({ openAddToPlaylist }), [openAddToPlaylist]);

  return (
    <AddToPlaylistContext.Provider value={value}>
      {children}
      <AddToPlaylistSheet song={song} onClose={() => setSong(null)} />
    </AddToPlaylistContext.Provider>
  );
}

export function useAddToPlaylist(): AddToPlaylistContextValue {
  const ctx = useContext(AddToPlaylistContext);
  if (!ctx) {
    throw new Error('useAddToPlaylist must be used within AddToPlaylistProvider');
  }
  return ctx;
}
