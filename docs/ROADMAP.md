# Roadmap

Two tracks run in parallel: **fix what is broken today** (cheap, immediate, on the existing stack) and
**rebuild the experience** (the work in this repository). Doing the fixes first is not a formality — three of
them are actively costing money.

## Track A — P0 fixes on the existing stack (weeks 1–3)

These do not require a replatform. Each is small, each is verifiable.

| Priority | Finding | Fix | Effort | Why now |
|---|---|---|---|---|
| P0 | Coverage codes inverted between UI and API — "All Risk" returns zero offers, "TLO" returns All-Risk pricing | One shared enumeration, used by both sides, plus a test that fails on drift | 1–2 days | Customers are being quoted the wrong product or nothing at all |
| P0 | Commission and margin fields in public quote responses | Strip internal fields from the public response; keep them on the internal API | 1 day | Competitors and customers can read your margin |
| P0 | `generate-key` issues tokens to anyone who invents a `user_id` | Require real authentication before token issue | 2–3 days | Open door into customer-linked data |
| P0 | API key checked for presence, not validity | Validate the key, add per-key rate limits and anomaly logging | 2–3 days | Anyone can consume your partner quota |
| P0 | `/product` and `/faq` finish loading with an empty body | Pre-render these routes or serve server-rendered content | 3–5 days | Traffic lands and leaves |
| P1 | Bad routes hang on "Please wait…" forever | Real 404 handling with recovery links | 1 day | Turns a dead end into a next step |
| P1 | No security headers (CSP, HSTS, secure/same-site cookies) | Server + Cloudflare configuration | 2 days | Standard hardening, quick audit win |
| P1 | Every route shares one title; no structured data; fake sitemap | Per-route metadata + `InsuranceAgency` JSON-LD + a real sitemap | 3–4 days | Search visibility for eight product lines |
| P1 | Unpinned `@latest` CDN dependencies in the back office | Pin versions, self-host, or remove | 2–3 days | Upstream can break your operations without a deploy |

## Track B — the rebuild (weeks 4–16)

| Phase | Scope | Effort | Success signal |
|---|---|---|---|
| **1. Foundation** | Move the storefront to server-rendered pages; adopt this design system; ship home, comparison, product detail | 4–6 weeks | LCP under 2 s; content visible with JS disabled; comparison conversion up |
| **2. Self-service** | Claims centre, help centre, partner onboarding, account area | 4–6 weeks | Claim-related contacts fall; partner applications move online |
| **3. Intelligence** | Assistant + explainer → document extraction + needs analysis → claim triage + copilot | 8–14 weeks | Support cost per policy down; time-to-classification down |
| **4. Console** | Rebuild the back office on this design system behind SSO; add the copilot and the audit log | 4–6 weeks | Analysts stop building monthly spreadsheets |

## Sequencing logic

- **Fix before rebuild.** Rebuilding on top of an inverted coverage code and a leaky API simply moves the defects.
- **Comparison first, marketing second.** The comparison screen is where the money is; a prettier homepage moves few numbers on its own.
- **Claims before AI.** A fast, visible claims process is more persuasive than any assistant — and it is the input the triage model needs.
- **Console last.** It benefits from everything learned about the data model upstream.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Partner API contracts change during replatform | Medium | High | Keep the existing integration layer; wrap it, do not rewrite it |
| Coverage-code fix breaks historical reporting | Medium | Medium | Backfill-map old records explicitly; verify counts before and after |
| SEO dip during migration | Medium | High | Keep URLs and metadata stable; monitor the eight product pages daily for two weeks |
| AI scope creep beyond guardrails | Medium | High | Ship triage as advisory-only; no AI on the decision path (see `AI.md`) |
| Team capacity split between tracks | High | Medium | Track A is time-boxed to three weeks and does not depend on Track B |
| Vendor lock-in on the vision/LLM provider | Low | Medium | Both swap-in points are single functions by design |

## What to measure

| Metric | Baseline to establish in week 1 | Target |
|---|---|---|
| Comparison → policy conversion | measure | +4–6 points |
| Largest contentful paint (home, comparison) | 6.4 s | under 2 s |
| Quote requests returning zero offers | measure | zero (the inverted code is the cause) |
| Time to first claim response | measure | under 1 working day |
| Support contacts per 100 policies | measure | −20% |
| Policies renewed automatically | 1,876 due in 30 days, campaign not running | campaign live before the next cohort lapses |

## Definition of done for this demo

Done: feature parity with the existing site, UI modernised, AI features demonstrated, the P0 defects answered
structurally, tests passing, audit published alongside the code.

Not done, and stated as such: live partner data, real authentication, the vision models, and the production
console behind SSO. Those are phases 2–4 above.
