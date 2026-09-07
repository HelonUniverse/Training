'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Card, StatusBadge } from '@/components/ui/primitives';
import {
  applyAcceptedFields,
  confirmSkillEvidence,
  decideField,
} from '@/server/actions/learning';

/**
 * "We found a few details."
 *
 * This is a review surface for a parent, not a debugging surface for us. So:
 *
 *  * no percentages, no meters, no model names, no token counts. A number like
 *    "0.81 confidence" invites a parent to reason about a scale nobody
 *    explained to them. "Suggested" and "Not sure" are honest and actionable;
 *    0.81 is neither.
 *  * nothing is pre-applied. Every row starts undecided, and leaving the page
 *    without deciding changes nothing at all.
 *  * where a parent already typed something, the suggestion sits BESIDE their
 *    value with their value clearly labelled as theirs. The AI value never
 *    occupies the field a human filled in.
 *
 * The evidence line ("we saw this on the page") is shown because a suggestion a
 * parent cannot check is a suggestion they have to take on trust, and this
 * product does not ask for that.
 */

export type SuggestionField = {
  id: string;
  fieldKey: string;
  suggestedValue: string;
  confidenceBand: 'low' | 'medium' | 'high' | null;
  evidence: string | null;
  status: 'pending' | 'accepted' | 'edited' | 'rejected';
  acceptedValue: string | null;
  conflictsWithHuman: boolean;
  humanValue?: string | null;
};

export type PossibleSkill = { fieldId: string; skillId: string | null; name: string };

export function SmartIntakeReview({
  suggestionId,
  documentId,
  studentId,
  fields,
  skills,
  analysisStatus,
}: {
  suggestionId: string;
  documentId: string;
  studentId: string | null;
  fields: SuggestionField[];
  skills: PossibleSkill[];
  analysisStatus: string;
}) {
  const t = useTranslations('intake');
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(fields);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [confirmedSkills, setConfirmedSkills] = useState<string[]>([]);

  // Nothing to review is not an error and not a card. Silence is correct.
  if (analysisStatus === 'unsupported') {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-ink">{t('title')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('unsupported')}</p>
      </Card>
    );
  }
  if (rows.length === 0 && skills.length === 0) return null;

  const decide = (field: SuggestionField, decision: 'accepted' | 'edited' | 'rejected', value?: string) => {
    startTransition(async () => {
      const result = await decideField(field.id, decision, value);
      if (result?.error) { setNote(t('errors.couldNotDecide')); return; }
      setRows((current) =>
        current.map((r) =>
          r.id === field.id
            ? { ...r, status: decision, acceptedValue: decision === 'rejected' ? null : value ?? r.suggestedValue }
            : r,
        ),
      );
      setEditing(null);
      setNote(null);
    });
  };

  const decided = rows.filter((r) => r.status === 'accepted' || r.status === 'edited').length;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">{t('title')}</h2>
        <p className="text-sm text-ink-muted">{t('youDecide')}</p>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{t('doesThisLookRight')}</p>

      <ul className="mt-4 divide-y divide-hairline">
        {rows.map((field) => (
          <li key={field.id} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-muted">{t(`fields.${field.fieldKey}`)}</p>

                {field.conflictsWithHuman && field.humanValue ? (
                  <p className="mt-0.5 text-sm text-ink">
                    <span className="font-medium">{field.humanValue}</span>{' '}
                    <span className="text-ink-muted">{t('yourValue')}</span>
                  </p>
                ) : null}

                {editing === field.id ? (
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    aria-label={t(`fields.${field.fieldKey}`)}
                    className="mt-1 w-full rounded-input border border-hairline px-3 py-2 text-base"
                  />
                ) : (
                  <p className="mt-0.5 truncate font-medium text-ink">
                    {field.status === 'edited' && field.acceptedValue
                      ? field.acceptedValue
                      : field.suggestedValue}
                  </p>
                )}

                {field.evidence ? (
                  <p className="mt-0.5 text-xs text-ink-subtle">{field.evidence}</p>
                ) : null}
              </div>

              <div className="shrink-0">
                {field.status === 'pending' ? (
                  <StatusBadge tone="neutral">
                    {field.confidenceBand === 'low' ? t('notSure') : t('suggested')}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone={field.status === 'rejected' ? 'neutral' : 'positive'}>
                    {t(`status.${field.status}`)}
                  </StatusBadge>
                )}
              </div>
            </div>

            {/* Stacked on a phone, inline from `sm` up. At 390px three wrapped
                buttons and a long suggested value fight for the same row, and
                what a thumb lands on stops being predictable. */}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {editing === field.id ? (
                <>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => decide(field, 'edited', draft)}
                    className="min-h-[44px] rounded-button bg-ink px-4 text-sm font-medium text-surface"
                  >
                    {t('save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="min-h-[44px] rounded-button px-4 text-sm text-ink-muted"
                  >
                    {t('cancel')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={pending || field.status === 'accepted'}
                    onClick={() => decide(field, 'accepted')}
                    className="min-h-[44px] rounded-button border border-hairline px-4 text-sm font-medium text-ink disabled:opacity-40"
                  >
                    {t('use')}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => { setEditing(field.id); setDraft(field.acceptedValue ?? field.suggestedValue); }}
                    className="min-h-[44px] rounded-button px-4 text-sm text-ink-muted"
                  >
                    {t('edit')}
                  </button>
                  <button
                    type="button"
                    disabled={pending || field.status === 'rejected'}
                    onClick={() => decide(field, 'rejected')}
                    className="min-h-[44px] rounded-button px-4 text-sm text-ink-muted disabled:opacity-40"
                  >
                    {t('discard')}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {skills.length > 0 && studentId ? (
        <div className="mt-5 border-t border-hairline pt-4">
          <h3 className="text-base font-semibold text-ink">{t('possibleSkills')}</h3>
          {/* The wording is doing real work here. "Possible learning skills" and
              "this work shows that skill" are claims about the WORK. Neither is
              a claim that the child has learned anything, and STEP 5 records
              neither as mastery. */}
          <p className="mt-1 text-sm text-ink-muted">{t('possibleSkillsHelp')}</p>
          <ul className="mt-3 space-y-2">
            {skills.map((skill) => (
              <li
                key={skill.fieldId}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-ink">{skill.name}</span>
                {confirmedSkills.includes(skill.fieldId) ? (
                  <StatusBadge tone="positive">{t('skillRecorded')}</StatusBadge>
                ) : (
                  <button
                    type="button"
                    disabled={pending || !skill.skillId}
                    onClick={() =>
                      startTransition(async () => {
                        if (!skill.skillId || !studentId) return;
                        const result = await confirmSkillEvidence(studentId, skill.skillId, {
                          documentId,
                          suggestionId,
                        });
                        if (result?.error) { setNote(t('errors.couldNotDecide')); return; }
                        await decideField(skill.fieldId, 'accepted');
                        setConfirmedSkills((c) => [...c, skill.fieldId]);
                      })
                    }
                    className="min-h-[44px] w-full rounded-button border border-hairline px-4 text-sm font-medium text-ink disabled:opacity-40 sm:w-auto"
                  >
                    {t('yesShowsSkill')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {decided > 0 ? (
        <div className="mt-5 border-t border-hairline pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await applyAcceptedFields(suggestionId, documentId);
                setNote(result?.error ? t('errors.couldNotApply') : t('applied'));
              })
            }
            className="min-h-[44px] w-full rounded-button bg-ink px-4 text-sm font-medium text-surface sm:w-auto"
          >
            {t('useSuggestions')}
          </button>
        </div>
      ) : null}

      {note ? <p className="mt-3 text-sm text-ink-muted">{note}</p> : null}
    </Card>
  );
}
