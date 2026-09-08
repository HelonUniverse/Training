import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CircleCard } from '@/components/CircleCard';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { circles } from '@/data/community';
import { findGuide } from '@/data/guides';
import { matches } from '@/lib/format';
import { useApp } from '@/store/app-store';
import { colors, fonts, glowText, screenPadding, spacing } from '@/theme';

/** Pantalla 8 — Círculos. */
export default function CirculosScreen() {
  const router = useRouter();
  const { state } = useApp();
  const [query, setQuery] = useState('');

  const results = useMemo(
    () =>
      circles.filter((c) => {
        const guide = findGuide(c.guideId);
        return matches(query, c.name, c.intention, c.cadence, guide?.name, ...c.topics);
      }),
    [query],
  );

  return (
    <Screen padded={false} header={<ScreenHeader title="Círculos" />}>
      <View style={styles.head}>
        <Text style={styles.title}>Espacios donde{'\n'}se practica junto</Text>
        <Text style={styles.lead}>
          Perteneces a {state.joinedCircles.length}{' '}
          {state.joinedCircles.length === 1 ? 'círculo' : 'círculos'} de {circles.length}.
        </Text>
      </View>

      <View style={styles.searchBox}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Buscar círculo o tema…" />
      </View>

      <View style={styles.list}>
        {results.length === 0 ? (
          <Text style={styles.empty}>Ningún círculo coincide con esa búsqueda.</Text>
        ) : (
          results.map((c) => (
            <CircleCard
              key={c.id}
              circle={c}
              guideName={findGuide(c.guideId)?.name ?? ''}
              joined={state.joinedCircles.includes(c.id)}
              onPress={() => router.push(`/circulos/${c.id}`)}
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
  lead: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 21, color: colors.textSoft },
  searchBox: { paddingHorizontal: screenPadding, marginBottom: spacing.xl },
  list: { paddingHorizontal: screenPadding, gap: spacing.lg },
  empty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
});
