import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { RecipeResult } from '../components/RecipeResult';
import { ParsedRecipe } from '../types';
import { api } from '../api/client';
import { colors } from '../theme/designSystem';
import { recipeStore } from '../store/recipeStore';

export const RecipeScreen = ({ navigation, route }: any) => {
  const { recipeUrl, recipeData } = route.params || {};
  const [recipe, setRecipe] = useState<ParsedRecipe | null>(recipeData || null);
  const [loading, setLoading] = useState(!recipeData);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!recipeData && recipeUrl && recipeUrl !== 'mock') {
      loadRecipe(recipeUrl);
    } else if (recipeUrl === 'mock') {
      // Keep using mock
      setRecipe(MOCK_RECIPE);
      setLoading(false);
    }
  }, [recipeUrl, recipeData]);

  const loadRecipe = async (url: string) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.parseRecipe(url);
      setRecipe(data.recipe);
    } catch (err) {
      setError('שגיאה בטעינת המתכון');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>מחלץ מתכון...</Text>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'מתכון לא נמצא'}</Text>
      </View>
    );
  }

  const handleSave = (r: ParsedRecipe) => {
    if (recipeStore.isSaved(r.sourceUrl || '')) {
      recipeStore.remove(r.sourceUrl || '');
    } else {
      recipeStore.save(r);
    }
  };

  return (
    <View style={styles.container}>
      <RecipeResult
        recipe={recipe}
        onBack={() => navigation.goBack()}
        onSave={handleSave}
      />
    </View>
  );
};

// Mock recipe for demonstration
const MOCK_RECIPE: ParsedRecipe = {
  title: 'עוגת שוקולד פאדג׳ מושחתת',
  totalTime: 'שעה ו-15 דקות',
  servings: 8,
  image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
  ingredients: [
    { id: 1, name: 'שוקולד מריר', quantity: '200', unit: 'גרם' },
    { id: 2, name: 'חמאה', quantity: '150', unit: 'גרם' },
    { id: 3, name: 'סוכר', quantity: '1', unit: 'כוס' },
    { id: 4, name: 'ביצים', quantity: '4', unit: '' },
    { id: 5, name: 'קמח', quantity: '0.5', unit: 'כוס' },
  ],
  steps: [
    { stepNumber: 1, text: 'מחממים תנור ל-170 מעלות ומשמנים תבנית אפייה.', ingredientIds: [] },
    { stepNumber: 2, text: 'ממיסים יחד את השוקולד המריר והחמאה במיקרוגל או על באן מארי.', ingredientIds: [1, 2] },
    { stepNumber: 3, text: 'מקציפים את הביצים עם הסוכר עד לקבלת תערובת תפוחה ובהירה.', ingredientIds: [3, 4] },
    { stepNumber: 4, text: 'מקפלים את תערובת השוקולד לתוך הביצים, ולבסוף מוסיפים את הקמח ומערבבים רק עד שאחיד.', ingredientIds: [5] },
    { stepNumber: 5, text: 'אופים כ-35 דקות עד שקיסם יוצא עם פירורים לחים. מצננים לפני שחותכים.', ingredientIds: [] }
  ],
  sourceUrl: 'https://example.com/recipe',
  sourceName: 'Example Website'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    marginTop: 16,
    color: colors.primary,
    fontFamily: 'NotoSansHebrew-Medium',
  },
  errorText: {
    color: colors.accentOrange,
    fontFamily: 'NotoSansHebrew-Medium',
  }
});
