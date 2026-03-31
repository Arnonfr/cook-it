import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, RADIUS } from '../lib/constants';

function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          backgroundColor: COLORS.skeleton,
          borderRadius: RADIUS.sm,
          opacity,
        },
        style,
      ]}
    />
  );
}

export default function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonBox width="100%" height={160} style={{ borderRadius: RADIUS.md }} />
      <View style={styles.content}>
        <SkeletonBox width="75%" height={18} />
        <View style={{ height: 6 }} />
        <SkeletonBox width="50%" height={14} />
        <View style={{ height: 10 }} />
        <View style={styles.row}>
          <SkeletonBox width={60} height={24} style={{ borderRadius: RADIUS.full }} />
          <SkeletonBox width={60} height={24} style={{ borderRadius: RADIUS.full }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  content: {
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
});
