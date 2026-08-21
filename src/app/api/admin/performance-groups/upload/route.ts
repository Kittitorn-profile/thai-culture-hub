import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const MAX_IMAGE_SIZE = 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const ASSETS_BUCKET =
  process.env.PERFORMANCE_GROUPS_ASSETS_BUCKET ??
  process.env.CREATOR_ASSETS_BUCKET ??
  'creator-assets';

function safeFilename(fileName: string) {
  const extension =
    fileName
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'jpg';
  return `${crypto.randomUUID()}.${extension}`;
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const requestedFolder = formData?.get('folder');
  const folder =
    typeof requestedFolder === 'string' &&
    [
      'personnel',
      'group-logos',
      'yearly-logos',
      'yearly-organizers',
      'group-covers',
      'yearly-performances',
      'booklets',
    ].includes(requestedFolder)
      ? requestedFolder
      : 'personnel';
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
  }
  const isBooklet = folder === 'booklets';
  if (isBooklet ? file.type !== 'application/pdf' : !file.type.startsWith('image/')) {
    return NextResponse.json(
      { message: isBooklet ? 'สูจิบัตรรองรับเฉพาะไฟล์ PDF' : 'รองรับเฉพาะไฟล์รูปภาพเท่านั้น' },
      { status: 400 }
    );
  }
  if (file.size > (isBooklet ? MAX_DOCUMENT_SIZE : MAX_IMAGE_SIZE)) {
    return NextResponse.json(
      {
        message: isBooklet
          ? 'ไฟล์ PDF ต้องมีขนาดไม่เกิน 10 MB'
          : 'รูปภาพหลังย่อต้องมีขนาดไม่เกิน 1 MB',
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase.ok) return NextResponse.json({ message: supabase.error }, { status: 500 });

  const path = `performance-groups/${folder}/${new Date().getFullYear()}/${safeFilename(file.name)}`;
  const { error } = await supabase.client.storage
    .from(ASSETS_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) {
    return NextResponse.json({ message: `อัปโหลดรูปไม่สำเร็จ: ${error.message}` }, { status: 500 });
  }

  const { data } = supabase.client.storage.from(ASSETS_BUCKET).getPublicUrl(path);
  return NextResponse.json({ data: { url: data.publicUrl, path } });
}
