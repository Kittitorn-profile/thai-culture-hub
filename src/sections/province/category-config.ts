'use client';

import { useState, useEffect } from 'react';

import {
  getCultureCategoryLabel,
  getCultureCategoryHashColor,
} from 'src/lib/culture-categories';

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

export function useCategoryConfig() {
  const [categoryConfig, setCategoryConfig] = useState<CategoryConfigMap>({});

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/culture/category-config', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((json: { data?: CategoryConfigItem[] }) => {
        const items = Array.isArray(json.data) ? json.data : [];

        setCategoryConfig(
          Object.fromEntries(
            items.map((item) => [
              item.key,
              {
                ...item,
                label: item.label || item.key,
                color: item.color || getCultureCategoryHashColor(item.key),
              },
            ])
          )
        );
      })
      .catch((error) => {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          setCategoryConfig({});
        }
      });

    return () => controller.abort();
  }, []);

  return categoryConfig;
}
