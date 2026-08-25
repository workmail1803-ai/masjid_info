'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { sendEmailCode, verifyEmailCode, type AuthFormState } from './actions';

const EMPTY: AuthFormState = {};

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function Msg({ state }: { state: AuthFormState }) {
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

/**
 * Passwordless sign-in: request a six-digit code, then enter it.
 *
 * The email is carried into step two as a hidden field rather than re-typed,
 * so a typo cannot silently send the code to one address and verify another.
 */
export function EmailCodeForm({ redirectTo }: { redirectTo?: string }) {
  const [sendState, sendAction] = useActionState(sendEmailCode, EMPTY);
  const [verifyState, verifyAction] = useActionState(verifyEmailCode, EMPTY);
  const [email, setEmail] = useState('');

  const codeSent = Boolean(sendState.success);

  if (!codeSent) {
    return (
      <form action={sendAction} className="space-y-4">
        <Msg state={sendState} />

        <div>
          <label htmlFor="otp_email" className="block text-sm font-medium text-ink mb-1.5">
            ইমেইল
          </label>
          <input
            id="otp_email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@gmail.com"
            style={{ fontFamily: 'var(--font-latin)' }}
          />
          <p className="text-xs text-ink-faint mt-1">
            আপনার ইমেইলে একটি ৬ সংখ্যার কোড পাঠানো হবে। পাসওয়ার্ড লাগবে না।
          </p>
        </div>

        <div>
          <label htmlFor="otp_name" className="block text-sm font-medium text-ink mb-1.5">
            পূর্ণ নাম <span className="text-ink-faint font-normal">(নতুন হলে)</span>
          </label>
          <input id="otp_name" name="full_name" type="text" autoComplete="name"
            className="input" placeholder="আপনার নাম" />
        </div>

        <Submit label="কোড পাঠান" pendingLabel="পাঠানো হচ্ছে…" />
      </form>
    );
  }

  return (
    <form action={verifyAction} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
      <input type="hidden" name="email" value={email} />

      <Msg state={verifyState.error || verifyState.success ? verifyState : sendState} />

      <div>
        <label htmlFor="token" className="block text-sm font-medium text-ink mb-1.5">
          ৬ সংখ্যার কোড
        </label>
        <input
          id="token"
          name="token"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          autoComplete="one-time-code"
          className="input text-center tracking-[0.4em] text-lg"
          placeholder="------"
          style={{ fontFamily: 'var(--font-latin)' }}
        />
        <p className="text-xs text-ink-faint mt-1">
          <span style={{ fontFamily: 'var(--font-latin)' }}>{email}</span> — এ পাঠানো হয়েছে।
        </p>
      </div>

      <Submit label="প্রবেশ করুন" pendingLabel="যাচাই হচ্ছে…" />

      <button
        type="button"
        className="btn btn-ghost btn-sm w-full"
        onClick={() => window.location.reload()}
      >
        অন্য ইমেইল ব্যবহার করুন
      </button>
    </form>
  );
}
