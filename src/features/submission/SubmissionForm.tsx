'use client';

import { useState, useCallback } from 'react';
import type { Division, District } from '@/types/database';
import { structureTypeLabels } from '@/types/database';
import { submitMosque } from './actions';

interface Props {
  divisions: Division[];
  districts: District[];
}

export function SubmissionForm({ divisions, districts }: Props) {
  const [divisionId, setDivisionId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredDistricts = divisionId
    ? districts.filter(d => d.division_id === Number(divisionId))
    : [];

  const handleSubmit = useCallback(async (formData: FormData) => {
    setLoading(true);
    setError('');

    try {
      const result = await submitMosque(formData);
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || 'জমা দেওয়া সম্ভব হয়নি। আবার চেষ্টা করুন।');
      }
    } catch {
      setError('একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  }, []);

  if (submitted) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-light flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">ধন্যবাদ!</h2>
        <p className="text-sm text-ink-muted mb-4">
          আপনার মসজিদের তথ্য সফলভাবে জমা হয়েছে। যাচাইয়ের পর এটি ডিরেক্টরিতে প্রকাশিত হবে।
        </p>
        <a href="/masjid" className="btn btn-primary">ডিরেক্টরিতে ফিরুন</a>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-error">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <fieldset className="card p-5 space-y-4">
        <legend className="text-sm font-semibold text-ink">মসজিদের তথ্য</legend>

        <div>
          <label htmlFor="name_bn" className="block text-xs text-ink-muted mb-1">
            মসজিদের নাম (বাংলা) <span className="text-error">*</span>
          </label>
          <input id="name_bn" name="name_bn" required className="input" placeholder="যেমন: বায়তুল মোকাররম জাতীয় মসজিদ" />
        </div>

        <div>
          <label htmlFor="name_en" className="block text-xs text-ink-muted mb-1">
            মসজিদের নাম (ইংরেজি)
          </label>
          <input id="name_en" name="name_en" className="input" placeholder="e.g. Baitul Mukarram National Mosque" style={{ fontFamily: 'var(--font-latin)' }} />
        </div>
      </fieldset>

      {/* Location */}
      <fieldset className="card p-5 space-y-4">
        <legend className="text-sm font-semibold text-ink">অবস্থান</legend>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="division_id" className="block text-xs text-ink-muted mb-1">
              বিভাগ <span className="text-error">*</span>
            </label>
            <select
              id="division_id"
              name="division_id"
              required
              className="input"
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
            >
              <option value="">বিভাগ নির্বাচন করুন</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>{d.name_bn}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="district_id" className="block text-xs text-ink-muted mb-1">
              জেলা <span className="text-error">*</span>
            </label>
            <select id="district_id" name="district_id" required className="input">
              <option value="">জেলা নির্বাচন করুন</option>
              {filteredDistricts.map(d => (
                <option key={d.id} value={d.id}>{d.name_bn}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="area_name_bn" className="block text-xs text-ink-muted mb-1">এলাকা</label>
          <input id="area_name_bn" name="area_name_bn" className="input" placeholder="এলাকার নাম" />
        </div>

        <div>
          <label htmlFor="address_bn" className="block text-xs text-ink-muted mb-1">ঠিকানা</label>
          <textarea id="address_bn" name="address_bn" rows={2} className="input" placeholder="সম্পূর্ণ ঠিকানা" />
        </div>
      </fieldset>

      {/* Details */}
      <fieldset className="card p-5 space-y-4">
        <legend className="text-sm font-semibold text-ink">বিস্তারিত</legend>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="structure_type" className="block text-xs text-ink-muted mb-1">ধরন</label>
            <select id="structure_type" name="structure_type" className="input">
              <option value="unknown">নির্বাচন করুন</option>
              {Object.entries(structureTypeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v.bn}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="established_year" className="block text-xs text-ink-muted mb-1">প্রতিষ্ঠাকাল</label>
            <input id="established_year" name="established_year" type="number" min="600" max="2030" className="input" placeholder="যেমন: 1960" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
        </div>

        <div>
          <label htmlFor="description_bn" className="block text-xs text-ink-muted mb-1">বিবরণ</label>
          <textarea id="description_bn" name="description_bn" rows={3} className="input" placeholder="মসজিদ সম্পর্কে সংক্ষিপ্ত বিবরণ" />
        </div>
      </fieldset>

      {/* Contact */}
      <fieldset className="card p-5 space-y-4">
        <legend className="text-sm font-semibold text-ink">যোগাযোগ</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact_number" className="block text-xs text-ink-muted mb-1">ফোন নম্বর</label>
            <input id="contact_number" name="contact_number" type="tel" className="input" placeholder="01XXXXXXXXX" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs text-ink-muted mb-1">ইমেইল</label>
            <input id="email" name="email" type="email" className="input" placeholder="mosque@example.com" style={{ fontFamily: 'var(--font-latin)' }} />
          </div>
        </div>
      </fieldset>

      {/* Submitter Info */}
      <fieldset className="card p-5 space-y-4">
        <legend className="text-sm font-semibold text-ink">জমা দানকারীর তথ্য</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="submitter_name" className="block text-xs text-ink-muted mb-1">আপনার নাম</label>
            <input id="submitter_name" name="submitter_name" className="input" />
          </div>
          <div>
            <label htmlFor="submitter_contact" className="block text-xs text-ink-muted mb-1">আপনার ফোন/ইমেইল</label>
            <input id="submitter_contact" name="submitter_contact" className="input" />
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary btn-lg w-full disabled:opacity-50"
      >
        {loading ? 'জমা দেওয়া হচ্ছে...' : 'মসজিদের তথ্য জমা দিন'}
      </button>
    </form>
  );
}
