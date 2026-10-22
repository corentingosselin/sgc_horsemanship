# Generates the 4 decorative SVG illustrations used on the site
# (A laurel seal, B watercolor sprig, C flowered horseshoe, D lettering).
#
#   python3 _build/illustrations.py _build/illustrations.html [snips.json]
#
# The first arg writes a preview sheet; the optional second dumps the raw
# <svg> snippets as JSON. The snippets are pasted inline into index.html
# (A, .offer__seal) and accompagnement-serenite.html (A .pricing__seal,
# B .sale-hero__sprig, C .steps__illus, D .closing__lettering) — edit here,
# regenerate, and replace the inline <svg> in those files.
import math, sys
out = sys.argv[1]
f = lambda v: f"{v:.1f}"

def leaf(cx, cy, ang, L, W, fill, stroke, op=1):
    # almond leaf pointing along `ang` (deg), base at (cx,cy)
    a = math.radians(ang); ux, uy = math.cos(a), math.sin(a); px, py = -uy, ux
    tx, ty = cx+ux*L, cy+uy*L
    c1 = (cx+ux*L*0.35+px*W, cy+uy*L*0.35+py*W); c2 = (cx+ux*L*0.75+px*W*0.8, cy+uy*L*0.75+py*W*0.8)
    d1 = (cx+ux*L*0.75-px*W*0.8, cy+uy*L*0.75-py*W*0.8); d2 = (cx+ux*L*0.35-px*W, cy+uy*L*0.35-py*W)
    p = f"M{f(cx)} {f(cy)} C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(tx)} {f(ty)} C{f(d1[0])} {f(d1[1])} {f(d2[0])} {f(d2[1])} {f(cx)} {f(cy)}Z"
    vein = f"M{f(cx)} {f(cy)} L{f(cx+ux*L*0.8)} {f(cy+uy*L*0.8)}"
    return f'<path d="{p}" fill="{fill}" fill-opacity="{op}" stroke="{stroke}" stroke-width="1.2"/><path d="{vein}" stroke="{stroke}" stroke-width="0.8" fill="none" opacity=".6"/>'

ROSE, DEEP, MAUVE, PALE, HAZE, MILK = "#E5B6BB", "#D295A0", "#9C5C63", "#F4D2D6", "#F8E1E4", "#FFFAF0"

# ---- A: laurel medallion ----
def laurel(side):
    s = []
    cx, cy, R = 100, 100, 78
    for i in range(9):
        t = math.radians(110 + i*17) if side < 0 else math.radians(70 - i*17)
        x, y = cx + R*math.cos(t), cy + R*math.sin(t)
        tang = math.degrees(t) + (90 if side < 0 else -90)
        # two leaves per node, angled outward / inward
        s.append(leaf(x, y, tang - 28*side*-1, 20, 6, PALE, MAUVE))
        s.append(leaf(x, y, tang + 22*side*-1, 17, 5, ROSE, MAUVE, .7))
    # stem
    a0, a1 = (110, 110+8*17) if side < 0 else (70, 70-8*17)
    pts = [(cx+R*math.cos(math.radians(a0+(a1-a0)*k/20)), cy+R*math.sin(math.radians(a0+(a1-a0)*k/20))) for k in range(21)]
    s.insert(0, '<path d="M' + " L".join(f"{f(x)} {f(y)}" for x,y in pts) + f'" stroke="{MAUVE}" stroke-width="1.4" fill="none"/>')
    return "".join(s)
A = f'''<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="62" fill="{HAZE}"/><circle cx="100" cy="100" r="56" fill="none" stroke="{DEEP}" stroke-width="1" stroke-dasharray="2 4"/>
{laurel(-1)}{laurel(1)}
<text x="100" y="104" text-anchor="middle" font-family="Pinyon Script" font-size="34" fill="{MAUVE}">Sérénité</text>
<text x="100" y="126" text-anchor="middle" font-family="Manrope" font-weight="600" font-size="8.5" letter-spacing="2.6" fill="{MAUVE}">3 MOIS</text></svg>'''

# ---- B: watercolor botanical sprig ----
def sprig():
    s = [f'<path d="M40 175 C 70 140 95 95 150 30" stroke="{MAUVE}" stroke-width="1.6" fill="none"/>']
    for i in range(7):
        k = (i+1)/8
        # point on the cubic
        x = (1-k)**3*40 + 3*(1-k)**2*k*70 + 3*(1-k)*k*k*95 + k**3*150
        y = (1-k)**3*175 + 3*(1-k)**2*k*140 + 3*(1-k)*k*k*95 + k**3*30
        L = 34 - i*2.6
        s.append(leaf(x, y, -10 - i*4, L, L*0.33, ROSE, MAUVE, .55) if i % 2 == 0 else leaf(x, y, -110 - i*3, L, L*0.33, DEEP, MAUVE, .45))
    for (x, y, r) in [(152, 28, 5), (160, 40, 4), (144, 20, 3.5)]:
        s.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{DEEP}" stroke="{MAUVE}" stroke-width="1"/>')
    return "".join(s)
B = f'''<svg viewBox="0 0 200 200"><defs><filter id="wc"><feTurbulence baseFrequency=".035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter></defs>
<ellipse cx="104" cy="104" rx="70" ry="64" fill="{PALE}" opacity=".7" filter="url(#wc)"/>{sprig()}</svg>'''

# ---- C: lucky horseshoe with flowers ----
def flower(cx, cy, r, petal, core):
    s = []
    for k in range(5):
        a = math.radians(k*72 - 90)
        s.append(f'<ellipse cx="{f(cx+math.cos(a)*r*0.75)}" cy="{f(cy+math.sin(a)*r*0.75)}" rx="{f(r*0.62)}" ry="{f(r*0.5)}" transform="rotate({k*72} {f(cx+math.cos(a)*r*0.75)} {f(cy+math.sin(a)*r*0.75)})" fill="{petal}" stroke="{MAUVE}" stroke-width="1"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.3}" fill="{core}" stroke="{MAUVE}" stroke-width="1"/>')
    return "".join(s)
holes = "".join(f'<circle cx="{x}" cy="{y}" r="2.2" fill="{MILK}"/>' for x, y in [(54,92),(56,122),(74,146),(126,146),(144,122),(146,92)])
C = f'''<svg viewBox="0 0 200 200"><circle cx="100" cy="104" r="80" fill="{HAZE}"/>
<path d="M72 54 C 38 74 36 158 100 158 C 164 158 162 74 128 54" fill="none" stroke="{DEEP}" stroke-width="20"/>
<path d="M72 54 C 38 74 36 158 100 158 C 164 158 162 74 128 54" fill="none" stroke="{MAUVE}" stroke-width="1" stroke-dasharray="1 5" opacity=".5"/>
{holes}
{leaf(58,58,-150,24,7,PALE,MAUVE)}{leaf(64,52,-70,22,7,ROSE,MAUVE,.7)}{leaf(142,60,-30,22,7,PALE,MAUVE)}
{flower(64,58,13,PALE,DEEP)}{flower(138,58,10,MILK,ROSE)}{flower(150,74,6,PALE,DEEP)}</svg>'''

# ---- D: hand-lettered word with watercolor swash ----
D = f'''<svg viewBox="0 0 200 200"><defs><filter id="wc2"><feTurbulence baseFrequency=".04" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="8"/></filter></defs>
<path d="M28 118 C 60 92 120 136 172 96" stroke="{PALE}" stroke-width="34" stroke-linecap="round" fill="none" filter="url(#wc2)" opacity=".9"/>
<path d="M40 128 C 80 112 130 140 166 116" stroke="{ROSE}" stroke-width="10" stroke-linecap="round" fill="none" filter="url(#wc2)" opacity=".55"/>
<text x="100" y="114" text-anchor="middle" font-family="Pinyon Script" font-size="46" fill="{MAUVE}">Sérénité</text>
<text x="100" y="150" text-anchor="middle" font-family="Cormorant Garamond" font-style="italic" font-size="15" fill="{MAUVE}">comprendre · apaiser · avancer</text>
<path d="M150 56 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="{DEEP}"/><path d="M48 66 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="{ROSE}"/></svg>'''

opts = [("A", "Médaillon laurier", "Sceau élégant « Sérénité · 3 mois », couronne de feuillage rose. Fait office de badge de l'offre.", A),
        ("B", "Branche aquarelle", "Rameau botanique sur tache aquarelle — doux, féminin, pas de cheval littéral.", B),
        ("C", "Fer à cheval fleuri", "Fer porte-bonheur orné de fleurs — clin d'œil équestre, côté carte postale.", C),
        ("D", "Lettrage aquarelle", "Le mot « Sérénité » en script sur un coup de pinceau aquarelle — typographique, très lié à la charte.", D)]
cards = "".join(f'''<figure class="opt"><div class="art">{svg}</div><div class="art art--dark">{svg}</div>
<figcaption><strong>{k} · {t}</strong><span>{d}</span></figcaption></figure>''' for k, t, d, svg in opts)
open(out, "w").write(f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Illustrations — options</title><link rel="stylesheet" href="/assets/css/styles.css">
<style>body{{padding:40px var(--pad)}} h1{{font-family:var(--serif);font-weight:400;margin:0 0 30px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;max-width:1280px}}
.opt{{margin:0;background:var(--milk);border-radius:24px;padding:20px;border:1px solid rgba(180,114,121,.15)}}
.art{{display:flex;justify-content:center;padding:10px;border-radius:16px}} .art svg{{width:200px;height:200px}}
.art--dark{{background:var(--mauve-ink);margin-top:10px}} .art--dark svg{{width:120px;height:120px}}
figcaption{{display:flex;flex-direction:column;gap:6px;margin-top:14px}} figcaption strong{{font-family:var(--serif);font-weight:400;font-size:22px}}
figcaption span{{font-size:14px;color:var(--ink-mute)}}</style></head><body>
<h1>Illustrations — <em style="font-family:var(--serif-c);color:var(--mauve)">4 pistes</em></h1><div class="grid">{cards}</div></body></html>''')

import json
if len(sys.argv) > 2:
    snip = {}
    for k, svg in (("A", A), ("B", B), ("C", C), ("D", D)):
        svg = svg.replace('id="wc"', 'id="wc-b"').replace('url(#wc)', 'url(#wc-b)').replace('id="wc2"', 'id="wc-d"').replace('url(#wc2)', 'url(#wc-d)')
        svg = svg.replace("\n", "").replace('<svg viewBox', '<svg aria-hidden="true" focusable="false" viewBox', 1)
        snip[k] = svg
    json.dump(snip, open(sys.argv[2], "w"))
