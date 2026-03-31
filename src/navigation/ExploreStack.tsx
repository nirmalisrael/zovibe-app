import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ExploreStackParamList } from './types';
import { ExploreScreen } from '../screens/ExploreScreen';
import { AlbumScreen } from '../screens/AlbumScreen';
import { ArtistScreen } from '../screens/ArtistScreen';
import { SearchResultsScreen } from '../screens/SearchResultsScreen';
import { defaultNativeStackScreenOptions } from './stackScreenOptions';

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={defaultNativeStackScreenOptions}>
      <Stack.Screen name="ExploreMain" component={ExploreScreen} />
      <Stack.Screen name="Album" component={AlbumScreen} />
      <Stack.Screen name="Artist" component={ArtistScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
    </Stack.Navigator>
  );
}
