import Link from 'next/link';
import type { MasjidSearchResult } from '@/types/database';
import { structureTypeLabels, verificationLabels } from '@/types/database';

interface Props {
  results: MasjidSearchResult[];
}

export function DirectoryResults({ results }: Props) {
  return (
    <div className="space-y-3">
      {results.map((masjid) => (
        <MosqueCard key={masjid.id} masjid={masjid} />
      ))}
    </div>
  );
}

function MosqueCard({ masjid }: { masjid: MasjidSearchResult }) {
  return (
    <Link
      href={`/masjid/${masjid.slug}`}
      className="card p-4 flex gap-4 hover:border-accent transition-all group"
    >
      {/* Image placeholder or thumbnail */}
      <div className="w-20 h-20 shrink-0 rounded-sm bg-surface-alt flex items-center justify-center overflow-hidden">
        {masjid.thumbnail_path ? (
          <img
            src={masjid.thumbnail_path}
            alt={masjid.name_bn}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-ink-faint">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-ink group-hover:text-accent transition-colors truncate">
              {masjid.name_bn}
            </h3>
            {masjid.name_en && (
              <p className="text-xs text-ink-muted truncate" style={{ fontFamily: 'var(--font-latin)' }}>
                {masjid.name_en}
              </p>
            )}
          </div>
          <VerificationBadge status={masjid.verification_status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-ink-muted">
          {masjid.district_name_bn && (
            <span>{masjid.district_name_bn}</span>
          )}
          {masjid.upazila_name_bn && (
            <>
              <span className="text-border-strong">·</span>
              <span>{masjid.upazila_name_bn}</span>
            </>
          )}
          {masjid.area_name_bn && (
            <>
              <span className="text-border-strong">·</span>
              <span>{masjid.area_name_bn}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <span className="badge badge-unverified">
            {structureTypeLabels[masjid.structure_type]?.bn || 'অজানা'}
          </span>
          {masjid.rating_count > 0 && (
            <span className="text-xs text-ink-muted flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-warning">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span style={{ fontFamily: 'var(--font-latin)' }}>{masjid.rating_average}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function VerificationBadge({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <span className="badge badge-verified shrink-0">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        যাচাইকৃত
      </span>
    );
  }
  return null;
}
