'use client';

import { useState } from 'react';
import { LoginForm } from './AuthForms';
import { EmailCodeForm } from './EmailCodeForm';

/**
 * Two ways in: an emailed code (no password to manage) or email + password.
 * Both land on the same account — Supabase keys the user on the email address,
 * so someone who registered with a password can still sign in with a code.
 */
export function LoginTabs({ redirectTo }: { redirectTo?: string }) {
  const [mode, setMode] = useState<'code' | 'password'>('code');

  return (
    <div>
      <div
        className="flex gap-1 p-1 rounded-md mb-5"
        style={{ background: 'var(--color-surface-alt)' }}
        role="tablist"
        aria-label="লগইন পদ্ধতি"
      >
        {([
          ['code', 'ইমেইল কোড'],
          ['password', 'পাসওয়ার্ড'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className="flex-1 text-sm py-1.5 rounded-sm transition-colors"
            style={
              mode === value
                ? { background: 'var(--color-surface-elevated)', color: 'var(--color-ink)', fontWeight: 600 }
                : { color: 'var(--color-ink-muted)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'code' ? (
        <EmailCodeForm redirectTo={redirectTo} />
      ) : (
        <LoginForm redirectTo={redirectTo} />
      )}
    </div>
  );
}
