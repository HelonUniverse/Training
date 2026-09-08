import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

/**
 * La app funciona con y sin backend. Si faltan las variables de entorno se
 * queda en modo demo local, que es como nació: nada se rompe, simplemente no
 * hay cuentas ni contenido compartido.
 */
export const isBackendConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isBackendConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // En web el enlace de recuperación sí llega por URL; en el teléfono no.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

/** Mensajes de Supabase traducidos a algo que una persona entienda. */
export function authErrorMessage(error: { message?: string } | null): string {
  const raw = error?.message?.toLowerCase() ?? '';
  if (raw.includes('invalid login credentials')) return 'Ese correo o esa contraseña no coinciden.';
  if (raw.includes('email not confirmed')) return 'Falta confirmar tu correo. Revisa tu bandeja.';
  if (raw.includes('user already registered')) return 'Ese correo ya tiene cuenta. Entra en vez de crearla.';
  if (raw.includes('password should be at least')) return 'La contraseña necesita al menos 6 caracteres.';
  if (raw.includes('unable to validate email')) return 'Ese correo no parece válido.';
  if (raw.includes('rate limit') || raw.includes('too many')) return 'Demasiados intentos. Espera un momento.';
  if (raw.includes('failed to fetch') || raw.includes('network')) return 'Sin conexión. Inténtalo de nuevo.';
  return error?.message || 'Algo salió mal. Inténtalo de nuevo.';
}
