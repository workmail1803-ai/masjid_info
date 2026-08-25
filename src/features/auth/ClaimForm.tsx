'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitMosqueClaim, type AuthFormState } from './actions';
import { CLAIMABLE_ROLES, mosqueRoleLabels } from '@/types/mosque-admin';

interface MasjidOption {
  id: string;
  name_bn: string;
  name_en: string | null;
  district_name_bn: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
      {pending ? 'জমা হচ্ছে…' : 'আবেদন জমা দিন'}
    </button>
  );
}

export function ClaimForm({ masjids }: { masjids: MasjidOption[] }) {
  const [state, formAction] = useActionState(submitMosqueClaim, {} as AuthFormState);
  const [filter, setFilter] = useState('');

  const filtered = filter.trim()
    ? masjids.filter((m) => {
        const q = filter.toLowerCase();
        return (
          m.name_bn.toLowerCase().includes(q) ||
          (m.name_en ?? '').toLowerCase().includes(q) ||
          (m.district_name_bn ?? '').toLowerCase().includes(q)
        );
      })
    : masjids;

  if (state.success) {
    return (
      <div className="card card-accent p-6 text-center">
        <p className="text-ink font-medium mb-2">আবেদন জমা হয়েছে</p>
        <p className="text-sm text-ink-light leading-relaxed">{state.success}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p
          role="alert"
          className="text-sm rounded-md px-3 py-2"
          style={{
            background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
            color: 'var(--color-error)',
          }}
        >
          {state.error}
        </p>
      )}

      {/* Mosque picker */}
      <div>
        <label htmlFor="masjid_filter" className="block text-sm font-medium text-ink mb-1.5">
          মসজিদ খুঁজুন
        </label>
        <input
          id="masjid_filter"
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input mb-2"
          placeholder="নাম বা জেলা দিয়ে খুঁজুন…"
          autoComplete="off"
        />

        <label htmlFor="masjid_id" className="block text-sm font-medium text-ink mb-1.5">
          মসজিদ নির্বাচন করুন <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <select id="masjid_id" name="masjid_id" required className="input" size={6}>
          {filtered.length === 0 && <option disabled>কোনো মসজিদ মেলেনি</option>}
          {filtered.slice(0, 200).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name_bn}
              {m.district_name_bn ? ` — ${m.district_name_bn}` : ''}
            </option>
          ))}
        </select>
        {filtered.length > 200 && (
          <p className="text-xs text-ink-faint mt-1">
            প্রথম ২০০টি দেখানো হচ্ছে — আরও নির্দিষ্ট করে খুঁজুন।
          </p>
        )}
      </div>

      <div>
        <label htmlFor="requested_role" className="block text-sm font-medium text-ink mb-1.5">
          আপনার পদ <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <select id="requested_role" name="requested_role" required className="input" defaultValue="secretary">
          {CLAIMABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {mosqueRoleLabels[role]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-ink mb-1.5">
          পূর্ণ নাম <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <input id="full_name" name="full_name" type="text" required minLength={2} className="input" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact_phone" className="block text-sm font-medium text-ink mb-1.5">
            মোবাইল নম্বর
          </label>
          <input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            className="input"
            placeholder="01XXXXXXXXX"
            style={{ fontFamily: 'var(--font-latin)' }}
          />
        </div>
        <div>
          <label htmlFor="contact_email" className="block text-sm font-medium text-ink mb-1.5">
            ইমেইল
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            className="input"
            style={{ fontFamily: 'var(--font-latin)' }}
          />
        </div>
      </div>

      <div>
        <label htmlFor="position_description" className="block text-sm font-medium text-ink mb-1.5">
          দায়িত্বের বিবরণ
        </label>
        <textarea
          id="position_description"
          name="position_description"
          rows={3}
          maxLength={1000}
          className="input"
          placeholder="আপনি কত দিন ধরে এই দায়িত্বে আছেন, কী কাজ করেন…"
        />
      </div>

      <div>
        <label htmlFor="evidence_note" className="block text-sm font-medium text-ink mb-1.5">
          প্রমাণ / রেফারেন্স
        </label>
        <textarea
          id="evidence_note"
          name="evidence_note"
          rows={3}
          maxLength={2000}
          className="input"
          placeholder="কমিটির সিদ্ধান্ত, নিয়োগপত্র, অথবা যাচাইয়ের জন্য যোগাযোগযোগ্য ব্যক্তির তথ্য…"
          aria-describedby="evidence-hint"
        />
        <p id="evidence-hint" className="text-xs text-ink-faint mt-1">
          এই তথ্য শুধুমাত্র প্ল্যাটফর্ম প্রশাসক দেখতে পাবেন — সর্বসাধারণের জন্য
          প্রকাশ করা হবে না।
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}
