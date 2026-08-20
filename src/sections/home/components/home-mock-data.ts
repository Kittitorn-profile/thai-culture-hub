import type { PerformanceGroupEntry, PerformanceGroupsContent } from './home-types';

function createGroup(
  id: string,
  name: string,
  category: string,
  provinceName: string,
  coverIndex: number,
  avatarIndex: number,
  featured = false
): PerformanceGroupEntry {
  return {
    id,
    name,
    category,
    provinceName,
    provinceCode: '',
    logoUrl: `/assets/images/mock/avatar/avatar-${avatarIndex}.webp`,
    coverImageUrl: `/assets/images/mock/travel/travel-${coverIndex}.webp`,
    primaryColor: featured ? '#b6853d' : '#637e69',
    isPublished: true,
    isFeatured: featured,
    acceptsBookings: true,
    contactPhone: '081-234-5678',
    contactEmail: `${id}@example.com`,
    lineUrl: 'https://line.me/',
    facebookUrl: 'https://www.facebook.com/',
    youtubeUrl: 'https://www.youtube.com/',
    managers: ['สมหมาย ใจดี'],
    coManagers: [],
    principalMembers: ['พิมพ์ชนก แสงทอง', 'ณัฐวุฒิ ภูผา'],
    leadRoles: ['นักร้องนำ', 'หัวหน้าวง'],
    otherPositions: ['เครื่องดนตรีพื้นบ้าน', 'กลอง', 'เครื่องประกอบจังหวะ'],
    personnel: [],
    totalMembers: 10,
    description: `วง${category}จากจังหวัด${provinceName} ถ่ายทอดอัตลักษณ์ท้องถิ่นผ่านดนตรีและการแสดงร่วมสมัย`,
    yearlyData: [],
  };
}

const SOUTHERN_NORA_GROUP: PerformanceGroupEntry = {
  ...createGroup(
    'mock-southern-nora-band',
    'โนราศรีสมุทร',
    'ดนตรีและการแสดงโนรา',
    'นครศรีธรรมราช',
    10,
    21,
    true
  ),
  contactPhone: '089-876-5432',
  managers: ['ครูประสิทธิ์ ทองแท้'],
  coManagers: ['สายฝน ชูศิลป์'],
  principalMembers: ['ชลธิชา แก้วมณี', 'ภาณุพงศ์ ศรีสวัสดิ์', 'วรัญญา รัตนศิลป์'],
  leadRoles: ['โนราใหญ่', 'นายโรง', 'นักร้องนำ', 'ลูกคู่'],
  otherPositions: ['ทับ', 'กลอง', 'โหม่ง', 'ปี่', 'ฉิ่ง', 'ฝ่ายเครื่องแต่งกาย'],
  totalMembers: 15,
  description:
    'คณะโนราที่อนุรักษ์บทร้องและจังหวะดั้งเดิมของภาคใต้ พร้อมประยุกต์รูปแบบการแสดงสำหรับเวทีร่วมสมัย',
  personnel: [
    ['nora-person-1', 'โนราใหญ่และนายโรง', 'ชลธิชา แก้วมณี', 'ครูน้ำ', 1, 12, 38],
    ['nora-person-2', 'นักดนตรีปี่', 'ภาณุพงศ์ ศรีสวัสดิ์', 'หนึ่ง', 2, 9, 34],
    ['nora-person-3', 'นักร้องนำและลูกคู่', 'วรัญญา รัตนศิลป์', 'ใบเฟิร์น', 3, 7, 29],
    ['nora-person-4', 'นักดนตรีทับและกลอง', 'ธนกร เพชรเมือง', 'บอล', 4, 6, 31],
    ['nora-person-5', 'นักแสดงและฝ่ายเครื่องแต่งกาย', 'กมลชนก ทองประดับ', 'เมย์', 5, 4, 26],
  ].map(([id, role, fullName, nickname, imageIndex, yearsWithGroup, age]) => ({
    id: String(id),
    role: String(role),
    fullName: String(fullName),
    nickname: String(nickname),
    imageUrl: `/assets/images/mock/portrait/portrait-${imageIndex}.webp`,
    yearsWithGroup: Number(yearsWithGroup),
    age: Number(age),
    education: 'ศิลปศาสตรบัณฑิต สาขาศิลปะการแสดงและดนตรีไทย',
    otherDetails: 'ร่วมถ่ายทอดองค์ความรู้และฝึกซ้อมการแสดงให้สมาชิกเยาวชนในชุมชน',
  })),
  yearlyData: [
    {
      year: '2568',
      organizerName: 'สภาวัฒนธรรมจังหวัดนครศรีธรรมราช',
      organizerColor: '#8b5e3c',
      organizerLogoUrl: '/assets/images/mock/company/company-1.webp',
      details: 'ออกแสดงในเทศกาลศิลปวัฒนธรรมภาคใต้ 8 จังหวัด รวมทั้งหมด 24 รอบ',
      about: 'โครงการโนราสู่คนรุ่นใหม่ ถ่ายทอดท่ารำ บทร้อง และดนตรีผ่านเวทีร่วมสมัย',
      storyTypes: ['โนราโรงครู', 'โนราร่วมสมัย', 'บทขับร้องพื้นบ้าน'],
      bookletUrl: '/assets/images/mock/course/about-summary.webp',
      bookletName: 'สูจิบัตรโนราสู่คนรุ่นใหม่ 2568',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      singerIds: ['nora-person-1', 'nora-person-3'],
      leadPerformerIds: ['nora-person-1', 'nora-person-5'],
      performanceImages: [
        '/assets/images/mock/travel/travel-10.webp',
        '/assets/images/mock/travel/travel-11.webp',
        '/assets/images/mock/travel/travel-12.webp',
      ],
      awards: [
        {
          year: '2568',
          title: 'รางวัลคณะศิลปินพื้นบ้านสร้างสรรค์ดีเด่น',
          description: 'รางวัลสมมติสำหรับใช้แสดงรูปแบบข้อมูลในระบบ',
        },
        {
          year: '2568',
          title: 'รางวัลขวัญใจผู้ชมเทศกาลศิลปวัฒนธรรมภาคใต้',
          description: 'ได้รับคะแนนจากผู้ชมสูงสุดในกิจกรรมตัวอย่าง',
        },
      ],
      note: 'ข้อมูลทั้งหมดเป็นข้อมูลจำลองสำหรับทดสอบการแสดงผล',
    },
  ],
};

const PONGLANG_KALASIN_GROUP: PerformanceGroupEntry = {
  ...createGroup(
    'mock-ponglang-kalasin',
    'โปงลางเสียงกาฬสินธุ์',
    'วงโปงลาง',
    'กาฬสินธุ์',
    5,
    12,
    true
  ),
  primaryColor: '#a85f38',
  contactPhone: '086-245-7890',
  contactEmail: 'ponglang.kalasin@example.com',
  managers: ['ครูบุญส่ง ภูไท'],
  coManagers: ['อรทัย แสงคำ'],
  principalMembers: ['ธีรภัทร คำลือ', 'วาสนา ภูทอง', 'ณัฐพล แก้วกุดหว้า'],
  leadRoles: ['หัวหน้าวง', 'โปงลางเอก', 'นักร้องนำ', 'นางรำ'],
  otherPositions: ['พิณ', 'แคน', 'โหวด', 'กลองยาว', 'ฉาบ', 'เครื่องแต่งกาย'],
  totalMembers: 18,
  description:
    'วงโปงลางเยาวชนจากจังหวัดกาฬสินธุ์ที่สืบสานทำนองพื้นบ้านอีสาน ผสมผสานโปงลาง พิณ แคน และโหวดเข้ากับการแสดงร่วมสมัยอย่างมีชีวิตชีวา',
  personnel: [
    ['ponglang-person-1', 'หัวหน้าวงและครูผู้ฝึกสอน', 'ธีรภัทร คำลือ', 'ครูเบียร์', 6, 11, 36],
    ['ponglang-person-2', 'โปงลางเอก', 'วาสนา ภูทอง', 'น้ำหวาน', 7, 8, 27],
    ['ponglang-person-3', 'นักร้องนำ', 'ณัฐพล แก้วกุดหว้า', 'นนท์', 8, 7, 29],
    ['ponglang-person-4', 'หมอแคนและโหวด', 'ศุภชัย ดอนจันทร์', 'ตั้ม', 1, 6, 31],
    ['ponglang-person-5', 'พิณและเรียบเรียงดนตรี', 'กิตติศักดิ์ ภูผา', 'ก้อง', 2, 5, 28],
    ['ponglang-person-6', 'หัวหน้าทีมนางรำ', 'ชญานิศ แสงทอง', 'แพรว', 3, 4, 25],
  ].map(([id, role, fullName, nickname, imageIndex, yearsWithGroup, age]) => ({
    id: String(id),
    role: String(role),
    fullName: String(fullName),
    nickname: String(nickname),
    imageUrl: `/assets/images/mock/portrait/portrait-${imageIndex}.webp`,
    yearsWithGroup: Number(yearsWithGroup),
    age: Number(age),
    education: 'ศิลปกรรมศาสตรบัณฑิต สาขาดนตรีพื้นบ้านและศิลปะการแสดง',
    otherDetails: 'ร่วมสร้างสรรค์การแสดงและถ่ายทอดทักษะดนตรีพื้นบ้านให้เยาวชนในจังหวัดกาฬสินธุ์',
  })),
  yearlyData: [
    {
      year: '2568',
      logoUrl: '/assets/images/mock/avatar/avatar-12.webp',
      organizerName: 'สมาคมศิลปินพื้นบ้านกาฬสินธุ์',
      organizerColor: '#a85f38',
      organizerLogoUrl: '/assets/images/mock/company/company-2.webp',
      details: 'เดินสายแสดงงานวัฒนธรรม 12 จังหวัด และจัดเวิร์กช็อปโปงลางสำหรับเยาวชน 6 รุ่น',
      about: 'ชุดการแสดง “เสียงโปงลางจากทุ่งกาฬสินธุ์” ถ่ายทอดวิถีชุมชนผ่านดนตรีและนาฏศิลป์อีสาน',
      storyTypes: ['โปงลางร่วมสมัย', 'เซิ้งกาฬสินธุ์', 'เพลงพื้นบ้านอีสาน'],
      bookletUrl: '/assets/images/mock/course/about-summary.webp',
      bookletName: 'สูจิบัตรเสียงโปงลาง 2568',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      singerIds: ['ponglang-person-3'],
      leadPerformerIds: ['ponglang-person-2', 'ponglang-person-6'],
      performanceImages: [
        '/assets/images/mock/travel/travel-5.webp',
        '/assets/images/mock/travel/travel-6.webp',
        '/assets/images/mock/travel/travel-7.webp',
      ],
      awards: [
        {
          year: '2568',
          title: 'รางวัลวงโปงลางเยาวชนสร้างสรรค์ดีเด่น',
          description: 'รางวัลสมมติสำหรับทดสอบการแสดงผลข้อมูลผลงานและรางวัล',
        },
        {
          year: '2568',
          title: 'รางวัลการเรียบเรียงดนตรีพื้นบ้านร่วมสมัย',
          description: 'โดดเด่นด้านการประสานเสียงโปงลาง พิณ แคน และโหวด',
        },
      ],
      note: 'ข้อมูลเป็น mock data สำหรับการพัฒนาเว็บไซต์',
    },
    {
      year: '2567',
      organizerName: 'เครือข่ายเยาวชนโปงลางอีสาน',
      organizerColor: '#637e69',
      organizerLogoUrl: '/assets/images/mock/company/company-3.webp',
      details: 'จัดการแสดงแลกเปลี่ยนวัฒนธรรมและฝึกอบรมวงโปงลางโรงเรียนในพื้นที่ 10 แห่ง',
      about: 'โครงการลูกอีสานสืบสานเสียงโปงลาง สร้างเครือข่ายเยาวชนดนตรีพื้นบ้าน',
      storyTypes: ['ดนตรีเพื่อการศึกษา', 'โปงลางเยาวชน'],
      singerIds: ['ponglang-person-3'],
      leadPerformerIds: ['ponglang-person-2', 'ponglang-person-6'],
      performanceImages: [
        '/assets/images/mock/travel/travel-8.webp',
        '/assets/images/mock/travel/travel-9.webp',
      ],
      awards: [
        {
          year: '2567',
          title: 'เครือข่ายเยาวชนวัฒนธรรมดีเด่น',
          description: 'รางวัลสมมติจากกิจกรรมส่งเสริมศิลปวัฒนธรรมระดับจังหวัด',
        },
      ],
      note: 'เริ่มจัดทำบทเพลงและแบบฝึกโปงลางฉบับดิจิทัล',
    },
  ],
};

export const MOCK_PERFORMANCE_GROUPS: PerformanceGroupsContent = {
  title: 'เสียงดนตรีจากศิลปินทั่วถิ่นไทย',
  description: 'ทำความรู้จักศิลปินและวงดนตรีที่นำรากวัฒนธรรมท้องถิ่นมาต่อยอด',
  groups: [
    createGroup('mock-isan-molam-band', 'คณะเสียงแคนแดนอีสาน', 'หมอลำร่วมสมัย', 'ขอนแก่น', 7, 17, true),
    createGroup('mock-lanna-folk-band', 'ล้านนาร่วมสมัย', 'ดนตรีพื้นเมืองล้านนา', 'เชียงใหม่', 3, 20, true),
    SOUTHERN_NORA_GROUP,
    createGroup('mock-central-piphat-band', 'ปี่พาทย์บ้านเจ้าพระยา', 'วงปี่พาทย์', 'พระนครศรีอยุธยา', 14, 16),
    PONGLANG_KALASIN_GROUP,
    createGroup('mock-ranad-siam', 'ระนาดสยามเยาวชน', 'ดนตรีไทยร่วมสมัย', 'กรุงเทพมหานคร', 9, 9),
    createGroup('mock-suphan-folk-song', 'เพลงพื้นบ้านสุพรรณ', 'เพลงอีแซว', 'สุพรรณบุรี', 2, 8),
    createGroup('mock-pattani-dikir', 'ดิเกร์ฮูลูปัตตานี', 'ดิเกร์ฮูลู', 'ปัตตานี', 6, 7),
  ],
};

export function mergeWithMockPerformanceGroups(content?: PerformanceGroupsContent) {
  const realGroups = content?.groups ?? [];
  const realGroupIds = new Set(realGroups.map((group) => group.id || group.name));

  return {
    title: content?.title || MOCK_PERFORMANCE_GROUPS.title,
    description: content?.description || MOCK_PERFORMANCE_GROUPS.description,
    groups: [
      ...realGroups,
      ...MOCK_PERFORMANCE_GROUPS.groups.filter(
        (group) => !realGroupIds.has(group.id || group.name)
      ),
    ],
  } satisfies PerformanceGroupsContent;
}
