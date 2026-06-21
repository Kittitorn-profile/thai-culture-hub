'use client';

import { useState, useEffect } from 'react';

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

const DEFAULT_CATEGORY_COLOR = '#608D8C';

const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  community_wisdom: 'ภูมิปัญญาชุมชน',
  costume: 'ผ้าและเครื่องแต่งกาย',
  craftsmanship: 'งานช่างฝีมือ',
  cultural_attraction: 'แหล่งท่องเที่ยวทางวัฒนธรรม',
  ethnic_group: 'กลุ่มชาติพันธุ์',
  folk_art: 'ศิลปะพื้นบ้าน',
  heritage: 'โบราณสถานและมรดกทางวัฒนธรรม',
  learning_center: 'แหล่งเรียนรู้',
  local_food: 'อาหารพื้นบ้าน',
  local_tradition: 'ประเพณีท้องถิ่น',
  moral_community: 'ชุมชนคุณธรรม',
  museum: 'พิพิธภัณฑ์',
  performing_art: 'ศิลปะการแสดง',
  ritual: 'พิธีกรรม',
  temple: 'ศาสนสถาน',
  tourist_attraction: 'สถานที่ท่องเที่ยว',
};

function getHashColor(value: string) {
  const palette = [
    '#608D8C',
    '#D19F46',
    '#CE7B48',
    '#947488',
    '#5B7B91',
    '#AB8395',
    '#B2865A',
    '#8F3D20',
    '#C89B3C',
    '#5A6F8F',
  ];
  const hash = Array.from(value).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );

  return palette[hash % palette.length] ?? DEFAULT_CATEGORY_COLOR;
}

export function getCategoryConfigItem(config: CategoryConfigMap, categoryKey?: string | null) {
  const key = categoryKey || 'unknown';

  return (
    config[key] ?? {
      key,
      label: DEFAULT_CATEGORY_LABELS[key] ?? key,
      color: getHashColor(key),
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
                color: item.color || getHashColor(item.key),
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
