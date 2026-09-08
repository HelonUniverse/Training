import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { formatDuration, formatPrice, timeSlots, upcomingDays } from '@/lib/format';
import * as haptics from '@/lib/haptics';
import { useContent } from '@/store/content';
import { useApp } from '@/store/app-store';
import { colors, fonts, glowText, radius, screenPadding, spacing } from '@/theme';

/** Pantalla 12 — Reserva. */
export default function ReservaScreen() {
  const { findGuide, findService } = useContent();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { addBooking } = useApp();

  const service = findService(serviceId);
  const guide = findGuide(service?.guideId);

  const days = useMemo(() => upcomingDays(14), []);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  if (!service || !guide) {
    return (
      <Screen header={<ScreenHeader title="Reserva" />}>
        <Text style={styles.empty}>Este servicio ya no está disponible.</Text>
      </Screen>
    );
  }

  const selectedDay = days.find((d) => d.key === day);
  const ready = !!day && !!time;

  const confirm = () => {
    if (!ready || !selectedDay || !time) return;
    addBooking({
      serviceId: service.id,
      guideId: guide.id,
      date: selectedDay.full,
      time,
      note: note.trim() || undefined,
    });
    haptics.success();
    setConfirmed(true);
    toast({ text: 'Reserva demo creada', icon: 'check' });
  };

  if (confirmed) {
    return (
      <Screen header={<ScreenHeader title="Reserva confirmada" />}>
        <View style={styles.doneWrap}>
          <View style={styles.doneMark}>
            <Feather name="check" size={26} color={colors.glow} />
          </View>
          <Text style={styles.doneTitle}>Tu lugar está reservado</Text>
          <Text style={styles.doneBody}>
            {service.name} con {guide.name}
            {'\n'}
            {selectedDay?.full} · {time}
          </Text>

          <Card glow accent="glow" style={{ marginTop: spacing.xxl, alignSelf: 'stretch' }}>
            <Text style={styles.doneNoteLabel}>Modo demo</Text>
            <Text style={styles.doneNote}>
              La reserva quedó guardada en este dispositivo. La verás en Mi Camino.
            </Text>
          </Card>

          <View style={styles.doneActions}>
            <Button
              label="Ver en Mi Camino"
              icon="map"
              full
              size="lg"
              onPress={() => router.replace('/(tabs)/mi-camino')}
            />
            <Button
              label="Volver al perfil"
              variant="outline"
              full
              onPress={() => router.replace(`/guias/${guide.id}`)}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false} header={<ScreenHeader title="Reservar" subtitle={service.name} />}>
      {/* Resumen del servicio */}
      <View style={styles.section}>
        <Card glow>
          <View style={styles.summaryRow}>
            <Avatar initials={guide.initials} accent={guide.accent} size={52} />
            <View style={styles.summaryBody}>
              <Text style={styles.summaryName}>{service.name}</Text>
              <Text style={styles.summaryGuide}>con {guide.name}</Text>
            </View>
          </View>
          <View style={styles.summaryMeta}>
            <Meta icon="clock" text={formatDuration(service.durationMinutes)} />
            <Meta icon="map-pin" text={service.modality} />
            <Meta icon="tag" text={formatPrice(service.price, service.currency)} strong />
          </View>
          <Text style={styles.summaryDescription}>{service.description}</Text>
          <View style={styles.includes}>
            {service.includes.map((item) => (
              <View key={item} style={styles.includeRow}>
                <Feather name="check" size={12} color={colors.cyan} />
                <Text style={styles.includeText}>{item}</Text>
              </View>
            ))}
          </View>
        </Card>
      </View>

      {/* Fecha */}
      <View style={styles.section}>
        <Text style={styles.stepLabel}>Paso 1 · Elige el día</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayRow}
      >
        {days.map((d) => {
          const active = day === d.key;
          return (
            <Pressable
              key={d.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={d.full}
              onPress={() => {
                haptics.select();
                setDay(d.key);
              }}
              style={({ pressed }) => [
                styles.day,
                active && styles.dayActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.dayWeekday, active && styles.dayTextActive]}>{d.weekday}</Text>
              <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{d.day}</Text>
              <Text style={[styles.dayMonth, active && styles.dayTextActive]}>{d.month}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Hora */}
      <View style={styles.section}>
        <Text style={styles.stepLabel}>Paso 2 · Elige la hora</Text>
        <View style={styles.timeGrid}>
          {timeSlots.map((slot) => {
            const active = time === slot;
            return (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  haptics.select();
                  setTime(slot);
                }}
                style={({ pressed }) => [
                  styles.time,
                  active && styles.timeActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.timeText, active && styles.timeTextActive]}>{slot}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Nota */}
      <View style={styles.section}>
        <Text style={styles.stepLabel}>Paso 3 · ¿Algo que deba saber?</Text>
        <View style={styles.noteBox}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Opcional: cuéntale brevemente qué te trae."
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.noteInput}
            accessibilityLabel="Nota para la guía"
          />
        </View>
      </View>

      {/* Confirmar */}
      <View style={styles.section}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(service.price, service.currency)}</Text>
        </View>
        <Button
          label={ready ? 'Confirmar reserva' : 'Elige día y hora'}
          icon="calendar"
          full
          size="lg"
          disabled={!ready}
          onPress={confirm}
        />
        <Text style={styles.legal}>
          Modo demo · no se procesa ningún pago
        </Text>
      </View>
    </Screen>
  );
}

function Meta({
  icon,
  text,
  strong,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.metaItem}>
      <Feather name={icon} size={12} color={strong ? colors.glow : colors.textMuted} />
      <Text style={[styles.metaText, strong && { color: colors.glow }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: screenPadding, marginBottom: spacing.xxl },

  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryBody: { flex: 1, gap: 4 },
  summaryName: {
    ...glowText,
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 29,
    color: colors.text,
  },
  summaryGuide: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted },
  summaryMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.textMuted },
  summaryDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSoft,
    marginTop: spacing.lg,
  },
  includes: { gap: 8, marginTop: spacing.lg },
  includeRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  includeText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textSoft },

  stepLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.cyan,
    marginBottom: spacing.lg,
  },

  dayRow: {
    paddingHorizontal: screenPadding,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  day: {
    width: 66,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  dayActive: { borderColor: colors.borderGlow, backgroundColor: colors.glowSoft },
  dayWeekday: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  dayNumber: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  dayMonth: { fontFamily: fonts.body, fontSize: 10.5, color: colors.textMuted },
  dayTextActive: { color: colors.glow },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  time: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  timeActive: { borderColor: 'rgba(111,216,230,0.55)', backgroundColor: colors.cyanGlow },
  timeText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSoft },
  timeTextActive: { color: colors.cyan },

  noteBox: {
    minHeight: 100,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  noteInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
    textAlignVertical: 'top',
    padding: 0,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
  },
  totalLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  totalValue: { fontFamily: fonts.display, fontSize: 28, color: colors.glow },
  legal: {
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.lg,
  },

  doneWrap: { alignItems: 'center', paddingTop: spacing.xxxl },
  doneMark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderGlow,
    backgroundColor: colors.glowSoft,
    marginBottom: spacing.xxl,
  },
  doneTitle: {
    ...glowText,
    fontFamily: fonts.displayLight,
    fontSize: 34,
    lineHeight: 40,
    color: colors.text,
    textAlign: 'center',
  },
  doneBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSoft,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  doneNoteLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.glow,
    marginBottom: 8,
  },
  doneNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSoft,
  },
  doneActions: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.xxl },

  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
});
