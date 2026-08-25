/**
 * Demo content seeder for MOSJID.INFO.
 *
 * Populates the database with browsable placeholder content so the site can be
 * reviewed end to end before the real mosjid.info WordPress export is imported.
 *
 * Everything it writes is tagged so it can be removed cleanly:
 *   - masjids        → source_name = 'DEMO_SEED'
 *   - content tables → slug starts with 'demo-'
 *   - upazilas       → NOT tagged; that is real administrative data and is kept
 *
 * Usage:
 *   node scripts/seed-demo.mjs          # seed (idempotent — safe to re-run)
 *   node scripts/seed-demo.mjs --clear  # remove demo rows, keep upazilas
 */

import { createAdminClient } from './lib/supabase-admin.mjs';
import { describeError } from './lib/supabase-admin.mjs';
import { upazilasByDistrict, districtCenters } from './data/upazilas.mjs';

const DEMO_TAG = 'DEMO_SEED';
const DEMO_SLUG_PREFIX = 'demo-';
const db = createAdminClient();
const clearing = process.argv.includes('--clear');

/** Deterministic PRNG so re-running produces identical data instead of drifting. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260825);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (lo, hi) => lo + rand() * (hi - lo);

function die(step, error) {
  console.error(`\n✗ ${step}: ${describeError(error)}`);
  process.exit(1);
}

// ============================================================
// Demo vocabulary
// ============================================================
const NAME_PREFIXES = [
  ['বায়তুল মামুর', 'Baitul Mamur'],
  ['বায়তুল আমান', 'Baitul Aman'],
  ['বায়তুন নূর', 'Baitun Noor'],
  ['বায়তুল ফালাহ', 'Baitul Falah'],
  ['দারুস সালাম', 'Darus Salam'],
  ['আল-আকসা', 'Al-Aqsa'],
  ['আল-ফারুক', 'Al-Faruk'],
  ['মদিনা', 'Madina'],
  ['পূর্বপাড়া', 'Purbapara'],
  ['পশ্চিমপাড়া', 'Pashchimpara'],
  ['উত্তরপাড়া', 'Uttarpara'],
  ['দক্ষিণপাড়া', 'Dakshinpara'],
  ['মধ্যপাড়া', 'Madhyapara'],
  ['কেন্দ্রীয়', 'Kendriya'],
  ['স্টেশন রোড', 'Station Road'],
  ['কলেজ পাড়া', 'College Para'],
  ['বাজার', 'Bazar'],
  ['নতুন পাড়া', 'Notun Para'],
];

const NAME_SUFFIXES = [
  ['জামে মসজিদ', 'Jame Masjid'],
  ['কেন্দ্রীয় জামে মসজিদ', 'Central Jame Masjid'],
  ['ঈদগাহ জামে মসজিদ', 'Eidgah Jame Masjid'],
  ['বড় জামে মসজিদ', 'Boro Jame Masjid'],
  ['পাঞ্জেগানা মসজিদ', 'Panjegana Masjid'],
];

const AREA_NAMES = [
  ['পূর্বপাড়া', 'Purbapara'],
  ['পশ্চিমপাড়া', 'Pashchimpara'],
  ['স্টেশন রোড', 'Station Road'],
  ['কলেজ রোড', 'College Road'],
  ['বাজার এলাকা', 'Bazar Area'],
  ['হাসপাতাল রোড', 'Hospital Road'],
  ['থানা রোড', 'Thana Road'],
  ['মাদ্রাসা পাড়া', 'Madrasa Para'],
];

const STRUCTURES = [
  'small', 'medium', 'large', 'multi_storey',
  'tin_shed', 'semi_permanent', 'under_construction', 'unknown',
];
const STRUCTURE_WEIGHTS = [18, 26, 16, 10, 14, 8, 4, 4];

function weightedStructure() {
  const total = STRUCTURE_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < STRUCTURES.length; i++) {
    r -= STRUCTURE_WEIGHTS[i];
    if (r <= 0) return STRUCTURES[i];
  }
  return 'unknown';
}

/** Self-contained SVG thumbnail — no external host, so demo images never 404. */
function mosqueImage(seedIndex) {
  const palettes = [
    ['#0f766e', '#99f6e4'], ['#1e40af', '#bfdbfe'], ['#7c2d12', '#fed7aa'],
    ['#4c1d95', '#ddd6fe'], ['#065f46', '#a7f3d0'], ['#831843', '#fbcfe8'],
  ];
  const [bg, fg] = palettes[seedIndex % palettes.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">` +
    `<rect width="400" height="225" fill="${bg}"/>` +
    `<circle cx="200" cy="150" r="46" fill="${fg}"/>` +
    `<rect x="120" y="150" width="160" height="60" fill="${fg}"/>` +
    `<rect x="92" y="96" width="12" height="114" fill="${fg}"/>` +
    `<rect x="296" y="96" width="12" height="114" fill="${fg}"/>` +
    `<circle cx="98" cy="90" r="9" fill="${fg}"/>` +
    `<circle cx="302" cy="90" r="9" fill="${fg}"/>` +
    `<path d="M200 78l7 18h-14z" fill="${fg}"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ============================================================
// Clear
// ============================================================
async function clearDemo() {
  console.log('Removing demo content…\n');

  const { data: demoMasjids } = await db
    .from('masjids').select('id').eq('source_name', DEMO_TAG);
  const ids = (demoMasjids || []).map((m) => m.id);

  if (ids.length) {
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      await db.from('masjid_images').delete().in('masjid_id', chunk);
      await db.from('activities').delete().in('masjid_id', chunk);
    }
    const { error } = await db.from('masjids').delete().eq('source_name', DEMO_TAG);
    if (error) die('clear masjids', error);
  }
  console.log(`  masjids          removed ${ids.length}`);

  for (const t of ['activities', 'resources', 'islamic_topics', 'news_posts', 'notices']) {
    const { error, count } = await db
      .from(t).delete({ count: 'exact' }).like('slug', `${DEMO_SLUG_PREFIX}%`);
    if (error) die(`clear ${t}`, error);
    console.log(`  ${t.padEnd(16)} removed ${count ?? 0}`);
  }

  const { error: catErr, count: catCount } = await db
    .from('categories').delete({ count: 'exact' }).like('slug', `${DEMO_SLUG_PREFIX}%`);
  if (catErr) die('clear categories', catErr);
  console.log(`  categories       removed ${catCount ?? 0}`);

  console.log('\n✓ Demo content removed. Upazila geography kept (real data).');
}

// ============================================================
// Seed
// ============================================================
async function seed() {
  // ---- geography ----
  const { data: districts, error: dErr } = await db
    .from('districts').select('id, slug, name_bn, name_en, division_id');
  if (dErr) die('read districts', dErr);
  const districtBySlug = Object.fromEntries(districts.map((d) => [d.slug, d]));
  console.log(`districts          ${districts.length} found`);

  // ---- upazilas (real data, upserted on slug) ----
  const takenSlugs = new Set();
  const upazilaRows = [];
  for (const [districtSlug, list] of Object.entries(upazilasByDistrict)) {
    const district = districtBySlug[districtSlug];
    if (!district) {
      console.warn(`  ! district '${districtSlug}' not in DB — skipping its upazilas`);
      continue;
    }
    list.forEach(([nameBn, nameEn], i) => {
      let slug = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (takenSlugs.has(slug)) slug = `${slug}-${districtSlug}`;
      takenSlugs.add(slug);
      upazilaRows.push({
        district_id: district.id,
        name_bn: nameBn,
        name_en: nameEn,
        slug,
        sort_order: i + 1,
      });
    });
  }

  const { error: uErr } = await db
    .from('upazilas').upsert(upazilaRows, { onConflict: 'slug', ignoreDuplicates: false });
  if (uErr) die('upsert upazilas', uErr);

  const { data: upazilas } = await db.from('upazilas').select('id, slug, district_id, name_bn');
  const upazilasByDistrictId = {};
  for (const u of upazilas || []) {
    (upazilasByDistrictId[u.district_id] ||= []).push(u);
  }
  console.log(`upazilas           ${upazilas?.length ?? 0} in place`);

  // ---- categories ----
  const categories = [
    ['সাধারণ সংবাদ', 'General News', 'demo-general-news', 'news'],
    ['নির্মাণ ও সংস্কার', 'Construction & Renovation', 'demo-construction', 'news'],
    ['নামাজ ও ইবাদত', 'Prayer & Worship', 'demo-prayer', 'topic'],
    ['রমজান', 'Ramadan', 'demo-ramadan', 'topic'],
    ['বই ও পুস্তিকা', 'Books & Booklets', 'demo-books', 'resource'],
    ['মসজিদ সামগ্রী', 'Masjid Materials', 'demo-materials', 'resource'],
    ['ইসলামিক কার্যক্রম', 'Islamic Activities', 'demo-activities', 'activity'],
  ];
  const { error: cErr } = await db.from('categories').upsert(
    categories.map(([nb, ne, slug, type], i) => ({
      name_bn: nb, name_en: ne, slug, type, sort_order: i + 1,
    })),
    { onConflict: 'slug' }
  );
  if (cErr) die('upsert categories', cErr);
  const { data: cats } = await db.from('categories').select('id, slug, type');
  const catBySlug = Object.fromEntries((cats || []).map((c) => [c.slug, c.id]));
  console.log(`categories         ${cats?.length ?? 0} in place`);

  // ---- masjids ----
  const { count: existing } = await db
    .from('masjids').select('id', { count: 'exact', head: true }).eq('source_name', DEMO_TAG);
  if (existing > 0) {
    console.log(`masjids            ${existing} demo rows already present — skipping (use --clear to reseed)`);
  } else {
    const rows = [];
    let serial = 0;

    for (const [districtSlug] of Object.entries(upazilasByDistrict)) {
      const district = districtBySlug[districtSlug];
      if (!district) continue;
      const districtUpazilas = upazilasByDistrictId[district.id] || [];
      const [baseLat, baseLng] = districtCenters[districtSlug] || [23.68, 90.35];
      const perDistrict = districtSlug === 'dhaka' ? 40 : 22;

      for (let i = 0; i < perDistrict; i++) {
        serial++;
        const [prefixBn, prefixEn] = pick(NAME_PREFIXES);
        const [suffixBn, suffixEn] = pick(NAME_SUFFIXES);
        const [areaBn, areaEn] = pick(AREA_NAMES);
        const upazila = districtUpazilas.length ? pick(districtUpazilas) : null;

        const hasContact = rand() < 0.45;
        const isVerified = rand() < 0.3;
        const withImage = rand() < 0.4;

        rows.push({
          name_bn: `${prefixBn} ${suffixBn}`,
          name_en: `${prefixEn} ${suffixEn}`,
          slug: `${prefixEn}-${suffixEn}-${districtSlug}-${serial}`
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          division_id: district.division_id,
          district_id: district.id,
          upazila_id: upazila ? upazila.id : null,
          area_name_bn: areaBn,
          area_name_en: areaEn,
          address_bn: `${areaBn}, ${upazila ? upazila.name_bn : district.name_bn}, ${district.name_bn}`,
          latitude: Number(between(baseLat - 0.35, baseLat + 0.35).toFixed(6)),
          longitude: Number(between(baseLng - 0.35, baseLng + 0.35).toFixed(6)),
          structure_type: weightedStructure(),
          description_bn: `${prefixBn} ${suffixBn} ${district.name_bn} জেলার ${upazila ? upazila.name_bn : ''} এলাকার একটি পরিচিত মসজিদ। এখানে পাঁচ ওয়াক্ত নামাজ ও জুমার জামাত অনুষ্ঠিত হয়।`,
          established_year: Math.floor(between(1940, 2020)),
          contact_number: hasContact
            ? `01${Math.floor(between(3, 9))}${String(Math.floor(between(10000000, 99999999)))}`.slice(0, 11)
            : null,
          email: null,
          has_contact: hasContact,
          has_image: withImage,
          verification_status: isVerified ? 'verified' : pick(['unverified', 'pending', 'needs_review']),
          verified_at: isVerified ? new Date().toISOString() : null,
          status: 'published',
          source_type: 'demo',
          source_name: DEMO_TAG,
          collected_at: new Date().toISOString(),
        });
      }
    }

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await db.from('masjids').insert(chunk);
      if (error) die(`insert masjids (batch ${i / 50 + 1})`, error);
      inserted += chunk.length;
      process.stdout.write(`\rmasjids            inserting ${inserted}/${rows.length}`);
    }
    console.log(`\rmasjids            ${inserted} inserted            `);

    // ---- images for the masjids flagged has_image ----
    const { data: withImages } = await db
      .from('masjids').select('id').eq('source_name', DEMO_TAG).eq('has_image', true);

    const imageRows = (withImages || []).map((m, i) => {
      const uri = mosqueImage(i);
      return {
        masjid_id: m.id,
        source_type: 'admin_upload',
        license: 'Demo placeholder',
        attribution_required: false,
        external_only: false,
        storage_path: uri,
        thumbnail_path: uri,
        card_path: uri,
        detail_path: uri,
        status: 'approved',
        is_primary: true,
        sort_order: 0,
      };
    });

    for (let i = 0; i < imageRows.length; i += 50) {
      const { error } = await db.from('masjid_images').insert(imageRows.slice(i, i + 50));
      if (error) die('insert masjid_images', error);
    }
    console.log(`masjid_images      ${imageRows.length} inserted`);
  }

  // ---- content ----
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 864e5).toISOString();
  const daysAhead = (n) => new Date(now.getTime() + n * 864e5).toISOString().split('T')[0];

  const notices = [
    ['জুমার নামাজের সময় পরিবর্তন', 'শীতকালীন সময়সূচি অনুযায়ী আগামী ১ ডিসেম্বর থেকে জুমার খুতবা দুপুর ১টা ১৫ মিনিটে শুরু হবে।', true],
    ['মসজিদ সংস্কার কাজ শুরু', 'কেন্দ্রীয় জামে মসজিদের দ্বিতীয় তলার সংস্কার কাজ আগামী সপ্তাহে শুরু হবে। মুসল্লিদের সাময়িক অসুবিধার জন্য দুঃখিত।', true],
    ['রমজানের প্রস্তুতি সভা', 'আসন্ন রমজান উপলক্ষে প্রস্তুতিমূলক সভা আগামী শুক্রবার বাদ আসর অনুষ্ঠিত হবে।', false],
    ['ইমাম নিয়োগ বিজ্ঞপ্তি', 'যোগ্য ও অভিজ্ঞ ইমাম নিয়োগের জন্য আবেদন আহ্বান করা হচ্ছে। বিস্তারিত মসজিদ কমিটির কাছে।', false],
    ['তারাবির জামাত সংক্রান্ত নোটিশ', 'তারাবির নামাজ এশার জামাতের পর অনুষ্ঠিত হবে। সকল মুসল্লিকে সময়মতো উপস্থিত থাকার অনুরোধ।', false],
    ['মসজিদ পরিচ্ছন্নতা অভিযান', 'আগামী শনিবার সকাল ৮টায় মসজিদ প্রাঙ্গণ পরিচ্ছন্নতা কর্মসূচি অনুষ্ঠিত হবে।', false],
    ['দান ও অনুদান সংক্রান্ত', 'মসজিদ উন্নয়ন তহবিলে দান করার জন্য কমিটির সাথে যোগাযোগ করুন।', false],
    ['ঈদের জামাতের সময়সূচি', 'ঈদুল ফিতরের প্রথম জামাত সকাল ৭টায় এবং দ্বিতীয় জামাত সকাল ৮টায় অনুষ্ঠিত হবে।', true],
  ];

  const news = [
    ['ঐতিহাসিক মসজিদ সংরক্ষণে নতুন উদ্যোগ', 'প্রত্নতত্ত্ব অধিদপ্তর দেশের ঐতিহাসিক মসজিদগুলো সংরক্ষণে নতুন প্রকল্প হাতে নিয়েছে।'],
    ['গ্রামীণ এলাকায় নতুন মসজিদ নির্মাণ', 'প্রত্যন্ত অঞ্চলে মুসল্লিদের সুবিধার্থে নতুন মসজিদ নির্মাণের কাজ এগিয়ে চলছে।'],
    ['মসজিদভিত্তিক গণশিক্ষা কার্যক্রম সম্প্রসারণ', 'ইসলামিক ফাউন্ডেশনের মসজিদভিত্তিক শিশু ও গণশিক্ষা কার্যক্রম আরও সম্প্রসারিত হচ্ছে।'],
    ['সৌরবিদ্যুতে চলছে অনেক মসজিদ', 'বিদ্যুৎ সাশ্রয়ে দেশের বিভিন্ন মসজিদে সোলার প্যানেল স্থাপন করা হয়েছে।'],
    ['মসজিদ কমিটির বার্ষিক সম্মেলন', 'জেলা পর্যায়ে মসজিদ কমিটিগুলোর বার্ষিক সম্মেলন অনুষ্ঠিত হয়েছে।'],
    ['বন্যাদুর্গতদের পাশে মসজিদ কমিটি', 'বন্যাকবলিত এলাকায় ত্রাণ বিতরণে এগিয়ে এসেছে স্থানীয় মসজিদ কমিটিগুলো।'],
    ['ইমাম প্রশিক্ষণ কর্মশালা সম্পন্ন', 'ইমামদের দক্ষতা বৃদ্ধিতে সপ্তাহব্যাপী প্রশিক্ষণ কর্মশালা সফলভাবে সম্পন্ন হয়েছে।'],
    ['মসজিদে পানি সরবরাহ ব্যবস্থার উন্নয়ন', 'ওজুখানায় বিশুদ্ধ পানি সরবরাহে নতুন ব্যবস্থা চালু হয়েছে।'],
  ];

  const topics = [
    ['নামাজের গুরুত্ব ও ফজিলত', 'নামাজ ইসলামের দ্বিতীয় স্তম্ভ। প্রতিদিন পাঁচ ওয়াক্ত নামাজ প্রত্যেক প্রাপ্তবয়স্ক মুসলিমের উপর ফরজ।'],
    ['জুমার দিনের আমল', 'শুক্রবার মুসলমানদের জন্য সাপ্তাহিক ঈদের দিন। এদিনের বিশেষ কিছু আমল রয়েছে।'],
    ['মসজিদের আদব ও শিষ্টাচার', 'মসজিদে প্রবেশ ও অবস্থানের কিছু আদব রয়েছে যা প্রত্যেক মুসল্লির জানা প্রয়োজন।'],
    ['রমজানের প্রস্তুতি', 'রমজান মাসকে যথাযথভাবে কাজে লাগাতে আগে থেকেই প্রস্তুতি নেওয়া উচিত।'],
    ['যাকাতের বিধান', 'যাকাত ইসলামের তৃতীয় স্তম্ভ। নিসাব পরিমাণ সম্পদের মালিকের উপর যাকাত ফরজ।'],
    ['হজ ও ওমরাহ', 'সামর্থ্যবান মুসলিমের উপর জীবনে একবার হজ করা ফরজ।'],
    ['ইতিকাফের ফজিলত', 'রমজানের শেষ দশকে ইতিকাফ করা সুন্নতে মুয়াক্কাদা।'],
    ['কুরআন তিলাওয়াতের আদব', 'কুরআন তিলাওয়াতের সময় কিছু আদব রক্ষা করা উচিত।'],
    ['তাহাজ্জুদ নামাজ', 'রাতের শেষ প্রহরে তাহাজ্জুদ নামাজ অত্যন্ত ফজিলতপূর্ণ।'],
    ['সদকায়ে জারিয়া', 'যে দান মৃত্যুর পরও সওয়াব পৌঁছাতে থাকে তাকে সদকায়ে জারিয়া বলে।'],
  ];

  const resources = [
    ['মসজিদ পরিচালনা নির্দেশিকা', 'মসজিদ কমিটির জন্য পরিচালনা সংক্রান্ত একটি সহায়ক পুস্তিকা।', 'pdf'],
    ['নামাজ শিক্ষা পুস্তিকা', 'নতুনদের জন্য সহজ ভাষায় নামাজ শিক্ষার বই।', 'pdf'],
    ['মসজিদের কার্পেট ও ফ্লোরিং', 'মসজিদের জন্য উপযুক্ত কার্পেট নির্বাচনের নির্দেশিকা।', 'image'],
    ['সাউন্ড সিস্টেম সেটআপ', 'মসজিদে মাইক ও সাউন্ড সিস্টেম স্থাপনের ব্যবহারিক নির্দেশিকা।', 'pdf'],
    ['ওজুখানা নকশা', 'পরিচ্ছন্ন ও পানি সাশ্রয়ী ওজুখানার নমুনা নকশা।', 'image'],
    ['মিম্বার ও মেহরাব ডিজাইন', 'ঐতিহ্যবাহী ও আধুনিক মিম্বার নকশার সংকলন।', 'image'],
    ['খুতবা সংকলন', 'জুমার খুতবার জন্য নির্বাচিত বিষয়ভিত্তিক সংকলন।', 'pdf'],
    ['মসজিদ হিসাব সংরক্ষণ ফরম', 'আয়-ব্যয়ের হিসাব রাখার প্রমিত ফরম।', 'pdf'],
  ];

  const activities = [
    ['সাপ্তাহিক তাফসির মাহফিল', 'প্রতি বৃহস্পতিবার বাদ মাগরিব তাফসিরুল কুরআন মাহফিল।', 7],
    ['ইসলামিক কুইজ প্রতিযোগিতা', 'শিশু-কিশোরদের জন্য ইসলামিক জ্ঞান যাচাই প্রতিযোগিতা।', 14],
    ['বার্ষিক ওয়াজ মাহফিল', 'তিন দিনব্যাপী বার্ষিক ওয়াজ ও দোয়া মাহফিল।', 21],
    ['হিফজ বিভাগের সবক পরীক্ষা', 'হিফজ বিভাগের শিক্ষার্থীদের ত্রৈমাসিক পরীক্ষা।', 30],
    ['ফ্রি মেডিকেল ক্যাম্প', 'মসজিদ প্রাঙ্গণে দরিদ্রদের জন্য বিনামূল্যে চিকিৎসা সেবা।', 40],
    ['শীতবস্ত্র বিতরণ কর্মসূচি', 'অসহায় মানুষের মাঝে শীতবস্ত্র বিতরণ।', 55],
  ];

  async function upsertContent(table, rows, label) {
    const { error } = await db.from(table).upsert(rows, { onConflict: 'slug' });
    if (error) die(`upsert ${table}`, error);
    console.log(`${label.padEnd(18)} ${rows.length} in place`);
  }

  await upsertContent('notices', notices.map(([title, body, featured], i) => ({
    title_bn: title,
    slug: `${DEMO_SLUG_PREFIX}notice-${i + 1}`,
    body_bn: body,
    is_featured: featured,
    status: 'published',
    published_at: daysAgo(i * 3 + 1),
  })), 'notices');

  await upsertContent('news_posts', news.map(([title, excerpt], i) => ({
    title_bn: title,
    slug: `${DEMO_SLUG_PREFIX}news-${i + 1}`,
    excerpt_bn: excerpt,
    content_bn: `${excerpt}\n\nবিস্তারিত প্রতিবেদন শীঘ্রই প্রকাশিত হবে। এটি একটি নমুনা সংবাদ, প্রকৃত তথ্য আমদানির পর প্রতিস্থাপিত হবে।`,
    author_name: 'সম্পাদকীয় দল',
    category_id: catBySlug[i % 2 === 0 ? 'demo-general-news' : 'demo-construction'] ?? null,
    status: 'published',
    published_at: daysAgo(i * 4 + 2),
  })), 'news_posts');

  await upsertContent('islamic_topics', topics.map(([title, content], i) => ({
    title_bn: title,
    slug: `${DEMO_SLUG_PREFIX}topic-${i + 1}`,
    content_bn: `${content}\n\nএটি একটি নমুনা বিষয়বস্তু। প্রকৃত লেখা যুক্ত করা হবে।`,
    category_id: catBySlug[i % 2 === 0 ? 'demo-prayer' : 'demo-ramadan'] ?? null,
    status: 'published',
    published_at: daysAgo(i * 2 + 1),
  })), 'islamic_topics');

  await upsertContent('resources', resources.map(([title, description, type], i) => ({
    title_bn: title,
    slug: `${DEMO_SLUG_PREFIX}resource-${i + 1}`,
    description_bn: description,
    file_type: type,
    category_id: catBySlug[i % 2 === 0 ? 'demo-books' : 'demo-materials'] ?? null,
    status: 'published',
    published_at: daysAgo(i * 5 + 3),
  })), 'resources');

  const { data: someMasjids } = await db
    .from('masjids').select('id').eq('source_name', DEMO_TAG).limit(activities.length);

  await upsertContent('activities', activities.map(([title, description, ahead], i) => ({
    title_bn: title,
    slug: `${DEMO_SLUG_PREFIX}activity-${i + 1}`,
    description_bn: description,
    masjid_id: someMasjids?.[i]?.id ?? null,
    event_date: daysAhead(ahead),
    location_bn: 'মসজিদ প্রাঙ্গণ',
    status: 'published',
    published_at: daysAgo(1),
  })), 'activities');

  // ---- summary ----
  const { data: stats } = await db.rpc('get_directory_stats');
  console.log('\n✓ Demo seed complete.');
  if (stats?.[0]) {
    const s = stats[0];
    console.log(`  published masjids  ${s.total_masjids}`);
    console.log(`  verified           ${s.verified_masjids}`);
    console.log(`  districts covered  ${s.districts_covered}`);
    console.log(`  upazilas covered   ${s.upazilas_covered}`);
  }
  console.log('\n  Remove later with:  node scripts/seed-demo.mjs --clear');
}

await (clearing ? clearDemo() : seed());
