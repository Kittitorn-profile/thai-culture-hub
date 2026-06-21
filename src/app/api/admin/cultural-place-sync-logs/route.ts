import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

type SyncLogBody = {
  syncDataset?: string;
  sourceLabel?: string;
  provinceCode?: string | null;
  provinceName?: string | null;
  totalRecords?: number;
  success?: boolean;
  message?: string | null;
  responsePayload?: Record<string, unknown> | null;
};

type SyncLogRow = {
  id: string;
  sync_dataset: string;
  source_label: string;
  province_code: string | null;
  province_name: string | null;
  total_records: number;
  success: boolean;
  message: string | null;
  response_payload: Record<string, unknown> | null;
  synced_by_id: string | null;
  synced_by_email: string | null;
  synced_by_name: string | null;
  synced_at: string;
  created_at: string;
};

const SYNC_LOGS_TABLE =
  process.env.CULTURAL_PLACE_SYNC_LOGS_TABLE ?? 'cultural_place_sync_logs';
const MAX_LOG_ROWS = 200;

function getBearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

function getLimit(value: string | null) {
  const parsedValue = Number(value ?? 50);

  return Number.isFinite(parsedValue) ? Math.min(Math.max(Math.trunc(parsedValue), 1), 200) : 50;
}

function toInteger(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? Math.max(Math.trunc(numberValue), 0) : 0;
}

function getLatestByDataset(rows: SyncLogRow[]) {
  const latestByDataset: Record<string, SyncLogRow> = {};

  rows.forEach((row) => {
    if (!latestByDataset[row.sync_dataset]) {
      latestByDataset[row.sync_dataset] = row;
    }
  });

  return latestByDataset;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAccessToken(
    getBearerToken(request),
    ADMIN_PERMISSION.culturalPlaces
  );

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const provinceCode = request.nextUrl.searchParams.get('provinceCode');
  const limit = getLimit(request.nextUrl.searchParams.get('limit'));
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  let query = supabase.client
    .from(SYNC_LOGS_TABLE)
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), MAX_LOG_ROWS));

  if (provinceCode) {
    query = query.eq('province_code', provinceCode);
  } else {
    query = query.is('province_code', null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as SyncLogRow[];

  return NextResponse.json({
    data: rows,
    latestByDataset: getLatestByDataset(rows),
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAccessToken(
    getBearerToken(request),
    ADMIN_PERMISSION.culturalPlaces
  );

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as SyncLogBody;
  const syncDataset = body.syncDataset?.trim();
  const sourceLabel = body.sourceLabel?.trim();

  if (!syncDataset || !sourceLabel) {
    return NextResponse.json(
      { message: 'syncDataset and sourceLabel are required' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const row = {
    sync_dataset: syncDataset,
    source_label: sourceLabel,
    province_code: body.provinceCode?.trim() || null,
    province_name: body.provinceName?.trim() || null,
    total_records: toInteger(body.totalRecords),
    success: Boolean(body.success),
    message: body.message?.trim() || null,
    response_payload: body.responsePayload ?? {},
    synced_by_id: auth.user.id,
    synced_by_email: auth.user.email ?? null,
    synced_by_name: auth.user.displayName ?? auth.user.email ?? null,
    synced_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.client
    .from(SYNC_LOGS_TABLE)
    .insert(row)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
