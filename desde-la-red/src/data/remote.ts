import { supabase } from '@/lib/supabase';

import { ImageKey, images } from './images';
import type {
  Circle,
  Guide,
  LiveEvent,
  NetworkPost,
  PathQuestion,
  Service,
  Teaching,
  TeachingBlock,
} from './types';

/**
 * Traduce las filas de la base de datos a los tipos que ya usan las pantallas.
 * Si el contenido trae una imagen que la app no lleva empaquetada, cae en una
 * del mismo lenguaje visual en vez de romperse.
 */
const FALLBACK_IMAGE: ImageKey = 'teaching-silence';
const asImage = (key: string | null): ImageKey =>
  key && key in images ? (key as ImageKey) : FALLBACK_IMAGE;

const asAccent = (v: string | null): Guide['accent'] =>
  v === 'glow' || v === 'electric' ? v : 'cyan';

export interface RemoteContent {
  guides: Guide[];
  services: Service[];
  teachings: Teaching[];
  circles: Circle[];
  liveEvents: LiveEvent[];
  posts: NetworkPost[];
  pathQuestions: PathQuestion[];
}

/** Lee todo el contenido público de una vez. Devuelve null si no hay backend. */
export async function fetchContent(): Promise<RemoteContent | null> {
  if (!supabase) return null;

  const [guides, services, teachings, circles, events, posts, questions] = await Promise.all([
    supabase.from('guides').select('*').order('sort_order'),
    supabase.from('services').select('*').order('sort_order'),
    supabase.from('teachings').select('*').order('sort_order'),
    supabase.from('circles').select('*').order('sort_order'),
    supabase.from('live_events').select('*').order('sort_order'),
    supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('path_questions').select('*').order('sort_order'),
  ]);

  const firstError = [guides, services, teachings, circles, events, posts, questions].find(
    (r) => r.error,
  )?.error;
  if (firstError) throw firstError;

  return {
    guides: (guides.data ?? []).map((g): Guide => ({
      id: g.id,
      name: g.name,
      title: g.title ?? '',
      location: g.location ?? '',
      initials: g.initials ?? initialsFrom(g.name),
      accent: asAccent(g.accent),
      years: g.years ?? 0,
      circleCount: g.circle_count ?? 0,
      rating: Number(g.rating ?? 5),
      bio: g.bio ?? '',
      approach: g.approach ?? [],
      languages: g.languages ?? [],
      serviceIds: (services.data ?? []).filter((s) => s.guide_id === g.id).map((s) => s.id),
      verified: !!g.verified,
    })),

    services: (services.data ?? []).map((s): Service => ({
      id: s.id,
      guideId: s.guide_id,
      name: s.name,
      format: s.format,
      modality: s.modality,
      durationMinutes: s.duration_minutes ?? 60,
      price: Number(s.price ?? 0),
      currency: 'USD',
      description: s.description ?? '',
      includes: s.includes ?? [],
    })),

    teachings: (teachings.data ?? []).map((t): Teaching => ({
      id: t.id,
      title: t.title,
      subtitle: t.subtitle ?? '',
      theme: t.theme,
      image: asImage(t.image_key),
      authorId: t.author_id ?? '',
      readMinutes: t.read_minutes ?? 5,
      listenMinutes: t.listen_minutes ?? 6,
      publishedOn: t.published_on ?? '',
      excerpt: t.excerpt ?? '',
      body: (t.body ?? []) as TeachingBlock[],
      tags: t.tags ?? [],
      featured: !!t.featured,
    })),

    circles: (circles.data ?? []).map((c): Circle => ({
      id: c.id,
      name: c.name,
      image: asImage(c.image_key),
      guideId: c.guide_id ?? '',
      members: c.members ?? 0,
      cadence: c.cadence ?? '',
      intention: c.intention ?? '',
      topics: c.topics ?? [],
    })),

    liveEvents: (events.data ?? []).map((e): LiveEvent => ({
      id: e.id,
      title: e.title,
      guideId: e.guide_id ?? '',
      image: asImage(e.image_key),
      startsAt: e.starts_label ?? '',
      durationMinutes: e.duration_minutes ?? 60,
      attendees: e.attendees ?? 0,
      status: e.status ?? 'scheduled',
      description: e.description ?? '',
    })),

    posts: (posts.data ?? []).map((p): NetworkPost => ({
      id: p.id,
      authorName: p.author_name ?? 'Alguien de la Red',
      authorInitials: initialsFrom(p.author_name ?? ''),
      accent: asAccent(p.accent),
      role: p.author_role ?? 'Caminante',
      timeAgo: timeAgo(p.created_at),
      text: p.text,
      resonances: p.base_resonances ?? 0,
      replies: p.replies ?? 0,
      circleName: (circles.data ?? []).find((c) => c.id === p.circle_id)?.name,
    })),

    pathQuestions: (questions.data ?? []).map((q): PathQuestion => ({
      id: q.id,
      prompt: q.prompt,
      helper: q.helper ?? '',
      multiple: !!q.multiple,
      options: q.options ?? [],
    })),
  };
}

export const initialsFrom = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'DR';

/** "hace 12 min", "hace 3 h", "hace 2 días". */
export function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}
