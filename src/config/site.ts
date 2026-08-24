// Site-wide configuration
export const siteConfig = {
  name: 'MOSJID.INFO',
  nameBn: 'মসজিদ.ইনফো',
  tagline: 'বাংলাদেশের মসজিদ তথ্য ও ডিরেক্টরি',
  taglineEn: 'Bangladesh Mosque Information & Directory',
  description: 'বাংলাদেশের সকল মসজিদের তথ্য ও ডিরেক্টরি। ৩ লক্ষেরও বেশি মসজিদের তথ্য এক জায়গায়।',
  descriptionEn: 'Comprehensive directory of mosques across Bangladesh. Information on over 300,000 mosques in one place.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://mosjid.info',
  locale: 'bn-BD',
  defaultLocale: 'bn',
} as const;

export const mapConfig = {
  styleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty',
  // Bangladesh center
  defaultCenter: { lat: 23.6850, lng: 90.3563 } as const,
  defaultZoom: 7,
  maxZoom: 18,
  minZoom: 5,
  clusterRadius: 50,
  maxClusterZoom: 14,
} as const;

export const paginationConfig = {
  defaultPageSize: 20,
  maxPageSize: 100,
  adminPageSize: 50,
} as const;
