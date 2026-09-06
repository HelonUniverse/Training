import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * The few things every capture screen needs. RLS-scoped, so an empty list here
 * means "you have no children we can show you", never "the query was wrong".
 */

export const getCaptureStudents = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('students')
    .select('id, preferred_name, legal_first_name, family_id')
    .is('deleted_at', null)
    .order('date_of_birth', { ascending: true });

  return (data ?? [])
    .filter((s): s is typeof s & { family_id: string } => Boolean(s.family_id))
    .map((s) => ({
      id: s.id,
      name: s.preferred_name || s.legal_first_name,
      familyId: s.family_id,
    }));
});

export const getSubjects = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subjects')
    .select('id, name')
    .is('deleted_at', null)
    .order('name');

  return (data ?? []).map((s) => ({ id: s.id, name: s.name }));
});
