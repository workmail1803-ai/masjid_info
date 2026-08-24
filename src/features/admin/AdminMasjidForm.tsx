'use client';

import { useState, useCallback } from 'react';
import type { Division, District } from '@/types/database';
import { structureTypeLabels } from '@/types/database';
import { createMasjidAdmin } from './actions';

interface Props {
  divisions: Division[];
  districts: District[];
}

export function AdminMasjidForm({ divisions, districts }: Props) {
  const [divisionId, setDivisionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const filteredDistricts = divisionId ? districts.filter(d => d.division_id === Number(divisionId)) : [];

  const handleSubmit = useCallback(async (formData: FormData) => {
    setSaving(true);
    setError('');
    try {
      const result = await createMasjidAdmin(formData);
      if (result.success) {
        setSaved(true);
        // Reset after 2 seconds for next entry
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error || 'সংরক্ষণ করা যায়নি');
      }
    } catch {
      setError('একটি সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <form action={handleSubmit} className="space-y-6 max-w-4xl">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-error">{error}</div>}
      {saved && <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-verified">✓ সফলভাবে সংরক্ষিত হয়েছে</div>}

      {/* IDENTITY */}
      <fieldset className="card p-5 space-y-4">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wider" style={{ fontFamily: 'var(--font-latin)' }}>Identity</legend>
        <p className="text-xs text-ink-muted">কোড স্বয়ংক্রিয়ভাবে তৈরি হবে</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ink-muted mb-1">মসজিদের নাম (বাংলা) *</label>
            <input name="name_bn" required className="input" autoFocus />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">মসজিদের নাম (ইংরেজি)</label>
            <input name="name_en" className="input" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
        </div>
      </fieldset>

      {/* LOCATION */}
      <fieldset className="card p-5 space-y-4">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wider" style={{ fontFamily: 'var(--font-latin)' }}>Location</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-ink-muted mb-1">বিভাগ *</label>
            <select name="division_id" required className="input" value={divisionId} onChange={e => setDivisionId(e.target.value)}>
              <option value="">নির্বাচন করুন</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name_bn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">জেলা *</label>
            <select name="district_id" required className="input">
              <option value="">নির্বাচন করুন</option>
              {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name_bn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">উপজেলা</label>
            <input name="upazila_id" className="input" placeholder="ID" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ink-muted mb-1">এলাকা (বাংলা)</label>
            <input name="area_name_bn" className="input" />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">এলাকা (ইংরেজি)</label>
            <input name="area_name_en" className="input" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1">ঠিকানা (বাংলা)</label>
          <textarea name="address_bn" rows={2} className="input" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ink-muted mb-1">অক্ষাংশ</label>
            <input name="latitude" type="number" step="any" className="input" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">দ্রাঘিমাংশ</label>
            <input name="longitude" type="number" step="any" className="input" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
        </div>
      </fieldset>

      {/* DETAILS */}
      <fieldset className="card p-5 space-y-4">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wider" style={{ fontFamily: 'var(--font-latin)' }}>Details</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ink-muted mb-1">ধরন</label>
            <select name="structure_type" className="input">
              {Object.entries(structureTypeLabels).map(([k, v]) => <option key={k} value={k}>{v.bn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">প্রতিষ্ঠাকাল</label>
            <input name="established_year" type="number" min="600" max="2030" className="input" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1">বিবরণ (বাংলা)</label>
          <textarea name="description_bn" rows={3} className="input" />
        </div>
      </fieldset>

      {/* CONTACT */}
      <fieldset className="card p-5 space-y-4">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wider" style={{ fontFamily: 'var(--font-latin)' }}>Contact</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ink-muted mb-1">ফোন</label>
            <input name="contact_number" type="tel" className="input" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">ইমেইল</label>
            <input name="email" type="email" className="input" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
        </div>
      </fieldset>

      {/* VERIFICATION */}
      <fieldset className="card p-5 space-y-4">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wider" style={{ fontFamily: 'var(--font-latin)' }}>Verification</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ink-muted mb-1">প্রকাশনার অবস্থা</label>
            <select name="status" className="input">
              <option value="draft">ড্রাফট</option>
              <option value="published">প্রকাশিত</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">যাচাই অবস্থা</label>
            <select name="verification_status" className="input">
              <option value="unverified">যাচাই হয়নি</option>
              <option value="pending">অপেক্ষমান</option>
              <option value="verified">যাচাইকৃত</option>
            </select>
          </div>
        </div>
      </fieldset>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn btn-primary btn-lg disabled:opacity-50">
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'মসজিদ সংরক্ষণ করুন'}
        </button>
        <a href="/admin/masjids" className="btn btn-ghost btn-lg">বাতিল</a>
      </div>
    </form>
  );
}
