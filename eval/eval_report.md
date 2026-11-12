# Eval Report — Surge Alert Forecast Engine vs. Naive Baseline

**Status:** Draft v1 · **Date:** 2026-11-12 · **Companion docs:** `prd.md`, `roadmap.md`, `app.html`

This closes two items the roadmap lists as "Not Started": the naive-baseline comparison, and (new, not previously scoped) a per-mode breakout of that comparison. It also independently re-derives the eval rather than trusting the unlabeled `EVAL` constant already hardcoded into `app.html` — that constant has no visible methodology attached to it, so it isn't citable on its own. Everything below is reproducible from `engine.py` in this same folder, run against the dataset decoded directly out of `app.html`'s own `ROWS` array.

## Data

- **Source:** the synthetic, time-of-day-rule-driven dataset already embedded in `app.html` (not the Boston Kaggle dataset — that required a Kaggle login this session didn't have; decided with the user to proceed on the already-built synthetic set instead, since it's the same one the in-app demo runs against).
- **13,629 total observations** across 5 routes, decoded from `app.html`'s packed base-36 `ROWS` array. Each row: `[routeIdx, dayOfWeek, minuteOfDay, rain, event, multiplier]`.
- **Split:** first 8,690 rows = train (history the engine matches against), remaining 4,939 = test (held out, scored). Matches the array's own generation order, which is chronological.
- **Honest limitation, stated up front:** this is simulated from time-of-day rules, so a time-of-day-aware model has a structural advantage over a time-of-day-only baseline. This demonstrates the pipeline works end to end — eligibility gating, confidence scoring, per-tier derivation — not that the approach beats a heuristic on real-world fares. That requires real logged data (self-logged sample, still "Not Started" per the roadmap).

## Method

- **Engine:** direct Python port of `app.html`'s forecast engine (`matchRows` → progressively widened route+condition match → city-wide population fallback → median/IQR band → confidence score), scored only on `train` rows for each test query — no leakage.
- **Classification threshold:** a query is a "surge predicted" positive if the forecast's point multiplier ≥ 1.25 (the engine's own `RISK_MEDIUM` cutoff). Silence (too few matched rows) counts as a negative prediction — the engine can't flatter its own recall by refusing to answer hard cases.
- **Naive baseline:** "surge happens in rush hour" — predicts positive iff the query falls on a weekday (Mon-Fri) in the 7:00-10:30am or 5:00-8:30pm windows, zero other signal. This is the exact heuristic named in the project's own brainstorm notes as the bar to beat.
- **Ground truth (aggregate):** the row's actual multiplier ≥ 1.25.
- **Ground truth (per mode):** the row's actual multiplier run through the same `tierMult(surge, sens)` function `app.html` uses to derive each tier's displayed chip (Two-wheeler sens 0.25, Three-wheeler sens 0.55, Standard sens 1.00), then thresholded the same way. The engine's per-mode *prediction* is derived identically, from its own forecast point. **Caveat:** this means per-mode modeling here is a scaled derivation of one route-level signal, not three independently-matched histories — the real gap PRD v4 and the roadmap flag ("per-tier sensitivity constants are hand-set, not fit from data"). This eval doesn't close that gap; it measures what's actually implemented today.

## Results

### Aggregate (route-level)

| | Precision | Recall | F1 | Accuracy |
|---|---|---|---|---|
| **Naive rush-hour baseline** | 57.7% | 66.9% | 62.0% | 73.5% |
| **Forecast engine** | 85.8% | 81.8% | **83.7%** | 89.8% |

Forecast coverage (share of test queries the engine was confident enough to answer, not silent): **100%** — every test query matched enough history on at least the city-wide fallback tier.

**+21.7 points of F1 over the naive baseline (a 35% relative improvement).**

### Per mode (new)

| Mode | Precision | Recall | F1 | Coverage | Actual positive rate |
|---|---|---|---|---|---|
| Standard | 85.8% | 81.8% | 83.7% | 100% | 32.2% |
| Three-wheeler | 83.1% | 91.4% | **87.1%** | 100% | 20.1% |
| Two-wheeler | 61.5% | 34.0% | 43.8% | 100% | 0.9% |

**Reading this honestly:** Two-wheeler's low F1 isn't a modeling failure — it's a near-tautology of its 0.25 sensitivity constant. At that sensitivity, a route-level 2.0× cap only ever pushes the tier's own multiplier to ~1.25, right at the classification threshold, so there's almost no actual positive signal to detect (0.9% of test queries) and the few that exist are borderline by construction. This matches the roadmap's own flagged risk: thin-signal tiers need their sensitivity constants fit from real data, not hand-set, before this number means much for that tier specifically.

## What this does and doesn't prove

- **Proves:** the full pipeline — eligibility gating, progressive match-widening, confidence scoring, per-tier derivation, held-out scoring — runs correctly end to end, and beats the stated naive baseline by a wide, real margin on the data it has.
- **Doesn't prove:** that this beats a naive heuristic on real Indian fare data. The synthetic dataset is rule-generated, so a rule-aware model winning is partly true by construction. This is why the roadmap's next step — a real, even if small, self-logged sample — is the actual bar this result needs to clear next.
- **Doesn't prove:** that per-mode sensitivity constants (0.25/0.55/1.00) are correct. This eval exposes exactly where that assumption is weakest (Two-wheeler) rather than hiding it.

## Recommendation

1. Treat this report, not the opaque `EVAL` constant in `app.html`, as the citable number going forward — it's the one with a documented, rerunnable methodology (`engine.py` in this folder).
2. If real self-logged data materializes before the deadline, rerun `engine.py` against it (same script, swap `rows.json`) — the per-mode breakout code is already in place to grade it the same way.
3. For a resume bullet: *"Built and evaluated a surge-forecast engine against a naive rush-hour baseline, achieving 83.7% F1 vs. 62.0% (+35% relative), with an honest per-mode breakout that surfaced a specific, explainable weakness in the lowest-sensitivity tier rather than hiding it."* That last clause is the part that reads as real PM judgment, not just a model metric.
