import type { Metadata } from 'next';

import { EventDetailView } from 'src/sections/events/view';

export const metadata: Metadata = {
  title: 'รายละเอียดกิจกรรม | Thailand Cultural Hub',
  description: 'วันเวลา สถานที่ ผู้จัด และรายละเอียดกิจกรรมวัฒนธรรม',
};

export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  return <EventDetailView eventId={decodeURIComponent(eventId)} />;
}
