import fs from 'node:fs';
import path from 'node:path';

const distAssets = path.resolve(process.cwd(), 'dist', 'assets');

if (!fs.existsSync(distAssets)) {
  console.error('[bundle-budget] dist/assets not found. Run `npm run build` first.');
  process.exit(1);
}

const files = fs
  .readdirSync(distAssets)
  .filter((name) => name.endsWith('.js'))
  .map((name) => {
    const fullPath = path.join(distAssets, name);
    const size = fs.statSync(fullPath).size;
    return { name, size };
  })
  .sort((a, b) => b.size - a.size);

const entryChunk = files.find((file) => file.name.startsWith('index-'));
const maxEntryBytes = 3_200_000;
const maxChunkBytes = 2_000_000;

let hasError = false;

console.log('[bundle-budget] Top JS chunks:');
for (const file of files.slice(0, 10)) {
  const kb = (file.size / 1024).toFixed(1);
  console.log(` - ${file.name}: ${kb} kB`);
}

if (!entryChunk) {
  console.error('[bundle-budget] Could not locate entry chunk (index-*.js).');
  process.exit(1);
}

if (entryChunk.size > maxEntryBytes) {
  const mb = (entryChunk.size / (1024 * 1024)).toFixed(2);
  console.error(`[bundle-budget] Entry chunk too large: ${entryChunk.name} (${mb} MB) > ${(maxEntryBytes / (1024 * 1024)).toFixed(2)} MB`);
  hasError = true;
}

const oversizedChunks = files.filter((file) => file.size > maxChunkBytes);
for (const chunk of oversizedChunks) {
  const mb = (chunk.size / (1024 * 1024)).toFixed(2);
  console.error(`[bundle-budget] Oversized chunk: ${chunk.name} (${mb} MB) > ${(maxChunkBytes / (1024 * 1024)).toFixed(2)} MB`);
  hasError = true;
}

if (hasError) {
  process.exit(1);
}

console.log('[bundle-budget] Budgets passed.');
