# Surge Alert — PM Portfolio Project

This is a solo PM portfolio project: a surge-pricing forecast & timing-nudge feature for Uber (India), built to demonstrate end-to-end PM craft (research, spec, design, a working engine-backed prototype, eval) for recruiting purposes — not a production app.

## Start here

1. Read `docs/prd.md` first — it's the build-facing spec (Draft v4). Background/Objective explain *why*; the numbered "Proposed Construct" sections are the actual rules an implementation must follow.
2. Read `docs/roadmap.md` for current status — what's done, what's not started, and the Changelog at the bottom, which is the single source of truth for how every decision in this project was reached and in what order. Read the changelog before assuming something is a fresh idea — it's probably already been decided or explicitly deferred.
3. `docs/brainstorm-notes.md` has all the underlying research (regulatory constraints, driver-economics findings, competitive research on Uber's own "Ride Pass", scope decisions and why they were made). If you're unsure *why* the PRD says something, it's almost always explained here.
4. `docs/wayfare-design-feature-spec.md` describes the design system ("Wayfare") — an original, non-Uber-branded mobility app UI built on the same interaction patterns as a real Uber screen recording, for IP safety. It documents every screen/board and their exact copy and layout.
5. `docs/uber-copy-reference.md` and `docs/frame01-design-spec.md` are supporting reference material — verbatim real-Uber copy (for voice-matching any new UI text) and a detailed Figma handoff spec for one screen.
6. `app/app.html` is the actual working prototype — a self-contained, engine-backed forecast demo (open directly in a browser, no build step). It implements the core forecast math described in the PRD, including the v4 per-mode multiplier modeling.

## Key things to know before changing anything

- **Platform scope is Uber-only, deliberately** (not Ola/Rapido) — see the brainstorm notes' scope-decision sections for why. Don't add cross-platform comparison.
- **Per-mode surge modeling (PRD v4, newest layer):** surge is modeled and shown independently per ride tier (Two-wheeler/Bike, Three-wheeler/Auto, Standard/Go+Premier), not as one multiplier scaled by a fixed ratio. In `app.html`, each tier has its own `sens` (sensitivity) constant and `tierMult(surge, sens) = 1 + (surge - 1) × sens` computes that tier's own multiplier from the route's base surge. **These sensitivity constants (0.25 / 0.55 / 1.00) are currently hand-set, not fit from real data** — see the Open Questions in `prd.md` and the Risks section in `roadmap.md`. If you're asked to make this more rigorous, this is where to start.
- **The "wait for it to drop" framing has a documented India-specific complication**: the CCI's 2022 study found Indian riders facing surge mostly *switch ride mode*, not wait. This is why mode-shift (picking a cheaper row) counts as a first-class "capture action" in the PRD, on equal footing with "wait" — see PRD section 5 and the Background section.
- **A "wait, it'll be cheaper later" message must never render without a capture action attached** (Alert me / Reserve / an available cheaper mode row). This is called out as a blocking-bug-not-preference in the PRD — treat it as a hard invariant in any implementation.
- **Confidence gating is per (route, mode)**, not just per route. Silence is a designed, correct state when there isn't enough data — never show a lower-confidence guess instead. This applies independently to each ride tier.
- **India's regulatory cap (MVAG 2025): surge multipliers are bounded 0.5×–2.0×.** Any multiplier math should respect this ceiling/floor.
- There is no live Uber API integration anywhere in this project, by design (see Non-Goals in the PRD) — `app.html` is a standalone demo with its own synthetic/seed-data-driven forecast engine.

## Known open items (see `roadmap.md` for the full list)

- The per-tier sensitivity constants need real seed data to be fit properly rather than hand-set.
- The notification/forecast simulator (P0 deliverable) and the naive-baseline eval comparison haven't been built yet.
- A formal decision on which ride modes ship in v1 (all vs. a narrower set) is still an open question in the PRD.
