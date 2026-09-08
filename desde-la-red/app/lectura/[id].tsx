import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { CosmicBackground } from '@/components/CosmicBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TeachingCard } from '@/components/TeachingCard';
import { useToast } from '@/components/Toast';
import { imageSource } from '@/data/images';
import * as haptics from '@/lib/haptics';
import { useContent } from '@/store/content';
import { useApp } from '@/store/app-store';
import { colors, fonts, glowText, gradients, radius, screenPadding, spacing } from '@/theme';

/** Pantalla 4 — Lectura completa. */
export default function LecturaScreen() {
  const { findGuide, findTeaching, teachings } = useContent();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { toggleSaved, isSaved, markAsRead } = useApp();

  const teaching = findTeaching(id);
  const guide = findGuide(teaching?.authorId);
  const saved = teaching ? isSaved(teaching.id) : false;

  useEffect(() => {
    if (teaching) markAsRead(teaching.id);
  }, [teaching, markAsRead]);

  const related = useMemo(
    () =>
      teaching
        ? teachings
            .filter((t) => t.id !== teaching.id && t.tags.some((tag) => teaching.tags.includes(tag)))
            .slice(0, 4)
        : [],
    [teachings, teaching],
  );

  if (!teaching) {
    return (
      <CosmicBackground horizon>
        <ScreenHeader title="Lectura" />
        <View style={styles.missing}>
          <Text style={styles.missingText}>Esta enseñanza ya no está disponible.</Text>
        </View>
      </CosmicBackground>
    );
  }

  const share = async () => {
    try {
      await Share.share({
        message: `«${teaching.title}» — ${guide?.name ?? 'Desde la Red'}`,
      });
    } catch {
      toast({ text: 'No se pudo compartir ahora', icon: 'alert-circle' });
    }
  };

  return (
    <CosmicBackground horizon>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        {/* Portada cinematográfica */}
        <View style={styles.cover}>
          <Image
            source={imageSource(teaching.image)}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={500}
          />
          <LinearGradient
            colors={['rgba(3,8,20,0.55)', 'rgba(3,8,20,0.35)', '#030814']}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.coverHeader, { paddingTop: insets.top + 6 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={() => {
                haptics.tap();
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)/hoy');
              }}
              hitSlop={12}
              style={({ pressed }) => [styles.circle, pressed && { opacity: 0.7 }]}
            >
              <Feather name="chevron-left" size={20} color={colors.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Quitar de guardadas' : 'Guardar enseñanza'}
              onPress={() => {
                haptics.tap();
                toggleSaved(teaching.id);
                toast({
                  text: saved ? 'Quitada de tu biblioteca' : 'Guardada en tu biblioteca',
                  icon: saved ? 'bookmark' : 'check',
                });
              }}
              hitSlop={12}
              style={({ pressed }) => [
                styles.circle,
                saved && styles.circleActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="bookmark" size={17} color={saved ? colors.glow : colors.text} />
            </Pressable>
          </View>

          <View style={styles.coverBody}>
            <Text style={styles.theme}>{teaching.theme}</Text>
            <Text style={styles.title}>{teaching.title}</Text>
            <Text style={styles.subtitle}>{teaching.subtitle}</Text>
          </View>
        </View>

        {/* Autoría */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver perfil de ${guide?.name}`}
          onPress={() => {
            haptics.tap();
            if (guide) router.push(`/guias/${guide.id}`);
          }}
          style={({ pressed }) => [styles.author, pressed && { opacity: 0.85 }]}
        >
          <Avatar initials={guide?.initials ?? 'DR'} accent={guide?.accent ?? 'cyan'} size={44} />
          <View style={styles.authorBody}>
            <Text style={styles.authorName}>{guide?.name ?? 'Desde la Red'}</Text>
            <Text style={styles.authorMeta}>
              {teaching.publishedOn} · {teaching.readMinutes} min de lectura
            </Text>
          </View>
          <Feather name="chevron-right" size={17} color={colors.textMuted} />
        </Pressable>

        {/* Acciones */}
        <View style={styles.actions}>
          <ActionButton
            icon="headphones"
            label="Escuchar"
            onPress={() =>
              toast({ text: `Audio de ${teaching.listenMinutes} min · demo`, icon: 'headphones' })
            }
          />
          <ActionButton
            icon={saved ? 'check' : 'bookmark'}
            label={saved ? 'Guardada' : 'Guardar'}
            active={saved}
            onPress={() => {
              toggleSaved(teaching.id);
              toast({
                text: saved ? 'Quitada de tu biblioteca' : 'Guardada en tu biblioteca',
                icon: saved ? 'bookmark' : 'check',
              });
            }}
          />
          <ActionButton icon="share-2" label="Compartir" onPress={share} />
        </View>

        {/* Cuerpo */}
        <View style={styles.body}>
          {teaching.body.map((block, index) => {
            if (block.kind === 'verse') {
              return (
                <View key={index} style={styles.verseWrap}>
                  <LinearGradient
                    colors={gradients.card}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.verse}>{block.text}</Text>
                </View>
              );
            }
            if (block.kind === 'subtitle') {
              return (
                <Text key={index} style={styles.blockSubtitle}>
                  {block.text}
                </Text>
              );
            }
            return (
              <Text key={index} style={styles.paragraph}>
                {block.text}
              </Text>
            );
          })}
        </View>

        {/* Etiquetas */}
        <View style={styles.tags}>
          {teaching.tags.map((tag) => (
            <Chip key={tag} label={tag} size="sm" />
          ))}
        </View>

        {/* Relacionadas */}
        {related.length > 0 ? (
          <>
            <Text style={styles.relatedTitle}>Sigue leyendo</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedRow}
            >
              {related.map((t) => (
                <TeachingCard
                  key={t.id}
                  teaching={t}
                  width={190}
                  saved={isSaved(t.id)}
                  onPress={() => router.replace(`/lectura/${t.id}`)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  cover: { height: 520, justifyContent: 'space-between' },
  coverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: 'rgba(6,16,36,0.7)',
  },
  circleActive: { borderColor: colors.borderGlow, backgroundColor: colors.glowSoft },
  coverBody: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxl },
  theme: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: colors.cyan,
    marginBottom: 14,
  },
  title: {
    ...glowText,
    fontFamily: fonts.displayLight,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: 0.2,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.displayItalic,
    fontSize: 17,
    lineHeight: 25,
    color: colors.textSoft,
    marginTop: 12,
  },

  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: screenPadding,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  authorBody: { flex: 1, gap: 3 },
  authorName: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  authorMeta: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textMuted },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    marginTop: spacing.lg,
  },

  body: { paddingHorizontal: screenPadding, marginTop: spacing.xxl, gap: spacing.xl },
  paragraph: {
    fontFamily: fonts.bodyLight,
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: 0.1,
    color: 'rgba(232,243,249,0.86)',
  },
  blockSubtitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.glow,
    marginTop: spacing.md,
  },
  verseWrap: {
    paddingVertical: 26,
    paddingHorizontal: 22,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderGlow,
    overflow: 'hidden',
  },
  verse: {
    fontFamily: fonts.displayLight,
    fontSize: 20,
    lineHeight: 31,
    textAlign: 'center',
    color: colors.glow,
  },

  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    marginTop: spacing.xxl,
  },
  relatedTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.text,
    paddingHorizontal: screenPadding,
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg,
  },
  relatedRow: { paddingHorizontal: screenPadding, gap: spacing.md },

  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
});
