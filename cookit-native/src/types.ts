export interface NormalizedIngredient {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  section?: string;
}

export interface Step {
  stepNumber: number;
  text: string;
  ingredientIds: number[];
  section?: string;
}

export interface OriginalRecipe {
  title: string;
  ingredients: NormalizedIngredient[];
  steps: Step[];
}

export interface ParsedRecipe {
  title: string;
  ingredients: NormalizedIngredient[];
  steps: Step[];
  totalTime?: string;
  prepTime?: string;
  servings?: number;
  image?: string;
  sourceUrl?: string;
  sourceName?: string;
  originalRecipe?: OriginalRecipe;
  panShape?: string;
  panSize?: string;
}
