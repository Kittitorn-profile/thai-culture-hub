import type { Metadata } from 'next';

import { getPublishedHomeHeroImages } from 'src/server/home-hero';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

const SITE_URL = 'https://thailandculturalhub.com';
const OG_IMAGE_URL =
  'https://res.cloudinary.com/dkdbilwtj/image/upload/v1782029454/og-images_vvdlcu.jpg';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: 'Thailand Cultural Hub | ค้นพบวัฒนธรรมไทยผ่านผู้คนและท้องถิ่น',
    template: '%s | Thailand Cultural Hub',
  },

  description:
    'ค้นหาข้อมูลวัฒนธรรมไทยตามจังหวัดและประเภทข้อมูล ทั้งสถานที่ ศิลปิน มรดกภูมิปัญญา ชุมชนชาติพันธุ์ ผลิตภัณฑ์ ผ้าและงานช่าง พร้อมแหล่งอ้างอิงและเรื่องเล่าจากสมาชิก',

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
      'สำรวจสถานที่ ศิลปิน ชุมชน ผ้าและงานช่าง และมรดกภูมิปัญญาไทย พร้อมแหล่งอ้างอิงและเรื่องเล่าจากสมาชิก',
    url: SITE_URL,
    siteName: 'Thailand Cultural Hub',
    locale: 'th_TH',
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
      'ค้นหาสถานที่ ศิลปิน ชุมชน ผลิตภัณฑ์ ผ้าและงานช่าง และมรดกภูมิปัญญาไทย พร้อมแหล่งอ้างอิงและเรื่องเล่าจากสมาชิก',
    images: [OG_IMAGE_URL],
  },

  alternates: {
    canonical: SITE_URL,
  },

  category: 'Culture & Heritage',
};

export const dynamic = 'force-dynamic';

export default async function Page() {
  const heroImages = await getPublishedHomeHeroImages();
  return <HomeView heroImages={heroImages} />;
}
