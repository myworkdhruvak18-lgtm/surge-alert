# Eval Report — Surge Alert Forecast Engine vs. Baselines

**Status:** v3.1, time-ordered split with calibration and stronger baselines, 2026-11-17 · **Companion docs:** `prd.md`, `roadmap.md`, `app/app.html` · **Reproduce:** see the last section

## Why v3 exists: a correction

The earlier versions of this report (v1, v2) and the app's evaluation panel described the train/test split as temporal. It was not. The v2 data generator shuffled its rows and stored no dates, and the eval trained on the first 63.6% of that shuffled array, so it was a random hold-out. The numbers quoted in v2 (94.8% F1 vs 79.3%) were real, but they were random-split numbers on synthetic data and should not have been called temporal.

v3 fixes that properly. Every row now has a date, weather and events are day-level, the split is by date, and a random split of the same data is scored alongside so the difference is visible. Earlier numbers (v1 83.7% vs 62.0%, v2 94.8% vs 79.3%) are superseded by the ones below. v3.1 adds the two things v3 left undone: two stronger baselines and a calibration check.

## Data

- **Synthetic and rule-generated, not real fare data** (`generate_data.py`, seeded). No public source for real surge multipliers exists; the closest candidates were searched for and rejected earlier in this project.
- **137,207 rows**, 5 routes, 26 whole weeks from 2026-05-18 (a Monday) to 2026-11-15. Each row: route, day of week (from the date), minute of day, rain, event, multiplier, day index.
- **Day-level structure.** Rain comes in spells that persist from day to day (90 of 182 days are rainy, each with a 7 to 12 hour window). Events occupy a 4 to 6 hour window on 112 of 182 days, placed anywhere between 6am and 9pm. Each day carries a small demand shock (standard deviation 0.04), so rows from the same day are correlated. Rain adds 0.28 to 0.42 to the multiplier and an event adds 0.32 to 0.48, before clipping to India's 0.5× to 2.0× band. Row-level shares: 20.3% rain, 12.6% event.
- **One round of tuning, disclosed.** Rain-spell length and event frequency were adjusted so the row shares land near the earlier dataset's 20% and 12%, and so both toggles still have matching history in at least 90% of daytime cells (checked: rain 99%, event 91%). An earlier draft with evening-only events left the event toggle with history in only 46% of cells, which would have brought back the bug where toggling a condition changed nothing.
- **Split.** Train: 94,991 rows from the first 126 days (2026-05-18 to 2026-09-20). Test: 42,216 rows from the last 56 days (2026-09-21 to 2026-11-15). Whole weeks on both sides. Every test row is scored; nothing is subsampled.

## Method

- **Engine.** `eval_temporal.py` is a port of `forecast()` in `app/app.html`: the same matching tiers (route plus conditions within 45 min, then without conditions, then within 90 min, then city-wide), the same median and quartile band, the same confidence maths. It is scored only against train-period history. Parity was checked: 300 fixed queries give identical answers, including the band, in the Python port and in the app's own JavaScript (`eval/parity_check.js`).
- **Prediction.** A query is a positive if the forecast's point multiplier is at least 1.25× (the engine's medium-risk line). Silence counts as a negative, so the engine cannot flatter its recall by declining hard cases.
- **Ground truth.** The row's actual multiplier is at least 1.25×.
- **Three baselines, each a lookup built only from train-period rows:**
  - *Rush hour:* positive on weekdays 7:00 to 10:30am and 5:00 to 8:30pm, nothing else.
  - *Hour-of-week average:* the mean multiplier for the same route, day of week and hour. No weather or events.
  - *Hour-of-week + rain/event:* the same, split by rain and event as well. A cell with fewer than 8 rows falls back to the route's weekday or weekend hour, then to all routes. This is a no-frills version of the engine's lookup.
- **Per ride type.** The same threshold applied to each ride type's own multiplier, `tierMult(surge, sensitivity)`, for every method's prediction and for the ground truth.

## Results

### Aggregate, time-ordered split

| | Precision | Recall | F1 | Accuracy |
|---|---|---|---|---|
| Rush-hour baseline | 84.1% | 74.1% | 78.8% | 79.0% |
| Hour-of-week average | 80.9% | 86.4% | 83.6% | 82.2% |
| Hour-of-week + rain/event | 93.2% | 90.4% | 91.8% | 91.5% |
| **Forecast engine** | 92.8% | 96.0% | **94.4%** | 94.0% |

Forecast coverage (share of test queries the engine answered rather than staying silent): **100.0%**.

**The honest margin is 2.6 points, not 15.6.** Over rush hour the engine is 15.6 points ahead, but that baseline ignores weather and events entirely. Most of the lift comes from using them: a time-only lookup reaches 83.6%, adding rain and events to the same lookup reaches 91.8%, and the engine's smoother ±45 minute window adds the last 2.6 points, almost all of it as recall (96.0% vs 90.4%) at similar precision.

### What the old labelling cost: the same data, random row split

| | Engine F1 | Rush hour | Hour-of-week | Hour-of-week + rain/event |
|---|---|---|---|---|
| Time-ordered split (this report) | 94.4% | 78.8% | 83.6% | 91.8% |
| Random row split (what v2 actually did) | 94.4% | 78.0% | 83.9% | 92.0% |

The two are within about a point of each other. That is expected: the generator is stationary, so a future week looks like a past week. The correction matters for what the number can honestly be called, not because it moved much. On real data, where demand drifts, a time-ordered split will usually score lower than a random one, and that is the gap this setup is built to expose.

### Per ride type, time-ordered split (F1 for each method)

| Ride type | Engine precision | Engine recall | Engine F1 | Rush hour | Hour-of-week | Hour-of-week + rain/event |
|---|---|---|---|---|---|---|
| Standard | 92.8% | 96.0% | **94.4%** | 78.8% | 83.6% | 91.8% |
| Three-wheeler | 88.2% | 94.7% | **91.3%** | 70.7% | 79.8% | 87.5% |
| Two-wheeler | 80.6% | 65.3% | **72.1%** | 17.6% | 0.0% | 24.7% |

Sedan and Six-seater are identical to Standard, because all three use a sensitivity of 1.0 and so classify identically. The engine has the highest F1 on every ride type.

**Two-wheeler is the weak spot, and it is fragile.** A two-wheeler's multiplier only reaches 1.25× when the underlying surge hits the 2.0× cap, so its positive class is the rows at the cap (2,053 of 42,216 test rows, 5%). A mean cannot reach the cap, which is why the time-only baseline scores 0.0% here; the engine's median can, which is where its 72.1% comes from. But a median-based forecast still rarely lands exactly on the cap, so recall is low and F1 swings a lot with small data changes (86.6% in v2). Treat any single two-wheeler F1 as unstable.

## Calibration

These checks are on the time-ordered test period, 42,216 forecasts.

### Point error

The engine's typical miss is **0.072** of a multiplier (mean absolute error), with a bias of -0.015 (actual outcomes run slightly below the forecast on average). The two lookup baselines miss by 0.090 (with rain and events) and 0.156 (time only), so the engine's point error is 20% lower than the stronger baseline's.

### The p25 to p75 range holds two thirds of outcomes, not half

The band is the 25th to 75th percentile of similar past trips, so as a prediction interval for the next trip it should hold about half of outcomes. It holds **67.7%** (67.2% counting only bands with some width; 1.8% of bands have zero width because they sit at the 2.0× cap). It is conservative: the matched history spans a ±45 minute window that mixes different moments of the morning and evening ramps, so its spread is wider than the spread at the exact minute, and the 2-decimal grid adds a little through ties. The numbers shown really are the p25 and p75 of similar trips, so the old label was accurate about what they are but not about what they promise. The app now calls it a typical range (decided 2026-11-17), which holds about two thirds of outcomes, and no longer implies a 50% interval. The engine was not changed, because narrowing the band would change every forecast in the app.

### The confidence score ranks reliability, but barely varies

| Confidence | Forecasts | Band holds | Right side of 1.25× | Mean absolute error |
|---|---|---|---|---|
| under 0.8 | 294 (0.7%) | 52.4% | 87.4% | 0.126 |
| 0.80 to 0.90 | 13,809 (32.7%) | 80.2% | 90.6% | 0.092 |
| 0.90 to 0.95 | 12,827 (30.4%) | 67.3% | 93.7% | 0.073 |
| 0.95 and above | 15,286 (36.2%) | 57.2% | 97.5% | 0.052 |

Accuracy rises and error falls with every step up in confidence, so the score does rank how much to trust a forecast. Two caveats: it is a heuristic score, not a probability, and it only happens to line up here (each bucket is right more often than its score, 90.6% for 0.80 to 0.90 and 93.7% for 0.90 to 0.95, so it is if anything conservative) with nothing in its construction guaranteeing that; and it has almost no range. 99.3% of forecasts score 0.80 or higher, because with this much history the sample-size term is always at its maximum and only the spread term moves.

### The medium risk label is the least reliable

Each row is a predicted risk label; each column is the share of outcomes that actually landed in that band (low under 1.25×, medium 1.25× to 1.55×, high 1.55× and above).

| Predicted | Forecasts | Actually low | Actually medium | Actually high |
|---|---|---|---|---|
| Low | 19,293 | 95.4% | 4.5% | 0.1% |
| Medium | 10,388 | 15.7% | 72.3% | 12.0% |
| High | 12,535 | 0.1% | 12.2% | 87.7% |

Low is dependable (95.4%) and high mostly is (87.7%). A medium forecast is right only 72.3% of the time, with real outcomes split on both sides. That is the nature of a middle band, but it means a "medium" card is the weakest claim the product makes.

## What this does and doesn't prove

- **Proves:** the engine's matching, gating and confidence pipeline runs consistently, matches the app's own code, beats a rush-hour heuristic by 15.6 F1 points and a rain/event-aware lookup by 2.6, and has a usable confidence ordering, on a held-out final 8 weeks.
- **Doesn't prove:** that it beats a heuristic on real fares. The data is rule-generated, so a rule-aware model beating a rule-blind baseline is partly true by construction, and the rain/event-aware lookup is close to that rule. It is also stationary, so a time-ordered split is only a mild test, and the calibration numbers above could look different on real data. The demo app uses all rows as its history; this eval scores only held-out rows against train-only history.
- **Not done:** a trained machine-learning reference (scikit-learn is not installed in this environment, so a gradient-boosting comparison was not run), and anything on real fare data.

## For a resume or interview

Say what it is, and lead with the strongest honest comparison: *"Built and evaluated a historical-matching surge forecast on a time-ordered holdout (trained on 18 weeks, tested on the final 8): 94.4% F1 vs 91.8% for a rain/event-aware hour-of-week lookup and 78.8% for a rush-hour heuristic, on synthetic data."* Then the two stories worth telling: the eval had been labelled temporal while using a random split, and it was found, corrected and re-run with both numbers shown; and calibration showed the band holds two thirds of outcomes rather than half, so it is now labelled a typical range.

## Reproduce

```bash
cd eval
python generate_data.py                       # writes rows.json (seeded)
python eval_temporal.py                       # writes eval_results.json
python eval_temporal.py --parity > parity.json
node parity_check.js parity.json              # expects: 300 of 300 queries identical
```
