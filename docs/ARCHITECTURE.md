# Architecture

## Why a static build

The audited site is a Vue 2 SPA that ships ~1.80 MB of JavaScript and then renders several key routes with an
empty body. The redesign removes that failure mode at the root rather than papering over it.

| Decision | Reason |
|---|---|
| No framework, no bundler | Zero build step means the demo cannot rot, cannot fail a CI install, and anyone can read the source |
| Content in HTML, JS as enhancement | The page is readable before any script runs — the exact opposite of the old failure |
| No third-party CDN | The old back office pulled `bootstrap-vue@latest` and `vue-select@latest`; unpinned upstream code is a liability |
| System font stack | Removes a render-blocking request and a privacy leak; the type scale is tokenised so a webfont can be added in one place |
| One data module | `data.js` is the single seam where mock data becomes a real API call |

Trade-off, stated plainly: a no-build static site is ideal for a reviewable demo and for a marketing surface,
but a transactional product should be server-rendered with real routing, SSR/SSG for SEO, and server-side
sessions. The migration path below gets there without throwing this work away.

## Layers

```
tokens.css       design tokens — colour, type scale, space, radius, elevation, motion, dark mode
base.css         reset, document defaults, layout primitives, utilities
components.css   generic components — buttons, inputs, cards, badges, nav, mega menu, drawer, modal, tabs, table
product.css      domain components — quote form, result cards, compare tray, AI panel, OCR, admin console
```

CSS load order matters; later layers only consume tokens, never redefine them. Re-skinning the whole product
is a token edit.

## Scripts

| File | Responsibility | Notes |
|---|---|---|
| `data.js` | Content + dataset + `generateQuotes()` + formatters | Pure data; no DOM access. The one place to swap in a live API |
| `app.js` | Shell: header, footer, drawer, mega menu, theme, modals, toasts, tabs, counters, reveal, error boundary | Injects chrome so 12 pages share one definition |
| `quote.js` | Quote engine: form, validation, ranking, result cards, compare tray, modals, URL state | Exposes `RPQuote.build.*` for tests and reuse |
| `ai.js` | RajaAI assistant + four embeddable demos | `RPAI.answer()` is the LLM swap-in point |

Load order is `data.js → app.js → quote.js → ai.js`. Every page ends with the same four tags, so a page cannot
drift into its own dialect.

## Data flow

```
URL params ──▶ readUrl() ──▶ quote state ──▶ generateQuotes(input) ──▶ ranked rows ──▶ builders ──▶ DOM
     ▲                                              │
     └──────────── writeUrl() (replaceState) ◀──────┘
```

- State lives in one object (`RPQuote.state`) plus the URL — no hidden second source of truth.
- `generateQuotes()` is pure: same input, same output. That is what makes the test suite possible without a browser.
- In production, swap the body of `generateQuotes()` for a server call returning the same array shape. Nothing
  downstream changes.

## Rendering strategy per surface

| Surface | Strategy | Production target |
|---|---|---|
| Marketing pages | Static HTML + progressive enhancement | SSG (Nuxt/Next) |
| Product detail | Client-rendered from `?id=` | Pre-rendered per product for SEO |
| Quote comparison | Client-side, deep-linkable | Server call + same UI; consider server-rendered results for shareability |
| Internal console | Client-side over a demo dataset | Server-rendered app behind SSO, read replica for analytics |

## Accessibility

- Skip link on every page; landmarks (`header`, `main`, `footer`, `nav` with labels).
- Interactive components are real elements: `<button>`, `<select>`, `<details>/<summary>`, `<label>`.
- `aria-selected` on tabs, `aria-modal` on the drawer, `aria-label` on icon-only controls, `aria-hidden` toggling on the assistant panel.
- Visible focus rings come from a single token (`--sh-focus`), so they cannot be styled away per component.
- Colour is never the only signal: savings carry text ("Hemat"), severity carries a word, the cheapest card carries a ribbon.
- Motion is short and non-essential; nothing loops indefinitely except the loading shimmer.

## Browser support

Modern evergreen browsers. Uses `IntersectionObserver`, `URLSearchParams`, `history.replaceState`, CSS custom
properties, `mask` for the accordion chevron. Voice input degrades with a clear message where the Web Speech API
is missing (it is Chrome/Edge-only in practice).

## Testing

`tests/quote-engine.test.mjs` runs the real `data.js` and `quote.js` inside a `node:vm` sandbox with a minimal
DOM and shell stub — no dependencies, no headless browser:

```
node tests/quote-engine.test.mjs
```

It asserts what the audit showed could silently break: quote shape and arithmetic, the coverage-code mapping,
absence of margin data in customer-visible output, the compare tray and modals, and that every navigation target
resolves to a page that exists in the repository.

## Performance budget

| Metric | Audited site | Target here | How |
|---|---|---|---|
| Largest contentful paint | 6.4 s | ≲ 1.6 s | content in HTML, no bundle to parse |
| Initial weight | ~1.80 MB | ≲ 420 KB | no framework, system fonts, 4 small CSS files |
| Requests | 211 | < 40 | no CDN, no per-icon images (inline SVG), no route-chunk prefetching |
| Time to interactive | 9.1 s | ≲ 2.2 s | scripts are small and non-blocking in effect |

Measured on the deployed build with Lighthouse; the numbers live in the console's "Performa" panel so they stay
visible rather than being a one-off claim in a document.

## Path to production on the existing stack

1. **Keep the PHP 8.1 API.** Add key validation (not just presence), per-key rate limits, and remove margin fields from public responses.
2. **Move the quote call server-side** so no key ships to the browser.
3. **Serve the storefront as server-rendered pages.** Reuse this design system and markup as the view layer; the CSS layers and component contracts are framework-agnostic.
4. **Adopt surfaces incrementally** — home → comparison → claims → console — rather than a big-bang replatform.
5. **Keep the tests.** The coverage-mapping test is the one that prevents the most expensive class of regression.
