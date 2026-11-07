import type { Metadata } from 'next';

import { CulturalHeritageClient } from './cultural-heritage-client';

export const metadata: Metadata = { title: 'มรดกภูมิปัญญาทางวัฒนธรรม | Admin' };
export default function Page() {
  return <CulturalHeritageClient />;
}
