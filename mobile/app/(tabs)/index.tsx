import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  I18nManager,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import SearchBar from '../../components/SearchBar';
import RecipeCard from '../../components/RecipeCard';
import SkeletonCard from '../../components/SkeletonCard';
import { useSearch } from '../../hooks/useSearch';
import { fetchCatalog, type SearchResult } from '../../lib/api';
import { addRecentSearch, getRecentSearches } from '../../lib/storage';
import { COLORS, FONTS, RADIUS } from '../../lib/constants';

I18nManager.forceRTL(true);

export default function SearchScreen() {
  const router = useRouter();
  const {
    input,
    query,
    results,
    isLoading,
    isRefreshing,
    refetch,
    handleInputChange,
    handleSubmit,
    clearSearch,
    prefetchRecipe,
  } = useSearch();

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  // Featured/catalog recipes for empty state
  const catalogQuery = useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalog,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
  }, []);

  const showResults = query.length >= 2;
  const showEmpty = !showResults;
  const showRecentPanel = showRecent && input.length === 0 && recentSearches.length > 0;

  const handleCardPress = useCallback(
    async (item: SearchResult) => {
      if (!item.url) return;
      await addRecentSearch(item.title);
      setRecentSearches((prev) => [item.title, ...prev.filter((s) => s !== item.title)].slice(0, 8));
      // Encode URL to pass as route param
      const encoded = encodeURIComponent(item.url);
      router.push({ pathname: '/recipe/[id]', params: { id: encoded, title: item.title } });
    },
    [router]
  );

  const handleRecentPress = useCallback(
    (q: string) => {
      handleInputChange(q);
      handleSubmit(q);
      setShowRecent(false);
    },
    [handleInputChange, handleSubmit]
  );

  const renderResult = useCallback(
    ({ item }: { item: SearchResult }) => (
      <RecipeCard
        item={item}
        onPress={handleCardPress}
        onPressIn={(r) => r.url && prefetchRecipe(r.url)}
      />
    ),
    [handleCardPress, prefetchRecipe]
  );

  const renderSkeleton = () => (
    <>
      {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
    </>
  );

  const ListEmpty = () => {
    if (isLoading) return null;
    if (!showResults) return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🍽️</Text>
        <Text style={styles.emptyText}>לא נמצאו מתכונים עבור &quot;{query}&quot;</Text>
        <Text style={styles.emptySubtext}>נסה מילות חיפוש אחרות</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🍳 Cookit</Text>
          <Text style={styles.tagline}>מצא מתכונים מהאינטרנט</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={input}
            onChangeText={(t) => {
              handleInputChange(t);
              setShowRecent(t.length === 0);
            }}
            onSubmit={(t) => {
              void addRecentSearch(t.trim());
              setRecentSearches((prev) =>
                t.trim().length >= 2
                  ? [t.trim(), ...prev.filter((s) => s !== t.trim())].slice(0, 8)
                  : prev
              );
              handleSubmit(t);
              setShowRecent(false);
            }}
            onClear={() => {
              clearSearch();
              setShowRecent(false);
            }}
          />
        </View>

        {/* Recent searches panel */}
        {showRecentPanel && (
          <View style={styles.recentPanel}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>חיפושים אחרונים</Text>
            </View>
            {recentSearches.map((s) => (
              <Pressable key={s} style={styles.recentItem} onPress={() => handleRecentPress(s)}>
                <Text style={styles.recentItemText}>{s}</Text>
                <Text style={styles.recentClock}>🕐</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Results / Catalog */}
        {showResults ? (
          <View style={styles.flex}>
            {isLoading ? (
              <FlatList
                data={[1, 2, 3, 4]}
                keyExtractor={(i) => String(i)}
                renderItem={() => <SkeletonCard />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
              />
            ) : (
              <FlashList
                data={results}
                keyExtractor={(item, i) => item.url ?? String(i)}
                renderItem={renderResult}
                estimatedItemSize={260}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={() => {
                      if (query.length >= 2) {
                        void refetch();
                      }
                    }}
                    tintColor={COLORS.primaryBlue}
                    colors={[COLORS.primaryBlue]}
                  />
                }
                ListEmptyComponent={ListEmpty}
                ListHeaderComponent={
                  isRefreshing ? (
                    <View style={styles.refreshRow}>
                      <ActivityIndicator size="small" color={COLORS.primaryBlue} />
                      <Text style={styles.refreshText}>מחפש...</Text>
                    </View>
                  ) : (
                    <Text style={styles.resultsCount}>
                      {results.length} תוצאות עבור &ldquo;{query}&rdquo;
                    </Text>
                  )
                }
              />
            )}
          </View>
        ) : (
          /* Featured / Catalog */
          <FlashList
            data={catalogQuery.data ?? []}
            keyExtractor={(item, i) => item.url ?? String(i)}
            renderItem={renderResult}
            estimatedItemSize={260}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={catalogQuery.isRefetching}
                onRefresh={() => {
                  void catalogQuery.refetch();
                }}
                tintColor={COLORS.primaryBlue}
                colors={[COLORS.primaryBlue]}
              />
            }
            ListHeaderComponent={
              <Text style={styles.sectionHeading}>
                {catalogQuery.isLoading ? 'טוען...' : 'מתכונים פופולריים'}
              </Text>
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'flex-end',
  },
  logo: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.primaryBlue,
    textAlign: 'right',
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  recentPanel: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: RADIUS.md,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  recentHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  recentItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  recentItemText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  recentClock: { fontSize: 14 },
  listContent: { padding: 16 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  refreshRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
  },
  refreshText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  resultsCount: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
    paddingBottom: 10,
  },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: 'right',
    paddingBottom: 12,
  },
});
