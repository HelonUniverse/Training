import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { imageSource } from '@/data/images';
import * as haptics from '@/lib/haptics';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, screenPadding, spacing } from '@/theme';

type Mode = 'login' | 'registro';

/** Pantalla 2 — Login / Registro. */
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useApp();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('Carla Melendez');
  const [email, setEmail] = useState('carla@desdelared.app');
  const [password, setPassword] = useState('••••••••');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Escribe un correo válido para continuar.');
      return;
    }
    if (mode === 'registro' && !name.trim()) {
      setError('¿Cómo quieres que te llamemos?');
      return;
    }
    setError(null);
    signIn(email, mode === 'registro' ? name : name || 'Carla');
    haptics.success();
    toast({ text: mode === 'login' ? 'Bienvenida de vuelta' : 'Tu lugar en la Red está abierto', icon: 'sun' });
    router.replace('/(tabs)/hoy');
  };

  const enterAsGuest = () => {
    signIn('invitada@desdelared.app', 'Carla');
    router.replace('/(tabs)/hoy');
  };

  return (
    <View style={styles.root}>
      <Image source={imageSource('bg-auth')} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['rgba(4,7,15,0.35)', 'rgba(4,7,15,0.88)', '#04070F']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 36 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Text style={styles.overline}>Helonium</Text>
            <Text style={styles.title}>Desde la Red</Text>
            <Text style={styles.tagline}>
              {mode === 'login'
                ? 'Vuelve al lugar donde tu práctica te espera.'
                : 'Un solo paso para entrar en la Red.'}
            </Text>
          </View>

          <View style={styles.switcher}>
            {(['login', 'registro'] as Mode[]).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m }}
                onPress={() => {
                  haptics.select();
                  setMode(m);
                  setError(null);
                }}
                style={[styles.switchItem, mode === m && styles.switchItemActive]}
              >
                <Text style={[styles.switchLabel, mode === m && styles.switchLabelActive]}>
                  {m === 'login' ? 'Entrar' : 'Crear cuenta'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            {mode === 'registro' ? (
              <Field
                icon="user"
                label="Nombre"
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
              />
            ) : null}
            <Field
              icon="mail"
              label="Correo"
              value={email}
              onChangeText={setEmail}
              placeholder="tucorreo@ejemplo.com"
              keyboardType="email-address"
            />
            <Field
              icon="lock"
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              secure
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label={mode === 'login' ? 'Entrar a la Red' : 'Crear mi cuenta'}
              onPress={submit}
              size="lg"
              full
              style={{ marginTop: spacing.sm }}
            />

            <Pressable
              accessibilityRole="button"
              onPress={enterAsGuest}
              style={({ pressed }) => [styles.guest, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.guestText}>Explorar en modo demo</Text>
              <Feather name="arrow-right" size={14} color={colors.cyan} />
            </Pressable>
          </View>

          <Text style={styles.legal}>
            Modo demo · los datos se guardan solo en este dispositivo
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

interface FieldProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address';
}

function Field({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType = 'default',
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldBox}>
        <Feather name={icon} size={16} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          style={styles.fieldInput}
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: screenPadding, gap: spacing.xxl },

  brand: { gap: 12 },
  overline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 4.5,
    textTransform: 'uppercase',
    color: colors.cyan,
  },
  title: {
    fontFamily: fonts.displayLight,
    fontSize: 48,
    lineHeight: 54,
    letterSpacing: 0.5,
    color: colors.text,
  },
  tagline: {
    fontFamily: fonts.displayItalic,
    fontSize: 17,
    lineHeight: 25,
    color: colors.textSoft,
  },

  switcher: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceSunken,
  },
  switchItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  switchItemActive: {
    backgroundColor: colors.cyanGlow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(111,216,230,0.4)',
  },
  switchLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  switchLabelActive: { color: colors.cyan },

  form: { gap: spacing.lg },
  field: { gap: 8 },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 54,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.live,
  },
  guest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  guestText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.4,
    color: colors.cyan,
  },
  legal: {
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
