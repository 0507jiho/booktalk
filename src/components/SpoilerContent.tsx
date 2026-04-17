import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  children: React.ReactNode;
  hasSpoiler?: boolean;
};

export default function SpoilerContent({ children, hasSpoiler }: Props) {
  const [revealed, setRevealed] = useState(false);

  if (!hasSpoiler || revealed) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.hidden}>{children}</View>
      <TouchableOpacity style={styles.overlay} onPress={() => setRevealed(true)} activeOpacity={0.85}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.label}>스포일러 포함</Text>
        <Text style={styles.hint}>탭하여 보기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  hidden: { opacity: 0 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  icon: { fontSize: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#fff' },
  hint: { fontSize: 12, color: '#ccc' },
});
