import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import {
  getFineArtsLimit,
  getFineArtsApiKey,
  fetchFineArtsPlaces,
} from '../fetch-finearts-places';

// ----------------------------------------------------------------------

export const runtime = 'nodejs';
export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const provinceCode = request.nextUrl.searchParams.get('provinceCode');
  const limit = request.nextUrl.searchParams.has('limit')
    ? getFineArtsLimit(request.nextUrl.searchParams.get('limit'))
    : null;
  const apiKey = getFineArtsApiKey();

  if (!provinceCode) {
    return NextResponse.json({ data: [], message: 'Invalid provinceCode' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({
      data: [],
      source: 'api.finearts.go.th',
      message: 'Missing FINE_ARTS_API_KEY',
    });
  }

  const result = await fetchFineArtsPlaces({
    source: 'monument',
    provinceCode,
    limit,
    apiKey,
    revalidate: 86400,
  });

  return NextResponse.json(
    {
      data: result.data,
      source: result.source,
      message: result.message,
      upstreamStatus: result.upstreamStatus,
    },
    { status: result.status >= 400 ? result.status : 200 }
  );
}
