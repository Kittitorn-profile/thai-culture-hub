import type { NextRequest } from 'next/server';

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

import {
  cleanText,
  getBearerToken,
  getCreatorProfileByUserId,
  verifyCreatorAccessToken,
} from 'src/server/creator-auth';

export const runtime = 'nodejs';

const USERS_TABLE = process.env.ADMIN_USERS_TABLE ?? 'user';

type CreatorUserRow = {
  id: string;
  password_hash: string | null;
};

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeCompare(value: string, expectedValue: string) {
  const valueBuffer = Buffer.from(value);
  const expectedValueBuffer = Buffer.from(expectedValue);

  return (
    valueBuffer.length === expectedValueBuffer.length &&
    crypto.timingSafeEqual(valueBuffer, expectedValueBuffer)
  );
}

function verifyPassword(password: string, passwordHash: string | null) {
  const trimmedHash = passwordHash?.trim();

  if (!trimmedHash) {
    return false;
  }

  if (trimmedHash.startsWith('sha256:')) {
    return safeCompare(sha256(password), trimmedHash.replace(/^sha256:/, ''));
  }

  if (trimmedHash.startsWith('sha256$')) {
    return safeCompare(sha256(password), trimmedHash.replace(/^sha256\$/, ''));
  }

  return safeCompare(password, trimmedHash);
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyCreatorAccessToken(getBearerToken(request.headers));

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const profileResult = await getCreatorProfileByUserId(auth.user.id);

  if (!profileResult.ok) {
    return NextResponse.json({ message: profileResult.message }, { status: profileResult.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const currentPassword = cleanText(body.currentPassword);
  const newPassword = cleanText(body.newPassword);
  const confirmPassword = cleanText(body.confirmPassword);

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ message: 'กรุณากรอกรหัสผ่านให้ครบทุกช่อง' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ message: 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน' }, { status: 400 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' }, { status: 400 });
  }

  const { data: creatorUser, error: userError } = await auth.supabase
    .from(USERS_TABLE)
    .select('id, password_hash')
    .eq('id', profileResult.profile.user_id)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ message: userError.message }, { status: 500 });
  }

  if (!creatorUser || !verifyPassword(currentPassword, (creatorUser as CreatorUserRow).password_hash)) {
    return NextResponse.json({ message: 'รหัสผ่านเดิมไม่ถูกต้อง' }, { status: 401 });
  }

  const { error: updateError } = await auth.supabase
    .from(USERS_TABLE)
    .update({ password_hash: `sha256:${sha256(newPassword)}` })
    .eq('id', profileResult.profile.user_id);

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
}
