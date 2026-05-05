#!/usr/bin/env node
// Convert raw team photos in /public/team/ to optimized 400x400 WebP avatars.
// Drop photos as nibras.jpg, nabeel.jpg, nafi.jpg, farseen.jpg (any image format works)
// then run: node scripts/optimize-team-photos.mjs

import sharp from 'sharp';
import { readdir, stat, unlink } from 'node:fs/promises';
import { join, parse } from 'node:path';

const TEAM_DIR = new URL('../public/team/', import.meta.url).pathname;

const EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

async function fmt(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K';
  return (bytes / (1024 * 1024)).toFixed(2) + 'M';
}

const files = (await readdir(TEAM_DIR))
  .filter(f => EXTS.some(e => f.toLowerCase().endsWith(e)))
  // Skip files that are already named *.webp AND already 400x400 (already optimized)
  .filter(f => !f.startsWith('.'));

if (files.length === 0) {
  console.log('No photos found in public/team/. Drop in nibras.jpg, nabeel.jpg, nafi.jpg, farseen.jpg and re-run.');
  process.exit(0);
}

console.log(`Found ${files.length} photo(s) in public/team/. Optimizing...\n`);

for (const file of files) {
  const src = join(TEAM_DIR, file);
  const name = parse(file).name.toLowerCase();
  const out = join(TEAM_DIR, `${name}.webp`);

  // Skip if input is already the target webp file
  if (src === out) {
    const inSize = (await stat(src)).size;
    // If already small enough (<50KB), skip re-encoding
    if (inSize < 50 * 1024) {
      console.log(`SKIP ${file}: already optimized (${await fmt(inSize)})`);
      continue;
    }
  }

  const inSize = (await stat(src)).size;

  await sharp(src)
    .resize(400, 400, { fit: 'cover', position: 'centre' })
    .webp({ quality: 88 })
    .toFile(out + '.tmp');

  // Replace original with .webp version
  if (src !== out) {
    // Different filename — move tmp into place, delete original
    const fs = await import('node:fs/promises');
    await fs.rename(out + '.tmp', out);
    await unlink(src);
  } else {
    // Same filename — replace in place
    const fs = await import('node:fs/promises');
    await fs.rename(out + '.tmp', out);
  }

  const outSize = (await stat(out)).size;
  console.log(`OK   ${file} -> ${name}.webp (${await fmt(inSize)} -> ${await fmt(outSize)})`);
}

console.log('\nDone. Run npm run build to see photos appear on /about.');
