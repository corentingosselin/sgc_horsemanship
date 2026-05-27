// Refactor pass 2: extract the CSS, the inline page JS, and the HTML template
// out of the bundle, build a UUID → /assets/<path> remapping table, and emit
// production-ready files into _build/out/. Fonts get semantic filenames based
// on the @font-face metadata; non-latin subsets are dropped (French-only site).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(repoRoot, 'SGC Horsemanship.html');

const html = fs.readFileSync(htmlPath, 'utf8');
const lines = html.split('\n');
function payloadAfter(tagRegex) {
  for (let i = 0; i < lines.length; i++) if (tagRegex.test(lines[i])) return lines[i + 1];
  throw new Error(`Tag not found: ${tagRegex}`);
}
const manifest = JSON.parse(payloadAfter(/<script type="__bundler\/manifest">/));
const template = JSON.parse(payloadAfter(/<script type="__bundler\/template">/));

// --- Parse the embedded <style> out of the template ---------------------------

// The template contains multiple <style> blocks (fonts in one, page styles in
// others). Concatenate them all in document order.
const styleBlocks = [...template.matchAll(/<style>([\s\S]+?)<\/style>/g)].map(m => m[1]);
if (!styleBlocks.length) throw new Error('no <style> block found in template');
const css = styleBlocks.join('\n\n');

// --- Walk every @font-face block, derive (family, style, subset) for each url
// UUID. The bundle has multiple @font-face entries sharing the same url across
// weights (Google Fonts pattern), so the file's "identity" is family+style+subset.

const subsetByRange = {
  'U+0460-052F': 'cyrillic-ext',
  'U+0301, U+0400-045F': 'cyrillic',
  'U+0102-0103': 'vietnamese',
  'U+0100-02BA': 'latin-ext',
  'U+0000-00FF': 'latin',
  'U+0370-0377': 'greek',
  'U+1F00-1FFF': 'greek-ext',
};
function subsetFromRange(range) {
  if (!range) return 'unknown';
  for (const [prefix, name] of Object.entries(subsetByRange)) {
    if (range.startsWith(prefix)) return name;
  }
  return 'latin'; // safe default for our use
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const fontByUuid = {};
const faceBlockRe = /@font-face\s*\{([^}]+)\}/g;
let faceMatch;
while ((faceMatch = faceBlockRe.exec(css))) {
  const body = faceMatch[1];
  const family = (body.match(/font-family:\s*['"]([^'"]+)['"]/) || [])[1];
  const style = (body.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
  const url = (body.match(/url\("([^"]+)"\)/) || [])[1];
  const range = (body.match(/unicode-range:\s*([^;]+);/) || [])[1] || '';
  if (!family || !url) continue;
  const subset = subsetFromRange(range);
  const semantic = `${slug(family)}-${style === 'italic' ? 'italic-' : ''}${subset}.woff2`;
  fontByUuid[url] = { family, style, subset, range, semantic };
}

// --- Keep only the subsets we actually need for a French-only site -----------

const KEEP_SUBSETS = new Set(['latin', 'latin-ext']);
const fontsToKeep = Object.fromEntries(
  Object.entries(fontByUuid).filter(([_, info]) => KEEP_SUBSETS.has(info.subset))
);
const fontsToDrop = Object.keys(fontByUuid).filter((u) => !fontsToKeep[u]);

// --- Build the full UUID → output path remapping table -----------------------

const remap = {}; // uuid → path

// Fonts
for (const [uuid, info] of Object.entries(fontsToKeep)) {
  remap[uuid] = `/assets/fonts/${info.semantic}`;
}

// Images and the inline JS — identify by mime
const imageNamesByUuid = {
  'acd00f1a-c27f-487b-93ad-680458265796': 'hero-coralie.png',
  '072218e1-2e64-480c-984a-7f385ccfef89': 'about-coralie.png',
  '93c520b7-c283-4a2d-83ed-d8baa2afab15': 'service-bilan-comportemental.png',
  '39fee625-864e-456a-9a34-7ec359ab4df7': 'service-bilan-posture-locomotion.png',
  '16148a18-0e26-4c91-bf67-24725f505dec': 'service-seance-individuelle.png',
  '4e09bc0c-7661-4fe1-827e-335d6e807015': 'service-accompagnement.png',
  'e316b9ee-cf22-4b71-98d5-372f55156180': 'service-analyse-video.png',
  '9c6112a8-18d8-4bcf-9aec-9eb5d333b342': 'service-stages-ateliers.png',
  '4c56885f-502e-4daf-ae3e-39413136e7d1': 'avis-coralie.png',
};
for (const [uuid, name] of Object.entries(imageNamesByUuid)) {
  remap[uuid] = `/assets/img/${name}`;
}
remap['40f2fb9c-03b4-46ae-bff5-4baa72021c96'] = '/assets/js/main.js';

// --- Rewrite the CSS: drop dropped @font-face blocks, point kept URLs to /assets/

let newCss = css;
// Remove every @font-face block that references a dropped font.
newCss = newCss.replace(/(?:\/\*[^*]*\*\/\s*)?@font-face\s*\{[^}]+\}\s*/g, (block) => {
  const url = (block.match(/url\("([^"]+)"\)/) || [])[1];
  if (url && fontsToDrop.includes(url)) return '';
  return block;
});
// Now remap the surviving font URLs.
for (const [uuid, p] of Object.entries(remap)) {
  newCss = newCss.split(uuid).join(p);
}

// --- Rewrite the HTML template body -----------------------------------------

const bodyOpenMatch = template.match(/<body[^>]*>/);
if (!bodyOpenMatch) throw new Error('no <body> tag in template');
const bodyStart = bodyOpenMatch.index + bodyOpenMatch[0].length;
const bodyEnd = template.lastIndexOf('</body>');
if (bodyEnd === -1) throw new Error('no </body> tag in template');
let pageHtml = template.slice(bodyStart, bodyEnd);

// Strip the leftover head closer + body opener structure to inspect cleanly.
// Then remap UUIDs.
for (const [uuid, p] of Object.entries(remap)) {
  pageHtml = pageHtml.split(uuid).join(p);
}

// --- Extract the runtime JS verbatim -----------------------------------------

const jsUuid = '40f2fb9c-03b4-46ae-bff5-4baa72021c96';
const jsEntry = manifest[jsUuid];
let jsBytes = Buffer.from(jsEntry.data, 'base64');
if (jsEntry.compressed) jsBytes = zlib.gunzipSync(jsBytes);

// --- Extract the surviving font files ----------------------------------------

const outDir = path.join(__dirname, 'out');
fs.mkdirSync(path.join(outDir, 'fonts'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'video'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'css'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'js'), { recursive: true });

for (const [uuid, info] of Object.entries(fontsToKeep)) {
  const entry = manifest[uuid];
  let bytes = Buffer.from(entry.data, 'base64');
  if (entry.compressed) bytes = zlib.gunzipSync(bytes);
  fs.writeFileSync(path.join(outDir, 'fonts', info.semantic), bytes);
}

fs.writeFileSync(path.join(outDir, 'css', 'styles.css'), newCss);
fs.writeFileSync(path.join(outDir, 'js', 'main.js'), jsBytes);
fs.writeFileSync(path.join(outDir, 'page-fragment.html'), pageHtml);

// --- Summary -----------------------------------------------------------------

console.log(`Fonts kept (latin + latin-ext): ${Object.keys(fontsToKeep).length}`);
for (const info of Object.values(fontsToKeep)) {
  console.log(`  ${info.semantic} — ${info.family} ${info.style} (${info.subset})`);
}
console.log(`Fonts dropped: ${fontsToDrop.length}`);
console.log(`CSS: ${newCss.length} chars → _build/out/css/styles.css`);
console.log(`JS:  ${jsBytes.length} bytes → _build/out/js/main.js`);
console.log(`Page fragment: ${pageHtml.length} chars → _build/out/page-fragment.html`);
