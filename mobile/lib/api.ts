import { API_BASE_URL } from './constants';

interface RequestOptions {
  method?: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

async function request<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', params, body, timeoutMs = 30000 } = opts;

  let url = API_BASE_URL + endpoint;
  if (params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) search.append(k, String(v));
    });
    const qs = search.toString();
    if (qs) url += '?' + qs;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`שגיאת שרת ${res.status}`);
    return res.json();
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('השרת לא הגיב — נסה שוב');
    }
    throw err;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  id?: string;
  title: string;
  url: string;
  image?: string;
  source?: string;
  description?: string;
  ingredientsPreview?: string[];
  totalTime?: string;
  servings?: number;
  cached?: boolean;
}

export interface ParsedRecipe {
  id?: string;
  title: string;
  sourceUrl?: string;
  image?: string;
  ingredients: string[];
  steps: string[];
  totalTime?: string;
  servings?: number;
  originalLanguage?: string;
  description?: string;
}

export interface UnifiedSearchResponse {
  results: SearchResult[];
  source?: string;
}

export interface KeyStatus {
  set: boolean;
  valid: boolean;
  masked: string;
}

export interface SettingsResponse {
  geminiApiKey: KeyStatus;
  serperApiKey: KeyStatus;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

export const searchUnified = async (q: string): Promise<SearchResult[]> => {
  const data = await request<UnifiedSearchResponse>('/search/unified', { params: { q } });
  return data.results ?? [];
};

export const parseRecipe = async (url: string): Promise<ParsedRecipe> => {
  const data = await request<{ recipe: ParsedRecipe }>('/parse', {
    params: { url },
    timeoutMs: 60000,
  });
  return data.recipe;
};

export const fetchCatalog = async (): Promise<SearchResult[]> => {
  const data = await request<{ recipes: SearchResult[] }>('/catalog');
  return data.recipes ?? [];
};

export const fetchLibrary = async (userId: string): Promise<ParsedRecipe[]> => {
  const data = await request<{ recipes: ParsedRecipe[] }>(`/library/${userId}`);
  return data.recipes ?? [];
};

export const saveRecipe = async (userId: string, recipeId: string): Promise<void> => {
  await request('/save', { method: 'POST', body: { userId, recipeId } });
};

export const fetchCollections = async (userId: string) => {
  return request(`/collections/${userId}`);
};

export const fetchSettings = async (): Promise<SettingsResponse> => {
  return request('/settings');
};

export const updateSettings = async (keys: { geminiApiKey?: string; serperApiKey?: string }): Promise<void> => {
  await request('/settings', { method: 'POST', body: keys });
};

export const enrichRecipe = async (url: string) => {
  return request<{ image?: string; ingredientsPreview?: string[]; totalTime?: string; servings?: number }>('/enrich', {
    params: { url },
  });
};

export const warmUp = (): void => {
  const healthUrl = API_BASE_URL.replace('/api', '') + '/health';
  fetch(healthUrl).catch(() => {});
};
