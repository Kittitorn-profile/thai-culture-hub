import { getSupabaseAdmin } from 'src/server/supabase-admin';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(profileId))
    return new Response(null, { status: 404 });
  const db = getSupabaseAdmin();
  if (!db.ok) return new Response(null, { status: 503 });
  const { data, error } = await db.client
    .from('creator_profiles')
    .select('avatar_url')
    .eq('id', profileId)
    .eq('status', 'approved')
    .maybeSingle();
  if (error || !data?.avatar_url) return new Response(null, { status: 404 });
  let url: URL;
  try {
    url = new URL(data.avatar_url);
  } catch {
    return new Response(null, { status: 404 });
  }
  if (
    url.protocol !== 'https:' ||
    !/^lh\d+\.googleusercontent\.com$/.test(url.hostname) ||
    url.port ||
    url.username ||
    url.password
  )
    return new Response(null, { status: 404 });
  try {
    const result = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(8000) });
    const type = result.headers.get('content-type')?.split(';')[0] ?? '';
    if (!result.ok || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type))
      return new Response(null, { status: 502 });
    const bytes = await result.arrayBuffer();
    if (bytes.byteLength > 2 * 1024 * 1024) return new Response(null, { status: 502 });
    return new Response(bytes, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
