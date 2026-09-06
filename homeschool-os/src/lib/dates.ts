/**
 * Dates that came from a `date` column.
 *
 * PostgREST returns a calendar day as "2026-09-06" - no time, no zone, because
 * that is what the column means. Turning it into a Date with `new Date(value)`
 * parses it as UTC midnight, which in the Americas renders as the day before.
 * Appending a time to a string that might already carry one produces
 * "Invalid Date" instead.
 *
 * So: take the calendar day, and pin it to midday local, where no timezone in
 * the world can push it into a different date.
 */
export function calendarDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(`${day}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The same, for a timestamp column, where the full value is meaningful. */
export function timestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
