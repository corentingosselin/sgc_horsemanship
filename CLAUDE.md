# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A static one-page marketing site (French) for **SGC Horsemanship** — Coralie Maguet, comportementaliste équin / equine behaviorist, based in **Lesdain (59258)** near Cambrai, declared activity start 30/04/2026, SIRET 10253781800019, code APE 9609Z. Target production deploy: **Vercel**, domain `sgchorsemanship.fr` (not yet acquired at time of writing).

The site was originally shipped as a single self-contained HTML file produced by an external "bundler" (`SGC Horsemanship.html`, ~4.6 MB, all assets inlined as gzipped base64). It has since been refactored into a conventional static site (see "Layout" below). The bundle file remains in the repo for reference / fallback but is **no longer the deployable artifact** — `index.html` plus `assets/` is.

## Production-readiness plan (3 steps)

1. ✅ **Refactor** — extract from monolithic bundle into real static files (`index.html`, `assets/css`, `assets/js`, `assets/fonts`, `assets/img`, `assets/video`). Fonts self-hosted (woff2, latin + latin-ext only — non-latin subsets dropped). Reels converted from static images to `<video>` with autoplay-on-hover.
2. ✅ **SEO** — Nord (59) local SEO done. Title/description optimized, OG + Twitter Card, JSON-LD `@graph` (LocalBusiness with SIRET, Person, 6× Service, Review, WebSite), `sitemap.xml`, `robots.txt`, canonical, hreflang fr-FR, favicon set, `site.webmanifest`. Images optimized to WebP (-94%) + `<picture>` + lazy loading + dimensions. Videos compressed via ffmpeg (-70%, audio stripped). Lighthouse mobile 100/100/100/100. Desktop 100/100/100 + 89 agentic, with one Lighthouse CLS quirk (real trace measures CLS=0).
3. ✅ **Légal / RGPD** — `mentions-legales.html` (LCEN art. 6: identité éditeur Coralie Maguet, statut micro-entrepreneur, adresse Lesdain, SIRET, APE 9609Z, TVA franchise base, hébergeur Vercel Inc.) and `politique-confidentialite.html` (responsable du traitement, données collectées, finalités, base légale RGPD, conservation 3/5 ans, sous-traitant Vercel, transferts US encadrés DPF/SCC, aucun cookie/tracker, 7 droits RGPD, modalités d'exercice, recours CNIL). Both at 100/100/100/100 Lighthouse. Footer links added on all pages. Email = placeholder `contact@sgchorsemanship.fr` to replace before deploy.

Form backend and analytics are explicitly deferred ("plus tard" per user).

## Layout

```
index.html                 deployable entry point (~24 KB after SEO+JSON-LD, semantic, BEM CSS classes, <main> landmark)
mentions-legales.html      LCEN-compliant legal mentions page
politique-confidentialite.html  GDPR / RGPD privacy policy page
vercel.json                cleanUrls + cache headers + basic security headers
favicon.svg                modern browsers (mauve rounded square + italic serif "s")
favicon-16x16.png          \
favicon-32x32.png           |  generated from favicon.svg via `sips -Z N`
apple-touch-icon.png        |
android-chrome-192x192.png  |
android-chrome-512x512.png /
site.webmanifest           PWA manifest
sitemap.xml                index URL + hero/about image entries
robots.txt                 allows all, disallows /_build/ and /content/

assets/
  css/styles.css           page styles + @font-face declarations (~35 KB, 24 @font-face → 12 woff2 files)
  js/main.js               hover-play reels + scroll-reveal IntersectionObserver (~2.5 KB)
  fonts/                   12 woff2 self-hosted (Cormorant Garamond, DM Serif Display, Manrope, Pinyon Script — latin + latin-ext)
  img/                     9 PNGs + 9 WebP variants. PNG = fallback, WebP = primary (~94% smaller).
  video/                   4 MP4s for the "En séance" reels — H.264 CRF 30, audio stripped, 540 width. Total ~8 MB.

content/                   ORIGINAL source PNGs and MP4s used to produce the bundle. Kept for archival. assets/ is what the site uses.
SGC Horsemanship.html      LEGACY single-file bundle. No longer the deployable artifact. Kept for reference.
_build/                    extraction scripts (extract.mjs, refactor.mjs, assemble.mjs) + screenshots + video re-encode tmp. Used to derive the current assets/. Not shipped to prod.
CLAUDE.md                  this file.
```

## Brand & content notes

- **Design system tokens** (CSS custom properties on `:root`): `--cream`, `--cream-soft`, `--milk`, `--rose`, `--rose-deep`, `--pink-haze`, `--pink-pale`, `--mauve`, `--mauve-ink`, `--ink`, `--ink-soft`, `--ink-mute`. Fonts: `--serif` (DM Serif Display), `--serif-c` (Cormorant Garamond), `--sans` (Manrope), `--script` (Pinyon Script). Layout: `--max: 1280px`, `--pad: clamp(20px, 4vw, 64px)`. Radii: `--r-pill: 999px`, `--r-card: 28px`, `--r-img: 22px`.
- **BEM classnames** throughout: `.hero__*`, `.about__*`, `.svc[--lg]`, `.reel[--up] .reel__phone .reel__video`, `.quote--hero`, `.contact__*`. Keep this convention for new components.
- **Sections** carry `data-screen-label` attributes (`01 Hero`, `02 À propos`, …) — likely a holdover from the bundle's screen-by-screen preview; harmless but you can drop them if it bothers you.
- **Marketing geography vs. legal address**: site copy says "Cambrai (59)" as the recognisable hub. The actual SIRET registration is in **Lesdain (21 rue de Vaucelles, 59258)**, 10 km from Cambrai. Mentions légales (step 3) **must** carry the Lesdain address; marketing copy can keep "Cambrai".
- **Reels mapping** (sequential, not semantic): `short1.mp4 → Confiance`, `short2 → Communication`, `short3 → Écoute`, `short4 → Respect`. If a reordering is needed, edit the `reelMap` in `_build/assemble.mjs` and re-run, or just edit `index.html` directly.

## Running locally

There's no build step — it's static HTML/CSS/JS. Serve the repo root via any static server:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

The site uses absolute paths (`/assets/...`), so `file://` won't work — use a server. Vercel will serve the same paths in production.

## Re-running the bundle extraction (rare)

If the original `SGC Horsemanship.html` is updated and you need to re-derive `assets/`:

```bash
node _build/extract.mjs   # dumps every manifest entry as _build/extracted/<uuid>.<ext>, writes _build/manifest-report.txt
node _build/refactor.mjs  # outputs to _build/out/: styles.css, main.js, fonts/, page-fragment.html
node _build/assemble.mjs  # writes the final index.html (with reel <video> substitutions)
```

Then `cp _build/out/css/styles.css assets/css/` etc. (see `_build/assemble.mjs` for the exact file moves used the first time). The refactor script strips `cyrillic`, `cyrillic-ext`, `vietnamese`, `greek` subsets — only `latin` and `latin-ext` survive (French-only site).

## Open items before production deploy

- **Buy the domain** `sgchorsemanship.fr` — referenced everywhere (canonical, JSON-LD, OG, sitemap, legal pages) but not yet acquired.
- **Replace `contact@sgchorsemanship.fr` placeholder** — appears in mentions-legales, politique-confidentialite, and JSON-LD. Replace with the real address before deploy. Once the domain is bought, a `contact@` alias is the natural choice.
- **OG cover image** is `hero-coralie.png` (500×500 square). For best social-share appearance, a dedicated 1200×630 image would be ideal. Not blocking.
- **Contact form is non-functional**: `onsubmit` just toggles a "merci" hint, no backend. The fields have `name` and `autocomplete` attributes ready to wire up later (deferred per user — Formspree / Netlify Forms / SMTP relay).
- **Analytics** deliberately absent (deferred per user). When adding: Plausible/Matomo are RGPD-friendly and don't require a cookie banner. GA4 requires consent — would also force adding a CMP.
- **CLS quirk**: Lighthouse desktop reports CLS=0.144 deterministically (same value every run), while live performance trace shows CLS=0. Likely a font-metric simulation artifact. Real-user metrics (CrUX) won't see this.
- **INPI domain mismatch**: INPI declares `sgceducationducheval.fr`, the site ships on `sgchorsemanship.fr`. Legal (different brand name vs. domain is allowed) but worth a one-line correction at INPI if Coralie wants alignment.
