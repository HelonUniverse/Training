import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import * as haptics from '@/lib/haptics';
import { colors, gradients, radius, shadows, type } from '@/theme';

type Variant = 'gold' | 'cyan' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Feather.glyphMap;
  iconRight?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}

const HEIGHTS: Record<Size, number> = { sm: 38, md: 48, lg: 56 };

export function Button({
  label,
  onPress,
  variant = 'gold',
  size = 'md',
  icon,
  iconRight,
  disabled,
  loading,
  full,
  style,
}: Props) {
  const height = HEIGHTS[size];
  const filled = variant === 'gold' || variant === 'cyan';
  const textColor = filled ? '#06101A' : variant === 'outline' ? colors.text : colors.cyan;
  const iconSize = size === 'sm' ? 14 : 16;

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={iconSize} color={textColor} /> : null}
          <Text
            style={[
              type.button,
              { color: textColor, fontSize: size === 'sm' ? 12.5 : 14 },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconRight ? <Feather name={iconRight} size={iconSize} color={textColor} /> : null}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => {
        haptics.press();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          paddingHorizontal: size === 'sm' ? 16 : 24,
          borderRadius: radius.pill,
          opacity: disabled ? 0.42 : pressed ? 0.86 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        full && styles.full,
        filled && shadows.soft,
        !filled && styles.unfilled,
        variant === 'outline' && styles.outline,
        style,
      ]}
    >
      {filled ? (
        <LinearGradient
          colors={variant === 'gold' ? gradients.gold : gradients.cyan}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  full: { alignSelf: 'stretch' },
  unfilled: { backgroundColor: 'transparent' },
  outline: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
