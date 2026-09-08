import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import * as haptics from '@/lib/haptics';
import { colors, radius, shadows } from '@/theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  /** Añade el velo de degradado cyan interior. */
  glow?: boolean;
  accent?: 'default' | 'gold';
  padding?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Tarjeta oscura con borde fino: la unidad base del diseño aprobado. */
export function Card({
  children,
  onPress,
  glow = false,
  accent = 'default',
  padding = 18,
  style,
  accessibilityLabel,
}: Props) {
  const body = (
    <>
      {glow ? (
        <LinearGradient
          colors={
            accent === 'gold'
              ? ['rgba(231,194,125,0.12)', 'rgba(255,255,255,0.02)']
              : ['rgba(111,216,230,0.10)', 'rgba(255,255,255,0.015)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={{ padding }}>{children}</View>
    </>
  );

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    accent === 'gold' && styles.gold,
    shadows.soft,
    style,
  ];

  if (!onPress) return <View style={cardStyle}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        cardStyle,
        pressed && { opacity: 0.9, transform: [{ scale: 0.992 }] },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  gold: { borderColor: colors.borderGold },
});
