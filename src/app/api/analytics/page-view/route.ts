import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

const TABLE_NAME = 'visitor_page_views';
const MAX_TEXT_LENGTH = 500;

type PageViewPayload = {
  path?: unknown;
  title?: unknown;
  referrer?: unknown;
  visitorId?: unknown;
  sessionId?: unknown;
};

function cleanText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue.slice(0, maxLength) : null;
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as PageViewPayload;
  const path = cleanText(body.path, 1000);
  const visitorId = cleanText(body.visitorId, 120);
  const sessionId = cleanText(body.sessionId, 120);

  if (!path || !visitorId || !sessionId) {
    return NextResponse.json({ message: 'Invalid page view payload' }, { status: 400 });
  }

  if (path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/auth')) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { error } = await supabase.client.from(TABLE_NAME).insert({
    path,
    title: cleanText(body.title),
    referrer: cleanText(body.referrer, 1000),
    visitor_id: visitorId,
    session_id: sessionId,
    user_agent: cleanText(request.headers.get('user-agent'), 1000),
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
