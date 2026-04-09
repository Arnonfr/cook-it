import axios from 'axios';
import { Platform } from 'react-native';

// For Android emulator to reach host localhost use 10.0.2.2
// If running on a real device, replace with your machine's IP
const getBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3001/api';
    }
    return 'http://localhost:3001/api';
  }
  return 'https://your-production-url.com/api'; // Replace with prod URL later
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  searchUnified: async (q: string) => {
    const response = await apiClient.get('/search/unified', { params: { q } });
    return response.data;
  },
  parseRecipe: async (url: string) => {
    const response = await apiClient.post('/recipe/parse', { url });
    return response.data;
  },
  // Add more API endpoints here
};
