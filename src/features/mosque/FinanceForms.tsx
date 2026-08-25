'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  createTransaction, publishTransaction, deleteTransaction,
  recordZakatReceived, recordZakatDistribution, publishZakat,
  type ActionState,
} from './finance-actions';

const EMPTY: ActionState = {};

function Msg({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm rounded-md px-3 py-2"
        style={{ background: 'color-mix(in srgb, var(--color-error) 8%, transparent)', color: 'var(--color-error)' }}>
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="text-sm rounded-md px-3 py-2"
        style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
        {state.success}
      </p>
    );
  }
  return null;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'সংরক্ষণ হচ্ছে…' : label}
    </button>
  );
}

const today = () => new Date().toISOString().split('T')[0];

export interface CategoryOption {
  id: number;
  name_bn: string;
  direction: 'income' | 'expense';
}

// ============================================================
// Income / expense entry
// ============================================================
export function TransactionForm({
  masjidId, categories,
}: { masjidId: string; categories: CategoryOption[] }) {
  const [state, formAction] = useActionState(createTransaction, EMPTY);
  const [direction, setDirection] = useState<'income' | 'expense'>('income');

  const options = categories.filter((c) => c.direction === direction);

  return (
    <form action={formAction} className="card p-5 space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <h3 className="font-semibold text-ink">নতুন লেনদেন</h3>
      <Msg state={state} />

      <fieldset>
        <legend className="block text-sm font-medium text-ink mb-1.5">ধরন</legend>
        <div className="flex gap-2">
          {(['income', 'expense'] as const).map((d) => (
            <label key={d} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="direction"
                value={d}
                checked={direction === d}
                onChange={() => setDirection(d)}
              />
              {d === 'income' ? 'আয়' : 'ব্যয়'}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-ink mb-1.5">খাত</label>
          <select id="category_id" name="category_id" className="input">
            <option value="">— নির্বাচন করুন —</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>{c.name_bn}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-ink mb-1.5">
            পরিমাণ (৳) <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input id="amount" name="amount" type="text" inputMode="decimal" required
            className="input" placeholder="১২৫০০" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="occurred_on" className="block text-sm font-medium text-ink mb-1.5">
            তারিখ <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input id="occurred_on" name="occurred_on" type="date" required
            defaultValue={today()} className="input" />
        </div>
        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-ink mb-1.5">রেফারেন্স</label>
          <input id="reference" name="reference" type="text" className="input" placeholder="রসিদ নং" />
        </div>
      </div>

      <div>
        <label htmlFor="description_bn" className="block text-sm font-medium text-ink mb-1.5">বিবরণ</label>
        <textarea id="description_bn" name="description_bn" rows={2} className="input" />
      </div>

      <p className="text-xs text-ink-faint">
        নতুন লেনদেন খসড়া হিসেবে সংরক্ষিত হয়। প্রকাশ করার পরই সর্বসাধারণ দেখতে পাবেন।
      </p>
      <Submit label="সংরক্ষণ করুন" />
    </form>
  );
}

// ============================================================
// Row actions
// ============================================================
export function PublishButton({
  masjidId, txnId,
}: { masjidId: string; txnId: string }) {
  const [state, formAction] = useActionState(publishTransaction, EMPTY);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <input type="hidden" name="txn_id" value={txnId} />
      <button type="submit" className="btn btn-ghost btn-sm" title={state.error ?? 'প্রকাশ করুন'}>
        প্রকাশ
      </button>
    </form>
  );
}

export function DeleteButton({
  masjidId, txnId,
}: { masjidId: string; txnId: string }) {
  const [state, formAction] = useActionState(deleteTransaction, EMPTY);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)}>
        মুছুন
      </button>
    );
  }

  return (
    <form action={formAction} className="inline-flex items-center gap-1">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <input type="hidden" name="txn_id" value={txnId} />
      <button type="submit" className="btn btn-secondary btn-sm" title={state.error ?? ''}>
        নিশ্চিত
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
        বাতিল
      </button>
    </form>
  );
}

// ============================================================
// Zakat
// ============================================================
export function ZakatReceiveForm({ masjidId }: { masjidId: string }) {
  const [state, formAction] = useActionState(recordZakatReceived, EMPTY);
  return (
    <form action={formAction} className="card p-5 space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <h3 className="font-semibold text-ink">যাকাত গ্রহণ</h3>
      <Msg state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="z_amount" className="block text-sm font-medium text-ink mb-1.5">
            পরিমাণ (৳) <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input id="z_amount" name="amount" type="text" inputMode="decimal" required className="input" />
        </div>
        <div>
          <label htmlFor="received_on" className="block text-sm font-medium text-ink mb-1.5">
            তারিখ <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input id="received_on" name="received_on" type="date" required defaultValue={today()} className="input" />
        </div>
      </div>

      <div>
        <label htmlFor="z_desc" className="block text-sm font-medium text-ink mb-1.5">বিবরণ</label>
        <textarea id="z_desc" name="description_bn" rows={2} className="input" />
      </div>

      <Submit label="সংরক্ষণ করুন" />
    </form>
  );
}

const ZAKAT_CATEGORIES: Array<[string, string]> = [
  ['poor_needy', 'দরিদ্র ও অসহায়'],
  ['students', 'শিক্ষার্থী'],
  ['emergency', 'জরুরি সহায়তা'],
  ['debt_relief', 'ঋণগ্রস্ত'],
  ['travellers', 'মুসাফির'],
  ['other', 'অন্যান্য'],
];

export function ZakatDistributeForm({ masjidId }: { masjidId: string }) {
  const [state, formAction] = useActionState(recordZakatDistribution, EMPTY);
  return (
    <form action={formAction} className="card p-5 space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <h3 className="font-semibold text-ink">যাকাত বিতরণ</h3>
      <Msg state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-ink mb-1.5">
            খাত <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select id="category" name="category" required className="input" defaultValue="poor_needy">
            {ZAKAT_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="d_amount" className="block text-sm font-medium text-ink mb-1.5">
            পরিমাণ (৳) <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input id="d_amount" name="amount" type="text" inputMode="decimal" required className="input" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="beneficiary_count" className="block text-sm font-medium text-ink mb-1.5">
            উপকারভোগীর সংখ্যা <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input id="beneficiary_count" name="beneficiary_count" type="number" min={1}
            required defaultValue={1} className="input" />
        </div>
        <div>
          <label htmlFor="distributed_on" className="block text-sm font-medium text-ink mb-1.5">
            তারিখ <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input id="distributed_on" name="distributed_on" type="date" required
            defaultValue={today()} className="input" />
        </div>
      </div>

      <div>
        <label htmlFor="d_desc" className="block text-sm font-medium text-ink mb-1.5">
          বিবরণ (সর্বসাধারণ দেখতে পাবে)
        </label>
        <textarea id="d_desc" name="description_bn" rows={2} className="input"
          placeholder="যেমন: শীতবস্ত্র বিতরণ" />
      </div>

      <div>
        <label htmlFor="private_note" className="block text-sm font-medium text-ink mb-1.5">
          গোপন নোট
        </label>
        <textarea id="private_note" name="private_recipient_note" rows={2} className="input"
          aria-describedby="private-hint" />
        <p id="private-hint" className="text-xs mt-1" style={{ color: 'var(--color-warning)' }}>
          🔒 গ্রহীতার নাম বা পরিচয় এখানে লিখুন — এটি কখনো সর্বসাধারণের জন্য প্রকাশ করা
          হয় না। সর্বসাধারণ শুধু সংখ্যা দেখতে পায়।
        </p>
      </div>

      <Submit label="সংরক্ষণ করুন" />
    </form>
  );
}

export function ZakatPublishButton({
  masjidId, rowId, table,
}: { masjidId: string; rowId: string; table: 'received' | 'distribution' }) {
  const [state, formAction] = useActionState(publishZakat, EMPTY);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <input type="hidden" name="row_id" value={rowId} />
      <input type="hidden" name="table" value={table} />
      <button type="submit" className="btn btn-ghost btn-sm" title={state.error ?? 'প্রকাশ করুন'}>
        প্রকাশ
      </button>
    </form>
  );
}
