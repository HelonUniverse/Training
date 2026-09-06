import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * What the portfolio actually shows.
 *
 * A portfolio is not a folder of files, so this does not query documents. It
 * queries the three things a family records - saved work, activities, and
 * reading - and merges them into one dated story. An afternoon at the springs
 * that nobody photographed still belongs on the timeline; a portfolio that only
 * listed uploads would quietly teach people that unphotographed learning does
 * not count.
 *
 * Activities that produced a portfolio item are omitted from the activity side,
 * because that item already represents them. Otherwise the field trip would
 * appear twice.
 */

export type TimelineEntry = {
  id: string;
  kind: 'portfolio' | 'activity' | 'reading';
  title: string;
  occurredOn: string;
  studentId: string;
  subjectId: string | null;
  description: string | null;
  documentIds: string[];
  minutes: number | null;
  /** The enum value, translated at the edge - never rendered raw. */
  detail: string | null;
};

export async function getTimeline(options?: { studentId?: string | null; limit?: number }) {
  const supabase = await createClient();
  const limit = options?.limit ?? 60;
  const student = options?.studentId && options.studentId !== 'all' ? options.studentId : null;

  const items = supabase
    .from('portfolio_items')
    .select('id, title, occurred_on, student_id, subject_id, description, document_ids, activity_type')
    .is('deleted_at', null)
    .order('occurred_on', { ascending: false })
    .limit(limit);

  const activities = supabase
    .from('activity_logs')
    .select('id, activity_title, date, student_id, subject_id, description, duration_minutes, activity_kind')
    .is('deleted_at', null)
    .is('portfolio_item_id', null)
    .order('date', { ascending: false })
    .limit(limit);

  const readings = supabase
    .from('reading_logs')
    .select('id, book_title, author, started_on, completed_on, created_at, student_id, notes, minutes, reading_type')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  const [a, b, c] = await Promise.all([
    student ? items.eq('student_id', student) : items,
    student ? activities.eq('student_id', student) : activities,
    student ? readings.eq('student_id', student) : readings,
  ]);

  const entries: TimelineEntry[] = [];

  for (const row of a.data ?? []) {
    entries.push({
      id: row.id,
      kind: 'portfolio',
      title: row.title,
      occurredOn: row.occurred_on,
      studentId: row.student_id,
      subjectId: row.subject_id,
      description: row.description,
      documentIds: row.document_ids ?? [],
      minutes: null,
      detail: row.activity_type,
    });
  }

  for (const row of b.data ?? []) {
    entries.push({
      id: row.id,
      kind: 'activity',
      title: row.activity_title,
      occurredOn: row.date,
      studentId: row.student_id,
      subjectId: row.subject_id,
      description: row.description,
      documentIds: [],
      minutes: row.duration_minutes,
      detail: row.activity_kind,
    });
  }

  for (const row of c.data ?? []) {
    entries.push({
      id: row.id,
      kind: 'reading',
      title: row.book_title,
      // A book read over three weeks belongs on the day it was started.
      occurredOn: row.started_on ?? row.completed_on ?? row.created_at.slice(0, 10),
      studentId: row.student_id,
      subjectId: null,
      description: row.author ? `${row.author}` : row.notes,
      documentIds: [],
      minutes: row.minutes,
      detail: row.reading_type,
    });
  }

  entries.sort((x, y) => (x.occurredOn < y.occurredOn ? 1 : x.occurredOn > y.occurredOn ? -1 : 0));
  return entries.slice(0, limit);
}

/** Month buckets, newest first, for a timeline that reads like a year. */
export function groupByMonth(entries: TimelineEntry[]) {
  const months = new Map<string, TimelineEntry[]>();
  for (const entry of entries) {
    const key = entry.occurredOn.slice(0, 7);
    const bucket = months.get(key) ?? [];
    bucket.push(entry);
    months.set(key, bucket);
  }
  return Array.from(months, ([month, items]) => ({ month, items }));
}

export async function getPortfolioItem(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('portfolio_items')
    // One string literal, not a concatenation: supabase-js infers the row type
    // from the literal, and `a + b` erases it back to `string`.
    .select(
      'id, title, description, occurred_on, student_id, subject_id, document_ids, visibility, activity_type, evidence_category, source_type, entered_by, ai_generated, human_confirmed_by, created_at, updated_at, created_by',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  return data;
}

/** The evidence attached to an item, in the order it was attached. */
export async function getDocuments(ids: string[]) {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('documents')
    .select('id, title, original_filename, mime_type, byte_size, scan_status, category, document_date, student_id, visibility, created_at')
    .in('id', ids)
    .is('deleted_at', null);

  const order = new Map(ids.map((id, index) => [id, index]));
  return (data ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** Counts for the dashboard. Real numbers only - never a placeholder figure. */
export async function getPortfolioCounts(studentId?: string | null) {
  const supabase = await createClient();
  const student = studentId && studentId !== 'all' ? studentId : null;

  const base = <T extends { eq: (c: string, v: string) => T }>(q: T) =>
    student ? q.eq('student_id', student) : q;

  const [items, activities, readings, documents] = await Promise.all([
    base(supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).is('deleted_at', null)),
    base(supabase.from('activity_logs').select('id', { count: 'exact', head: true }).is('deleted_at', null)),
    base(supabase.from('reading_logs').select('id', { count: 'exact', head: true }).is('deleted_at', null)),
    base(supabase.from('documents').select('id', { count: 'exact', head: true }).is('deleted_at', null)),
  ]);

  return {
    portfolioItems: items.count ?? 0,
    activities: activities.count ?? 0,
    readings: readings.count ?? 0,
    documents: documents.count ?? 0,
  };
}
