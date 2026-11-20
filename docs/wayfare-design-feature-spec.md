# Wayfare — Design & Feature Specification

## Product principles (canvas legend, "Carried over from the recording")

1. Map is permanent; every state is a sheet above it.
2. Origin/destination as a linked two-field stack.
3. Ride list: art, name, seat count, ETA, price right-aligned.
4. Persistent rider/payment bar above the primary CTA.
5. **Forecast is earned: no confident pattern, no widget.**
6. **Surge shown as an explicit multiplier, with a tip ladder only as the stalled-match escalation.**
7. **Every ride tier carries its own live multiplier (added 2026-09-15).** Surge is no longer one number scaled by a fixed ratio behind a single binary "Least affected" tag — each row in `B1s` shows its own struck-through pre-surge price *and* its own multiplier chip (e.g. `Two-wheeler 1.05×`, `Three-wheeler 1.4×`, `Standard 1.8×`), colour-coded low/medium/high. "Least affected" stays as a highlight on whichever tier has the lowest chip — it no longer stands in for the number. A tier's chip is omitted, not zeroed or guessed, when that tier fails eligibility for the route/time. Same treatment applies to the "Cheaper right now" alternates list on `S2`. The prototype now ships five tiers: **Two-wheeler, Three-wheeler, Standard, Sedan, Six-seater**, each forecast from its own simulated history. Prototyped live in `app.html`, and verified live on the Wayfare canvas itself (2026-09-16).

Principles 5 and 6 were added on 2026-09-07 in response to the PRD. They resolve what had been a genuine conflict: an earlier legend claimed surge was "an opt-in tip ladder, not a multiplier," which contradicted the boards themselves. Principle 7 was added 2026-09-15 in response to the PRD v4 per-mode surge change, and verified rendering correctly on the canvas itself on 2026-09-16.

Legend colours: green = main path, red = branch.

---

## Board map

### A · Entry — services surface → plan a ride → address entry
- **A1 Services** — ride-type grid (Two-wheeler, Three-wheeler, Car, Transit, Reserve, Teens, Hourly, Metro) plus a **"Send something"** subsection of two 44px rows: Courier, Store pickup. Promo badges read **25% / 7% / 40%** as lime `#c8f24c` tags, not green pills.
- **A2 Plan your ride** — linked origin/destination stack ("Nextdoor Multiverse Co-Living" → "Where to?"), Saved places, and address rows each carrying a **distance in the left gutter** (9.1 mi, 2.1 mi, 1.8 mi, 2.2 mi). Footer: "Search a different city", "Set location on map".
- **A3 Typing a destination** — Reserve-a-ride header, "For me" selector, live-filtering address list with a clear (✕) affordance.

### S · Surge, over time — "the same home screen an hour before, during, and after the peak"
This lane is the Surge Alert feature.

- **S0 · Silent · confidence too low** (1:47am) — home screen with **no forecast widget at all**; Saved places, Add a place, Suggestions (Ride, Courier), and one line: *"No fare pattern for 1:47am on this route yet — we'll flag surges once we're sure."*
- **S1 · Before (8:12am), forecast** — "Your usual 9:15 commute" · "Fares to Embassy Tech Village will likely hit **1.7×** by the time you leave" · chart running 1.1×→1.7× across 8:15-9:30 · "Leave by **8:30** and you'd pay about **₹212** instead of ₹360" · actions **Reserve 8:30** / **Alert me at 1.0×**
- **S2 · During (9:15am), peak** — "Surging now · **1.7×** · ₹360 right now" · chart now→1.0× across 8:45-10:00 · "Easing off in about **45 min**" · actions **Alert me at 1.0×** / **Book anyway** · **"Cheaper right now"**: Two-wheeler — own multiplier chip (colour-coded, currently 1.2× amber), 4 min away, ₹222
- **S3 · After (10:04am), cleared** — "Your alert fired · **1.0×** · ₹212 — back to normal" · "**Waiting saved you about ₹148**" · action **Book now · ₹212**

### B · Selection — route drawn → tier list → full catalogue → rider & payment
- **B1 Choose a ride** — Standard ◍4 ₹288.45, Three-wheeler ₹381.24, Two-wheeler ₹185.28, Six-seater ₹587.74; rider/payment bar (Personal · Cash) above CTA "Choose Standard".
- **B1s Variant · surge notice, pre-commitment** — banner "**1.8×** · Fares are high right now · Heavy demand · **drops by 3:10am**", actions **Alert me at 1.0×** / **Reserve 3:10am**; every row shows a struck-through pre-surge price (₹519.21 vs ₹288.45) **and its own colour-coded multiplier chip** (Standard `1.8×` red, Three-wheeler `1.4×` amber, Two-wheeler `1.05×` green); the lowest-chip tier additionally keeps the **"Least affected"** tag as a highlight, not a substitute for the number; CTA "Choose Standard · ₹519.21".
- **B2 Full catalogue, sheet expanded** — Hourly (Hatchback / Sedan / Van, with duration-distance allowances), Courier · Bike, Reserve Black, Reserve Six; "₹4.00 promotion applied".
- **B2x Branch · Rider & payment** — modal over dimmed map; Personal/Business profile cards; Cash / UPI / Card list; promo note; Save.

### C · Request & match — the wait, plus the speed-up ladder
- **C1 Ride requested** — "Finding drivers nearby", pickup-instruction card, "Cash · 1.8× surge", and the **tip ladder**: "Add extra to get a faster ride" +₹45 / +₹55 / +₹65, current price ₹290.96, "100% of the extra amount goes to your driver."
- **C1x Branch · No drivers** — "No Standard drivers right now · Demand is high around Marathahalli at this hour." Two alternatives offered, plus a **time-boxed fare hold**: "we'll hold your ₹290.96 fare for 5 more minutes." Actions: Switch to Three-wheeler / Keep waiting.
- **C2 Driver matched** — "Arriving in 4 min", driver row (Ramesh K. · ★ 4.92 · Swift Dzire · KA 05 MJ 8821), 1.8× · ₹519.21, 4-digit PIN, Call/Message/Share, Cancel ride.

### D · Trip & close
- **D1 On trip** — floating ETA card ("Arriving 2:41am · 15 min · 4.2 km left"), drop-off row, Safety / Tools / Share / Message, driver strip.
- **D2 Rate & receipt** — "How was Ramesh?" with anonymous rating and trait chips (Safe driving, Clean car, On time, Great chat); fare breakdown **Trip fare 1.8× ₹290.96 / Base fare at 1.0× ₹161.64 / Promotion −₹4.00 / Paid in cash ₹286.96**; tip ₹20 / ₹40 / ₹60.

---

## Current design (v6, updated 2026-11-21): journeys, pickup suggestions, commute ping

The boards above are the original Wayfare recording. The current design is the **Surge Alert design canvas**, organised as nine journeys (first-time setup; ping starts earlier; ping pause and mute; normal home; home inside the commute window with five ride types; house pickup; station; no suggestion; small shop). The prototype `app/app-uber-ui.html` is canonical; `docs/prd.md` is the rule book. Where this file and the PRD differ, the PRD wins.

**Home screen.** The forecast card and the "See prices for" ride-type chips (Two-wheeler, Three-wheeler, Standard, Sedan, Six-seater) show **only to riders who completed commute setup, and only from 45 minutes before to 30 minutes after a usual time**. At any other time the normal home screen shows: search bar, Later, recent destinations. The Work / Home shortcut follows the same window. The card opens on the rider's usual ride type and says which ride type it shows. Surge card headline is price first, with a small multiplier chip.

**Pickup suggestions (ride-selection sheet, `B1s`).** One card at most, for the selected ride type, shown only when the rider's own zone surge is above 1.1x, the suggested point is 7 to 10 minutes' walk away, its zone surge is at least 0.30x lower (1.0x floor), and the fare saving clears the floor for the ride type (Rs 15 for two- and three-wheelers, Rs 40 Standard, Rs 60 Sedan, Rs 70 Six-seater). The nearest walk wins. The card shows "Walk ~N min to `<point>`", the price here struck through against the price there, and **Book here**, which books at that point at Uber's quoted upfront price; there is no walk-then-re-quote step. A **Not now** link hides the card. Trips of 2.5 km or less get no suggestion. At a multi-gate place the gate list shows on a Confirm pickup page and, only in surge and only after a gate is tapped, one cheaper-gate suggestion. Free waiting time is 5 minutes. Drivers who may take an alternate-pickup booking are limited by the dispatch rule in PRD section 10a (specification only; not in the prototype).

**Commute ping.** One lock-screen style notification per direction per day, 45 minutes before the usual time, never between 12:00am and 6:00am. Title "Busy fares expected on your commute"; body "With `<reasons>`, `<Ride type>` fares to `<destination>` are likely to be high around `<usual time>`. Start by `<usual time minus 30 min>` to avoid the surge." (the "With `<reasons>`," clause is dropped when no reason is known). Actions: **Pause today** and **Mute this commute**; tapping the notification opens the app, and tapping a notification on the canvas opens its screen directly. No multiplier or price appears in the ping. The earlier advance alert / last call / all clear set is retired.

---

## Corrections to earlier versions of this doc

| Earlier claim | Actual |
|---|---|
| B2 is a "Send something" delivery list | "Send something" is a **subsection of A1**; B2 is the full ride catalogue |
| "Pet friendly" was a selectable filter in B2 | It was a **ride tier row** in B2's catalogue (₹430.00), removed because it fell behind the bottom action bar |
| A1 badge reads "26%" | Badges read **25% / 7% / 40%**, as lime `#c8f24c` tags |
| A2 subtitle is "5 min · Ground floor…" | Rows carry a **distance** in the left gutter |
| Surge is handled as a tip ladder, not a multiplier | **Multiplier throughout**; the tip ladder is only C1's stalled-match escalation |
| Surge is one multiplier with a single binary "Least affected" tag | **(added 2026-09-15)** Every tier shows its own multiplier chip; "Least affected" is a highlight on top of the chips, not a stand-in for them |

---

## Relationship to the PRD

The PRD (`docs/prd.md`, v6) is the rule book; the prototype and the design canvas implement it. The original Wayfare boards above are kept as the visual baseline (per-mode multiplier chips on `B1s` and the `S2` alternates list, principle 7).

**Known gap:** the expressive forecast surface is commute-gated: it serves the PRD's primary persona (a rider with a learned commute). Other riders get the compact `B1s` banner on the ride-options screen, with no chart and no "leave by X" recommendation.
