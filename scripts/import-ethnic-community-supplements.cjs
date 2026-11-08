/** Reviewed SAC communities. Dry-run first; preserve the original ethnic_groups table. */
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');
const KEY = 'ethnic-community-supplements-v1';
const canonical = (value) => (value ?? '').normalize('NFKC').replace(/\s+/g, '').replace(/^(?:กะเหรี่ยง|ไทดำ)?(?:บ้าน|ชุมชน|กลุ่ม)/, '').replace(/^จังหวัด/, '');
function isSameCommunity(incoming, row) {
  return canonical(incoming.province) === canonical(row.province) &&
    canonical(incoming.village) === canonical(row.village_name_th ?? row.village) &&
    (!incoming.district || !(row.district_th ?? row.district) || canonical(incoming.district) === canonical(row.district_th ?? row.district)) &&
    (!incoming.subDistrict || !(row.sub_district_th ?? row.subDistrict) || canonical(incoming.subDistrict) === canonical(row.sub_district_th ?? row.subDistrict));
}
function mergeSupplement(existing, additions, raw) {
  const items = structuredClone(existing?.items ?? []);
  const stats = { added: 0, unchanged: 0, duplicates: [] };
  for (const item of additions) {
    if (!/^sac-community-\d+$/.test(item.id) || item.sourceUrl !== `https://wikicommunity.sac.or.th/community/${item.id.split('-').pop()}` ||
      item.coordinateSourceUrl !== item.sourceUrl || !item.groups?.length || !item.province || !item.village ||
      item.latitude < 5 || item.latitude > 21 || item.longitude < 97 || item.longitude > 106 || !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude))
      throw new Error('Incomplete community/coordinate evidence');
    if (items.some((old) => old.id === item.id)) { stats.unchanged += 1; continue; }
    if ([...raw, ...items].some((old) => isSameCommunity(item, old))) { stats.duplicates.push(item.id); continue; }
    items.push(item); stats.added += 1;
  }
  return { content: { schemaVersion: 1, items }, stats };
}
module.exports = { mergeSupplement, isSameCommunity };
async function main() {
  loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  const db = createClient(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PRIVATE_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const table = process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';
  const [current, raw] = await Promise.all([
    db.from(table).select('content,updated_at').eq('section_key', KEY).maybeSingle(),
    db.from(process.env.ETHNIC_GROUPS_TABLE ?? 'ethnic_groups').select('province,district_th,sub_district_th,village_name_th', { count: 'exact' }).limit(10000),
  ]);
  if (current.error || raw.error || raw.count !== raw.data.length) throw new Error('Cannot read complete existing data; refusing to import');
  const additions = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ethnic-groups/community-supplements.json'), 'utf8'));
  const { content, stats } = mergeSupplement(current.data?.content, additions, raw.data);
  if (!process.argv.includes('--apply') || !stats.added) { console.log(JSON.stringify({ mode: 'dry-run', originalRecords: raw.count, supplementalRecords: content.items.length, ...stats })); return; }
  const update = { content, updated_at: new Date().toISOString() };
  const saved = current.data
    ? await db.from(table).update(update).eq('section_key', KEY).eq('updated_at', current.data.updated_at).select('section_key')
    : await db.from(table).insert({ section_key: KEY, ...update }).select('section_key');
  if (saved.error || saved.data?.length !== 1) throw new Error('Save conflict or database error; re-read before retrying');
  console.log(JSON.stringify({ mode: 'applied', originalRecords: raw.count, supplementalRecords: content.items.length, ...stats }));
}
if (require.main === module) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
