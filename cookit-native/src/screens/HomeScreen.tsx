import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, Pressable } from 'react-native';
import { Search } from 'lucide-react-native';
import { useShareIntent } from 'expo-share-intent';
import { colors, typography, spacing, radius } from '../theme/designSystem';

export const HomeScreen = ({ navigation }: any) => {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      const url = shareIntent.webUrl || shareIntent.text;
      if (url) {
        setUrlInput(url);
        navigation.navigate('Recipe', { recipeUrl: url });
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent, navigation, resetShareIntent]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cookit</Text>
        <Text style={styles.subtitle}>מה בא לך להכין היום?</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="חפש מתכון או הדבק קישור..."
          placeholderTextColor={colors.textSecondary}
          value={urlInput}
          onChangeText={setUrlInput}
          returnKeyType="search"
          onSubmitEditing={() => {
            if (urlInput) {
              navigation.navigate('Recipe', { recipeUrl: urlInput });
            }
          }}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>מתכונים אחרונים</Text>
        <Pressable
          style={styles.mockCard}
          onPress={() => navigation.navigate('Recipe', { recipeUrl: 'mock' })}
        >
          <Text style={styles.mockCardText}>לחץ כדי לראות מתכון לדוגמה</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.xxl,
    color: colors.primary,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  searchContainer: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: spacing.sm,
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
  content: {
    flex: 1,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    writingDirection: 'rtl',
  },
  mockCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mockCardText: {
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },
});

// Added useShareIntent logic somewhere in the app, usually it's best at the root or main screen.
