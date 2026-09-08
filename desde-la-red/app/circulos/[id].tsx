import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GuideCard } from '@/components/GuideCard';
import { PostCard } from '@/components/PostCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { useToast } from '@/components/Toast';
import { findCircle, networkPosts } from '@/data/community';
import { findGuide } from '@/data/guides';
import { imageSource } from '@/data/images';
import { useApp } from '@/store/app-store';
import { colors, fonts, glowText, gradients, screenPadding, spacing } from '@/theme';

/** Pantalla 8b — Detalle de un Círculo. */
export default function CirculoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { toggleCircle, isInCircle, toggleResonance, hasResonated } = useApp();

  const circle = findCircle(id);
  const guide = findGuide(circle?.guideId);

  if (!circle) {
    return (
      <CosmicBackground horizon>
        <ScreenHeader title="Círculo" />
        <Text style={styles.empty}>Este círculo ya no existe.</Text>
      </CosmicBackground>
    );
  }

  const joined = isInCircle(circle.id);
  const posts = networkPosts.filter((p) => p.circleName === circle.name);

  return (
    <CosmicBackground horizon>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        <View style={styles.cover}>
          <Image
            source={imageSource(circle.image)}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={450}
          />
          <LinearGradient colors={gradients.scrim} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
          <ScreenHeader title="Círculo" transparent />
          <View style={styles.coverBody}>
            <Text style={styles.name}>{circle.name}</Text>
            <Text style={styles.intention}>{circle.intention}</Text>
            <View style={styles.metaRow}>
              <Feather name="users" size={12} color={colors.textMuted} />
              <Text style={styles.meta}>{circle.members} miembros</Text>
              <View style={styles.dot} />
              <Feather name="repeat" size={12} color={colors.textMuted} />
              <Text style={styles.meta}>{circle.cadence}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Button
            label={joined ? 'Perteneces a este círculo' : 'Entrar al círculo'}
            icon={joined ? 'check' : 'user-plus'}
            variant={joined ? 'outline' : 'brand'}
            size="lg"
            full
            onPress={() => {
              toggleCircle(circle.id);
              toast({
                text: joined ? `Saliste de ${circle.name}` : `Bienvenida a ${circle.name}`,
                icon: joined ? 'x' : 'check',
              });
            }}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.chipRow}>
            {circle.topics.map((t) => (
              <Chip key={t} label={t} size="sm" />
            ))}
          </View>
        </View>

        {guide ? (
          <>
            <View style={styles.section}>
              <SectionHeader overline="Sostiene el círculo" title="Tu guía" />
            </View>
            <View style={styles.section}>
              <GuideCard guide={guide} onPress={() => router.push(`/guias/${guide.id}`)} />
            </View>
          </>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            overline="Voces del círculo"
            title={posts.length > 0 ? 'Lo que se está compartiendo' : 'Todavía en silencio'}
          />
        </View>
        <View style={[styles.section, { gap: spacing.lg }]}>
          {posts.length === 0 ? (
            <Card>
              <Text style={styles.quiet}>
                Este círculo aún no tiene publicaciones. Entra y sé la primera voz.
              </Text>
            </Card>
          ) : (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                resonated={hasResonated(p.id)}
                onResonate={() => toggleResonance(p.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  cover: { height: 400, justifyContent: 'space-between' },
  coverBody: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxl },
  name: {
    ...glowText,
    fontFamily: fonts.displayLight,
    fontSize: 42,
    lineHeight: 48,
    color: colors.text,
  },
  intention: {
    fontFamily: fonts.displayItalic,
    fontSize: 17,
    lineHeight: 25,
    color: colors.textSoft,
    marginTop: 10,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 },
  meta: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted, marginHorizontal: 4 },

  section: { paddingHorizontal: screenPadding, marginTop: spacing.xxl },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quiet: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.textMuted },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
});
