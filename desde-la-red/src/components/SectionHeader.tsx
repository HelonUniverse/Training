import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import * as haptics from '@/lib/haptics';
import { colors, fonts, spacing, type } from '@/theme';

interface Props {
  overline?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

export function SectionHeader({ overline, title, actionLabel, onAction, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.left}>
        {overline ? <Text style={type.overline}>{overline}</Text> : null}
        <Text style={[type.sectionTitle, overline ? styles.titleSpaced : null]}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.tap();
            onAction();
          }}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
          hitSlop={10}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <Feather name="arrow-up-right" size={13} color={colors.cyan} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  left: { flex: 1 },
  titleSpaced: { marginTop: 7 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 3 },
  actionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    letterSpacing: 0.3,
    color: colors.cyan,
  },
});
