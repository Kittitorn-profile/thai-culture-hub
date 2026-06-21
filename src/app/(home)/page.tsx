import type { Metadata } from 'next';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

const SITE_URL = 'https://thailandculturalhub.com';
const OG_IMAGE_URL =
  'https://res.cloudinary.com/dkdbilwtj/image/upload/v1782029454/og-images_vvdlcu.jpg';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: 'Thailand Cultural Hub | Discover Thai Culture & Heritage',
    template: '%s | Thailand Cultural Hub',
  },

  description:
    'Explore Thailand cultural heritage, traditions, festivals, temples, local wisdom, arts, historical landmarks, and cultural attractions from all 77 provinces of Thailand.',

  keywords: [
    'Thailand Cultural Hub',
    'Thai Culture',
    'Thailand Culture',
    'Thai Heritage',
    'Cultural Heritage Thailand',
    'Thai Traditions',
    'Thai Festivals',
    'Thai Temples',
    'Thailand Tourism',
    'Thai Local Wisdom',
    'Traditional Thai Culture',
    'Thai Arts',
    'Thai History',
    'Cultural Attractions Thailand',
    'ประเพณีไทย',
    'วัฒนธรรมไทย',
    'แหล่งท่องเที่ยวเชิงวัฒนธรรม',
    'สถานที่สำคัญประเทศไทย',
    'มรดกวัฒนธรรมไทย',
    'ภูมิปัญญาท้องถิ่น',
    '77 จังหวัด',
    'เทศกาลไทย',
    'ศิลปวัฒนธรรมไทย',
    'วัดไทย',
  ],

  authors: [{ name: 'Thailand Cultural Hub' }],
  creator: 'Thailand Cultural Hub',
  publisher: 'Thailand Cultural Hub',

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },

  openGraph: {
    title: 'Thailand Cultural Hub',
    description:
      'Discover the rich cultural heritage, traditions, festivals, temples, landmarks, and local wisdom of Thailand.',
    url: SITE_URL,
    siteName: 'Thailand Cultural Hub',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'Thailand Cultural Hub',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Thailand Cultural Hub',
    description:
      'Explore Thai culture, traditions, festivals, temples, and heritage from all regions of Thailand.',
    images: [OG_IMAGE_URL],
  },

  alternates: {
    canonical: SITE_URL,
  },

  category: 'Culture & Heritage',
};

export default function Page() {
  return <HomeView />;
}
