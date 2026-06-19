import provinces from 'src/data/thailand-culture/provinces';

export type CulturalCategory =
  | 'tourist_attraction'
  | 'heritage'
  | 'temple'
  | 'nature'
  | 'museum'
  | 'craft'
  | 'landmark'
  | 'cultural_attraction'
  | 'festival'
  | 'folk_art'
  | 'food'
  | 'costume'
  | 'learning_center'
  | 'moral_community'
  | 'local_tradition'
  | 'ritual'
  | 'local_food'
  | 'performing_art'
  | 'craftsmanship'
  | 'community_wisdom';

export type CulturalPlace = {
  id: string;
  name: string;
  district: string;
  category: CulturalCategory;
  lat: number;
  lng: number;
  description: string;
  highlight: string;
  imageUrls?: string[];
  sourceUrl?: string;
  mapUrl?: string;
  source?: 'local' | 'tat' | 'culture_catalog' | 'finearts_archeology';
};

export type CultureMetric = {
  label: string;
  value: string;
};

const PROVINCE_NAMES_TH: Record<string, string> = Object.fromEntries(
  provinces.map((province) => [province.code, province.name])
);

const CULTURAL_PLACES_BY_PROVINCE: Record<string, CulturalPlace[]> = {
  'TH-10': [
    {
      id: 'grand-palace',
      name: 'พระบรมมหาราชวัง',
      district: 'พระนคร',
      category: 'heritage',
      lat: 13.7501,
      lng: 100.4913,
      description:
        'พระราชวังสำคัญริมเกาะรัตนโกสินทร์ที่รวมสถาปัตยกรรม ศิลปกรรม และประวัติศาสตร์ราชสำนักไทย',
      highlight: 'สัญลักษณ์กรุงรัตนโกสินทร์',
    },
    {
      id: 'wat-phra-kaew',
      name: 'วัดพระศรีรัตนศาสดาราม',
      district: 'พระนคร',
      category: 'temple',
      lat: 13.7515,
      lng: 100.4927,
      description: 'พระอารามหลวงในเขตพระบรมมหาราชวังและที่ประดิษฐานพระแก้วมรกต',
      highlight: 'พระแก้วมรกต',
    },
    {
      id: 'wat-arun',
      name: 'วัดอรุณราชวราราม',
      district: 'บางกอกใหญ่',
      category: 'temple',
      lat: 13.7437,
      lng: 100.4889,
      description: 'วัดริมแม่น้ำเจ้าพระยาที่โดดเด่นด้วยพระปรางค์ประดับกระเบื้องเคลือบ',
      highlight: 'พระปรางค์ริมเจ้าพระยา',
    },
    {
      id: 'wat-pho',
      name: 'วัดพระเชตุพนวิมลมังคลาราม',
      district: 'พระนคร',
      category: 'temple',
      lat: 13.7466,
      lng: 100.4931,
      description: 'วัดเก่าแก่ที่มีพระพุทธไสยาสน์และเป็นแหล่งภูมิปัญญานวดแผนไทย',
      highlight: 'พระนอนและนวดไทย',
    },
    {
      id: 'jim-thompson-house',
      name: 'บ้านจิม ทอมป์สัน',
      district: 'ปทุมวัน',
      category: 'museum',
      lat: 13.7493,
      lng: 100.528,
      description: 'พิพิธภัณฑ์เรือนไทยที่รวบรวมศิลปวัตถุและเล่าเรื่องผ้าไหมไทยในยุคสมัยใหม่',
      highlight: 'เรือนไทยและผ้าไหม',
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
    {
      id: 'wat-mahathat-ayutthaya',
      name: 'วัดมหาธาตุ',
      district: 'พระนครศรีอยุธยา',
      category: 'temple',
      lat: 14.3572,
      lng: 100.5679,
      description: 'โบราณสถานกลางเมืองเก่าที่มีเศียรพระพุทธรูปในรากไม้เป็นภาพจำสำคัญของอยุธยา',
      highlight: 'เศียรพระในรากไม้',
    },
    {
      id: 'bang-pa-in-palace',
      name: 'พระราชวังบางปะอิน',
      district: 'บางปะอิน',
      category: 'heritage',
      lat: 14.2327,
      lng: 100.5787,
      description: 'พระราชวังฤดูร้อนที่ผสมผสานสถาปัตยกรรมไทย จีน และตะวันตกในพื้นที่ริมแม่น้ำ',
      highlight: 'พระราชวังฤดูร้อน',
    },
    {
      id: 'chao-sam-phraya-museum',
      name: 'พิพิธภัณฑสถานแห่งชาติเจ้าสามพระยา',
      district: 'พระนครศรีอยุธยา',
      category: 'museum',
      lat: 14.3522,
      lng: 100.5589,
      description: 'พิพิธภัณฑ์ที่เก็บรักษาเครื่องทอง ศิลปวัตถุ และหลักฐานสำคัญจากเมืองโบราณอยุธยา',
      highlight: 'เครื่องทองอยุธยา',
    },
  ],
  'TH-20': [
    {
      id: 'sanctuary-of-truth',
      name: 'ปราสาทสัจธรรม',
      district: 'บางละมุง',
      category: 'heritage',
      lat: 12.9728,
      lng: 100.8893,
      description: 'อาคารไม้แกะสลักริมทะเลที่ถ่ายทอดแนวคิดศิลปะ ความเชื่อ และภูมิปัญญาช่างไทย',
      highlight: 'งานไม้แกะสลัก',
    },
    {
      id: 'nong-nooch-garden',
      name: 'สวนนงนุชพัทยา',
      district: 'สัตหีบ',
      category: 'landmark',
      lat: 12.7611,
      lng: 100.9327,
      description: 'สวนพฤกษศาสตร์และพื้นที่จัดแสดงวัฒนธรรมที่เป็นจุดหมายสำคัญของภาคตะวันออก',
      highlight: 'สวนวัฒนธรรม',
    },
    {
      id: 'bang-saen-beach',
      name: 'หาดบางแสน',
      district: 'เมืองชลบุรี',
      category: 'nature',
      lat: 13.2858,
      lng: 100.9163,
      description: 'ชายหาดใกล้กรุงเทพฯ ที่ผูกกับวิถีพักผ่อน อาหารทะเล และเมืองชายฝั่งชลบุรี',
      highlight: 'วิถีชายทะเล',
    },
    {
      id: 'koh-sichang',
      name: 'เกาะสีชัง',
      district: 'เกาะสีชัง',
      category: 'nature',
      lat: 13.1618,
      lng: 100.8056,
      description: 'เกาะประวัติศาสตร์ในอ่าวไทยที่มีชุมชนเก่า ศาสนสถาน และร่องรอยราชสำนัก',
      highlight: 'เกาะประวัติศาสตร์',
    },
    {
      id: 'wat-yansangwararam',
      name: 'วัดญาณสังวรารามวรมหาวิหาร',
      district: 'บางละมุง',
      category: 'temple',
      lat: 12.7902,
      lng: 100.9587,
      description: 'พระอารามหลวงที่มีสถาปัตยกรรมหลากรูปแบบและบรรยากาศสงบใกล้เขาชีจรรย์',
      highlight: 'พระอารามหลวง',
    },
  ],
  'TH-30': [
    {
      id: 'phimai-historical-park',
      name: 'อุทยานประวัติศาสตร์พิมาย',
      district: 'พิมาย',
      category: 'heritage',
      lat: 15.2206,
      lng: 102.4948,
      description: 'ปราสาทหินขอมขนาดใหญ่ที่สะท้อนความรุ่งเรืองของเส้นทางวัฒนธรรมโบราณในอีสาน',
      highlight: 'ปราสาทหินพิมาย',
    },
    {
      id: 'khao-yai-national-park',
      name: 'อุทยานแห่งชาติเขาใหญ่',
      district: 'ปากช่อง',
      category: 'nature',
      lat: 14.4399,
      lng: 101.3722,
      description: 'ผืนป่ามรดกโลกที่เชื่อมโยงธรรมชาติ น้ำตก และความหลากหลายทางชีวภาพของดงพญาเย็น',
      highlight: 'ป่ามรดกโลก',
    },
    {
      id: 'thao-suranari-monument',
      name: 'อนุสาวรีย์ท้าวสุรนารี',
      district: 'เมืองนครราชสีมา',
      category: 'landmark',
      lat: 14.9745,
      lng: 102.1021,
      description: 'สัญลักษณ์กลางเมืองโคราชและศูนย์รวมความเคารพต่อวีรกรรมท้าวสุรนารี',
      highlight: 'ย่าโม',
    },
    {
      id: 'wat-ban-rai',
      name: 'วัดบ้านไร่',
      district: 'ด่านขุนทด',
      category: 'temple',
      lat: 15.2081,
      lng: 101.7716,
      description: 'วัดสำคัญที่เป็นที่รู้จักจากหลวงพ่อคูณและอาคารศิลปะร่วมสมัยรูปช้าง',
      highlight: 'หลวงพ่อคูณ',
    },
    {
      id: 'dan-kwian-pottery',
      name: 'หมู่บ้านเครื่องปั้นดินเผาด่านเกวียน',
      district: 'โชคชัย',
      category: 'craft',
      lat: 14.7287,
      lng: 102.1836,
      description: 'แหล่งหัตถกรรมดินเผาเก่าแก่ที่ใช้ดินท้องถิ่นสร้างงานเครื่องปั้นอันเป็นเอกลักษณ์',
      highlight: 'ดินเผาด่านเกวียน',
    },
  ],
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
      description:
        'กลุ่มเสาหินธรรมชาติบนพื้นที่สูงที่เป็นภาพจำของการท่องเที่ยวเชิงธรรมชาติในชัยภูมิ',
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
    {
      id: 'doi-inthanon',
      name: 'อุทยานแห่งชาติดอยอินทนนท์',
      district: 'จอมทอง',
      category: 'nature',
      lat: 18.5889,
      lng: 98.4861,
      description: 'ยอดดอยสูงสุดของไทยที่เชื่อมโยงธรรมชาติ ป่าต้นน้ำ และชุมชนบนพื้นที่สูง',
      highlight: 'ยอดดอยสูงสุด',
    },
    {
      id: 'wat-chedi-luang',
      name: 'วัดเจดีย์หลวง',
      district: 'เมืองเชียงใหม่',
      category: 'temple',
      lat: 18.7869,
      lng: 98.9867,
      description: 'วัดสำคัญในเขตเมืองเก่าที่มีเจดีย์ขนาดใหญ่และเล่าเรื่องศูนย์กลางล้านนา',
      highlight: 'เจดีย์กลางเมืองเก่า',
    },
  ],
  'TH-64': [
    {
      id: 'sukhothai-historical-park',
      name: 'อุทยานประวัติศาสตร์สุโขทัย',
      district: 'เมืองสุโขทัย',
      category: 'heritage',
      lat: 17.0195,
      lng: 99.7036,
      description: 'เมืองมรดกโลกที่เก็บโบราณสถานสำคัญของราชธานีสุโขทัยและศิลปะยุคต้นของไทย',
      highlight: 'มรดกโลกสุโขทัย',
    },
    {
      id: 'wat-si-chum',
      name: 'วัดศรีชุม',
      district: 'เมืองสุโขทัย',
      category: 'temple',
      lat: 17.0259,
      lng: 99.6936,
      description: 'วัดโบราณที่มีพระอจนะองค์ใหญ่ในมณฑป เป็นภาพจำสำคัญของสุโขทัย',
      highlight: 'พระอจนะ',
    },
    {
      id: 'si-satchanalai-historical-park',
      name: 'อุทยานประวัติศาสตร์ศรีสัชนาลัย',
      district: 'ศรีสัชนาลัย',
      category: 'heritage',
      lat: 17.4286,
      lng: 99.7857,
      description: 'เมืองโบราณคู่สุโขทัยที่มีวัด โบราณสถาน และภูมิทัศน์ริมแม่น้ำยม',
      highlight: 'เมืองโบราณศรีสัชนาลัย',
    },
    {
      id: 'ramkhamhaeng-museum',
      name: 'พิพิธภัณฑสถานแห่งชาติรามคำแหง',
      district: 'เมืองสุโขทัย',
      category: 'museum',
      lat: 17.0175,
      lng: 99.7054,
      description: 'พิพิธภัณฑ์ที่รวบรวมศิลปวัตถุ จารึก และหลักฐานทางประวัติศาสตร์ของสุโขทัย',
      highlight: 'หลักฐานเมืองโบราณ',
    },
    {
      id: 'sangkhalok-kilns',
      name: 'เตาทุเรียงบ้านเกาะน้อย',
      district: 'ศรีสัชนาลัย',
      category: 'craft',
      lat: 17.4417,
      lng: 99.7859,
      description: 'แหล่งเตาเผาเครื่องสังคโลกที่สะท้อนภูมิปัญญาการผลิตเครื่องเคลือบของสุโขทัย',
      highlight: 'เครื่องสังคโลก',
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
    {
      id: 'big-buddha-phuket',
      name: 'พระพุทธมิ่งมงคลเอกนาคคีรี',
      district: 'เมืองภูเก็ต',
      category: 'landmark',
      lat: 7.8276,
      lng: 98.3128,
      description: 'พระใหญ่บนยอดเขานาคเกิดที่มองเห็นภูมิทัศน์เมืองและชายฝั่งภูเก็ต',
      highlight: 'พระใหญ่ภูเก็ต',
    },
    {
      id: 'promthep-cape',
      name: 'แหลมพรหมเทพ',
      district: 'เมืองภูเก็ต',
      category: 'nature',
      lat: 7.7623,
      lng: 98.3036,
      description: 'จุดชมวิวปลายแหลมที่เป็นภาพจำของภูเก็ตและเส้นขอบทะเลอันดามัน',
      highlight: 'จุดชมวิวอันดามัน',
    },
    {
      id: 'thai-hua-museum',
      name: 'พิพิธภัณฑ์ภูเก็ตไทยหัว',
      district: 'เมืองภูเก็ต',
      category: 'museum',
      lat: 7.8848,
      lng: 98.3877,
      description: 'พิพิธภัณฑ์ในอาคารชิโนโปรตุกีสที่เล่าเรื่องชุมชนจีน ภูเก็ต และเส้นทางการค้าเก่า',
      highlight: 'ประวัติชุมชนภูเก็ต',
    },
  ],
};

export const CULTURE_CATEGORY_LABELS: Record<CulturalCategory, string> = {
  tourist_attraction: 'สถานที่ท่องเที่ยว',
  heritage: 'ประวัติศาสตร์',
  temple: 'ศาสนสถาน',
  nature: 'ธรรมชาติ',
  museum: 'พิพิธภัณฑ์',
  landmark: 'แลนด์มาร์ก',
  cultural_attraction: 'แหล่งท่องเที่ยวทางวัฒนธรรม',
  festival: 'เทศกาล',
  folk_art: 'ศิลปะพื้นบ้าน',
  craft: 'หัตถกรรม',
  food: 'อาหาร',
  costume: 'การแต่งกาย',
  learning_center: 'แหล่งเรียนรู้',
  moral_community: 'ชุมชนคุณธรรม',
  local_tradition: 'ประเพณีท้องถิ่น',
  ritual: 'พิธีกรรม',
  local_food: 'อาหารพื้นบ้าน',
  performing_art: 'ศิลปะการแสดง',
  craftsmanship: 'งานช่างฝีมือ',
  community_wisdom: 'ภูมิปัญญาชุมชน',
};

export const CULTURE_CATEGORY_COLORS: Record<CulturalCategory, string> = {
  tourist_attraction: '#2E7D8F',
  heritage: '#8F3D20',
  temple: '#C89B3C',
  nature: '#167A3A',
  museum: '#5A6F8F',
  landmark: '#7A5AA6',
  cultural_attraction: '#A45C2B',
  festival: '#C23B68',
  folk_art: '#B04E7A',
  craft: '#4E6C9D',
  food: '#B85C2E',
  costume: '#7652A8',
  learning_center: '#3F6F8D',
  moral_community: '#6B7A3B',
  local_tradition: '#B15E2E',
  ritual: '#7A4B38',
  local_food: '#C26A2E',
  performing_art: '#9B3E72',
  craftsmanship: '#4C7897',
  community_wisdom: '#5E7D3A',
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
