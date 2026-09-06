'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import {
  ACCEPT_ATTRIBUTE,
  MAX_ANY_BYTES,
  VALIDATION_MESSAGE,
  extensionFor,
  humanSize,
  storagePath,
  validateFileBytes,
  type AcceptedMime,
} from '@/lib/upload/validation';
import {
  ACTIVITY_KINDS,
  FAMILY_DOCUMENT_CATEGORIES,
  KIND_SPEC,
  READING_TYPES,
  type CaptureKind,
} from '@/lib/capture/kinds';
import { checkDuplicate, saveCapture, type UploadedFile } from '@/server/actions/capture';
import { Button, Field, FormError, Input, Select, cx } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/interactive';

/**
 * Capture, on a phone, in the kitchen, one-handed.
 *
 * THE SHAPE. Files first, details second, one Save. There is no wizard: a
 * worksheet is one screen, and asking someone to page through four steps to
 * record it is how a portfolio ends up empty in March.
 *
 * THE BYTES NEVER GO THROUGH A SERVER ACTION. Action requests are capped at
 * 1MB and a phone photo is routinely eight times that. The browser uploads
 * straight to the quarantine bucket with the user's own session, so the storage
 * policy authorises the write, and only then does a Server Action record what
 * was uploaded.
 *
 * THE ORIGINAL IS THE EVIDENCE. Nothing here resizes, re-encodes or strips a
 * photo. A child's work photographed at full resolution stays at full
 * resolution; a portfolio that quietly degraded its own evidence would be worth
 * less every year.
 *
 * VALIDATION IS BY CONTENT. The first bytes of the file decide what it is. A
 * .jpg that is really something else is refused with a plain sentence rather
 * than accepted and left to fail silently later.
 */

type Student = { id: string; name: string; familyId: string };
type Subject = { id: string; name: string };

type Picked = {
  key: string;
  file: File;
  previewUrl: string | null;
  mime: AcceptedMime | null;
  sha256: string | null;
  error: string | null;
  duplicateOf: { id: string; title: string | null; filename: string } | null;
  state: 'checking' | 'ready' | 'rejected';
};

const BUCKET = 'uploads-quarantine';

export function CaptureFlow({
  kind,
  students,
  subjects,
  activeStudentId,
}: {
  kind: CaptureKind;
  students: Student[];
  subjects: Subject[];
  activeStudentId: string | null;
}) {
  const t = useTranslations('capture');
  const tu = useTranslations('upload');
  const tv = useTranslations('vocab');
  const tc = useTranslations('common');
  const router = useRouter();
  const toast = useToast();

  const spec = KIND_SPEC[kind];
  const shows = (field: string) => spec.fields.includes(field as never);

  const [picked, setPicked] = React.useState<Picked[]>([]);
  const [studentId, setStudentId] = React.useState(activeStudentId ?? students[0]?.id ?? '');
  const [title, setTitle] = React.useState('');
  const [occurredOn, setOccurredOn] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const cameraInput = React.useRef<HTMLInputElement>(null);

  // Object URLs are a resource, not a string. Released on unmount.
  React.useEffect(
    () => () => {
      picked.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    const additions: Picked[] = files.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: null,
      mime: null,
      sha256: null,
      error: null,
      duplicateOf: null,
      state: 'checking',
    }));
    setPicked((current) => [...current, ...additions]);

    for (const entry of additions) {
      const inspected = await inspect(entry);
      setPicked((current) => current.map((p) => (p.key === entry.key ? inspected : p)));
    }
  }

  async function inspect(entry: Picked): Promise<Picked> {
    const { file } = entry;

    if (file.size > MAX_ANY_BYTES) {
      return { ...entry, state: 'rejected', error: tu(keyOf('too_large')) };
    }

    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const check = validateFileBytes(file.type, file.size, head);
    if (!check.ok) {
      return { ...entry, state: 'rejected', error: tu(keyOf(check.reason)) };
    }

    // Content address. Also what makes the duplicate question answerable
    // without uploading the file first.
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const sha256 = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const existing = await checkDuplicate(sha256);

    return {
      ...entry,
      state: 'ready',
      mime: check.mime,
      sha256,
      // HEIC is accepted but browsers will not render it in an <img>. Showing a
      // broken image would read as "your photo is damaged", which it is not.
      previewUrl: isPreviewable(check.mime) ? URL.createObjectURL(file) : null,
      duplicateOf: existing
        ? { id: existing.id, title: existing.title, filename: existing.filename }
        : null,
    };
  }

  function remove(key: string) {
    setPicked((current) => {
      const gone = current.find((p) => p.key === key);
      if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
      return current.filter((p) => p.key !== key);
    });
  }

  const usable = picked.filter((p) => p.state === 'ready' && !p.duplicateOf);
  const canSave =
    !saving && studentId && title.trim().length > 0 && (!spec.filesRequired || usable.length > 0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setFormError(null);

    const student = students.find((s) => s.id === studentId);
    if (!student) {
      setFormError(t('errors.chooseChild'));
      setSaving(false);
      return;
    }

    try {
      const supabase = createClient();
      const uploaded: UploadedFile[] = [];

      for (const entry of usable) {
        if (!entry.mime || !entry.sha256) continue;
        const path = storagePath(student.familyId, student.id, extensionFor(entry.mime));

        const { error } = await supabase.storage.from(BUCKET).upload(path, entry.file, {
          contentType: entry.mime,
          upsert: false,
        });
        if (error) throw new Error(error.message);

        uploaded.push({
          path,
          filename: entry.file.name,
          mime: entry.mime,
          bytes: entry.file.size,
          sha256: entry.sha256,
        });
      }

      const form = new FormData(event.currentTarget);
      const result = await saveCapture({
        kind,
        studentId,
        title: title.trim(),
        occurredOn,
        subjectId: str(form.get('subject')),
        description: str(form.get('description')),
        minutes: num(form.get('minutes')),
        author: str(form.get('author')),
        pages: num(form.get('pages')),
        readingType: (str(form.get('readingType')) as never) ?? null,
        activityKind: (str(form.get('activityKind')) as never) ?? null,
        category: (str(form.get('category')) as never) ?? null,
        files: uploaded,
      });

      if (!result.ok) {
        setFormError(t(result.error.replace('capture.', '')));
        setSaving(false);
        return;
      }

      toast(t('saved'), 'positive');
      router.push(kind === 'document' ? '/app/documents' : '/app/portfolio');
      router.refresh();
    } catch {
      setFormError(t('errors.saveFailed'));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-28 sm:pb-8">
      {/* ------------------------------------------------------------ files */}
      <section aria-labelledby="capture-files">
        <h2 id="capture-files" className="sr-only">
          {t('filesHeading')}
        </h2>

        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          // Opens the camera on a phone, the file picker everywhere else.
          capture="environment"
          multiple
          className="sr-only"
          onChange={onFiles}
        />
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          multiple
          className="sr-only"
          onChange={onFiles}
        />

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => cameraInput.current?.click()}
            className="flex-col gap-1 py-5"
          >
            <span aria-hidden className="text-2xl">
              ⧉
            </span>
            {t('takePhoto')}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => fileInput.current?.click()}
            className="flex-col gap-1 py-5"
          >
            <span aria-hidden className="text-2xl">
              ⬆
            </span>
            {t('chooseFile')}
          </Button>
        </div>

        <p className="mt-2.5 text-sm text-ink-subtle">{tu('accepted')}</p>

        {picked.length > 0 ? (
          <ul className="mt-4 space-y-2.5">
            {picked.map((entry) => (
              <PickedFile
                key={entry.key}
                entry={entry}
                onRemove={() => remove(entry.key)}
                labels={{
                  checking: tu('checking'),
                  remove: tc('remove'),
                  duplicate: tu('duplicate'),
                  noPreview: tu('noPreview'),
                }}
              />
            ))}
          </ul>
        ) : null}

        {spec.filesRequired && picked.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{t('filesRequiredHint')}</p>
        ) : null}
      </section>

      {/* ---------------------------------------------------------- details */}
      <div className="space-y-5">
        {students.length > 1 ? (
          <Field label={t('child')} htmlFor="capture-student">
            <Select
              id="capture-student"
              name="student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label={t(`title.${kind}`)} htmlFor="capture-title">
          <Input
            id="capture-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t(`titlePlaceholder.${kind}`)}
            required
            maxLength={200}
          />
        </Field>

        <Field label={t(`date.${kind}`)} htmlFor="capture-date">
          <Input
            id="capture-date"
            name="date"
            type="date"
            value={occurredOn}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </Field>

        {shows('author') ? (
          <Field label={t('author')} htmlFor="capture-author" optional={tc('optional')}>
            <Input id="capture-author" name="author" maxLength={200} />
          </Field>
        ) : null}

        {shows('activityKind') ? (
          <Field label={t('activityKind')} htmlFor="capture-activityKind">
            <Select id="capture-activityKind" name="activityKind" defaultValue="field_trip">
              {ACTIVITY_KINDS.map((value) => (
                <option key={value} value={value}>
                  {tv(`activityKind.${value}`)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {shows('readingType') ? (
          <Field label={t('readingType')} htmlFor="capture-readingType">
            <Select id="capture-readingType" name="readingType" defaultValue="independent">
              {READING_TYPES.map((value) => (
                <option key={value} value={value}>
                  {tv(`readingType.${value}`)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {shows('category') ? (
          <Field
            label={t('category')}
            hint={t('categoryHint')}
            htmlFor="capture-category"
          >
            <Select id="capture-category" name="category" defaultValue="other">
              {FAMILY_DOCUMENT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {tv(`documentCategory.${value}`)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {shows('subject') && subjects.length > 0 ? (
          <Field label={t('subject')} htmlFor="capture-subject" optional={tc('optional')}>
            <Select id="capture-subject" name="subject" defaultValue="">
              <option value="">{t('noSubject')}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          {shows('minutes') ? (
            <Field label={t('minutes')} htmlFor="capture-minutes" optional={tc('optional')}>
              <Input id="capture-minutes" name="minutes" type="number" min={1} max={1440} inputMode="numeric" />
            </Field>
          ) : null}
          {shows('pages') ? (
            <Field label={t('pages')} htmlFor="capture-pages" optional={tc('optional')}>
              <Input id="capture-pages" name="pages" type="number" min={0} max={10000} inputMode="numeric" />
            </Field>
          ) : null}
        </div>

        {shows('description') ? (
          <Field label={t(`notes.${kind}`)} htmlFor="capture-description" optional={tc('optional')}>
            <textarea
              id="capture-description"
              name="description"
              rows={3}
              maxLength={2000}
              placeholder={t(`notesPlaceholder.${kind}`)}
              className="block w-full rounded-field border-0 bg-surface px-3.5 py-2.5 text-base text-ink shadow-sm ring-1 ring-inset ring-hairline placeholder:text-ink-subtle focus:ring-2 focus:ring-inset focus:ring-primary"
            />
          </Field>
        ) : null}
      </div>

      {formError ? <FormError>{formError}</FormError> : null}

      {/* The save bar stays reachable with one thumb on a phone. */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-hairline bg-surface/95 p-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button type="submit" size="lg" full disabled={!canSave}>
          {saving ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

function PickedFile({
  entry,
  onRemove,
  labels,
}: {
  entry: Picked;
  onRemove: () => void;
  labels: { checking: string; remove: string; duplicate: string; noPreview: string };
}) {
  const rejected = entry.state === 'rejected';
  const duplicate = Boolean(entry.duplicateOf);

  return (
    <li
      className={cx(
        'flex items-center gap-3 rounded-card bg-surface p-3 ring-1 ring-inset',
        rejected || duplicate ? 'ring-critical/30' : 'ring-hairline/70',
      )}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-field bg-surface-sunken">
        {entry.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="text-lg text-ink-subtle">
            ❐
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{entry.file.name}</p>
        {entry.state === 'checking' ? (
          <p className="text-sm text-ink-subtle">{labels.checking}</p>
        ) : rejected ? (
          <p className="text-sm text-critical-ink">{entry.error}</p>
        ) : duplicate ? (
          <p className="text-sm text-critical-ink">{labels.duplicate}</p>
        ) : (
          <p className="text-sm text-ink-subtle">
            {humanSize(entry.file.size)}
            {entry.previewUrl ? '' : ` · ${labels.noPreview}`}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`${labels.remove}: ${entry.file.name}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-field text-ink-subtle hover:bg-surface-sunken hover:text-ink"
      >
        <span aria-hidden>✕</span>
      </button>
    </li>
  );
}

function isPreviewable(mime: AcceptedMime): boolean {
  return mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp';
}

function keyOf(reason: keyof typeof VALIDATION_MESSAGE): string {
  return VALIDATION_MESSAGE[reason].replace('upload.', '');
}

function str(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

function num(value: FormDataEntryValue | null): number | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}
