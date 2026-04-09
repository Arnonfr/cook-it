import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Dimensions, Share } from 'react-native';
import { ArrowRight, Bookmark, Share2, Clock3, Users, Globe, ScanEye, Utensils, CheckCircle2 } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../theme/designSystem';
import { ParsedRecipe, NormalizedIngredient, Step } from '../types';

const { width, height } = Dimensions.get('window');

interface Props {
  recipe: ParsedRecipe;
  onBack: () => void;
  onSave?: (recipe: ParsedRecipe) => void;
}

export const RecipeResult = ({ recipe, onBack, onSave }: Props) => {
  const [activeTab, setActiveTab] = useState<'steps' | 'ingredients'>('steps');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [completedIngredients, setCompletedIngredients] = useState<Set<number>>(new Set());

  const handleShare = async () => {
    try {
      await Share.share({
        message: `בדוק את המתכון: ${recipe.title} \n${recipe.sourceUrl || ''}`,
      });
    } catch (error) {
      console.error('Error sharing', error);
    }
  };

  const toggleStep = (stepNumber: number) => {
    const next = new Set(completedSteps);
    if (next.has(stepNumber)) next.delete(stepNumber);
    else next.add(stepNumber);
    setCompletedSteps(next);
  };

  const toggleIngredient = (id: number) => {
    const next = new Set(completedIngredients);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompletedIngredients(next);
  };

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.header}>
          <Image
            source={{ uri: recipe.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80' }}
            style={styles.image}
          />
          <View style={styles.overlay} />

          {/* Action Buttons */}
          <View style={styles.actionsTop}>
            <Pressable onPress={handleShare} style={styles.iconButton}>
              <Share2 size={20} color={colors.surface} />
            </Pressable>
            {onSave && (
              <Pressable onPress={() => onSave(recipe)} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
                <Bookmark size={20} color={colors.primary} />
              </Pressable>
            )}
          </View>

          <Pressable onPress={onBack} style={styles.backButton}>
            <ArrowRight size={20} color={colors.surface} />
          </Pressable>

          {/* Info */}
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{recipe.title}</Text>
            <View style={styles.metaRow}>
              {recipe.totalTime && (
                <View style={styles.metaBadge}>
                  <Clock3 size={14} color={colors.surface} />
                  <Text style={styles.metaText}>{recipe.totalTime}</Text>
                </View>
              )}
              {recipe.servings && (
                <View style={styles.metaBadge}>
                  <Users size={14} color={colors.surface} />
                  <Text style={styles.metaText}>{recipe.servings} מנות</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <Pressable
            style={[styles.tab, activeTab === 'steps' && styles.activeTab]}
            onPress={() => setActiveTab('steps')}
          >
            <ScanEye size={18} color={activeTab === 'steps' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'steps' && styles.activeTabText]}>שלבי הכנה</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'ingredients' && styles.activeTab]}
            onPress={() => setActiveTab('ingredients')}
          >
            <Utensils size={18} color={activeTab === 'ingredients' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'ingredients' && styles.activeTabText]}>
              מצרכים
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'steps' ? (
            <View>
              {recipe.steps.map((step) => {
                const isCompleted = completedSteps.has(step.stepNumber);
                return (
                  <Pressable key={step.stepNumber} onPress={() => toggleStep(step.stepNumber)} style={[styles.stepCard, isCompleted && styles.stepCardCompleted]}>
                    <View style={styles.stepHeader}>
                      <View style={[styles.stepBadge, isCompleted && styles.stepBadgeCompleted]}>
                        <Text style={[styles.stepBadgeText, isCompleted && styles.stepBadgeTextCompleted]}>
                          שלב {step.stepNumber}
                        </Text>
                      </View>
                      {isCompleted && <CheckCircle2 size={16} color={colors.primary} />}
                    </View>
                    <Text style={[styles.stepText, isCompleted && styles.stepTextCompleted]}>
                      {step.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View>
              {recipe.ingredients.map((ing) => {
                const isCompleted = completedIngredients.has(ing.id);
                return (
                  <Pressable key={ing.id} onPress={() => toggleIngredient(ing.id)} style={[styles.ingredientRow, isCompleted && styles.ingredientRowCompleted]}>
                    <View style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}>
                      {isCompleted && <CheckCircle2 size={20} color={colors.primary} />}
                    </View>
                    <View style={styles.ingredientInfo}>
                      <Text style={[styles.ingredientName, isCompleted && styles.ingredientNameCompleted]}>
                        {ing.name}
                      </Text>
                      <Text style={styles.ingredientQuantity}>
                        {ing.quantity} {ing.unit}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    height: height * 0.4,
    minHeight: 300,
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  actionsTop: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.xxl,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backButton: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.xxl,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.xl,
    color: colors.surface,
    marginBottom: spacing.sm,
    writingDirection: 'rtl',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.sizes.xs,
    color: colors.surface,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
    backgroundColor: colors.background,
  },
  tabText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  content: {
    padding: spacing.md,
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stepCardCompleted: {
    backgroundColor: colors.background,
    borderColor: 'transparent',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stepBadge: {
    backgroundColor: '#e7f3f1',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  stepBadgeCompleted: {
    backgroundColor: '#d1fae5',
  },
  stepBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.sizes.xs,
    color: colors.primary,
  },
  stepBadgeTextCompleted: {
    color: '#047857',
  },
  stepText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    lineHeight: 24,
    writingDirection: 'rtl',
  },
  stepTextCompleted: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ingredientRowCompleted: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxCompleted: {
    borderColor: 'transparent',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    writingDirection: 'rtl',
  },
  ingredientNameCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  ingredientQuantity: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    writingDirection: 'rtl',
  },
});
