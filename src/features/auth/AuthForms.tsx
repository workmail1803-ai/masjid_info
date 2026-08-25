'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { signIn, signUp, type AuthFormState } from './actions';

const initialState: AuthFormState = {};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function FormMessage({ state }: { state: AuthFormState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="text-sm rounded-md px-3 py-2"
        style={{ background: 'color-mix(in srgb, var(--color-error) 8%, transparent)', color: 'var(--color-error)' }}
      >
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p
        role="status"
        className="text-sm rounded-md px-3 py-2"
        style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
      >
        {state.success}
      </p>
    );
  }
  return null;
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}

      <FormMessage state={state} />

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
          ইমেইল
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@example.com"
          style={{ fontFamily: 'var(--font-latin)' }}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
          পাসওয়ার্ড
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          minLength={8}
          className="input"
        />
      </div>

      <SubmitButton label="লগইন করুন" pendingLabel="লগইন হচ্ছে…" />

      <p className="text-sm text-ink-muted text-center">
        অ্যাকাউন্ট নেই?{' '}
        <Link href="/auth/register" className="text-accent hover:underline">
          নিবন্ধন করুন
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-ink mb-1.5">
          পূর্ণ নাম
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          minLength={2}
          autoComplete="name"
          className="input"
          placeholder="আপনার নাম"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
          ইমেইল
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@example.com"
          style={{ fontFamily: 'var(--font-latin)' }}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
          পাসওয়ার্ড
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="text-xs text-ink-faint mt-1">
          কমপক্ষে ৮ অক্ষর।
        </p>
      </div>

      <SubmitButton label="নিবন্ধন করুন" pendingLabel="তৈরি হচ্ছে…" />

      <p className="text-sm text-ink-muted text-center">
        ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
        <Link href="/auth/login" className="text-accent hover:underline">
          লগইন করুন
        </Link>
      </p>
    </form>
  );
}
