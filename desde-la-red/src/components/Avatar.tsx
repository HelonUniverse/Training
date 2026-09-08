import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, fonts } from '@/theme';

type Accent = 'cyan' | 'glow' | 'electric';

const ACCENTS: Record<Accent, readonly [string, string]> = {
  cyan: ['#6FD8E6', '#1F6E86'],
  glow: ['#DCF4FF', '#4FC9F8'],
  electric: ['#7FB4FF', '#1348A8'],
};

interface Props {
  initials: string;
  size?: number;
  accent?: Accent;
  ring?: boolean;
  style?: ViewStyle;
}

/** Avatar con degradado cósmico y anillo fino dorado/cyan. */
export function Avatar({ initials, size = 44, accent = 'cyan', ring = true, style }: Props) {
  const inner = size - (ring ? 4 : 0);
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          padding: ring ? 2 : 0,
          borderWidth: ring ? StyleSheet.hairlineWidth : 0,
          borderColor: accent === 'glow' ? colors.borderGlow : colors.border,
        },
        styles.center,
        style,
      ]}
    >
      <LinearGradient
        colors={ACCENTS[accent]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.center, { width: inner, height: inner, borderRadius: inner / 2 }]}
      >
        <Text
          style={{
            fontFamily: fonts.bodySemi,
            fontSize: inner * 0.36,
            letterSpacing: 0.5,
            color: '#03101E',
          }}
        >
          {initials}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
