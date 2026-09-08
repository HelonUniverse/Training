import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import * as haptics from '@/lib/haptics';
import { colors, fonts, radius } from '@/theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

/** Píldora de filtro / etiqueta. */
export function Chip({ label, selected, onPress, size = 'md' }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      disabled={!onPress}
      onPress={() => {
        haptics.select();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        selected && styles.selected,
        pressed && onPress ? { opacity: 0.7 } : null,
      ]}
    >
      <Text
        style={[styles.label, size === 'sm' && styles.labelSm, selected && styles.labelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  sm: { paddingHorizontal: 11, paddingVertical: 6 },
  selected: {
    borderColor: 'rgba(111,216,230,0.55)',
    backgroundColor: colors.cyanGlow,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    letterSpacing: 0.3,
    color: colors.textSoft,
  },
  labelSm: { fontSize: 11, letterSpacing: 0.4 },
  labelSelected: { color: colors.cyan },
});
