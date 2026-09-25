import { Easing, View, StyleSheet } from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBar,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { HomeStack } from './HomeStack';
import { ExploreStack } from './ExploreStack';
import { LibraryStackNav } from './LibraryStack';
import { ProfileStackNav } from './ProfileStack';
import type { MainAppStackParamList, MainTabParamList } from './types';
import { colors, layout } from '../theme';
import { MiniPlayer } from '../components/player/MiniPlayer';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabBarWithMini(props: Readonly<BottomTabBarProps>) {
  const queueLen = usePlayerStore((s) => s.queue.length);
  const { dismissMiniPlayer } = usePlayer();
  const onExpand = () => {
    props.navigation
      .getParent<NativeStackNavigationProp<MainAppStackParamList>>()
      ?.navigate('NowPlaying');
  };

  return (
    <View style={tabBarShell.column}>
      {queueLen > 0 ? (
        <View pointerEvents="box-none">
          <MiniPlayer onExpand={onExpand} onSwipeDismiss={() => void dismissMiniPlayer()} />
        </View>
      ) : null}
      <BottomTabBar {...props} />
    </View>
  );
}

const tabBarShell = StyleSheet.create({
  column: {
    backgroundColor: colors.bg.surface,
  },
});

export function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={(p) => <TabBarWithMini {...p} />}
      screenOptions={{
        headerShown: false,
        /** Cross-fade between tabs — RN Animated + native driver, low cost */
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 240,
            easing: Easing.out(Easing.cubic),
          },
        },
        tabBarStyle: {
          backgroundColor: colors.bg.surface,
          borderTopColor: colors.border.subtle,
          borderTopWidth: 1,
          height: layout.tabBarHeight,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: colors.brand.light,
        tabBarInactiveTintColor: '#3D3060',
        sceneStyle: { backgroundColor: colors.bg.primary },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={ExploreStack}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryStackNav}
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'library' : 'library-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNav}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
