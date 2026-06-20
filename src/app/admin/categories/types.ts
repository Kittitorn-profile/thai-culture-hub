export type CategoryRow = {
  category_key: string;
  label: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  image_url?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  source?: string | null;
  source_label?: string | null;
  updated_at?: string | null;
};

export type EditingCategory = {
  isNew?: boolean;
  categoryKey: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
};

export type CategoryFormInput = Omit<EditingCategory, 'isNew'>;
