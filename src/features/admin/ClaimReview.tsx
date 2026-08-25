'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { approveMosqueClaim, rejectMosqueClaim } from './actions';

interface Props {
  claimId: string;
  masjidName: string;
  masjidSlug: string | null;
  requestedRole: string;
  fullName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  positionDescription: string | null;
  evidenceNote: string | null;
  createdAt: string;
}

/**
 * Approving grants standing access to a mosque's private records, so both
 * actions require an explicit confirmation step rather than firing on one click.
 */
export function ClaimReviewRow(props: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  function run(kind: 'approve' | 'reject') {
    setError(null);
    const formData = new FormData();
    formData.set('claim_id', props.claimId);
    formData.set('notes', notes);

    startTransition(async () => {
      const result =
        kind === 'approve'
          ? await approveMosqueClaim(formData)
          : await rejectMosqueClaim(formData);

      if (!result.success) {
        setError(result.error ?? 'কাজটি সম্পন্ন করা যায়নি।');
        return;
      }
      setConfirming(null);
      setNotes('');
    });
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink">{props.masjidName}</h3>
          <p className="text-xs text-ink-muted mt-0.5">
            আবেদিত পদ: <span className="text-ink">{props.requestedRole}</span>
            {' · '}
            {new Date(props.createdAt).toLocaleDateString('bn-BD')}
          </p>
        </div>
        {props.masjidSlug && (
          <Link href={`/masjid/${props.masjidSlug}`} className="btn btn-ghost btn-sm shrink-0">
            প্রোফাইল
          </Link>
        )}
      </div>

      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
        <div>
          <dt className="text-xs text-ink-faint">আবেদনকারী</dt>
          <dd className="text-ink">{props.fullName}</dd>
        </div>
        {props.contactPhone && (
          <div>
            <dt className="text-xs text-ink-faint">মোবাইল</dt>
            <dd className="text-ink" style={{ fontFamily: 'var(--font-latin)' }}>
              {props.contactPhone}
            </dd>
          </div>
        )}
        {props.contactEmail && (
          <div>
            <dt className="text-xs text-ink-faint">ইমেইল</dt>
            <dd className="text-ink break-all" style={{ fontFamily: 'var(--font-latin)' }}>
              {props.contactEmail}
            </dd>
          </div>
        )}
        {props.positionDescription && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-ink-faint">দায়িত্বের বিবরণ</dt>
            <dd className="text-ink-light whitespace-pre-line">{props.positionDescription}</dd>
          </div>
        )}
        {props.evidenceNote && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-ink-faint">প্রমাণ / রেফারেন্স</dt>
            <dd className="text-ink-light whitespace-pre-line">{props.evidenceNote}</dd>
          </div>
        )}
      </dl>

      {error && (
        <p
          role="alert"
          className="text-sm rounded-md px-3 py-2 mb-3"
          style={{
            background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </p>
      )}

      {confirming === null ? (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setConfirming('approve')}
            disabled={pending}
          >
            অনুমোদন করুন
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setConfirming('reject')}
            disabled={pending}
          >
            প্রত্যাখ্যান
          </button>
        </div>
      ) : (
        <div className="border-t border-border pt-3">
          <p className="text-sm text-ink mb-2">
            {confirming === 'approve'
              ? `নিশ্চিত? অনুমোদন করলে ${props.fullName} এই মসজিদের ব্যবস্থাপনা প্যানেলে প্রবেশাধিকার পাবেন।`
              : 'নিশ্চিত? আবেদনটি প্রত্যাখ্যান করা হবে।'}
          </p>
          <label htmlFor={`notes-${props.claimId}`} className="block text-xs text-ink-faint mb-1">
            মন্তব্য (আবেদনকারী দেখতে পাবেন)
          </label>
          <textarea
            id={`notes-${props.claimId}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={2000}
            className="input mb-3"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={confirming === 'approve' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
              onClick={() => run(confirming)}
              disabled={pending}
            >
              {pending ? 'প্রক্রিয়াধীন…' : confirming === 'approve' ? 'হ্যাঁ, অনুমোদন করুন' : 'হ্যাঁ, প্রত্যাখ্যান করুন'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setConfirming(null); setError(null); }}
              disabled={pending}
            >
              বাতিল
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
