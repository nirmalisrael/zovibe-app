import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { AlbumScreen } from '../screens/AlbumScreen';
import { ArtistScreen } from '../screens/ArtistScreen';
import { SearchResultsScreen } from '../screens/SearchResultsScreen';
import { MoodScreen } from '../screens/MoodScreen';
import { defaultNativeStackScreenOptions } from './stackScreenOptions';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={defaultNativeStackScreenOptions}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Album" component={AlbumScreen} />
      <Stack.Screen name="Artist" component={ArtistScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="Mood" component={MoodScreen} />
    </Stack.Navigator>
  );
}
