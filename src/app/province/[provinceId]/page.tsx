import { publicPageMetadata } from 'src/lib/page-metadata';
import provinces from 'src/data/thailand-culture/provinces';

import { ProvinceDetailView } from 'src/sections/province/view';

// ----------------------------------------------------------------------

export async function generateMetadata({ params }: { params: Promise<{ provinceId: string }> }) {
  const { provinceId } = await params;
  const name = provinces.find((province) => province.code === provinceId)?.name;
  if (!name) return { title: 'ไม่พบจังหวัด | Thailand Cultural Hub', robots: { index: false } };
  return publicPageMetadata(
    `สำรวจวัฒนธรรม${name}`,
    `ค้นหาสถานที่ ศิลปิน ชุมชน และมรดกภูมิปัญญาในจังหวัด${name} ผ่านแผนที่รายอำเภอ พร้อมรายละเอียดและแหล่งอ้างอิง`,
    `/province/${provinceId}/`
  );
}

export default function Page() {
  return <ProvinceDetailView />;
}
