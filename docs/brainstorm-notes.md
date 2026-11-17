# PM Project — Brainstorm Notes

## ⭐ RESEARCH FINDING (2026-11-17) — pickup-point recommendations, Rapido correction

Question raised: should the app recommend shifting to a nearby cheaper pickup point during surge, and separately, recommend moving from a narrow lane to the main road where fares are typically lower — the assumption going in was that Rapido already ships both.

**Researched directly — the Rapido assumption doesn't hold.** No public source (official blog/newsroom, app store listing, product press coverage from YourStory/Inc42/Entrackr, or any product teardown) confirms Rapido has either feature. Rapido's actual surge-related product is **Power Pass**, a paid subscription giving flat fares / surge protection — structurally unrelated to pickup-point suggestions (source: YourStory, https://yourstory.com/2019/07/bike-taxi-app-rapido-power-pass-subscription-programme). Rapido's dispatch/routing runs on Google Maps Platform (Google Cloud case study, https://cloud.google.com/customers/rapido-maps) but no pickup-point-suggestion feature is documented anywhere found.

**The real precedent is Uber, not Rapido — and for a different reason than fare.** Uber documents a genuine "narrow lane → main road" pickup system in Jaipur's old city: interior lanes prevent drivers from physically reaching or waiting for riders, so Uber pre-defines pickup points outside them (Uber's own blog, https://www.uber.com/en-IN/blog/jaipur/pro-tip-uber-experience-in-the-old-city-2/; general pickup-spots mechanism at https://help.uber.com/h/9edf05bf-ac3a-4cf8-b08e-76e9ca767f7f). This is framed entirely as an access/wait-time fix, never as a fare-savings feature. Gojek has a similar predefined-pickup-point feature near malls/landmarks, same reasoning (https://blog.gojek.io/how-we-do-delightful-customer-pickups).

**Implication for this project:** the fare-driven version of pickup-shift (PRD Section 10a) is **original to this project** — no India ride-hailing app has publicly shipped it. That's a stronger thing to be able to say in an interview than "I copied Rapido's feature," provided it's stated honestly rather than accidentally implied to already exist. The access-driven version (Section 10b) has a real, sourced precedent to build on (Uber's Jaipur system) — but this project's extension of it to also show a fare comparison is itself original; Uber's version doesn't do that.

**Walk-distance data — real, but not India- or fare-specific.** No India-specific or ride-hailing-specific study on how far riders will walk to save money exists. Best available, all transferred estimates:
- Uber's own Express POOL conjoint research tested "walk 1 block" / "walk 2-3 blocks" / "no walking" trade-offs, marketed as "walk a little, save a lot" — riders *overestimated* the real walking burden relative to the trade-off they were actually offered (case study: https://oldsite.epicpeople.org/perfect-uberpool/7).
- Academic work on Lyft data (Management Science, 2022–2025) found static/fixed walking-pickup points capture up to 96% of the value of fully dynamic walking-pickup optimization in dense urban networks, and that showing the pickup point before rider opt-in increases acceptance (https://pubsonline.informs.org/doi/epdf/10.1287/mnsc.2022.03201).
- Via (on-demand shuttle, not ride-hail, but closest real-world analogue) reports an average real-world pickup walk of **~550 ft / 2-3 minutes** across its deployments (https://ridewithvia.com/resources/long-walking-distance-prevents-people-from-using-transit-heres-how-to-change-that).
- A 2025 study found a **discontinuous "zero-walk" effect** — riders strongly prefer zero walking over even a short walk; the drop-off in willingness isn't a smooth curve (Pellegrini & Fielbaum, https://ses.library.usyd.edu.au/handle/2123/33702).

**Decision:** use ~2-3 minutes / 1-2 blocks as the v1 default walk ceiling for Section 10a, explicitly labeled in the PRD as a transferred, non-India, non-fare-specific estimate — not a measured fact — consistent with how this project already treats the UCLA Anderson driver-earnings citation (real study, honestly caveated as not India-specific). Full product implications in `prd.md` Section 10.

## ⭐ RESEARCH FINDING (2026-11-17, second pass) — how far riders will walk

Question raised: what is the maximum walk the surge-driven pickup shift should ever suggest, backed by public data.

**No ride-hailing source gives an upper limit.** Products state only soft limits: Lyft Shared Saver, "a few blocks, max" (https://www.lyft.com/blog/posts/introducing-shared-saver); Uber Express POOL, "a couple of blocks" from 2018 launch coverage, with no current help page found (https://wjla.com/news/nation-world/to-get-a-ride-uber-says-take-a-walk). Gojek and Grab pickup points exist for accuracy and speed, state no walk limit, and say nothing about cheaper fares (https://blog.gojek.io/how-we-do-delightful-customer-pickups). Nothing found for Ola, Bolt, DiDi, Uber Pickup Spots or Wait and Save. No product anywhere ships a fare-motivated pickup shift.

**No study gives minutes walked per rupee saved for ride-hailing.** The closest: an e-moped sharing study in the Netherlands put about a €0.02 fare cut on each extra walking minute (abstract-level, not ride-hailing; https://repository.tudelft.nl/record/uuid:394e8966-3de9-48d8-96ec-26aa0c75ae83), and a shared-micromobility study for train-station trips found a free service was worth about 7 minutes of walking to one rider group and about 1 minute to transit users (https://arxiv.org/pdf/2505.03297). Tolerance varies widely; no curve links saving to distance.

**Planning norms are the only firm ceiling.** New Zealand guidance: up to 400 m or 5 min for low-frequency stops, up to 800 m or 10 min for high-frequency stops (https://nzta.govt.nz/walking-cycling-and-public-transport/public-transport/public-transport-design-guidance/getting-to-and-from-public-transport/walking/). Melbourne: median bus walk 500 m, a quarter of riders walk more than 800 m (https://melbourneurbanist.com/2011/11/02/how-far-should-we-walk-to-the-station/). Five Indian cities: 71.22 m/min on sidewalks, 63.60 m/min in precincts (abstract only; https://ascelibrary.com/doi/10.1061/%28ASCE%29TE.1943-5436.0000251), so 5 minutes is roughly 320-355 m and 3 minutes roughly 190-215 m.

**Decision:** hard cap of 5 minutes for the surge-driven shift (PRD 10a), labeled as transferred from transit planning, not measured for ride-hailing. The cap does not rise with the size of the saving: no evidence supports that, and the user's rule is that the saving depends only on the surge at the zone. The surge-drop threshold (0.30×, 1.0× floor) is a hand-set design choice, reasoned from the engine's own 0.30-wide risk bands and the 15% materiality floor, not a sourced number.

**Walk discount for the access-driven case (PRD 10b, dropped on 2026-11-17 along with that case):** chosen over modeling skipped gully time. Precedent is Uber Express POOL's walk-for-discount. Real ride-hailing does not bill the rider for the driver's approach, so without a discount a no-surge price drop has no natural source. Flagged assumption: the platform funds it.

## ✅ CONVERGED DIRECTION (final, as of this session)
**Surge-pricing hike prediction & timing-nudge feature for Uber (India).** *(Narrowed from "Uber/Ola/Rapido" to Uber-only — see scope decision below.)*

User's original idea: a feature that learns/asks a user's commute pattern (to/fro office), predicts upcoming surge-pricing windows a few hours ahead, notifies the user so they can shift timing, and shows expected price ranges by ride type before/during the hike window.

Elder-care coordination and household-service trust layer were both explored in depth as "bigger swing" candidates but are **not** the chosen direction — kept below for history/reference only.

### Why this idea, and how it's been sharpened
- Real differentiation vs. what exists: Uber/Ola already show price *at the moment you open the app* (reactive). Nobody warns you *hours ahead* so you can act (proactive). That gap is real and unclaimed.
- Riskiest assumption identified: there's no public API for Uber/Ola's real surge multiplier — can't reverse-engineer their actual algorithm. Reframed the project around proxy signals instead: weather, traffic congestion data, local event calendars, day-of-week/time seasonality, plus the user's own historical fare data (self-logged).
- Output should be a **hike-risk score/probability band + expected multiplier range**, not a single claimed exact price — e.g. "High risk — 65% chance of 1.5-2x (2x is India's regulatory cap)". Avoids overpromising precision the model can't back up (this is the "guardrails" story for the checklist). With only 2-3 weeks of early data, must show low confidence honestly (e.g. "based on 4 similar past instances") rather than a falsely confident percentage.
- Eval should be benchmarked against a **naive baseline** ("surge always happens in rush hour windows") — if the model doesn't beat naive heuristics, that's an honest, worth-discussing finding, not something to hide.
- Shape: **feature, not app** — a lightweight prediction/notification layer sitting on top of existing ride apps, not a booking app replacement. Consistent with the general "meet users at their existing habit" principle from earlier discussion.
- Notification pattern: two-stage — an advance heads-up (hours before, for planning) + a closer "last call" nudge (15-30 min before predicted onset, for immediate action) + optional "all clear" once the window passes.
- Actionable tip worth building in: surge is calculated per small geographic cell (Uber uses H3 hexagonal grid, ~0.1-0.5 sq mi cells) — walking 200-400m can cross into a cheaper cell. Concrete, legitimate recommendation to surface, not just "leave earlier/later."

### ⚠️ VERIFIED — corrects earlier assumption
Researched directly (see sources at bottom): **on Uber, scheduling a ride in advance does NOT lock the fare.** Surge pricing at the actual pickup time applies regardless of when you booked — the "book now to lock price" recommended action from earlier is **not valid for Uber** and should not be the core CTA. Revised recommended actions instead: leave now / before the predicted window if flexible, walk to a cheaper adjacent zone/hex, consider an alternate ride type or mode (auto/bike/metro) during the predicted window, or simply get forewarned so the cost isn't a surprise (a softer but still real value — budgeting/peace of mind).

Also found an important **regulatory constraint** that changes the ceiling on this idea's value: India's Motor Vehicle Aggregator Guidelines (MVAG 2025, effective July 2025) cap peak-hour surge at **2x base fare** (raised from an earlier 1.5x cap), with a floor of 50% of base fare off-peak. States have a 3-month window to adopt this, so real-world enforcement may currently be uneven — which is itself a reason real logged data matters more than trusting the stated policy. Practical implication: the "avoid a 3-4x surge" framing (common Western Uber anecdote) overstates the ceiling in India — the honest number to build toward is closer to a 2x cap where enforced, and the interesting product story shifts partly toward "when/where is enforcement inconsistent" and "certainty/forewarning has value even at a capped 2x." The 0.5x off-peak floor also means a legitimate "wait and it may drop toward 0.8-1.0x" framing is grounded, not a guess.

### ⭐ MAJOR COMPETITIVE FINDING — Uber "Ride Pass"
Uber itself launched a feature called **Ride Pass** in the US (~May 2025, ~$3/month): riders pick up to 10 regular routes and get price-locked for a 1-hour daily window on those routes. This is Uber's own answer to almost exactly this problem. Confirmed **not available in India** and not part of India's Uber One membership (checked directly — Uber One India, ₹149/mo, is ride credits capped ₹150/trip + priority support + Zomato Gold perk; no price-lock/surge protection). Implication: don't compete on "lock my price" (Uber already owns that lane where live) — differentiate on (a) the anticipatory/predictive warning mechanic, which Ride Pass doesn't do, and (b) India coverage, since Ride Pass hasn't reached India. Also directly validates the problem is real enough that Uber built for it.

### How surge is actually calculated (researched)
Uber is deliberately vague publicly, but from technical sources: surged fare = base formula × multiplier; calculated independently per small geographic cell (Uber's H3 hexagonal grid, ~0.1-0.5 sq mi); inputs are (1) real-time ride-requests-vs-available-drivers in that cell, (2) historical demand patterns (pre-emptive surge — e.g. surge can start before a Friday 5:45pm rush is visible on the street, because the system anticipates the known weekly pattern), (3) external signals — weather, event calendars. This validates the proxy-signal approach: these are literally the same category of inputs Uber's own algorithm uses, not just a workaround for lacking their data. In India, whatever the "natural" algorithmic output is gets capped at the 2x regulatory ceiling before being shown to riders — the raw algorithmic output and the legally-capped displayed price are conceptually distinct.

### 💰 WHO ACTUALLY BENEFITS FROM SURGE MONEY (researched — important stakeholder finding)
Checked directly: in India, under MVAG 2025, drivers must receive **at least 80% of the total fare if they own their vehicle** (60% if the platform owns it), and this applies to the whole fare including the surge portion — surge isn't a separate line item, it's a multiplier on the fare itself. So structurally, **the driver is the primary beneficiary of surge premiums in India, not the platform** — this is surge pricing's literal economic purpose (pull drivers into scarce-supply moments). Reinforcing this further: Rapido runs a flat-subscription model (no per-trip commission at all, driver keeps 100%); Uber has been shifting 2-3 wheelers in India to the same subscription/zero-commission model; Ola recently announced a nationwide zero-commission rollout. Across a growing share of the market, the platform takes **no cut of surge at all** — its revenue comes from subscription fees, not fare skimming.

**Important caveat/open question:** a Columbia Business School study found that in the US, Uber's "upfront pricing" model has let the platform quietly capture a growing share of surge premiums despite formal commission structures — Uber stopped showing surge bonuses separately to drivers, folded it into an opaque total trip payout, and its effective take rate rose from 32% (2022) to 42% (2024). This shows a formal commission cap doesn't automatically guarantee the driver's real-world share of surge if the pricing model obscures it. **Unverified whether Uber India's pricing model has the same opacity** — the study is US-specific; flagged as an open question, not assumed either way.

**Product/ethics implication for this project:** demand-shifting away from a surge window mostly reduces *driver* peak-earning opportunity, not platform revenue, in the India commission/zero-commission segments — a different, more human stakeholder cost than "hurting a big platform's profits." Mitigating factor: shifted demand mostly still happens later on the same platform (drivers get paid on that trip too, just at a lower fare) — so it's a reduction in peak-moment earnings, not a full loss of income. Worth being able to speak to this honestly in an interview given the project's original "goodness" framing — a tool that saves riders money by trimming gig drivers' best-earning windows is a real, worth-naming tension, not a disqualifying one.

### ✅ MARKETPLACE BALANCE FIX — reorder recommended actions to protect driver earnings
Explicit question raised: should driver-side impact be a real PM concern here, and is there a design around it? Yes — two-sided marketplace supply/demand balance is a core PM concern, not optional. Mechanical risk also identified: if the tool scaled and drivers noticed thinning demand in predicted-surge windows, some would preemptively go offline/reposition, which would corrupt the tool's own training signal over time (the pattern it learned assumes driver behavior the tool itself is changing).

**Key realization: of the 4 recommended actions already decided, only one (wait/leave later) actually suppresses driver earnings.** The other three redistribute the same rider to a different available driver rather than removing demand: zone-shift (routes to a driver already positioned in the cheaper adjacent hex), mode-shift (routes to a bike/auto driver instead of a cab driver), and pure forewarning (no behavioral effect at all). Only "wait" removes a rider from the pool during a driver's peak-earning moment.

**Decision: reorder the action-recommendation hierarchy.** Default to suggesting zone-shift or mode-shift first (redistribution, not suppression); only fall back to "wait" when neither is available. This makes most of the feature's value win-win by construction rather than a trade-off to defend.

**Phase-2 positioning (not built now, but worth stating as roadmap vision):** the same predictive signal telling a rider "surge coming in this zone in 2 hours" is exactly what a driver would want too, to position themselves ahead of the spike — which is the literal economic point of surge pricing. Naming a driver-facing companion as an explicit future direction reframes the whole project from "helps riders route around driver earnings" to "a demand-supply matching intelligence layer, shipped rider-side first" — a stronger, more mature marketplace-PM narrative for interviews than treating it as a one-sided hack.

### ⭐ MAJOR RESEARCH FINDING — surge pricing may already not benefit full-time drivers
Question raised: could a "rides per hour" framing (multiple shorter rides vs one long surge ride) be a defensible success metric, and should we implement the driver side now to really know the impact? Researched directly:

**On implementing to "know the real loss":** a model is an estimate with assumptions, not proof — fair point — but true causal measurement would require platform-scale A/B testing (hundreds/thousands of riders, sustained, with real driver earnings compared with-and-without) — not reachable by this project regardless of whether we build the driver feature or not. So the realistic choice is modeled estimate vs. no estimate, not modeled estimate vs. real measurement. (Also: the rider-side "money saved" impact metric has this same estimate-not-proof nature — consistent, not a double standard.)

**On the "rides per hour" hypothesis — found real, surprising supporting research (US market):** a UCLA Anderson study found that while surge pricing raises *aggregate* driver revenue, this hides an uneven split — full-time drivers actually earn LESS under surge pricing than in non-surge conditions, while part-time drivers benefit most. Mechanism: surge draws more drivers into competing for the same demand pool ("cherry-picking"), so each driver completes fewer/shorter trips and daily revenue per driver drops; drivers normally offset this by driving extra days, but full-time drivers already work every available day and can't do that, so they end up net worse off. Part-timers absorb the dip more easily.

**Implication for this project:** this is a legitimate, sourced basis for a stated hypothesis (not a claimed measured metric): "prior research suggests full-time drivers may not clearly benefit from surge-driven competition; this tool's demand-smoothing could plausibly ease that crowding effect rather than worsen it." Caveats to keep attached: single study, US-market, not confirmed for India specifically. Still can't measure real driver earnings-per-hour ourselves (no data access) — this is context/supporting literature for the spec, not a metric we're claiming to have measured.

**On full-time vs part-time driver split by vehicle type (requested, researched):** no public source found that segments full-time/part-time specifically by cab vs auto vs bike-taxi in India — this granularity doesn't appear to be published anywhere reachable. Closest available figure: ~78% of Indian gig drivers work part-time (<40 hrs/week) — but this study covers two-wheeler **delivery** drivers specifically, not ride-hailing, so it doesn't directly transfer. Reasoned (not sourced) inference worth stating as inference only: cab driving requires bigger capital commitment (owning/leasing a car), likely correlating with more full-time/income-dependent driving; bike-taxi has lower entry barrier, likely skews more part-time/casual, similar to the delivery-driver figure. User's underlying point stands regardless of exact percentages: a part-time driver supplementing other income cares much less about ride-volume optimization than a full-time, income-dependent driver — worth segmenting the "driver impact" concern by this distinction in the spec even without precise numbers.

### ✅ SCOPE DECISION — bike taxis: don't build dedicated hike prediction for them in v1
Question raised: should the feature be implemented for bike taxis too? Researched directly: under MVAG 2025, bike taxis ("non-transport motorcycles") are covered by the same national surge framework as cabs in principle. But **actual legality is left entirely to each state**, and it's genuinely unstable in practice — Karnataka allowed electric bike taxis in 2021, reversed the policy in 2024 after auto-rickshaw union protests, and its High Court banned bike taxis outright in April 2025, putting ~100,000 drivers out of work within six weeks (Bengaluru traffic reportedly worsened 18% in the following week). This is a live, contested regulatory category, not a settled one like cabs.

**Decision:** two distinct roles bike taxi could play, handled differently. (1) As a mode-shift fallback recommendation ("cab surging, bike available at normal price") — already structurally part of the design via the existing action hierarchy, requires no separate modeling, just availability awareness. (2) As its own tracked category with dedicated hike-risk predictions — deprioritized for v1: absolute rupee savings are smaller (bike base fares already low), and building confident predictions for a ride type that may not legally exist in a given city risks a broken-feeling feature depending on location. No template changes needed — bike-taxi rows will naturally appear in the fare log only from cities where it currently operates; just don't assume uniform availability across participants/cities. Bonus: this is also lower-stakes from the driver-fairness angle, since two-wheeler gig work skews more part-time (per the finding above), so it's a safe category to leave for a later phase rather than one being avoided for ethical reasons.

### PM's own build responsibility (clarified)
Question raised: does the PM personally need to build the prediction model? No — this project was deliberately scoped so the model is simple enough (seasonal proxy-signal baseline + naive-baseline comparison) to be built with AI-assisted coding tools rather than requiring ML engineering expertise, consistent with the whole "AI-leveraging PM" premise this project started from. What the PM owns: problem definition, eval design, guardrails, segmentation and scope calls (i.e., everything captured in this document) — not necessarily writing the model code by hand. Caveat: must still understand what's built well enough to explain and defend every decision in an interview — direction, not blind delegation.

### Cold-start / user segmentation (important design requirement, not an edge case to ignore)
Explicitly defined segments, each needing different treatment:
1. **Returning commuter with logged history** — full personalized prediction using their own historical fares + proxy signals.
2. **New user, own city, no personal history yet** — fall back to population/route/time-of-day level heuristics (no personal data needed); personalization phases in as history accumulates.
3. **First time in a new city entirely (e.g. traveler)** — no data for that location at all. Recommended default: either stay silent or show a clearly-labeled generic tip only ("evenings tend to be busier"), never a falsely confident specific prediction.
4. **Subscriber with a price-protection product (e.g. future Uber Ride Pass in India)** — tool's value drops to ~0 for their protected routes/windows; should detect and suppress/soften alerts for them rather than nag. Not currently relevant in India (Ride Pass isn't there yet) but worth designing for.

Key simplification (user's own insight, validated): segments 1-3 don't need fully separate systems — one core "will price rise or fall in the next window, for this route/time" model using real-time + population signals works for everyone; personalization from logged history is an optional enhancement layer for returning users, not a hard requirement. For scope, recommend v1 explicitly targets segment 1 (regular commuters) as primary, with segment 2's fallback logic included (cheap to add, same model), and segments 3-4 named as explicit non-goals/later — not silently ignored.

### ✅ SCOPE DECISION — single-platform only (not cross-app comparison)
Question raised: does recommending "wait/shift" risk cannibalization or pushing users to competing platforms? Two distinct risks identified:
1. **Yield erosion (mild, tolerable):** if user still books the same app later/cheaper, the platform doesn't lose the trip, just some surge margin on it. Uber's own Ride Pass shows platforms will rationally accept this in exchange for retention/predictability — not a fatal tension. (Also now clearer that in India, this "surge margin" mostly belongs to the driver anyway, not the platform — see stakeholder finding above.)
2. **True platform migration (severe, avoided by scope choice):** only becomes a real risk if the tool compares prices *across* apps (Uber vs Ola vs Rapido) and suggests switching — that would be explicitly designed-in cannibalization, technically requires scraping multiple platforms (real ToS exposure), and is far more adversarial. Scraping means writing code that automatically pretends to be a human browsing the app/site to pull data the platform hasn't made available via an official API — banned under every platform's ToS, so this is a real legal/risk exposure decision, not just a "smaller idea" trade-off.

**Decision: stay single-platform.** Recommended actions are timing shift, mode shift (bike/metro/auto), and zone shift (walk to a cheaper adjacent hex) — never "switch to Ola instead." Captures most of the real user value while avoiding the sharper migration risk and the cross-platform scraping complexity/risk. Note: can't fully prevent a user from independently checking a competing app once price is made salient to them — that's an inherent side effect of any price-transparency tool, not a flaw specific to this design.

*(At this point in the project, "single-platform" meant single-platform-**per-user** — Uber, Ola, and Rapido were all still meant to be selectable, just not compared against each other. See the follow-up scope decision below, which narrows this further to Uber only.)*

### ✅ SCOPE DECISION — narrowed further to Uber only (not Ola/Rapido)
Question raised, after the PRD and mockup were built: didn't we already decide to only work on one platform? Worth being precise about what "single-platform" actually meant at the time (see above) — it was single-platform-per-user, not Uber-exclusive; the onboarding mockup originally let a user pick Uber, Ola, or Rapido.

But by this point in the project, a real asymmetry had built up: essentially everything actually verified through research — scheduling not locking the fare, the H3-grid surge mechanics, Ride Pass, the 80%/60% driver revenue-share rules — is Uber-specific. Ola and Rapido's behavior was never independently verified; it was carried as an open assumption (with a planned empirical test during self-logging that hadn't happened yet). Separately, the seed-data recommendation for the notification simulator (the public Boston dataset) is labeled "Uber & Lyft" — using it unfiltered would mean training on two blended platforms' pricing patterns, in tension with the single-platform principle in spirit even though Lyft isn't an India platform at all.

**Decision: v1 is Uber only**, not just single-platform-per-user. Concretely:
- The seed dataset gets filtered to Uber-tagged rows only, not used as-is.
- The onboarding mockup's Uber/Ola/Rapido app picker was simplified to a fixed "App: Uber" field — both in the Figma file and the interactive HTML prototype, which was republished with this change.
- The PRD's non-goals list now names Ola/Rapido support explicitly (previously it only named cross-platform *comparison* as a non-goal, which is a different and narrower claim).
- Ola/Rapido support moves to P2 (future considerations) — revisit only once the Uber-only version is proven, and only with the same kind of direct verification this project has tried to hold itself to throughout (not just carried-over assumptions).

### Promo/discount handling (default decided, not blocking)
Promo codes and new-user acquisition offers (e.g. first-3-rides-free) distort the surge signal the same way — a discounted fare looks identical to a non-surged fare in the data unless tagged. Default handling (already built into the data template, no further decision needed for now): log "Promo Applied? Yes/No"; where the app shows a pre-discount strikethrough price, log that original figure too (that's what reflects real surge); where not visible, leave blank and treat as lower-confidence/excludable from the core surge-training signal later.

### Historical data strategy (clarified)
No legitimate public archive/API of Uber's actual historical surge multipliers exists — nothing to pull directly. Some Uber datasets exist on Kaggle but provenance/quality for real surge signal is unverified — not to be trusted as ground truth without inspection. One verified exception: a public Boston "Uber & Lyft" dataset (via Kaggle/GitHub) does have a genuine, API-sourced `surge_multiplier` field — real, not synthetic — though it's US data from 2018 and needs filtering to its Uber-tagged rows to fit the Uber-only scope decision above. What's genuinely available with 1-2 years of real history for India specifically: weather (IMD/public weather APIs), event calendars (compileable), day/time seasonality. Plan: build a seasonal "prior" from 1-2 years of these public proxy signals plus the filtered Boston dataset for pipeline-building, then calibrate/validate against real (short, ~1 week) self-logged India ground-truth data. Long/foreign history for pattern richness and pipeline-proving, short real India data for truth — neither alone is sufficient.

### 7-point build checklist mapping (from Neel Sikdar's video, still mandatory — see below)
1. Real user problem: surge-pricing cost/frustration, well-known and quantifiable (capped at ~2x base fare per MVAG 2025, uncertain enforcement uniformity)
2. Manual vs AI-assisted: today = check app / guess timing / eat the cost vs proactive predictive nudge
3. Input → processing → output: (commute pattern + weather/traffic/event/seasonality signals + self-logged historical fares) → prediction model/heuristic → hike-risk notification + recommended action
4. Eval metrics: precision/recall of hike-window predictions vs actual logged surge, benchmarked against naive rush-hour-only baseline
5. Failure modes: false alarms (notification fatigue) vs missed hikes (costly); proxy signals will never perfectly match real surge algorithm — be upfront about this
6. Guardrails: show confidence/probability, not a false-precision price; default toward not staying silent on likely misses, without overalerting
7. Impact metric: ₹ saved per week/month from shifted timing/mode, or precision of hike prediction vs naive baseline

Deliverables required alongside the build: working demo, Loom walkthrough, evaluation sheet, and real user feedback (ideally from people who'd pay).

## 📋 RESEARCH & DATA COLLECTION PLAN (superseded — see roadmap.md and prd.md for current, scoped-down version)
Original plan (self + 5-10 people, 2-3 weeks, all three apps) was scoped down after re-examining what a solo student portfolio project can actually validate: PRD/design don't need fare data to write, and the ceiling on "real production impact" exists regardless of data volume since this isn't shipping to Uber's real user base. Current version: small Uber-only self-logged sample (you + 2-3 people, ~1 week) layered onto the filtered public Boston dataset, per `prd.md`. The empirical-test ideas below are still valid, just narrowed to Uber:

- Test scheduling-locks-price specifically on Uber (already confirmed: it does NOT lock price) — this was resolved before data collection even started, so no longer needs testing.
- Check price at two points during a known busy window (e.g. once at T-2hrs, once at actual departure) to get signal on how fast/predictably prices move within a window, not just day-to-day variation — still worth doing.

**Privacy note (still applies):** avoid collecting anyone's exact home/office address — routes are self-labeled tags (e.g. "Home→Office"), not literal addresses.

A ready-to-use logging spreadsheet template was built earlier in this project — Instructions tab, Participant Info intake tab, and Fare Log tab (includes Promo Applied?/Pre-Discount Fare columns). Reusable as-is for the smaller Uber-only sample; the App column's Ola/Rapido options just won't be used.

## Design artifacts
- Figma file (static screens): https://www.figma.com/design/TWZ7vlS7MRsvfeNDPO4gxq
- Interactive HTML prototype (click-through, Uber-only): https://claude.ai/code/artifact/4a284cb7-5fd7-450b-849d-1a025cda1ddf

## Next step
Resolve the seed-data recommendation (filtered Boston dataset + small Uber-only self-logged sample) and start the notification simulator build — see `roadmap.md` for current status.

---

## Reference: earlier exploration (not the chosen direction, kept for history)

### Ideas surfaced (round 1 — mixed scrappy/big)
- Near-expiry inventory discount layer for quick commerce dark stores
- Cross-app price tracking for quick commerce (Blinkit/Zepto/Instamart)
- Generic-vs-branded drug substitution tool (India pharma pricing gap)
- Diagnostic test price comparison across labs
- UPI/subscription "zombie autopay" killer (flagged as closer to saturated)
- Household service (maid/cook/driver) trust + verification + fair payroll layer
- Elder-care coordination for remote/NRI families
- Hospital price + outcome transparency for major procedures
- Institutional knowledge loss tool for enterprises (org "brain"/RAG)
- Quick-commerce packaging waste / reverse logistics network

### Explicitly ruled out as saturated/derivative
Generic expense trackers, generic AI resume/cover-letter tools, generic diet/fitness/habit apps, generic AI customer-support chatbots.

### Reference example projects (from Neel Sikdar's video, inspiration only)
AI interview coach; Voice-of-customer co-pilot (app reviews/support tickets → roadmap recs); Feature rebuild with AI; Meeting-to-execution co-pilot; Internal knowledge base assistant.

## Sources
- https://ride.guru/lounge/p/can-surge-pricing-apply-to-scheduled-rides-for-rides-bookedreserved-in-ad
- https://www.outlookbusiness.com/explainers/surge-pricing-explained-why-your-ola-uber-or-rapido-ride-might-cost-twice-as-much
- https://www.techradar.com/news/india-fixes-surge-pricing-limits-for-uber-and-ola-drives (older/possibly superseded 1.5x figure — outlook business's 2x/MVAG-2025 figure is more recent-dated and likely current; worth a periodic re-check since state adoption is rolling)
- https://www.msmtimes.com/2025/05/Ubers-GameChanging-Features-Surge-Pricing-Workarounds-More.html (Uber Ride Pass)
- https://www.businesstoday.in/technology/news/story/uber-one-subscription-plan-introduced-in-india-with-discounts-and-perks-check-details-455356-2024-11-27 (Uber One India benefits)
- https://getridewise.com/blog/how-surge-pricing-works-uber-lyft-algorithm (surge calculation mechanics, H3 hex grid)
- https://www.uber.com/us/en/drive/driver-app/how-surge-works/ (Uber's own public explanation, deliberately vague)
- https://www.medianama.com/2025/07/223-study-uber-upfront-pricing-profit-driver-loss/ (Columbia Business School study — Uber upfront pricing captures surge surplus, US-specific)
- https://www.insightsonindia.com/2025/07/04/motor-vehicle-aggregator-guidelines-mvag-2025/ (MVAG 2025 driver revenue-share rules: 80%/60%)
- https://www.forbesindia.com/article/startups/ola-uber-rapido-how-cab-aggregators-are-responding-to-subscription-vs-commission-model/96379/1 (Rapido/Uber/Ola subscription vs commission models in India)
- https://anderson-review.ucla.edu/surge-pricings-benefits-go-to-a-subset-of-ride-hailing-drivers/ (UCLA Anderson — full-time drivers earn less under surge, US-market)
- https://voxdev.org/topic/labour-markets/understanding-gig-economy-lessons-drivers-india-indonesia-and-kenya (India gig driver part-time %, two-wheeler delivery specific)
- https://thedailybrief.zerodha.com/p/bike-taxis-get-a-policy-nod (bike taxi legal status, MVAG 2025 coverage, Karnataka ban timeline)
- https://www.kaggle.com/datasets/ravi72munde/uber-lyft-cab-prices (Boston Uber & Lyft dataset — real surge_multiplier field, verified via source code at https://github.com/ravi72munde/scala-spark-cab-rides-predictions)
