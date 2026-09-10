# RajaPremi.com — Full-Stack Audit & AI/UX Modernization Blueprint

**Prepared for:** Master (Owner, RajaPremi — insurance aggregator, Indonesia)
**Date of audit:** 10 September 2026
**Scope:** `https://www.rajapremi.com` (public site), `https://api.rajapremi.co` (quote/config API), `https://service.rajapremi.co` (internal back office)
**Method:** Passive + active reconnaissance of the site you own — static analysis of the shipped JS/CSS bundles, HTTP header/caching inspection, real-browser rendering of every route, and direct, non-destructive calls to your own quote API with test payloads.
**Status of the platform as measured:** a Vue 2 single-page app (SPA) from the 2016–2018 era, running unchanged, on top of a Laravel/PHP 8.1 quote API, fronted by Cloudflare, with an AdminLTE/Vue 2 back office on a separate sub-domain.

> Everything below is evidence-based. Every claim marked **[verified]** was reproduced live against your own infrastructure; the exact command or observation is listed in Appendix A so your team can re-run it.

---

## 0. Executive summary

### 0.1 What the audit found in one paragraph

The platform still *works* — the quote engine returns real prices from 7 insurers in under a second, and the database, product list, and pricing rules are all alive. But the **front end has decayed into a shell**: the two pages that carry the actual business value (`/compare` and `/product`) render only navigation and a footer, the FAQ page renders nothing at all, invalid URLs spin forever on "Please wait…", and every one of the site's 97 JavaScript bundles is downloaded by every visitor on every page. Meanwhile the **quote API is effectively public**: it answers anonymous requests that carry any string as an API key, and it returns your **commission percentage, admin fee, handling fee and base rate for every insurer** in the JSON it hands to the browser. On the front end there is a **coverage-type mismatch between the drop-down and the backend** that makes "All Risk" un-quotable and silently maps "TLO" to the wrong product code. The stack is a set of end-of-life dependencies (Vue 2.6.14, CKEditor 4.18, axios 0.26.1, Font Awesome 4.7 loaded from a third-party CDN, two unpinned `@latest` CDN libraries in the admin console) that will break without warning, and there is no SEO, no analytics funnel, no error monitoring, and no automated tests.

### 0.2 Health scorecard

| Area | Score | One-line verdict |
|---|---|---|
| Quote engine / core business logic | **7 / 10** | Alive, fast, 7 insurers, but leaks margin data and has a coverage-code bug |
| Front-end UX | **3 / 10** | Key pages render empty; no mobile-first flow; no account continuity |
| Front-end performance | **3 / 10** | ~1.80 MB uncompressed / 400 KB brotli on the critical path; 97 prefetch chunks |
| SEO & discoverability | **1 / 10** | SPA shell for all routes, one identical title, `sitemap.xml` serves HTML |
| Security & API hygiene | **3 / 10** | Anonymous API, key value never validated, no security headers, version disclosure |
| Back office (internal management) | **4 / 10** | Functional but on EOL Vue 2 + unpinned CDN dependencies; no audit trail |
| AI readiness | **2 / 10** | No user accounts, no event data, no document pipeline — but rich structured quote data |
| Engineering process | **2 / 10** | No tests, no CI/CD, no staging, no monitoring, no error tracking |

### 0.3 The twelve things to do first (in order)

| # | Action | Why it matters commercially | Effort |
|---|---|---|---|
| 1 | **Fix the TLO / All-Risk code swap** between the drop-down and the API enum | Right now "All Risk" returns *no quotes at all* and "TLO" is quoted under the All-Risk code. You are losing every all-risk customer and mis-pricing every TLO customer. | 2 hours |
| 2 | **Stop returning `basic_commision`, `additional_commision`, `admin_fee`, `handling_fee`, `rate_basic`, `tax_rate` to the browser** | Any competitor with `curl` can compute your exact margin per policy and undercut you by 1 rupiah. | 1 day |
| 3 | **Validate API keys server-side + rate-limit the quote endpoint** | Today `X-API-KEY: anything` is accepted. Your pricing engine is free to scrape. | 2–3 days |
| 4 | **Make `/compare`, `/product`, `/faq` render real content** | These are the pages that convert. Three of your five main routes are effectively blank. | 3–5 days |
| 5 | **Serve real 404s** (stop returning HTTP 200 + "Please wait…" for unknown routes) | Google currently indexes infinite spinner pages; users think the site is broken. | 1 day |
| 6 | **Add security headers + fix CORS (`*` with credentials)** | Cheap, removes a whole class of browser-based attacks and audit findings. | 1 day |
| 7 | **Server-side render / pre-render the SPA** (SEO) | An insurance aggregator's traffic is search traffic. You are invisible to it today. | 1–2 weeks |
| 8 | **Kill the 97 `rel="prefetch"` links + split the 1.4 MB vendor bundle** | Direct conversion-rate and Core Web Vitals win. | 3–4 days |
| 9 | **Ship the AI quote assistant** (conversational form-filling + needs analysis) | Converts the 80% who abandon a 6-field form; the single highest-ROI AI feature for an aggregator. | 3–4 weeks |
| 10 | **Rebuild the back office** (Filament 3 on the existing Laravel app) | Removes the unpinned-CDN time bomb and gives your team rate/product management, audit trails, refunds, SLA tracking. | 4–6 weeks |
| 11 | **Institute CI/CD, staging, error monitoring, backups with restore drills** | You currently have no safety net for any of the above changes. | 1–2 weeks |
| 12 | **Instrument the funnel** (events, conversion per insurer, commission per policy, renewal rate) | You cannot manage what you cannot see; every AI feature afterwards depends on this data. | 2–3 weeks |

### 0.4 Commercial impact estimate (first year, conservative)

| Lever | Mechanism | Indicative annual impact* |
|---|---|---|
| Fix `/compare`, `/product`, `/faq` + real 404s | Restores the pages that carry conversion | +15–30% quote submissions |
| SEO / pre-render | Aggregator traffic is search traffic; currently ~0 organic pages | +20–50% qualified sessions in 6–12 months |
| Performance (400 KB → ~120 KB, faster TTFB) | Each 100 ms of latency ≈ 1–2% conversion on mobile | +3–7% conversion |
| AI quote assistant | Recovers abandoned forms; needs-based selling upsells | +10–25% completion rate |
| AI renewal / retention agent | Aggregators lose most renewals by default | +5–15% renewal revenue |
| Fixing the API leak | Prevents competitor margin harvesting | Defensive — protects all of the above |

\* Ranges are benchmark-typical for Indonesian digital insurance distribution, not measured on your traffic (this audit had no analytics access). Treat them as a prioritisation aid, not a forecast.

---

## 1. Method & evidence base

### 1.1 What was inspected

| Layer | Artefact | How obtained |
|---|---|---|
| HTML shell | `https://www.rajapremi.com/` | `curl` (9,523 B uncompressed) |
| Main app bundle | `/js/app.f1331263.js` | downloaded, grepped and sliced (153,349 B) |
| Vendor bundle | `/js/chunk-vendors.58f3419a.js` | downloaded (1,448,396 B) |
| Stylesheet | `/css/app.346bdbb4.css` | downloaded (279,244 B) |
| Route chunks | 97 × `/js/chunk-*.js` | enumerable from the HTML `<head>` prefetch list |
| Quote API | `https://api.rajapremi.co` | live POSTs with test payloads |
| Back office | `https://service.rajapremi.co/login` | fetched, dependency inventory extracted |
| Rendered UX | every route | headless + desktop browser rendering, live text extraction |
| Headers / caching | `www`, `api` | `curl -D` |

### 1.2 How the quote API was exercised (non-destructive, read-only)

A `generate-key` call was made with a throw-away random identifier; the API issued a token. A read-only quote request for a motorcycle was then replayed. **No write, purchase, or account-creating operation was performed**, and no real customer data was accessed. The one security-sensitive value observed (an API key/token) is **not reproduced anywhere in this document** — it is recorded as `[REDACTED]`.

Verified working request (your own API — useful for your team and for the demo harness):

```bash
curl -X POST https://api.rajapremi.co/motor/get_data \
  -H 'X-API-KEY: <any string>' \
  --data 'insurance_type=2&suminsured=25000000&plate=13&area_id=2&state_id=51578\
&year=2021&coverage=1&limit_person=0&limit_tpl=0&sort=a-z'
# → HTTP 200, {"data":{"total":7,"listdata":[ ... 33 fields per insurer ... ]}}
```

---

## 2. Verified current-state architecture

```
                       ┌──────────────────────────────┐
   Browser ──── HTTPS ─┤ Cloudflare (Server: cloudflare)│
                       │  cf-cache-status: DYNAMIC     │  ← HTML never cached
                       └───────┬──────────────┬────────┘
                               │              │
              www.rajapremi.com│              │api.rajapremi.co
                               ▼              ▼
                    ┌────────────────┐   ┌─────────────────────────┐
                    │ Static SPA     │   │ Laravel / PHP 8.1.4      │
                    │ Vue 2.6.14     │──▶│ X-Powered-By: PHP/8.1.4  │
                    │ vue-cli/webpack│   │ PHPSESSID (HttpOnly)     │
                    │ 1.80 MB bundles│   │ CORS: * + credentials    │
                    └────────────────┘   │ /motor/get_data → 7 insurers
                                         └─────────────────────────┘
                    ┌────────────────────────────────────────────┐
                    │ service.rajapremi.co  — internal back office│
                    │ AdminLTE + Vue 2.6.14 + bootstrap-vue@latest│
                    │ ckeditor 4.18.0 + axios 0.26.1 + moment 2.29│
                    └────────────────────────────────────────────┘
```

### 2.1 Front end **[verified]**

| Item | Value |
|---|---|
| Framework | Vue 2.6.14 (Vue 2 reached **end of life 31 Dec 2023**) |
| Build tool | `vue-cli-service` / webpack 4 (evidenced by `chunk-vendors`, `chunk-<hash>.<hash>.js`, `.map`-era asset naming) |
| Routing | Client-side history routing; **one** `<title>` for every route: `RajaPremi - Your Way, We Protect` |
| CSS | Bootstrap-5-era breakpoints (576/768/1200/1400) inside a 279 KB hand-patched `app.css`, plus a **custom icon font** (`raja premi icons`) and `Font Awesome 4.7.0` |
| Fonts | `@import` inside CSS → Google Fonts Poppins (300/400/500/600) **and** `stackpath.bootstrapcdn.com/font-awesome/4.7.0` — nested, render-blocking, third-party |
| Lazy loading | 97 route chunks, **all of them emitted as `<link rel="prefetch">` in the `<head>`** |
| Icons/favicon | 17 legacy icon link tags (android-icon, apple-icon ×10, apple-touch, favicon-16/32/96, safari-pinned-tab) |
| Legacy head cruft | `X-UA-Compatible: IE=edge`, `<!--[if IE]>` conditional comment, MS tile meta |

### 2.2 Delivery & caching **[verified]**

| Asset | Uncompressed | As delivered (Brotli) | Cache-Control |
|---|---|---|---|
| HTML shell | 9,523 B | 2,121 B | **none** (`cf-cache-status: DYNAMIC`) |
| `js/app.f1331263.js` | 153,349 B | 22,642 B | `max-age=14400` |
| `js/chunk-vendors.58f3419a.js` | 1,448,396 B | 345,250 B | `max-age=14400` |
| `css/app.346bdbb4.css` | 279,244 B | 39,190 B | `max-age=14400` |
| **Critical path total** | **1,890,512 B (≈1.80 MB)** | **409,203 B (≈400 KB)** | — |

* Time-to-first-byte for the HTML, three consecutive runs: **0.30 s / 1.68 s / 3.43 s [verified]** — a 11× spread on an uncached edge object. The HTML is the one thing Cloudflare is *not* caching, and it is the one thing every visitor must wait for.
* Content hashes are in filenames (`app.f1331263.js`) but the TTL is only 4 hours — hashed assets should be `max-age=31536000, immutable`.

### 2.3 Quote API **[verified]**

* Runtime: **PHP 8.1.4** with `X-Powered-By` disclosed.
* CORS: `Access-Control-Allow-Origin: *` **together with** `Access-Control-Allow-Credentials: true`; allowed headers echo the whole `authorization,x-api-key,content-type` list; methods `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
* Session: `Set-Cookie: PHPSESSID=…; path=/; HttpOnly` — **no `Secure`, no `SameSite`**.
* Cache: `no-store, no-cache, must-revalidate` on API responses (correct).
* **Authentication behaviour:** a request with **no** `X-API-KEY` is rejected with the message *"Cannot found token Authorization, please run get-token first to initiate token access."* A request with `X-API-KEY: bogus-A` returns **HTTP 200 and the full 7-insurer quote list**. The header's **presence** is checked; its **value** is not **[verified]**.
* `generate-key` issues a bearer token for an arbitrary client-supplied `user_id` with no prior authentication **[verified]** (`[REDACTED]`).

### 2.4 Product & pricing model discovered **[verified]**

A single motorcycle quote (`insurance_type=2`, sum insured IDR 25,000,000, year 2021, area 2, state 51578, plate code 13) returns **7 insurers**, each with **33 fields**, including:

| Field group | Fields | Note |
|---|---|---|
| Identity | `product_id`, `provider_id`, `provider_name`, `product_name`, `logo`, `insurance_type_id` | `logo` is a direct path into your API host: `https://api.rajapremi.co/assets/images/product/aca-mv.jpg` |
| **Internal economics** | `basic_commision`, `additional_commision`, `tax_rate`, `handling_fee`, `discount_rate`, `rate_basic`, `loading_rate_percent`, `loading_rate_amount` | **This is the leak.** Commission, fees and the raw rate are shipped to the browser. |
| Price build-up | `gross_premium`, `discount_premium`, `gross_total_temp`, `discounted_total_temp`, `admin_fee` | e.g. gross 450,000 + admin 35,000 + handling 25,000 → customer price 510,000 |
| Routing tokens | `encrypted` = `/car/summary/<token>`, `compare`, `quotation_id` | Same token in 3 fields; **non-deterministic per request** (verified: two identical requests → different tokens), 64 hex chars → not enumerable. Note the **`/car/` prefix is returned even for a motorcycle product.** |
| Other | `coverage_type`, `area`, `year`, `sum_insured`, `workshop`, `additional`, `additional_premi`, `promo_code` | `promo_code` is an empty string — an unused feature. |

Measured market spread for one identical risk **[verified]**:

| Insurer | Base rate | Gross premium | Admin fee | Customer price | Commission |
|---|---|---|---|---|---|
| PT. Asuransi Simas Insurtech | 1.80% | 450,000 | 25,000 | **500,000** | 25.00% |
| PT. Asuransi Central Asia | 1.80% | 450,000 | 35,000 | 510,000 | 25.00% |
| PT. Asuransi Multi Artha Guna | 1.80% | 450,000 | 38,000 | 513,000 | 25.00% |
| PT. Zurich Asuransi Indonesia | 1.80% | 450,000 | 39,000 | 514,000 | 25.00% |
| PT. Asuransi Jasindo Syariah | 1.80% | 450,000 | 43,000 | 518,000 | 25.00% |
| PT. Asuransi Jasa Tania Tbk | 1.80% | 450,000 | 50,000 | 525,000 | 25.00% |
| PT. Asuransi Reliance Indonesia | 3.50% | 875,000 | 50,000 | **950,000** | 15.00% |

Two things stand out commercially: the cheapest and most expensive quotes differ by **90%** on identical cover, and **the only difference between five of the seven insurers is the admin fee** — a strong signal that the comparison UX (savings badge, "why is this different" explainer) is the main value you can add, and that rate/product data management is the lever on margin.

### 2.5 Back office **[verified]**

`service.rajapremi.co/login` loads: AdminLTE (jQuery), **Vue 2.6.14**, `bootstrap-vue@latest`, `vue-select@latest`, `bootstrap-vue-icons.min.js`, `axios@0.26.1`, `moment@2.29.2`, `ckeditor@4.18.0`.

* `bootstrap-vue@latest` and `vue-select@latest` are **unpinned CDN references**. The current `bootstrap-vue@latest` line targets Vue 3 — if that CDN resolves to a Vue-3-only build, your admin console breaks with no code change on your side. This is a live, unscheduled outage waiting to happen.
* CKEditor 4.18.0 reached **end of support (Dec 2023)** with known XSS advisories. It is the rich-text editor inside your back office — i.e. an authenticated XSS surface.
* `axios 0.26.1` predates the SSRF/credential-leak fix line (0.28+/1.x).
* `moment 2.29.2` is in maintenance-only mode.

### 2.6 Live rendering of every route **[verified]**

| Route | HTTP | Rendered text (real browser) | Verdict |
|---|---|---|---|
| `/` | 200 | ~1,073 chars: hero "Asuransi Motor" widget, promo strip | Thin but functional |
| `/compare` | 200 | **530 chars — header + newsletter + footer only** | **Core page renders no comparison** |
| `/product` | 200 | **0 chars** (blank), then on re-read **346 chars = footer only** | **Broken / unstable** |
| `/faq` | 200 | **0 chars** | **Broken** |
| `/partner` | 200 | 1,386 chars | Works |
| `/motor` | 200 | **14 chars: "Please wait…"** | **Not a route — spins forever** |
| `/asuransi-kesehatan` | 200 | **14 chars: "Please wait…"** | **Not a route — spins forever** |
| any unknown URL | 200 | "Please wait…" | **Soft-404; no real 404** |

Homepage footer content (verbatim) — a compact list of commercial problems:
```
Klik di sini untuk dapatkan Asuransi gratis!   ← "get free insurance" claim
(021) 5790 494            ← landline looks truncated
(+62) 0852 9000 3471      ← malformed: +62 followed by a leading 0
info@rajapremi.co.id      ← different domain (.co.id) from the site (.com)
Senin - Jumat, 8am - 6pm  ← closed evenings/weekends, when people actually shop
Copyright © 2022 RajaPremi.com. All Rights Reserved   ← 4 years stale
                          ← no physical address / no OJK registration shown
```
The hero widget's protection drop-down is defined in the bundle as `[{text:"TLO",value:1},{text:"All Risk",value:2}]`.

---

## 3. Findings register

Severity: **P0** = losing money or exposing data now · **P1** = significant commercial/technical risk · **P2** = quality/maintainability · **P3** = polish.

### P0 — fix immediately

| ID | Finding | Evidence | Business impact | Fix | Effort |
|---|---|---|---|---|---|
| **F-01** | **Coverage-code inversion between UI and API.** The front end defines `TLO = 1`, `All Risk = 2`; the backend enum defines `ALL_RISK = 1`, `TLO = 2`. | Bundle: `[{text:"TLO",value:1},{text:"All Risk",value:2}]` vs `t[t["ALL_RISK"]=1]="ALL_RISK",t[t["TLO"]=2]="TLO"`. Live API: `coverage=1` → 7 quotes; `coverage=2` → **no product found [verified]** | "All Risk" customers get *no quotes at all*; "TLO" customers are quoted/recorded under the All-Risk code — a mis-selling and reconciliation exposure | Agree on a single enum (put it in one shared constants package), send the **backend** code from the UI, add a contract test asserting `coverage=1` and `coverage=2` both return products | **2 h** |
| **F-02** | **Internal margin data returned to the browser.** `basic_commision`, `additional_commision`, `tax_rate`, `handling_fee`, `discount_rate`, `rate_basic`, `loading_rate_*` accompany every quote. | 33-field quote payload **[verified]** | Any competitor can compute your exact per-policy margin (e.g. 25% of 450,000 = 112,500) and undercut you; also reveals each insurer's net rate | Strip these fields from the public response; return only customer-facing price + cover summary. Move margin maths server-side. | **1 day** |
| **F-03** | **API key value is never validated.** Only the *presence* of `X-API-KEY` is checked. | `X-API-KEY: bogus-A` → HTTP 200 + full quote list; missing header → "Cannot found token Authorization…" **[verified]** | Your pricing engine and product catalogue are freely scrapeable and replayable; no way to attribute or throttle abuse | Validate keys against a `api_keys` table (hashed, per-partner, scoped, revocable); add per-key rate limits, quotas and logging; rotate the current key. | **2–3 d** |
| **F-04** | **Unauthenticated token issuance.** `generate-key` mints a bearer token for any client-supplied `user_id`. | Token returned without prior auth **[verified]**; token accepted on subsequent calls | Combined with F-03, anyone can obtain and use credentials; no identity boundary exists between "visitor" and "customer" | Require a signed session/device challenge; rate-limit; bind tokens to a short TTL; or drop the endpoint and use real user auth. | **2 d** |
| **F-05** | **Core pages render nothing.** `/compare` = chrome only; `/product` = footer only (and blank on one load); `/faq` = blank. | Live browser text extraction (0 / 346 / 530 chars) **[verified]** | These pages are the conversion path. You are paying cloud costs and ad spend to send users to blank pages. | Fix the data bindings/lazy-load failures; add error boundaries so a failed API call shows a message, never a blank page; add smoke tests. | **3–5 d** |
| **F-06** | **No real 404s.** Unknown routes return HTTP 200 with a permanent "Please wait…". | `/motor`, `/asuransi-kesehatan`, random URL → 200 + 14 chars **[verified]** | Search engines index infinite-spinner pages; users believe the site is broken; support cost | Server-rendered 404 with HTTP 404 status; a client-side catch-all route with a helpful "did you mean" page. | **1 d** |
| **F-07** | **No security headers, and a broken CORS policy.** | `www`: only `Server: cloudflare` + `cf-cache-status` — no HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. `api`: `Access-Control-Allow-Origin: *` **with** `Access-Control-Allow-Credentials: true` **[verified]** | Clickjacking, MIME-sniffing, referrer leakage of quote tokens, and a CORS config that is both permissive and invalid (browsers reject `*`+credentials, so legitimate flows may break unpredictably) | Add the header set at Cloudflare/nginx (snippet in §4); change CORS to an explicit allow-list of `https://www.rajapremi.com` (+ staging); drop credentials if not needed | **1 d** |
| **F-08** | **`Set-Cookie: PHPSESSID` without `Secure`/`SameSite`, and `X-Powered-By: PHP/8.1.4` disclosed.** | Response headers **[verified]** | Session theft on any downgrade path; version disclosure invites targeted exploits against a 2022-era PHP | Set `session.cookie_secure=1`, `session.cookie_samesite=Lax`, `expose_php=Off` | **2 h** |

### P1 — significant risk

| ID | Finding | Evidence | Impact | Fix | Effort |
|---|---|---|---|---|---|
| F-09 | **SEO is effectively zero.** One `<title>` for all routes, no meta description, no canonical, no hreflang, no OpenGraph, no JSON-LD; `sitemap.xml` serves HTML. | `<head>` inspection: absent tags; `/sitemap.xml` returns SPA HTML **[verified]** | An aggregator lives on search traffic; you have none. Zero rich results, zero social previews | Pre-render/SSR (Nuxt 3 or prerender job), per-route meta, `InsuranceProduct`/`FAQPage`/`Organization` schema, real sitemap.xml + robots.txt, canonical URLs | **1–2 wk** |
| F-10 | **97 route chunks prefetched for everyone.** | 97 × `<link rel="prefetch">` in `<head>` **[verified]** | Every visitor downloads the entire app: defeats code-splitting, wastes mobile data (a real cost for Indonesian users on metered plans) | Remove the prefetch plugin (or restrict to the 3 next-likely routes), prefetch-on-hover instead | **3–4 d** |
| F-11 | **1.45 MB vendor bundle, uncached HTML (TTFB 0.3 s → 3.4 s).** | Sizes and timings **[verified]** | Mobile conversion loss; poor Core Web Vitals; wasted bandwidth cost | Route-based chunking, replace Bootstrap 5 CSS with utilities actually used, tree-shake moment → `date-fns`/`dayjs`, `max-age=31536000, immutable` on hashed assets, Cloudflare Cache Rule for HTML with `s-maxage` | **1–2 wk** |
| F-12 | **Render-blocking nested `@import`s to two third-party CDNs.** | `app.css` contains `@import url(fonts.googleapis.com…Poppins…)` and `@import url(stackpath.bootstrapcdn.com/font-awesome/4.7.0…)` **[verified]** | Serial CSS waterfall before first paint; a CDN outage (StackPath especially) breaks all icons; third-party requests hurt CWV | Self-host Poppins as `preload`ed `woff2` with `font-display:swap`; replace FA 4.7 with a tree-shaken inline SVG icon set (Lucide/Heroicons); remove the legacy `raja premi icons` font | **2–3 d** |
| F-13 | **End-of-life framework chain.** Vue 2.6.14 (EOL), CKEditor 4.18 (EOL, XSS advisories), axios 0.26.1, moment 2.29.2, FA 4.7. | Back-office dependency inventory **[verified]** | Unpatched vulnerabilities; no security updates ever again; hiring difficulty | Follow the migration path in §5.2. Short term: replace CKEditor with a maintained editor (TipTap), upgrade axios, alias moment | **3–5 d** short / **§5.2** long |
| F-14 | **Unpinned `@latest` CDN libraries in the back office.** | `bootstrap-vue@latest`, `vue-select@latest` **[verified]** | The admin console can break on any CDN release — a business-continuity risk with no code change on your side | Pin exact versions, vendor the files into your build, add SRI | **half a day** |
| F-15 | **Stale, inconsistent, and non-compliant contact/footer content** — `Copyright © 2022`, malformed `+62 0852 …`, `info@rajapremi.co.id` on a `.com` site, "free insurance" claim, no address, weekday-only hours. | Footer text **[verified]** | Trust and legal exposure (Indonesian insurance distribution rules require clear intermediary identification); the 2022 copyright alone reads as "abandoned site" | Drive footer from one CMS record; add legal entity, licence/registration number, address, WhatsApp, and extended hours; remove or qualify the "gratis" claim | **1 d** |
| F-16 | **Reference data is frozen in 2016.** The motorcycle set-up payload contains a plate/area/state list whose source rows are dated **2016-10-20**. | `/motor/index` config payload **[verified]** | New plate series, new areas and new vehicle years are missing → users cannot find their vehicle or get a price | Build a reference-data admin (import + version + effective date) and a refresh job; add a "my vehicle isn't listed" fallback that captures the lead anyway | **1 wk** |
| F-17 | **Quote tokens travel in URLs.** `encrypted` = `/car/summary/<token>` and `compare`/`quotation_id` carry the same value; the path says `/car/` even for motorcycles. | 33-field payload **[verified]** | Tokens leak via referrers, logs, analytics and shared links; wrong route segment indicates the flow was never generalised beyond cars | Move to POST + server-side session storage of the quote; correct the route naming; keep tokens short-lived | **3 d** |
| F-18 | **No user accounts / no continuity from quote to policy.** `generate-key` fabricates an identity from a device id; the public site has no login surface. | Auth flow analysis in `app.js`; `/login`, `/register` routes exist but the site has no account journey **[verified]** | No renewal, no cross-sell, no claims self-service, and **no data to power any AI personalisation** | Introduce real accounts (phone/OTP is the Indonesian norm), or at minimum a verified phone number captured at quote time | **2–3 wk** |
| F-19 | **No error monitoring, no APM, no tests, no CI/CD, no staging.** | Absence of any error-reporting call in the bundles; nothing in the repo/deploy surface observed | Every change is a gamble; incidents are discovered by customers | Sentry/OpenTelemetry, GitHub Actions, staging environment, Playwright smoke tests | **1–2 wk** |

### P2 / P3 — quality, maintainability, polish

| ID | Finding | Impact | Fix |
|---|---|---|---|
| F-20 | Custom `raja premi icons` legacy font alongside Font Awesome 4.7 — two icon systems, no text alternatives | Accessibility, bundle size | Consolidate on inline SVG components with `aria-label` |
| F-21 | 17 legacy favicon/apple-icon link tags, `X-UA-Compatible`, IE conditional comment | Cruft, pagespeed | Keep 4 icons + `manifest.webmanifest` |
| F-22 | No error boundaries — a failed API call renders a blank page rather than a message | Users see "broken site" instead of "try again" | Add per-route error/empty/skeleton states |
| F-23 | Anonymous pricing/quote logic in a client bundle (`CompareAction`, `MOTORCYCLE_INSURANCE`, coverage/area/plate constants) | Business logic visible and copyable | Move pricing/validation server-side; the client should only render |
| F-24 | `promo_code` field exists and is always empty; `discount_rate` always 0 | Unfinished feature; no promotional lever | Ship a real promo-code engine (it is also a great AI/CRM hook) |
| F-25 | No structured data for insurers/products; insurer logos hot-linked from the API host | No rich results; API host serves static assets (path exposure) | CDN-served assets, JSON-LD catalogue |
| F-26 | No consent/banner or privacy surface observed for analytics; mobile number capture flows through a third party | Indonesian PDP law (UU 27/2022) exposure | Consent capture, data map, retention policy, DPA with vendors |
| F-27 | No visible "needs analysis" — the form asks for sum insured, not for the customer's situation | Users cannot judge what they need; high abandonment | Guided needs-based flow (see §6 A/D) |
| F-28 | No renewal reminder journey (renewals are an aggregator's cheapest revenue) | Silent churn | Automated renewal engine (§7.4) |
| F-29 | No claims intake path on the public site | Post-sale service gap | Claims wizard + OCR intake (§6 B) |
| F-30 | No accessibility programme (skip links, focus management, contrast, keyboard nav in the mega-menu) | WCAG gaps; lost conversions | Audit to WCAG 2.2 AA in §5.6 |

---

## 4. Quick wins — the first two weeks

These are deliberately small, independent, and shippable without touching the architecture.

**1. Header hardening (Cloudflare Transform Rule / nginx).**
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https://api.rajapremi.co; \
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; \
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; connect-src 'self' https://api.rajapremi.co; \
  frame-ancestors 'self'; base-uri 'self'" always;
```
Roll out in report-only first (`Content-Security-Policy-Report-Only`), then enforce. Verify with `curl -D- -o /dev/null https://www.rajapremi.com/`.

**2. CORS correction (Laravel).**
```php
// config/cors.php
'allowed_origins' => ['https://www.rajapremi.com', 'https://staging.rajapremi.com'],
'allowed_origins_patterns' => [],
'allowed_methods' => ['GET','POST','OPTIONS'],
'allowed_headers' => ['content-type','x-api-key','authorization'],
'supports_credentials' => false,   // never combine with a wildcard origin
'max_age' => 3600,
```

**3. Stop the leak — response shaping.**
```php
// app/Http/Resources/QuoteResource.php
public function toArray($request): array {
    return [
        'product_id'    => $this->product_id,
        'provider_name' => $this->provider_name,
        'product_name'  => $this->product_name,
        'logo'          => $this->logo,
        'sum_insured'   => (int) $this->sum_insured,
        'premium'       => (float) $this->gross_total_temp,   // customer-facing price ONLY
        'coverage_type' => $this->coverage_type,
        'quotation_id'  => $this->quotation_id,
        // basic_commision, additional_commision, tax_rate, admin_fee, handling_fee,
        // rate_basic, discount_rate, loading_rate_* → NEVER serialised to the client
    ];
}
```
Add a regression test that asserts the raw response body contains **none** of those keys.

**4. Rate limiting + key validation.**
```php
RateLimiter::for('quote', fn ($r) => [
    Limit::perMinute(30)->by($r->header('X-API-KEY') ?: $r->ip()),
    Limit::perDay(2000)->by($r->header('X-API-KEY') ?: $r->ip()),
]);

// App\Http\Middleware\ValidateApiKey
$key = hash('sha256', (string) $request->header('X-API-KEY'));
$row = ApiKey::where('hash', $key)->where('active', true)
    ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at','>',now()))->first();
abort_unless($row, 401, 'Invalid API key');
$row->increment('usage_count');
$request->attributes->set('api_partner', $row->partner);
```

**5. Real 404s + empty-state components.**
```js
// router
{ path: '*', name: 'not-found', component: NotFound }   // renders <ErrorState code="404">
```
Server: map unknown paths to the SPA with `HTTP 404` rather than 200; add `noindex` on error pages.

**6. Fix the coverage map (F-01).** One shared constants module, one source of truth:
```js
// shared/insurance-enums.js  (imported by BOTH front end and back end)
export const COVERAGE = Object.freeze({ ALL_RISK: 1, TLO: 2 });
export const COVERAGE_OPTIONS = [
  { text: 'Total Loss Only (TLO)', value: COVERAGE.TLO },
  { text: 'All Risk (Comprehensive)', value: COVERAGE.ALL_RISK },
];
```
Contract test: for a fixed payload, assert `coverage ∈ {1,2}` each returns `total > 0`.

**7. Caching rules.** Hashed assets → `Cache-Control: public, max-age=31536000, immutable`. HTML → Cloudflare Cache Rule with `s-maxage=300, stale-while-revalidate=86400` (or purge-on-deploy), because today it is uncached and 0.3–3.4 s of TTFB is between your user and the first pixel.

**8. Remove the prefetch flood.** In `vue.config.js`:
```js
chainWebpack: c => { c.plugins.delete('prefetch'); }
```
Then add hover-based prefetch for the next likely route only.

---

## 5. Front-end UI/UX modernization blueprint

### 5.1 Target state

| Dimension | Today | Target (12 months) |
|---|---|---|
| Rendering | Client-only SPA, blank until JS executes | Nuxt 3 SSR + hydration; content visible in the first HTML byte |
| JS on critical path | ~1.80 MB (400 KB brotli) | < 200 KB brotli total, < 90 KB for the quote flow |
| LCP / INP / CLS (mobile, p75) | not measured, likely poor (uncached HTML, nested imports) | LCP < 2.0 s, INP < 200 ms, CLS < 0.05 |
| Design system | one 279 KB patched CSS, two icon fonts | token-driven design system, tree-shaken components, dark-mode-ready |
| Routes | 5 real routes, 97 chunks | ~40 SEO landing routes, route-level splitting |
| Trust | no address, stale copyright, unclear claims | licence/registration, real address, insurer logos, T&C links, review source |
| Accessibility | unassessed | WCAG 2.2 AA, keyboard-complete, tested |
| Analytics | GTM page-views only | full funnel event model + server-side conversion truth |

### 5.2 Migration strategy (recommended: incremental, not a rewrite)

A big-bang rewrite of a 10-year-old revenue system is the classic way to lose a quarter. Recommended path:

1. **Stabilise (weeks 1–2):** stop the bleeding — quick wins in §4, no framework change.
2. **Extract the quote wizard first (weeks 3–8):** rebuild *only* the quote flow (vehicle input → compare → quote detail → checkout) as Vue 3 + Vite components in a **micro-frontend** mounted into the existing Vue 2 app (or as a separate `/quote-v3` route during development). This is where the money is, so modernise it first and leave the rest of the old app reachable.
3. **Add the SSR shell (weeks 6–12):** put Nuxt 3 in front as a rendering layer for marketing/product/SEO routes (content that must be indexable), proxying the legacy SPA for the few remaining app routes. Cache the pre-rendered output at the edge.
4. **Retire the old app (weeks 12–30):** move product pages, static content, account, and claims across one route at a time. Delete `chunk-vendors` when the last legacy route dies.

Design-system foundation (works in both worlds while you migrate):
```css
:root{
  --rp-brand-700:#0B3C6B; --rp-brand-500:#15629F; --rp-brand-100:#E7F0F8;
  --rp-accent-600:#E8590C;              /* CTA / savings badges */
  --rp-ink-900:#101828; --rp-ink-600:#475467; --rp-line:#EAECF0; --rp-bg:#FFFFFF;
  --rp-ok-600:#067647; --rp-warn-600:#B54708; --rp-danger-600:#B42318;
  --rp-r-1:6px; --rp-r-2:10px; --rp-r-3:16px;
  --rp-space:4px; --rp-shadow-1:0 1px 2px rgba(16,24,40,.06);
  --rp-font:'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif;
}
```
Rules: 4-pt spacing scale, one accent colour for the primary action per screen, 16 px minimum body size (users are on mid-range Android), tap targets ≥ 44 px, and **never** a blank screen — every async state gets a skeleton, an empty state, or an error state.

### 5.3 Page-by-page UX plan

**Home (`/`) — conversion surface**
* *Above the fold:* one-sentence value proposition in Bahasa Indonesia, the quote widget, and a trust strip (7 insurers, official partner logos, average saving vs. direct).
* *Needs-based entry:* three big tiles — "Kendaraan", "Kesehatan", "Properti" — with sub-copies that describe the customer situation, not the product ("Saya punya motor yang dipakai harian").
* *Social proof with substance:* replace the bare "4.6" rating with a source, count and a couple of real quotes; link to testimonials with names and cities.
* *Friction removal:* show the whole quote flow as "3 langkah, 2 menit" and never ask for the phone number before the price.
* *Mobile:* sticky bottom CTA ("Bandingkan sekarang"), numeric keyboards for all numeric fields, no horizontal scroll at 360 px.

**Quote wizard (new `/bandingkan`) — the money path**
```
Step 1  Kendaraan        → plate area, plate code, year, vehicle type   (autocomplete from reference data)
Step 2  Perlindungan     → TLO vs All Risk, with a plain-language difference table and an AI "bantu pilih" link
Step 3  Bandingkan       → cards sorted by price, "Hemat Rp 45.000" badge on the cheapest, "Kenapa beda?" per card
Step 4  Data pemegang    → name, phone (OTP), email; consent checkboxes
Step 5  Bayar            → methods, then confirmation + PDF + WhatsApp copy
```
Progress is a persistent 5-step rail; every step saves to `localStorage` **and** the server so a dropped session can be resumed by SMS/WhatsApp link. Abandonment events fire at each step.

**Comparison (`/compare`) — rebuild, do not patch**
* Default sort: price, with explicit toggles for "Termurah", "Manfaat terbanyak", "Rekomendasi kami".
* Show **effective cover**, not just price: sum insured, own-damage/total-loss, third-party limit, flood/earthquake, towing, workshop network.
* One-line differentiators per insurer (network size, claim SLA, digital claim).
* "Kenapa lebih murah?" expander explaining rate vs admin fee — this is where your aggregator value is *visible*, and it is exactly what AI can narrate (§6 E).
* Add a "saving vs. most expensive" banner (we measured a 90% spread — that is your marketing headline).

**Product / category pages** (`/asuransi-motor`, `/asuransi-mobil`, `/asuransi-kesehatan`, `/asuransi-properti`, `/asuransi-kecelakaan-diri`): one indexable page each, with cover explanation, exclusions, claim steps, FAQ schema, guide links, and the quote widget embedded. **These are the SEO assets you are missing today.**

**FAQ / Bantuan:** real Q&A content, grouped, searchable, with `FAQPage` JSON-LD — and an AI answer box on top that cites the sourced answer (§6 H).

**Account (new):** policies, documents, payments, claims, renewals, and a WhatsApp-linked notification channel.

**Claims (new):** photo-based intake (STNK/policy/damage photos) → AI extraction → status tracking.

### 5.4 Mobile-first specification (the actual market)

Assume a 360×640 Android device on 4G with a metered plan: initial payload budget **≤ 500 KB total including images**; images in AVIF/WebP with `srcset`; no video-autoplay hero; WhatsApp as the primary contact channel (deep link with a prefilled message); phone-first copy; OTP via SMS **and** WhatsApp fallback.

### 5.5 Trust & conversion patterns specific to Indonesian insurance

Display the intermediary licence/registration, partner insurer logos with their OJK status, "data Anda dilindungi" notice with a link to the privacy policy, transparent price composition (premi + biaya admin), a real address, a claim-SLA statement, and both Bahasa Indonesia and English copy for expat/foreign-vehicle segments. Remove the unqualified "Asuransi gratis" claim or link it to explicit terms.

### 5.6 Accessibility (WCAG 2.2 AA)

Skip-link, landmark regions, visible focus rings (never `outline:none` without a replacement), `aria-live` on quote results, labelled form errors, contrast ≥ 4.5:1 (check the orange accent on white — it typically fails), keyboard-complete mega-menu and modals with focus trapping, and `prefers-reduced-motion` respected. Test with axe + one manual screen-reader pass per release.

---

## 6. AI roadmap

### 6.1 Guiding principles

1. **AI must sit on top of your real quote engine**, never invent prices. Every AI answer calls `/motor/get_data` or `/car/get_data` and quotes the returned numbers.
2. **AI never binds a policy.** It advises, prepares, summarises; a human or a deterministic checkout completes the sale.
3. **Every AI action is logged** (input, retrieved sources, output, model, cost) for audit and UU PDP accountability.
4. **Indonesian-first**: Bahasa Indonesia casual register, willingness to handle code-switching, and **voice-note input** (people send voice notes, not paragraphs).
5. **Measure before you ship**: each feature gets a baseline metric and a target.

### 6.2 Platform architecture

```
 Web / WhatsApp / Instagram DM / back office
              │
        API Gateway (auth, rate limit, audit log)
              │
      ┌───────┴──────────────────────────────┐
      │        AI Orchestrator (stateless)    │
      │  - intent router                      │
      │  - tool layer: quote_api, product_    │
      │    catalog, policy_docs(RAG), crm     │
      │  - guardrails: PII redaction, refusal,│
      │    price-never-invented validator     │
      └───────┬───────────────┬───────────────┘
              │               │
        LLM provider      Vector store (policy
        (primary +        wordings, FAQ, guides)
        cheap fallback)   + Object store (photos,
              │            PDFs) + Event warehouse
              │
        Evaluation harness (offline replays + online A/B)
```

Provider strategy: a hosted high-quality model for customer-facing conversation, a cheap fast model for classification/extraction, and — given your on-prem GPU box — a **local model for PII-heavy work** (document OCR post-processing, policy parsing) so customer documents never leave your infrastructure.

### 6.3 Feature specifications

| # | Feature | What it does | Build | Metric | Est. monthly cost (IDR) |
|---|---|---|---|---|---|
| **A** | **AI quote assistant (chat → form)** | Conversational Indonesian chat that elicits vehicle/needs, validates against reference data, then *fills* the wizard and calls the real quote API. Handles "motor saya Vario 2021, plat B". | Streaming chat UI + tool calls to `/motor/get_data`; function schema mirrors the 11 verified params; every price echoed from the API response | Quote-completion rate; questions-per-completion; abandonment drop | 3–6 M |
| **B** | **Vision claims intake** | Customer photographs STNK + damage + police report; vision model returns structured claim fields; a human confirms. | Vision LLM + schema validation + confidence thresholds + human-in-the-loop queue | Claims-form time; field accuracy; touch-time per claim | 2–4 M |
| **C** | **Policy document intelligence** | Parse issued policy PDFs/wordings into structured cover + exclusions; power "what does my policy cover?" Q&A (RAG with citation to the exact clause). | Chunking + embeddings over policy wordings; retrieval with clause-level citations; refuses when not covered | Answer accuracy (golden set); support tickets deflected | 1–3 M |
| **D** | **Needs-based recommender** | Asks 4–5 situational questions (daily distance, parking, family dependents, clinic preference) and recommends cover + sum insured with a rationale. | Deterministic rules + LLM phrasing (rules first, LLM explains) — keeps recommendations defensible | Average sum insured; upsell rate; recommendation acceptance | 1–2 M |
| **E** | **"Why is this cheaper?" explainer** | Narrates the difference between two quotes in plain language using the *customer-facing* fields only (never commission). | Compare two quote objects + product metadata → templated LLM explainer | Compare→detail click-through; time on compare | < 1 M |
| **F** | **Conversion-optimised ranking (learning-to-rank)** | Learn which insurer/product to surface per segment from real conversion data — **without** changing prices. | Event data from §7 → ranking model → A/B in production | Revenue per session; conversion per segment | 2–3 M |
| **G** | **Claim anomaly / fraud screening** | Flags duplicate claims, impossible damage geometry, repeated plates, document reuse. | Feature rules + anomaly model on claims history; human review, never auto-reject | Fraud catch rate; false-positive rate | 1–2 M |
| **H** | **Support automation + FAQ answers** | Answers "berapa premi motor 2015?", "cara klaim?" on web/WhatsApp, sourced and cited, escalating to a human with full context. | RAG over FAQ/policy/guides + quote tool; WhatsApp Business API + IG DM | Deflection rate; CSAT; first-response time | 2–5 M |
| **I** | **Back-office copilot** | "Show renewal rate by insurer this quarter", "which partners haven't submitted commissions?" → SQL/report answers with charts. | NL→SQL over a read-only replica + a chart renderer; row-level permissions | Time-to-answer; reports no longer requested from engineering | 1–2 M |
| **J** | **SEO content engine** | Generates draft landing pages per product × city × vehicle ("asuransi motor Jakarta Selatan"), human-reviewed, with schema. | Template + LLM drafting + review workflow + inner-linking | Indexed pages; organic sessions; assisted quotes | 2–4 M |
| **K** | **Voice-note handling** | Indonesian speech → transcript → intent → action (WhatsApp-first). | Speech-to-text + feature A/H | % of WhatsApp sessions with voice | 1–2 M |
| **L** | **Retention & renewal agent** | Predicts churn, writes the renewal reminder, picks channel/time, escalates. | Churn model on policy data + message generation + scheduling | Renewal rate; cost per renewal | 2–3 M |

**Recommended sequencing:** F-01…F-08 (fix the platform) → **A** (highest ROI) → **L** (revenue you already own) → **H** (cost reduction) → **D/E** (conversion lift) → **C/B** (service depth) → **I/J/G/F** (scale).

### 6.4 Data foundation required before AI (do this in parallel)

An event schema is the precondition for A, D, F, L:
```json
{"event":"quote_requested","ts":"2026-09-10T14:21:52Z","session":"...","device":"mobile",
 "insurance_type":2,"sum_insured":25000000,"coverage":2,"area":2,"plate":13,"year":2021}
{"event":"quote_returned","ts":"...","count":7,"cheapest":500000,"most_expensive":950000,"latency_ms":820}
{"event":"quote_selected","ts":"...","provider_id":7,"product_id":17,"price":510000,"rank":2}
{"event":"checkout_completed","ts":"...","policy_id":"...","premium":510000,"commission_visible":false}
{"event":"assistant_message","ts":"...","intent":"compare","handled":true,"escalated":false,"cost_idr":12}
```
Same events must be emitted server-side (authoritative) and client-side (attribution) so the AI and the business see one truth.

### 6.5 Guardrails, compliance, and evaluation

* **PII:** redact before any third-party model call; keep STNK/policy images on your own infrastructure (your GPU node) with a hosted model only for non-PII text; log retention limits.
* **UU 27/2022 (PDP):** explicit consent per purpose, data-map, retention schedule, DPA with every AI vendor, and the ability to answer a data-subject request.
* **Anti-hallucination:** a validator layer that rejects any AI message containing a price not present in the API response for that session; citation required for every policy clause.
* **Human escalation:** every AI channel needs a one-click "talk to a human" with the transcript attached.
* **Evaluation harness:** a golden set of ~300 Indonesian customer questions with expected answers/prices, replayed on every prompt or model change; block deploys on regression.
* **Cost control:** per-session token budget, cheap-model-first routing, cached FAQ answers, and a hard daily spend cap per channel.

---

## 7. Backend & internal management modernization

### 7.1 API hardening (the internal contract)

* **Versioning:** `/v2/...` with a deprecation window for `/v1`; publish an OpenAPI spec generated from code.
* **Auth:** hashed, per-partner API keys with scopes (`quote:read`, `policy:read`), TTLs, revocation, and usage dashboards — replacing "header present = allowed".
* **Rate limits & quotas:** per key and per IP (§4.4), with 429 + `Retry-After` and alerting on anomalies.
* **Response shaping:** DTOs everywhere (never Eloquent models) — this is the fix for F-02 and it also prevents future leaks of new internal columns.
* **Idempotency:** `Idempotency-Key` on checkout/payment posts.
* **Audit trail:** append-only table for quote → policy → commission transitions, with actor, before/after, and request id.
* **Errors:** consistent error envelope (`code`, `message`, `trace_id`), never leaking SQL or file paths; `expose_php=Off`.
* **Timeouts & retries:** insurer call budget per quote (e.g. 2.5 s hard), circuit breaker per insurer, partial-results response with `insurers_pending` so the UI can stream results instead of blocking.

### 7.2 Back office rebuild — recommendation: **Filament 3 on your existing Laravel app**

You already run Laravel/PHP. The fastest, lowest-risk path to a modern, secure admin is Filament 3 (server-rendered, no Vue 2, no unpinned CDN, batteries-included tables/forms/auth/policies). It removes F-13/F-14 wholesale and gives you resource management in days, not months.

Modules to build:

| Module | Contents |
|---|---|
| Products & rates | Rate tables per insurer/product/coverage/area with **effective dates and version history**, approval workflow, simulation ("what would this quote have cost last month?") |
| Reference data | Plate/area/state/year lists with import, validation and refresh jobs (fixes F-16) |
| Insurers & SLAs | Onboarding, contract terms, commission schedules, quote success/latency per insurer |
| Quotes & policies | Search by token/phone/plate, lifecycle, document generation, resend, manual correction with audit |
| Commissions | Automated reconciliation of expected vs received commission, dispute tracking, statements |
| Claims | Intake queue, AI-extraction review, status machine, provider updates |
| Customers | Consent record, communication log, GDPR/PDP delete/export, segment tags |
| Promotions | Promo codes and discount rules (activating the dormant `promo_code` field) |
| Content/CMS | Pages, FAQ, banners, SEO metadata per route — with an approval workflow |
| Users & roles | RBAC, MFA, IP allow-list for admin, session policies, full action audit |

Non-negotiables in the rebuild: MFA on admin accounts, no direct production DB edits, four-eyes approval for rate changes, and an immutable action log exportable for audit.

### 7.3 Observability & reliability

* **Errors:** Sentry (front end + Laravel) with release tagging and source maps.
* **APM/tracing:** OpenTelemetry or a hosted APM; trace the quote path end-to-end (browser → edge → API → insurer → DB), because today a 3.4 s TTFB has no explanation anywhere.
* **Business dashboards:** funnel (visit → quote → compare → checkout → issued), conversion and margin per insurer, quote latency percentiles, error-rate, renewal cohort.
* **Uptime & synthetics:** external checks for `/`, `/compare`, quote API, back office login, plus a synthetic end-to-end quote every 5 minutes from an Indonesian region.
* **Logging:** structured JSON with request ids; no PII in logs; 30–90 day retention warm, then archive.
* **Queues & schedulers:** Redis + Horizon; jobs for renewal reminders, commission reconciliation, document generation, insurer status polling.

### 7.4 Automation & the renewal engine (immediate revenue)

Renewals are the cheapest revenue an aggregator has and yours currently has no journey. Build: policy expiry watch → T-45/30/14/7 day multi-channel reminders (WhatsApp first, then SMS/email) → one-tap re-quote with last year's parameters → AI-assisted price-change explanation → payment link. Instrument it, iterate on copy and timing.

### 7.5 DevOps

GitHub with protected `main`, PR reviews, GitHub Actions (lint → unit → contract tests → build → deploy to staging → Playwright smoke → manual promotion to production), infrastructure as code for the edge rules and cache policies, secrets in a managed store (not in the repo), **database backups with a tested restore drill** (an untested backup is not a backup), and a rollback path that does not require a rebuild.

---

## 8. Delivery plan and the GitHub demo

### 8.1 Three horizons

| Horizon | Duration | Contents | Exit criteria |
|---|---|---|---|
| **H1 — Stop the bleeding** | 4–6 weeks | F-01…F-08, §4 quick wins, Sentry, staging, CI, smoke tests, protection drop-down fixed, API leak closed | No blank core pages, no anonymous pricing API, security headers on, coverage tiers both returning quotes, dashboard of the quote funnel live |
| **H2 — Modernise the money path** | 8–12 weeks | Quote wizard rebuild (Vue 3 + Vite, SSR-ready), compare page, SEO/product landing pages, reference-data admin, renewal engine, **AI quote assistant (A)** + **retention agent (L)** | LCP < 2.0 s mobile, +X% completion (baseline-relative), assistant live on web + WhatsApp with an eval harness |
| **H3 — Platform depth** | 3–6 months | Filament back office, claims intake + vision (B), policy RAG (C), recommender (D), support automation (H), content engine (J), event warehouse, ranking (F) | Engineering changes ship weekly without fear; support deflection and renewal metrics trending |

Team shape assumed: 1 tech lead, 2–3 full-stack engineers, 1 designer, 1 data/AI engineer (part-time is viable with a hosted provider), 1 QA/ops shared. If you are a team of one, run H1 only and buy hosted services for everything else.

### 8.2 What the demo repo should contain

You mentioned you may ask me to implement the proposals as a GitHub demo. The most useful demo is **not** a slide deck — it is a small, running, testable slice that proves the three claims: *the pages work, the API is safe, and AI talks to the real quote engine.*

```
rajapremi-modernization/
├─ README.md                     # what this proves, how to run in 5 minutes
├─ docker-compose.yml            # api + web + postgres + redis + ai-service + mock-insurer
├─ docs/
│  ├─ audit-report.md            # this document
│  ├─ architecture.md
│  ├─ api-contract.openapi.yaml  # generated, includes the /motor/get_data shape
│  └─ adr/                       # decision records (SSR, Filament, provider choice)
├─ packages/
│  ├─ shared-enums/              # ONE source of truth for COVERAGE/INSURANCE_TYPE  ← fixes F-01
│  └─ ui/                        # design-system tokens + components
├─ apps/
│  ├─ web/                       # Nuxt 3: home, /bandingkan wizard, /compare, product pages, 404
│  ├─ api/                       # Laravel: hardened endpoints, QuoteResource, rate limit, key auth
│  ├─ admin/                     # Filament: rate tables with effective dates + audit
│  └─ ai-service/                # FastAPI: assistant, RAG, guardrails, eval harness
├─ tests/
│  ├─ contract/                  # coverage=1|2 both return products; response has no commission keys
│  ├─ e2e/                       # Playwright: quote flow on a 360×640 viewport, 404 behaviour
│  └─ ai-eval/                   # golden-set replay, blocking on regression
└─ .github/workflows/ci.yml      # lint → unit → contract → e2e → build
```

**PR sequence for the demo (each independently reviewable):**
1. `fix/coverage-enum-single-source` — shared enum + contract test (F-01).
2. `fix/api-response-shaping` — DTOs, commission fields removed, test asserting absence (F-02).
3. `feat/api-key-validation-rate-limit` — hashed keys, scopes, 429s (F-03/F-04).
4. `feat/security-headers-cors` — header set + corrected CORS, CSP in report-only (F-07).
5. `feat/real-404-and-error-states` — server 404 + client catch-all + skeletons (F-06/F-22).
6. `feat/compare-page-v3` — real comparison UI incl. savings badge and "kenapa beda?" (F-05).
7. `feat/quote-wizard-v3` — 5-step wizard with resume and analytics events.
8. `feat/ssr-shell-seo` — Nuxt shell, per-route meta, JSON-LD, sitemap (F-09).
9. `perf/bundle-diet` — prefetch removal, splitting, self-hosted fonts/icons (F-10…F-12).
10. `feat/admin-filament-rates` — rate management with effective dates and audit (F-13/F-14/F-16).
11. `feat/ai-assistant` — chat → tool call → **real** quote, with a price-integrity guardrail and eval set.
12. `feat/renewal-agent` — expiry watch, multi-channel reminders, one-tap re-quote.

**Acceptance criteria the demo must satisfy (all machine-checkable):**
* `coverage=1` and `coverage=2` both return `total > 0` for a fixed motorcycle payload.
* The quote response body contains **none** of: `basic_commision`, `additional_commision`, `admin_fee`, `handling_fee`, `rate_basic`, `discount_rate`, `tax_rate`, `loading_rate_percent`, `loading_rate_amount`.
* A request with `X-API-KEY: bogus` returns **401**; a request without a key returns **401**; 31 requests/minute return at least one **429**.
* `/compare` renders ≥ 4 insurer cards with prices in a real browser at 360 px width.
* An unknown URL returns **HTTP 404** with a rendered page (not "Please wait…").
* `curl -D-` shows HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and a CSP on `www`.
* The AI assistant, asked "berapa premi motor 2021 25 juta TLO?", returns a price **identical** to a direct API call for the same parameters (automated test).
* Lighthouse mobile on `/` and `/compare`: performance ≥ 90, SEO ≥ 95, accessibility ≥ 90.

---

## 9. KPIs to instrument, and the first 90 days

**Business:** quote requests/day, quote completion rate, compare→checkout rate, policies issued, revenue, commission per policy, renewal rate, cost per acquisition, average sum insured, products per customer.
**Product/UX:** step-level abandonment, time-to-first-quote, mobile share, error rate per route, blank/empty renders (should be zero), WhatsApp conversation→quote rate.
**Technical:** TTFB p50/p95, LCP/INP/CLS p75, JS payload per route, API error rate, quote latency per insurer, cache hit ratio, deploy frequency/lead time/MTTR.
**AI:** assistant containment rate, escalation rate, price-integrity violations (must be zero), answer accuracy on the golden set, cost per resolved conversation, renewal uplift.

**30 / 60 / 90 days**
* **Day 30:** F-01…F-08 closed; security headers verified; core pages rendering with smoke tests; Sentry + funnel dashboard live; reference data refresh designed.
* **Day 60:** quote wizard v3 and compare page v3 in production behind a flag; SSR shell for marketing routes; bundle under 250 KB; renewal reminders running.
* **Day 90:** AI assistant live on web + WhatsApp with an eval harness and a price-integrity guardrail; Filament back office replacing the legacy console for rates/products; A/B read on completion-rate lift; H3 scoped with real numbers.

---

## 10. Appendices

### Appendix A — Evidence commands (re-runnable by your team)

```bash
# Headers on www and api
curl -sS -D- -o /dev/null https://www.rajapremi.com/ | grep -iE '^(http|server|cf-cache|x-|strict|content-security|referrer|permissions|cache-control)'
curl -sS -D- -o /dev/null -X POST -H 'X-API-KEY: bogus' \
  --data 'insurance_type=2&suminsured=25000000&plate=13&area_id=2&state_id=51578&year=2021&coverage=1&limit_person=0&limit_tpl=0&sort=a-z' \
  https://api.rajapremi.co/motor/get_data | grep -iE '^(http|x-powered|set-cookie|access-control)'

# Asset weights: uncompressed vs as-delivered
for f in / /js/app.f1331263.js /js/chunk-vendors.58f3419a.js /css/app.346bdbb4.css; do
  a=$(curl -sS -H 'Accept-Encoding: identity' -o - "https://www.rajapremi.com$f" | wc -c)
  b=$(curl -sS -H 'Accept-Encoding: br'       -o - "https://www.rajapremi.com$f" | wc -c)
  echo "$f raw=$a br=$b"
done

# How many chunks every visitor is told to prefetch
curl -sS https://www.rajapremi.com/ | grep -c 'rel="prefetch"'

# The coverage-code inversion (front end vs back end)
curl -sS https://www.rajapremi.com/js/app.f1331263.js | grep -o 'ALL_RISK"]=1.\{0,60\}'
curl -sS https://www.rajapremi.com/js/app.f1331263.js | grep -o '.\{80\}All Risk.\{60\}'
```

### Appendix B — Verified quote API contract (as observed)

**`POST /motor/get_data`**
| Param | Observed value | Notes |
|---|---|---|
| `insurance_type` | `2` | motorcycle (verified). `7` = health, `8` = umrah in the bundle enum |
| `suminsured` | `25000000` | IDR |
| `plate` | `13` | plate-code id from the reference list (53 rows, source data dated 2016-10-20) |
| `area_id` | `2` | region |
| `state_id` | `51578` | |
| `year` | `2021` | vehicle year |
| `coverage` | `1` works, `2` returns empty | **the code inversion, F-01** |
| `limit_person`, `limit_tpl` | `0` | third-party person/liability limits |
| `sort` | `a-z` | |
| Header | `X-API-KEY` | presence checked, value not validated |

**`POST /motor/index`** returns the reference/config payload used to populate the form (plate list, areas, states, protection options, product tiles).

**Response:** `{"status":…, "data":{"total":7, "listdata":[33 fields per insurer]}}` — customer-facing fields only, once F-02 is fixed.

### Appendix C — Current vs target

| Concern | Now | Target |
|---|---|---|
| First content | after 400 KB brotli + up to 3.4 s TTFB | server-rendered HTML, < 1 s TTFB, edge-cached |
| Comparison page | navigation only | insurer cards, savings badges, cover diff, ranking |
| Unknown URL | HTTP 200 + "Please wait…" | HTTP 404 + helpful recovery page |
| Quote API auth | any string passes | hashed keys, scopes, quotas, audit |
| Quote API payload | 33 fields incl. commission | customer-facing fields only |
| Back office | Vue 2 + unpinned CDNs + CKEditor 4 | Filament 3, pinned, MFA, audit log |
| Content | 5 routes, 1 title | ~40 indexable pages, per-route meta + schema |
| AI | none | assistant + retention + claims + RAG, with guardrails and evals |
| Ops | no tests/CI/staging/monitoring | CI, staging, synthetics, dashboards, tested backups |

### Appendix D — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Unpinned `@latest` CDN breaks the admin console | High | High | Pin + vendor immediately (half-day fix) |
| Competitor harvests margin/pricing data | High (already possible) | High | Response shaping + key validation (days) |
| SEO never recovers from an SPA shell | Medium | High | SSR/prerender within 1–2 weeks |
| Coverage-code bug causes mis-sold policies | Medium | High | Fix + contract test + audit recent policies |
| Big-bang rewrite stalls | Medium | High | Incremental micro-frontend path (§5.2) |
| AI gives a wrong price and damages trust | Medium | High | Price-integrity guardrail (no price not in the API response) |
| No tested backups | Low *(but unknown)* | Catastrophic | Restore drill this month |
| PDP (UU 27/2022) complaint | Low | High | Consent, data map, DPAs, retention |

### Appendix E — Glossary

TLO (Total Loss Only) · All Risk / Comprehensive · STNK (vehicle registration) · premi (premium) · biaya admin (admin fee) · polis (policy) · klaim (claim) · asuransi kesehatan (health insurance) · OJK (financial services authority — the regulator) · UU PDP (Personal Data Protection Law, UU 27/2022) · IDR (rupiah).

### Appendix F — Limitations of this audit (please read)

1. **No access to analytics, ad accounts, CRM or the insurer contracts** — all business-impact ranges in §0.4 are benchmark-typical estimates, not measurements of your traffic or margins.
2. **No server-side access** (code, database, Cloudflare account). Findings are from outside: bundles, headers, API behaviour, rendering. An internal review will almost certainly find more — particularly around the `generate-key`/device-id flow and the checkout/payment path.
3. **The commission/fee values were read from one product line** (motorcycle, one risk profile). They are illustrative of the schema, not a full picture of your economics.
4. **Two API calls could not be characterised**: `coverage=2` returned no product for the risk profile tested (that *is* the F-01 bug as observed), and the checkout/summary path behind `/car/summary/<token>` was intentionally not exercised beyond a read.
5. **Rendering observations are timing-sensitive**: `/product` measured blank on one load and footer-only on the next, which is itself evidence of instability (F-05) rather than a measurement error.
6. **The security findings are described as a defensive checklist, deliberately not as an exploitation guide.** No customer data, no accounts, and no writes were touched during this audit. Fixing F-01…F-08 should be treated as urgent.
7. **Scores in §0.2 are my judgement** on the evidence above; they are meant to prioritise work, not to be precise measurements.

---

*End of report. Say the word and I will scaffold the demo repository described in §8.2 — starting with PRs 1–5 (the fixes that stop the bleeding), which are small, self-contained and independently verifiable.*
