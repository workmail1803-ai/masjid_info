'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateMasjidAdmin } from './submission-actions';

type ActionResult = { success: boolean; error?: string } | null;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? 'সংরক্ষণ হচ্ছে…' : '💾 সংরক্ষণ করুন'}
    </button>
  );
}

interface MasjidEditFormProps {
  masjid: Record<string, unknown>;
  divisions: { id: number; name_bn: string }[];
  districts: { id: number; division_id: number; name_bn: string }[];
}

export function MasjidEditForm({ masjid, divisions, districts }: MasjidEditFormProps) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult, formData: FormData) => updateMasjidAdmin(formData),
    null
  );

  const m = masjid;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={m.id as string} />

      {state?.error && (
        <p role="alert" className="text-sm rounded-md px-3 py-2"
          style={{ background: 'color-mix(in srgb, var(--color-error) 8%, transparent)', color: 'var(--color-error)' }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm rounded-md px-3 py-2"
          style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
          ✓ সফলভাবে সংরক্ষিত!
        </p>
      )}

      {/* Basic Info */}
      <fieldset className="card p-6">
        <legend className="font-semibold text-ink mb-4">মৌলিক তথ্য</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">মসজিদের নাম (বাংলা) *</label>
            <input name="name_bn" defaultValue={(m.name_bn as string) || ''} required className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">মসজিদের নাম (ইংরেজি)</label>
            <input name="name_en" defaultValue={(m.name_en as string) || ''} className="input w-full" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">এলাকা (বাংলা)</label>
            <input name="area_name_bn" defaultValue={(m.area_name_bn as string) || ''} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">ঠিকানা</label>
            <input name="address_bn" defaultValue={(m.address_bn as string) || ''} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">যোগাযোগ নম্বর</label>
            <input name="contact_number" defaultValue={(m.contact_number as string) || ''} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">ইমেইল</label>
            <input name="email" type="email" defaultValue={(m.email as string) || ''} className="input w-full" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">প্রতিষ্ঠার বছর</label>
            <input name="established_year" type="number" defaultValue={(m.established_year as number) || ''} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">কাঠামো</label>
            <select name="structure_type" defaultValue={(m.structure_type as string) || 'unknown'} className="input w-full">
              <option value="small">ছোট</option>
              <option value="medium">মাঝারি</option>
              <option value="large">বড়</option>
              <option value="multi_storey">বহুতল</option>
              <option value="tin_shed">টিনের</option>
              <option value="semi_permanent">আধা-পাকা</option>
              <option value="under_construction">নির্মাণাধীন</option>
              <option value="unknown">অজানা</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-ink mb-1">বিবরণ</label>
          <textarea name="description_bn" defaultValue={(m.description_bn as string) || ''} className="input w-full" rows={3} />
        </div>
      </fieldset>

      {/* Geography */}
      <fieldset className="card p-6">
        <legend className="font-semibold text-ink mb-4">অবস্থান</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">বিভাগ</label>
            <select name="division_id" defaultValue={(m.division_id as number) || ''} className="input w-full">
              <option value="">নির্বাচন করুন</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name_bn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">জেলা</label>
            <select name="district_id" defaultValue={(m.district_id as number) || ''} className="input w-full">
              <option value="">নির্বাচন করুন</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.name_bn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">অক্ষাংশ</label>
            <input name="latitude" type="number" step="any" defaultValue={(m.latitude as number) || ''} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">দ্রাঘিমাংশ</label>
            <input name="longitude" type="number" step="any" defaultValue={(m.longitude as number) || ''} className="input w-full" />
          </div>
        </div>
      </fieldset>

      {/* Status */}
      <fieldset className="card p-6">
        <legend className="font-semibold text-ink mb-4">অবস্থা</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">প্রকাশনা অবস্থা</label>
            <select name="status" defaultValue={(m.status as string) || 'draft'} className="input w-full">
              <option value="draft">ড্রাফট</option>
              <option value="published">প্রকাশিত</option>
              <option value="archived">আর্কাইভ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">যাচাই অবস্থা</label>
            <select name="verification_status" defaultValue={(m.verification_status as string) || 'unverified'} className="input w-full">
              <option value="unverified">যাচাই হয়নি</option>
              <option value="pending">অপেক্ষমান</option>
              <option value="verified">যাচাইকৃত ✓</option>
              <option value="needs_review">পর্যালোচনা প্রয়োজন</option>
              <option value="rejected">প্রত্যাখ্যাত</option>
              <option value="archived">আর্কাইভ</option>
            </select>
          </div>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <SaveButton />
      </div>
    </form>
  );
}
