import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CosmicBackground } from '@/components/CosmicBackground';
import { SectionHeader } from '@/components/SectionHeader';
import { useToast } from '@/components/Toast';
import * as haptics from '@/lib/haptics';
import { useContent } from '@/store/content';
import { useApp } from '@/store/app-store';
import { colors, fonts, glowText, radius, screenPadding, spacing, tabBarHeight } from '@/theme';

/** Pantalla 13 — Mi Camino. */
export default function MiCaminoScreen() {
  const { findGuide, findService, pathQuestions, teachings } = useContent();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { state, setPathAnswer, savePath, resetPath, cancelBooking } = useApp();

  const answered = useMemo(
    () => pathQuestions.filter((q) => (state.pathAnswers[q.id] ?? []).length > 0).length,
    [pathQuestions, state.pathAnswers],
  );
  const progress = answered / pathQuestions.length;
  const complete = answered === pathQuestions.length;

  const savedList = useMemo(
    () => teachings.filter((t) => state.savedTeachings.includes(t.id)),
    [teachings, state.savedTeachings],
  );

  return (
    <CosmicBackground image="bg-path" intensity={0.2}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: tabBarHeight + insets.bottom + 34,
        }}
      >
        <View style={styles.head}>
          <Text style={styles.overline}>Mi Camino</Text>
          <Text style={styles.title}>Diseña tu{'\n'}práctica</Text>
          <Text style={styles.lead}>
            Cuatro preguntas para que la Red sepa acompañarte. Puedes cambiarlas cuando quieras.
          </Text>
        </View>

        {/* Progreso */}
        <View style={styles.section}>
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>
                {answered} de {pathQuestions.length} respondidas
              </Text>
              {state.pathSavedAt ? (
                <View style={styles.savedTag}>
                  <Feather name="check" size={11} color={colors.glow} />
                  <Text style={styles.savedTagText}>Guardado</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </View>
        </View>

        {/* Preguntas */}
        {pathQuestions.map((question) => {
          const selected = state.pathAnswers[question.id] ?? [];
          return (
            <View key={question.id} style={styles.section}>
              <Text style={styles.question}>{question.prompt}</Text>
              <Text style={styles.helper}>{question.helper}</Text>
              <View style={styles.options}>
                {question.options.map((option) => {
                  const active = selected.includes(option.id);
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        haptics.select();
                        setPathAnswer(question.id, option.id, question.multiple);
                      }}
                      style={({ pressed }) => [
                        styles.option,
                        active && styles.optionActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <View style={styles.optionBody}>
                        <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                          {option.label}
                        </Text>
                        <Text style={styles.optionDescription}>{option.description}</Text>
                      </View>
                      <View style={[styles.check, active && styles.checkActive]}>
                        {active ? <Feather name="check" size={12} color="#06101A" /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.section}>
          <Button
            label={complete ? 'Guardar Mi Camino' : `Faltan ${pathQuestions.length - answered}`}
            icon="save"
            full
            size="lg"
            disabled={!complete}
            onPress={() => {
              savePath();
              haptics.success();
              toast({ text: 'Mi Camino guardado en este dispositivo', icon: 'check' });
            }}
          />
          {state.pathSavedAt ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                resetPath();
                toast({ text: 'Camino reiniciado', icon: 'refresh-ccw' });
              }}
              style={({ pressed }) => [styles.reset, pressed && { opacity: 0.6 }]}
            >
              <Feather name="refresh-ccw" size={13} color={colors.textMuted} />
              <Text style={styles.resetText}>Empezar de nuevo</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Reservas */}
        <View style={styles.section}>
          <SectionHeader
            overline="Reservas"
            title="Tus encuentros"
            actionLabel="Ver guías"
            onAction={() => router.push('/guias')}
          />
        </View>
        <View style={styles.sectionList}>
          {state.bookings.length === 0 ? (
            <Card>
              <Text style={styles.emptyTitle}>Todavía no has reservado</Text>
              <Text style={styles.emptyBody}>
                Elige una guía, mira sus servicios y reserva un encuentro en modo demo.
              </Text>
              <Button
                label="Explorar guías"
                variant="outline"
                size="sm"
                icon="compass"
                style={{ marginTop: spacing.lg, alignSelf: 'flex-start' }}
                onPress={() => router.push('/guias')}
              />
            </Card>
          ) : (
            state.bookings.map((booking) => {
              const service = findService(booking.serviceId);
              const guide = findGuide(booking.guideId);
              return (
                <Card key={booking.id} glow accent="glow">
                  <Text style={styles.bookingWhen}>
                    {booking.date} · {booking.time}
                  </Text>
                  <Text style={styles.bookingName}>{service?.name ?? 'Servicio'}</Text>
                  <Text style={styles.bookingGuide}>con {guide?.name}</Text>
                  <View style={styles.bookingActions}>
                    <Button
                      label="Ver guía"
                      variant="outline"
                      size="sm"
                      onPress={() => guide && router.push(`/guias/${guide.id}`)}
                    />
                    <Button
                      label="Cancelar"
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        cancelBooking(booking.id);
                        toast({ text: 'Reserva cancelada', icon: 'x' });
                      }}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* Guardadas */}
        <View style={styles.section}>
          <SectionHeader
            overline="Biblioteca"
            title={`Guardadas (${savedList.length})`}
            actionLabel="Explorar"
            onAction={() => router.push('/(tabs)/explorar')}
          />
        </View>
        <View style={styles.sectionList}>
          {savedList.length === 0 ? (
            <Card>
              <Text style={styles.emptyBody}>
                Guarda enseñanzas desde Hoy o desde la Biblioteca Viva y aparecerán aquí.
              </Text>
            </Card>
          ) : (
            savedList.map((t) => (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                onPress={() => {
                  haptics.tap();
                  router.push(`/lectura/${t.id}`);
                }}
                style={({ pressed }) => [styles.savedRow, pressed && { opacity: 0.8 }]}
              >
                <Feather name="bookmark" size={15} color={colors.glow} />
                <Text style={styles.savedTitle} numberOfLines={1}>
                  {t.title}
                </Text>
                <Feather name="chevron-right" size={17} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: screenPadding, gap: 10, marginBottom: spacing.xl },
  overline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: colors.glow,
  },
  title: {
    ...glowText,
    fontFamily: fonts.displayLight,
    fontSize: 36,
    lineHeight: 42,
    color: colors.text,
  },
  lead: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.textSoft,
    marginTop: 2,
  },

  section: { paddingHorizontal: screenPadding, marginBottom: spacing.xxl },
  sectionList: { paddingHorizontal: screenPadding, gap: spacing.md, marginBottom: spacing.xxl },

  progressCard: {
    padding: 18,
    gap: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.textSoft,
  },
  savedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.glowSoft,
  },
  savedTagText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.glow,
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: { height: 3, borderRadius: 2, backgroundColor: colors.glow },

  question: {
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: 31,
    color: colors.text,
  },
  helper: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 6,
  },
  options: { gap: spacing.sm, marginTop: spacing.lg },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.borderGlow, backgroundColor: colors.glowSoft },
  optionBody: { flex: 1, gap: 3 },
  optionLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14.5,
    color: colors.text,
  },
  optionLabelActive: { color: colors.glow },
  optionDescription: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
  },
  checkActive: { backgroundColor: colors.glow, borderColor: colors.glow },

  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
  },
  resetText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted },

  emptyTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.text,
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },

  bookingWhen: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.glow,
  },
  bookingName: {
    fontFamily: fonts.display,
    fontSize: 23,
    lineHeight: 29,
    color: colors.text,
    marginTop: 8,
  },
  bookingGuide: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted, marginTop: 4 },
  bookingActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },

  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  savedTitle: {
    flex: 1,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    color: colors.text,
  },
});
