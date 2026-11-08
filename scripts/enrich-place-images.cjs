/** Fill missing images from a reviewed manifest; dry run unless --apply is passed. */
const fs = require('node:fs');
const path = require('node:path');
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const manifestPath = process.argv.find((arg) => arg.startsWith('--manifest='))?.slice(11);
if (!manifestPath) throw new Error('Use --manifest=/absolute/path.json [--apply]');
const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8'));
if (
  !Array.isArray(manifest) ||
  manifest.some(
    (item) =>
      !item.id ||
      !item.reference?.id ||
      !item.images?.length ||
      item.images.some((url) => {
        try {
          return new URL(url).protocol !== 'https:';
        } catch {
          return true;
        }
      })
  )
)
  throw new Error('Invalid reviewed image manifest');
const apply = process.argv.includes('--apply');
const db = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PRIVATE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
const table = process.env.CULTURAL_PLACES_TABLE ?? 'cultural_places';
(async () => {
  const result = {
    mode: apply ? 'apply' : 'dry-run',
    reviewed: manifest.length,
    updated: [],
    skipped: [],
    errors: [],
  };
  for (let offset = 0; offset < manifest.length; offset += 50) {
    const batch = manifest.slice(offset, offset + 50);
    const response = await db
      .from(table)
      .select('id,image_urls,payload,updated_at')
      .in(
        'id',
        batch.map((item) => item.id)
      )
      .abortSignal(AbortSignal.timeout(20000));
    if (response.error) throw new Error(response.error.message);
    const rows = new Map(response.data.map((row) => [row.id, row]));
    for (let i = 0; i < batch.length; i += 5) {
      await Promise.all(
        batch.slice(i, i + 5).map(async (item) => {
          const row = rows.get(item.id);
          if (!row || row.image_urls?.length) {
            result.skipped.push(item.id);
            return;
          }
          if (!apply) {
            result.updated.push(item.id);
            return;
          }
          const checkedAt = new Date().toISOString();
          let query = db
            .from(table)
            .update({
              image_urls: item.images,
              payload: {
                ...row.payload,
                image_enrichment: {
                  source: item.reference.source,
                  reference_place_id: item.reference.id,
                  reference_url: item.reference.url,
                  match: 'same_name_province_and_coordinates',
                  checked_at: checkedAt,
                },
              },
              updated_at: checkedAt,
            })
            .eq('id', item.id);
          query = row.updated_at
            ? query.eq('updated_at', row.updated_at)
            : query.is('updated_at', null);
          const update = await query.select('id').abortSignal(AbortSignal.timeout(20000));
          if (update.error) result.errors.push({ id: item.id, message: update.error.message });
          else if (update.data.length) result.updated.push(item.id);
          else result.skipped.push(item.id);
        })
      );
    }
    console.log(
      JSON.stringify({
        processed: Math.min(offset + 50, manifest.length),
        updated: result.updated.length,
        skipped: result.skipped.length,
        errors: result.errors.length,
      })
    );
    fs.writeFileSync(manifestPath + '.result.json', JSON.stringify(result, null, 2));
  }
  if (result.errors.length) process.exitCode = 1;
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
