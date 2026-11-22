# PRD: Surge Alert, route fare forecast and timing nudge

> Synced from the Claude Doc version of this PRD (https://claude.ai/artifact/9rpqCbeqtwYE7pRQA31vjD) on 2026-11-22. The doc is the primary copy; its two diagrams (user flow, pickup-shift decision flow) appear only there. The longer version with full rationale, research notes and calibration detail is `docs/prd-detailed.md`.


Nov 21, 2026 · Owner: Dhruva @Dhruva

A forecast engine tells a ride-hailing rider, before booking, whether a surge is normal, whether it will ease, and what to do about it: start earlier, switch ride type, or walk to a cheaper pickup point. Every number below comes from simulated data; nothing is yet measured on real riders.

## At a glance

|  |  |
| --- | --- |
| **Status** | Draft v8. Prototype built; all fare evidence simulated; personas from a rider survey plus verbal interviews |
| **Owner** | Dhruva (solo PM portfolio project) |
| **Platform** | Any ride-booking app; India first. The prototype uses an Uber-style UI as the reference build |
| **Timeline** | 2 to 4 weeks, spec through demo |
| **Prototype** | https://uberuideploy.vercel.app (`app/app-uber-ui.html`) |
| **Design canvas** | Ten journeys, `design/canvas/` in the repo |
| **Evidence** | Simulated fares, surge and drivers (no real fare data yet). Rider survey (19 responses, convenience sample, 13 in Hyderabad) plus 5 verbal, in-person interviews with cab riders; walk timing also draws on 5 friends asked informally. A Bengaluru interview round is still planned |

**Problem.** A rider sees a surge multiplier only when booking, with no context. The choice becomes pay it or abandon, and many riders open a competitor app.

**Solution.** Three things before booking: price context and a short forecast per ride type; a commute ping telling regular commuters when to start earlier; and one cheaper pickup point a 5 to 10 minute walk away (about 400 to 750 m) when surge is high.

**Users.** Primary: riders with a regular commute. Secondary: occasional riders booking one-off trips. Three personas: the two-wheeler price hunter (11 of 19 survey respondents), the auto rider who works around the surge (7 of 19), and the cab rider who plans ahead (6 riders: 5 verbal interviews plus 1 survey response). Cab riders split into commuters (3 of 5 interviewed), who fit the ping and home card, and leisure groups (2 of 5), who walk further and book ahead. All persona evidence is a small convenience sample, Hyderabad-heavy.

**Success.** North star: a surged session ends in a completed trip, not an abandoned or cancelled one. Guardrails cover riders, drivers and the marketplace. Rollout is by zone with a kill switch.

**Unproven.** Driver behaviour is not modelled. The real surge shape across a zone is unknown. Reserve's future-time pricing is unchecked. Kill-criteria numbers need a control-based baseline. Persona sizes rest on 19 survey responses and 5 interviews, not a representative sample.

**Platform scope.** The forecast, ping and pickup-shift rules work in any ride-booking app with fare history, surge or dynamic pricing and pickup points; each app needs its own fare history, ride types and pricing rules. Uber is the reference build because the prototype, the pricing research (Reserve, matching, MVAG 2025) and the design canvas use Uber's flows. The feature works inside one app; comparing prices across apps stays out of scope.

## Problem and background

Today a rider sees a fare's surge multiplier only at booking, with no history attached: no sign whether it is normal for this route and hour, still climbing or easing, or worth waiting out. The decision is made blind and collapses to pay or abandon. A third path exists, opening a competitor app, and it is the worst outcome for the app.

**Current construct.** There is no forecast surface. The rider sees one point-in-time multiplier and fare at ride selection, taken from live pricing, with no history, trend, recommendation or cross-ride-type comparison.

**Limitations of today**

- No way to tell whether the fare is typical or an outlier for this route and hour.
- No direction (rising, falling, flat), so waiting is a guess.
- No action besides book now, so a rider who wants to defer has nothing to hold onto.
- No distinction between a route the system knows well and one it has never seen.
- No per-ride-type view: four live prices with no sense of which is temporarily inflated.
- Existing products cover part of this (for example Uber's US-only Ride Pass) but insulate riders without explaining the fare.

**Why per ride type, not per route.** The CCI 2022 market study (2,000 riders in Delhi, Mumbai, Jaipur and Indore) found that Indian riders facing a surge mostly substitute mode, not time: metro in Delhi, autos in Mumbai, personal vehicles in Tier-II cities. Heavy and frequent riders, this product's primary persona, showed the highest tolerance for waiting. So ride-type switching has to be a real, independently forecast signal, not a tag on one ride.

**Why pickup-point recommendations.** Timing and mode do not cover location: a rider at a high-surge pickup has no way to know a short walk(5-10min) would reach a materially cheaper zone.&#32;

## Users and scenarios

The segments below come from the CCI 2022 study and the owner's observation of friends and family. The personas after them come from two sources: the rider survey (19 responses, a convenience sample: 13 in Hyderabad, 11 two-wheeler, 7 auto and 1 cab rider) and 5 verbal, in-person interviews with cab riders run by the owner. Walk timing also draws on 5 friends asked informally in person. A Bengaluru interview round is still planned.

| Segment | Who | What they need | Surfaces |
| --- | --- | --- | --- |
| **Primary: regular commuter** | Heavy, frequent rider with a learned route and usual times | Know before leaving whether to start earlier; a trustworthy forecast for the ride type they usually book | Commute ping, home forecast card (inside the commute window), ride options |
| **Secondary: occasional rider** | Books a one-off trip, no history | Know whether the fare is high, and whether another ride type or nearby pickup is cheaper | Ride-options banner, per-row multipliers, pickup suggestion |
| **Affected: drivers** | Drivers in and near a surge hotspot | Fair access to rides; not being pulled out of the zone | Dispatch rule for alternate pickups (specification only) |

### Personas from the survey and interviews

Each persona is one ride-type group; counts are riders in that group. The two-wheeler and auto personas come from the survey. The cab persona comes from 5 verbal interviews plus the survey's one cab rider. Evidence behind each: 11, 7 and 6 riders, a convenience sample, Hyderabad-heavy. That is enough to design for and to predict experiment results, not to size the market.

|  | Two-wheeler price hunter | Auto rider who works around the surge | Cab rider who plans ahead |
| --- | --- | --- | --- |
| Respondents | 11 of 19 | 7 of 19 | 6 riders: 5 verbal interviews by the owner (in person, not in the survey spreadsheet) plus 1 survey response. Of the 5 interviewed, 3 are commuters and 2 are leisure group riders |
| Rides | Rs 100 to 200 a trip (8 of 11); 4 to 10 trips a month (7); a regular route for most or all trips (6) | Rs 100 to 400 a trip; 4 to 10 trips a month (6 of 7) | Standard (4 of 6), Sedan (1), six-seater (1). Standard Rs 150 to 300 for 3 of 4 (one paid Rs 400 to 800); Sedan reported as "15-200", probably Rs 150 to 200; six-seater Rs 700 to 800. Commuters (office and home) take 20 to 45 trips a month; leisure riders (city trips, parties) fewer than 5 to 10 |
| At the last high price | Switched app (8), booked anyway (5), switched ride type (4) | All 7 waited and checked again; switched app (6) and ride type (5) | All 5 interviewees saw a high price in the past week (Thursday to Friday for most). They were asked when, not what they did, so the action is unknown. The survey rider switched ride type |
| Walking | Walked to pay less (7 of 11); 7 of 9 walkers went under 5 minutes; saved under Rs 20 (5) or Rs 20 to 50 (3) | Mostly under 3 minutes (4 of 7), as often for traffic or entry points as for price | 3 of 5 interviewees walked to another spot: about 10 minutes (2: a commuter and a 4-person group) and 5 minutes (1: a 5-person group); the saving was not given. Longer than most two-wheeler walks. The survey rider walked under 3 minutes, for an entry point |
| Timing | Rarely leaves earlier or later because of price (7 of 11 did not) | Left earlier because of price (5 of 7); opens the app 5 to 15 minutes ahead (5); has booked in advance (4) | Opens the app 5 to 25 minutes ahead (commuters: 20 to 25, 5 to 10 and 5 minutes; leisure groups: 10 to 15). 4 of 5 waited while checking prices. All 5 have booked in advance, mostly to the airport (one also to a pub) |
| Pain | Charged for a driver's wait last month (6 of 11) | Charged for a wait (3 of 7) | All 5 interviewees said yes to one combined question: a driver waited over 5 minutes, they were charged, and a driver asked for more money or to cancel. Identical answers to a combined question are a wording caveat; ask it as three questions before leaning on it |
| What it means | The pickup shift fits, but savings are small, so the Rs 15 floor and the 5 minute minimum decide whether it is worth showing; the ping fits least | Best fit for the commute ping and forecast card; "back to normal by" answers what they check when they wait | Two kinds of cab rider. Commuters (3 of 5: Standard or Sedan, 20 to 45 trips a month, open the app 5 to 25 minutes ahead) fit the ping and home card. Leisure group riders (2 of 5: 4 to 5 people) walked 5 to 10 minutes and book ahead, so the pickup shift and Reserve matter more to them |

**Cab rider interviews.** Five riders, interviewed verbally and in person by the owner (logged 2026-11-22), one row each. 4 of 5 waited while checking prices (rider 3 did not). Last high price: Friday morning, this week, this week, Friday evening and Thursday evening.

| # | Kind | Ride type, party | Rs a trip | Trips a month | Opens app ahead | Walked to another spot | Booked ahead to |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Commuter, office and home | Standard, 2 people | 200 to 250 | 40 to 45 | 20 to 25 min | No | Airport |
| 2 | Leisure, around the city | Standard, 4 people | 150 to 300 | 5 to 10 | 10 to 15 min | About 10 min | Airport |
| 3 | Commuter, office and home | Sedan, 1 person | "15-200" (probably 150 to 200) | 20 to 30 | 5 min | No | Airport |
| 4 | Leisure, parties | Six-seater, 5 people | 700 to 800 | Fewer than 5 | 10 to 15 min | 5 min | Pub and airport |
| 5 | Commuter, office and home | Standard, 2 people | 150 to 300 | 40 to 45 | 5 to 10 min | About 10 min | Airport |

Not asked or not answered, so unknown: what they did at the last high price, how much cheaper a walk made the ride, and whether an advance booking's final price matched the quote. All five said yes to one combined question on driver waits, wait charges and drivers asking for more money; see Pain above.

**What the cab interviews change.** No decided value changes; where the data argues for a revisit, it is an open question under Decision log and open questions.

- **Commute ping and home card.** Cab commuters open the app 5 to 25 minutes ahead, inside the card's window (45 minutes before to 30 after). The ping, 45 minutes before, lands before they would check on their own, and cabs are where it fires most in simulation (9 to 12% of peak commute times). Cab commuters join the auto rider as the best fit.
- **Walk window (5 to 10 minutes, 5 minimum).** 3 of 5 interviewees walked 5 to 10 minutes; 7 of 9 two-wheeler walkers went under 5. The window matches how cab riders walk better than how two-wheeler riders do. Unchanged; conversion is to be read by ride type.
- **Six-seater floor (Rs 100).** Groups of 4 and 5 walked 5 to 10 minutes, which weakens the reasoning that groups will not walk. No saving was given, so it neither confirms nor breaks the floor. Unchanged.
- **Reserve and advance booking.** All 5 book ahead, mostly to the airport. Reserve (P1, stubbed, pricing unchecked) matters more than the survey alone suggested, mainly for leisure and airport trips. Recommendation: check Reserve's future-time pricing early.
- **5 minute free wait.** The combined answers point to wait charges as a real cab pain, in line with a 5 minute rather than 3 minute free wait, but they cannot be read as three separate facts. Unchanged; the seconds-over-free-wait guardrail tracks it.

Across all 19 survey respondents: 18 of 19 compare apps at least sometimes; 11 of 19 had a driver wait over 5 minutes last month (9 charged); 10 of 19 had a driver ask for more money than the app showed.

**How the personas map to segments and surfaces.** The requirements, metrics, experiment and go-to-market sections below refer to the personas by these names.

| Persona | Segment | Best-fit surfaces | Weakest fit or caveat |
| --- | --- | --- | --- |
| Two-wheeler price hunter (11 of 19) | Most ride a regular route (6 of 11) but rarely move their timing for price | Pickup shift (R8), but only where the saving clears the Rs 15 floor; per-ride-type chips (R3) | Commute ping (R6): it fires on 0 to 3% of simulated peak commute times for two-wheelers |
| Auto rider who works around the surge (7 of 19) | Primary: regular commuter | Commute ping (R6) and home forecast card (R2); the "back to normal by" line answers what they check when they wait | Pickup shift (R8): their walks are mostly under 3 minutes, below the 5 minute minimum |
| Cab rider who plans ahead (6 riders) | Commuters (3 of 5 interviewed): primary, regular commuter, the rider the card was first designed for. Leisure groups (2 of 5): secondary, occasional rider | Commuters: commute ping (R6) and home forecast card (R2). Leisure groups: pickup shift (R8) and Reserve (R5). Both: ride-type switching (R3) | 6 riders (5 verbal interviews, 1 survey response), convenience sample. Reserve is stubbed and its pricing unchecked, though all 5 book ahead. Six-seater suggestions almost never fire (7 in simulation) |

**Research planned (to settle owner choices with evidence)**

- 8 to 10 interviews with Bengaluru riders, mostly regular commuters, run to Mom Test rules: ask about past behaviour, not opinions about the idea.
- A 5-person walkthrough of the prototype.
- A short survey sizing how often riders switch ride type, wait, or walk.
- A cab-rider follow-up on what the 5 interviews left open: what they did at the last high price, how much cheaper the walk made the ride, and whether an advance booking's final price matched the quote. Split the combined question into three: did a driver wait over 5 minutes, were you charged for it, and did a driver ask for more money or ask you to cancel.
- Settles: persona sizes, the 5 to 10 minute walk window by ride type, the rupee floors (the Rs 100 six-seater floor included) and the ping timing.

**Scenarios (each is a journey on the design canvas)**

1. First-time setup
2. The ping tells a commuter to start earlier
3. The rider pauses or mutes pings
4. Normal home outside the commute window
5. Home inside the window, with a forecast per ride type
6. Cheaper pickup at a house
7. Cheaper gate at a station
8. No suggestion for short trips or normal prices
9. Cheaper spot near a small shop
10. Which drivers can accept an alternate-pickup ride

### User flow

[embedded content: user flow · 6 steps, from the doc's rules and the survey and interview personas\]

The ping and home card reach only riders who set up a commute; ride options reach every rider who sets a destination, and the pickup suggestion adds to them only in surge.

## Goals and non-goals

### Three outcomes

The feature is built to deliver three outcomes at one moment: a rider deciding what to do at a surge price. Each has a measure. Only the first has evidence so far; the second and third are design intent, to be tested in a zone experiment.

| Outcome | How the feature gets there | Measured by | Evidence today |
| --- | --- | --- | --- |
| **1. Riders save money** | Price context, the right ride type, starting earlier, and a cheaper pickup shown against the rider's own price | Rupees saved against the rider's own point; capture-action share | Survey: 10 of 19 had walked to pay less (half saved under Rs 20); simulated savings |
| **2. Drivers make more trips** | Riders who move to a calmer spot are matched faster, so idle drivers near it get trips instead of waiting; drivers in the hotspot keep surge-priced rides | Driver trips per online hour and idle time near the suggested points, test zones against control zones; earnings per hour for hotspot drivers must not fall | Design intent; no driver data; simulated drivers |
| **3. Pickup congestion eases** | Demand spreads across several nearby points instead of one hotspot, without moving the bottleneck to the next corner | Pickup wait (request to driver arrival) and surge variance in the hotspot; share of alternate bookings going to the single busiest point | Design intent; hand-set zone factors; no real data |

### Detailed goals

**Goals**

| Goal | Measured by |
| --- | --- |
| Show price context (current fare against typical for this route and hour) at destination-set, for every route, with no personalisation | Forecast coverage per ride type |
| Where history supports it, show a 30 to 90 minute forecast and a recommended action | Share of riders who take a capture action instead of abandoning |
| Forecast and display surge independently per ride type (Two-wheeler, Three-wheeler, Standard, Sedan, Six-seater), each with its own history, confidence and silence | Every metric reported per ride type |
| Never show a forecast the engine is not confident in: silence is the fallback, per ride type | Coverage per ride type; trust read from behaviour (cancellations, re-bookings, ignored cards) |
| Pair every wait message with an action that keeps the rider in the app's flow (Uber in the reference build); a wait message with no action never renders | Capture-action share; a bare wait message is a blocking bug |
| Run the same engine as a scheduled commute ping, so the in-app and push surfaces are one model | Ping correctness; share of pinged riders who book before the advised start |
| Beat a naive rush-hour baseline on held-out data, per ride type and pooled | Precision and recall against that baseline; margin over the strongest simple baseline (3.4 F1 points pooled, simulated) |
| Recommend a specific nearby pickup point in a materially cheaper zone, always showing the price here and there, never a silent redirect | Pickup funnel and rupees saved against the rider's own point |

**Non-goals (v1)**

- App-specific integrations. The rules are app-agnostic; this project ships one reference prototype (Uber-style UI).
- Cross-platform price comparison or app-switch recommendations.
- Forecasts on thin-data routes. Silence is correct, at the route and ride-type level.
- Holding or locking a fare. Uber Reserve quotes its own locked price; this product adds no lock of its own.
- Predicting bike-taxi legality. Bike stays a ride type where it operates and has data.
- Driver-facing companion features.
- Real production integration with any ride app. This is a standalone demo layer.
- The access-driven main-road shift (dropped 2026-11-17).
- Modelling structural mode-choice behaviour beyond each ride type's own multiplier.

## Requirements

P0 is needed for the core promise, P1 is important, P2 is specified but not built.

| ID | Requirement | Serves | Priority | Status |
| --- | --- | --- | --- | --- |
| R1 | Forecast per ride type with a confidence floor; silence when history is thin | All riders, every ride type | P0 | Built on simulated data |
| R2 | Home forecast card and ride-type chips, only for set-up riders inside their commute window | Regular commuters: auto rider, cab commuters (they open the app 5 to 25 minutes ahead, inside the window) | P0 | Built |
| R3 | Ride-options banner and a multiplier chip per ride type | Occasional riders, cab leisure groups; every persona that switches ride type at a high price | P0 | Built |
| R4 | Show the basis of every forecast ("based on n similar trips") | All riders | P0 | Built |
| R5 | A capture action with every wait message: Alert at 1.0x (P0), Reserve (P1) | Riders who wait or book ahead: auto rider (all 7 waited and checked again); cab rider (4 of 5 waited while checking prices; all 5 book ahead, so Reserve matters most here) | P0 / P1 | Alert built; Reserve stubbed |
| R6 | Commute ping: one per direction per day, 45 min before, with Pause and Mute | Auto rider and cab commuters (best fit; cabs get the most pings in simulation); fits the two-wheeler price hunter least | P0 | Built on simulated data |
| R7 | Reason tags on cards and the ping | Regular commuters who get the card or ping | P1 | Built; congestion and construction are labels only(more to be added) |
| R8 | Cheaper pickup suggestion | Two-wheeler price hunter, where the saving clears Rs 15; cab leisure groups (walked 5 to 10 minutes); occasional riders | P1 | Built on simulated data |
| R9 | Driver eligibility for alternate-pickup bookings | Drivers in and near a surge hotspot | P2 | Specification only |
| R10 | Instrumentation, guardrails and a zone-level experiment | Everyone; results read per ride type and persona | P0 before launch | Not built |

### Acceptance criteria

Each line is testable against the prototype or, for R9 and R10, against a real build. The rule sections below hold the full detail. The cab interviews change no criterion: the R2 window already covers cab commuters' 5 to 25 minute lead time, and the walk, floor and free-wait values stay as decided.

| ID | Done when |
| --- | --- |
| R1 | With 8 or more comparable trips for the route and ride type, a forecast shows with a confidence score. With fewer than 8 but 8 or more city-wide trips at the same hour and day type, it shows labelled city-wide with reduced confidence. With fewer than 8 at every tier, nothing renders for that ride type and other ride types are unaffected. Coverage is reported per ride type |
| R2 | The card shows only to riders who completed commute setup, from 45 minutes before to 30 minutes after a usual time; everyone else sees search, Later and recent destinations. It opens on the usual ride type and names it. A chip tap switches price, forecast and chart to that ride type and clears any armed alert. The chart covers 60 minutes, extends to the back-to-normal time up to 90, never more; with no back-to-normal within 90 minutes it says "No let-up expected in the next 90 minutes." No confidence score is shown |
| R3 | The banner names the ride type with the highest multiplier. Every row shows its own struck-through price and multiplier chip; a ride type that fails eligibility shows no chip, never a zero or a guess. Under 1.05x shows as normal pricing; nothing below 1.00x is shown |
| R4 | Every forecast shows "Based on n similar trips on this route" or the city-wide equivalent, and n updates when the rider switches ride type |
| R5 | Every elevated-price state shows at least one capture action beside the wait message; none is a blocking bug. Alert at 1.0x notifies once for the selected ride type, then clears. Reserve hands off to the app's scheduled-ride flow, and the card says the Reserve price can differ from the forecast. Dismiss collapses the widget for the session |
| R6 | At most one ping per direction per day, 45 minutes before the usual time, and only if the forecast at the usual time is at least 1.25x and 30 minutes earlier is at most 1.25x. Never between 12:00am and 6:00am or on another day's clock; usual times before 6:45am get no ping. It lands at least 15 minutes before the advised start, carries no multiplier or price, and offers Pause today and Mute this commute. No "no surge" message is sent |
| R7 | Up to two reason chips in the ping and three on a card. Congestion and construction tags never change a price or a forecast |
| R8 | One card shows only when every rule in "When a point qualifies" holds (5 to 10 minute walk, 0.30x drop, rider surge above 1.1x, rupee floor, availability of at least 0.5, trip over 2.5 km); otherwise nothing shows. The card always shows both prices; a cheaper-only card is a blocking bug. Book here books at the normal upfront price with no re-quote; Not now hides the card for that route, point and ride type. The rider walks only after a driver accepts |
| R9 | (Specification.) Only eligible drivers receive the request: outside the hotspot on the destination side, or inside within 500 m of its boundary. It opens to all nearby drivers after 10 minutes without acceptance. With no eligible driver, any nearby driver can be booked and the card shows that driver's real ETA |
| R10 | Before launch: every metric and funnel step in Metrics is logged per ride type; guardrails and the kill switch are live; zones and time blocks are randomised against feature-off control zones; X, Y, Z and W are set from a week of control data |

## Feature rules: forecast, card and ping (R1 to R7)

### Forecast eligibility (R1)

The engine runs on every destination-set event, with no saved-route or opt-in requirement. A confident forecast is decided per route, ride type, time of day and day type.

| Condition | Result |
| --- | --- |
| 8 or more comparable trips for this route and ride type | Forecast shown for that ride type, with a confidence score |
| Fewer than 8, but 8 or more city-wide trips for that ride type at the same hour and day type | Forecast shown, labelled city-wide, confidence reduced |
| Fewer than 8 at every tier | Silent for that ride type only; other ride types are unaffected |

The floor (8 trips, "confident" at 20 or more) is configurable. Coverage is reported per ride type so a demo cannot hide a silent ride type behind a good average.

### Forecast experience (R2, R3, R4)

- **Home, learned commute route.** A chart for the rider's usual ride type, with ride-type chips to switch. Before the peak: trend chart, "likely to hit X by T", a "leave by T, pay Y instead of Z" line (only if the saving is at least 15%), and Alert / Reserve. During the peak: price right now, "easing in about N min", Alert / Book anyway, and a Cheaper right now list of ride types that are actually cheaper. After the peak: "Your alert fired" and the saving.
- **Ride options, any route.** One banner for the ride type with the highest multiplier, plus every row showing its own struck-through price and its own multiplier chip. A chip is omitted, never zeroed or guessed, when that ride type fails eligibility.
- **Receipt.** Trip fare and base fare at 1.0x. Unchanged.
- **Basis line.** Every forecast says "Based on n similar trips on this route", or the city-wide equivalent, and updates when the rider switches ride type.
- **Range and risk.** Forecasts are a typical range plus a risk level (Low, Medium, High), never one false-precision number, clipped to India's MVAG 2025 bounds of 0.5x to 2.0x.

### Home screen rules (R2, R7)

- **Who sees the forecast card.** Only riders who completed commute setup, and only from 45 minutes before to 30 minutes after a usual time. Everyone else sees the normal home screen: search, Later, recent destinations. The Work / Home shortcut follows the same window.
- **Which ride type.** The card starts on the usual ride type and always names it. The chips (Two-wheeler, Three-wheeler, Standard, Sedan, Six-seater) switch the card's price, forecast and chart to that ride type's own data and clear any armed alert.
- **Back to normal.** The card says when prices are expected under 1.05x and how often that held ("7 in 10 similar trips"), an observed frequency, not a probability. No confidence score is shown.

  **Chart horizon.** The chart shows the next 60 minutes by default. If prices are expected back to normal between 60 and 90 minutes out, it extends to that time; it never shows more than 90 minutes. Back to normal is looked for only within those 90 minutes; otherwise the card says "No let-up expected in the next 90 minutes." Accuracy falls the further ahead the model looks, so a short, accurate chart builds more trust than a long one.
- **Reason chips** (up to two in the ping, three on a card): rain, event, office start hours (weekdays 7:30 to 10:30am), office closing hours (weekdays 5 to 9pm), Friday and Saturday night demand from the data or the clock. Road congestion and construction are label-only toggles that never change a price. Production would need live feeds for all of these.
- **Display rules.** A multiplier under 1.05x shows as normal pricing; nothing is ever shown below 1.00x.

### Silent state (R1)

When eligibility fails for a ride type, that ride type's widget or chip does not render. Copy on the home screen: "No fare pattern for T on this route yet; we'll flag surges once we're sure." Current fares and booking are unaffected.

### Capture and dismiss (R5)

Every elevated-price state must show at least one capture action next to the wait message. A wait message with none is a blocking bug.

- **Alert me at 1.0x.** Notifies once when the price drops, scoped to the ride type selected, then clears itself.
- **Reserve at a time.** Hands off to the app's own scheduled-ride flow (Uber Reserve in the reference build). Uber quotes the Reserve price at booking (described by Uber as locked, possibly with a reservation fee and higher cancellation fees), so the forecast price is not a promise of the Reserve price. The card says so. Reserve is not counted as a validated capture action until its future-time pricing is checked in the app.
- **Switching ride type** counts as a capture action: it keeps the rider in the flow without waiting.
- **Dismiss.** The widget collapses for the session and is evaluated fresh at the next destination-set.

### Commute ping (R6)

For a rider with a learned route, the same engine runs on a schedule against the rider's usual ride type. One ping replaces the earlier advance alert, last call and all clear.

| Rule | Value |
| --- | --- |
| Setup | Pickup, drop and usual time per direction; days of the week; usual ride type. The return direction starts as the reverse. A one-tap pause covers holidays |
| Frequency | One ping per direction per day, sent 45 minutes before the usual time |
| Trigger | Sent only if the forecast at the usual time is at least 1.25x and the forecast 30 minutes earlier is at most 1.25x, so starting earlier avoids the surge |
| Quiet hours | Never between 12:00am and 6:00am, never on another day's clock; a ping that would fall earlier is skipped, so usual times before 6:45am get no ping |
| Notice | At least 15 minutes before the advised start |
| Silence | No "no surge" message; nothing on already-high days (where starting earlier would not help) |
| Text | Title "Busy fares expected on your commute". Body "With \<reasons>, \<Ride type> fares to \<destination> are likely to be high around \<usual time>. Start by \<usual time minus 30 min> to avoid the surge." No multiplier or price |
| Actions | Pause today, Mute this commute; tapping the body opens the app |
| In-app | A black banner from the ping time until the usual time passes. A sent notification is never retracted |

Both thresholds are owner choices informed by simulation (`docs/ping-threshold-research.md`). On simulated data the ping fires on about 9 to 12% of dry weekday peak commute times for cabs, 7 to 8% for autos and 0 to 3% for two-wheelers. There is deliberately no rupee floor and no minimum gap between the two forecast times; the known weakness is that the earlier start can be only slightly cheaper.

**Fit with the cab interviews.** The 3 cab commuters interviewed open the app 5 to 25 minutes before leaving, so a ping 45 minutes ahead reaches them before they would check on their own, with time to act on "Start by". Cabs are also where the ping fires most often in simulation. Timing, trigger and quiet hours are unchanged.

## Feature rules: pickup shift (R8, R9)

In surge, a rider is offered one cheaper pickup point a short walk away, always shown against the price at their own point. The flow follows the standard booking sequence: Where to, ride options with the route, Confirm pickup (only at multi-gate places), finding a driver, driver on the way. A card with only the cheaper price is a blocking bug.

[embedded content: pickup-shift decision flow · 6 rules, 2 decisions; driver steps are specification only\]

A single failed rule means no card at all; the driver-side steps inside the dashed box are specified but not built, because the prototype has no drivers.

### When a point qualifies

| Rule | Value | Note |
| --- | --- | --- |
| Walk | 5 to 10 minutes (about 400 to 750 m) from the rider's own point (or the gate they picked) | Owner rule (7 to 10 until 2026-11-22). The survey found 13 of 16 real walks under 5 minutes; the minimum keeps riders from all moving to the next corner. The cab interviews add 3 walks inside the window (about 10 minutes twice, 5 minutes once) |
| Surge drop | At least 0.30x lower than the rider's point, on underlying surge, against a 1.0x floor | One full risk band; hand-set |
| Rider's own surge | Strictly above 1.1x | Product-level guard; changes nothing in the simulation |
| Fare saving | At least Rs 15 (two- and three-wheelers), Rs 40 (Standard), Rs 60 (Sedan), Rs 100 (Six-seater) | Owner floors; below the floor, no card at all. The Rs 100 Six-seater floor is untested: a 5-person group walked 5 minutes but gave no saving |
| Availability | The point's simulated availability score is at least 0.5 | Hand-set; no driver-supply data |
| Trip length | Over 2.5 km | Shorter trips get no suggestion |

**Ranking.** When several points qualify, show one: the nearest walk; then on the way to and nearest the destination; then the bigger surge drop. Every place type shows one suggestion. At a multi-gate place the gate list shows first and only a tapped gate in surge opens one cheaper-gate suggestion.

### Booking and waiting

- **Book here** books with that point as the pickup at the app's normal upfront price at the moment of booking. There is no re-quote step. A **Not now** link hides the card for that route, point and ride type.
- The rider walks only after a driver has accepted and the driver's details show.
- Free waiting time is 5 minutes, then the regular per-minute charge applies (no extension, no warning). In simulation the driver usually arrives first, and the wait exceeds 5 minutes in 95% of two-wheeler and 100% of three-wheeler cases.
- A dispatch hold that delays the driver was proposed and rejected by the owner.
- No night or rain rule: the walk is the rider's choice.

**How riders actually time the walk (informal evidence).** Riders usually book from home or the office and start moving only when the driver is close on the map: all 5 friends the owner asked in person said so, and Uber's India guidance to request only when ready ([Uber India blog](https://www.uber.com/en-IN/blog/request-when-youre-ready-5)) suggests the platform sees the same habit. So the 5 minute free wait is often spent on the rider's own walk even at an ordinary pickup. For an alternate pickup 5 to 10 minutes away, a rider who waits for the driver to approach before setting off will arrive late, so the driver's ETA and the free wait matter more here than for an ordinary booking. This is why the free wait is 5 minutes rather than the 3 Rapido gives: for riders who start moving only once the driver is close, the extra 2 minutes cover much of their walk before any charge starts. The cab interviews point the same way with a caveat: all 5 said a driver waited over 5 minutes and they were charged, but as one combined question that all five answered yes, so it is a signal, not a measure. The 5 minute free wait stays.

### Which drivers can accept an alternate-pickup ride (specification only)

Owner rule, 2026-11-21. Not built: the prototype has no drivers.

- **Eligible:** drivers outside the surge hotspot on the destination side of it (no need to cross the hotspot to reach the pickup), and drivers inside the hotspot but within 500 m of its boundary.
- **Not eligible:** drivers deeper inside the hotspot, and drivers on the far side who would have to cross it. They never see the request.
- **Escalation:** if nobody accepts within 10 minutes, the request opens to all nearby drivers. Uber's real timeout is not public; its developer docs treat a match over 5 minutes as delayed, so 10 minutes is the first value to tune.
- **Thin supply:** if no eligible driver exists, any nearby driver can be booked and the suggestion still shows. The ETA shown is that driver's real ETA.
- **Driver fairness:** drivers inside the hotspot beyond 500 m of its edge do not get these rides, but keep surge-priced rides inside it.
- **Why:** a driver crossing the hotspot gives a slow, unreliable ETA, drains supply from the zone surge is trying to attract, and is tempted to cancel for a better trip.

### Simulated results (current rules, 101,072 checks, 0 violations)

Of 38,400 scenarios, 30,720 are on trips over 2.5 km. A suggestion showed 2,815 times (up from 2,751 with the 7 minute minimum, all at the station, where a 5 minute walk between gates now qualifies).

| Ride type | Eligible scenarios with a forecast | Suggestion shown |
| --- | --- | --- |
| Two-wheeler | 6,144 | 606 |
| Three-wheeler | 6,144 | 816 |
| Standard | 6,144 | 922 |
| Sedan | 6,144 | 464 |
| Six-seater | 5,216 | 7 |

Six-seaters almost never get a suggestion: their history is thin and the hand-set 0.65 availability factor keeps their points below the line. All zone and availability numbers are hand-set.

## Metrics, guardrails and experiment

No platform baselines exist yet. Kill criteria will be set relative to a control (comparable zones with the feature off), with the allowed gap set from the control's own variation. Every metric is reported per ride type, which also gives a read per persona: Two-wheeler for the price hunter, Three-wheeler for the auto rider, Standard and Sedan for the cab rider. Split cab results by commute setup: riders with a commute set up read as cab commuters, the rest (Six-seater included) as leisure groups.

**North star.** A surged session ends in a completed trip, not an abandoned or cancelled one, within the same session. A fixed time limit was rejected because it would penalise long trips.

### Outcome metrics (the three goals)

These measure the three outcomes in Goals. They run in the same zone-randomised experiment as the surface metrics below, and every one is read against control zones.

| Goal | Primary metric | Also watch | How to read it |
| --- | --- | --- | --- |
| Riders save money | Rupees saved per Book-here trip, against the rider's own point | Final fare against the quote (a guardrail below); capture-action share | Per ride type. A saving that the final fare wipes out does not count |
| Drivers make more trips | Driver trips per online hour, and the idle share of online time, for drivers near the suggested points | Time to book; acceptance and escalation rate; earnings per hour for drivers inside the hotspot, which must not fall by more than Z% | A win is trips per hour rising near the suggested points while hotspot drivers do not lose |
| Pickup congestion eases | Pickup wait (request to driver arrival) in the hotspot and at the suggested points; surge variance inside the hotspot over the first-to-last window | Herding: the share of alternate bookings that go to the single busiest suggested point per hotspot; surge at the suggested points | "Spread, not shift": hotspot wait and surge fall, and no single suggested point becomes the new hotspot |

### Primary metrics by surface

| Surface | Metric |
| --- | --- |
| Retention (headline metric for the go-to-market thesis) | In test zones against control zones: the share of surged sessions that end in a trip in the app rather than the rider leaving the session, the closest proxy for switching to a competitor |
| Forecast card and ride-type switch | Share of riders who take a capture action (alert, reserve, switch ride type) instead of abandoning. Reserve counts only after its pricing is checked |
| Pickup suggestion | Funnel: card shown, Book here, driver accepted, rider reached the point, trip completed; rupees saved against the rider's own point. Of accepted rides, how many were accepted by eligible drivers only and how many after the request opened to all drivers |
| Commute ping | Against the rider's chosen days and times: share who book before the advised start; share who open the app. Correctness check: every ping fired on the set date and time and under the rules |
| Forecast quality | Coverage per ride type; precision and recall against the rush-hour baseline; margin over the strongest simple baseline (3.4 F1 points pooled on simulated data) |

**Why retention is the headline.** In the survey (19 responses, convenience sample), 18 of 19 check more than one app at least sometimes, 12 often, and at the last high price switching app was the most common action (14 of 19), ahead of switching ride type (10) and waiting (8). The cab interviews did not ask what riders did at the last high price, so they add nothing to these counts.

### Guardrails (a breach pauses rollout)

- **Riders.** Completion and cancellation rate, comparing Book-here trips with ordinary bookings in surge. Seconds by which the rider runs over the 5 minute free wait, as a distribution, and wait charges paid.
- **Final fare against the quote.** On Book-here trips, the share where the final fare differs from the price shown on the card, and by how much, split by reason: wait charge, route change or a longer trip, pickup at a different point than the suggested one, and old dues added to the fare. Also the share where the final fare wipes out the promised saving. Why: the upfront price is an estimate that the app recalculates for these reasons ([Uber India](https://www.uber.com/en-IN/blog/understanding-upfront-fares-2/)), and the pickup shift's whole promise is a saving against that price; 4 of 19 survey respondents cancelled a ride because the price changed. Off-app demands (a driver asking for more cash) are not captured here and stay a separate known risk.
- **Drivers.** Compare drivers who accepted rides inside the hotspot with drivers who accepted alternate pickups: earnings per hour, cancellation rate, cancellation reasons and time to book. If alternate requests take notably longer to book, relax who may accept them or remove the feature. Also acceptance rate and how often the request reaches the 10 minute escalation.
- **Marketplace.** Measure from the first alternate pickup accepted out of a hotspot to the last one from the same hotspot. Inside that window track surge variance in the hotspot and the surge at the alternate points, to see whether riders leaving eases the hotspot or distorts either.
- **Ping and privacy.** Ping delivery correctness; commute-pattern data handled under India's DPDP Act (consent, retention, deletion).
- **No rating or vote.** The app has no rider vote on forecast accuracy; trust is read only from behaviour (cancellations, re-bookings, ignored cards).

### Two-wheeler review (two-wheeler price hunter)

This is the largest survey persona (11 of 19): most have walked to pay less (7 of 11), but the saving was usually under Rs 20 (5). Two-wheeler fares are low and the Rs 15 floor means a card shows only when the saving is worth at least that. In simulation the saving is about Rs 7 to 28, and 606 of 6,144 eligible scenarios fire. Compare every metric for two-wheelers against the other ride types, and test the floor at Rs 15, a lower value and none, plus feature off. If savings are too small to change behaviour, relax the floor or remove the pickup shift for two-wheelers.

### Cab rider review (cab rider who plans ahead)

Six riders stand behind this persona (5 verbal interviews, 1 survey response), so read it in two parts. Commuters (commute set up, Standard or Sedan): ping and home-card metrics, where cabs get the most pings in simulation (9 to 12% of peak commute times). Leisure groups: Book-here conversion by walk length across the 5 to 10 minute window, against two-wheelers, to see whether cab riders' longer walks hold up; and the Reserve share on airport trips once its pricing is checked. Six-seater reads will be thin (7 suggestions in simulation). Track seconds over the 5 minute free wait for cabs: all 5 interviewees reported wait charges, though through one combined question.

### Experiment design

- Randomise by zone and time block, not by rider: riders in a hotspot share one marketplace (a switchback or geo experiment). Comparable zones with the feature off are the control.
- Staged rollout: a small share of zones first, then wider, with a kill switch and written thresholds agreed before launch.
- The pickup shift and Reserve are tested separately from the forecast card, because the pickup shift is the least validated lever.
- Read results per persona. The survey and interviews predict that the ping and card work best for Three-wheeler riders (the auto rider) and cab commuters, and the ping least for Two-wheeler riders. They predict the pickup shift fits Two-wheeler riders only where savings clear the floor, and fits cab leisure groups, who already walk 5 to 10 minutes. Reserve should matter most to cab riders, all of whom book ahead. A result against these predictions is evidence about the persona as well as the feature; the cab predictions rest on 6 riders, so weigh them with that in mind.

### Kill criteria (placeholders)

| Criterion | Threshold |
| --- | --- |
| Trip completion falls against control by more than | X points |
| Book-here cancellation exceeds control by more than | Y points |
| Earnings of drivers in the surge zone fall against control by more than | Z% |
| Alternate-pickup requests reaching the 10 minute escalation exceed | W% |

Set X, Y, Z and W from a week of control data with the feature off. Until then they stay placeholders.

### Open validations

- **Surge shape across a zone.** Whether the multiplier fades from the hotspot centre or steps at the edge is unknown. Public sources disagree: Uber computes surge per hexagon cell ([Uber H3](https://www.uber.com/en/blog/h3/)), research finds spillover between neighbouring zones ([Boston University](https://open.bu.edu/server/api/core/bitstreams/b02dc667-a6a8-4cf5-a37f-00a99cbe591e/content)), and an Uber patent describes hard zone boundaries. The prototype uses one fixed multiplier per point, a step. Measure it first, because it sets how much a 7 to 10 minute walk saves.
- **Reserve pricing.** Uber shows an upfront price at booking and calls it locked, including surge, with a possible reservation fee and higher cancellation fees ([Uber Reserve help](https://help.uber.com/en/riders/article/what-is-uber-reserve?nodeId=ccb9a8da-9e44-4038-921f-0360bbabc518), [FAQ](https://help.uber.com/riders/article/uber-reserve---faq?nodeId=372cf23c-d122-4b7c-864f-a14dc7746ec4)). Not established: whether the quote for a future time already reflects the surge expected then. Check it in the app before counting Reserve as a capture action.

## Risks and known limits

Design reasoning from owner review, with the open risks beside it. These are reasoning, not measured results.

| Area | Risk or reasoning | Status |
| --- | --- | --- |
| Simulated data | Zone, availability and per-ride-type behaviour are our assumptions; the engine is per ride type but the data is not real | Open until real quotes are logged |
| Persona evidence | Personas rest on a 19-response convenience survey and 5 verbal cab-rider interviews, Hyderabad-heavy. The cab persona's pain answers came from one combined question all five answered yes, and three cab questions went unanswered. Enough to design for, not to size segments | Open; Bengaluru interviews and cab follow-up planned |
| Ping value | With trigger and ceiling both 1.25x, the earlier start can be cheaper by only a few hundredths, so "to avoid the surge" can overstate the benefit, most for two-wheelers and some autos (so it reaches the auto rider persona, the ping's best fit) | Accepted by owner; no minimum gap |
| Ping on bad days | When surge is already high 30 minutes earlier (cabs in rain or with an event), nothing is sent, which is a gap in value on the worst days | Accepted for v1 |
| Ping rupee floor | Deliberately none: the rider's actual ride is unknown, so a saving cannot be stated honestly in advance | Decided |
| Walk is optional | The feature does not screen for night, rain, luggage or mobility; a rider who does not want to walk ignores the card | Decided |
| Gaming | Booking the cheap point and asking the driver to come to the original spot is judged unlikely given a walk of at least 5 minutes (about 400 m). Not tested | Monitor cancellations and driver wait on Book here trips |
| Marketplace effect | The feature moves demand, it does not remove it. If many riders take one suggestion, surge rises there and the suggestion stops being shown, so it limits itself. This is an argument, not a result | Measure with the hotspot-window metric |
| Late arrival | The driver usually arrives before the rider; the 5 minute free wait can run out and wait charges apply. Cab riders walk longer (about 10 minutes for 2 of 5 interviewed), so this bites hardest for them | Decided; track seconds over the free wait |
| Drivers | No cancellation or earnings model; the eligibility rule takes rides from drivers inside the hotspot and is untested without real driver data | Open |
| Real-time inputs | Rain, events, congestion and construction are bench toggles; production needs live feeds 45 minutes ahead | Open |
| Base fare | The build assumes the same base fare at every pickup point; moving the pickup changes distance and time a little | Open |

## Launch plan and dependencies

This is a portfolio prototype with no production launch. If built for real, this is the plan.

**Dependencies**

- Live surge feed per cell, and fare history per route and ride type.
- A routing service for walk time and driver ETA (the prototype uses hand-set positions).
- Driver locations and routes, for the eligibility rule.
- Weather, events, traffic and road-works feeds available 45 minutes ahead.
- Per-cell surge data for the pickup shift.
- Privacy review of commute-pattern data under the DPDP Act.

**Stages**

1. Internal and simulated testing (done on synthetic data).
2. A small share of zones with the kill switch armed.
3. Wider zones if guardrails hold. The pickup shift and Reserve are tested apart from the forecast card.

**Before any launch**

- [ ] Bengaluru interviews, walkthrough and cab follow-up done (survey and 5 cab-rider interviews already done); personas and the walk window revisited by ride type
- [ ] Real fare quotes logged: fixed routes, several weeks, same-time quotes at points 300 to 700 m apart
- [ ] Control-week baselines collected; X, Y, Z and W set
- [ ] Reserve future-time pricing checked in the app
- [ ] Surge shape across a zone measured

## Go-to-market: who we target first, and why

This is a retention feature, not an acquisition feature. Regular riders settle on one home app and already know other apps cost about the same; a high surge is when they open a competitor anyway. The feature keeps them in the app at that moment with something to do: start earlier, switch ride type, or walk to a cheaper point.

**Evidence.** The survey (19 responses, convenience sample, mostly Hyderabad two-wheeler and auto riders) supports the thesis. Five verbal interviews with cab riders shape who goes first among cab riders, but did not ask about switching apps; its numbers and the retention metric that tests it are under Metrics, guardrails and experiment.

| Order | Who | Why first | Surfaces |
| --- | --- | --- | --- |
| 1 | Regular commuters on a repeat route. Personas: auto rider and cab commuters (best fit) | Highest frequency; setup data for ping and home card. 13 of 19 take 4 to 10 trips a month; 8 of 19 ride a regular route most or all of the time; the 3 cab commuters interviewed take 20 to 45 trips a month | Commute ping, home card |
| 2 | Occasional riders, including cab leisure groups | No setup needed. Cab groups book ahead (mostly airport), so Reserve joins once its pricing is checked | Ride-options banner, per-ride-type chips |
| 3 | Pickup shift, as its own test | Least validated lever; only zones with known choke points (metro exits, malls, stations); fits the two-wheeler price hunter where the saving clears Rs 15, and cab leisure groups, who walked 5 to 10 minutes | Pickup suggestion |

- **Where first:** Hyderabad and Bengaluru, starting with two-wheelers and autos, the ride types respondents book most (the price hunter and auto rider personas). Cab commuters (Standard and Sedan) join the first wave for the ping and home card, where they fit best.
- **Message:** "Know before you go": an honest forecast for your usual ride type, and silence when the app is not sure.
- **How riders discover it:** the ping and home card need commute setup, so setup needs an entry point: a prompt after a rider's second or third surged session ("Want a heads-up before this happens again?") and the bell on the home screen.
- **Not in the GTM:** paid acquisition, and comparing prices across apps.

| Area | Plan |
| --- | --- |
| Launch timing | Before a predictable surge season such as the monsoon or the festive season; the survey's own stories are festival and peak-hour surges |
| Driver communication | Explain the pickup shift and the eligibility rule to drivers before launch, or they will read it as the app sending riders away. Trust is already fragile: 10 of 19 respondents had a driver ask for more money than the app showed |
| Support readiness | Expect tickets on wait charges after a walk, "the price changed" and Reserve quotes. 9 of 19 respondents were charged for waiting last month, and all 5 cab interviewees reported a wait charge (one combined question). Likely cause: riders start moving only once the driver is close (see How riders actually time the walk: 5 of 5 friends asked in person; no study measures it). Small and informal: size it with one survey question |
| Competitor response | Rapido and Ola can copy a forecast card quickly. Harder to copy is the forecast quality: a separate history per ride type, and silence when the app is not sure. So the message is "trust the forecast", not just "we show surge" |

## Decision log and open questions

### Decisions

| Date | Decision |
| --- | --- |
| 2026-11-22 | The cab rider becomes a full persona beside the two-wheeler price hunter and the auto rider (owner): 6 cab riders, 5 verbal interviews plus 1 survey response, no longer a hypothesis. It splits into commuters (3 of 5) and leisure groups (2 of 5). No decided value changes; the walk window by ride type, the Rs 100 Six-seater floor's reasoning and the timing of the Reserve pricing check are logged as open questions |
| 2026-11-22 | The Six-seater floor rises from Rs 70 to Rs 100, because a group of up to six splits the saving and is less willing to walk together; the simulated six-seater count is unchanged at 7 |
| 2026-11-22 | The walk window becomes 5 to 10 minutes (about 400 to 750 m), replacing 7 to 10. A minimum stays (owner): a cheaper point only about 200 m away would move many riders a short distance, shifting the bottleneck rather than spreading demand, and a large drop that close would cut driver earnings. Evidence: 13 of 16 real walks in the survey were under 5 minutes, and a PM review recommended a 5 minute cap with no minimum; lowering the minimum to 5 moves toward that. How conversion falls between 5 and 10 minutes is to be tested by zone |
| 2026-11-22 | Forecast horizon: a 60 minute chart, extended to the back-to-normal time up to 90 minutes |
| 2026-11-22 | Clarified: in the survey, "the driver asked me to cancel" means the driver asked for more money than the app showed before pickup; 10 of 19 reported it |
| 2026-11-21 | Metrics, guardrails and experiment design as above; kill criteria set relative to a control |
| 2026-11-21 | The home forecast card and chips show only to set-up riders inside their commute window |
| 2026-11-21 | Reserve is Uber's own flow with its own quoted price; not counted as a validated capture action until checked |
| 2026-11-21 | Driver eligibility for alternate-pickup bookings and the 10 minute escalation |
| 2026-11-20 | No dispatch hold. Riders move only once a driver is confirmed; late arrival is handled by the 5 minute free wait |
| 2026-11-20 | Walk window 7 to 10 minutes (changed to 5 to 10 on 2026-11-22). Free wait 5 minutes, no extension or warning. No night or rain rule. No ping minimum gap or rupee floor. Congestion and construction stay as label-only reasons |
| 2026-11-19 | Ranking: nearest walk, then on the way and nearest the destination, then bigger drop. One suggestion everywhere. Rider surge above 1.1x. Floors Rs 15, 15, 40, 60, 70 (Six-seater raised to Rs 100 on 2026-11-22) |
| 2026-11-19 | Book here books at the quoted price; the walk-then-re-quote step is removed |
| 2026-11-17 | The pickup shift applies to every ride type, two-wheelers included |
| 2026-11-17 | The 0.30 surge-drop rule uses underlying zone surge, not the dampened ride-type multiplier, so autos qualify like cars |

### Open questions

- [ ] Which real fare data checks the engine? Proposed: self-logged Uber quotes on fixed routes over several weeks, which would also answer the surge-shape and pickup-saving questions.
- [ ] Does the data carry enough per-ride-type volume, or does per-ride-type modelling launch with fewer ride types and the rest silent?
- [ ] Which ride types ship in v1: all five, or a smaller first set?
- [ ] At what granularity does a route match to history? (Forecast horizon decided 2026-11-22: a 60 minute chart, extended to the back-to-normal time up to 90 minutes.)
- [ ] How does the pickup shift get per-cell data: simulate hex-level data, or start with a cruder named-sub-zone proxy?
- [ ] Who gives real user feedback within the 2 to 4 week window?
- [ ] What does Uber do when no driver accepts, and is 10 minutes the right escalation time?
- [ ] Do real riders accept paying wait charges when they walk slowly?
- [ ] How much does pile-on at the suggested point erode the saving? The bench uses hand-set factors (35% and 70% of the gap); real data is needed.
- [ ] Kill-criteria numbers X, Y, Z and W need control-week data.
- [ ] Cab follow-up gaps: what did the 5 interviewees do at the last high price, how much cheaper did a walk make the ride, and did an advance booking's final price match the quote? Also split the combined waiting, wait-charge and driver question into three, since all five answered it the same way.
- [ ] Do the priorities fit the personas? The largest survey group, the two-wheeler price hunter (11 of 19), fits the P1 pickup shift and fits the P0 commute ping least; the ping's best fits are the auto rider (7 of 19) and cab commuters (3 of the 5 cab riders interviewed).
- [ ] Should the walk window be read, and later set, by ride type? Recommendation, not a change: 3 of 5 cab interviewees walked 5 to 10 minutes, while 7 of 9 two-wheeler walkers went under 5. Read Book-here conversion by ride type across the window before revisiting the decided 5 to 10 minutes.
- [ ] Does the Rs 100 Six-seater floor still rest on the right reason? It was raised partly because groups are less willing to walk together, yet groups of 4 and 5 walked 5 to 10 minutes. No saving was given, so the value is untested, not broken.
- [ ] Should the Reserve pricing check move earlier? Recommendation: all 5 cab interviewees book ahead, mostly to the airport, while Reserve is P1, stubbed and not counted as a capture action until checked. Whether their quotes matched the final price was not asked.
- [ ] Is ride options plus Reserve enough for cab leisure groups? The home card is commute-only, so they first see a forecast on ride options, often for airport and party trips.
