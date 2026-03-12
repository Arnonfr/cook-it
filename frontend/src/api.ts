import axios from 'axios';
import type { SearchResult, ParsedRecipe, UnifiedSearchResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const searchRecipes = async (query: string): Promise<SearchResult[]> => {
    const response = await axios.get(`${API_BASE_URL}/search`, { params: { q: query } });
    return response.data.results;
};

export const searchUnified = async (query: string, userId?: string): Promise<UnifiedSearchResponse> => {
    const response = await axios.get(`${API_BASE_URL}/search/unified`, {
        params: { q: query, userId }
    });
    return response.data;
};

export const parseRecipe = async (url: string, userId?: string): Promise<ParsedRecipe> => {
    const response = await axios.get(`${API_BASE_URL}/parse`, { params: { url, userId } });
    return response.data.recipe;
};

export const fetchCommunityRecipes = async (): Promise<ParsedRecipe[]> => {
    const response = await axios.get(`${API_BASE_URL}/community`);
    return response.data.recipes;
};

export const fetchLibrary = async (userId: string): Promise<ParsedRecipe[]> => {
    const response = await axios.get(`${API_BASE_URL}/library/${userId}`);
    return response.data.recipes;
};

export const saveRecipe = async (userId: string, recipeId: string): Promise<void> => {
    await axios.post(`${API_BASE_URL}/save`, { userId, recipeId });
};

export const fetchCatalog = async (): Promise<SearchResult[]> => {
    const response = await axios.get(`${API_BASE_URL}/catalog`);
    return response.data.recipes;
};

export const getIngredientImages = async (names: string[]): Promise<Record<string, string>> => {
    if (names.length === 0) return {};
    const response = await axios.get(`${API_BASE_URL}/ingredients/images`, {
        params: { names: names.join(',') }
    });
    return response.data.images;
};

export const fetchCollections = async (userId: string) => {
    const response = await axios.get(`${API_BASE_URL}/collections/${userId}`);
    return response.data.collections;
};

export const createCollection = async (userId: string, name: string) => {
    const response = await axios.post(`${API_BASE_URL}/collections`, { userId, name });
    return response.data;
};

export const addRecipeToCollection = async (recipeId: string, collectionId: string) => {
    const response = await axios.post(`${API_BASE_URL}/collections/${collectionId}/recipes`, { recipeId });
    return response.data;
};

export const fetchCollectionDetail = async (collectionId: string) => {
    const response = await axios.get(`${API_BASE_URL}/collections/detail/${collectionId}`);
    return response.data;
};

