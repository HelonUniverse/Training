'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Field, FormError, Input, Select } from '@/components/ui/primitives';
import { ConfirmDialog, useToast } from '@/components/ui/interactive';
import { deletePortfolioItem, updatePortfolioItem } from '@/server/actions/portfolio';

/**
 * Correcting an entry.
 *
 * Only the descriptive fields are here. There is no control for who recorded
 * the entry or when, because those are not opinions to be revised - the server
 * action would refuse them anyway, but a form that offered them would suggest
 * a portfolio's history is editable, which is exactly the impression an
 * evaluation cannot afford.
 */
export function EditItemForm({
  itemId,
  studentId,
  initial,
  subjects,
}: {
  itemId: string;
  studentId: string;
  initial: { title: string; description: string | null; occurredOn: string; subjectId: string | null };
  subjects: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations('portfolio');
  const tc = useTranslations('common');
  const router = useRouter();
  const toast = useToast();

  const [pending, setPending] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const result = await updatePortfolioItem(itemId, studentId, {
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') ?? '') || null,
      occurredOn: String(form.get('occurredOn') ?? initial.occurredOn),
      subjectId: String(form.get('subject') ?? '') || null,
    });

    if (result?.error) {
      setError(t(result.error.replace('portfolio.', '')));
      setPending(false);
      return;
    }

    toast(t('success.saved'), 'positive');
    router.push(`/app/portfolio/${itemId}`);
    router.refresh();
  }

  async function onDelete() {
    setConfirming(false);
    setPending(true);
    const result = await deletePortfolioItem(itemId, studentId);
    if (result?.error) {
      setError(t(result.error.replace('portfolio.', '')));
      setPending(false);
      return;
    }
    toast(t('success.deleted'), 'positive');
    router.push('/app/portfolio');
    router.refresh();
  }

  return (
    <>
      <form onSubmit={onSubmit} className="max-w-xl space-y-5">
        <Field label={t('fields.title')} htmlFor="edit-title">
          <Input id="edit-title" name="title" defaultValue={initial.title} required maxLength={200} />
        </Field>

        <Field label={t('fields.date')} htmlFor="edit-date">
          <Input
            id="edit-date"
            name="occurredOn"
            type="date"
            defaultValue={initial.occurredOn}
            max={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        {subjects.length > 0 ? (
          <Field label={t('fields.subject')} htmlFor="edit-subject" optional={tc('optional')}>
            <Select id="edit-subject" name="subject" defaultValue={initial.subjectId ?? ''}>
              <option value="">{t('fields.noSubject')}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label={t('fields.notes')} htmlFor="edit-description" optional={tc('optional')}>
          <textarea
            id="edit-description"
            name="description"
            rows={4}
            maxLength={2000}
            defaultValue={initial.description ?? ''}
            className="block w-full rounded-field border-0 bg-surface px-3.5 py-2.5 text-base text-ink shadow-sm ring-1 ring-inset ring-hairline focus:ring-2 focus:ring-inset focus:ring-primary"
          />
        </Field>

        {error ? <FormError>{error}</FormError> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className="text-critical-ink"
          >
            {t('delete')}
          </Button>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? tc('saving') : tc('save')}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        title={t('deleteConfirm.title')}
        body={t('deleteConfirm.body')}
        confirmLabel={t('delete')}
        cancelLabel={tc('cancel')}
        destructive
        onConfirm={onDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
