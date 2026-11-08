export const PUBLIC_DATA_GROUPS = [
  {
    key: 'places',
    label: 'สถานที่และข้อมูลวัฒนธรรม',
    href: '/culture-category/',
    description: 'สถานที่ท่องเที่ยว ศาสนสถาน อาหาร ประเพณี และแหล่งเรียนรู้จากหลายแหล่งข้อมูล',
  },
  {
    key: 'artists',
    label: 'ศิลปิน',
    href: '/cultural-artists/',
    description:
      'ศิลปินแห่งชาติ ศิลปินพื้นบ้าน และผู้สร้างสรรค์ พร้อมประวัติและหลักฐานความเกี่ยวข้องกับจังหวัด',
  },
  {
    key: 'heritage',
    label: 'มรดกภูมิปัญญา',
    href: '/cultural-heritage/',
    description: 'ทะเบียนมรดกภูมิปัญญาทางวัฒนธรรมจากกรมส่งเสริมวัฒนธรรม อ่านจาก Data.go.th',
  },
  {
    key: 'ethnic',
    label: 'ชุมชนชาติพันธุ์',
    href: '/ethnic-groups/',
    description:
      'ข้อมูลชุมชนและพื้นที่อ้างอิงตามต้นทาง พิกัดไม่ใช่ขอบเขตพื้นที่ทั้งหมดของชาติพันธุ์',
  },
  {
    key: 'products',
    label: 'ผลิตภัณฑ์วัฒนธรรม',
    href: '/cultural-products/',
    description: 'ผลิตภัณฑ์วัฒนธรรมไทย (CPOT) พร้อมประเภท ชุมชน และแหล่งข้อมูลต้นฉบับ',
  },
  {
    key: 'fabric',
    label: 'ภูมิปัญญาผ้าไทย',
    href: '/thai-fabric/',
    description: 'ผ้าไทย ลวดลาย วัสดุ เทคนิค และภูมิปัญญาการทอจากชุดข้อมูลต้นฉบับ',
  },
  {
    key: 'community',
    label: 'วิถีชีวิตและหัตถกรรม',
    href: '/community-crafts/',
    description: 'เรื่องราวการทอผ้า เสื่อ จักสาน และงานช่างชุมชนที่รวบรวมพร้อมแหล่งอ้างอิง',
  },
] as const;
export type PublicDataGroup = (typeof PUBLIC_DATA_GROUPS)[number]['key'];
