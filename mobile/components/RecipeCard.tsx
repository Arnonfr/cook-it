import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  I18nManager,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, RADIUS, SHADOW } from '../lib/constants';
import type { SearchResult } from '../lib/api';

I18nManager.forceRTL(true);

interface Props {
  item: SearchResult;
  onPress: (item: SearchResult) => void;
  onPressIn?: (item: SearchResult) => void;
}

const PLACEHOLDER_HASH = 'LGFFaXYk^6#M@-5c,1J5@[or[Q6.';

function TimeTag({ value }: { value: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>⏱ {value}</Text>
    </View>
  );
}

function SourceTag({ value }: { value: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: COLORS.background }]}>
      <Text style={styles.tagText}>{value}</Text>
    </View>
  );
}

export default function RecipeCard({ item, onPress, onPressIn }: Props) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(item);
  }, [item, onPress]);

  const handlePressIn = useCallback(() => {
    onPressIn?.(item);
  }, [item, onPressIn]);

  const source = item.source
    ? item.source
    : item.url
    ? (() => {
        try {
          return new URL(item.url).hostname.replace('www.', '');
        } catch {
          return '';
        }
      })()
    : '';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      android_ripple={{ color: 'rgba(35, 110, 255, 0.08)', borderless: false }}
    >
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={styles.image}
          contentFit="cover"
          placeholder={PLACEHOLDER_HASH}
          transition={200}
          cachePolicy="memory-disk"
        />
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2} textBreakStrategy="highQuality">
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.tags}>
          {item.totalTime && <TimeTag value={item.totalTime} />}
          {source ? <SourceTag value={source} /> : null}
        </View>
        {item.ingredientsPreview && item.ingredientsPreview.length > 0 && (
          <Text style={styles.ingredients} numberOfLines={1}>
            {item.ingredientsPreview.slice(0, 4).join(' · ')}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: 12,
    ...SHADOW.card,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  image: {
    width: '100%',
    height: 180,
  },
  content: {
    padding: 14,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 24,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 19,
  },
  tags: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: '#EEF3FF',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primaryBlue,
  },
  ingredients: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
