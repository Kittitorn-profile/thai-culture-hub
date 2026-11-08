/** Import the reviewed government artist directory. Does not replace an existing directory. */
const fs = require('node:fs');
const path = require('node:path');
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const directory = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data/cultural-artists/registry.json'), 'utf8')
);
if (
  directory.schemaVersion !== 1 ||
  !directory.artists.length ||
  new Set(directory.artists.map((item) => item.id)).size !== directory.artists.length
)
  throw new Error('Invalid artist directory');
for (const artist of directory.artists) {
  if (
    !artist.name ||
    !artist.sources.length ||
    artist.provinceAssociations.some(
      (province) => !/^TH-\d{2}$/.test(province.provinceCode) || !province.sourceUrl
    )
  )
    throw new Error('Missing artist evidence');
  if (['address', 'tel', 'phone', 'email'].some((field) => field in artist))
    throw new Error('Unexpected personal contact data');
}
(async () => {
  const stats = {
    artists: directory.artists.length,
    verifiedProvince: directory.artists.filter((item) => item.provinceAssociations.length).length,
    provinces: new Set(
      directory.artists.flatMap((item) =>
        item.provinceAssociations.map((province) => province.provinceCode)
      )
    ).size,
  };
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ mode: 'dry-run', ...stats }));
    return;
  }
  const db = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PRIVATE_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const table = process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';
  const key = 'province-artists-v1';
  const existing = await db
    .from(table)
    .select('section_key')
    .eq('section_key', key)
    .abortSignal(AbortSignal.timeout(15000))
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) throw new Error('Directory already exists; refusing to replace reviewed data');
  const result = await db
    .from(table)
    .insert({ section_key: key, content: directory, updated_at: new Date().toISOString() })
    .select('section_key')
    .abortSignal(AbortSignal.timeout(20000))
    .single();
  if (result.error) throw new Error(result.error.message);
  console.log(JSON.stringify({ mode: 'imported', key, ...stats }));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
