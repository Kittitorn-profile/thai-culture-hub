import type { Metadata } from 'next';

import { EventCreateForm } from '../../new/event-create-form';

export const metadata: Metadata = { title: 'แก้ไขกิจกรรม | Admin' };

export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  return <EventCreateForm eventId={decodeURIComponent(eventId)} />;
}
