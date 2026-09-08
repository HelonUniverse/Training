import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { imageSource } from '@/data/images';
import { Teaching } from '@/data/types';
import * as haptics from '@/lib/haptics';
import { colors, fonts, gradients, radius, shadows, type } from '@/theme';

interface Props {
  teaching: Teaching;
  onPress: () => void;
  /** `tall` = tarjeta vertical para carrusel; `row` = lista. */
  variant?: 'tall' | 'row';
  width?: number;
  saved?: boolean;
  read?: boolean;
}

export function TeachingCard({ teaching, onPress, variant = 'tall', width = 210, saved, read }: Props) {
  const handlePress = () => {
    haptics.tap();
    onPress();
  };

  if (variant === 'row') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir enseñanza: ${teaching.title}`}
        onPress={handlePress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.rowThumb}>
          <Image
            source={imageSource(teaching.image)}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={320}
          />
          <LinearGradient colors={gradients.scrimSoft} style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowOverline}>{teaching.theme}</Text>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {teaching.title}
          </Text>
          <View style={styles.metaRow}>
            <Feather name="clock" size={10.5} color={colors.textMuted} />
            <Text style={styles.meta}>{teaching.readMinutes} min</Text>
            {read ? (
              <>
                <View style={styles.metaDot} />
                <Text style={[styles.meta, { color: colors.success }]}>Leída</Text>
              </>
            ) : null}
          </View>
        </View>
        {saved ? <Feather name="bookmark" size={15} color={colors.glow} /> : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir enseñanza: ${teaching.title}`}
      onPress={handlePress}
      style={({ pressed }) => [styles.tall, shadows.soft, { width }, pressed && styles.pressed]}
    >
      <Image
        source={imageSource(teaching.image)}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={400}
      />
      <LinearGradient colors={gradients.scrim} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.tallTop}>
        <Text style={styles.tallOverline}>{teaching.theme}</Text>
        {saved ? <Feather name="bookmark" size={14} color={colors.glow} /> : null}
      </View>
      <View style={styles.tallBody}>
        <Text style={styles.tallTitle} numberOfLines={3}>
          {teaching.title}
        </Text>
        <View style={styles.metaRow}>
          <Feather name="clock" size={10.5} color={colors.textMuted} />
          <Text style={styles.meta}>{teaching.readMinutes} min</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },

  tall: {
    height: 268,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.nightSoft,
    justifyContent: 'space-between',
  },
  tallTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  tallOverline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.cyan,
  },
  tallBody: { paddingHorizontal: 15, paddingBottom: 16 },
  tallTitle: {
    ...type.cardTitle,
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 25,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  rowThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.nightSoft,
  },
  rowBody: { flex: 1, gap: 5 },
  rowOverline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.cyan,
  },
  rowTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 17,
    lineHeight: 22,
    color: colors.text,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  meta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },
});
