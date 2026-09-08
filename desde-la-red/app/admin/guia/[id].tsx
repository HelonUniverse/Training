import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field, Options, SwitchRow, Tags } from '@/components/Form';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { deleteGuide, saveGuide, slugify } from '@/data/admin';
import type { Guide } from '@/data/types';
import * as haptics from '@/lib/haptics';
import { useApp } from '@/store/app-store';
import { useContent } from '@/store/content';
import { colors, fonts, glowText, screenPadding, spacing } from '@/theme';

const ACCENTS: Guide['accent'][] = ['cyan', 'glow', 'electric'];
const ACCENT_LABEL: Record<Guide['accent'], string> = {
  cyan: 'Cyan',
  glow: 'Hielo',
  electric: 'Eléctrico',
};

const EMPTY: Guide = {
  id: '',
  name: '',
  title: '',
  location: '',
  initials: '',
  accent: 'cyan',
  years: 0,
  circleCount: 0,
  rating: 5,
  bio: '',
  approach: [],
  languages: ['Español'],
  serviceIds: [],
  verified: false,
};

/** Iniciales a partir del nombre: "Amara Solís" → "AS". */
const initialsFrom = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

/** Pantalla 17 — Dar de alta una guía. */
export default function GuiaEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { state } = useApp();
  const { findGuide, servicesOfGuide, refresh } = useContent();

  const isNew = id === 'nueva';
  const existing = isNew ? undefined : findGuide(id);

  const [draft, setDraft] = useState<Guide>(() => existing ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Guide>(key: K, value: Guide[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const initials = draft.initials || initialsFrom(draft.name);
  const services = existing ? servicesOfGuide(existing.id) : [];

  const problems = useMemo(() => {
    const list: string[] = [];
    if (!draft.name.trim()) list.push('Falta el nombre.');
    if (!draft.title.trim()) list.push('Falta lo que hace: "Guía de silencio", por ejemplo.');
    return list;
  }, [draft]);

  const save = async () => {
    if (problems.length) {
      setError(problems[0]);
      haptics.warn();
      return;
    }
    setError(null);
    setBusy(true);
    const result = await saveGuide({
      ...draft,
      id: draft.id || slugify(draft.name, 'g'),
      initials,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.message ?? 'No se pudo guardar.');
      haptics.warn();
      return;
    }
    await refresh();
    haptics.success();
    toast({ text: isNew ? 'Guía dada de alta' : 'Cambios guardados', icon: 'check' });
    router.back();
  };

  const remove = async () => {
    if (services.length) {
      setError(
        `${draft.name} tiene ${services.length} servicio${services.length === 1 ? '' : 's'} en la Red. Quítalos antes de borrarla.`,
      );
      return;
    }
    setBusy(true);
    const result = await deleteGuide(draft.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? 'No se pudo borrar.');
      return;
    }
    await refresh();
    toast({ text: 'Guía retirada', icon: 'trash-2' });
    router.back();
  };

  if (state.user?.role !== 'admin') {
    return (
      <Screen header={<ScreenHeader title="Guía" />}>
        <Text style={styles.denied}>Esta pantalla es para administradoras.</Text>
      </Screen>
    );
  }

  return (
    <Screen padded={false} header={<ScreenHeader title={isNew ? 'Nueva guía' : 'Editar guía'} />}>
      <View style={styles.head}>
        <Avatar initials={initials || '··'} accent={draft.accent} size={72} />
        <Text style={styles.title}>{draft.name || 'Quién acompaña'}</Text>
        {draft.title ? <Text style={styles.role}>{draft.title}</Text> : null}
      </View>

      <View style={styles.form}>
        <Field
          label="Nombre"
          value={draft.name}
          onChangeText={(v) => set('name', v)}
          placeholder="Amara Solís"
          autoCapitalize="words"
        />
        <Field
          label="Qué hace"
          value={draft.title}
          onChangeText={(v) => set('title', v)}
          placeholder="Guía de silencio y contemplación"
        />
        <Field
          label="Dónde está"
          value={draft.location}
          onChangeText={(v) => set('location', v)}
          placeholder="Santo Domingo"
          autoCapitalize="words"
        />
        <Field
          label="Su historia"
          value={draft.bio}
          onChangeText={(v) => set('bio', v)}
          placeholder="En primera persona: desde dónde acompaña y por qué."
          multiline
          minHeight={130}
          helper="Se lee entera en su ficha."
        />

        <Options
          label="Color"
          value={draft.accent}
          options={ACCENTS}
          labelOf={(a) => ACCENT_LABEL[a]}
          onChange={(v) => set('accent', v)}
          helper="El halo de su avatar en toda la app."
        />

        <View style={styles.pair}>
          <Field
            label="Años de práctica"
            value={String(draft.years)}
            onChangeText={(v) => set('years', Number(v.replace(/[^0-9]/g, '')) || 0)}
            keyboardType="numeric"
            style={styles.pairItem}
          />
          <Field
            label="Iniciales"
            value={draft.initials}
            onChangeText={(v) => set('initials', v.toUpperCase().slice(0, 2))}
            placeholder={initialsFrom(draft.name) || 'AS'}
            autoCapitalize="none"
            style={styles.pairItem}
          />
        </View>

        <Tags
          label="Cómo trabaja"
          values={draft.approach}
          onChange={(v) => set('approach', v)}
          placeholder="Contemplación"
        />
        <Tags
          label="Idiomas"
          values={draft.languages}
          onChange={(v) => set('languages', v)}
          placeholder="Español"
        />

        <SwitchRow
          label="Verificada por la Red"
          helper="Muestra el sello junto a su nombre."
          value={draft.verified}
          onChange={(v) => set('verified', v)}
        />
      </View>

      {services.length ? (
        <View style={styles.section}>
          <Card>
            <Text style={styles.noteTitle}>
              {services.length} servicio{services.length === 1 ? '' : 's'} a su nombre
            </Text>
            <Text style={styles.noteText}>
              {services.map((s) => s.name).join(' · ')}. Los servicios se editan por ahora desde
              Supabase.
            </Text>
          </Card>
        </View>
      ) : null}

      <View style={styles.footer}>
        {error ? (
          <Card>
            <Text style={styles.error}>{error}</Text>
          </Card>
        ) : null}

        <Button
          label={isNew ? 'Dar de alta' : 'Guardar cambios'}
          size="lg"
          full
          loading={busy}
          disabled={busy}
          onPress={save}
        />

        {!isNew ? (
          <Button
            label="Retirar de la Red"
            variant="ghost"
            size="sm"
            icon="trash-2"
            disabled={busy}
            onPress={remove}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: screenPadding, alignItems: 'center', gap: 10, marginBottom: spacing.xl },
  title: { ...glowText, fontFamily: fonts.displayLight, fontSize: 27, color: colors.text, textAlign: 'center' },
  role: { fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, textAlign: 'center' },

  form: { paddingHorizontal: screenPadding, gap: spacing.lg, marginBottom: spacing.xxl },
  pair: { flexDirection: 'row', gap: 12 },
  pairItem: { flex: 1 },

  section: { paddingHorizontal: screenPadding, marginBottom: spacing.xxl },
  noteTitle: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.text, marginBottom: 6 },
  noteText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.textMuted },

  footer: { paddingHorizontal: screenPadding, gap: spacing.md },
  error: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.live },
  denied: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
});
