#!/usr/bin/env node
// One-shot image optimization. Outputs siblings (.webp) next to originals.
// Run: node scripts/optimize-images.mjs

import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { join, parse } from 'node:path';

const PUBLIC = new URL('../public/', import.meta.url).pathname;

const TARGETS = [
  { dir: 'products', exts: ['.png', '.jpg', '.jpeg'], opts: { quality: 82 } },
  { dir: 'clientlogo', exts: ['.svg'], opts: { quality: 90 }, density: 200, resize: { width: 400, height: 400, fit: 'inside' } },
  { dir: '', exts: ['.svg'], file: 'n3logo.svg', opts: { quality: 90 }, density: 300, resize: { width: 256, height: 256, fit: 'inside' } },
];

async function listFiles(dir, exts, only) {
  try {
    const entries = await readdir(dir);
    return entries
      .filter((f) => exts.some((e) => f.toLowerCase().endsWith(e)))
      .filter((f) => !only || f === only);
  } catch {
    return [];
  }
}

async function fmt(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K';
  return (bytes / (1024 * 1024)).toFixed(2) + 'M';
}

let savedTotal = 0;
let convertedCount = 0;

for (const t of TARGETS) {
  const baseDir = join(PUBLIC, t.dir);
  const files = await listFiles(baseDir, t.exts, t.file);
  for (const f of files) {
    const src = join(baseDir, f);
    const out = join(baseDir, parse(f).name + '.webp');

    let pipe = sharp(src, t.density ? { density: t.density } : undefined);
    if (t.resize) pipe = pipe.resize(t.resize);
    pipe = pipe.webp(t.opts);

    const inSize = (await stat(src)).size;
    const buf = await pipe.toBuffer();
    const outSize = buf.length;

    if (outSize >= inSize * 0.95) {
      console.log(`SKIP ${f}: webp not smaller (${await fmt(inSize)} -> ${await fmt(outSize)})`);
      continue;
    }

    await sharp(buf).toFile(out);
    const saved = inSize - outSize;
    savedTotal += saved;
    convertedCount++;
    console.log(
      `✓ ${f}  ${await fmt(inSize)} -> ${await fmt(outSize)}  (saved ${await fmt(saved)})`
    );
  }
}

console.log(`\nDone. ${convertedCount} files converted. Total saved: ${await fmt(savedTotal)}`);
