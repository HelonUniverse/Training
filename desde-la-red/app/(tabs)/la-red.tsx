import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GuideCard } from '@/components/GuideCard';
import { PostCard } from '@/components/PostCard';
import { SearchField } from '@/components/SearchField';
import { SectionHeader } from '@/components/SectionHeader';
import { circles, networkPosts } from '@/data/community';
import { findGuide, guides } from '@/data/guides';
import { matches } from '@/lib/format';
import * as haptics from '@/lib/haptics';
import { useApp } from '@/store/app-store';
import { colors, fonts, glowText, radius, screenPadding, spacing, tabBarHeight } from '@/theme';

type Tab = 'voces' | 'guias' | 'circulos';

/** Pantalla 7 — La Red. */
export default function LaRedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toggleResonance, hasResonated, state } = useApp();

  const [tab, setTab] = useState<Tab>('voces');
  const [query, setQuery] = useState('');

  const posts = useMemo(
    () =>
      networkPosts.filter((p) =>
        matches(query, p.text, p.authorName, p.role, p.circleName),
      ),
    [query],
  );
  const guideResults = useMemo(
    () =>
      guides.filter((g) =>
        matches(query, g.name, g.title, g.location, ...g.approach),
      ),
    [query],
  );
  const circleResults = useMemo(
    () => circles.filter((c) => matches(query, c.name, c.intention, ...c.topics)),
    [query],
  );

  const tabs: { id: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: 'voces', label: 'Voces', icon: 'feather' },
    { id: 'guias', label: 'Guías', icon: 'compass' },
    { id: 'circulos', label: 'Círculos', icon: 'users' },
  ];

  return (
    <CosmicBackground image="bg-network" intensity={0.18}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: tabBarHeight + insets.bottom + 34,
        }}
      >
        <View style={styles.head}>
          <Text style={styles.overline}>La Red</Text>
          <Text style={styles.title}>Nadie camina{'\n'}en soledad</Text>
        </View>

        <View style={styles.searchBox}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar en la Red…" />
        </View>

        <View style={styles.segment}>
          {tabs.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === t.id }}
              onPress={() => {
                haptics.select();
                setTab(t.id);
              }}
              style={[styles.segmentItem, tab === t.id && styles.segmentItemActive]}
            >
              <Feather
                name={t.icon}
                size={13}
                color={tab === t.id ? colors.cyan : colors.textMuted}
              />
              <Text style={[styles.segmentLabel, tab === t.id && styles.segmentLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'voces' ? (
          <View style={styles.list}>
            {posts.length === 0 ? (
              <Text style={styles.empty}>Ninguna voz coincide con esa búsqueda.</Text>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  resonated={hasResonated(post.id)}
                  onResonate={() => toggleResonance(post.id)}
                />
              ))
            )}
          </View>
        ) : null}

        {tab === 'guias' ? (
          <>
            <View style={styles.sectionHead}>
              <SectionHeader
                title={`${guideResults.length} guías`}
                actionLabel="Ver directorio"
                onAction={() => router.push('/guias')}
              />
            </View>
            <View style={styles.list}>
              {guideResults.map((g) => (
                <GuideCard key={g.id} guide={g} onPress={() => router.push(`/guias/${g.id}`)} />
              ))}
              {guideResults.length === 0 ? (
                <Text style={styles.empty}>Ninguna guía coincide con esa búsqueda.</Text>
              ) : null}
            </View>
          </>
        ) : null}

        {tab === 'circulos' ? (
          <>
            <View style={styles.sectionHead}>
              <SectionHeader
                title={`${circleResults.length} círculos`}
                actionLabel="Ver todos"
                onAction={() => router.push('/circulos')}
              />
            </View>
            <View style={styles.list}>
              {circleResults.map((c) => {
                const guide = findGuide(c.guideId);
                const joined = state.joinedCircles.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir ${c.name}`}
                    onPress={() => {
                      haptics.tap();
                      router.push(`/circulos/${c.id}`);
                    }}
                    style={({ pressed }) => [styles.circleRow, pressed && { opacity: 0.85 }]}
                  >
                    <View style={styles.circleBody}>
                      <Text style={styles.circleName}>{c.name}</Text>
                      <Text style={styles.circleMeta}>
                        {c.members} miembros · {guide?.name}
                      </Text>
                      <View style={styles.chipRow}>
                        {c.topics.slice(0, 3).map((t) => (
                          <Chip key={t} label={t} size="sm" />
                        ))}
                      </View>
                    </View>
                    {joined ? <Feather name="check-circle" size={17} color={colors.glow} /> : null}
                    <Feather name="chevron-right" size={18} color={colors.textMuted} />
                  </Pressable>
                );
              })}
              {circleResults.length === 0 ? (
                <Text style={styles.empty}>Ningún círculo coincide con esa búsqueda.</Text>
              ) : null}
            </View>
          </>
        ) : null}
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
    ...glowText,
    fontFamily: fonts.displayLight,
    fontSize: 36,
    lineHeight: 42,
    color: colors.text,
  },
  searchBox: { paddingHorizontal: screenPadding, marginBottom: spacing.lg },

  segment: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: screenPadding,
    marginBottom: spacing.xl,
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceSunken,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  segmentItemActive: { backgroundColor: colors.cyanGlow },
  segmentLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  segmentLabelActive: { color: colors.cyan },

  sectionHead: { paddingHorizontal: screenPadding, marginBottom: spacing.lg },
  list: { paddingHorizontal: screenPadding, gap: spacing.lg },
  empty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },

  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  circleBody: { flex: 1, gap: 6 },
  circleName: {
    fontFamily: fonts.displaySemi,
    fontSize: 19,
    color: colors.text,
  },
  circleMeta: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textMuted },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
});
