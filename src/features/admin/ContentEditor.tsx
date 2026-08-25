'use client';

import { useActionState } from 'react';
import {
  Field, TextArea, Select, Checkbox, SubmitButton, FormMessage, ConfirmDelete, Disclosure,
  type ActionState,
} from '@/components/form/Fields';
import { saveContent, toggleContentStatus, deleteContent, type ContentKind } from './content-actions';

const EMPTY: ActionState = {};

export interface ContentRow {
  id: string;
  title_bn: string;
  title_en: string | null;
  body: string | null;
  excerpt: string | null;
  author_name: string | null;
  category_id: number | null;
  status: string;
  is_featured?: boolean;
  published_at: string | null;
}

export interface CategoryOpt {
  id: number;
  name_bn: string;
}

export function ContentForm({
  kind, row, categories,
}: { kind: ContentKind; row?: ContentRow; categories: CategoryOpt[] }) {
  const [state, action] = useActionState(saveContent, EMPTY);

  const categoryOptions: Array<[string, string]> = [
    ['', '— খাত নেই —'],
    ...categories.map((c) => [String(c.id), c.name_bn] as [string, string]),
  ];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      {row && <input type="hidden" name="id" value={row.id} />}
      <FormMessage state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="title_bn" label="শিরোনাম (বাংলা)" defaultValue={row?.title_bn} required />
        <Field name="title_en" label="শিরোনাম (ইংরেজি)" defaultValue={row?.title_en} latin />
      </div>

      {kind === 'news' && (
        <>
          <TextArea name="excerpt" label="সংক্ষিপ্তসার" defaultValue={row?.excerpt} rows={2}
            hint="তালিকায় এই অংশটুকু দেখানো হবে।" />
          <Field name="author_name" label="লেখক" defaultValue={row?.author_name} />
        </>
      )}

      <TextArea
        name="body"
        label={kind === 'resources' ? 'বিবরণ' : 'বিস্তারিত'}
        defaultValue={row?.body}
        rows={kind === 'notices' ? 5 : 10}
      />

      {kind !== 'notices' && categories.length > 0 && (
        <Select name="category_id" label="খাত"
          defaultValue={row?.category_id ? String(row.category_id) : ''} options={categoryOptions} />
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {kind === 'notices' && (
          <Checkbox name="is_featured" label="ফিচার করুন" defaultChecked={row?.is_featured} />
        )}
        <Checkbox name="publish" label="প্রকাশ করুন"
          defaultChecked={row?.status === 'published'}
          hint="না দিলে খসড়া হিসেবে সংরক্ষিত হবে — সর্বসাধারণ দেখতে পাবে না।" />
      </div>

      <SubmitButton label={row ? 'হালনাগাদ করুন' : 'তৈরি করুন'} />
    </form>
  );
}

export function StatusToggle({ kind, id, status }: { kind: ContentKind; id: string; status: string }) {
  const [state, action] = useActionState(toggleContentStatus, EMPTY);
  const published = status === 'published';
  return (
    <form action={action} className="inline">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton
        label={published ? 'খসড়ায় নিন' : 'প্রকাশ করুন'}
        pendingLabel="…"
        className="btn btn-ghost btn-sm"
      />
      {state.error && <span className="sr-only" role="alert">{state.error}</span>}
    </form>
  );
}

export function ContentDelete({ kind, id }: { kind: ContentKind; id: string }) {
  const [, action] = useActionState(deleteContent, EMPTY);
  return <ConfirmDelete action={action} hidden={{ kind, id }} />;
}

export { Disclosure };
