import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { useToast } from '@/components/Toast';
import * as haptics from '@/lib/haptics';
import { useContent } from '@/store/content';
import { useApp } from '@/store/app-store';
import { colors, fonts, glowText, radius, screenPadding, spacing } from '@/theme';

/** Pantalla 14 — Perfil. */
export default function PerfilScreen() {
  const { pathQuestions } = useContent();
  const router = useRouter();
  const toast = useToast();
  const { state, signOut, resetDemo, hasAccounts } = useApp();
  const { source, teachings, circles, guides } = useContent();

  const [reminders, setReminders] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState(true);

  const stats = useMemo(
    () => [
      { value: state.readTeachings.length, label: 'leídas' },
      { value: state.savedTeachings.length, label: 'guardadas' },
      { value: state.bookings.length, label: 'reservas' },
    ],
    [state.readTeachings.length, state.savedTeachings.length, state.bookings.length],
  );

  const intentions = useMemo(() => {
    const question = pathQuestions[0];
    const chosen = state.pathAnswers[question.id] ?? [];
    return question.options.filter((o) => chosen.includes(o.id)).map((o) => o.label);
  }, [pathQuestions, state.pathAnswers]);

  const myCircles = circles.filter((c) => state.joinedCircles.includes(c.id));

  return (
    <Screen padded={false} header={<ScreenHeader title="Perfil" />}>
      <View style={styles.hero}>
        <Avatar initials={state.user?.initials ?? 'CM'} accent="glow" size={92} />
        <Text style={styles.name}>{state.user?.name ?? 'Carla'}</Text>
        <Text style={styles.email}>{state.user?.email ?? 'invitada@desdelared.app'}</Text>
        <View style={styles.memberTag}>
          <Feather
            name={state.user?.role === 'admin' ? 'shield' : 'star'}
            size={11}
            color={colors.glow}
          />
          <Text style={styles.memberText}>
            {state.user?.role === 'admin'
              ? 'Administradora de la Red'
              : state.user?.id
                ? 'Miembro de la Red'
                : 'Invitada · sin cuenta'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 ? <View style={styles.statDivider} /> : null}
            <View style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Mi camino resumido */}
      <View style={styles.section}>
        <SectionHeader
          overline="Mi Camino"
          title={intentions.length > 0 ? 'Tu intención' : 'Sin definir todavía'}
          actionLabel="Editar"
          onAction={() => router.push('/(tabs)/mi-camino')}
        />
        <View style={{ height: spacing.lg }} />
        <Card glow accent="glow">
          {intentions.length > 0 ? (
            <>
              <Text style={styles.intentionText}>{intentions.join(' · ')}</Text>
              <Text style={styles.intentionHint}>
                {state.pathSavedAt
                  ? 'Guardado en este dispositivo'
                  : 'Aún sin guardar — vuelve a Mi Camino'}
              </Text>
            </>
          ) : (
            <Text style={styles.intentionHint}>
              Responde las cuatro preguntas de Mi Camino y la Red sabrá cómo acompañarte.
            </Text>
          )}
        </Card>
      </View>

      {/* Círculos */}
      <View style={styles.section}>
        <SectionHeader
          overline="Círculos"
          title={`Perteneces a ${myCircles.length}`}
          actionLabel="Ver todos"
          onAction={() => router.push('/circulos')}
        />
        <View style={{ height: spacing.lg }} />
        <View style={{ gap: spacing.sm }}>
          {myCircles.length === 0 ? (
            <Card>
              <Text style={styles.intentionHint}>Todavía no perteneces a ningún círculo.</Text>
            </Card>
          ) : (
            myCircles.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => {
                  haptics.tap();
                  router.push(`/circulos/${c.id}`);
                }}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
              >
                <Feather name="users" size={15} color={colors.cyan} />
                <Text style={styles.rowLabel}>{c.name}</Text>
                <Feather name="chevron-right" size={17} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </View>
      </View>

      {/* Preferencias */}
      <View style={styles.section}>
        <SectionHeader overline="Preferencias" title="Cómo te avisamos" />
        <View style={{ height: spacing.lg }} />
        <Card padding={0}>
          <Toggle
            icon="sunrise"
            label="Recordatorio de práctica"
            caption="Cada mañana a la hora que elegiste"
            value={reminders}
            onValueChange={setReminders}
          />
          <View style={styles.divider} />
          <Toggle
            icon="radio"
            label="Avisos de encuentros en vivo"
            caption="Cuando una guía que sigues abre sala"
            value={liveAlerts}
            onValueChange={setLiveAlerts}
          />
        </Card>
      </View>

      {/* Cuenta */}
      <View style={styles.section}>
        <SectionHeader overline="Cuenta" title={hasAccounts ? 'Tu cuenta' : 'Modo demo'} />
        <View style={{ height: spacing.lg }} />
        <Card>
          <Text style={styles.demoText}>
            {hasAccounts && state.user?.id
              ? `Tu camino se guarda en tu cuenta y viaja contigo a cualquier dispositivo. Contenido ${source === 'remote' ? 'en vivo' : 'local'}: ${teachings.length} enseñanzas, ${circles.length} círculos y ${guides.length} guías.`
              : hasAccounts
                ? `Estás explorando sin cuenta: lo que marcas se guarda solo en este dispositivo. Crea una cuenta para conservarlo. Contenido ${source === 'remote' ? 'en vivo' : 'local'}: ${teachings.length} enseñanzas, ${circles.length} círculos y ${guides.length} guías.`
                : `Todo lo que ves está guardado solo en este dispositivo con AsyncStorage: ${teachings.length} enseñanzas, ${circles.length} círculos y ${guides.length} guías de demostración.`}
          </Text>
          <View style={styles.accountActions}>
            <Button
              label={hasAccounts ? 'Borrar datos locales' : 'Reiniciar demo'}
              variant="outline"
              size="sm"
              icon="refresh-ccw"
              onPress={() => {
                resetDemo();
                toast({ text: 'Datos locales reiniciados', icon: 'refresh-ccw' });
                router.replace('/(auth)/login');
              }}
            />
            <Button
              label="Cerrar sesión"
              variant="ghost"
              size="sm"
              icon="log-out"
              onPress={async () => {
                await signOut();
                router.replace('/(auth)/login');
              }}
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

function Toggle({
  icon,
  label,
  caption,
  value,
  onValueChange,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  caption: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleIcon}>
        <Feather name={icon} size={15} color={colors.cyan} />
      </View>
      <View style={styles.toggleBody}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleCaption}>{caption}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptics.select();
          onValueChange(v);
        }}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(231,194,125,0.5)' }}
        thumbColor={value ? colors.glow : '#8FA3B4'}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingHorizontal: screenPadding, marginTop: spacing.md },
  name: {
    ...glowText,
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.text,
    marginTop: 8,
  },
  email: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted },
  memberTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.glowSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderGlow,
  },
  memberText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.glow,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: screenPadding,
    marginTop: spacing.xxl,
    paddingVertical: 18,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stat: { flex: 1, alignItems: 'center', gap: 5 },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  statDivider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: colors.borderSoft },

  section: { paddingHorizontal: screenPadding, marginTop: spacing.xxxl },
  intentionText: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 30,
    color: colors.glow,
  },
  intentionHint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  rowLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },

  toggle: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cyanGlow,
  },
  toggleBody: { flex: 1, gap: 3 },
  toggleLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  toggleCaption: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textMuted },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSoft, marginLeft: 68 },

  demoText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSoft,
  },
  accountActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
});
