'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { approveSubmission, rejectSubmission } from './submission-actions';

type ActionResult = { success: boolean; error?: string } | null;

function SubmitBtn({ label, pending, variant = 'primary' }: { label: string; pending: string; variant?: 'primary' | 'danger' }) {
  const { pending: isPending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={isPending}
      className={`btn ${variant === 'danger' ? 'btn-ghost text-error' : 'btn-primary'} btn-sm`}
    >
      {isPending ? pending : label}
    </button>
  );
}

export function ApproveForm({ id }: { id: string }) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult, formData: FormData) => approveSubmission(formData),
    null
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      {state?.error && <p className="text-sm text-error mb-2">{state.error}</p>}
      {state?.success && <p className="text-sm text-accent mb-2">✓ অনুমোদিত!</p>}
      <SubmitBtn label="✓ অনুমোদন করুন" pending="অনুমোদন হচ্ছে…" />
    </form>
  );
}

export function RejectForm({ id }: { id: string }) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult, formData: FormData) => rejectSubmission(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <textarea
        name="notes"
        placeholder="প্রত্যাখ্যানের কারণ (ঐচ্ছিক)..."
        className="input w-full text-sm"
        rows={2}
      />
      {state?.error && <p className="text-sm text-error">{state.error}</p>}
      {state?.success && <p className="text-sm text-accent">✓ প্রত্যাখ্যাত!</p>}
      <SubmitBtn label="✗ প্রত্যাখ্যান করুন" pending="প্রত্যাখ্যান হচ্ছে…" variant="danger" />
    </form>
  );
}
