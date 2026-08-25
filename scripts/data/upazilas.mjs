/**
 * Bangladesh upazila reference data — one representative district per division,
 * plus the three main Dhaka-division districts.
 *
 * This is real administrative data, not invented demo content, so it stays
 * correct once the live WordPress import replaces the demo masjids. The full
 * ~495-upazila list should come from the authoritative import; this subset
 * exists so every division has browsable geography today.
 *
 * Keyed by district slug (matching `districts.slug`).
 */
export const upazilasByDistrict = {
  // ---------- Dhaka division ----------
  dhaka: [
    ['সাভার', 'Savar'],
    ['ধামরাই', 'Dhamrai'],
    ['কেরানীগঞ্জ', 'Keraniganj'],
    ['নবাবগঞ্জ', 'Nawabganj'],
    ['দোহার', 'Dohar'],
  ],
  gazipur: [
    ['গাজীপুর সদর', 'Gazipur Sadar'],
    ['কালিয়াকৈর', 'Kaliakair'],
    ['কাপাসিয়া', 'Kapasia'],
    ['শ্রীপুর', 'Sreepur'],
    ['কালীগঞ্জ', 'Kaliganj'],
  ],
  narayanganj: [
    ['নারায়ণগঞ্জ সদর', 'Narayanganj Sadar'],
    ['আড়াইহাজার', 'Araihazar'],
    ['বন্দর', 'Bandar'],
    ['রূপগঞ্জ', 'Rupganj'],
    ['সোনারগাঁও', 'Sonargaon'],
  ],

  // ---------- Chattogram division ----------
  chattogram: [
    ['আনোয়ারা', 'Anwara'],
    ['বাঁশখালী', 'Banshkhali'],
    ['বোয়ালখালী', 'Boalkhali'],
    ['চন্দনাইশ', 'Chandanaish'],
    ['ফটিকছড়ি', 'Fatikchhari'],
    ['হাটহাজারী', 'Hathazari'],
    ['লোহাগাড়া', 'Lohagara'],
    ['মীরসরাই', 'Mirsharai'],
    ['পটিয়া', 'Patiya'],
    ['রাঙ্গুনিয়া', 'Rangunia'],
    ['রাউজান', 'Raozan'],
    ['সন্দ্বীপ', 'Sandwip'],
    ['সাতকানিয়া', 'Satkania'],
    ['সীতাকুণ্ড', 'Sitakunda'],
    ['কর্ণফুলী', 'Karnaphuli'],
  ],

  // ---------- Sylhet division ----------
  sylhet: [
    ['সিলেট সদর', 'Sylhet Sadar'],
    ['বালাগঞ্জ', 'Balaganj'],
    ['বিয়ানীবাজার', 'Beanibazar'],
    ['বিশ্বনাথ', 'Bishwanath'],
    ['কোম্পানীগঞ্জ', 'Companiganj'],
    ['ফেঞ্চুগঞ্জ', 'Fenchuganj'],
    ['গোলাপগঞ্জ', 'Golapganj'],
    ['গোয়াইনঘাট', 'Gowainghat'],
    ['জৈন্তাপুর', 'Jaintiapur'],
    ['কানাইঘাট', 'Kanaighat'],
    ['ওসমানীনগর', 'Osmani Nagar'],
    ['জকিগঞ্জ', 'Zakiganj'],
    ['দক্ষিণ সুরমা', 'Dakshin Surma'],
  ],

  // ---------- Rajshahi division ----------
  rajshahi: [
    ['পবা', 'Paba'],
    ['বাঘা', 'Bagha'],
    ['বাগমারা', 'Bagmara'],
    ['চারঘাট', 'Charghat'],
    ['দুর্গাপুর', 'Durgapur'],
    ['গোদাগাড়ী', 'Godagari'],
    ['মোহনপুর', 'Mohanpur'],
    ['পুঠিয়া', 'Puthia'],
    ['তানোর', 'Tanore'],
  ],

  // ---------- Khulna division ----------
  khulna: [
    ['বটিয়াঘাটা', 'Batiaghata'],
    ['দাকোপ', 'Dacope'],
    ['ডুমুরিয়া', 'Dumuria'],
    ['দিঘলিয়া', 'Dighalia'],
    ['কয়রা', 'Koyra'],
    ['পাইকগাছা', 'Paikgachha'],
    ['ফুলতলা', 'Phultala'],
    ['রূপসা', 'Rupsha'],
    ['তেরখাদা', 'Terokhada'],
  ],

  // ---------- Barishal division ----------
  barishal: [
    ['বরিশাল সদর', 'Barishal Sadar'],
    ['আগৈলঝাড়া', 'Agailjhara'],
    ['বাবুগঞ্জ', 'Babuganj'],
    ['বাকেরগঞ্জ', 'Bakerganj'],
    ['বানারীপাড়া', 'Banaripara'],
    ['গৌরনদী', 'Gaurnadi'],
    ['হিজলা', 'Hizla'],
    ['মেহেন্দিগঞ্জ', 'Mehendiganj'],
    ['মুলাদী', 'Muladi'],
    ['উজিরপুর', 'Wazirpur'],
  ],

  // ---------- Rangpur division ----------
  rangpur: [
    ['রংপুর সদর', 'Rangpur Sadar'],
    ['বদরগঞ্জ', 'Badarganj'],
    ['গংগাচড়া', 'Gangachhara'],
    ['কাউনিয়া', 'Kaunia'],
    ['মিঠাপুকুর', 'Mithapukur'],
    ['পীরগাছা', 'Pirgachha'],
    ['পীরগঞ্জ', 'Pirganj'],
    ['তারাগঞ্জ', 'Taraganj'],
  ],

  // ---------- Mymensingh division ----------
  mymensingh: [
    ['ময়মনসিংহ সদর', 'Mymensingh Sadar'],
    ['ভালুকা', 'Bhaluka'],
    ['ধোবাউড়া', 'Dhobaura'],
    ['ফুলবাড়ীয়া', 'Fulbaria'],
    ['গফরগাঁও', 'Gaffargaon'],
    ['গৌরীপুর', 'Gauripur'],
    ['হালুয়াঘাট', 'Haluaghat'],
    ['ঈশ্বরগঞ্জ', 'Ishwarganj'],
    ['মুক্তাগাছা', 'Muktagachha'],
    ['নান্দাইল', 'Nandail'],
    ['ফুলপুর', 'Phulpur'],
    ['তারাকান্দা', 'Tarakanda'],
    ['ত্রিশাল', 'Trishal'],
  ],
};

/** Approximate district centroids, used to scatter demo coordinates realistically. */
export const districtCenters = {
  dhaka: [23.81, 90.41],
  gazipur: [24.0, 90.42],
  narayanganj: [23.62, 90.5],
  chattogram: [22.35, 91.83],
  sylhet: [24.9, 91.87],
  rajshahi: [24.37, 88.6],
  khulna: [22.85, 89.55],
  barishal: [22.7, 90.37],
  rangpur: [25.75, 89.25],
  mymensingh: [24.75, 90.4],
};
