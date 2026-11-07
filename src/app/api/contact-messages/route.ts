import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { readAuthBody } from 'src/server/auth-request';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { ContactSchema } from 'src/sections/contact/contact-schema';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const parsed = ContactSchema.safeParse(await readAuthBody(request));
  if (!parsed.success)
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'กรุณาตรวจสอบข้อมูล' },
      { status: 400 }
    );
  const supabase = getSupabaseAdmin();
  if (!supabase.ok)
    return NextResponse.json(
      { message: 'ไม่สามารถรับข้อความได้ในขณะนี้ กรุณาลองใหม่ภายหลัง' },
      { status: 503 }
    );
  const { name, email, phone, area, message } = parsed.data;
  const { error } = await supabase.client.from('visitor_feedback').insert({
    name,
    contact: phone ? `${email}\nโทร: ${phone}` : email,
    message: area ? `พื้นที่: ${area}\n\n${message}` : message,
    path: '/contact-us',
    status: 'new',
    user_agent: request.headers.get('user-agent')?.slice(0, 1000) ?? null,
  });
  if (error)
    return NextResponse.json(
      { message: 'บันทึกข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  return NextResponse.json({ ok: true }, { status: 201 });
}
