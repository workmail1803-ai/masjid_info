'use client';

import { useActionState } from 'react';
import {
  Field, TextArea, Select, Checkbox, SubmitButton, FormMessage, ConfirmDelete, Disclosure,
  type ActionState,
} from '@/components/form/Fields';
import {
  updateMosqueProfile, savePrayerTimes,
  saveStaff, deleteStaff,
  saveCommitteeMember, deleteCommitteeMember,
  saveService, deleteService,
  saveAnnouncement, deleteAnnouncement,
  saveEvent, deleteEvent,
} from './profile-actions';

const EMPTY: ActionState = {};

const STRUCTURE_OPTIONS: Array<[string, string]> = [
  ['unknown', 'অজানা'], ['small', 'ছোট'], ['medium', 'মাঝারি'], ['large', 'বড়'],
  ['multi_storey', 'বহুতল'], ['tin_shed', 'টিন শেড'],
  ['semi_permanent', 'আধা-পাকা'], ['under_construction', 'নির্মাণাধীন'],
];

const POSITION_OPTIONS: Array<[string, string]> = [
  ['imam', 'ইমাম'], ['assistant_imam', 'সহকারী ইমাম'], ['muazzin', 'মুয়াজ্জিন'],
  ['khadem', 'খাদেম'], ['teacher', 'শিক্ষক'], ['security', 'নিরাপত্তা'], ['other', 'অন্যান্য'],
];

// ============================================================
// Profile
// ============================================================
export interface ProfileValues {
  id: string;
  name_bn: string; name_en: string | null;
  area_name_bn: string | null; address_bn: string | null;
  description_bn: string | null; history_bn: string | null;
  established_year: number | null; capacity: number | null; floors: number | null;
  official_phone: string | null; official_email: string | null;
  latitude: number | null; longitude: number | null;
  structure_type: string;
  has_women_prayer_area: boolean; has_wudu_facility: boolean; has_toilet: boolean;
  has_parking: boolean; is_wheelchair_accessible: boolean; has_ac: boolean; has_library: boolean;
}

export function ProfileForm({ masjid }: { masjid: ProfileValues }) {
  const [state, action] = useActionState(updateMosqueProfile, EMPTY);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="masjid_id" value={masjid.id} />
      <FormMessage state={state} />

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-ink">মূল তথ্য</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field name="name_bn" label="মসজিদের নাম (বাংলা)" defaultValue={masjid.name_bn} required />
          <Field name="name_en" label="নাম (ইংরেজি)" defaultValue={masjid.name_en} latin />
          <Field name="area_name_bn" label="এলাকা" defaultValue={masjid.area_name_bn} />
          <Select name="structure_type" label="কাঠামো" defaultValue={masjid.structure_type} options={STRUCTURE_OPTIONS} />
        </div>
        <TextArea name="address_bn" label="ঠিকানা" defaultValue={masjid.address_bn} rows={2} />
        <TextArea name="description_bn" label="বিবরণ" defaultValue={masjid.description_bn} rows={4}
          hint="সর্বসাধারণের জন্য প্রকাশিত হবে।" />
        <TextArea name="history_bn" label="ইতিহাস" defaultValue={masjid.history_bn} rows={4} />
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-ink">যোগাযোগ ও অবস্থান</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field name="official_phone" label="অফিসিয়াল ফোন" defaultValue={masjid.official_phone} latin
            hint="মসজিদের নম্বর — ব্যক্তিগত নয়।" />
          <Field name="official_email" label="অফিসিয়াল ইমেইল" type="email" defaultValue={masjid.official_email} latin />
          <Field name="latitude" label="অক্ষাংশ" type="number" step="any" defaultValue={masjid.latitude} latin />
          <Field name="longitude" label="দ্রাঘিমাংশ" type="number" step="any" defaultValue={masjid.longitude} latin />
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-ink">সুযোগ-সুবিধা</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field name="established_year" label="প্রতিষ্ঠার বছর" type="number" min={600} max={2100}
            defaultValue={masjid.established_year} latin />
          <Field name="capacity" label="ধারণক্ষমতা (মুসল্লি)" type="number" min={0}
            defaultValue={masjid.capacity} latin />
          <Field name="floors" label="তলা সংখ্যা" type="number" min={0} defaultValue={masjid.floors} latin />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          <Checkbox name="has_women_prayer_area" label="মহিলাদের নামাজের ব্যবস্থা" defaultChecked={masjid.has_women_prayer_area} />
          <Checkbox name="has_wudu_facility" label="ওজুখানা" defaultChecked={masjid.has_wudu_facility} />
          <Checkbox name="has_toilet" label="টয়লেট" defaultChecked={masjid.has_toilet} />
          <Checkbox name="has_parking" label="পার্কিং" defaultChecked={masjid.has_parking} />
          <Checkbox name="is_wheelchair_accessible" label="হুইলচেয়ার প্রবেশযোগ্য" defaultChecked={masjid.is_wheelchair_accessible} />
          <Checkbox name="has_ac" label="শীতাতপ নিয়ন্ত্রিত" defaultChecked={masjid.has_ac} />
          <Checkbox name="has_library" label="লাইব্রেরি" defaultChecked={masjid.has_library} />
        </div>
      </div>

      <SubmitButton className="btn btn-primary btn-lg" />
    </form>
  );
}

// ============================================================
// Prayer times
// ============================================================
export interface PrayerValues {
  kind: string;
  fajr: string | null; sunrise: string | null; dhuhr: string | null; asr: string | null;
  maghrib: string | null; isha: string | null; jumuah: string | null; jumuah_khutbah: string | null;
  taraweeh: string | null; sehri_end: string | null; iftar: string | null;
  eid_jamaat_1: string | null; eid_jamaat_2: string | null;
  eid_note_bn: string | null; note_bn: string | null;
}

export function PrayerForm({
  masjidId, kind, values, title,
}: { masjidId: string; kind: 'daily' | 'ramadan' | 'eid'; values?: PrayerValues; title: string }) {
  const [state, action] = useActionState(savePrayerTimes, EMPTY);

  return (
    <form action={action} className="card p-5 space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <input type="hidden" name="kind" value={kind} />
      <h3 className="font-semibold text-ink">{title}</h3>
      <FormMessage state={state} />

      {kind === 'daily' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field name="fajr" label="ফজর" type="time" defaultValue={values?.fajr} latin />
          <Field name="sunrise" label="সূর্যোদয়" type="time" defaultValue={values?.sunrise} latin />
          <Field name="dhuhr" label="যোহর" type="time" defaultValue={values?.dhuhr} latin />
          <Field name="asr" label="আসর" type="time" defaultValue={values?.asr} latin />
          <Field name="maghrib" label="মাগরিব" type="time" defaultValue={values?.maghrib} latin />
          <Field name="isha" label="এশা" type="time" defaultValue={values?.isha} latin />
          <Field name="jumuah" label="জুমা" type="time" defaultValue={values?.jumuah} latin />
          <Field name="jumuah_khutbah" label="খুতবা" type="time" defaultValue={values?.jumuah_khutbah} latin />
        </div>
      )}

      {kind === 'ramadan' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field name="sehri_end" label="সেহরি শেষ" type="time" defaultValue={values?.sehri_end} latin />
          <Field name="iftar" label="ইফতার" type="time" defaultValue={values?.iftar} latin />
          <Field name="taraweeh" label="তারাবি" type="time" defaultValue={values?.taraweeh} latin />
        </div>
      )}

      {kind === 'eid' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field name="eid_jamaat_1" label="১ম জামাত" type="time" defaultValue={values?.eid_jamaat_1} latin />
            <Field name="eid_jamaat_2" label="২য় জামাত" type="time" defaultValue={values?.eid_jamaat_2} latin />
          </div>
          <TextArea name="eid_note_bn" label="ঈদ সংক্রান্ত নোট" defaultValue={values?.eid_note_bn} rows={2} />
        </>
      )}

      <TextArea name="note_bn" label="নোট" defaultValue={values?.note_bn} rows={2} />
      <SubmitButton />
    </form>
  );
}

// ============================================================
// Staff
// ============================================================
export interface StaffValues {
  id: string; name_bn: string; name_en: string | null; position: string;
  position_label_bn: string | null; qualifications_bn: string | null;
  languages: string[] | null; serving_since: string | null; bio_bn: string | null;
  private_phone: string | null; contact_consent_public: boolean; is_active: boolean;
  sort_order: number;
}

export function StaffForm({ masjidId, staff }: { masjidId: string; staff?: StaffValues }) {
  const [state, action] = useActionState(saveStaff, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      {staff && <input type="hidden" name="staff_id" value={staff.id} />}
      <FormMessage state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="name_bn" label="নাম (বাংলা)" defaultValue={staff?.name_bn} required />
        <Field name="name_en" label="নাম (ইংরেজি)" defaultValue={staff?.name_en} latin />
        <Select name="position" label="পদ" defaultValue={staff?.position ?? 'imam'} options={POSITION_OPTIONS} />
        <Field name="position_label_bn" label="পদের নাম (ঐচ্ছিক)" defaultValue={staff?.position_label_bn} />
        <Field name="serving_since" label="দায়িত্ব শুরু" type="date" defaultValue={staff?.serving_since} latin />
        <Field name="sort_order" label="ক্রম" type="number" min={0} defaultValue={staff?.sort_order ?? 0} latin />
      </div>

      <TextArea name="qualifications_bn" label="যোগ্যতা" defaultValue={staff?.qualifications_bn} rows={2} />
      <Field name="languages" label="ভাষা" defaultValue={staff?.languages?.join(', ')}
        placeholder="বাংলা, আরবি, ইংরেজি" hint="কমা দিয়ে আলাদা করুন।" />
      <TextArea name="bio_bn" label="সংক্ষিপ্ত পরিচিতি" defaultValue={staff?.bio_bn} rows={3} />

      <Field name="private_phone" label="ব্যক্তিগত মোবাইল" defaultValue={staff?.private_phone} latin />
      <Checkbox
        name="contact_consent_public"
        label="এই নম্বর সর্বসাধারণের জন্য প্রকাশ করা যাবে"
        defaultChecked={staff?.contact_consent_public}
        tone="warning"
        hint="🔒 সম্মতি ছাড়া ব্যক্তিগত নম্বর কখনো প্রকাশ করা হয় না। অনুমতি না দিলে সর্বসাধারণ শুধু মসজিদের অফিসিয়াল নম্বর দেখবে।"
      />
      <Checkbox name="inactive" label="নিষ্ক্রিয় (তালিকা থেকে লুকান)" defaultChecked={staff ? !staff.is_active : false} />

      <SubmitButton label={staff ? 'হালনাগাদ করুন' : 'যুক্ত করুন'} />
    </form>
  );
}

export function StaffDelete({ masjidId, staffId }: { masjidId: string; staffId: string }) {
  const [, action] = useActionState(deleteStaff, EMPTY);
  return <ConfirmDelete action={action} hidden={{ masjid_id: masjidId, staff_id: staffId }} />;
}

// ============================================================
// Committee
// ============================================================
export interface CommitteeValues {
  id: string; name_bn: string; name_en: string | null; role_label_bn: string;
  term_start: string | null; term_end: string | null; formation_date: string | null;
  private_phone: string | null; contact_consent_public: boolean;
  is_active: boolean; sort_order: number;
}

export function CommitteeForm({
  masjidId, member,
}: { masjidId: string; member?: CommitteeValues }) {
  const [state, action] = useActionState(saveCommitteeMember, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      {member && <input type="hidden" name="member_id" value={member.id} />}
      <FormMessage state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="name_bn" label="নাম (বাংলা)" defaultValue={member?.name_bn} required />
        <Field name="name_en" label="নাম (ইংরেজি)" defaultValue={member?.name_en} latin />
        <Field name="role_label_bn" label="পদ" defaultValue={member?.role_label_bn} required
          placeholder="সভাপতি / সাধারণ সম্পাদক / কোষাধ্যক্ষ" />
        <Field name="sort_order" label="ক্রম" type="number" min={0} defaultValue={member?.sort_order ?? 0} latin />
        <Field name="term_start" label="মেয়াদ শুরু" type="date" defaultValue={member?.term_start} latin />
        <Field name="term_end" label="মেয়াদ শেষ" type="date" defaultValue={member?.term_end} latin />
        <Field name="formation_date" label="কমিটি গঠনের তারিখ" type="date" defaultValue={member?.formation_date} latin />
        <Field name="private_phone" label="ব্যক্তিগত মোবাইল" defaultValue={member?.private_phone} latin />
      </div>

      <Checkbox name="contact_consent_public" label="নম্বর প্রকাশ করা যাবে"
        defaultChecked={member?.contact_consent_public} tone="warning"
        hint="🔒 সম্মতি ছাড়া প্রকাশ করা হয় না।" />
      <Checkbox name="inactive" label="নিষ্ক্রিয়" defaultChecked={member ? !member.is_active : false} />

      <SubmitButton label={member ? 'হালনাগাদ করুন' : 'যুক্ত করুন'} />
    </form>
  );
}

export function CommitteeDelete({ masjidId, memberId }: { masjidId: string; memberId: string }) {
  const [, action] = useActionState(deleteCommitteeMember, EMPTY);
  return <ConfirmDelete action={action} hidden={{ masjid_id: masjidId, member_id: memberId }} />;
}

// ============================================================
// Services
// ============================================================
export interface ServiceValues {
  id: string; title_bn: string; title_en: string | null;
  description_bn: string | null; icon: string | null;
  contact_note_bn: string | null; is_active: boolean; sort_order: number;
}

export function ServiceForm({ masjidId, service }: { masjidId: string; service?: ServiceValues }) {
  const [state, action] = useActionState(saveService, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      {service && <input type="hidden" name="service_id" value={service.id} />}
      <FormMessage state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="title_bn" label="সেবার নাম" defaultValue={service?.title_bn} required
          placeholder="যাকাত সহায়তা / ইফতার বিতরণ" />
        <Field name="title_en" label="নাম (ইংরেজি)" defaultValue={service?.title_en} latin />
        <Field name="icon" label="আইকন (ইমোজি)" defaultValue={service?.icon} placeholder="🤲" />
        <Field name="sort_order" label="ক্রম" type="number" min={0} defaultValue={service?.sort_order ?? 0} latin />
      </div>

      <TextArea name="description_bn" label="বিবরণ" defaultValue={service?.description_bn} rows={3} />
      <Field name="contact_note_bn" label="যোগাযোগের নির্দেশনা" defaultValue={service?.contact_note_bn} />
      <Checkbox name="inactive" label="নিষ্ক্রিয়" defaultChecked={service ? !service.is_active : false} />

      <SubmitButton label={service ? 'হালনাগাদ করুন' : 'যুক্ত করুন'} />
    </form>
  );
}

export function ServiceDelete({ masjidId, serviceId }: { masjidId: string; serviceId: string }) {
  const [, action] = useActionState(deleteService, EMPTY);
  return <ConfirmDelete action={action} hidden={{ masjid_id: masjidId, service_id: serviceId }} />;
}

// ============================================================
// Announcements
// ============================================================
export interface AnnouncementValues {
  id: string; title_bn: string; title_en: string | null; body_bn: string | null;
  is_featured: boolean; is_urgent: boolean; status: string; expires_at: string | null;
}

export function AnnouncementForm({
  masjidId, notice,
}: { masjidId: string; notice?: AnnouncementValues }) {
  const [state, action] = useActionState(saveAnnouncement, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      {notice && <input type="hidden" name="notice_id" value={notice.id} />}
      <FormMessage state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="title_bn" label="শিরোনাম" defaultValue={notice?.title_bn} required />
        <Field name="title_en" label="শিরোনাম (ইংরেজি)" defaultValue={notice?.title_en} latin />
      </div>
      <TextArea name="body_bn" label="বিস্তারিত" defaultValue={notice?.body_bn} rows={5} />
      <Field name="expires_at" label="মেয়াদ শেষ" type="date" defaultValue={notice?.expires_at?.slice(0, 10)} latin
        hint="এই তারিখের পর ঘোষণাটি আর প্রাসঙ্গিক নয়।" />

      <div className="grid sm:grid-cols-3 gap-3">
        <Checkbox name="is_featured" label="ফিচার করুন" defaultChecked={notice?.is_featured} />
        <Checkbox name="is_urgent" label="জরুরি" defaultChecked={notice?.is_urgent} />
        <Checkbox name="publish" label="প্রকাশ করুন" defaultChecked={notice?.status === 'published'}
          hint="না দিলে খসড়া হিসেবে থাকবে।" />
      </div>

      <SubmitButton label={notice ? 'হালনাগাদ করুন' : 'যুক্ত করুন'} />
    </form>
  );
}

export function AnnouncementDelete({ masjidId, noticeId }: { masjidId: string; noticeId: string }) {
  const [, action] = useActionState(deleteAnnouncement, EMPTY);
  return <ConfirmDelete action={action} hidden={{ masjid_id: masjidId, notice_id: noticeId }} />;
}

// ============================================================
// Events
// ============================================================
export interface EventValues {
  id: string; title_bn: string; title_en: string | null; description_bn: string | null;
  speaker_bn: string | null; event_date: string | null;
  start_time: string | null; end_time: string | null;
  location_bn: string | null; contact_note_bn: string | null;
  requires_registration: boolean; status: string;
}

export function EventForm({ masjidId, event }: { masjidId: string; event?: EventValues }) {
  const [state, action] = useActionState(saveEvent, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      {event && <input type="hidden" name="event_id" value={event.id} />}
      <FormMessage state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="title_bn" label="শিরোনাম" defaultValue={event?.title_bn} required
          placeholder="সাপ্তাহিক তাফসির মাহফিল" />
        <Field name="title_en" label="শিরোনাম (ইংরেজি)" defaultValue={event?.title_en} latin />
        <Field name="speaker_bn" label="বক্তা" defaultValue={event?.speaker_bn} />
        <Field name="location_bn" label="স্থান" defaultValue={event?.location_bn} placeholder="মসজিদ প্রাঙ্গণ" />
        <Field name="event_date" label="তারিখ" type="date" defaultValue={event?.event_date} latin />
        <Field name="start_time" label="শুরুর সময়" type="time" defaultValue={event?.start_time} latin />
        <Field name="end_time" label="শেষের সময়" type="time" defaultValue={event?.end_time} latin />
        <Field name="contact_note_bn" label="যোগাযোগ" defaultValue={event?.contact_note_bn} />
      </div>

      <TextArea name="description_bn" label="বিবরণ" defaultValue={event?.description_bn} rows={4} />

      <div className="grid sm:grid-cols-2 gap-3">
        <Checkbox name="requires_registration" label="নিবন্ধন প্রয়োজন" defaultChecked={event?.requires_registration} />
        <Checkbox name="publish" label="প্রকাশ করুন" defaultChecked={event?.status === 'published'} />
      </div>

      <SubmitButton label={event ? 'হালনাগাদ করুন' : 'যুক্ত করুন'} />
    </form>
  );
}

export function EventDelete({ masjidId, eventId }: { masjidId: string; eventId: string }) {
  const [, action] = useActionState(deleteEvent, EMPTY);
  return <ConfirmDelete action={action} hidden={{ masjid_id: masjidId, event_id: eventId }} />;
}

export { Disclosure };
