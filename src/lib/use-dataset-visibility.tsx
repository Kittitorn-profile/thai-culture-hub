'use client';

import type { ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';

import { isDatasetEnabled, datasetVisibilitySchema } from './dataset-visibility';

export function useDatasetVisibility() {
  const query = useQuery({
    queryKey: ['public-dataset-visibility'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/culture/dataset-visibility', {
        signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('โหลดสถานะชุดข้อมูลไม่ได้');
      return datasetVisibilitySchema.parse(await response.json());
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });
  return {
    ...query,
    isVisible: (value: string) => Boolean(query.data && isDatasetEnabled(value, query.data.hidden)),
  };
}
export function PublicDatasetGate({ dataset, children }: { dataset: string; children: ReactNode }) {
  const { isVisible } = useDatasetVisibility();
  return isVisible(dataset) ? children : null;
}
