import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Search, X, Clock3, ChefHat } from 'lucide-react-native';
import { useShareIntent } from 'expo-share-intent';
import { colors, typography, spacing, radius } from '../theme/designSystem';
import { api, SearchResult } from '../api/client';

const URL_REGEX = /^https?:\/\/.+/i;

export const HomeScreen = ({ navigation }: any) => {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Handle incoming share intent (URL shared from another app)
  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      const url = shareIntent.webUrl || shareIntent.text;
      if (url && URL_REGEX.test(url)) {
        resetShareIntent();
        navigation.navigate('Recipe', { recipeUrl: url });
      }
    }
  }, [hasShareIntent, shareIntent, navigation, resetShareIntent]);

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }

    // If it looks like a URL — go straight to recipe extraction
    if (URL_REGEX.test(trimmed)) {
      navigation.navigate('Recipe', { recipeUrl: trimmed });
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const data = await api.searchUnified(trimmed);
      const combined = [...(data.local || []), ...(data.web || [])];
      setResults(combined);
    } catch (err) {
      console.error('[Search] failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  // Debounce search as user types
  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(text), 500);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  const openRecipe = (item: SearchResult) => {
    Keyboard.dismiss();
    navigation.navigate('Recipe', { recipeUrl: item.sourceUrl });
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => openRecipe(item)}
    >
      <Image
        source={{ uri: item.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=60' }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardMeta}>
          {item.totalTime && (
            <View style={styles.metaChip}>
              <Clock3 size={11} color={colors.textSecondary} />
              <Text style={styles.metaText}>{formatTime(item.totalTime)}</Text>
            </View>
          )}
          {item.sourceName && (
            <Text style={styles.sourceName} numberOfLines={1}>{item.sourceName}</Text>
          )}
        </View>
        {item.ingredientsPreview && item.ingredientsPreview.length > 0 && (
          <Text style={styles.ingredients} numberOfLines={1}>
            {item.ingredientsPreview.slice(0, 3).join(' · ')}
          </Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="שם מתכון, חומר גלם, או קישור..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={onChangeText}
            onSubmitEditing={() => handleSearch(query)}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.hint}>מחפש מתכונים...</Text>
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.centered}>
          <ChefHat size={48} color={colors.border} />
          <Text style={styles.hint}>לא נמצאו תוצאות עבור "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => item.sourceUrl || String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            !searched ? (
              <View style={styles.emptyState}>
                <Text style={styles.welcomeTitle}>Cookit 🍳</Text>
                <Text style={styles.welcomeSubtitle}>חפש מתכון, או שתף קישור מהדפדפן ישירות לאפליקציה</Text>
              </View>
            ) : (
              <Text style={styles.resultCount}>{results.length} תוצאות</Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
};

function formatTime(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return iso;
  const h = parseInt(m[1] || '0');
  const min = parseInt(m[2] || '0');
  if (h > 0 && min > 0) return `${h}ש' ${min}ד'`;
  if (h > 0) return `${h} שעות`;
  return `${min} דק'`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    writingDirection: 'rtl',
    textAlign: 'right',
    height: '100%',
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  cardImage: {
    width: 96,
    height: 96,
    backgroundColor: colors.border,
  },
  cardContent: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'center',
    gap: 4,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  sourceName: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  ingredients: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  hint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  welcomeTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.xxl,
    color: colors.primary,
  },
  welcomeSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl',
    maxWidth: 280,
    lineHeight: 24,
  },
  resultCount: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing.sm,
  },
});
