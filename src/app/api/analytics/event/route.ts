import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

const TABLE_NAME = 'visitor_events';
const MAX_TEXT_LENGTH = 500;

type EventPayload = {
  path?: unknown;
  eventType?: unknown;
  eventName?: unknown;
  metadata?: unknown;
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

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item) || item == null)
      .map(([key, item]) => [
        key.slice(0, 80),
        typeof item === 'string' ? item.trim().slice(0, 500) : item,
      ])
  );
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as EventPayload;
  const eventType = cleanText(body.eventType, 120);
  const eventName = cleanText(body.eventName, 300);
  const visitorId = cleanText(body.visitorId, 120);
  const sessionId = cleanText(body.sessionId, 120);
  const path = cleanText(body.path, 1000);

  if (!eventType || !eventName || !visitorId || !sessionId || !path) {
    return NextResponse.json({ message: 'Invalid analytics event payload' }, { status: 400 });
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
    event_type: eventType,
    event_name: eventName,
    metadata: cleanMetadata(body.metadata),
    visitor_id: visitorId,
    session_id: sessionId,
    user_agent: cleanText(request.headers.get('user-agent'), 1000),
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
