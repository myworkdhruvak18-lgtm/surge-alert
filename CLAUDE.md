# Surge Alert — PM Portfolio Project

This is a solo PM portfolio project: a surge-pricing forecast & timing-nudge feature for Uber (India), built to demonstrate end-to-end PM craft (research, spec, design, a working engine-backed prototype, eval) for recruiting purposes — not a production app.

## Start here

1. Read `docs/prd.md` first — it's the build-facing spec (Draft v6). Background/Objective explain *why*; the numbered "Proposed Construct" sections are the actual rules an implementation must follow.
2. Read `docs/roadmap.md` for current status — what's done, what's not started, and the Changelog at the bottom, which is the single source of truth for how every decision in this project was reached and in what order. Read the changelog before assuming something is a fresh idea — it's probably already been decided or explicitly deferred.
3. `docs/brainstorm-notes.md` has all the underlying research (regulatory constraints, driver-economics findings, competitive research on Uber's own "Ride Pass", scope decisions and why they were made). If you're unsure *why* the PRD says something, it's almost always explained here.
4. `docs/wayfare-design-feature-spec.md` describes the design system ("Wayfare") — an original, non-Uber-branded mobility app UI built on the same interaction patterns as a real Uber screen recording, for IP safety. It documents every screen/board and their exact copy and layout.
5. `docs/uber-copy-reference.md` and `docs/frame01-design-spec.md` are supporting reference material — verbatim real-Uber copy (for voice-matching any new UI text) and a detailed Figma handoff spec for one screen.
6. **`app/app-uber-ui.html` is the canonical working prototype** — a self-contained, engine-backed demo (open directly in a browser, no build step) with the Uber-style phone, maps, pickup shift and the commute-ping simulator. Make all prototype edits there. `app/app.html` is the earlier original, and `app/app-redesign.html` and `app/app-us.html` are older copies (the US one is a New York re-skin); do not edit them unless asked. Also read `docs/gap-review.md` (open issues) and `docs/ping-threshold-research.md` (why the ping uses 1.25x / 1.25x).

## Key things to know before changing anything

- **Platform scope is Uber-only, deliberately** (not Ola/Rapido) — see the brainstorm notes' scope-decision sections for why. Don't add cross-platform comparison.
- **Per-mode surge (built in v6):** the simulated fare history has a ride-type column (Two-wheeler, Three-wheeler, Standard, Sedan, Six-seater) and the engine forecasts, goes silent and reports coverage per ride type; each ride type's price is its own forecast scaled only by the pickup point's zone factor. The older hand-set sensitivity scaling (0.25 / 0.55 / 1.00) is gone. **The per-ride-type behaviour in the data (how strongly each follows demand, rain/event effects, thin supply) is our assumption, not real data**: never describe per-ride-type numbers as measured.
- **The "wait for it to drop" framing has a documented India-specific complication**: the CCI's 2022 study found Indian riders facing surge mostly *switch ride mode*, not wait. This is why mode-shift (picking a cheaper row) counts as a first-class "capture action" in the PRD, on equal footing with "wait" — see PRD section 5 and the Background section.
- **A "wait, it'll be cheaper later" message must never render without a capture action attached** (Alert me / Reserve / an available cheaper mode row). This is called out as a blocking-bug-not-preference in the PRD — treat it as a hard invariant in any implementation.
- **Confidence gating is per (route, ride type).** Silence is a designed, correct state when there isn't enough data (the six-seater goes silent in about 15% of simulated slots) — never show a lower-confidence guess, and never present silence as "no surge".
- **India's regulatory cap (MVAG 2025): surge multipliers are bounded 0.5×–2.0×.** Any multiplier math should respect this ceiling/floor.
- There is no live Uber API integration anywhere in this project, by design (see Non-Goals in the PRD) — the prototype is a standalone demo with its own synthetic/seed-data-driven forecast engine.

## Known open items (see `roadmap.md` for the full list)

- All fare data is simulated; per-ride-type behaviour needs real data (the old per-tier sensitivity constants are retired).
- The commute-ping simulator and the baseline eval are built (see the roadmap). Still open: the pickup sweep must be re-run against `app-uber-ui.html` and the shipped rules, and the PRD needs success metrics, guardrails, experiment design and risks (see `docs/gap-review.md`).
- A formal decision on which ride modes ship in v1 (all vs. a narrower set) is still an open question in the PRD.
