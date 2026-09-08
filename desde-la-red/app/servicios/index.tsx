import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { ServiceCard } from '@/components/ServiceCard';
import { Service } from '@/data/types';
import { matches } from '@/lib/format';
import { useContent } from '@/store/content';
import { colors, fonts, glowText, screenPadding, spacing } from '@/theme';

type Format = Service['format'] | 'Todos';

const FORMATS: Format[] = ['Todos', 'Individual', 'Círculo', 'Intensivo'];

/** Pantalla 11 — Servicios. */
export default function ServiciosScreen() {
  const { findGuide, services } = useContent();
  const router = useRouter();
  const { guideId } = useLocalSearchParams<{ guideId?: string }>();

  const [query, setQuery] = useState('');
  const [format, setFormat] = useState<Format>('Todos');

  const guide = findGuide(guideId);

  const results = useMemo(
    () =>
      services
        .filter((s) => (guideId ? s.guideId === guideId : true))
        .filter((s) => (format === 'Todos' ? true : s.format === format))
        .filter((s) => {
          const owner = findGuide(s.guideId);
          return matches(query, s.name, s.description, s.format, s.modality, owner?.name);
        }),
    [services, findGuide, guideId, format, query],
  );

  return (
    <Screen
      padded={false}
      header={<ScreenHeader title="Servicios" subtitle={guide?.name} />}
    >
      <View style={styles.head}>
        <Text style={styles.title}>
          {guide ? `Trabajar con\n${guide.name.split(' ')[0]}` : 'Todos los\nservicios'}
        </Text>
        <Text style={styles.lead}>
          {results.length} {results.length === 1 ? 'opción disponible' : 'opciones disponibles'}.
          Elige una y reserva tu encuentro.
        </Text>
      </View>

      <View style={styles.searchBox}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Buscar servicio…" />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {FORMATS.map((f) => (
          <Chip key={f} label={f} selected={format === f} onPress={() => setFormat(f)} />
        ))}
      </ScrollView>

      <View style={styles.list}>
        {results.length === 0 ? (
          <Text style={styles.empty}>No hay servicios con estos filtros.</Text>
        ) : (
          results.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              guideName={guideId ? undefined : findGuide(s.guideId)?.name}
              onPress={() => router.push(`/reserva/${s.id}`)}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: screenPadding, gap: 10, marginBottom: spacing.xl },
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
  },
  searchBox: { paddingHorizontal: screenPadding, marginBottom: spacing.lg },
  chipRow: { paddingHorizontal: screenPadding, gap: spacing.sm, paddingBottom: spacing.xl },
  list: { paddingHorizontal: screenPadding, gap: spacing.md },
  empty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
});
