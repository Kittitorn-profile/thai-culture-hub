import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const TABLE_NAME = process.env.POPUP_BANNERS_TABLE ?? 'popup_banners';

type PopupBannerPayload = {
  id?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  sortOrder?: number | string;
  isActive?: boolean;
  dismissible?: boolean;
  showOnce?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function optionalDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toRow(body: PopupBannerPayload) {
  const title = body.title?.trim();

  if (!title) {
    return { ok: false as const, message: 'title is required' };
  }

  const sortOrder = Number(body.sortOrder);

  return {
    ok: true as const,
    row: {
      title,
      description: optionalText(body.description),
      image_url: optionalText(body.imageUrl),
      button_label: optionalText(body.buttonLabel),
      button_url: optionalText(body.buttonUrl),
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      is_active: body.isActive ?? true,
      dismissible: body.dismissible ?? true,
      show_once: body.showOnce ?? true,
      starts_at: optionalDate(body.startsAt),
      ends_at: optionalDate(body.endsAt),
      updated_at: new Date().toISOString(),
    },
  };
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error, data: [] }, { status: 500 });
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message, data: [] }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as PopupBannerPayload;
  const parsed = toRow(body);

  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .insert(parsed.row)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as PopupBannerPayload;

  if (!body.id) {
    return NextResponse.json({ message: 'id is required' }, { status: 400 });
  }

  const parsed = toRow(body);

  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data, error } = await supabase.client
    .from(TABLE_NAME)
    .update(parsed.row)
    .eq('id', body.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'id is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { error } = await supabase.client.from(TABLE_NAME).delete().eq('id', id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'deleted' });
}
