import { getTranslations } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader, Card, StatusBadge } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';
import { createClient } from '@/lib/supabase/server';

/**
 * The internal standards surface.
 *
 * This is not a family screen and does not pretend to be one. Technical
 * framework vocabulary belongs here - "batch", "adapter", "unresolved" - because
 * the person reading it is deciding whether a parsed row is fit to publish.
 *
 * Access is not checked in this component. It does not need to be: every table
 * behind it is gated by app.is_standards_admin() in RLS, so an ordinary account
 * sees empty lists rather than data it should not have. Rendering the shell for
 * everyone and letting the database answer is one authority, not two that can
 * disagree.
 */
export default async function Page() {
  const t = await getTranslations('standards');
  const supabase = await createClient();

  const [{ data: frameworks }, { data: sources }, { data: batches }] = await Promise.all([
    supabase.from('standards_frameworks').select('id, code, name, jurisdiction, version_year').order('code'),
    supabase
      .from('standards_sources')
      .select('id, authority, authority_name, artifact_name, detected_format, sha256, provided_on')
      .order('provided_on', { ascending: false })
      .limit(25),
    supabase
      .from('standards_import_batches')
      .select('id, adapter, adapter_version, status, rows_seen, rows_staged, rows_unresolved, rows_published, created_at')
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  const { data: queue } = await supabase
    .from('standards_staged_records')
    .select('id, row_number, status, source_code, source_statement, source_grade, normalized_code, normalized_grade, warnings')
    .in('status', ['staged', 'unresolved', 'ambiguous', 'parse_error', 'source_conflict', 'duplicate'])
    .order('row_number')
    .limit(50);

  // The framework CATALOGUE is public reference data - every signed-in user can
  // read it, and should. What marks an account as having no standards
  // capability is that the import machinery is invisible: no sources, no
  // batches, no staging. That is RLS answering, and it is what this checks.
  const hasAdminAccess =
    (sources ?? []).length > 0 || (batches ?? []).length > 0 || (queue ?? []).length > 0;

  return (
    <ParentShell>
      <PageHeader title={t('admin.title')} />

      {!hasAdminAccess ? (
        <EmptyState icon="⚿" title={t('admin.title')} body={t('admin.noAccess')} />
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">{t('admin.frameworks')}</h2>
        <ul className="divide-y divide-hairline overflow-hidden rounded-card bg-surface ring-1 ring-inset ring-hairline/70">
          {(frameworks ?? []).map((f) => (
            <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <span className="text-ink">{f.name}</span>
              <span className="text-sm text-ink-muted">
                {f.code} · {f.jurisdiction ?? '—'} · {f.version_year ?? '—'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-ink">{t('admin.sources')}</h2>
        {(sources ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">{t('admin.emptyQueue')}</p>
        ) : (
          <ul className="space-y-3">
            {(sources ?? []).map((s) => (
              <li key={s.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{s.artifact_name}</p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {t('admin.sourceAuthority')}: {s.authority_name}
                      </p>
                    </div>
                    <StatusBadge tone={s.authority === 'synthetic_test' ? 'neutral' : 'positive'}>
                      {s.authority}
                    </StatusBadge>
                  </div>
                  {/* The hash is shown in full. A truncated hash cannot be
                      compared against the artifact somebody is holding, which
                      is the only reason to display it. */}
                  <dl className="mt-3 space-y-1 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <dt className="text-ink-muted">{t('admin.sourceFormat')}</dt>
                      <dd className="text-ink">{s.detected_format}</dd>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <dt className="text-ink-muted">{t('admin.sourceHash')}</dt>
                      <dd className="break-all font-mono text-xs text-ink">{s.sha256}</dd>
                    </div>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-ink">{t('admin.batches')}</h2>
        {(batches ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">{t('admin.emptyQueue')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-ink-muted">
                  <th className="py-2 pr-3 font-medium">{t('admin.adapter')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.rowsSeen')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.rowsStaged')}</th>
                  {/* Unresolved gets its own column and is never folded into a
                      success percentage. It is the number that decides whether
                      this import is finished. */}
                  <th className="py-2 pr-3 font-medium">{t('admin.rowsUnresolved')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.rowsPublished')}</th>
                </tr>
              </thead>
              <tbody>
                {(batches ?? []).map((b) => (
                  <tr key={b.id} className="border-b border-hairline/60">
                    <td className="py-2 pr-3 text-ink">
                      {b.adapter} <span className="text-ink-muted">{b.adapter_version}</span>
                    </td>
                    <td className="py-2 pr-3 text-ink">{b.rows_seen}</td>
                    <td className="py-2 pr-3 text-ink">{b.rows_staged}</td>
                    <td className="py-2 pr-3 text-ink">{b.rows_unresolved}</td>
                    <td className="py-2 pr-3 text-ink">{b.rows_published}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-ink">{t('admin.staging')}</h2>
        {(queue ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">{t('admin.emptyQueue')}</p>
        ) : (
          <ul className="space-y-3">
            {(queue ?? []).map((row) => (
              <li key={row.id}>
                <Card>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-sm text-ink">
                      {row.source_code ?? '—'}
                    </span>
                    <StatusBadge tone={row.status === 'staged' ? 'positive' : 'neutral'}>
                      {row.status}
                    </StatusBadge>
                  </div>

                  {/* Source and normalization side by side, labelled. A reviewer
                      who cannot tell which half the state wrote cannot review. */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-ink-subtle">
                        {t('admin.sourceText')}
                      </p>
                      <p className="mt-1 text-sm text-ink">{row.source_statement ?? '—'}</p>
                      <p className="mt-1 text-xs text-ink-muted">{row.source_grade ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-ink-subtle">
                        {t('admin.normalized')}
                      </p>
                      <p className="mt-1 font-mono text-sm text-ink">{row.normalized_code ?? '—'}</p>
                      <p className="mt-1 text-xs text-ink-muted">{row.normalized_grade ?? '—'}</p>
                    </div>
                  </div>

                  {Array.isArray(row.warnings) && row.warnings.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs uppercase tracking-wide text-ink-subtle">
                        {t('admin.warnings')}
                      </p>
                      <ul className="mt-1 space-y-1 text-sm text-ink-muted">
                        {(row.warnings as string[]).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ParentShell>
  );
}
