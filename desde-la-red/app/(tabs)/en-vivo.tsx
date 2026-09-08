import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { CosmicBackground } from '@/components/CosmicBackground';
import { LiveEventCard } from '@/components/LiveEventCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useToast } from '@/components/Toast';
import { liveEvents } from '@/data/community';
import { findGuide } from '@/data/guides';
import { formatDuration } from '@/lib/format';
import { colors, fonts, screenPadding, spacing, tabBarHeight } from '@/theme';

type Filter = 'todos' | 'hoy' | 'proximos';

/** Pantalla 6 — En Vivo. */
export default function EnVivoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('todos');
  const [joined, setJoined] = useState<string[]>([]);

  const live = useMemo(() => liveEvents.filter((e) => e.status === 'live'), []);
  const rest = useMemo(
    () =>
      liveEvents
        .filter((e) => e.status !== 'live')
        .filter((e) => {
          if (filter === 'hoy') return e.startsAt.toLowerCase().includes('hoy');
          if (filter === 'proximos') return !e.startsAt.toLowerCase().includes('hoy');
          return true;
        }),
    [filter],
  );

  const toggleJoin = (id: string, title: string) => {
    setJoined((prev) => {
      const has = prev.includes(id);
      toast({
        text: has ? 'Salida del encuentro' : `Te esperamos en «${title}»`,
        icon: has ? 'x' : 'check',
      });
      return has ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  return (
    <CosmicBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: tabBarHeight + insets.bottom + 34,
        }}
      >
        <View style={styles.head}>
          <Text style={styles.overline}>En vivo</Text>
          <Text style={styles.title}>Encuentros que{'\n'}están ocurriendo</Text>
        </View>

        {live.length > 0 ? (
          <View style={styles.section}>
            {live.map((event) => {
              const guide = findGuide(event.guideId);
              return (
                <View key={event.id} style={{ gap: spacing.lg }}>
                  <LiveEventCard
                    event={event}
                    guideName={guide?.name ?? ''}
                    onPress={() =>
                      toast({ text: 'Transmisión demo · sin backend aún', icon: 'radio' })
                    }
                  />
                  <Button
                    label="Entrar ahora"
                    icon="radio"
                    variant="cyan"
                    full
                    onPress={() => toast({ text: 'Transmisión demo · sin backend aún', icon: 'radio' })}
                  />
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader overline="Agenda" title="Próximos encuentros" />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {(
            [
              { id: 'todos', label: 'Todos' },
              { id: 'hoy', label: 'Hoy' },
              { id: 'proximos', label: 'Próximos días' },
            ] as { id: Filter; label: string }[]
          ).map((f) => (
            <Chip
              key={f.id}
              label={f.label}
              selected={filter === f.id}
              onPress={() => setFilter(f.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.list}>
          {rest.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No hay encuentros con este filtro.</Text>
            </Card>
          ) : (
            rest.map((event) => {
              const guide = findGuide(event.guideId);
              const isJoined = joined.includes(event.id);
              return (
                <Card key={event.id} padding={0}>
                  <LiveEventCard
                    event={event}
                    guideName={guide?.name ?? ''}
                    variant="compact"
                    onPress={() => guide && router.push(`/guias/${guide.id}`)}
                  />
                  <View style={styles.eventBody}>
                    <Text style={styles.eventDescription}>{event.description}</Text>
                    <View style={styles.eventMeta}>
                      <View style={styles.metaItem}>
                        <Feather name="clock" size={12} color={colors.textMuted} />
                        <Text style={styles.metaText}>
                          {formatDuration(event.durationMinutes)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Feather name="users" size={12} color={colors.textMuted} />
                        <Text style={styles.metaText}>{event.attendees} inscritos</Text>
                      </View>
                    </View>
                    <Button
                      label={isJoined ? 'Reservado' : 'Reservar mi lugar'}
                      icon={isJoined ? 'check' : 'calendar'}
                      variant={isJoined ? 'outline' : 'brand'}
                      size="sm"
                      full
                      onPress={() => toggleJoin(event.id, event.title)}
                    />
                  </View>
                </Card>
              );
            })
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
    color: colors.live,
  },
  title: {
    fontFamily: fonts.displayLight,
    fontSize: 36,
    lineHeight: 42,
    color: colors.text,
  },
  section: { paddingHorizontal: screenPadding, marginBottom: spacing.xxl },
  chipRow: { paddingHorizontal: screenPadding, gap: spacing.sm, paddingBottom: spacing.lg },
  list: { paddingHorizontal: screenPadding, gap: spacing.lg },
  eventBody: { padding: 18, gap: 14 },
  eventDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSoft,
  },
  eventMeta: { flexDirection: 'row', gap: spacing.xl },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textMuted },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});
