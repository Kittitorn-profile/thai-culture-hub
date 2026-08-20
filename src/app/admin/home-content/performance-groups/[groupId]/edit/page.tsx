'use client';

import { useParams } from 'src/routes/hooks';

import { PerformanceGroupForm } from '../../performance-group-form';

export default function EditPerformanceGroupPage() {
  const params = useParams<{ groupId: string }>();
  return <PerformanceGroupForm groupId={decodeURIComponent(params.groupId)} />;
}
