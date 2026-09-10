# AI features

Seven assistants are easy; seven assistants that survive contact with a regulator are not. This document states
exactly what runs, what is simulated, and how each becomes production-grade.

## The six features

| # | Feature | On `ai.html` | Reality in this demo | Production shape |
|---|---|---|---|---|
| 1 | **RajaAI assistant** — coverage and policy Q&A, escalation to a human | Live panel (button bottom-right of every page) | **Working.** Local intent router + retrieval over the same FAQ content the site publishes | LLM with retrieval over policy wordings; same UI, same escalation contract |
| 2 | **Needs analysis** — 3 questions → ranked recommendation | "Mulai analisis kebutuhan" | **Working.** Deterministic rules (risk → dependants → budget) | Same questions, LLM to phrase the rationale and handle free-text answers |
| 3 | **Premium explainer** — "why is this price what it is?" | Every offer card → "Kenapa harga ini?" | **Working.** Computed from the actual quote inputs | Identical — this one is arithmetic, not generation; keep it deterministic |
| 4 | **Voice input** — Bahasa Indonesia | "Rekam suara saya" | **Working.** Real Web Speech API (`id-ID`) | Server-side transcription for consistency across browsers and devices |
| 5 | **Document extraction** — photo of STNK → filled form | Upload widget, "Pakai contoh STNK" | **Simulated.** Real flow and mapping, sample extraction with per-field confidence | Vision model + format validation (chassis/VIN, year) before the value is trusted |
| 6 | **Claim photo triage** | "Analisis contoh foto" | **Simulated.** Real flow, sample classification and cost estimate | Vision model trained on settled claims; output advisory only, never a decision |
| 7 | **Operator copilot** (internal) | `admin/index.html` → Copilot panel | Demo dataset with deterministic answers | Natural language → SQL against a read-only replica, with a query audit trail |

Two seams are deliberately single-function, so integration is small and reviewable:

```js
RP.AI.answer(question, context)   // assistant + needs analysis + explanation (ai.js)
RPData.generateQuotes(input)      // pricing and offer generation (data.js)
```

## Guardrails (visible in the product, not just in a policy document)

| Guardrail | How it shows up |
|---|---|
| **AI never decides a claim** | Every triage screen says the estimate is to speed up verification, not to settle the claim |
| **No invented policy terms** | Answers come from the published FAQ/policy content; when unsure, the assistant hands over to a human |
| **Escalation is always one tap away** | WhatsApp, phone and email actions, with conversation context attached |
| **PII stays out of conversations** | Policy numbers are recognised and referenced, not stored; production masks them before any model call |
| **Customer data is not training data** | Stated in the console's compliance panel; the demo transmits nothing at all |
| **Low confidence is surfaced** | Extracted fields carry a confidence score, and anything below the threshold is flagged for review rather than filled silently |

## Cost and impact, per feature

Estimates assume current Indonesian infrastructure costs; your current quote volumes were not measured, so none are assumed.

| Feature | Build effort | Running cost | Expected effect |
|---|---|---|---|
| Assistant + explainer | 4–6 weeks | low (grounded, short prompts) | Fewer "what does this mean" contacts; higher confidence at the decision point |
| Needs analysis | 2–3 weeks | negligible | Better product mix, fewer mismatched purchases and complaints |
| Voice input | 1–2 weeks | transcription per minute | Removes the main friction for mobile users reporting claims |
| Document extraction | 6–10 weeks | vision call per document | Faster form completion; fewer failed quotes from mistyped chassis numbers |
| Claim triage | 10–16 weeks | vision call per claim | Shorter time-to-classification; surveyors arrive informed |
| Operator copilot | 6–8 weeks | low (query + short answer) | Analyst time returned to pricing and partner work |

Figures are ranges from comparable implementations, not quotations. The staged plan is in `ROADMAP.md`.

## What "grounded" means concretely

1. The user's question selects a topic (coverage terms, claim procedure, pricing, security, handover).
2. The answer is assembled from content that exists on the site — the same text a customer could read themselves.
3. If nothing fits, the assistant says so and offers the three ways to reach a person.
4. In production, step 1 and 2 become: embed the question → retrieve the top passages from policy documents →
   generate an answer that must cite those passages → if retrieval scores are low, escalate instead of answering.

## Deliberate non-goals

- **No chatbot on the claim decision path.** Automation there is a compliance problem, not a technology problem.
- **No auto-generated policy wording.** Legal text stays written and reviewed by humans.
- **No dark-pattern personalisation.** The assistant may explain, never nag.
- **No silent data collection.** The demo transmits nothing; production needs a stated retention period before launch.
