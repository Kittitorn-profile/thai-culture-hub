const EVENT_STORAGE_MARKER = '/storage/v1/object/public/creator-assets/events/';
const EVENT_PROXY_PREFIX = '/api/media/events/';

export function toEventMediaProxyUrl(value?: string | null) {
  const url = (value ?? '').trim().replace(/^ttps:\/\//, 'https://');
  if (!url) return '';
  if (url.startsWith(EVENT_PROXY_PREFIX)) return url;

  try {
    const parsed = new URL(url);
    const markerIndex = parsed.pathname.indexOf(EVENT_STORAGE_MARKER);
    if (markerIndex === -1) return url;

    const objectPath = parsed.pathname.slice(markerIndex + EVENT_STORAGE_MARKER.length);
    return `${EVENT_PROXY_PREFIX}${objectPath
      .split('/')
      .map((part) => encodeURIComponent(decodeURIComponent(part)))
      .join('/')}`;
  } catch {
    return url;
  }
}

export function toEventStorageUrl(value?: string | null) {
  const url = (value ?? '').trim().replace(/^ttps:\/\//, 'https://');
  if (!url.startsWith(EVENT_PROXY_PREFIX)) return url;

  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ''
  ).replace(/\/$/, '');
  if (!supabaseUrl) return url;

  const objectPath = url.slice(EVENT_PROXY_PREFIX.length);
  return `${supabaseUrl}${EVENT_STORAGE_MARKER}${objectPath}`;
}

export const eventMediaStorageMarker = EVENT_STORAGE_MARKER;
