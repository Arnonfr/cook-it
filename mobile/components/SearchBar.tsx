import React, { useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
  Animated,
  Platform,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../lib/constants';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder = 'חפש מתכון...',
  autoFocus = false,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = useCallback(() => {
    Animated.spring(focusAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 200,
      friction: 20,
    }).start();
  }, [focusAnim]);

  const handleBlur = useCallback(() => {
    Animated.spring(focusAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 200,
      friction: 20,
    }).start();
  }, [focusAnim]);

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.primaryBlue],
  });

  const shadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor,
          shadowOpacity,
          shadowColor: COLORS.primaryBlue,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: 4,
        },
      ]}
    >
      {/* Search icon (right side = start in RTL) */}
      <Text style={styles.icon}>🔍</Text>

      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit(value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        returnKeyType="search"
        textAlign="right"
        textAlignVertical="center"
        writingDirection="rtl"
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
      />

      {value.length > 0 && (
        <Pressable
          style={styles.clearBtn}
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.clearIcon}>✕</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
    ...SHADOW.card,
  },
  icon: {
    fontSize: 18,
    marginStart: 4,
    color: COLORS.textSecondary,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 0,
    height: '100%',
    textAlignVertical: 'center',
    writingDirection: 'rtl',
  },
  clearBtn: {
    padding: 4,
    marginEnd: 2,
  },
  clearIcon: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
