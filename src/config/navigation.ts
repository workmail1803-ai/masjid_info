// Site navigation. Every item carries a stable `id` used as the React key —
// hrefs are not unique enough (several sections can point at the same route).
export const navigation = {
  main: [
    { id: 'home', labelBn: 'হোম', labelEn: 'Home', href: '/' },
    { id: 'directory', labelBn: 'মসজিদ ডিরেক্টরি', labelEn: 'Masjid Directory', href: '/masjid' },
    { id: 'news', labelBn: 'মসজিদের সংবাদ', labelEn: 'Masjid News', href: '/news' },
    { id: 'activities', labelBn: 'কার্যক্রম', labelEn: 'Activities', href: '/activities' },
    { id: 'notices', labelBn: 'নোটিশ বোর্ড', labelEn: 'Notice Board', href: '/notices' },
    { id: 'topics', labelBn: 'ইসলামিক বিষয়', labelEn: 'Islamic Topics', href: '/topics' },
    { id: 'resources', labelBn: 'উপকরণ', labelEn: 'Resources', href: '/resources' },
    { id: 'about', labelBn: 'সম্পর্কে', labelEn: 'About', href: '/about' },
    { id: 'contact', labelBn: 'যোগাযোগ', labelEn: 'Contact', href: '/contact' },
  ],
  mobile: [
    { id: 'home', labelBn: 'হোম', labelEn: 'Home', href: '/', icon: 'home' },
    { id: 'directory', labelBn: 'ডিরেক্টরি', labelEn: 'Directory', href: '/masjid', icon: 'search' },
    { id: 'notices', labelBn: 'নোটিশ', labelEn: 'Notices', href: '/notices', icon: 'bell' },
    { id: 'topics', labelBn: 'বিষয়', labelEn: 'Topics', href: '/topics', icon: 'book' },
    { id: 'more', labelBn: 'আরও', labelEn: 'More', href: '#more', icon: 'menu' },
  ],
  cta: {
    primary: { labelBn: 'মসজিদ খুঁজুন', labelEn: 'Find Mosque', href: '/masjid' },
    secondary: { labelBn: 'মসজিদ যোগ করুন', labelEn: 'Add Mosque', href: '/masjid/add' },
  },
} as const;
