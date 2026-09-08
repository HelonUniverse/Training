import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Service } from '@/data/types';
import { formatDuration, formatPrice } from '@/lib/format';
import * as haptics from '@/lib/haptics';
import { colors, fonts, radius } from '@/theme';

interface Props {
  service: Service;
  onPress: () => void;
  selected?: boolean;
  guideName?: string;
}

export function ServiceCard({ service, onPress, selected, guideName }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`Servicio: ${service.name}`}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.tags}>
          <Text style={styles.format}>{service.format}</Text>
          <View style={styles.dot} />
          <Text style={styles.modality}>{service.modality}</Text>
        </View>
        {selected ? <Feather name="check-circle" size={17} color={colors.glow} /> : null}
      </View>

      <Text style={styles.name}>{service.name}</Text>
      {guideName ? <Text style={styles.guide}>con {guideName}</Text> : null}
      <Text style={styles.description} numberOfLines={3}>
        {service.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.metaRow}>
          <Feather name="clock" size={12} color={colors.textMuted} />
          <Text style={styles.meta}>{formatDuration(service.durationMinutes)}</Text>
        </View>
        <Text style={styles.price}>{formatPrice(service.price, service.currency)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: {
    borderColor: colors.borderGlow,
    backgroundColor: colors.glowSoft,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  format: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.cyan,
  },
  modality: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },
  name: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    lineHeight: 25,
    color: colors.text,
  },
  guide: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textMuted },
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSoft,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  price: {
    fontFamily: fonts.displaySemi,
    fontSize: 19,
    color: colors.glow,
    letterSpacing: 0.3,
  },
});
