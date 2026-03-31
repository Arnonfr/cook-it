import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseRecipe, saveRecipe, type ParsedRecipe } from '../lib/api';

export function useRecipe(url: string) {
  return useQuery<ParsedRecipe>({
    queryKey: ['recipe', url],
    queryFn: () => parseRecipe(url),
    staleTime: 15 * 60 * 1000,
    enabled: url.length > 0,
  });
}

export function useSaveRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, recipeId }: { userId: string; recipeId: string }) =>
      saveRecipe(userId, recipeId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['library', userId] });
    },
  });
}
