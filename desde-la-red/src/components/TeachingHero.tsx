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
  guideName: string;
  onPress: () => void;
}

/**
 * Pieza central de la pantalla Hoy: imagen cinematográfica a sangre,
 * degradado profundo y título en serif sobre la imagen.
 */
export function TeachingHero({ teaching, guideName, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir enseñanza: ${teaching.title}`}
      onPress={() => {
        haptics.press();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        shadows.lifted,
        pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
      ]}
    >
      <Image
        source={imageSource(teaching.image)}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={500}
      />
      <LinearGradient colors={gradients.scrim} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />

      <View style={styles.topRow}>
        <View style={styles.badge}>
          <View style={styles.dot} />
          <Text style={styles.badgeText}>Enseñanza de hoy</Text>
        </View>
        <View style={styles.themePill}>
          <Text style={styles.themeText}>{teaching.theme}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={3}>
          {teaching.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {teaching.subtitle}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{guideName}</Text>
          <View style={styles.metaDot} />
          <Feather name="book-open" size={11} color={colors.textMuted} />
          <Text style={styles.meta}>{teaching.readMinutes} min de lectura</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 430,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    justifyContent: 'space-between',
    backgroundColor: colors.nightSoft,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(4,7,15,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderGold,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  themePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(4,7,15,0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  themeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.cyan,
  },
  body: { paddingHorizontal: 22, paddingBottom: 24 },
  title: {
    ...type.display,
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 42,
  },
  subtitle: {
    ...type.body,
    marginTop: 10,
    color: 'rgba(226,240,247,0.78)',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  meta: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    letterSpacing: 0.3,
    color: colors.textMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
});
