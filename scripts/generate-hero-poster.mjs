#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const video = `${root}public/land-vid-mobile.mp4`;
const poster = `${root}public/land-vid-poster.webp`;
const stamp = `${root}scripts/hero-poster-source.sha256`;
const temporaryPoster = `${root}public/.land-vid-poster.tmp.webp`;

const videoHash = createHash('sha256')
  .update(await readFile(video))
  .digest('hex');

let recordedHash = '';
let posterExists = true;

try {
  recordedHash = (await readFile(stamp, 'utf8')).trim();
} catch {
  // A missing stamp means the poster should be generated once.
}

try {
  await access(poster);
} catch {
  posterExists = false;
}

if (posterExists && recordedHash === videoHash) {
  console.log('Hero poster is up to date.');
  process.exit(0);
}

console.log('Hero video changed; extracting its first frame...');

const result = spawnSync(
  'ffmpeg',
  [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    video,
    '-map',
    '0:v:0',
    '-frames:v',
    '1',
    '-an',
    '-c:v',
    'libwebp',
    '-quality',
    '82',
    '-compression_level',
    '6',
    '-preset',
    'picture',
    '-y',
    temporaryPoster,
  ],
  { stdio: 'inherit' },
);

if (result.error || result.status !== 0) {
  await rm(temporaryPoster, { force: true });
  if (result.error?.code === 'ENOENT') {
    console.error(
      'FFmpeg is required only when the hero video changes. Install it, then run npm run generate:hero-poster.',
    );
  }
  process.exit(result.status || 1);
}

await rename(temporaryPoster, poster);
await writeFile(stamp, `${videoHash}\n`);
console.log('Generated public/land-vid-poster.webp from frame zero.');
