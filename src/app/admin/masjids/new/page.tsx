import { getDivisions, getDistricts } from '@/lib/services/geography.service';
import { AdminMasjidForm } from '@/features/admin/AdminMasjidForm';

export default async function NewMasjidPage() {
  const [divisions, districts] = await Promise.all([getDivisions(), getDistricts()]);

  return (
    <div>
      <h1 className="text-xl font-bold text-ink mb-6">নতুন মসজিদ যোগ করুন</h1>
      <AdminMasjidForm divisions={divisions} districts={districts} />
    </div>
  );
}
