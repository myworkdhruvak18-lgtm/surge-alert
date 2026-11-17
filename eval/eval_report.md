# Eval Report — Surge Alert Forecast Engine vs. Naive Baseline

**Status:** v3, time-ordered split, 2026-11-17 · **Companion docs:** `prd.md`, `roadmap.md`, `app/app.html` · **Reproduce:** see the last section

## Why v3 exists: a correction

The earlier versions of this report (v1, v2) and the app's evaluation panel described the train/test split as temporal. It was not. The v2 data generator shuffled its rows and stored no dates, and the eval trained on the first 63.6% of that shuffled array, so it was a random hold-out. The numbers quoted in v2 (94.8% F1 vs 79.3%) were real, but they were random-split numbers on synthetic data and should not have been called temporal.

v3 fixes that properly. Every row now has a date, weather and events are day-level, the split is by date, and a random split of the same data is scored alongside so the difference is visible. Earlier numbers (v1 83.7% vs 62.0%, v2 94.8% vs 79.3%) are superseded by the ones below.

## Data

- **Synthetic and rule-generated, not real fare data** (`generate_data.py`, seeded). No public source for real surge multipliers exists; the closest candidates were searched for and rejected earlier in this project.
- **137,207 rows**, 5 routes, 26 whole weeks from 2026-05-18 (a Monday) to 2026-11-15. Each row: route, day of week (from the date), minute of day, rain, event, multiplier, day index.
- **Day-level structure.** Rain comes in spells that persist from day to day (90 of 182 days are rainy, each with a 7 to 12 hour window). Events occupy a 4 to 6 hour window on 112 of 182 days, placed anywhere between 6am and 9pm. Each day carries a small demand shock (standard deviation 0.04), so rows from the same day are correlated. Rain adds 0.28 to 0.42 to the multiplier and an event adds 0.32 to 0.48, before clipping to India's 0.5× to 2.0× band. Row-level shares: 20.3% rain, 12.6% event.
- **One round of tuning, disclosed.** Rain-spell length and event frequency were adjusted so the row shares land near the earlier dataset's 20% and 12%, and so both toggles still have matching history in at least 90% of daytime cells (checked: rain 99%, event 91%). An earlier draft with evening-only events left the event toggle with history in only 46% of cells, which would have brought back the bug where toggling a condition changed nothing.
- **Split.** Train: 94,991 rows from the first 126 days (2026-05-18 to 2026-09-20). Test: 42,216 rows from the last 56 days (2026-09-21 to 2026-11-15). Whole weeks on both sides. Every test row is scored; nothing is subsampled.

## Method

- **Engine.** `eval_temporal.py` is a port of `forecast()` in `app/app.html`: the same matching tiers (route plus conditions within 45 min, then without conditions, then within 90 min, then city-wide), the same median and quartile band, the same confidence maths. It is scored only against train-period history. Parity was checked: 300 fixed queries give identical answers in the Python port and in the app's own JavaScript (`eval/parity_check.js`).
- **Prediction.** A query is a positive if the forecast's point multiplier is at least 1.25× (the engine's medium-risk line). Silence counts as a negative, so the engine cannot flatter its recall by declining hard cases.
- **Ground truth.** The row's actual multiplier is at least 1.25×.
- **Naive baseline.** "Surge happens in rush hour": positive on weekdays 7:00 to 10:30am and 5:00 to 8:30pm, nothing else.
- **Per ride type.** The same threshold applied to each ride type's own multiplier, `tierMult(surge, sensitivity)`, for the engine's prediction and for the ground truth.

## Results

### Aggregate, time-ordered split

| | Precision | Recall | F1 | Accuracy |
|---|---|---|---|---|
| **Naive rush-hour baseline** | 84.1% | 74.1% | 78.8% | 79.0% |
| **Forecast engine** | 92.8% | 96.0% | **94.4%** | 94.0% |

Forecast coverage (share of test queries the engine answered rather than staying silent): **100.0%**. Margin over the baseline: **15.6 points of F1**.

### What the old labelling cost: the same data, random row split

| | Engine F1 | Baseline F1 |
|---|---|---|
| Time-ordered split (this report) | 94.4% | 78.8% |
| Random row split (what v2 actually did) | 94.4% | 78.0% |

The two are within about a point of each other. That is expected: the generator is stationary, so a future week looks like a past week. The correction matters for what the number can honestly be called, not because it moved much. On real data, where demand drifts, a time-ordered split will usually score lower than a random one, and that is the gap this setup is built to expose.

### Per ride type, time-ordered split

| Ride type | Precision | Recall | F1 |
|---|---|---|---|
| Standard | 92.8% | 96.0% | 94.4% |
| Three-wheeler | 88.2% | 94.7% | 91.3% |
| Two-wheeler | 80.6% | 65.3% | 72.1% |

Sedan and Six-seater are identical to Standard, because all three use a sensitivity of 1.0 and so classify identically.

**Two-wheeler is the weak spot, and it is fragile.** A two-wheeler's multiplier only reaches 1.25× when the underlying surge hits the 2.0× cap, so its positive class is the rows at the cap (2,053 of 42,216 test rows, 5%). A median-based forecast rarely lands exactly on the cap, so recall is low and F1 swings a lot with small data changes: 86.6% in v2, 72.1% here. Treat any single two-wheeler F1 as unstable.

## What this does and doesn't prove

- **Proves:** the engine's matching, gating and confidence pipeline runs consistently, matches the app's own code, and beats a rush-hour heuristic on a held-out final 8 weeks.
- **Doesn't prove:** that it beats a heuristic on real fares. The data is rule-generated, so a rule-aware model beating a rule-blind baseline is partly true by construction. It is also stationary, so a time-ordered split is only a mild test here. The demo app uses all rows as its history; this eval scores only held-out rows against train-only history.
- **Not yet done:** the p25 to p75 band and the confidence score have not been checked for calibration (does the band hold about half of outcomes, does confidence track accuracy?), and there is no stronger baseline than "rush hour" (for example the average for that hour of the week).

## For a resume or interview

Say what it is: *"Built and evaluated a historical-matching surge forecast against a naive rush-hour baseline on a time-ordered holdout (trained on 18 weeks, tested on the final 8), reaching 94.4% F1 vs 78.8%, on synthetic data."* The honest second sentence is the better story: the eval had been labelled temporal while using a random split, and it was found, corrected, and re-run with the old and new numbers shown side by side.

## Reproduce

```bash
cd eval
python generate_data.py                       # writes rows.json (seeded)
python eval_temporal.py                       # writes eval_results.json
python eval_temporal.py --parity > parity.json
node parity_check.js parity.json              # expects: 300 of 300 queries identical
```
