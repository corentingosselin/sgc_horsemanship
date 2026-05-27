// One-off extraction script: pulls every asset out of the bundle and writes
// each as <uuid>.<ext> in _build/extracted/. Also emits manifest-report.txt
// mapping UUIDs to mime types and showing which are referenced in the template.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(repoRoot, 'SGC Horsemanship.html');
const outDir = path.join(__dirname, 'extracted');
fs.mkdirSync(outDir, { recursive: true });

const html = fs.readFileSync(htmlPath, 'utf8');
const lines = html.split('\n');

// Locate the three bundler payloads by their script tags, not by line number,
// so this stays resilient if the file is reformatted.
function payloadAfter(tagRegex) {
  for (let i = 0; i < lines.length; i++) {
    if (tagRegex.test(lines[i])) return lines[i + 1];
  }
  throw new Error(`Tag not found: ${tagRegex}`);
}

const manifestRaw = payloadAfter(/<script type="__bundler\/manifest">/);
const templateRaw = payloadAfter(/<script type="__bundler\/template">/);

const manifest = JSON.parse(manifestRaw);
const template = JSON.parse(templateRaw);

const mimeExt = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'font/woff2': 'woff2',
  'font/woff': 'woff',
  'application/font-woff2': 'woff2',
  'application/font-woff': 'woff',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'text/javascript': 'js',
  'application/javascript': 'js',
  'text/css': 'css',
  'text/html': 'html',
  'application/json': 'json',
};

const written = {};
let totalBytes = 0;
for (const [uuid, entry] of Object.entries(manifest)) {
  let bytes = Buffer.from(entry.data, 'base64');
  if (entry.compressed) bytes = zlib.gunzipSync(bytes);
  const ext = mimeExt[entry.mime] || 'bin';
  const outPath = path.join(outDir, `${uuid}.${ext}`);
  fs.writeFileSync(outPath, bytes);
  written[uuid] = { mime: entry.mime, ext, size: bytes.length, compressed: !!entry.compressed };
  totalBytes += bytes.length;
}

// Find every UUID referenced in the template.
const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const templateRefs = [...new Set(template.match(uuidRe) || [])];

// Also try to detect the surrounding context (a few chars before each ref)
// so we can guess what each image represents — e.g. alt= or src= or url().
const refContexts = {};
for (const ref of templateRefs) {
  refContexts[ref] = [];
  let idx = 0;
  while ((idx = template.indexOf(ref, idx)) !== -1) {
    const start = Math.max(0, idx - 60);
    const end = Math.min(template.length, idx + ref.length + 40);
    refContexts[ref].push(template.slice(start, end).replace(/\\n/g, ' ').replace(/\s+/g, ' '));
    idx += ref.length;
  }
}

const reportLines = [];
reportLines.push(`Bundle extraction report — ${new Date().toISOString()}`);
reportLines.push(`Total assets in manifest: ${Object.keys(manifest).length}`);
reportLines.push(`Total raw bytes after decompression: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
reportLines.push(`UUIDs referenced in template: ${templateRefs.length}`);
reportLines.push('');
reportLines.push('=== Referenced in template ===');
for (const ref of templateRefs) {
  const info = written[ref];
  reportLines.push(`\n${ref}  →  ${info ? info.mime + ' (' + (info.size / 1024).toFixed(1) + ' KB)' : 'NOT IN MANIFEST'}`);
  for (const ctx of refContexts[ref].slice(0, 2)) {
    reportLines.push(`  context: …${ctx}…`);
  }
}
reportLines.push('');
reportLines.push('=== In manifest but NOT referenced in template ===');
for (const [uuid, info] of Object.entries(written)) {
  if (!templateRefs.includes(uuid)) {
    reportLines.push(`${uuid}  →  ${info.mime} (${(info.size / 1024).toFixed(1)} KB)`);
  }
}
reportLines.push('');
reportLines.push('=== Mime type summary ===');
const mimeCount = {};
for (const info of Object.values(written)) mimeCount[info.mime] = (mimeCount[info.mime] || 0) + 1;
for (const [mime, n] of Object.entries(mimeCount).sort((a, b) => b[1] - a[1])) {
  reportLines.push(`${n.toString().padStart(4)}× ${mime}`);
}

fs.writeFileSync(path.join(__dirname, 'manifest-report.txt'), reportLines.join('\n'));
console.log(`Wrote ${Object.keys(written).length} files to ${outDir}`);
console.log(`Report: ${path.join(__dirname, 'manifest-report.txt')}`);
