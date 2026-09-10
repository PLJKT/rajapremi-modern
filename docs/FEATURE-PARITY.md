# Feature parity — what existed, what happens to it now

Source of truth for the "keep all key existing features" requirement. The left column is what the audited
site does today (verified live, 10 Sep 2026); the right column is where it lives in this build.

Legend: **Kept** = same capability · **Improved** = same capability, materially better · **New** = addition.

## Catalogue and content

| # | Existing feature | Status | Where / what changed |
|---|---|---|---|
| 1 | 8 product lines (Motor, Mobil, Kesehatan, Properti, Kecelakaan Diri, Travel, Umrah & Haji, Jiwa) | Kept | `PRODUCTS` in `assets/js/data.js`; product grid on `index.html`; detail via `produk.html?id=…` |
| 2 | Product descriptions and "mulai dari" pricing | Improved | Same copy, now with coverage bullets, response-time facts and a working quote CTA per product |
| 3 | 7 partner insurers (ACA, Simas, Jasa Tania, MAG, Zurich, Jasindo Syariah, Reliance) | Kept | `PROVIDERS`, reproduced with the audited ratings, claim SLAs and tariff factors |
| 4 | FAQ page | Improved | `faq.html` — searchable, category-filtered, linkable per question |
| 5 | Help centre / "Bantuan" | Improved | `bantuan.html` with how-to guides and a contact section (`#hubungi`) |
| 6 | "Tentang Kami" | Improved | `tentang.html` — story, licence, **how the broker earns money**, reviews (`#ulasan`) |
| 7 | Customer rating badge (4,6 / 5) | Kept | Header, footer, `tentang.html#ulasan`, `aggregateRating` in structured data |
| 8 | Testimonials carousel | Improved | Static, honest set including a 4-star review that names a real limitation |
| 9 | Event & promo campaigns | Improved | Promo cards with explicit validity ("31 Okt 2026", "Kuota terbatas") |
| 10 | Newsletter signup ("Let Us Protect You!") | Kept | Same copy on `index.html`, now confirming where the address went |
| 11 | Footer: products, informasi lainnya, contact block, social links, copyright | Kept | Rendered once from `app.js`; every link resolves inside the build |

## Quote, compare, purchase

| # | Existing feature | Status | Where / what changed |
|---|---|---|---|
| 12 | Vehicle quote form: value, plate code, year, protection type | Kept | Hero widget and `bandingkan.html`; presets added, plus plate-region labels |
| 13 | Plate-region and year lists | Kept | `PLATE_REGIONS`, years 2004–2026 |
| 14 | TLO / All Risk selection | Fixed | One shared code table; **both** options return offers (the old site returned nothing for one of them) |
| 15 | Multi-insurer quote result list | Improved | Ranked, cheapest flagged, savings vs dearest computed |
| 16 | Protection options beyond TLO/All Risk | Kept | `COVERAGE` table with plain-language descriptions |
| 17 | Comparison of policies | Improved | Pick up to 3 → sticky tray → criteria table with the best row marked |
| 18 | Filtering and sorting of offers | New | Sort by price, rating, claim speed; filter by insurer |
| 19 | Purchase with a policy summary | Improved | Buy modal separates premium, policy fee and stamp duty; total disclosed before payment |
| 20 | Payment options | Kept | Virtual account, card, 0% instalments — described, not processed (demo) |
| 21 | Shareable quote state | New | Quote parameters live in the URL |

## Claims

| # | Existing feature | Status | Where / what changed |
|---|---|---|---|
| 22 | 5-stage claim flow (report → documents → surveyor → approval → payment) | Kept | `CLAIM_STEPS`, visualised on `klaim.html` with an SLA per stage |
| 23 | Document checklist | Improved | Explicit list per claim type, with the reason each item is needed |
| 24 | Claim reporting form | Kept | Present, with the assistant able to pre-fill context |
| 25 | Claim FAQ | Kept | Folded into `klaim.html` and the assistant intent `claim-how` |
| 26 | Claim status lookup | New | Assistant intent `claim-status` — ask with a claim number, get stage and ETA |
| 27 | Claim photo triage | New | Classification + cost estimate preview (`ai.html`) |

## Account and partner

| # | Existing feature | Status | Where / what changed |
|---|---|---|---|
| 28 | Login (`service.rajapremi.co/login` equivalent) | Kept | `masuk.html`, demo-safe |
| 29 | Registration | Kept | `daftar.html`, feeds the "free accident cover" promo |
| 30 | Partner / agent recruitment | Improved | `partner.html` — value proposition, revenue model table, 3-step onboarding, form |
| 31 | Partner-facing commission model | Improved | Now described openly where it belongs (partner page, internal console) instead of leaking in API responses |

## Back office

| # | Existing feature | Status | Where / what changed |
|---|---|---|---|
| 32 | Operational dashboard | Improved | `admin/index.html` — KPIs, 12-month premium trend, channel mix |
| 33 | Quote/offer records | Kept | Recent-offers table with status per row |
| 34 | Partner performance data | Improved | Tariff factor, active policies, claim ratio, integration health |
| 35 | Claims queue | Improved | Stage, age, SLA warning state |
| 36 | Product and content management | Kept | Sections present in the console navigation (content editing described, not implemented) |
| 37 | Commission tracking | Improved | Margin is visible **here** and only here — with a test preventing it from reaching customer markup |
| 38 | Operator copilot | New | Natural-language questions answered from the same dataset as the dashboard |
| 39 | Security & audit log | New | Maps each audit finding to its fix and status |

## Technical / non-functional

| # | Existing behaviour | Status | What changed |
|---|---|---|---|
| 40 | Every route shares one `<title>` | Fixed | Unique title, description and canonical per page |
| 41 | No structured data | Fixed | `InsuranceAgency` + `aggregateRating` JSON-LD |
| 42 | `sitemap.xml` serving HTML | Fixed | No fake sitemap; canonical URLs are honest |
| 43 | ~1.80 MB of JavaScript on first paint | Improved | ~0 third-party JS; system fonts; no framework |
| 44 | Content appearing only after the bundle runs | Improved | Markup is in the HTML; JS enhances |
| 45 | Bad URLs stuck on "Please wait…" | Fixed | `404.html` with recovery paths |
| 46 | API key readable in the public bundle | Fixed by design | No secrets client-side; the swap-in point is the server (`README` → Switching to live data) |
| 47 | Commission fields in public API responses | Fixed by design | Customer views render only payable amounts |
| 48 | No security headers | Documented | Addressed in `docs/ROADMAP.md` (server configuration, not a static-site concern) |

---

### Deliberately not reproduced

| Item | Why |
|---|---|
| `bootstrap-vue@latest`, `vue-select@latest` CDN pulls | Unpinned third-party code was itself an audit finding — upstream breakage you do not control |
| The blank-render routes `/product` and `/faq` as they behaved | That behaviour was a defect, not a feature |
| Cover-code values that map one option to zero offers | Same |
