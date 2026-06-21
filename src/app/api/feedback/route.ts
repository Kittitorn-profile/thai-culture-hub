import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

// ----------------------------------------------------------------------

const TABLE_NAME = 'visitor_feedback';

type FeedbackPayload = {
  name?: unknown;
  contact?: unknown;
  message?: unknown;
  path?: unknown;
  visitorId?: unknown;
  sessionId?: unknown;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue.slice(0, maxLength) : null;
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as FeedbackPayload;
  const message = cleanText(body.message, 2000);
  const path = cleanText(body.path, 1000);

  if (!message || message.length < 3 || !path) {
    return NextResponse.json({ message: 'Invalid feedback payload' }, { status: 400 });
  }

  if (path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/auth')) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { error } = await supabase.client.from(TABLE_NAME).insert({
    message,
    path,
    name: cleanText(body.name, 120),
    contact: cleanText(body.contact, 180),
    visitor_id: cleanText(body.visitorId, 120),
    session_id: cleanText(body.sessionId, 120),
    user_agent: cleanText(request.headers.get('user-agent'), 1000),
    status: 'new',
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
