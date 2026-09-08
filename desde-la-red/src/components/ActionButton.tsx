import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import * as haptics from '@/lib/haptics';
import { colors, fonts, radius } from '@/theme';

interface Props {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  active?: boolean;
  /** El botón se estira para repartir el ancho con sus hermanos. */
  flex?: boolean;
}

/**
 * Acción secundaria de la enseñanza del día: Escuchar / Guardar / Compartir.
 * Tarjeta oscura con borde fino que se tiñe de dorado al activarse.
 */
export function ActionButton({ icon, label, onPress, active, flex = true }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        flex && styles.flex,
        active && styles.active,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        <Feather
          name={icon}
          size={15}
          color={active ? colors.gold : colors.cyan}
        />
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  active: {
    borderColor: colors.borderGold,
    backgroundColor: colors.goldGlow,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    letterSpacing: 0.2,
    color: colors.textSoft,
  },
  labelActive: { color: colors.gold },
});
