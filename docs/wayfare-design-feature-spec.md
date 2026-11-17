# Wayfare — Design & Feature Specification

## Product principles (canvas legend, "Carried over from the recording")

1. Map is permanent; every state is a sheet above it.
2. Origin/destination as a linked two-field stack.
3. Ride list: art, name, seat count, ETA, price right-aligned.
4. Persistent rider/payment bar above the primary CTA.
5. **Forecast is earned: no confident pattern, no widget.**
6. **Surge shown as an explicit multiplier, with a tip ladder only as the stalled-match escalation.**
7. **Every ride tier carries its own live multiplier (added 2026-09-15).** Surge is no longer one number scaled by a fixed ratio behind a single binary "Least affected" tag — each row in `B1s` shows its own struck-through pre-surge price *and* its own multiplier chip (e.g. `Two-wheeler 1.05×`, `Three-wheeler 1.4×`, `Standard 1.8×`), colour-coded low/medium/high. "Least affected" stays as a highlight on whichever tier has the lowest chip — it no longer stands in for the number. A tier's chip is omitted, not zeroed or guessed, when that tier fails eligibility for the route/time. Same treatment applies to the "Cheaper right now" alternates list on `S2`. v1 ships this for the app's existing three tiers — **Two-wheeler, Three-wheeler, Standard** — matching the PRD v4 recommended scope (Bike / Auto / Go+Premier). Prototyped live in `app.html`, and verified live on the Wayfare canvas itself (2026-09-16).

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

## Added 2026-11-17 — pickup-point cards and commute alerts (prototype only)

These exist in `app.html` and are **not yet drawn on the Wayfare canvas**; the canvas boards above are unchanged. Treat this section as the spec for the next canvas pass.

**8. Pickup points and the surge-driven recommendation sit on the ride-selection sheet (`B1s`), between the surge banner and the tier list, and are evaluated for the selected ride type.** Silence is a designed state: when nothing qualifies, no card shows, and a dashed one-line note says why (for example the zone surge at the spot is too low, or how many points were unavailable, too close, too far, or saved too little).
- **Pickup points near you** (list card): one row per point with its walk time, the rider's own spot marked "here", the selected row in lime. Points with no drivers nearby are greyed out with "No drivers nearby right now" and cannot be selected. The sheet subtitle ("Pickup · `<point>`"), banner multiplier, and every tier price follow the selected point.
- **Cheaper pickup nearby** (lime-accent card): "Walk ~N min to `<point>`", then `<here multiplier>` struck through → `<there multiplier>`, "about ₹X less (₹a → ₹b)", primary action "Navigate to pickup point". Footer discloses that zone prices are simulated and states the zone-surge drop and the walk cap.
- **Walking and re-quote** (replaces the recommendation card once the rider taps navigate): "Walking to `<point>`", the walk time and quoted price, a line that prices can move, and actions "I've arrived · re-quote" and "Stay at `<origin>`". On arrival one of three cards follows: price confirmed or updated (lime, old and new price shown, "Continue"), price changed (ember, "Book here anyway" and "Back to `<origin>`"), or "Couldn't re-quote" when the forecast is silent.
- An access-driven "Easier pickup" card was specced here earlier and removed on 2026-11-17 along with the feature.

**9. Commute notifications are lock-screen style cards**: app name and delivery time on one line, bold title, grey body, a mono-caps kind label (Advance alert / Last call / All clear · P1) and a "Show phone at `<time>`" action that sets the phone's clock to that moment. Copy shifts tense when quiet hours push delivery past the onset ("began climbing", "may already be building"). The same card also pops up on the phone as a banner under the status bar once the clock passes its time (shown for 60 minutes, dismissible, tapping it goes home).

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

The canvas implements the PRD v4 spine directly, including the per-mode multiplier chips (principle 7, `B1s`, `S2`'s alternates list) — verified live on the canvas on 2026-09-16, matching `app.html` and this spec doc.

**One open item:** the expressive forecast surface is still commute-gated — S1 opens "Your usual 9:15 commute," which serves the PRD's *secondary* persona. The primary persona (any rider, any route, no history) currently gets only the compact `B1s` banner, with no chart and no "leave by X" recommendation.
