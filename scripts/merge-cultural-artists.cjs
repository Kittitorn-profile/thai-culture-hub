/** Merge reviewed performer profiles without replacing other registry records. Dry-run by default. */
const fs = require('node:fs');
const path = require('node:path');
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
const folder = path.join(__dirname, '../data/cultural-artists');
const normalized = (name) => name.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('th');
// PostgreSQL jsonb does not preserve object key order.
const stable = (value) => JSON.stringify(value, (_, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
function mergeArtists(directory, additions) {
  const result = structuredClone(directory);
  const stats = { added: 0, updated: 0, unchanged: 0 };
  for (const incoming of additions) {
    if (!incoming.id || !incoming.name || !incoming.sources?.length || incoming.recognitions.length)
      throw new Error('Performer must have evidence and no assumed official recognition');
    if (['address', 'phone', 'email', 'tel'].some((key) => key in incoming))
      throw new Error('Unexpected personal contact data');
    if (incoming.provinceAssociations.some((p) => !/^TH-\d{2}$/.test(p.provinceCode) || !p.sourceUrl))
      throw new Error('Missing province evidence');
    const names = new Set([incoming.name, ...incoming.aliases].map(normalized));
    const matches = result.artists.filter((a) => a.id === incoming.id ||
      [a.name, ...a.aliases].some((name) => names.has(normalized(name))));
    if (matches.length > 1) throw new Error(`Ambiguous artist: ${incoming.name}`);
    if (!matches.length) {
      result.artists.push(structuredClone(incoming));
      stats.added += 1;
      continue;
    }
    const artist = matches[0];
    const before = stable(artist);
    for (const field of ['aliases', 'types', 'fields', 'genres', 'sources', 'provinceAssociations']) {
      const values = [...(artist[field] ?? []), ...(incoming[field] ?? [])];
      if (field === 'aliases' && artist.name !== incoming.name) values.push(incoming.name);
      artist[field] = values.filter((value, i) => values.findIndex((v) =>
        stable(v) === stable(value)) === i);
    }
    artist.provinceStatus = artist.provinceAssociations.length ? 'verified' : 'pending_verification';
    stats[stable(artist) === before ? 'unchanged' : 'updated'] += 1;
  }
  if (stats.added || stats.updated) result.checkedAt = '2026-11-08';
  return { directory: result, stats };
}
module.exports = { mergeArtists };
async function main() {
  const additions = JSON.parse(fs.readFileSync(path.join(folder, 'performers.json'), 'utf8'));
  if (process.argv.includes('--snapshot')) {
    const file = path.join(folder, 'registry.json');
    const merged = mergeArtists(JSON.parse(fs.readFileSync(file, 'utf8')), additions);
    fs.writeFileSync(file, `${JSON.stringify(merged.directory, null, 2)}\n`);
    console.log(JSON.stringify({ mode: 'snapshot', ...merged.stats }));
    return;
  }
  loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  const db = createClient(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PRIVATE_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const table = process.env.HOME_CONTENT_SECTIONS_TABLE ?? 'home_content_sections';
  const key = 'province-artists-v1';
  const current = await db.from(table).select('content,updated_at').eq('section_key', key)
    .abortSignal(AbortSignal.timeout(15000)).single();
  if (current.error) throw new Error(current.error.message);
  const { directory, stats } = mergeArtists(current.data.content, additions);
  if (!process.argv.includes('--apply') || (!stats.added && !stats.updated)) {
    console.log(JSON.stringify({ mode: 'dry-run', total: directory.artists.length, ...stats }));
    return;
  }
  const saved = await db.from(table).update({ content: directory, updated_at: new Date().toISOString() })
    .eq('section_key', key).eq('updated_at', current.data.updated_at).select('section_key')
    .abortSignal(AbortSignal.timeout(20000));
  if (saved.error) throw new Error(saved.error.message);
  if (saved.data.length !== 1) throw new Error('Directory changed during import; re-read before retrying');
  console.log(JSON.stringify({ mode: 'applied', total: directory.artists.length, ...stats }));
}
if (require.main === module) main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
