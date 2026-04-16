import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, StyleProp, ViewStyle } from 'react-native';

type Props = {
  style?: StyleProp<ViewStyle>;
  height?: number;
  borderRadius?: number;
};

function SkeletonBlock({ style, height = 16, borderRadius = 4 }: Props) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        { height, borderRadius, backgroundColor: '#E0E0E0', opacity },
        style,
      ]}
    />
  );
}

export default function SkeletonCard() {
  return (
    <View style={styles.card}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <SkeletonBlock height={28} borderRadius={14} style={styles.avatar} />
        <SkeletonBlock height={14} style={styles.authorName} />
        <SkeletonBlock height={12} style={styles.date} />
      </View>
      {/* Book mini */}
      <SkeletonBlock height={44} borderRadius={6} style={styles.bookMini} />
      {/* Badge + rating */}
      <View style={styles.metaRow}>
        <SkeletonBlock height={20} borderRadius={4} style={styles.badge} />
        <SkeletonBlock height={14} style={styles.rating} />
      </View>
      {/* Content lines */}
      <SkeletonBlock height={14} style={styles.line} />
      <SkeletonBlock height={14} style={[styles.line, { width: '75%' }]} />
      <SkeletonBlock height={14} style={[styles.line, { width: '55%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 10,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  authorName: { flex: 1 },
  date: { width: 40 },
  bookMini: { width: '100%' },
  metaRow: { flexDirection: 'row', gap: 8 },
  badge: { width: 50 },
  rating: { width: 80 },
  line: { width: '100%' },
});
