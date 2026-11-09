import { NextResponse } from 'next/server';

import { getDatasetVisibility } from 'src/server/dataset-visibility';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.json(await getDatasetVisibility(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ message: 'โหลดสถานะชุดข้อมูลไม่ได้' }, { status: 503 });
  }
}
