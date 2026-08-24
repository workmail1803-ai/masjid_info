-- ============================================================
-- MOSJID.INFO — Seed Data: Bangladesh Administrative Geography
-- 8 Divisions, 64 Districts
-- ============================================================

-- ============================================================
-- DIVISIONS (8)
-- ============================================================
INSERT INTO divisions (name_bn, name_en, slug, code, sort_order) VALUES
  ('বরিশাল', 'Barishal', 'barishal', '10', 1),
  ('চট্টগ্রাম', 'Chattogram', 'chattogram', '20', 2),
  ('ঢাকা', 'Dhaka', 'dhaka', '30', 3),
  ('খুলনা', 'Khulna', 'khulna', '40', 4),
  ('ময়মনসিংহ', 'Mymensingh', 'mymensingh', '45', 5),
  ('রাজশাহী', 'Rajshahi', 'rajshahi', '50', 6),
  ('রংপুর', 'Rangpur', 'rangpur', '55', 7),
  ('সিলেট', 'Sylhet', 'sylhet', '60', 8);

-- ============================================================
-- DISTRICTS (64)
-- ============================================================

-- Barishal Division (6 districts)
INSERT INTO districts (division_id, name_bn, name_en, slug, code, sort_order) VALUES
  ((SELECT id FROM divisions WHERE slug='barishal'), 'বরগুনা', 'Barguna', 'barguna', '0401', 1),
  ((SELECT id FROM divisions WHERE slug='barishal'), 'বরিশাল', 'Barishal', 'barishal', '0406', 2),
  ((SELECT id FROM divisions WHERE slug='barishal'), 'ভোলা', 'Bhola', 'bhola', '0409', 3),
  ((SELECT id FROM divisions WHERE slug='barishal'), 'ঝালকাঠি', 'Jhalokati', 'jhalokati', '0442', 4),
  ((SELECT id FROM divisions WHERE slug='barishal'), 'পটুয়াখালী', 'Patuakhali', 'patuakhali', '0478', 5),
  ((SELECT id FROM divisions WHERE slug='barishal'), 'পিরোজপুর', 'Pirojpur', 'pirojpur', '0479', 6);

-- Chattogram Division (11 districts)
INSERT INTO districts (division_id, name_bn, name_en, slug, code, sort_order) VALUES
  ((SELECT id FROM divisions WHERE slug='chattogram'), 'বান্দরবান', 'Bandarban', 'bandarban', '2003', 1),
  ((SELECT id FROM divisions WHERE slug='chattogram'), 'ব্রাহ্মণবাড়িয়া', 'Brahmanbaria', 'brahmanbaria', '2012', 2),
  ((SELECT id FROM divisions WHERE slug='chattogram'), 'চাঁদপুর', 'Chandpur', 'chandpur', '2013', 3),
  ((SELECT id FROM divisions WHERE slug='chattogram'), 'চট্টগ্রাম', 'Chattogram', 'chattogram', '2015', 4),
  ((SELECT id FROM divisions WHERE slug='chattogram'), 'কুমিল্লা', 'Comilla', 'comilla', '2019', 5),
  ((SELECT id FROM divisions WHERE slug='chattogram'), 'কক্সবাজার', 'Coxs Bazar', 'coxs-bazar', '2022', 6),
  ((SELECT id FROM divisions WHERE slug='chattogram'), 'ফেনী', 'Feni', 'feni', '2030', 7),
  ((SELECT id FROM divisions WHERE slug='chattogram'), 'খাগড়াছড়ি', 'Khagrachhari', 'khagrachhari', '2046', 8),
  ((SELECT id FROM divisions WHERE slug='chattogram'), 'লক্ষ্মীপুর', 'Lakshmipur', 'lakshmipur', '2051', 9),
  ((SELECT id FROM divisions WHERE slug='chattogram'), 'নোয়াখালী', 'Noakhali', 'noakhali', '2075', 10),
  ((SELECT id FROM divisions WHERE slug='chattogram'), 'রাঙ্গামাটি', 'Rangamati', 'rangamati', '2084', 11);

-- Dhaka Division (13 districts)
INSERT INTO districts (division_id, name_bn, name_en, slug, code, sort_order) VALUES
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'ঢাকা', 'Dhaka', 'dhaka', '3026', 1),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'ফরিদপুর', 'Faridpur', 'faridpur', '3029', 2),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'গাজীপুর', 'Gazipur', 'gazipur', '3033', 3),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'গোপালগঞ্জ', 'Gopalganj', 'gopalganj', '3035', 4),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'কিশোরগঞ্জ', 'Kishoreganj', 'kishoreganj', '3048', 5),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'মাদারীপুর', 'Madaripur', 'madaripur', '3054', 6),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'মানিকগঞ্জ', 'Manikganj', 'manikganj', '3056', 7),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'মুন্সীগঞ্জ', 'Munshiganj', 'munshiganj', '3059', 8),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'নারায়ণগঞ্জ', 'Narayanganj', 'narayanganj', '3067', 9),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'নরসিংদী', 'Narsingdi', 'narsingdi', '3068', 10),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'রাজবাড়ী', 'Rajbari', 'rajbari', '3082', 11),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'শরীয়তপুর', 'Shariatpur', 'shariatpur', '3086', 12),
  ((SELECT id FROM divisions WHERE slug='dhaka'), 'টাঙ্গাইল', 'Tangail', 'tangail', '3093', 13);

-- Khulna Division (10 districts)
INSERT INTO districts (division_id, name_bn, name_en, slug, code, sort_order) VALUES
  ((SELECT id FROM divisions WHERE slug='khulna'), 'বাগেরহাট', 'Bagerhat', 'bagerhat', '4001', 1),
  ((SELECT id FROM divisions WHERE slug='khulna'), 'চুয়াডাঙ্গা', 'Chuadanga', 'chuadanga', '4018', 2),
  ((SELECT id FROM divisions WHERE slug='khulna'), 'যশোর', 'Jessore', 'jessore', '4041', 3),
  ((SELECT id FROM divisions WHERE slug='khulna'), 'ঝিনাইদহ', 'Jhenaidah', 'jhenaidah', '4044', 4),
  ((SELECT id FROM divisions WHERE slug='khulna'), 'খুলনা', 'Khulna', 'khulna', '4047', 5),
  ((SELECT id FROM divisions WHERE slug='khulna'), 'কুষ্টিয়া', 'Kushtia', 'kushtia', '4050', 6),
  ((SELECT id FROM divisions WHERE slug='khulna'), 'মাগুরা', 'Magura', 'magura', '4055', 7),
  ((SELECT id FROM divisions WHERE slug='khulna'), 'মেহেরপুর', 'Meherpur', 'meherpur', '4057', 8),
  ((SELECT id FROM divisions WHERE slug='khulna'), 'নড়াইল', 'Narail', 'narail', '4065', 9),
  ((SELECT id FROM divisions WHERE slug='khulna'), 'সাতক্ষীরা', 'Satkhira', 'satkhira', '4087', 10);

-- Mymensingh Division (4 districts)
INSERT INTO districts (division_id, name_bn, name_en, slug, code, sort_order) VALUES
  ((SELECT id FROM divisions WHERE slug='mymensingh'), 'জামালপুর', 'Jamalpur', 'jamalpur', '4539', 1),
  ((SELECT id FROM divisions WHERE slug='mymensingh'), 'ময়মনসিংহ', 'Mymensingh', 'mymensingh', '4561', 2),
  ((SELECT id FROM divisions WHERE slug='mymensingh'), 'নেত্রকোনা', 'Netrokona', 'netrokona', '4572', 3),
  ((SELECT id FROM divisions WHERE slug='mymensingh'), 'শেরপুর', 'Sherpur', 'sherpur', '4589', 4);

-- Rajshahi Division (8 districts)
INSERT INTO districts (division_id, name_bn, name_en, slug, code, sort_order) VALUES
  ((SELECT id FROM divisions WHERE slug='rajshahi'), 'বগুড়া', 'Bogura', 'bogura', '5010', 1),
  ((SELECT id FROM divisions WHERE slug='rajshahi'), 'চাঁপাইনবাবগঞ্জ', 'Chapainawabganj', 'chapainawabganj', '5070', 2),
  ((SELECT id FROM divisions WHERE slug='rajshahi'), 'জয়পুরহাট', 'Joypurhat', 'joypurhat', '5038', 3),
  ((SELECT id FROM divisions WHERE slug='rajshahi'), 'নওগাঁ', 'Naogaon', 'naogaon', '5064', 4),
  ((SELECT id FROM divisions WHERE slug='rajshahi'), 'নাটোর', 'Natore', 'natore', '5069', 5),
  ((SELECT id FROM divisions WHERE slug='rajshahi'), 'নওয়াবগঞ্জ', 'Nawabganj', 'nawabganj', '5071', 6),
  ((SELECT id FROM divisions WHERE slug='rajshahi'), 'পাবনা', 'Pabna', 'pabna', '5076', 7),
  ((SELECT id FROM divisions WHERE slug='rajshahi'), 'রাজশাহী', 'Rajshahi', 'rajshahi', '5081', 8),
  ((SELECT id FROM divisions WHERE slug='rajshahi'), 'সিরাজগঞ্জ', 'Sirajganj', 'sirajganj', '5088', 9);

-- Rangpur Division (8 districts)
INSERT INTO districts (division_id, name_bn, name_en, slug, code, sort_order) VALUES
  ((SELECT id FROM divisions WHERE slug='rangpur'), 'দিনাজপুর', 'Dinajpur', 'dinajpur', '5527', 1),
  ((SELECT id FROM divisions WHERE slug='rangpur'), 'গাইবান্ধা', 'Gaibandha', 'gaibandha', '5532', 2),
  ((SELECT id FROM divisions WHERE slug='rangpur'), 'কুড়িগ্রাম', 'Kurigram', 'kurigram', '5549', 3),
  ((SELECT id FROM divisions WHERE slug='rangpur'), 'লালমনিরহাট', 'Lalmonirhat', 'lalmonirhat', '5552', 4),
  ((SELECT id FROM divisions WHERE slug='rangpur'), 'নীলফামারী', 'Nilphamari', 'nilphamari', '5573', 5),
  ((SELECT id FROM divisions WHERE slug='rangpur'), 'পঞ্চগড়', 'Panchagarh', 'panchagarh', '5577', 6),
  ((SELECT id FROM divisions WHERE slug='rangpur'), 'রংপুর', 'Rangpur', 'rangpur', '5585', 7),
  ((SELECT id FROM divisions WHERE slug='rangpur'), 'ঠাকুরগাঁও', 'Thakurgaon', 'thakurgaon', '5594', 8);

-- Sylhet Division (4 districts)
INSERT INTO districts (division_id, name_bn, name_en, slug, code, sort_order) VALUES
  ((SELECT id FROM divisions WHERE slug='sylhet'), 'হবিগঞ্জ', 'Habiganj', 'habiganj', '6036', 1),
  ((SELECT id FROM divisions WHERE slug='sylhet'), 'মৌলভীবাজার', 'Moulvibazar', 'moulvibazar', '6058', 2),
  ((SELECT id FROM divisions WHERE slug='sylhet'), 'সুনামগঞ্জ', 'Sunamganj', 'sunamganj', '6090', 3),
  ((SELECT id FROM divisions WHERE slug='sylhet'), 'সিলেট', 'Sylhet', 'sylhet', '6091', 4);
