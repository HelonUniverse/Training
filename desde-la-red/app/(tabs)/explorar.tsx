import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { CosmicBackground } from '@/components/CosmicBackground';
import { SearchField } from '@/components/SearchField';
import { SectionHeader } from '@/components/SectionHeader';
import { TeachingCard } from '@/components/TeachingCard';
import { circles } from '@/data/community';
import { findGuide, guides } from '@/data/guides';
import { teachingThemes, teachings } from '@/data/teachings';
import { matches } from '@/lib/format';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, screenPadding, spacing, tabBarHeight } from '@/theme';

type Filter = 'todas' | 'guardadas' | 'sin-leer';

/** Pantalla 5 — Biblioteca Viva. */
export default function ExplorarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, isSaved } = useApp();

  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('todas');

  const results = useMemo(() => {
    return teachings.filter((t) => {
      const guide = findGuide(t.authorId);
      if (theme && t.theme !== theme) return false;
      if (filter === 'guardadas' && !state.savedTeachings.includes(t.id)) return false;
      if (filter === 'sin-leer' && state.readTeachings.includes(t.id)) return false;
      return matches(query, t.title, t.subtitle, t.excerpt, t.theme, guide?.name, ...t.tags);
    });
  }, [query, theme, filter, state.savedTeachings, state.readTeachings]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'guardadas', label: `Guardadas (${state.savedTeachings.length})` },
    { id: 'sin-leer', label: 'Sin leer' },
  ];

  return (
    <CosmicBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: tabBarHeight + insets.bottom + 34,
        }}
      >
        <View style={styles.head}>
          <Text style={styles.overline}>Biblioteca Viva</Text>
          <Text style={styles.title}>Todo lo que la Red{'\n'}ha escrito</Text>
          <Text style={styles.caption}>
            {teachings.length} enseñanzas · {guides.length} guías · {circles.length} círculos
          </Text>
        </View>

        <View style={styles.searchBox}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar enseñanzas, temas o guías…"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {filters.map((f) => (
            <Chip
              key={f.id}
              label={f.label}
              selected={filter === f.id}
              onPress={() => setFilter(f.id)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip label="Todos los temas" selected={theme === null} onPress={() => setTheme(null)} />
          {teachingThemes.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={theme === t}
              onPress={() => setTheme(theme === t ? null : t)}
            />
          ))}
        </ScrollView>

        <View style={styles.section}>
          <SectionHeader
            title={
              results.length === 0
                ? 'Sin resultados'
                : `${results.length} ${results.length === 1 ? 'enseñanza' : 'enseñanzas'}`
            }
            actionLabel="Guías"
            onAction={() => router.push('/guias')}
          />
        </View>

        {results.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="search" size={22} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nada por aquí todavía</Text>
            <Text style={styles.emptyBody}>
              Prueba con otra palabra o quita los filtros activos.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {results.map((t) => (
              <TeachingCard
                key={t.id}
                teaching={t}
                variant="row"
                saved={isSaved(t.id)}
                read={state.readTeachings.includes(t.id)}
                onPress={() => router.push(`/lectura/${t.id}`)}
              />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader
            overline="Círculos"
            title="Espacios vivos"
            actionLabel="Ver todos"
            onAction={() => router.push('/circulos')}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {circles.map((c) => (
            <Chip key={c.id} label={c.name} onPress={() => router.push(`/circulos/${c.id}`)} />
          ))}
        </ScrollView>
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
    color: colors.cyan,
  },
  title: {
    fontFamily: fonts.displayLight,
    fontSize: 36,
    lineHeight: 42,
    color: colors.text,
  },
  caption: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },

  searchBox: { paddingHorizontal: screenPadding, marginBottom: spacing.lg },
  chipRow: { paddingHorizontal: screenPadding, gap: spacing.sm, paddingBottom: spacing.md },

  section: { paddingHorizontal: screenPadding, marginTop: spacing.xl, marginBottom: spacing.lg },
  list: { paddingHorizontal: screenPadding, gap: spacing.md },

  empty: {
    marginHorizontal: screenPadding,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.text,
    marginTop: 4,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
