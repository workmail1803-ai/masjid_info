'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useTransition } from 'react';
import type { Division, District, DirectoryFilters } from '@/types/database';
import { structureTypeLabels, verificationLabels } from '@/types/database';

interface Props {
  divisions: Division[];
  districts: District[];
  currentFilters: DirectoryFilters;
}

export function DirectorySearch({ divisions, districts, currentFilters }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(currentFilters.q || '');

  const filteredDistricts = currentFilters.division_id
    ? districts.filter(d => d.division_id === currentFilters.division_id)
    : districts;

  const updateFilters = useCallback((updates: Partial<DirectoryFilters>) => {
    const params = new URLSearchParams();
    const merged = { ...currentFilters, ...updates, page: 1 };

    if (merged.q) params.set('q', merged.q);
    if (merged.division_id) params.set('division_id', String(merged.division_id));
    if (merged.district_id) params.set('district_id', String(merged.district_id));
    if (merged.upazila_id) params.set('upazila_id', String(merged.upazila_id));
    if (merged.structure_type) params.set('structure_type', merged.structure_type);
    if (merged.verification) params.set('verification', merged.verification);
    if (merged.has_image !== undefined) params.set('has_image', String(merged.has_image));

    startTransition(() => {
      router.push(`/masjid?${params.toString()}`);
    });
  }, [currentFilters, router]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: query });
  }, [query, updateFilters]);

  const clearFilters = useCallback(() => {
    setQuery('');
    startTransition(() => {
      router.push('/masjid');
    });
  }, [router]);

  return (
    <div className="card p-4 lg:sticky lg:top-20">
      <h2 className="text-sm font-semibold text-ink mb-3">অনুসন্ধান ও ফিল্টার</h2>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="মসজিদ খুঁজুন..."
            className="input pr-10"
            aria-label="মসজিদ অনুসন্ধান"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-accent"
            aria-label="অনুসন্ধান"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {/* Division filter */}
        <FilterSelect
          label="বিভাগ"
          value={currentFilters.division_id?.toString() || ''}
          onChange={(v) => updateFilters({ division_id: v ? Number(v) : undefined, district_id: undefined, upazila_id: undefined })}
          options={divisions.map(d => ({ value: String(d.id), label: d.name_bn }))}
        />

        {/* District filter */}
        <FilterSelect
          label="জেলা"
          value={currentFilters.district_id?.toString() || ''}
          onChange={(v) => updateFilters({ district_id: v ? Number(v) : undefined, upazila_id: undefined })}
          options={filteredDistricts.map(d => ({ value: String(d.id), label: d.name_bn }))}
        />

        {/* Structure type */}
        <FilterSelect
          label="ধরন"
          value={currentFilters.structure_type || ''}
          onChange={(v) => updateFilters({ structure_type: v as DirectoryFilters['structure_type'] || undefined })}
          options={Object.entries(structureTypeLabels).map(([k, v]) => ({ value: k, label: v.bn }))}
        />

        {/* Verification */}
        <FilterSelect
          label="যাচাই অবস্থা"
          value={currentFilters.verification || ''}
          onChange={(v) => updateFilters({ verification: v as DirectoryFilters['verification'] || undefined })}
          options={[
            { value: 'verified', label: verificationLabels.verified.bn },
            { value: 'unverified', label: verificationLabels.unverified.bn },
            { value: 'pending', label: verificationLabels.pending.bn },
          ]}
        />

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2 pt-2">
          <QuickFilter
            label="ছবি আছে"
            active={currentFilters.has_image === true}
            onClick={() => updateFilters({ has_image: currentFilters.has_image === true ? undefined : true })}
          />
          <QuickFilter
            label="যোগাযোগ আছে"
            active={currentFilters.has_contact === true}
            onClick={() => updateFilters({ has_contact: currentFilters.has_contact === true ? undefined : true })}
          />
        </div>

        {/* Clear */}
        {(currentFilters.q || currentFilters.division_id || currentFilters.district_id || currentFilters.structure_type || currentFilters.verification) && (
          <button onClick={clearFilters} className="btn btn-ghost btn-sm w-full mt-2 text-error">
            ফিল্টার মুছুন
          </button>
        )}
      </div>

      {isPending && (
        <div className="mt-3 text-center text-xs text-ink-muted">অনুসন্ধান হচ্ছে...</div>
      )}
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs text-ink-muted mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input text-sm py-1.5"
      >
        <option value="">সকল</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function QuickFilter({
  label, active, onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`badge cursor-pointer transition-colors ${active ? 'badge-verified' : 'badge-unverified hover:bg-accent-light'}`}
    >
      {label}
    </button>
  );
}
