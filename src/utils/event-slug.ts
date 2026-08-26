type EventSlugSource = {
  id: string;
  title: string;
  slug?: string | null;
  tatSlug?: string | null;
};

const UUID_PREFIX_LENGTH = 8;

export function slugifyEventTitle(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function getEventSlug(eventItem: EventSlugSource) {
  const customSlug = slugifyEventTitle(eventItem.slug ?? '');
  if (customSlug) return customSlug;

  const importedSlug = slugifyEventTitle(eventItem.tatSlug ?? '');
  if (importedSlug) return importedSlug;

  const titleSlug = slugifyEventTitle(eventItem.title) || 'event';
  const idPrefix = eventItem.id.replace(/-/g, '').slice(0, UUID_PREFIX_LENGTH).toLowerCase();

  return idPrefix ? `${titleSlug}-${idPrefix}` : titleSlug;
}
