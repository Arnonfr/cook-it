import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Share,
  I18nManager,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, RADIUS, SHADOW } from '../lib/constants';
import type { ParsedRecipe } from '../lib/api';

I18nManager.forceRTL(true);

interface Props {
  recipe: ParsedRecipe;
  onSave?: () => void;
  isSaved?: boolean;
}

function IngredientRow({ text }: { text: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <Pressable
      style={[styles.ingredientRow, checked && styles.ingredientChecked]}
      onPress={() => {
        Haptics.selectionAsync();
        setChecked((v) => !v);
      }}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <Text style={[styles.ingredientText, checked && styles.strikethrough]} numberOfLines={3}>
        {text}
      </Text>
    </Pressable>
  );
}

function StepRow({ index, text }: { index: number; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Pressable
      style={[styles.stepRow, done && styles.stepDone]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setDone((v) => !v);
      }}
    >
      <View style={[styles.stepNum, done && styles.stepNumDone]}>
        <Text style={[styles.stepNumText, done && styles.stepNumTextDone]}>
          {done ? '✓' : index + 1}
        </Text>
      </View>
      <Text style={[styles.stepText, done && styles.strikethrough]}>{text}</Text>
    </Pressable>
  );
}

export default function RecipeDetailView({ recipe, onSave, isSaved }: Props) {
  const handleShare = async () => {
    try {
      await Share.share({
        message: `${recipe.title}\n${recipe.sourceUrl ?? ''}`,
        title: recipe.title,
      });
    } catch {}
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {recipe.image && (
        <Image
          source={{ uri: recipe.image }}
          style={styles.hero}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
        />
      )}

      <View style={styles.body}>
        {/* Title */}
        <Text style={styles.title}>{recipe.title}</Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {recipe.totalTime && (
            <View style={styles.metaChip}>
              <Text style={styles.metaIcon}>⏱</Text>
              <Text style={styles.metaText}>{recipe.totalTime}</Text>
            </View>
          )}
          {recipe.servings && (
            <View style={styles.metaChip}>
              <Text style={styles.metaIcon}>👥</Text>
              <Text style={styles.metaText}>{recipe.servings} מנות</Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.saveBtn, isSaved && styles.savedBtn]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onSave?.();
            }}
          >
            <Text style={[styles.actionBtnText, isSaved && styles.savedBtnText]}>
              {isSaved ? '✓ שמור' : '+ שמור מתכון'}
            </Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.shareBtn]} onPress={handleShare}>
            <Text style={styles.shareBtnText}>שתף</Text>
          </Pressable>
        </View>

        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>מצרכים</Text>
            <View style={styles.sectionCard}>
              {recipe.ingredients.map((ing, i) => (
                <IngredientRow key={i} text={ing} />
              ))}
            </View>
          </View>
        )}

        {/* Steps */}
        {recipe.steps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>אופן הכנה</Text>
            {recipe.steps.map((step, i) => (
              <StepRow key={i} index={i} text={step} />
            ))}
          </View>
        )}

        {recipe.sourceUrl && (
          <Text style={styles.source} numberOfLines={1}>
            מקור: {recipe.sourceUrl}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },
  hero: { width: '100%', height: 260 },
  body: { padding: 16 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 34,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 16,
  },
  metaChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
    ...SHADOW.card,
  },
  metaIcon: { fontSize: 14 },
  metaText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: COLORS.primaryBlue,
    ...SHADOW.button,
  },
  savedBtn: {
    backgroundColor: '#E8F0FE',
    shadowOpacity: 0,
    elevation: 0,
  },
  actionBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: '#FFF',
  },
  savedBtnText: { color: COLORS.primaryBlue },
  shareBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    flex: 0,
    paddingHorizontal: 20,
  },
  shareBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  ingredientRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  ingredientChecked: { backgroundColor: '#F8FFF8' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  checkMark: { fontSize: 12, color: '#FFF', fontWeight: '700' },
  ingredientText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  stepRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    ...SHADOW.card,
  },
  stepDone: { opacity: 0.6 },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumDone: { backgroundColor: '#22C55E' },
  stepNumText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFF',
  },
  stepNumTextDone: {},
  stepText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 23,
  },
  source: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
});
