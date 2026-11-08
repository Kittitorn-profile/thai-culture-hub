export const PUBLIC_DATA_GROUPS = [
  {
    key: 'places',
    label: 'สถานที่และแหล่งวัฒนธรรม',
    href: '/culture-category/',
    description:
      'ค้นหาสถานที่จริง เช่น วัด พิพิธภัณฑ์ แหล่งท่องเที่ยว และแหล่งเรียนรู้ พร้อมข้อมูลพื้นที่',
  },
  {
    key: 'artists',
    label: 'ศิลปินและผู้สร้างสรรค์',
    href: '/cultural-artists/',
    description:
      'ศิลปินแห่งชาติ ศิลปินพื้นบ้าน และผู้สร้างสรรค์ พร้อมประวัติและหลักฐานความเกี่ยวข้องกับจังหวัด',
  },
  {
    key: 'heritage',
    label: 'ทะเบียนมรดกภูมิปัญญา',
    href: '/cultural-heritage/',
    description:
      'ค้นรายการในทะเบียนกรมส่งเสริมวัฒนธรรม เช่น ประเพณี การแสดง และงานช่าง พร้อมข้อมูลการขึ้นบัญชี',
  },
  {
    key: 'ethnic',
    label: 'ชุมชนชาติพันธุ์',
    href: '/ethnic-groups/',
    description:
      'รู้จักกลุ่มชาติพันธุ์ หมู่บ้าน และพื้นที่อยู่อาศัย พร้อมเรื่องราวและข้อมูลของชุมชน',
  },
  {
    key: 'products',
    label: 'สินค้าชุมชนและผลิตภัณฑ์ (CPOT)',
    href: '/cultural-products/',
    description:
      'ดูรายการสินค้าในโครงการ CPOT เช่น ของใช้ ของตกแต่ง และของที่ระลึก พร้อมข้อมูลผลิตภัณฑ์',
  },
  {
    key: 'crafts',
    label: 'ผ้าและทักษะงานช่าง',
    href: '/crafts/',
    description:
      'เรียนรู้ชนิดผ้า ลวดลาย วัสดุ วิธีทำ และการสืบทอดงานทอ ย้อมสี จักสาน และงานฝีมือพื้นบ้าน',
  },
] as const;
export type PublicDataGroup = (typeof PUBLIC_DATA_GROUPS)[number]['key'];

export const CRAFT_CATEGORIES = [
  { key: 'weaving', label: 'ผ้าและการทอผ้า', category: 'การทอผ้า' },
  { key: 'dyeing', label: 'ผ้าบาติกและมัดย้อม', category: 'ผ้าเขียนลายและมัดย้อม' },
  { key: 'mats', label: 'ทอเสื่อ', category: 'ทอเสื่อ/สาด' },
  { key: 'basketry', label: 'จักสาน', category: 'จักสาน' },
  { key: 'stories', label: 'การสืบทอดและพัฒนางานช่าง', category: 'เรื่องราวงานช่าง' },
  { key: 'support-centers', label: 'แหล่งเรียนรู้งานช่าง', category: 'ศูนย์ศิลปาชีพ' },
] as const;
export type CraftCategory = (typeof CRAFT_CATEGORIES)[number]['key'];

// Public navigation uses one primary category; source tags remain available in details.
export function getPrimaryCraftCategory(categories: readonly string[]): CraftCategory {
  if (categories.includes('ผ้าเขียนลายและมัดย้อม')) return 'dyeing';
  if (categories.includes('การทอผ้า')) return 'weaving';
  if (categories.includes('ทอเสื่อ/สาด')) return 'mats';
  if (categories.includes('จักสาน')) return 'basketry';
  if (categories.includes('ศูนย์ศิลปาชีพ')) return 'support-centers';
  return 'stories';
}

export function normalizeCraftCategory(value: string): string {
  return value === 'lifestyle' || value === 'products' ? 'stories' : value;
}
