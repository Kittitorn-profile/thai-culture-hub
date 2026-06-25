import type { HomeAnalyticsSummary } from './home-types';
import type { IconifyName } from 'src/components/iconify/register-icons';

export const HOME_BG_TOP = '#6f8790';
export const HOME_BG_MIDDLE = '#7b8476';
export const HOME_BG_BOTTOM = '#8f7c5c';
export const HOME_TEXT = '#f8f6ee';
export const HOME_DEEP = '#2a3736';
export const HOME_SECTION_MAX_WIDTH = 1280;
export const HOME_SECTION_PX = { xs: 2.5, sm: 4, md: 6, lg: 8 };
export const HOME_SHARED_BACKGROUND = `
  radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
  linear-gradient(180deg, ${HOME_BG_TOP} 0%, ${HOME_BG_MIDDLE} 54%, ${HOME_BG_BOTTOM} 100%)
`;
export const HOME_POSTER_PATTERN = `
  repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
  repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px),
  linear-gradient(120deg, transparent 0 58%, rgba(229,221,198,0.13) 58% 59%, transparent 59% 100%)
`;

export const POSTER_FRAME_IMAGES = [
  {
    src: '/assets/th-hub/bg-1.png',
    alt: 'การแสดงศิลปวัฒนธรรมไทย',
    sx: {
      top: { xs: 0, md: -12 },
      left: { xs: -10, md: -10 },
      width: { xs: 400, sm: 600, md: 1200 },
    },
  },
];

export const HOME_HIGHLIGHTS = [
  {
    icon: '01',
    title: 'ค้นจากแผนที่จังหวัด',
    body: 'เลือกจังหวัดเพื่อดูสถานที่ วัฒนธรรม และหมวดข้อมูลที่เชื่อมกับพื้นที่จริง',
  },
  {
    icon: '02',
    title: 'รวมข้อมูลหลายแหล่ง',
    body: 'จัดกลุ่มข้อมูลจาก ททท. กรมศิลปากร และบัญชีข้อมูลวัฒนธรรมให้สำรวจง่ายขึ้น',
  },
  {
    icon: '03',
    title: 'ดูตามอำเภอและหมวดหมู่',
    body: 'แยกสถานที่ ประเพณี อาหาร หัตถกรรม การแสดง และภูมิปัญญาตามบริบทท้องถิ่น',
  },
];

export const STORY_MEDIA_SECTION_KEY = 'story-media';
export const LOCAL_WISDOM_SECTION_KEY = 'local-wisdom';
export const CULTURE_CATEGORIES_SECTION_KEY = 'culture-categories';

export const DATA_FEATURES = [
  {
    icon: 'solar:file-text-bold' as IconifyName,
    title: 'ข้อมูลมีโครงสร้าง',
    description:
      'จัดเก็บชื่อสถานที่ จังหวัด อำเภอ หมวดหมู่ พิกัด รูปภาพ และแหล่งอ้างอิงให้พร้อมใช้งานต่อ',
  },
  {
    icon: 'solar:add-folder-bold' as IconifyName,
    title: 'ต่อยอดได้หลายมุมมอง',
    description:
      'นำข้อมูลเดียวกันไปแสดงได้ทั้งหน้าจังหวัด หน้าหมวด แผนที่ รายการสถานที่ และบทความประกอบ',
  },
  {
    icon: 'solar:shield-check-bold' as IconifyName,
    title: 'ตรวจสอบและแก้ไขได้',
    description:
      'รองรับคำขอแก้ไขจากผู้ใช้และ Creator ก่อนให้ทีมงานตรวจสอบ เพื่อให้ข้อมูลค่อย ๆ แม่นยำขึ้น',
  },
  {
    icon: 'solar:calendar-date-bold' as IconifyName,
    title: 'พร้อมขยายในอนาคต',
    description:
      'เพิ่มชุดข้อมูลใหม่ หมวดใหม่ หรือแหล่งข้อมูลจากหน่วยงานอื่นได้ โดยไม่ต้องเปลี่ยนประสบการณ์หลัก',
  },
];

export const DATA_FLOW_STEPS = [
  {
    label: 'รวบรวม',
    title: 'นำเข้าข้อมูลหลายแหล่ง',
    description: 'รวมข้อมูลจากฐานข้อมูลวัฒนธรรม แหล่งท่องเที่ยว และข้อมูลที่ทีมงานดูแล',
  },
  {
    label: 'จัดระเบียบ',
    title: 'ทำให้ค้นหาและเปรียบเทียบง่าย',
    description: 'ผูกข้อมูลกับจังหวัด อำเภอ หมวดหมู่ พิกัด และแหล่งอ้างอิง',
  },
  {
    label: 'ต่อยอด',
    title: 'เปิดให้ชุมชนช่วยพัฒนา',
    description: 'Creator และผู้ใช้ช่วยเสนอแก้ไขข้อมูล ก่อนนำไปใช้ในระบบหลัก',
  },
];

export const DEFAULT_HOME_ANALYTICS: HomeAnalyticsSummary = {
  days: 30,
  pageViews: 0,
  visitors: 0,
  sessions: 0,
  topSearches: [],
  topProvinces: [],
  topDistricts: [],
};

export const CREATOR_ARTICLES_LIMIT = 8;
export const FEATURED_CULTURE_CATEGORY_LIMIT = 6;
