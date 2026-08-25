'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * Shared form primitives for the management panels.
 *
 * Every editor in /admin and /dashboard uses these, so labels stay tied to
 * inputs, required fields are marked the same way, and pending state is never
 * forgotten on one screen but not another.
 */

export interface ActionState {
  error?: string;
  success?: string;
}

export function FormMessage({ state }: { state: ActionState }) {
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

export function SubmitButton({
  label = 'সংরক্ষণ করুন',
  pendingLabel = 'সংরক্ষণ হচ্ছে…',
  className = 'btn btn-primary',
}: { label?: string; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function Label({
  htmlFor, children, required,
}: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-ink mb-1.5">
      {children}
      {required && <span style={{ color: 'var(--color-error)' }}> *</span>}
    </label>
  );
}

interface BaseProps {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  latin?: boolean;
}

export function Field({
  name, label, defaultValue, required, hint, placeholder, latin,
  type = 'text', min, max, step,
}: BaseProps & { type?: string; min?: number | string; max?: number | string; step?: string }) {
  const id = `f-${name}`;
  return (
    <div>
      <Label htmlFor={id} required={required}>{label}</Label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="input"
        aria-describedby={hint ? `${id}-hint` : undefined}
        style={latin ? { fontFamily: 'var(--font-latin)' } : undefined}
      />
      {hint && <p id={`${id}-hint`} className="text-xs text-ink-faint mt-1">{hint}</p>}
    </div>
  );
}

export function TextArea({
  name, label, defaultValue, required, hint, placeholder, rows = 3, maxLength,
}: BaseProps & { rows?: number; maxLength?: number }) {
  const id = `f-${name}`;
  return (
    <div>
      <Label htmlFor={id} required={required}>{label}</Label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ''}
        required={required}
        placeholder={placeholder}
        className="input"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && <p id={`${id}-hint`} className="text-xs text-ink-faint mt-1">{hint}</p>}
    </div>
  );
}

export function Select({
  name, label, defaultValue, required, hint, options,
}: BaseProps & { options: Array<[string, string]> }) {
  const id = `f-${name}`;
  return (
    <div>
      <Label htmlFor={id} required={required}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        className="input"
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {hint && <p id={`${id}-hint`} className="text-xs text-ink-faint mt-1">{hint}</p>}
    </div>
  );
}

export function Checkbox({
  name, label, defaultChecked, hint, tone,
}: { name: string; label: string; defaultChecked?: boolean; hint?: string; tone?: 'warning' }) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          className="mt-0.5"
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span className="text-ink">{label}</span>
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-xs mt-1 ml-6"
          style={{ color: tone === 'warning' ? 'var(--color-warning)' : 'var(--color-ink-faint)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Two-step delete. Destructive actions never fire on a single click.
 */
export function ConfirmDelete({
  action, hidden, label = 'মুছুন', confirmLabel = 'নিশ্চিত',
}: {
  action: (formData: FormData) => void;
  hidden: Record<string, string>;
  label?: string;
  confirmLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)}>
        {label}
      </button>
    );
  }

  return (
    <form action={action} className="inline-flex items-center gap-1">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton label={confirmLabel} pendingLabel="…" className="btn btn-secondary btn-sm" />
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
        বাতিল
      </button>
    </form>
  );
}

/** Collapsible "add new" panel so long list pages stay scannable. */
export function Disclosure({
  summary, children, defaultOpen = false,
}: { summary: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="card p-5" open={defaultOpen}>
      <summary className="cursor-pointer font-semibold text-ink select-none">{summary}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
