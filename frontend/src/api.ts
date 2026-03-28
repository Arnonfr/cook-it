import type { SearchResult, ParsedRecipe, UnifiedSearchResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Warm up Render free-tier backend (cold start takes ~30-50s)
let _warmUpDone = false;
export const warmUpBackend = () => {
  if (_warmUpDone) return;
  _warmUpDone = true;
  const healthUrl = API_BASE_URL.replace(/\/api$/, '') + '/health';
  fetch(healthUrl, { method: 'GET', mode: 'cors' }).catch(() => {});
};

// Check if running in Capacitor
const isCapacitor = () => typeof (window as any).Capacitor !== 'undefined';

// Use native bridge for HTTP requests in Capacitor
const nativeRequest = async (method: string, endpoint: string, params?: any, body?: any) => {
  const url = API_BASE_URL + endpoint;
  
  if (isCapacitor() && (window as any).Capacitor.Plugins.Http) {
    // Use Capacitor Http plugin if available
    const { Http } = (window as any).Capacitor.Plugins;
    const options: any = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (params) options.params = params;
    if (body) options.data = body;
    
    const result = await Http.request(options);
    return result.data;
  } else {
    // Fallback to fetch
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    let fetchUrl = url;
    if (params) {
      const urlObj = new URL(url);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) urlObj.searchParams.append(key, String(value));
      });
      fetchUrl = urlObj.toString();
    }

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    // AbortController for timeout (60s for parse, 30s for others)
    const timeoutMs = endpoint.includes('/parse') ? 60000 : 30000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(fetchUrl, fetchOptions);
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === 'AbortError') {
        throw new Error('השרת לא הגיב בזמן — נסה שוב');
      }
      throw err;
    }
  }
};

export const searchRecipes = async (query: string): Promise<SearchResult[]> => {
  const data = await nativeRequest('GET', '/search', { q: query });
  return data.results;
};

export const searchUnified = async (query: string, userId?: string): Promise<UnifiedSearchResponse> => {
  return await nativeRequest('GET', '/search/unified', { q: query, userId });
};

export const searchLocalOnly = async (query: string): Promise<UnifiedSearchResponse> => {
  return await nativeRequest('GET', '/search/unified', { q: query, localOnly: 'true' });
};

export const parseRecipe = async (url: string, userId?: string): Promise<ParsedRecipe> => {
  const data = await nativeRequest('GET', '/parse', { url, userId });
  return data.recipe;
};

export const fetchCommunityRecipes = async (): Promise<ParsedRecipe[]> => {
  const data = await nativeRequest('GET', '/community');
  return data.recipes;
};

export const fetchLibrary = async (userId: string): Promise<ParsedRecipe[]> => {
  const data = await nativeRequest('GET', `/library/${userId}`);
  return data.recipes;
};

export const saveRecipe = async (userId: string, recipeId: string): Promise<void> => {
  await nativeRequest('POST', '/save', undefined, { userId, recipeId });
};

export const fetchCatalog = async (): Promise<SearchResult[]> => {
  const data = await nativeRequest('GET', '/catalog');
  return data.recipes;
};

export const getIngredientImages = async (names: string[]): Promise<Record<string, string>> => {
  if (names.length === 0) return {};
  const data = await nativeRequest('GET', '/ingredients/images', { names: names.join(',') });
  return data.images;
};

export const fetchCollections = async (userId: string) => {
  const data = await nativeRequest('GET', `/collections/${userId}`);
  return data.collections;
};

export const createCollection = async (userId: string, name: string) => {
  return await nativeRequest('POST', '/collections', undefined, { userId, name });
};

export const addRecipeToCollection = async (userId: string, collectionName: string, recipeId: string) => {
  return await nativeRequest('POST', '/collections/add', undefined, { userId, collectionName, recipeId });
};

export const fetchCollectionDetail = async (userId: string, collectionName: string) => {
  return await nativeRequest('GET', `/collections/${userId}/${encodeURIComponent(collectionName)}`);
};

export interface KeyStatus {
  set: boolean;
  valid: boolean;
  masked: string;
}

export interface SettingsResponse {
  geminiApiKey: KeyStatus;
  serperApiKey: KeyStatus;
}

export interface EnrichmentData {
  image?: string;
  ingredientsPreview?: string[];
  totalTime?: string;
  servings?: number;
  cached?: boolean;
}

export const enrichRecipe = async (url: string): Promise<EnrichmentData> => {
  return await nativeRequest('GET', '/enrich', { url });
};

export const fetchSettings = async (): Promise<SettingsResponse> => {
  return await nativeRequest('GET', '/settings');
};

export const updateSettings = async (keys: { geminiApiKey?: string; serperApiKey?: string }): Promise<void> => {
  await nativeRequest('POST', '/settings', undefined, keys);
};
