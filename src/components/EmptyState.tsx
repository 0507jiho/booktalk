import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  icon?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
};

export default function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: Props) {
  return (
    <View style={styles.container}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={40} color="#9BA5E0" />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {ctaLabel && onCta ? (
        <TouchableOpacity style={styles.ctaBtn} onPress={onCta} activeOpacity={0.8}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 80,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECEFFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#424242', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#767676', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  ctaBtn: {
    backgroundColor: '#3D4DC4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
