# PM Project Roadmap — Surge Alert (Uber)

Format: Now / Next / Later. Timeline: **2-4 weeks total, spec through demo** (set 2026-08-29). Platform: **Uber only** (narrowed from single-platform-per-user on 2026-08-31). Full rationale lives in `brainstorm-notes.md`; the build-facing spec is `prd.md`.

**Design references:**
- Figma file — all 9 screens rebuilt as editable, faithful Android recreations (Uber's real UI plus Surge Alert's own home-card and two lock-screen notifications), with Frame 01 (Uber Home) since enhanced to a full, detailed recreation, now being corrected against an actual screen recording of the real app: https://www.figma.com/design/2Ly9NolRhiaBJ9Iz753ayp/Surge-Alert---Uber-UI-Reference
- Interactive HTML prototype (click-through, 9-screen flow, colors + copy verified against Uber's real app): https://claude.ai/code/artifact/4a284cb7-5fd7-450b-849d-1a025cda1ddf
- Verbatim Uber copy reference (every real-app string extracted from the screen recording, organized by screen): `uber-copy-reference.md`
- Wayfare design canvas (parallel original-identity system, non-Uber-branded) — spec in `wayfare-design-feature-spec.md`. Canvas: https://claude.ai/design/p/09401b99-37f6-4afc-897f-1362bcb542d4?file=Order+Tracking+Board+v2+Dark.dc.html
- Working engine-backed prototype (per-mode surge chips implemented 2026-09-15): `app.html`

## Status Overview

**PRD is at v4 (2026-09-15) — per-mode surge modeling added.** Surge is no longer forecast and shown as one multiplier per route; it's modeled and displayed independently per ride mode (Bike/Two-wheeler, Auto/Three-wheeler, Go/Premier/Standard). This was motivated by the CCI 2022 cab-aggregator market study, which found Indian riders substitute *transport mode entirely* under surge (metro, personal vehicle, street auto) rather than mostly waiting. v1 scope: the three tiers the app/design already model — Two-wheeler, Three-wheeler, Standard (mapping to Bike/Auto/Go+Premier). Full reasoning in `prd.md` and `wayfare-design-feature-spec.md`.

The Wayfare canvas has since been manually verified (via screenshot) to carry the per-mode chips on `B1s` and `S2`, matching `app.html` and the spec doc — all four artifacts (PRD, design spec, live canvas, app) are now in sync as of 2026-09-15/16.

All 9 existing screens exist as editable Figma frames (Android-only, 412×917), rebuilt by hand via browser automation from the HTML prototype's exact CSS values and the verified copy reference. Frame 01 (Uber Home) was subsequently rebuilt in more detail against real screenshots, and is now being corrected a third time against an actual screen recording — see Changelog.

---

## NOW — Spec, Design, and Engine Build (Week 1-2)

| Item | Status | Notes |
|---|---|---|
| PRD v2 (restructured spine) | Done (2026-09-07) | Route forecast primary, commute push secondary; business-tension section added |
| PRD v4 (per-mode surge modeling) | Done (2026-09-15) | Every ride tier gets its own multiplier, not one route-level number; motivated by CCI 2022 mode-substitution research |
| Platform scope | Decided: Uber only | Narrowed 2026-08-31 once it was clear nearly all verified research and the seed dataset were Uber-specific |
| Design: in-app forecast strip | Done | Implemented on the Wayfare canvas and in `app.html`; per-mode chip variant specced and verified live on canvas |
| App: per-mode multiplier chips | Done (2026-09-15) | `app.html`'s `B1s`-equivalent ride-selection sheet and the `S2` "Cheaper right now" list both show a colour-coded chip per tier instead of one shared multiplier |
| Wayfare canvas: per-mode chip redraw | Done (2026-09-16) | Principle 7 added to legend; `B1s` and `S2` boards both carry per-tier chips, verified by screenshot |
| Resolve seed-data question | Recommended, not yet confirmed | Boston "Uber & Lyft" dataset filtered to Uber-tagged rows, plus a small self-logged sample later |
| Resolve per-mode seed-data volume | Not started — new (v4 open question) | Need to confirm the filtered dataset has enough rows per tier (not just per route) to forecast each tier's sensitivity confidently |
| Forecast engine (shared by both surfaces) | Partially built | `app.html` implements per-tier `tierMult(surge, sens)` with hand-set sensitivity constants (0.25/0.55/1.00) — real but not yet data-fit |
| Notification/forecast simulator (P0) | Done (2026-11-17) | "Push alerts · commute simulator" panel in `app.html` generates advance / last-call / all-clear from the same engine, per ride type, with quiet hours; routes with no learned commute stay silent |
| Pickup-point recommendations (PRD §10) | Built as simulated demo, surge-driven case only (2026-11-17) | Pickup-point list plus the surge-driven shift (2 to 8 min walk, 0.30 zone-surge drop, 1.0× floor, ₹15 minimum saving) for every ride type, with simulated availability. Checked across 80,640 scenarios with 0 violations (`eval/pickup_sweep_report.md`). Re-quotes the price on arrival. The access-driven case was dropped. Zone prices and supply are hand-set: no per-cell data exists |
| Naive-baseline comparison | Not Started | Run against the filtered public dataset first, before India data exists |
| Mockup screens — push surface | Done | 9 screens, Uber-only; covers the secondary surface |
| Figma editable mockup (all 9 screens, Android) | Done (2026-09-01) | Rebuilt frame-by-frame via Chrome browser automation |
| Figma Frame 01 (Uber Home) detail pass | Done (2026-09-01) | Rebuilt against real Uber home-screen screenshots |
| Figma Frame 01 video-accuracy pass | In progress (2026-09-05) | Header tabs fixed and verified; several corrections still open — see `frame01-design-spec.md` |
| Small self-logging sample | Scoped down, not started | You + 2-3 people, ~1 week, Uber only |

**Critical path now:** the **seed-data go-ahead, including per-mode volume** (without it nothing quantitative can be computed for any tier), and fitting the per-tier sensitivity constants to real data instead of hand-set values.

---

## NEXT — Calibration & Eval (Week 2-3)

| Item | Status | Notes |
|---|---|---|
| Layer in self-logged sample once available | Not Started | Calibrate risk thresholds (High/Medium), now per mode as well as overall |
| Calibrate forecast horizon + confidence floor | Not Started | Decide 30/60/90-min horizon, route-matching granularity, and the confidence level below which the product stays silent — per mode |
| Finish naive-baseline-vs-model eval | Not Started | Precision/recall, documented in the eval sheet |
| Measure forecast coverage | Not Started | % of destination-set sessions where a confident forecast is possible, now reported per mode as well as overall |
| Decide v1 mode set formally | Not started — new (v4 open question) | Working assumption is Two-wheeler/Three-wheeler/Standard (all three the app currently models); confirm before eval work locks in around it |
| Line up real user feedback sources | Not Started | 2-3 Uber-using people beyond yourself; on the critical path for the required deliverable |

---

## LATER — Deliverables (Week 3-4)

| Item | Status | Notes |
|---|---|---|
| Eval sheet | Not Started | Required deliverable — now needs a per-mode breakout, not just per-route |
| Real user feedback | Not Started | Required deliverable — the one stressed hardest. Add a question on whether they'd still trust a forecast after seeing one be wrong, and whether seeing per-mode prices changes which ride they pick |
| Loom walkthrough | Not Started | Now leads on the in-app forecast, with push alerts as the follow-on; should show the per-mode chips as a headline v4 addition |
| Working demo (simulator + mockup, wired together) | Not Started | Required deliverable |

**Explicit non-goals:** Ola/Rapido support, cross-platform comparison, guaranteed forecasts on thin-data routes, price-lock as a real financial commitment, dedicated bike-taxi prediction, driver-facing companion, real production integration, structural mode-choice modeling (v4) — full rationale in `prd.md`.

---

## Risks & Dependencies
- **Seed-data decision is the critical path for the engine**, and now has a second dimension: enough rows per mode, not just per route, to trust a per-tier sensitivity estimate.
- **Forecast coverage is an unknown risk**, now potentially compounded per mode — a route could have enough volume overall but too little for a specific tier (e.g. few Three-wheeler trips logged on a route dominated by Standard).
- **A wrong forecast costs more than no forecast.** Hedged language and confidence gating are correctness requirements, not polish — applies per mode now too.
- **Tight 2-4 week window** — v1 scope must stay disciplined. If it compresses, the commute push surface is the designated cut (its screens are already built, so cutting it loses nothing already spent); a second lever now available is shrinking the v1 mode set further (e.g. Auto + Standard only) if per-mode data proves too thin for three tiers.
- **Modeled, not measured, impact** — the ₹-saved figure and driver-impact reasoning remain honest estimates throughout, including mode-shift savings.
- **The per-tier sensitivity constants in `app.html` (0.25/0.55/1.00) are currently hand-set, not fit from data.** This is the open question PRD v4 flags about seed-data volume — resolving it means replacing these constants with real per-tier estimates.
- **Figma sharing** — the file's link currently grants access to Dhruva's team/team-folder only, not "anyone with the link." Widen before sending to recruiters outside the org.
- **Figma/Design-canvas browser-automation stability** — this tooling has repeatedly been unstable across sessions (renderer freezes/timeouts, a couple of accidental mass-duplication incidents caught and undone via Ctrl+Z). Verify state via screenshot after every risky edit; don't trust scroll/zoom automation on the canvas, pan manually when verifying.

## Changelog
- **2026-08-29:** First roadmap created (Now/Next/Later, data-collection-led).
- **2026-08-29:** Resequenced — PRD, design, and simulator build moved to Now; data collection scoped down; 2-4 week timeline set. PRD v1 drafted (`prd.md`).
- **2026-08-29:** Mobile mockup screens built and verified in Figma (Route Setup, Home/Risk view, Advance notification, Last-call notification).
- **2026-08-31:** Figma connector disconnected; rebuilt all 4 screens as a single interactive, click-through HTML prototype and published it.
- **2026-08-31:** Platform scope narrowed to Uber only (was single-platform-per-user, Uber/Ola/Rapido selectable). PRD, mockup app picker, and brainstorm notes all updated to match.
- **2026-08-31:** Restyled the prototype against a real Uber app screen recording (dark/monochrome theme, search-pill and list-row patterns, white CTA buttons) and reference images of Uber's iOS Live Activity notifications.
- **2026-08-31:** First pass was an approximation, not an exact match — corrected by pixel-sampling colors directly off the video frames (Python/PIL). Fixed real values: app background `#161616`, pill fill `#282828`, primary CTA `#c2c2c2`. Added the real two-pill search row. Flagged two honest ceilings on exact replication: Uber's proprietary typeface and its trademarked logo.
- **2026-08-31:** Full copy audit of the same recording — every real-app string catalogued in `uber-copy-reference.md` — and used to rewrite Screen 1's field labels toward Uber's real sentence-case, name+value pill convention.
- **2026-08-31:** Expanded the prototype from 4 to 8 screens, adding three invented screens plus an intro banner.
- **2026-08-31:** Course-corrected on feedback that the invented screens went beyond "Uber's real UI, nothing extra." Removed all three plus the banner. Final structure (9 screens): Surge Alert's own UI appears in exactly two places — the home-feed card and the two lock-screen notifications — everything else is a faithful verbatim recreation of real Uber screens.
- **2026-09-01:** Rebuilt the entire 9-screen mockup as editable Figma frames, Android dimensions (412×917), via Chrome browser automation. New file: "Surge Alert - Uber UI Reference." Frames 01-05 real-Uber recreations; Frame 06 Route Setup; Frames 07-09 Surge Alert's own UI. Note: file sharing is team-only — widen before sending externally.
- **2026-09-01:** Rebuilt Figma Frame 01 (Uber Home) in much greater detail against two real home-screen reference screenshots — added the bottom nav bar, the 8-icon "For you" promo grid, and an "Outstation getaways" section.
- **2026-09-05:** Dhruva supplied an actual screen recording of the real Uber app and asked for the Figma frames to match it exactly, Home first. Pixel-analysis of extracted frames surfaced several inaccuracies in Frame 01: header tabs are a centered group with the underline spanning icon + text (fixed and verified); still open — the two address cards should be one card with two rows and a divider, the "For you" arrow should be a small chevron after the heading, the icon grid needs relabelling/rebadging (red tag-style badges, "Seniors" → "Intercity"), and overall vertical spacing is ~160px too compressed. Full detail in `frame01-design-spec.md`. Tooling was unusually unstable this session.
- **2026-09-07:** Documented the parallel Wayfare Claude Design canvas (an original, non-Uber-branded system built on the same UX patterns) in `wayfare-design-feature-spec.md` — overview and the full "A · Entry" section captured; B/C branches and page 2 still unexplored due to canvas-automation instability.
- **2026-09-07:** PRD restructured to v2 — the spine changed. The in-app route fare forecast (shown when a rider sets any destination) is now the primary flow; the commute push alerts are a secondary surface running the same engine on a schedule. Added an explicit business-tension section with a hard product rule: no "wait" message ships without an intent-capture action attached. Known consequence: the primary surface is now undesigned — the existing 9 screens cover the push surface only.
- **2026-09-07:** Cross-checked PRD v2 against the Wayfare base design and folded the design's structural rules into the spec. Surfaced one blocking conflict: the base design treats surge as an opt-in tip ladder while the PRD forecasts a multiplier capped at India's 2x ceiling — recommending the multiplier is kept.
- **2026-09-07:** Read the updated Wayfare canvas. The canvas now implements the v2 spine directly and is ahead of the PRD in three ways: a new `S · Surge, over time` section, a `B1s` surge variant, and receipt-level surge transparency at `D2`. PRD updated to match — the "primary surface undesigned" gap is closed.
- **2026-09-07:** Pricing-model conflict resolved. The built design uses multipliers throughout, matching the PRD; the tip ladder survives only as `C1`'s matching-speed lever.
- **2026-09-09:** Verified the canvas against its source file. Legend updated to "Surge shown as an explicit multiplier..." and a new `S0` "Silent · confidence too low" board demonstrates confidence gating.
- **2026-09-09:** Rewrote `wayfare-design-feature-spec.md` from the canvas source, correcting several screenshot-derived inferences. Board count is now 16 across five lanes (A/S/B/C/D).
- **2026-09-09:** Scope decision — P1 pulled into the current build (reason chips, alert-lifecycle notifications, bounded fare hold). Zone-shift and the rich unfamiliar-route forecast both moved to v2.
- **2026-09-09:** Cut the fare-hold / price-lock feature entirely, moved to an argued non-goal on three stacking grounds tied to MVAG 2025 driver revenue-share rules.
- **2026-09-09:** Added alternate-route choice with price comparison to P2.
- **2026-09-07:** Decided against a dedicated onboarding page asking riders for commute timings — inferred from saved places and booking behaviour instead.
- **2026-09-15:** PRD v4 — per-mode surge modeling. Motivated by the CCI 2022 study's mode-substitution finding. Woven through eligibility, all three forecast surfaces, capture behaviour, and success metrics in `prd.md`. `app.html` updated the same day: `B1s` and `S2` now show a colour-coded multiplier chip per tier. `wayfare-design-feature-spec.md` updated to match (new principle 7).
- **2026-09-16:** Drove the Wayfare canvas's own in-app chat agent (via Chrome automation) to apply the per-mode chip change directly to the live canvas boards (`B1s`, `S2`, and the legend). Verified by screenshot that Standard shows 1.8× (red), Three-wheeler 1.4× (amber), Two-wheeler 1.05× (green) with "Least affected" as an added highlight, and that S2's alternate correctly shows 1.2× (amber) rather than being forced green. All four artifacts (PRD, design spec, canvas, app) are now in sync.
- **2026-11-12:** First independently-reproduced naive-baseline eval (`eval_report.md` v1), with a new per-mode breakout not previously scoped. Engine scored 83.7% F1 vs. 62.0% baseline. Flagged the opaque, unsourced `EVAL` constant already hardcoded in `app.html` as not citable on its own.
- **2026-11-12:** Live demo deployed to Vercel (`surge-alert.vercel.app`) and project pushed to a public GitHub repo, closing the gap between "has a prototype" and "has a shareable link." Built a standalone feedback-collection tool (Claude Artifact + shared database) to gather the real-user-feedback deliverable the roadmap stresses hardest.
- **2026-11-17:** Found and fixed a real product bug during manual testing: toggling Rain/Event in the live prototype changed the forecast's confidence but never its price. Root cause — the seed dataset never encoded an actual rain/event effect on the "true" multiplier, so the engine's strict (same-conditions) match tier almost never cleared 8 observations and silently fell back to a conditions-blind match. Rebuilt the synthetic dataset (`generate_data.py`) with a real rain/event effect and ~10x the row density (137k vs 13.6k rows), re-ran the full eval (`eval_report.md` v2: engine 94.8% F1 vs. 79.3% baseline, Two-wheeler per-mode F1 up from 43.8% to 86.6% as a direct consequence of the fixed data, not a changed model), and pushed the fix to both the GitHub repo and the live Vercel deploy.
- **2026-11-17:** Built both PRD v5 pickup features and the Section 8 notification simulator into `app.html`. Per-ride-type behavior is a direct consequence of the existing hand-set tier constants plus one new one (`access`): Two-wheeler (Bike / Scooty / Bike Saver all map to this one tier) gets neither pickup card; Three-wheeler gets only the main-road tip; cars get both. Testing the simulator surfaced a real flaw, a rainy morning scheduled an advance alert for 3:45am, so alerts now respect quiet hours (nothing before 6:00am). Also cached the engine's `forecast()` since the new features call it dozens of times per render on the 137k-row dataset.
- **2026-11-17:** Reworked the pickup features to the product owner's rules: a selectable list of nearby points (metro exits and the like), then case 1 (surge-driven, up to a 5 min walk, needs a 0.30× lower surge against a 1.0× floor) and case 2 (access-driven, up to 3 min, at least ₹10 cheaper, shows without surge, price drop from a walk discount). Second research pass found no ride-hailing source for a maximum walk, so the 5 min cap rests on transit planning norms and Indian pedestrian speeds, stated as transferred evidence. Added a simulated availability model and an exhaustive sweep of 69,120 scenarios, which found 0 rule violations and surfaced two design consequences: autos almost never see case 1 (price dampening), and six-seaters are mostly gated by a hand-set supply factor. Open items recorded in the PRD: who funds the walk discount, and whether the surge-drop rule should apply to the underlying zone surge.
- **2026-11-17:** Applied the 0.30 surge-drop rule to the underlying zone surge instead of each ride type's dampened multiplier, after the first sweep showed autos almost never qualified (106 of 13,824). Auto case 1 is now 755; two-wheelers stay off through an explicit per-ride-type flag, so the earlier decision holds. Re-ran the full 69,120-scenario sweep: 0 violations.
- **2026-11-17:** Product owner dropped the access-driven main-road case entirely and extended the surge-driven shift to every ride type, reversing the earlier keep-bikes-off decision. Removed the case, its walk discount, the lane flags and the ride-type access factor from `app.html`, and rewrote PRD Section 10, the design spec and the sweep to match. Re-ran all 69,120 scenarios: 0 violations. Consequence to watch: two-wheelers now see the card in 854 scenarios but save only ₹7 to ₹28.
- **2026-11-17:** Added a ₹15 minimum fare saving to the surge-driven pickup shift and made the shown price use the 1.0× floored surge explicitly. The floor only affects two-wheelers (508 scenarios blocked; their firings fell from 854 to 346). Re-ran all 69,120 scenarios: 0 violations. Logged two open gaps in the PRD: the quoted saving can go stale (surge moves, and many riders converging on one zone raises its surge), and the base fare is assumed identical across pickup points.
- **2026-11-17:** Built re-quote on arrival for the pickup shift, closing the stale-price gap: the rider walks (simulated), the app re-prices with the forecast at the arrival time, and warns with a go-back option if the saving no longer clears 0.30× and ₹15. Extended the sweep to re-quote every firing scenario at three levels of other riders piling on: with none, 97% still hold; with some, 31%; with many, none. That sensitivity rests on hand-set erosion factors, so it is a warning, not a measurement. 0 violations across 69,120 scenarios.
- **2026-11-17:** Product owner set the walk window for the pickup shift to 2 to 8 minutes (was a 5 minute cap): points under 2 minutes are treated as the same spot, and the cap rises to 8. The research supports about 5 minutes and nothing for ride-hailing beyond it, so the 8 is recorded as an unvalidated owner choice. Added a 1 minute and a 9 minute test point so both edges are exercised, and re-ran the sweep on 80,640 scenarios: 0 violations, neither edge point ever recommended.
- **2026-11-17:** PRD v5 — pickup-point recommendations added as Section 10, split into two sub-features with different data requirements and different honesty obligations: **10a fare-driven zone-shift** (walk to a cheaper adjacent pickup point when local surge is high — pulls the old "Zone-shift" non-goal into scope, but the per-cell data gap it was deferred for is still unresolved, so this ships as a demo placeholder until that's decided) and **10b access-driven main-road shift** (interior lane → main road, modeled on Uber's real, documented Jaipur pickup-point system, extended here to also show a fare difference where one exists). Research for this version corrected an assumption going in: **no sourced evidence that Rapido ships either feature** — its surge product (Power Pass) is an unrelated paid flat-fare subscription. The walk-distance ceiling (~2-3 min / 1-2 blocks) is a transferred estimate from Uber's own Express POOL research and Via's observed pickup-walk data, not India- or surge-specific — stated as such in the PRD rather than passed off as a measured number.
