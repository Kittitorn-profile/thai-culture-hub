'use client';

import { useQuery } from '@tanstack/react-query';

import { getCultureCategoryLabel, getCultureCategoryHashColor } from 'src/lib/culture-categories';

export type CategoryConfigItem = {
  key: string;
  label: string;
  color: string;
  icon?: string | null;
  imageUrl?: string | null;
  sortOrder?: number | null;
  count?: number | null;
};

export type CategoryConfigMap = Record<string, CategoryConfigItem>;

export function getCategoryConfigItem(config: CategoryConfigMap, categoryKey?: string | null) {
  const key = categoryKey || 'unknown';

  return (
    config[key] ?? {
      key,
      label: getCultureCategoryLabel(key),
      color: getCultureCategoryHashColor(key),
    }
  );
}

export function getCategoryLabel(config: CategoryConfigMap, categoryKey?: string | null) {
  return getCategoryConfigItem(config, categoryKey).label;
}

export function getCategoryColor(config: CategoryConfigMap, categoryKey?: string | null) {
  return getCategoryConfigItem(config, categoryKey).color;
}

const EMPTY_CATEGORY_CONFIG: CategoryConfigMap = {};

export function useCategoryConfigQuery() {
  return useQuery<CategoryConfigMap>({
    queryKey: ['culture', 'category-config'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/culture/category-config/', { signal });
      if (!response.ok) throw new Error('Unable to load category configuration');
      const json: { data?: CategoryConfigItem[] } = await response.json();
      if (!Array.isArray(json.data)) throw new Error('Invalid category configuration');
      return Object.fromEntries(
        json.data.map((item) => [
          item.key,
          {
            ...item,
            label: item.label || item.key,
            color: item.color || getCultureCategoryHashColor(item.key),
          },
        ])
      );
    },
    staleTime: 300_000,
    gcTime: 86_400_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCategoryConfig() {
  return useCategoryConfigQuery().data ?? EMPTY_CATEGORY_CONFIG;
}
