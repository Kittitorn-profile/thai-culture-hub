import { Suspense } from 'react';

import { publicPageMetadata } from 'src/lib/page-metadata';
import provinces from 'src/data/thailand-culture/provinces';

import { ProvincePlacesView } from 'src/sections/province/view/province-places-view';

export async function generateMetadata({ params }: { params: Promise<{ provinceId: string }> }) {
  const { provinceId } = await params;
  const name = provinces.find((province) => province.code === provinceId)?.name;
  if (!name) return { title: 'ไม่พบจังหวัด | Thailand Cultural Hub', robots: { index: false } };
  return publicPageMetadata(
    `สถานที่และวัฒนธรรม${name}`,
    `สำรวจสถานที่และเรื่องวัฒนธรรมในจังหวัด${name} ค้นหาตามอำเภอและหมวดหมู่ พร้อมภาพและรายละเอียด`,
    `/province/${provinceId}/places/`
  );
}

export default function Page() {
  return (
    <Suspense>
      <ProvincePlacesView />
    </Suspense>
  );
}
