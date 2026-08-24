'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export function HomepageSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/masjid?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/masjid');
    }
  }, [query, router]);

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="বাংলাদেশের যেকোনো মসজিদ খুঁজুন..."
        className="input input-lg pr-14 border-border-strong"
        aria-label="মসজিদ খুঁজুন"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary px-4 py-2"
        aria-label="অনুসন্ধান করুন"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
    </form>
  );
}
