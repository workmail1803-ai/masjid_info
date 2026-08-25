import type { Metadata } from 'next';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { toBanglaDigits } from '@/lib/services/mosque.service';
import {
  DocumentUploadForm, DocumentVisibilityToggle, DocumentDelete,
  Disclosure, type DocumentValues,
} from '@/features/mosque/CampaignForms';

export const metadata: Metadata = { title: 'নথি', robots: { index: false, follow: false } };

const DOC_LABEL: Record<string, string> = {
  monthly_financial: 'মাসিক আর্থিক', annual_financial: 'বার্ষিক আর্থিক', audit: 'নিরীক্ষা',
  donation_report: 'দান প্রতিবেদন', zakat_report: 'যাকাত প্রতিবেদন',
  construction_invoice: 'নির্মাণ চালান', utility_bill: 'ইউটিলিটি বিল', grant: 'অনুদান',
  project_completion: 'প্রকল্প সমাপ্তি', committee_resolution: 'কমিটির সিদ্ধান্ত', other: 'অন্যান্য',
};

function fileSize(bytes: number | null): string {
  if (!bytes) return '—';
  const kb = bytes / 1024;
  return kb < 1024 ? `${toBanglaDigits(Math.round(kb))} KB` : `${toBanglaDigits((kb / 1024).toFixed(1))} MB`;
}

export default async function DocumentsPage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  await requireMosqueCapability(masjidId, 'manage_documents', `/dashboard/mosque/${masjidId}/documents`);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('mosque_documents').select('*').eq('masjid_id', masjidId)
    .order('created_at', { ascending: false }).limit(200);
  if (error) console.error('Document load failed:', error.message);

  const docs = (data ?? []) as unknown as (DocumentValues & { file_path: string })[];

  // The bucket is private, so every link is a short-lived signed URL minted
  // here on the server — there is no guessable public path to a document.
  const signed = await Promise.all(
    docs.map((d) =>
      supabase.storage.from('mosque-documents').createSignedUrl(d.file_path, 3600)
    )
  );

  return (
    <div className="max-w-3xl space-y-5">
      <Disclosure summary="+ নতুন নথি আপলোড">
        <DocumentUploadForm masjidId={masjidId} />
      </Disclosure>

      {docs.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted">কোনো নথি নেই।</p>
          <p className="text-sm text-ink-faint mt-1">
            মাসিক ও বার্ষিক আর্থিক প্রতিবেদন প্রকাশ করলে স্বচ্ছতা স্কোর বাড়ে।
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-ink-muted uppercase">
              <tr>
                <th className="text-left p-3">শিরোনাম</th>
                <th className="text-left p-3">ধরন</th>
                <th className="text-left p-3">অবস্থা</th>
                <th className="text-right p-3">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {docs.map((d, i) => (
                <tr key={d.id}>
                  <td className="p-3">
                    <span className="text-ink">{d.title_bn}</span>
                    <p className="text-xs text-ink-faint">
                      {fileSize(d.file_size_bytes)} · {new Date(d.created_at).toLocaleDateString('bn-BD')}
                    </p>
                  </td>
                  <td className="p-3 text-ink-muted">{DOC_LABEL[d.doc_type] ?? d.doc_type}</td>
                  <td className="p-3">
                    <span className={`badge ${d.is_public ? 'badge-verified' : 'badge-pending'}`}>
                      {d.is_public ? 'প্রকাশিত' : '🔒 ব্যক্তিগত'}
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {signed[i].data?.signedUrl && (
                      <a href={signed[i].data.signedUrl} target="_blank" rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm">দেখুন</a>
                    )}
                    <DocumentVisibilityToggle masjidId={masjidId} documentId={d.id} isPublic={d.is_public} />
                    <DocumentDelete masjidId={masjidId} documentId={d.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-ink-faint">
        নথিগুলো একটি ব্যক্তিগত স্টোরেজে রাখা হয়। লিংক সীমিত সময়ের জন্য তৈরি হয় — কেউ
        ঠিকানা অনুমান করে নথি দেখতে পারে না।
      </p>
    </div>
  );
}
