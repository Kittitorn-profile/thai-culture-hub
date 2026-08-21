import type { Metadata } from 'next';

import { EventCreateForm } from './event-create-form';

export const metadata: Metadata = { title: 'เพิ่มกิจกรรม | Admin' };

export default function Page() {
  return <EventCreateForm />;
}
