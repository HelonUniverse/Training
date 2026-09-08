import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { imageSource } from '@/data/images';
import { Circle } from '@/data/types';
import * as haptics from '@/lib/haptics';
import { colors, fonts, gradients, radius, shadows } from '@/theme';

interface Props {
  circle: Circle;
  guideName: string;
  joined?: boolean;
  onPress: () => void;
}

export function CircleCard({ circle, guideName, joined, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${circle.name}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, shadows.soft, pressed && { opacity: 0.9 }]}
    >
      <Image
        source={imageSource(circle.image)}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={400}
      />
      <LinearGradient colors={gradients.scrim} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

      {joined ? (
        <View style={styles.joined}>
          <Feather name="check" size={11} color={colors.glow} />
          <Text style={styles.joinedText}>Perteneces</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <Text style={styles.name}>{circle.name}</Text>
        <Text style={styles.intention} numberOfLines={2}>
          {circle.intention}
        </Text>
        <View style={styles.metaRow}>
          <Feather name="users" size={11} color={colors.textMuted} />
          <Text style={styles.meta}>{circle.members} miembros</Text>
          <View style={styles.dot} />
          <Text style={styles.meta}>{guideName}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 196,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.nightSoft,
    justifyContent: 'flex-end',
  },
  joined: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(3,8,20,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderGlow,
  },
  joinedText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.glow,
  },
  body: { padding: 18 },
  name: {
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: 30,
    color: colors.text,
  },
  intention: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textSoft,
    marginTop: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  meta: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted, marginHorizontal: 2 },
});
