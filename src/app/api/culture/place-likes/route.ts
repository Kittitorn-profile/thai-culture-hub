import type { NextRequest } from 'next/server';

import crypto from 'crypto';
import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

const TABLE_NAME = 'cultural_place_likes';
const MAX_PLACE_IDS = 100;
const MAX_PLACE_ID_LENGTH = 220;

type LikePayload = {
  placeId?: unknown;
};

function cleanPlaceId(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const placeId = value.trim();

  return placeId ? placeId.slice(0, MAX_PLACE_ID_LENGTH) : null;
}

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  return (
    forwardedFor ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function getIpHash(request: NextRequest) {
  const salt =
    process.env.PLACE_LIKE_IP_SALT ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'thai-culture-hub-place-like';

  return crypto.createHash('sha256').update(`${salt}:${getRequestIp(request)}`).digest('hex');
}

function getPlaceIds(request: NextRequest) {
  const placeIds = request.nextUrl.searchParams
    .get('placeIds')
    ?.split(',')
    .map((placeId) => cleanPlaceId(placeId))
    .filter((placeId): placeId is string => !!placeId)
    .slice(0, MAX_PLACE_IDS);

  return Array.from(new Set(placeIds ?? []));
}

async function getLikeCount(placeId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, message: supabase.error };
  }

  const { count, error } = await supabase.client
    .from(TABLE_NAME)
    .select('place_id', { count: 'exact', head: true })
    .eq('place_id', placeId);

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const, count: count ?? 0 };
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const placeIds = getPlaceIds(request);

  if (!placeIds.length) {
    return NextResponse.json({ data: {} });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const ipHash = getIpHash(request);
  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('place_id, ip_hash')
    .in('place_id', placeIds);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const placeLikes = Object.fromEntries(
    placeIds.map((placeId) => [placeId, { likeCount: 0, liked: false }])
  );

  data?.forEach((like) => {
    const placeId = typeof like.place_id === 'string' ? like.place_id : null;

    if (!placeId || !placeLikes[placeId]) {
      return;
    }

    placeLikes[placeId].likeCount += 1;
    placeLikes[placeId].liked = placeLikes[placeId].liked || like.ip_hash === ipHash;
  });

  return NextResponse.json({ data: placeLikes });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as LikePayload;
  const placeId = cleanPlaceId(body.placeId);

  if (!placeId) {
    return NextResponse.json({ message: 'Invalid place like payload' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const ipHash = getIpHash(request);
  const existingResult = await supabase.client
    .from(TABLE_NAME)
    .select('id')
    .eq('place_id', placeId)
    .eq('ip_hash', ipHash)
    .maybeSingle();

  if (existingResult.error) {
    return NextResponse.json({ message: existingResult.error.message }, { status: 500 });
  }

  const nextLiked = !existingResult.data;

  if (existingResult.data) {
    const { error } = await supabase.client.from(TABLE_NAME).delete().eq('id', existingResult.data.id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase.client.from(TABLE_NAME).insert({
      place_id: placeId,
      ip_hash: ipHash,
      user_agent: request.headers.get('user-agent')?.slice(0, 1000) ?? null,
    });

    if (error && error.code !== '23505') {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  }

  const countResult = await getLikeCount(placeId);

  if (!countResult.ok) {
    return NextResponse.json({ message: countResult.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      placeId,
      liked: nextLiked,
      likeCount: countResult.count,
    },
  });
}
