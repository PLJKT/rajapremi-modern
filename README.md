# RajaPremi — Modern Redesign & Demo

A working modern redesign of **www.rajapremi.com**, the Indonesian insurance aggregator: same products, same partner insurers, same flows — rebuilt with a contemporary interface, honest pricing presentation, and AI features that do actual work.

**Live demo:** https://pljkt.github.io/rajapremi-modern/
**Full technical audit behind this redesign:** [docs/AUDIT.md](docs/AUDIT.md) (40 findings, every one evidenced)

---

## What this is

| | |
|---|---|
| **Kind** | Static front-end demo — no build step, no dependencies, no framework |
| **Size** | 12 pages, 4 stylesheets, 4 scripts, 2 test files |
| **Runs** | Anywhere: `python -m http.server` or GitHub Pages |
| **Data** | Bundled dataset shaped exactly like the real API responses, plus a deep-linkable quote engine |
| **Language** | Bahasa Indonesia (customer-facing), English (docs) |

It is **not** a pixel reskin. Three of the audit's P0 findings are structural, and this demo answers them structurally:

1. **Pages that finish loading with an empty body.** The old SPA shipped ~1.8 MB of JavaScript and then rendered blank on key routes. Here content exists in the HTML; JavaScript only enhances.
2. **The coverage code inversion.** The old UI sent `coverage=1` for "TLO" while the backend mapped `1` to All Risk — so the cheap option was priced as the expensive one, and the expensive option returned nothing at all. This build uses one shared code table and a test that fails if the two sides ever drift again (`tests/quote-engine.test.mjs`, section 2).
3. **Margin leaked into public responses.** The old quote API returned `basic_commision`, `rate_basic`, and `handling_fee` to the browser — readable by any customer. Here the comparison view shows only what a customer pays, and the internal console is where margin lives. A test asserts no margin field can reach customer-visible markup.

---

## Feature parity — nothing was dropped

Every product, every partner, and every flow from the existing site is present. Full matrix: [docs/FEATURE-PARITY.md](docs/FEATURE-PARITY.md).

**Products (8/8):** Motor · Mobil · Kesehatan · Properti · Kecelakaan Diri · Travel · Umrah & Haji · Jiwa
**Partner insurers (7/7):** ACA · Simas Insurtech · Jasa Tania · Multi Artha Guna · Zurich · Jasindo Syariah · Reliance
**Flows (all kept):** quote → compare → buy · claims reporting · partner recruitment · FAQ · help centre · login · registration · about · newsletter · testimonials · promo campaigns · back-office console

**Added:** multi-step quote form with vehicle presets · savings-vs-dearest on every offer · side-by-side comparison of up to 3 policies · per-quote "why this price" explainer · a *working* filter/sort toolbar · shareable quote URLs · dark mode · AI assistant, needs analysis, document reading, claim triage, operator copilot.

---

## Run it locally

```bash
git clone https://github.com/PLJKT/rajapremi-modern.git
cd rajapremi-modern
python -m http.server 8000
# open http://localhost:8000
```

Some behaviours (voice input) require `http://localhost` or HTTPS rather than `file://` — open it through the server, not by double-clicking the HTML.

**Tests** (no dependencies — plain Node):

```bash
node tests/quote-engine.test.mjs   # pricing, coverage mapping, margin-leak prevention, tray, modals, catalogue
node tests/pages.test.mjs          # every page: shell, metadata, links, CSS classes, tag balance, no-JS content
node tests/responsive.test.mjs     # viewport, table scroll containers, fluid type, shrinkable grid items
node tools/check-tags.mjs faq.html # focused tag-balance check with the offending element named
```

**Responsive check** (drives a real browser — the proof that no page scrolls sideways):

```bash
node tools/responsive-check.mjs                    # against http://127.0.0.1:8899/
node tools/responsive-check.mjs https://pljkt.github.io/rajapremi-modern/
node tools/responsive-check.mjs --launch           # start its own headless Chrome
```

It emulates every width from 320 to 1920, loads every page, and fails (exit 1) naming the exact element that
sticks out past the viewport, plus any broken image or JavaScript error it saw on the way. Zero dependencies —
Node 22's built-in `WebSocket` speaks DevTools Protocol directly.

`tests/quote-engine.test.mjs` runs the real `data.js` and `quote.js` inside a `node:vm` sandbox, so it exercises
the shipping code rather than a copy. `tests/pages.test.mjs` is the gate that would have caught the failures found
on the live site: it fails any page that renders too little text without JavaScript, links to a file that does not
exist, uses a CSS class no stylesheet defines, or leaves a tag unclosed. `tests/responsive.test.mjs` guards the
layout rules that keep the text tidy at any width — the browser-level proof of those rules is
`tools/responsive-check.mjs`.

---

## Deep links

Quote state lives in the URL, so a quote can be bookmarked, shared, or sent to a colleague:

```
bandingkan.html?product=motor&harga=25000000&plat=13&tahun=2021&coverage=1
```

| Param | Meaning | Values |
|---|---|---|
| `product` | Vehicle class | `motor`, `mobil` |
| `harga` | Vehicle value in rupiah | integer |
| `plat` | Plate-region code | see `PLATE_REGIONS` in `assets/js/data.js` |
| `tahun` | Year of manufacture | 2004–2026 |
| `coverage` | Protection type | `1` = TLO, `2` = All Risk |

Opening a link that already carries `harga` or `coverage` renders its comparison immediately.

The assistant is deep-linkable too, so a campaign or a support reply can point straight at a question:

```
index.html?ai=Bedanya TLO dan All Risk apa?     # opens RajaAI with that question
klaim.html#tanya                                 # opens RajaAI with a generic greeting
```

---

## Project structure

```
.
├── index.html              Home — hero, quick quote, products, trust, promos, AI, FAQ
├── bandingkan.html         The aggregator core: form + ranked offers + compare tray
├── produk.html             Product detail, driven by ?id=motor|mobil|kesehatan|…
├── klaim.html              Claims centre — 5 stages, document checklist, reporting
├── partner.html            Agent/partner recruitment and revenue model
├── faq.html                Searchable FAQ with category filters
├── bantuan.html            Help centre + contact (#hubungi)
├── tentang.html            About, licence, how the broker earns, reviews (#ulasan)
├── masuk.html / daftar.html   Login / registration (demo-safe: nothing is transmitted)
├── ai.html                 The AI feature tour with live demos
├── admin/index.html        Internal console: KPIs, partners, claims, copilot, security log
├── assets/css/             tokens → base → components → product (4 layers)
├── assets/js/              data.js (content + engine input), app.js (shell), quote.js, ai.js
├── tests/                  Dependency-free Node test suite
└── docs/                   AUDIT.md, FEATURE-PARITY.md, ARCHITECTURE.md, AI.md, ROADMAP.md
```

---

## The AI features

Six, described in full in [docs/AI.md](docs/AI.md):

| Feature | Status in this demo |
|---|---|
| RajaAI assistant (policy Q&A, escalation to humans) | **Working** — local deterministic intent engine |
| Needs analysis (3 questions → ranked recommendation) | **Working** |
| Premium explainer ("why this price?") | **Working** — computed from the same numbers shown |
| Voice input (Bahasa Indonesia) | **Working** — real Web Speech API |
| STNK/document extraction → filled form | **Simulated UI**, real flow, sample output |
| Claim photo triage | **Simulated UI**, real flow, sample output |
| Back-office copilot (natural language → table) | Demo dataset, deterministic answers |

Everything the assistant says is grounded in the same content the site publishes — no invented policy terms. `RP.AI.answer()` is the single seam where a production LLM + retrieval call would be dropped in.

---

## Switching to live data

The quote engine reads from one function. To run against a real endpoint, replace the body of `generateQuotes()` in `assets/js/data.js` with a server call — and keep the key on the **server**, never in the browser (this was finding P0-3 in the audit).

```js
// production shape: browser → your backend → partner APIs
const res = await fetch('/api/quote', { method: 'POST', body: JSON.stringify(input) });
return (await res.json()).offers;   // same array shape as today's mock
```

---

## Deployment

GitHub Pages serves the repository root directly — no Action, no build:

**Settings → Pages → Source: Deploy from a branch → `main` / `(root)`.**

`.nojekyll` is included so no path is rewritten.

---

## Honest limitations

- **The dataset is representative, not live.** Insurer factors, claim SLAs and ratings are modelled on the audited production responses; they are not fetched from partners.
- **Simulated AI.** Document extraction and claim triage show the real interface and a real flow with sample output — the vision models are not wired up.
- **No auth.** Login and registration validate shape and show what would happen; nothing is sent anywhere.
- **Product detail pages are client-rendered** from `?id=`, which is fine for a demo but should be statically generated (or SSR'd) in production for SEO and first paint.
- **The internal console is public in this repository** (it contains no real customer data). Put it behind your VPN/SSO before any real use.

---

## Recommended path to production

See [docs/ROADMAP.md](docs/ROADMAP.md). Short version: fix the three P0 defects on the existing stack first (they are cheap and they are costing money today), then move the storefront to server-rendered pages, then adopt these surfaces screen by screen.

---

## Status and rights

Prepared for the owner of RajaPremi as a working demo. All rights reserved — no open-source licence is granted by
this repository. Product names, partner insurer names and regulatory references appear only to demonstrate the
redesign of the existing public site.
