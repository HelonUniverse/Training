import { supabase } from '@/lib/supabase';

import type { Guide, Teaching } from './types';

/**
 * Escrituras del panel de administración. Todas pasan por las políticas de la
 * base: si quien pide no tiene `role = 'admin'`, Postgres las rechaza. La app
 * esconde el panel por cortesía, no por seguridad.
 */

export interface AdminResult {
  ok: boolean;
  message?: string;
}

const noBackend: AdminResult = {
  ok: false,
  message: 'La base de datos todavía no está conectada.',
};

/**
 * Convierte un título en un identificador legible y estable:
 * "El silencio también es una respuesta" → "el-silencio-tambien-es-una".
 */
export function slugify(text: string, prefix: string): string {
  const base = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .slice(0, 5)
    .join('-');
  return `${prefix}-${base || Date.now().toString(36)}`;
}

export async function saveTeaching(t: Teaching): Promise<AdminResult> {
  if (!supabase) return noBackend;

  // Solo una enseñanza abre la app. Marcar esta desmarca la anterior.
  if (t.featured) {
    const { error } = await supabase
      .from('teachings')
      .update({ featured: false })
      .eq('featured', true)
      .neq('id', t.id);
    if (error) return { ok: false, message: writeError(error.message) };
  }

  const { error } = await supabase.from('teachings').upsert({
    id: t.id,
    title: t.title,
    subtitle: t.subtitle,
    theme: t.theme,
    image_key: t.image,
    author_id: t.authorId,
    read_minutes: t.readMinutes,
    listen_minutes: t.listenMinutes,
    published_on: t.publishedOn,
    excerpt: t.excerpt,
    body: t.body,
    tags: t.tags,
    featured: !!t.featured,
  });
  return error ? { ok: false, message: writeError(error.message) } : { ok: true };
}

export async function deleteTeaching(id: string): Promise<AdminResult> {
  if (!supabase) return noBackend;
  const { error } = await supabase.from('teachings').delete().eq('id', id);
  return error ? { ok: false, message: writeError(error.message) } : { ok: true };
}

export async function saveGuide(g: Guide): Promise<AdminResult> {
  if (!supabase) return noBackend;
  const { error } = await supabase.from('guides').upsert({
    id: g.id,
    name: g.name,
    title: g.title,
    location: g.location,
    initials: g.initials,
    accent: g.accent,
    years: g.years,
    circle_count: g.circleCount,
    rating: g.rating,
    bio: g.bio,
    approach: g.approach,
    languages: g.languages,
    verified: g.verified,
  });
  return error ? { ok: false, message: writeError(error.message) } : { ok: true };
}

export async function deleteGuide(id: string): Promise<AdminResult> {
  if (!supabase) return noBackend;
  const { error } = await supabase.from('guides').delete().eq('id', id);
  return error ? { ok: false, message: writeError(error.message) } : { ok: true };
}

/** Una reserva tal y como la ve el panel: con nombre y correo de quien reservó. */
export interface AdminBooking {
  id: string;
  serviceId: string;
  guideId: string | null;
  date: string;
  time: string;
  note: string | null;
  status: string;
  createdAt: string;
  personName: string;
  personEmail: string | null;
}

/** Solo devuelve filas si quien pide es administradora (lo decide la base). */
export async function fetchBookings(): Promise<AdminBooking[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bookings')
    .select('*, profiles!bookings_user_id_fkey(name, email)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  return (data ?? []).map((b): AdminBooking => {
    const person = b.profiles as { name?: string; email?: string } | null;
    return {
      id: b.id,
      serviceId: b.service_id,
      guideId: b.guide_id,
      date: b.date_label,
      time: b.time_label,
      note: b.note,
      status: b.status,
      createdAt: b.created_at,
      personName: person?.name || 'Sin nombre',
      personEmail: person?.email ?? null,
    };
  });
}

/** Cuántas personas hay en la Red. Solo las admins pueden contarlas. */
export async function countMembers(): Promise<number | null> {
  if (!supabase) return null;
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });
  return error ? null : (count ?? 0);
}

function writeError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('row-level security') || m.includes('violates row-level'))
    return 'Tu cuenta no tiene permiso para publicar. Pide que te den rol de administradora.';
  if (m.includes('duplicate key')) return 'Ya existe algo con ese identificador.';
  if (m.includes('foreign key')) return 'Falta una referencia: revisa la guía elegida.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sin conexión. Inténtalo otra vez.';
  return raw;
}
