import { MMKV } from 'react-native-mmkv';
import { ParsedRecipe } from '../types';

const storage = new MMKV({ id: 'cookit-recipes' });
const SAVED_KEY = 'saved_recipes';

function getSaved(): ParsedRecipe[] {
  const raw = storage.getString(SAVED_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ParsedRecipe[];
  } catch {
    return [];
  }
}

function setSaved(recipes: ParsedRecipe[]): void {
  storage.set(SAVED_KEY, JSON.stringify(recipes));
}

export const recipeStore = {
  getAll(): ParsedRecipe[] {
    return getSaved();
  },

  save(recipe: ParsedRecipe): void {
    const existing = getSaved();
    const alreadySaved = existing.some((r) => r.sourceUrl === recipe.sourceUrl);
    if (alreadySaved) return;
    setSaved([recipe, ...existing]);
  },

  remove(sourceUrl: string): void {
    const existing = getSaved();
    setSaved(existing.filter((r) => r.sourceUrl !== sourceUrl));
  },

  isSaved(sourceUrl: string): boolean {
    return getSaved().some((r) => r.sourceUrl === sourceUrl);
  },
};
