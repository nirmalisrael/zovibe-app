import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainAppStackParamList } from './types';
import { NowPlayingScreen } from '../screens/NowPlayingScreen';
import { LyricsScreen } from '../screens/LyricsScreen';
import { TabsWithMiniPlayer } from './TabsWithMiniPlayer';

const Stack = createNativeStackNavigator<MainAppStackParamList>();

export function MainAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabsWithMiniPlayer} />
      <Stack.Screen
        name="NowPlaying"
        component={NowPlayingScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Lyrics"
        component={LyricsScreen}
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}
