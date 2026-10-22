# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A static marketing site (French) for **SGC Horsemanship** — Coralie Maguet, comportementaliste équin / equine behaviorist, based in **Lesdain (59258)** near Cambrai, declared activity start 30/04/2026, SIRET 10253781800019, code APE 9609Z. Main one-pager + a sales page for the **Accompagnement Sérénité** offer + legal pages (mentions légales, confidentialité, CGV). Deployed on **Cloudflare Workers + Static Assets** (switched from Vercel, then from Pages-style functions to a Worker entry — see "Hosting & backend"), domain `sgchorsemanship.fr`.

The site was originally shipped as a single self-contained HTML file produced by an external "bundler" (`SGC Horsemanship.html`, ~4.6 MB, all assets inlined as gzipped base64). It has since been refactored into a conventional static site (see "Layout" below). The bundle file remains in the repo for reference / fallback but is **no longer the deployable artifact** — `index.html` plus `assets/` is.

## Production-readiness plan (3 steps)

1. ✅ **Refactor** — extract from monolithic bundle into real static files (`index.html`, `assets/css`, `assets/js`, `assets/fonts`, `assets/img`, `assets/video`). Fonts self-hosted (woff2, latin + latin-ext only — non-latin subsets dropped). Reels converted from static images to `<video>` with autoplay-on-hover.
2. ✅ **SEO** — Nord (59) local SEO done. Title/description optimized, OG + Twitter Card, JSON-LD `@graph` (LocalBusiness with SIRET, Person, 6× Service, Review, WebSite), `sitemap.xml`, `robots.txt`, canonical, hreflang fr-FR, favicon set, `site.webmanifest`. Images optimized to WebP (-94%) + `<picture>` + lazy loading + dimensions. Videos compressed via ffmpeg (-70%, audio stripped). Lighthouse mobile 100/100/100/100. Desktop 100/100/100 + 89 agentic, with one Lighthouse CLS quirk (real trace measures CLS=0).
3. ✅ **Légal / RGPD** — `mentions-legales.html` (LCEN art. 6: identité éditeur Coralie Maguet, statut micro-entrepreneur, adresse Lesdain, SIRET, APE 9609Z, TVA franchise base, hébergeur Cloudflare, Inc.) and `politique-confidentialite.html` (responsable du traitement, données collectées, finalités, base légale RGPD, conservation 3/5 ans, sous-traitant Cloudflare pour hébergement + Web Analytics, transferts US encadrés DPF/SCC, aucun cookie de tracking, 7 droits RGPD, modalités d'exercice, recours CNIL). Both at 100/100/100/100 Lighthouse. Footer links added on all pages.

Later additions:
- ✅ **Contact form backend** — Cloudflare Turnstile + `/api/contact` Worker route + Resend email (see "Hosting & backend").
- ✅ **Accompagnement Sérénité sales page** (`accompagnement-serenite.html`, 2026-10) + promo section `#accompagnement` on the home page + `conditions-generales-de-vente.html`.

## Layout

```
index.html                 home one-pager (semantic, BEM CSS classes, <main> landmark). Contains the #accompagnement promo section.
accompagnement-serenite.html  sales page for the 3-month "Accompagnement Sérénité" offer (189 €/mois × 3 = 567 €). Speaks "tu" (rest of site uses "vous"). Has its own contact form tagged offre=serenite.
mentions-legales.html      LCEN-compliant legal mentions page
politique-confidentialite.html  GDPR / RGPD privacy policy page
conditions-generales-de-vente.html  CGV (B2C services: rétractation 14 j + annex form, annulation 48 h, mineurs, médiation)
_headers                   cache headers + basic security headers
wrangler.jsonc             Worker config: main = src/_worker.js, static assets = repo root (filtered by .assetsignore)
src/_worker.js             Worker entry: routes POST /api/contact to functions/api/contact.js, everything else to ASSETS
functions/api/contact.js   form handler: Turnstile check → field validation (French phone) → Resend email to Coralie + auto-reply
.assetsignore              files NOT uploaded as static assets (src/, functions/, _build/, *.md, wrangler config…)
favicon.svg                modern browsers (mauve rounded square + italic serif "s")
favicon-16x16.png          \
favicon-32x32.png           |  generated from favicon.svg via `sips -Z N`
apple-touch-icon.png        |
android-chrome-192x192.png  |
android-chrome-512x512.png /
site.webmanifest           PWA manifest
sitemap.xml                all public pages + image entries
robots.txt                 allows all, disallows /_build/ and /content/

assets/
  css/styles.css           page styles + @font-face declarations (~35 KB, 24 @font-face → 12 woff2 files)
  js/main.js               contact-form fetch submit, reels playback, scroll-reveal IntersectionObserver
  fonts/                   12 woff2 self-hosted (Cormorant Garamond, DM Serif Display, Manrope, Pinyon Script — latin + latin-ext)
  img/                     9 PNGs + 9 WebP variants. PNG = fallback, WebP = primary (~94% smaller).
  video/                   4 MP4s for the "En séance" reels — H.264 CRF 30, audio stripped, 540 width. Total ~8 MB.

content/                   ORIGINAL source PNGs and MP4s used to produce the bundle. Kept for archival. assets/ is what the site uses.
SGC Horsemanship.html      LEGACY single-file bundle. No longer the deployable artifact. Kept for reference.
_build/                    extraction scripts (extract.mjs, refactor.mjs, assemble.mjs) + screenshots + video re-encode tmp, and illustrations.py (generator for the inline SVG illustrations). Not shipped to prod.
CLAUDE.md                  this file.
```

## Brand & content notes

- **Design system tokens** (CSS custom properties on `:root`): `--cream`, `--cream-soft`, `--milk`, `--rose`, `--rose-deep`, `--pink-haze`, `--pink-pale`, `--mauve`, `--mauve-ink`, `--ink`, `--ink-soft`, `--ink-mute`. Fonts: `--serif` (DM Serif Display), `--serif-c` (Cormorant Garamond), `--sans` (Manrope), `--script` (Pinyon Script). Layout: `--max: 1280px`, `--pad: clamp(20px, 4vw, 64px)`. Radii: `--r-pill: 999px`, `--r-card: 28px`, `--r-img: 22px`.
- **BEM classnames** throughout: `.hero__*`, `.about__*`, `.svc[--lg]`, `.reel[--up] .reel__phone .reel__video`, `.quote--hero`, `.contact__*`, `.offer__*` (home promo), and on the sales page `.sale-hero__*`, `.pains__*`, `.insight__*`, `.shift__*`, `.steps__* .step__*`, `.voices .voice__*`, `.fit__*`, `.pricing__*`, `.closing__*`. Keep this convention for new components.
- **Scroll reveal**: older components are listed by selector in `main.js` + the `.js-fade` CSS block; newer ones just add the class `reveal`. Prefer `reveal` for anything new.
- **Sales page photos** (`assets/img/serenite-*.jpeg|webp`, 1200 px, from Coralie, some with photographer watermark "LD"): `serenite-bisou` (hero + OG image), `serenite-cabre` (02 split band), `serenite-complicite` (03 wide photo), `serenite-poney-ecurie` (07 hex). Crops are tuned with `object-position` in CSS.
- **Illustrations**: 4 inline SVGs generated by `_build/illustrations.py` — A laurel seal "Sérénité · 3 mois" (home `.offer__seal`, sales `.pricing__seal`), B watercolor sprig (`.sale-hero__sprig`), C flowered horseshoe (`.steps__illus`), D watercolor lettering (`.closing__lettering`). A hand-drawn horse head was tried and rejected by the user — don't reintroduce figurative horse line-art.
- **Sales page structure** (reworked after user feedback "pas de fil conducteur, trop d'infos, le prix partout"): hero → 01 Le constat → 02 Un autre regard → 03 Ce qui change → 04 Le programme (5-step timeline) → 05 Elles en parlent (all testimonials together) → 06 Pour qui → 07 Qui suis-je → 08 L'offre → contact form → closing line. Numbered eyebrows are the thread. **The price appears only in 08 L'offre** — keep it that way; keep copy short (one idea per block). Long PDF copy was condensed on purpose.
- **Tone**: home + legal pages use "vous"; the sales page and its auto-reply use "tu" (decided with the user). The sales copy is feminine ("prête", "seule") but the offer targets "propriétaires majeurs — ou mineurs accompagnés de leurs parents" (not "femmes", to avoid a sex-based exclusion).
- **Sections** carry `data-screen-label` attributes (`01 Hero`, `02 À propos`, …) — likely a holdover from the bundle's screen-by-screen preview; harmless but you can drop them if it bothers you.
- **Marketing geography vs. legal address**: site copy says "Cambrai (59)" as the recognisable hub. The actual SIRET registration is in **Lesdain (21 rue de Vaucelles, 59258)**, 10 km from Cambrai. Mentions légales (step 3) **must** carry the Lesdain address; marketing copy can keep "Cambrai".
- **Reels mapping** (sequential, not semantic): `short1.mp4 → Confiance`, `short2 → Communication`, `short3 → Écoute`, `short4 → Respect`. If a reordering is needed, edit the `reelMap` in `_build/assemble.mjs` and re-run, or just edit `index.html` directly.

## Running locally

There's no build step — it's static HTML/CSS/JS. Serve the repo root with the clean-URL dev server (same as `.claude/launch.json`):

```bash
python3 _build/serve.py 8765
```

The site uses absolute paths (`/assets/...`), so `file://` won't work — use a server. Cloudflare Pages will serve the same paths in production.

`_build/serve.py` maps extensionless paths to `.html` like Cloudflare does (plain `python3 -m http.server` 404s on `/accompagnement-serenite`, `/conditions-generales-de-vente`…). It can't run `/api/contact` — use `npx wrangler dev` to test the form end-to-end (needs `TURNSTILE_SECRET_KEY`, optionally `RESEND_API_KEY`, in `.dev.vars`).

**Cache-busting rule**: `_headers` caches `/assets/css/*` and `/assets/js/*` for 7 days. The HTML pages therefore reference them with a `?v=YYYYMMDD` query param (e.g. `styles.css?v=20261022`). **Whenever you edit `styles.css` or `main.js`, bump the `?v=` value in every HTML file** (index, accompagnement-serenite, mentions-legales, politique-confidentialite, conditions-generales-de-vente) — otherwise returning visitors get the new HTML with the stale cached CSS/JS and the layout breaks silently.

## Hosting & backend

- **Contact form works.** Both forms (home `#contact`, sales page `#parlons`) POST to `/api/contact` via `fetch` in `main.js` (native POST fallback without JS). `functions/api/contact.js` verifies the Turnstile token, validates fields (prénom + French phone required), emails Coralie through Resend (`From: no-reply@sgchorsemanship.fr`, apex verified in Resend), and sends an auto-reply when the visitor left an email.
- **Env vars** (Worker secrets): `TURNSTILE_SECRET_KEY` (required — without it the form returns 500), `RESEND_API_KEY` (without it the form acks success but sends nothing), optional `CONTACT_TO_EMAIL` (default `contact@sgchorsemanship.fr`) and `CONTACT_FROM_EMAIL`. Turnstile site key is inline in the HTML forms.
- **Offer tagging**: a hidden `<input name="offre" value="serenite">` marks sales-page leads. The function whitelists values in `OFFERS`, prefixes the email subject with `[Accompagnement Sérénité]`, and switches the auto-reply to "tu". Add new offers to `OFFERS`.
- **Form messages** can be overridden per page with `data-sent` / `data-error` on `.contact__sent`.
- The home page also links a **Calendly** booking (`calendly.com/coraliem1298/appel-telephonique`) next to the call-back form.
- **Analytics**: Cloudflare Web Analytics (injected by Cloudflare when enabled, cookieless). No script in the HTML.

## Re-running the bundle extraction (rare)

If the original `SGC Horsemanship.html` is updated and you need to re-derive `assets/`:

```bash
node _build/extract.mjs   # dumps every manifest entry as _build/extracted/<uuid>.<ext>, writes _build/manifest-report.txt
node _build/refactor.mjs  # outputs to _build/out/: styles.css, main.js, fonts/, page-fragment.html
node _build/assemble.mjs  # writes the final index.html (with reel <video> substitutions)
```

Then `cp _build/out/css/styles.css assets/css/` etc. (see `_build/assemble.mjs` for the exact file moves used the first time). The refactor script strips `cyrillic`, `cyrillic-ext`, `vietnamese`, `greek` subsets — only `latin` and `latin-ext` survive (French-only site).

## Open items before production deploy

- **Check `contact@sgchorsemanship.fr` is a real, monitored inbox** — it's the form's default recipient and appears in the legal pages / CGV.
- **CGV**: médiateur = CM2C (Centre de la Médiation de la Consommation de Conciliateurs de Justice, 49 rue de Ponthieu 75008 Paris, cm2c.net), from the convention Coralie shared — make sure it's actually signed. No EU ODR link (platform closed in July 2025). The CGV business rules (48 h cancellation, payment schedule, interruption for "motif légitime", Discord access limited to the accompaniment) are sensible defaults written by Claude — Coralie must validate them.
- **Privacy policy** doesn't yet mention Google Docs / Discord (used in the Accompagnement Sérénité) — worth a line as tools used for the service.
- **OG cover image** is `hero-coralie.png` (500×500 square). For best social-share appearance, a dedicated 1200×630 image would be ideal. Not blocking.
- **Analytics**: if moving beyond Cloudflare Web Analytics, Plausible/Matomo don't require a cookie banner; GA4 requires consent + a CMP.
- **CLS quirk**: Lighthouse desktop reports CLS=0.144 deterministically (same value every run), while live performance trace shows CLS=0. Likely a font-metric simulation artifact. Real-user metrics (CrUX) won't see this.
- **INPI domain mismatch**: INPI declares `sgceducationducheval.fr`, the site ships on `sgchorsemanship.fr`. Legal (different brand name vs. domain is allowed) but worth a one-line correction at INPI if Coralie wants alignment.
