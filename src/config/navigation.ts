export const navigation = {
  main: [
    { labelBn: 'হোম', labelEn: 'Home', href: '/' },
    { labelBn: 'মসজিদ ডিরেক্টরি', labelEn: 'Masjid Directory', href: '/masjid' },
    { labelBn: 'মসজিদের তথ্য', labelEn: 'Masjid Information', href: '/news' },
    { labelBn: 'কার্যক্রম', labelEn: 'Activities', href: '/topics' },
    { labelBn: 'নোটিশ বোর্ড', labelEn: 'Notice Board', href: '/notices' },
    { labelBn: 'ইসলামিক বিষয়', labelEn: 'Islamic Topics', href: '/topics' },
    { labelBn: 'সম্পর্কে', labelEn: 'About', href: '/about' },
    { labelBn: 'যোগাযোগ', labelEn: 'Contact', href: '/contact' },
  ],
  mobile: [
    { labelBn: 'হোম', labelEn: 'Home', href: '/', icon: 'home' },
    { labelBn: 'ডিরেক্টরি', labelEn: 'Directory', href: '/masjid', icon: 'search' },
    { labelBn: 'নোটিশ', labelEn: 'Notices', href: '/notices', icon: 'bell' },
    { labelBn: 'বিষয়', labelEn: 'Topics', href: '/topics', icon: 'book' },
    { labelBn: 'আরও', labelEn: 'More', href: '#more', icon: 'menu' },
  ],
  cta: {
    primary: { labelBn: 'মসজিদ খুঁজুন', labelEn: 'Find Mosque', href: '/masjid' },
    secondary: { labelBn: 'মসজিদ যোগ করুন', labelEn: 'Add Mosque', href: '/masjid/add' },
  },
} as const;
