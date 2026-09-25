import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEY_USER_ID = 'zovibe_user_id';
export const KEY_LANG_PREFS = 'zovibe_lang_prefs';
export const KEY_HOME_LANG_FILTER = 'zovibe_home_lang_filter';
export const KEY_ONBOARDING_DONE = 'zovibe_onboarding_complete';

export async function getSecure(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setSecure(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function deleteSecure(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
