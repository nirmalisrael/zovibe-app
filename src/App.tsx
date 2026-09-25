import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';
import { RootNavigator } from './navigation/RootNavigator';
import { navigationRef } from './navigation/navigationRef';
import { PlaybackStoreSync } from './components/player/PlaybackStoreSync';
import { PlaybackRemoteControls } from './components/player/PlaybackRemoteControls';
import { AddToPlaylistProvider } from './context/AddToPlaylistContext';
import { colors } from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg.primary,
    card: colors.bg.surface,
    text: colors.text.primary,
    border: colors.border.default,
    primary: colors.brand.primary,
  },
};

let playerReady = false;

async function setupPlayer() {
  if (playerReady) return;
  await TrackPlayer.setupPlayer({ maxCacheSize: 1024 * 5 });
  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
    ],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
    ],
    /** Swiping the app away from Android recents stops audio + removes notification (RNTP API). */
    android: {
      appKilledPlaybackBehavior:
        AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    progressUpdateEventInterval: 1,
  });
  playerReady = true;
}

export default function App() {
  const [playerSetup, setPlayerSetup] = useState(false);

  useEffect(() => {
    setupPlayer()
      .then(() => setPlayerSetup(true))
      .catch(() => setPlayerSetup(true));
  }, []);

  if (!playerSetup) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AddToPlaylistProvider>
            <NavigationContainer ref={navigationRef} theme={navTheme}>
              <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
              <PlaybackStoreSync />
              <PlaybackRemoteControls />
              <RootNavigator />
            </NavigationContainer>
          </AddToPlaylistProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
