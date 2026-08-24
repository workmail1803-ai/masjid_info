'use client';

import { useState } from 'react';
import Link from 'next/link';
import { navigation } from '@/config/navigation';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost p-2"
        aria-label="মেনু খুলুন"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-surface-elevated border-b border-border shadow-md z-50">
          <nav className="container-wide py-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {navigation.main.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="px-4 py-3 text-base text-ink-light hover:text-ink hover:bg-surface-alt rounded-md transition-colors"
              >
                {item.labelBn}
              </Link>
            ))}
            <div className="divider my-2" />
            <div className="flex gap-2 px-4">
              <Link
                href={navigation.cta.primary.href}
                onClick={() => setIsOpen(false)}
                className="btn btn-primary flex-1"
              >
                {navigation.cta.primary.labelBn}
              </Link>
              <Link
                href={navigation.cta.secondary.href}
                onClick={() => setIsOpen(false)}
                className="btn btn-secondary flex-1"
              >
                {navigation.cta.secondary.labelBn}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
