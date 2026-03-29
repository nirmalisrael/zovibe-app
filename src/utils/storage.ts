import * as SecureStore from 'expo-secure-store';

export const KEY_USER_ID = 'zovibe_user_id';
export const KEY_LANG_PREFS = 'zovibe_lang_prefs';
export const KEY_ONBOARDING_DONE = 'zovibe_onboarding_complete';

export async function getSecure(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecure(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
