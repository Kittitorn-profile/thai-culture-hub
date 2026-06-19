export type CulturalCategory = 'heritage' | 'temple' | 'nature' | 'festival' | 'craft' | 'food';

export type CulturalPlace = {
  id: string;
  name: string;
  district: string;
  category: CulturalCategory;
  lat: number;
  lng: number;
  description: string;
  highlight: string;
};

export type CultureMetric = {
  label: string;
  value: string;
};

const PROVINCE_NAMES_TH: Record<string, string> = {
  'TH-10': 'กรุงเทพมหานคร',
  'TH-14': 'พระนครศรีอยุธยา',
  'TH-20': 'ชลบุรี',
  'TH-30': 'นครราชสีมา',
  'TH-36': 'ชัยภูมิ',
  'TH-50': 'เชียงใหม่',
  'TH-64': 'สุโขทัย',
  'TH-83': 'ภูเก็ต',
};

const CULTURAL_PLACES_BY_PROVINCE: Record<string, CulturalPlace[]> = {
  'TH-36': [
    {
      id: 'chaiyaphum-city-shrine',
      name: 'ศาลเจ้าพ่อพญาแล',
      district: 'เมืองชัยภูมิ',
      category: 'heritage',
      lat: 15.8068,
      lng: 102.0315,
      description: 'แลนด์มาร์กกลางเมืองที่เชื่อมโยงประวัติศาสตร์ท้องถิ่นและความศรัทธาของชาวชัยภูมิ',
      highlight: 'ประวัติศาสตร์เมือง',
    },
    {
      id: 'mor-hin-khao',
      name: 'มอหินขาว',
      district: 'เมืองชัยภูมิ',
      category: 'nature',
      lat: 16.0384,
      lng: 101.9927,
      description: 'กลุ่มเสาหินธรรมชาติบนพื้นที่สูงที่เป็นภาพจำของการท่องเที่ยวเชิงธรรมชาติในชัยภูมิ',
      highlight: 'ภูมิทัศน์หินทราย',
    },
    {
      id: 'tat-ton',
      name: 'น้ำตกตาดโตน',
      district: 'เมืองชัยภูมิ',
      category: 'nature',
      lat: 15.9819,
      lng: 102.0439,
      description: 'น้ำตกและป่าเขียวที่เป็นพื้นที่พักผ่อนสำคัญของจังหวัด',
      highlight: 'อุทยานและสายน้ำ',
    },
    {
      id: 'pa-hin-ngam',
      name: 'ป่าหินงาม',
      district: 'เทพสถิต',
      category: 'nature',
      lat: 15.6336,
      lng: 101.3975,
      description: 'ทุ่งดอกกระเจียวและลานหินรูปร่างแปลกตาที่สะท้อนเอกลักษณ์ภูมิประเทศอีสานตอนล่าง',
      highlight: 'ทุ่งดอกกระเจียว',
    },
    {
      id: 'sai-thong',
      name: 'อุทยานแห่งชาติไทรทอง',
      district: 'หนองบัวระเหว',
      category: 'nature',
      lat: 15.8848,
      lng: 101.4675,
      description: 'แหล่งชมทุ่งดอกกระเจียว ป่า และผาหินที่เล่าเรื่องธรรมชาติของจังหวัด',
      highlight: 'ธรรมชาติฤดูกาล',
    },
  ],
  'TH-50': [
    {
      id: 'doi-suthep',
      name: 'วัดพระธาตุดอยสุเทพ',
      district: 'เมืองเชียงใหม่',
      category: 'temple',
      lat: 18.8049,
      lng: 98.9216,
      description: 'พระธาตุคู่เมืองเชียงใหม่และจุดชมเมืองที่สะท้อนศิลปะล้านนา',
      highlight: 'ศิลปะล้านนา',
    },
    {
      id: 'old-city-chiangmai',
      name: 'คูเมืองเชียงใหม่',
      district: 'เมืองเชียงใหม่',
      category: 'heritage',
      lat: 18.7883,
      lng: 98.9853,
      description: 'โครงเมืองเก่าที่เก็บชั้นประวัติศาสตร์ วัด และวิถีชีวิตในกำแพงเมือง',
      highlight: 'เมืองเก่า',
    },
    {
      id: 'bo-sang',
      name: 'บ้านบ่อสร้าง',
      district: 'สันกำแพง',
      category: 'craft',
      lat: 18.766,
      lng: 99.083,
      description: 'ชุมชนงานหัตถกรรมร่มและกระดาษสาที่เป็นภาพจำของเชียงใหม่',
      highlight: 'หัตถกรรมร่ม',
    },
  ],
  'TH-14': [
    {
      id: 'ayutthaya-historical-park',
      name: 'อุทยานประวัติศาสตร์อยุธยา',
      district: 'พระนครศรีอยุธยา',
      category: 'heritage',
      lat: 14.3559,
      lng: 100.568,
      description: 'โบราณสถานมรดกโลกที่บันทึกความรุ่งเรืองของราชธานีเก่า',
      highlight: 'มรดกโลก',
    },
    {
      id: 'wat-chaiwatthanaram',
      name: 'วัดไชยวัฒนาราม',
      district: 'พระนครศรีอยุธยา',
      category: 'temple',
      lat: 14.3439,
      lng: 100.5418,
      description: 'วัดริมแม่น้ำเจ้าพระยาที่โดดเด่นด้วยผังและสถาปัตยกรรมสมัยอยุธยา',
      highlight: 'สถาปัตยกรรมอยุธยา',
    },
  ],
  'TH-83': [
    {
      id: 'phuket-old-town',
      name: 'ย่านเมืองเก่าภูเก็ต',
      district: 'เมืองภูเก็ต',
      category: 'heritage',
      lat: 7.884,
      lng: 98.389,
      description: 'อาคารชิโนโปรตุกีส อาหาร และวิถีชุมชนที่เกิดจากวัฒนธรรมการค้าในทะเลอันดามัน',
      highlight: 'ชิโนโปรตุกีส',
    },
    {
      id: 'wat-chalong',
      name: 'วัดฉลอง',
      district: 'เมืองภูเก็ต',
      category: 'temple',
      lat: 7.8469,
      lng: 98.3367,
      description: 'วัดสำคัญของภูเก็ตและศูนย์รวมความศรัทธาของผู้คนในพื้นที่',
      highlight: 'ศรัทธาท้องถิ่น',
    },
  ],
};

export const CULTURE_CATEGORY_LABELS: Record<CulturalCategory, string> = {
  heritage: 'ประวัติศาสตร์',
  temple: 'ศาสนสถาน',
  nature: 'ธรรมชาติ',
  festival: 'เทศกาล',
  craft: 'หัตถกรรม',
  food: 'อาหาร',
};

export const CULTURE_CATEGORY_COLORS: Record<CulturalCategory, string> = {
  heritage: '#8F3D20',
  temple: '#C89B3C',
  nature: '#167A3A',
  festival: '#C23B68',
  craft: '#4E6C9D',
  food: '#B85C2E',
};

export function getProvinceDisplayName(provinceId: string, provinceName?: string) {
  if (PROVINCE_NAMES_TH[provinceId]) {
    return PROVINCE_NAMES_TH[provinceId];
  }

  return (provinceName || provinceId).replace(/\s+Province$/i, '');
}

export function getProvinceCulturalPlaces(
  provinceId: string,
  provinceName?: string
): CulturalPlace[] {
  return CULTURAL_PLACES_BY_PROVINCE[provinceId] ?? [];
}

export function getCultureMetrics(places: CulturalPlace[]): CultureMetric[] {
  const categoryCount = new Set(places.map((place) => place.category)).size;
  const districtCount = new Set(places.map((place) => place.district)).size;

  return [
    { label: 'สถานที่แนะนำ', value: `${places.length}` },
    { label: 'หมวดวัฒนธรรม', value: `${categoryCount}` },
    { label: 'พื้นที่/อำเภอ', value: `${districtCount}` },
    { label: 'พิกัดบนแผนที่', value: places.length ? 'พร้อมสำรวจ' : 'รอข้อมูล' },
  ];
}
