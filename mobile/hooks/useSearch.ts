import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchUnified, parseRecipe, type SearchResult } from '../lib/api';
import { SEARCH_DEBOUNCE_MS } from '../lib/constants';

export const SEARCH_QUERY_KEY = (q: string) => ['search', q] as const;

export function useSearch() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.trim().length < 2) {
        setQuery('');
        return;
      }
      debounceRef.current = setTimeout(() => {
        setQuery(text.trim());
      }, SEARCH_DEBOUNCE_MS);
    },
    []
  );

  const handleSubmit = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = text.trim();
    if (q.length >= 2) setQuery(q);
  }, []);

  const clearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInput('');
    setQuery('');
  }, []);

  // Prefetch recipe detail when hovering / pressing card
  const prefetchRecipe = useCallback(
    (url: string) => {
      queryClient.prefetchQuery({
        queryKey: ['recipe', url],
        queryFn: () => parseRecipe(url),
        staleTime: 10 * 60 * 1000,
      });
    },
    [queryClient]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const searchQuery = useQuery({
    queryKey: SEARCH_QUERY_KEY(query),
    queryFn: () => searchUnified(query),
    enabled: query.length >= 2,
    placeholderData: (prev) => prev,
  });

  return {
    input,
    query,
    results: searchQuery.data ?? [],
    isLoading: searchQuery.isFetching && !searchQuery.data,
    isRefreshing: searchQuery.isFetching && !!searchQuery.data,
    error: searchQuery.error,
    handleInputChange,
    handleSubmit,
    clearSearch,
    prefetchRecipe,
  };
}

export function useCatalog() {
  return useQuery<SearchResult[]>({
    queryKey: ['catalog'],
    queryFn: () => import('../lib/api').then((m) => m.fetchCatalog()),
    staleTime: 10 * 60 * 1000,
  });
}
