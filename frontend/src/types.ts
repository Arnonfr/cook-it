export interface SearchResult {
    sourceUrl: string;
    title: string;
    originalTitle?: string;
    originalLanguage?: string;
    isMine?: boolean;
    image?: string;
    totalTime?: string;
    servings?: number;
    ingredientsPreview?: string[];
    sourceName?: string;
    difficulty?: string;
    tags?: string[];
    id?: string;
}

export interface NormalizedIngredient {
    id: number;
    name: string;
    quantity: string;
    unit: string;
    originalSpec?: string;
    section?: string;
}

export interface Step {
    stepNumber: number;
    text: string;
    ingredientIds: number[];
    section?: string;
}

export interface ParsedRecipe {
    title: string;
    originalTitle?: string;
    originalLanguage?: string;
    ingredients: NormalizedIngredient[];
    steps: Step[];
    totalTime?: string;
    servings?: number;
    difficulty?: string;
    image?: string;
    sourceName?: string;
    sourceUrl?: string;
    tags?: string[];
    originalRecipe?: {
        title: string;
        ingredients: NormalizedIngredient[];
        steps: Step[];
    };
    id?: string;
}

export interface UnifiedSearchResponse {
    local: SearchResult[];
    web: SearchResult[];
    webTotal: number;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  image?: string;
  isPublic: boolean;
  items: CollectionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItem {
  collectionId: string;
  recipeId: string;
  recipe: ParsedRecipe;
  createdAt: string;
}

