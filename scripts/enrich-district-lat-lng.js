const { createClient } = require('@supabase/supabase-js');

process.loadEnvFile('.env');

const TABLE_NAME = process.env.THAILAND_DISTRICTS_TABLE ?? 'thailand_districts';
const PROVINCES_TABLE_NAME = process.env.THAILAND_PROVINCES_TABLE ?? 'thailand_provinces';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'thai-culture-hub/1.0 (district lat-lng enrichment; local script)';
const REQUEST_DELAY_MS = Number(process.env.NOMINATIM_DELAY_MS ?? 1100);
const LIMIT = Number(process.env.NOMINATIM_LIMIT ?? 0);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PRIVATE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL/SUPABASE_SECRET_KEY');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getDistrictEnglishName(row) {
  return row.properties?.kongvut?.name_en ?? '';
}

function getProvinceEnglishName(province) {
  return province?.properties?.kongvut?.name_en ?? province?.properties?.apisit?.name ?? '';
}

function getProvinceThaiName(province) {
  return province?.name ?? province?.properties?.kongvut?.name_th ?? '';
}

function getQueries(row, province) {
  const districtNameTh = row.name;
  const districtNameEn = getDistrictEnglishName(row);
  const provinceNameTh = getProvinceThaiName(province);
  const provinceNameEn = getProvinceEnglishName(province);
  const queries = [
    [districtNameEn, provinceNameEn, 'Thailand'],
    [districtNameEn, provinceNameTh, 'Thailand'],
    [districtNameTh, provinceNameTh, 'ประเทศไทย'],
    [districtNameTh, provinceNameEn, 'Thailand'],
  ]
    .map((parts) => parts.filter(Boolean).join(', '))
    .filter(Boolean);

  return Array.from(new Set(queries));
}

async function fetchAllMissingDistricts(client) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await client
      .from(TABLE_NAME)
      .select('id,province_code,name,lat,lng,properties')
      .eq('lat', 0)
      .eq('lng', 0)
      .order('id')
      .range(from, to);

    if (error) {
      throw error;
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      break;
    }
  }

  return LIMIT > 0 ? rows.slice(0, LIMIT) : rows;
}

async function fetchProvinces(client) {
  const { data, error } = await client
    .from(PROVINCES_TABLE_NAME)
    .select('id,name,properties');

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((province) => [province.id, province]));
}

async function geocode(query) {
  const url = new URL(NOMINATIM_URL);

  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query);
  url.searchParams.set('countrycodes', 'th');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: 'http://localhost:3300',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim ${response.status}: ${await response.text()}`);
  }

  const results = await response.json();

  return Array.isArray(results) && results.length ? results[0] : null;
}

async function geocodeDistrict(row, province) {
  const queries = getQueries(row, province);

  for (const query of queries) {
    const result = await geocode(query);

    if (result?.lat && result?.lon) {
      return { query, result };
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return { query: queries[0] ?? row.name, result: null };
}

async function updateDistrict(client, row, geocodeResult) {
  const nominatimPayload = {
    query: geocodeResult.query,
    result: geocodeResult.result,
    updated_at: new Date().toISOString(),
  };
  const properties = {
    ...(row.properties ?? {}),
    nominatim: nominatimPayload,
  };
  const lat = Number(geocodeResult.result?.lat ?? row.lat);
  const lng = Number(geocodeResult.result?.lon ?? row.lng);
  const { error } = await client
    .from(TABLE_NAME)
    .update({
      lat,
      lng,
      properties,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  if (error) {
    throw error;
  }

  return { lat, lng };
}

async function main() {
  const client = createSupabaseClient();
  const [provinceById, districts] = await Promise.all([
    fetchProvinces(client),
    fetchAllMissingDistricts(client),
  ]);
  let updated = 0;
  let notFound = 0;

  console.log(`Enriching ${districts.length} districts from Nominatim at ${REQUEST_DELAY_MS}ms/request`);

  for (const [index, row] of districts.entries()) {
    const province = provinceById.get(row.province_code);
    const geocodeResult = await geocodeDistrict(row, province);
    const coordinates = await updateDistrict(client, row, geocodeResult);

    if (geocodeResult.result) {
      updated += 1;
      console.log(
        `${index + 1}/${districts.length} updated ${row.id} ${row.name}: ${coordinates.lat}, ${coordinates.lng}`
      );
    } else {
      notFound += 1;
      console.log(`${index + 1}/${districts.length} not found ${row.id} ${row.name}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(JSON.stringify({ updated, notFound, total: districts.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
