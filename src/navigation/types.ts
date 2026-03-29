import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MoodType } from '../constants/moods';

export type HomeStackParamList = {
  HomeMain: undefined;
  Album: { albumId: string };
  Artist: { artistId: string };
  SearchResults: { query: string; title?: string };
  Mood: { mood: MoodType };
};

export type ExploreStackParamList = {
  ExploreMain: undefined;
  Album: { albumId: string };
  Artist: { artistId: string };
  SearchResults: { query: string; title?: string };
};

export type LibraryStackParamList = {
  LibraryMain: undefined;
  Playlist: { playlistId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  OnboardingPrefs: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ExploreTab: NavigatorScreenParams<ExploreStackParamList>;
  LibraryTab: NavigatorScreenParams<LibraryStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type MainAppStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;
  NowPlaying: undefined;
  Lyrics: { songId: string };
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  MainApp: NavigatorScreenParams<MainAppStackParamList>;
};

export type HomeNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

export type MainAppNavProp = NativeStackNavigationProp<MainAppStackParamList>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
