# Uber App — Verbatim Copy Reference (from user's screen recording)

Every string below was read directly off frames extracted from Dhruva's own screen recording of the real Uber app (Bengaluru, rider side, Android) — nothing paraphrased or invented. Purpose: give the Surge Alert prototype (`surge-alert-prototype.html`) a verified source of truth for wording, capitalization, and tone whenever a screen needs to sit inside — or next to — Uber's real UI, and to flag Uber's actual copy voice so any *new* Surge Alert copy can match it convincingly.

Companion docs: `prd.md`, `roadmap.md`, `brainstorm-notes.md`. Design references (already color-verified against these same frames): Figma file + HTML prototype, linked in `roadmap.md`.

---

## Home screen

**Tab row:** `Uber` (active) · `Parcel`

**Search bar:** `Where to?` (placeholder, search icon) — `Later` (pill button, calendar icon, own capsule to the right of the search bar)

**Saved/recent destination row** (appears once a destination has been used): a clock icon, the place name bold (`NEXTDOOR MULTIVERSE - CO LIVING PG`, truncated with `…` and a `>` chevron), address below in muted grey (`Krishna Reddy Layout, Amar…`)

**"For you" row** — section header `For you` with a `→` icon, then a horizontal row of circular icon buttons, label under each, small red ribbon badge for promos:
- `Bike Saver`
- `Auto`
- `Ride` — red `25%` ribbon
- `Bus & Train` — red `Promo` ribbon
- `Parcel` — red `50%` ribbon
- `Teens`
- `Reserve` — red `9%` ribbon
- `Seniors`

**"Outstation getaways"** — section header, horizontal card carousel, each card: photo, place name bold, `Starting at ₹<price>` in muted grey below:
- `Nandi Hills` — `Starting at ₹799`
- `Coorg` — `Starting at ₹4,999` (approx, truncated)
- `Ooty` — `Starting at ₹4,999`
- `Chikm[agalur]` (truncated in frame)

**Promo banner** (full-width, warm yellow/tan card, black text, black pill CTA):
> `Quality rides,`
> `every time`
> Button: `Book Intercity`

**"Save every day"** — section header, two-up photo cards, title bold + one-line muted subtitle each:
- `Auto rides` — `Upfront fares, doorstep pickups`
- `Uber Bike rides` — `Affordable motorcycle pickups` (also seen as `Affordable mo…`, truncated — same card)
- `Add a stop or 5` — `Pick up something along the way`

**"More ways to use Uber"** — section header, same two-up card pattern:
- `Send a Parcel` — `On-demand delivery across town`
- `Elevate your…` — `Go ex-luxe-ive` (truncated, wordplay on "exclusive" — premium-tier promo)
- `Insure your rides` — `₹10L coverage, OPD & more, TCA`

**Bottom tab bar:** `Home` (active, filled icon + white label + pill highlight) · `Services` · `Activity` · `Account` (small blue notification dot on the icon)

---

## Vehicle / ride selection ("Gathering options" → list)

**Loading state (bottom sheet mid-slide-up):** header `Gathering options`, then skeleton/shimmer placeholder rows while options load — no other copy visible until loaded.

**Loaded state, compact ("Gathering options"):**
- Promo strip: `₹8.00 promotion applied` with an info `ⓘ` icon
- Rows: icon, name bold, one metadata line below (time/capacity), price or a grey skeleton pill on the right
  - `Bike Saver` (helmet/clock icon)
  - `Auto` — `11:44pm · 3 min`
  - `UberXL`
  - `Scooty`
- `Personal ride` (small pill/chip, own row)
- Full-width CTA: `Choose Bike Saver` (button label changes to match whichever option is selected/highlighted)

**Loaded state, expanded ("Reserve a ride" list — same "Gathering options" sheet pattern, seen after choosing a future pickup time):**
Header: `Reserve a ride`
Each row: icon, name bold + small grey capacity icon+number, `Pickup at <time>[, <date>]` on the line below, one-line grey description under that, price right-aligned:
- `Auto` 👤3 — ₹138.18 — `Pickup at 10:45 AM, Tue, Sep 1` — `No bargaining, doorstep pick-up`
- `Go Non AC` 👤4 — ₹236.18 — `Pickup at 10:45 AM` — `Everyday affordable rides`
- `UberXL` 👤6 — ₹451.70 — `Pickup at 10:45 AM` — `Affordable rides for groups up to 6`
- `Uber Go AC` 👤4 — ₹257.72 — `Pickup at 10:45 AM` — `Affordable compact AC rides`

Section header mid-list: `Economy`
- `Premier AC` 👤4 — ₹298.63 — `Pickup at 10:45 AM` — `Comfortable sedans, top-quality drivers`
- `Go Rentals` — ₹557.50 — `Pickup at 10:45 AM` — `1 hr/10 km` — `Hire Hatchbacks by the hour`
- `Premier Rentals` — ₹675.00 — `Pickup at 10:45 AM` — `1 hr/10 km` — `Hire Sedans by the hour`
- `XL Plus Rentals` 👤6 — ₹1,339.90 — `Pickup at 10:45 AM` — `2 hrs/20 km` — `Hire spacious, comfortable Innovas by…`
- `XL Rentals` — ₹745.00 (row cut off in frame)

**Payment row** (pinned above the CTA): person icon, `Personal`, small bag/briefcase icon, `Cash`, `>` chevron

**Primary CTA (full-width, light grey pill, black bold text, verified color `#c2c2c2`):**
`Reserve Auto` (label changes to match the selected/highlighted vehicle — the pattern is `Reserve <VehicleName>`)

---

## "Reserve a ride" flow (scheduled pickup)

**Entry screen** (illustration: a traveler with a suitcase, car, palm trees):
Header: `Reserve a ride`
Primary CTA (same light-grey pill): `Reserve a ride`

**Location entry screen:**
Header: `Reserve a ride`
Two stacked fields (dot + line + square markers on the left, like a route diagram), each a rounded dark-grey pill:
- `Pickup Location` (placeholder) → once filled: the real address, e.g. `NEXTDOOR MULTIVERSE - CO L…`
- `Destination` (placeholder) → once filled: e.g. `514, 5th Main Rd`
- Small `+` circular button to the right (add a stop)
- An `×` clear icon appears in a filled field

**"Choose a time" screen:**
Header (large, bold, page-title style — not a small-caps label): `Choose a time`
Subhead (small, regular weight, muted): `Choose your pickup time:`
Segmented control (two pill tabs, active one has a white outline): `Pickup at` / `Dropoff by`
Time picker: three-column spinning wheel — `Today` / `Tue, Sep 1` (date column) · hour · minute · `AM`/`PM`, center row highlighted in a dark pill
Summary line below the picker: `<time> IST dropoff time` (e.g. `11:59 PM IST dropoff time`)
Sub-line: `About 10 min ride`
Policy microcopy above the CTA — **two variants seen** (likely A/B or state-dependent):
  - Short: `Cancel for free up to an hour before pickup. ` + underlined link `Cancellation policy`
  - Long: `Standard Reserve Cancellation Policy: No cancel fee up to an hour before pickup or anytime before your driver is assigned. ` + underlined link `See Terms`
Primary CTA (light grey pill, verified `#c2c2c2`): `Continue`

---

## Other screens

**Activity tab:** header `Activity` (large, bold) — content still loading/skeleton in every frame captured, no further copy visible.

**Account tab:** skeleton/shimmer only in every frame captured — no copy visible. Bottom tab bar visible: `Home` · `Services` · `Activity` · `Account` (Account active here).

**Full-screen loading interstitial:** header `Hello` (large, bold, top-left, back arrow above it) — center: `Looking for reservations` (small, muted, centered).

---

## Voice patterns worth carrying into Surge Alert's own copy

Even where a Surge Alert screen has no real Uber equivalent (there is no "surge risk" concept in the real app), these are the load-bearing conventions in every string above — worth matching so our own cards read as if they belong in the app:

1. **Sentence case everywhere**, including button labels (`Continue`, `Choose Bike Saver`, `Reserve Auto`) and section headers (`Choose a time`, `For you`) — never Title Case, never all-caps except tiny functional labels don't actually appear this way in Uber's own UI (Uber doesn't use small-caps field labels the way our current Screen 1 does — see note below).
2. **Buttons name the specific outcome, not a generic verb** — `Reserve Auto`, `Choose Bike Saver`, `Book Intercity`, never a bare "Confirm" or "Submit".
3. **Prices and times are always concrete, never rounded for copy's sake** — `₹236.18`, `10:45 AM`, `11:59 PM IST` — Uber shows the real number even when it's an odd one.
4. **One short muted sub-line under every bolded title** — never more than one line of secondary copy per row (`Everyday affordable rides`, `Upfront fares, doorstep pickups`).
5. **Policy/legal microcopy is short, plain-language, and pairs a fact with a link** — `No cancel fee up to an hour before pickup … See Terms`, not a paragraph.
6. **No exclamation points, no emoji, no "Oops!" register anywhere** — even loading and empty states stay flat and factual (`Looking for reservations`).

**One real gap in our prototype's current copy:** Screen 1 ("Set up your commute") uses small-caps grey field labels (`ROUTE`, `USUAL DEPARTURE`, `USUAL RETURN`) sitting above each field. Real Uber never does this — its closest analogue (`Choose a time`) uses one large bold page title + one plain sentence, then lets the control itself (the segmented pill, the picker) carry the meaning with no separate label at all. Worth revisiting if the goal is to make Screen 1 feel native rather than "close but recognizably a form."
