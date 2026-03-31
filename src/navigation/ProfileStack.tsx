import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from './types';
import { ProfileScreen } from '../screens/ProfileScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { defaultNativeStackScreenOptions } from './stackScreenOptions';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNav() {
  return (
    <Stack.Navigator screenOptions={defaultNativeStackScreenOptions}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="OnboardingPrefs" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}
