import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  I18nManager,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import RecipeCard from '../../components/RecipeCard';
import { fetchLibrary, type ParsedRecipe } from '../../lib/api';
import { getUserId } from '../../lib/storage';
import { COLORS, FONTS } from '../../lib/constants';

I18nManager.forceRTL(true);

// Convert ParsedRecipe → SearchResult shape for RecipeCard
function toSearchResult(r: ParsedRecipe) {
  return {
    id: r.id,
    title: r.title,
    url: r.sourceUrl ?? '',
    image: r.image,
    description: r.description,
    totalTime: r.totalTime,
    servings: r.servings,
  };
}

export default function LibraryScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getUserId().then(setUserId).catch(() => setUserId('anonymous'));
  }, []);

  const { data: recipes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['library', userId],
    queryFn: () => fetchLibrary(userId ?? 'anonymous'),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const handleCardPress = useCallback(
    (item: { url?: string; title: string }) => {
      if (!item.url) return;
      router.push({
        pathname: '/recipe/[id]',
        params: { id: encodeURIComponent(item.url), title: item.title },
      });
    },
    [router]
  );

  if (isLoading || !userId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>המתכונים שלי</Text>
      </View>
      {!recipes || recipes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>אין מתכונים שמורים עדיין</Text>
          <Text style={styles.emptySubtext}>חפש מתכון ולחץ &ldquo;שמור מתכון&rdquo;</Text>
        </View>
      ) : (
        <FlashList
          data={recipes.map(toSearchResult)}
          keyExtractor={(item, i) => item.url || String(i)}
          renderItem={({ item }) => (
            <RecipeCard item={item} onPress={handleCardPress} />
          )}
          estimatedItemSize={260}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: { fontSize: 52 },
  emptyText: {
    fontFamily: FONTS.semiBold,
    fontSize: 17,
    color: COLORS.textPrimary,
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
});
