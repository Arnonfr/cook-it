import axios from 'axios';
import { Platform } from 'react-native';

// For Android emulator use 10.0.2.2 to reach host's localhost.
// For real device on same WiFi, set EXPO_PUBLIC_API_URL env var or use your machine's LAN IP.
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return `${process.env.EXPO_PUBLIC_API_URL}/api`;
  }
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3001/api';
    }
    return 'http://localhost:3001/api';
  }
  return 'https://cook-it-backend.onrender.com/api';
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // GET /search/unified?q=&userId=
  searchUnified: async (q: string, userId = 'user-123') => {
    const response = await apiClient.get('/search/unified', { params: { q, userId } });
    return response.data as { local: SearchResult[]; web: SearchResult[]; webTotal: number };
  },
  // GET /parse?url=&userId=
  parseRecipe: async (url: string, userId = 'user-123') => {
    const response = await apiClient.get('/parse', { params: { url, userId } });
    return response.data;
  },
  // GET /enrich?url=
  enrichRecipe: async (url: string) => {
    const response = await apiClient.get('/enrich', { params: { url } });
    return response.data;
  },
};

export interface SearchResult {
  sourceUrl: string;
  title: string;
  image?: string;
  totalTime?: string;
  servings?: number;
  ingredientsPreview?: string[];
  sourceName?: string;
  difficulty?: string;
  tags?: string[];
  isMine?: boolean;
}
