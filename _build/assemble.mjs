// Final assembly: take page-fragment.html, swap the 4 reel <img> tags for
// <video> with poster + hover-play attributes, and wrap in <html><head><body>.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

let body = fs.readFileSync(path.join(__dirname, 'out', 'page-fragment.html'), 'utf8');

// Sequential mapping: short1 → Confiance, short2 → Communication, short3 → Écoute, short4 → Respect.
// (Adjust if user wants to reorder.) Each <img class="reel__still"> becomes a <video>
// with poster (= the current still PNG) + muted/loop/playsinline for hover-play.
const reelMap = [
  { caption: 'Confiance', poster: '/assets/img/service-bilan-posture-locomotion.png', video: '/assets/video/reel-confiance.mp4' },
  { caption: 'Communication', poster: '/assets/img/service-accompagnement.png', video: '/assets/video/reel-communication.mp4' },
  { caption: 'Écoute', poster: '/assets/img/service-bilan-comportemental.png', video: '/assets/video/reel-ecoute.mp4' },
  { caption: 'Respect', poster: '/assets/img/service-stages-ateliers.png', video: '/assets/video/reel-respect.mp4' },
];

for (const reel of reelMap) {
  const imgRe = new RegExp(
    `<img class="reel__still" src="${reel.poster.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" alt="${reel.caption}">`
  );
  const replacement =
    `<video class="reel__video" poster="${reel.poster}" muted loop playsinline preload="metadata" aria-label="${reel.caption} — extrait vidéo">\n` +
    `            <source src="${reel.video}" type="video/mp4">\n` +
    `          </video>`;
  const before = body;
  body = body.replace(imgRe, replacement);
  if (body === before) throw new Error(`Reel substitution failed for "${reel.caption}"`);
}

const head = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#F4EAD9">

  <title>SGC Horsemanship — Coralie Maguet · Comportementaliste équin</title>
  <meta name="description" content="Coralie Maguet, comportementaliste et éducatrice équine basée près de Cambrai (Nord). Bilans comportementaux, séances, accompagnement sur-mesure pour cavaliers et chevaux.">

  <link rel="preload" as="font" type="font/woff2" href="/assets/fonts/manrope-latin.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="/assets/fonts/dm-serif-display-latin.woff2" crossorigin>
  <link rel="preload" as="image" href="/assets/img/hero-coralie.png">

  <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body>`;

const tail = `\n</body>\n</html>\n`;

const fullHtml = head + body + tail;

fs.writeFileSync(path.join(repoRoot, 'index.html'), fullHtml);
console.log(`Wrote ${fullHtml.length} chars to index.html`);
console.log(`Body length: ${body.length}`);
