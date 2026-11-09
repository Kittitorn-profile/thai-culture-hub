export const ARTIST_GROUPS = [
  {
    key: 'national_artist',
    label: 'ทำเนียบศิลปินแห่งชาติ',
    source: 'กรมส่งเสริมวัฒนธรรม',
    url: 'https://data.go.th/dataset/art_31_01',
  },
  {
    key: 'contemporary_artist',
    label: 'ศิลปินร่วมสมัย',
    source: 'สำนักงานศิลปวัฒนธรรมร่วมสมัย',
    url: 'https://data.go.th/dataset/artist',
  },
  {
    key: 'silpathorn_artist',
    label: 'ศิลปินศิลปาธร',
    source: 'สำนักงานศิลปวัฒนธรรมร่วมสมัย',
    url: 'https://data.go.th/dataset/silpathorn',
  },
  {
    key: 'folk_artist',
    label: 'ศิลปินพื้นบ้าน',
    source: 'ทะเบียนพื้นบ้านและประวัติรายบุคคล',
    url: 'https://data.go.th/dataset/dataset_41_181',
  },
  {
    key: 'local_artist',
    label: 'ศิลปินท้องถิ่น',
    source: 'มหาวิทยาลัยและประวัติรายบุคคล',
    url: '',
  },
  {
    key: 'performing_artist',
    label: 'นักร้องและนักดนตรี',
    source: 'ต้นสังกัด ผู้จัดรายการ และสื่อสัมภาษณ์',
    url: 'https://www.gmmgrammy.com/newsroom/news-single.php?id=4381',
  },
] as const;
export const COMMUNITY_GROUPS = [
  { key: 'lifestyle', label: 'วิถีชีวิตและความเชื่อ', category: 'วิถีชีวิตชุมชน' },
  { key: 'weaving', label: 'ผ้าและการทอผ้า', category: 'การทอผ้า' },
  { key: 'mats', label: 'ทอเสื่อและสาด', category: 'ทอเสื่อ/สาด' },
  { key: 'basketry', label: 'งานจักสาน', category: 'จักสาน' },
  { key: 'products', label: 'ผลิตภัณฑ์ชุมชน', category: 'ผลิตภัณฑ์ชุมชน' },
  { key: 'otop', label: 'OTOP ตามแหล่งอ้างอิง', category: 'OTOP ตามแหล่งอ้างอิง' },
  { key: 'support-centers', label: 'ศูนย์ศิลปาชีพ', category: 'ศูนย์ศิลปาชีพ' },
] as const;

export type CommunityGroupKey = (typeof COMMUNITY_GROUPS)[number]['key'];
