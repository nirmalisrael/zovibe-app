import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { LibraryStackParamList } from './types';
import { LibraryScreen } from '../screens/LibraryScreen';
import { PlaylistScreen } from '../screens/PlaylistScreen';
import { defaultNativeStackScreenOptions } from './stackScreenOptions';

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export function LibraryStackNav() {
  return (
    <Stack.Navigator screenOptions={defaultNativeStackScreenOptions}>
      <Stack.Screen name="LibraryMain" component={LibraryScreen} />
      <Stack.Screen name="Playlist" component={PlaylistScreen} />
    </Stack.Navigator>
  );
}
