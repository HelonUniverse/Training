import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { imageSource } from '@/data/images';
import { LiveEvent } from '@/data/types';
import * as haptics from '@/lib/haptics';
import { colors, fonts, gradients, radius, shadows } from '@/theme';

interface Props {
  event: LiveEvent;
  guideName: string;
  onPress?: () => void;
  variant?: 'wide' | 'compact';
}

export function LiveStatus({ status }: { status: LiveEvent['status'] }) {
  if (status === 'live') {
    return (
      <View style={[styles.status, styles.statusLive]}>
        <View style={styles.liveDot} />
        <Text style={[styles.statusText, { color: colors.live }]}>En vivo</Text>
      </View>
    );
  }
  const label = status === 'soon' ? 'Empieza pronto' : 'Programado';
  return (
    <View style={styles.status}>
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

export function LiveEventCard({ event, guideName, onPress, variant = 'wide' }: Props) {
  const compact = variant === 'compact';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Evento: ${event.title}`}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.card,
        shadows.soft,
        compact ? styles.compact : styles.wide,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <Image
        source={imageSource(event.image)}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={400}
      />
      <LinearGradient colors={gradients.scrim} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />

      <View style={styles.top}>
        <LiveStatus status={event.status} />
        <View style={styles.attendees}>
          <Feather name="users" size={11} color={colors.textSoft} />
          <Text style={styles.attendeesText}>{event.attendees}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.time}>{event.startsAt}</Text>
        <Text style={[styles.title, compact && { fontSize: 20, lineHeight: 25 }]} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.guide}>con {guideName}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.nightSoft,
    justifyContent: 'space-between',
  },
  wide: { height: 210 },
  compact: { height: 178 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  body: { paddingHorizontal: 18, paddingBottom: 18 },
  time: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.glow,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 29,
    color: colors.text,
  },
  guide: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 7,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(3,8,20,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
  },
  statusLive: { borderColor: 'rgba(255,107,107,0.5)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live },
  statusText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textSoft,
  },
  attendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(3,8,20,0.55)',
  },
  attendeesText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textSoft,
  },
});
