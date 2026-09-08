import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as haptics from '@/lib/haptics';
import { colors, fonts, gradients, tabBarHeight } from '@/theme';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  hoy: 'sun',
  explorar: 'compass',
  'en-vivo': 'radio',
  'la-red': 'globe',
  'mi-camino': 'map',
};

const LABELS: Record<string, string> = {
  hoy: 'Hoy',
  explorar: 'Explorar',
  'en-vivo': 'En Vivo',
  'la-red': 'La Red',
  'mi-camino': 'Mi Camino',
};

/**
 * Barra inferior de cinco destinos, con vidrio esmerilado, hairline
 * superior en cyan y punto dorado sobre el destino activo.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom || 10 }]}>
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFill, styles.webFallback]} />
      ) : (
        <BlurView intensity={38} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={gradients.tabBar} style={StyleSheet.absoluteFill} />
      <View style={styles.hairline} />

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icon = ICONS[route.name] ?? 'circle';
          const label = LABELS[route.name] ?? route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                haptics.select();
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={styles.item}
            >
              <Feather
                name={icon}
                size={19}
                color={focused ? colors.cyan : 'rgba(198,218,232,0.42)'}
              />
              <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
                {label}
              </Text>
              <View style={[styles.pip, focused && styles.pipActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  webFallback: { backgroundColor: 'rgba(4,7,15,0.94)' },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    height: tabBarHeight,
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 6,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    color: 'rgba(198,218,232,0.45)',
  },
  labelActive: { color: colors.text },
  pip: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  pipActive: { backgroundColor: colors.gold },
});
