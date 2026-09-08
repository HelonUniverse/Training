import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as haptics from '@/lib/haptics';
import { colors, fonts, screenPadding } from '@/theme';

interface Props {
  title?: string;
  subtitle?: string;
  /** Acción a la derecha del encabezado. */
  action?: {
    icon: keyof typeof Feather.glyphMap;
    onPress: () => void;
    active?: boolean;
    label: string;
  };
  transparent?: boolean;
  onBack?: () => void;
}

/** Encabezado de pantallas apiladas: volver + título + acción. */
export function ScreenHeader({ title, subtitle, action, transparent, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      {!transparent ? (
        <LinearGradient
          colors={['rgba(4,7,15,0.95)', 'rgba(4,7,15,0.0)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => {
            haptics.tap();
            if (onBack) onBack();
            else if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/hoy');
          }}
          hitSlop={12}
          style={({ pressed }) => [styles.circle, pressed && { opacity: 0.65 }]}
        >
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>

        <View style={styles.titleBox}>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              haptics.tap();
              action.onPress();
            }}
            hitSlop={12}
            style={({ pressed }) => [
              styles.circle,
              action.active && styles.circleActive,
              pressed && { opacity: 0.65 },
            ]}
          >
            <Feather
              name={action.icon}
              size={17}
              color={action.active ? colors.gold : colors.text}
            />
          </Pressable>
        ) : (
          <View style={styles.circlePlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: screenPadding,
    paddingBottom: 10,
    zIndex: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: 'rgba(8,19,38,0.65)',
  },
  circleActive: { borderColor: colors.borderGold, backgroundColor: colors.goldGlow },
  circlePlaceholder: { width: 40, height: 40 },
  titleBox: { flex: 1, alignItems: 'center' },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textSoft,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
});
