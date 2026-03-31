import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  I18nManager,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRecipe, useSaveRecipe } from '../../hooks/useRecipe';
import RecipeDetailView from '../../components/RecipeDetailView';
import { getUserId } from '../../lib/storage';
import { COLORS, FONTS } from '../../lib/constants';

I18nManager.forceRTL(true);

export default function RecipeScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const url = decodeURIComponent(id ?? '');
  const navigation = useNavigation();

  const { data: recipe, isLoading, error } = useRecipe(url);
  const { mutate: save, isPending: isSaving, isSuccess: saved } = useSaveRecipe();

  useEffect(() => {
    if (recipe?.title || title) {
      navigation.setOptions({ title: recipe?.title ?? title ?? 'מתכון' });
    }
  }, [recipe, title, navigation]);

  const handleSave = async () => {
    if (!recipe?.id) return;
    const userId = await getUserId();
    save({ userId, recipeId: recipe.id });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={styles.loadingText}>מחלץ מתכון...</Text>
        <Text style={styles.loadingSubtext}>זה לוקח כמה שניות בפעם הראשונה</Text>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>😕</Text>
        <Text style={styles.errorText}>לא הצלחנו להוציא את המתכון</Text>
        <Text style={styles.errorSubtext}>{(error as Error)?.message ?? 'שגיאה לא ידועה'}</Text>
      </View>
    );
  }

  return (
    <RecipeDetailView
      recipe={recipe}
      onSave={handleSave}
      isSaved={saved}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  errorIcon: { fontSize: 48 },
  errorText: {
    fontFamily: FONTS.semiBold,
    fontSize: 17,
    color: COLORS.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.accentOrange,
    marginTop: 8,
    textAlign: 'center',
  },
});
