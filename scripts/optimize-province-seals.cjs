const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
(async () => {
  const manifestPath = path.join(root, 'data/province-identities/local-seals.json');
  const seals = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  for (const [code, source] of Object.entries(seals)) {
    const destination = `/assets/province-seals/${code}.webp`;
    if (source === destination) continue;
    await sharp(path.join(root, 'public', source)).resize(160, 160, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toFile(path.join(root, 'public', destination));
    seals[code] = destination;
  }
  await fs.writeFile(manifestPath, JSON.stringify(seals, null, 2) + '\n');
  const keep = new Set(Object.values(seals).map(file => path.basename(file)));
  const directory = path.join(root, 'public/assets/province-seals');
  for (const name of await fs.readdir(directory)) {
    if (/^TH-\d+\.(svg|png|jpe?g)$/.test(name) && !keep.has(name)) await fs.unlink(path.join(directory, name));
  }
  console.log(`Optimized ${Object.keys(seals).length} seals`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
