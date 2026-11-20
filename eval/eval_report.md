# Evaluation report: forecast engine, per ride type (v6)

Replaces the v3.1 report. The fare history now has a **ride-type column**: Two-wheeler, Three-wheeler (auto), Standard, Sedan, Six-seater each have their own simulated rows, and the engine matches, goes silent and reports confidence **per ride type**. Each held-out trip is scored against the forecast for its own ride type. Reproduce with `python eval/generate_data.py` then `python eval/eval_temporal.py`; the app's answers are checked against this Python engine by `eval/parity_check.js` (300 of 300 queries identical, all ride types).

**Everything here is simulated.** The data comes from `eval/generate_data.py`: a hand-built time-of-day curve, rain and event effects, day-level shocks, plus **per-ride-type assumptions we made up**: how strongly each ride type follows the demand curve (two-wheeler 0.30, auto 0.60, standard 1.00, sedan 1.05, six-seater 1.15), how hard rain and events hit it, how noisy it is, and how much history it has (six-seaters are about 1% of standard volume, on purpose). A time-of-day model beating a time-of-day baseline is therefore partly by construction.

## Setup

- 392,644 rows over 182 days (2026-05-18 to 2026-11-15), 5 routes, 5 ride types. Train: first 126 days (271,828 rows). Test: last 56 days from 2026-09-21 (120,816 rows), never seen by the engine. A random row split of the same data is also scored.
- Prediction task: will the multiplier be at least 1.25x (the medium-risk line)? Silence counts as "no surge predicted".
- Baselines: **naive** (surge in weekday rush hours only), **hour-of-week** (mean multiplier by route, ride type, day of week, hour), **hour-of-week + rain/event**.
- Anything under 1.05x is normal pricing (1.00x) in both the engine and this evaluation.

## Headline (all ride types pooled)

| Model | Precision | Recall | F1 |
|---|---|---|---|
| Naive rush-hour | 65.8% | 76.0% | 70.5% |
| Hour-of-week average | 81.0% | 78.3% | 79.7% |
| Hour-of-week + rain/event | 91.1% | 84.0% | 87.4% |
| **This engine** | 90.2% | 91.4% | **90.8%** |

Margin over the strongest baseline: **3.4 F1 points** (over naive rush hour: 20.2). Random-split check: engine 90.9% vs naive 70.0%, hour-of-week 79.7%, hour-of-week + rain/event 87.9%. Pooled coverage 99.98%.

## Per ride type (the main change in v6)

| Ride type | Test rows | Naive F1 | Hour-of-week F1 | + rain/event F1 | **Engine F1** | Coverage | City-wide fallback |
|---|---|---|---|---|---|---|---|
| Two-wheeler | 29,553 | 43.2% | 46.5% | 67.2% | **70.8%** | 100.0% | 0.0% |
| Three-wheeler | 33,763 | 72.5% | 79.0% | 86.1% | **89.5%** | 100.0% | 0.0% |
| Standard | 42,213 | 78.2% | 83.9% | 91.2% | **94.3%** | 100.0% | 0.0% |
| Sedan | 14,781 | 78.8% | 84.0% | 89.2% | **93.6%** | 100.0% | 0.0% |
| Six-seater | 506 | 77.4% | 83.8% | 83.8% | **87.0%** | 96.0% | 6.7% |

- **Coverage is no longer 100%.** The six-seater has little history, so its forecast is silent on 3.9% of held-out trips and uses the city-wide fallback on another 6.7%. This is the first time the silent path is exercised by the evaluation.
- **Two-wheeler is the weakest** (engine 70.8%, margin over the best baseline 3.6 points): its price rarely reaches 1.25x, so there are few positive cases to learn from. Earlier versions scored the two-wheeler by scaling the cab forecast, which hid this.
- Margins over the best baseline: Three-wheeler 3.4, Standard 3.1, Sedan 4.4, Six-seater 3.2 points. The six-seater row is based on only 506 held-out trips, so treat it as indicative.

## Calibration (pooled)

- **Typical range (p25-p75) holds the actual multiplier 50.3%** of the time (a true 50% interval would hold 50%); 24.5% of forecasts have a zero-width range; among forecasts with a non-zero range it holds 64.6%. The label stays "typical range", not a confidence interval.
- **Confidence buckets** (share of forecasts / accuracy / mean absolute error):
  - 0.00-0.80: 1.8% of forecasts, accuracy 83.5%, MAE 0.129
  - 0.80-0.90: 16.2% of forecasts, accuracy 90.2%, MAE 0.094
  - 0.90-0.95: 32.2% of forecasts, accuracy 91.4%, MAE 0.069
  - 0.95-1.00: 49.8% of forecasts, accuracy 94.4%, MAE 0.050
- **Risk labels:** when the engine says low, the observed label was low 94.2% of the time; medium 75.0%; high 86.6%.
- **Point error:** mean absolute error 0.065x (hour-of-week 0.122x, with rain/event 0.078x); bias -0.009x.

## What changed from v3.1 and why the numbers differ

- v3.1 had one multiplier per trip and derived each ride type by scaling it with hand-set sensitivities (0.25 / 0.55 / 1.00). v6 has per-ride-type history, so the per-ride-type numbers are real engine output on that data, not a scaled copy. Pooled F1 (v3.1: 94.4% vs 91.8% best baseline, 2.6 points) is not comparable: the data and the task changed.
- The data generator, the engine, the baselines, the app and the parity check all changed together; the previous results are in git history.

## Limits

- Simulated data with assumed per-ride-type behaviour; no trend or seasonality (a time-ordered split is only a mild test). Real fares would drift.
- The margin over the strongest simple baseline is small (3.4 points pooled), and the strongest baseline is itself a lookup on the same simulated rules.
- The six-seater evaluation is thin by design; coverage and F1 there depend on how much history we chose to give it.
- This evaluates point-in-time forecasts, not the 150- and 360-minute trajectories the app displays.
