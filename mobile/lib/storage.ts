import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = 'cookit:recent_searches';
const USER_ID_KEY = 'cookit:user_id';
const MAX_RECENT = 8;

export const getRecentSearches = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addRecentSearch = async (query: string): Promise<void> => {
  try {
    const prev = await getRecentSearches();
    const updated = [query, ...prev.filter((s) => s !== query)].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {}
};

export const clearRecentSearches = async (): Promise<void> => {
  await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
};

export const getUserId = async (): Promise<string> => {
  try {
    let id = await AsyncStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = 'user_' + Math.random().toString(36).slice(2, 11);
      await AsyncStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
};
