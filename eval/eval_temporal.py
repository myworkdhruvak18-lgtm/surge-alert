"""
Time-ordered evaluation of the Surge Alert forecast engine.

Train = every row on a day before the cutoff (18 weeks). Test = every row from the cutoff on
(the final 8 weeks), which the engine never saw. As a comparison it also scores a random row
split of the same data, which is what earlier versions of this eval actually did while the
app labelled it "temporal".

What it scores
  1. Classification (is the multiplier at least 1.25x?) for the engine and three baselines:
       naive           surge happens in weekday rush hours, nothing else
       hour-of-week    mean multiplier for (route, day of week, hour); no weather or events
       hour+conditions the same, split by rain and event too (a no-frills lookup)
  2. Calibration of what the engine tells a rider: does the p25-p75 band hold about half of
     outcomes, does the confidence score track accuracy, are the low/medium/high risk labels
     reliable, and how large is the point error?

The forecast function is a port of forecast() in app/app.html (same matching tiers, same
confidence maths). `python eval_temporal.py --parity` prints forecasts on ALL rows for a fixed
set of queries; eval/parity_check.js checks the app's answers against them.

Usage: python eval_temporal.py            (writes eval_results.json)
"""
import datetime
import json
import math
import os
import sys

import numpy as np

SURGE_CAP, SURGE_FLOOR = 2.0, 0.5
MIN_OBS, CONFIDENT_OBS = 8, 20
RISK_MEDIUM, RISK_HIGH = 1.25, 1.55
TIERS = [('Two-wheeler', 0.25), ('Three-wheeler', 0.55), ('Standard', 1.00), ('Sedan', 1.00), ('Six-seater', 1.00)]
CONF_BINS = [(0.0, 0.8), (0.8, 0.9), (0.9, 0.95), (0.95, 1.01)]

HERE = os.path.dirname(os.path.abspath(__file__))


def clip(x):
    return max(SURGE_FLOOR, min(SURGE_CAP, x))


def round2(x):
    return math.floor(x * 100 + 0.5 + 1e-9) / 100


def cents(x):
    return int(round(x * 100))


def risk_of(x):
    return 'high' if x >= RISK_HIGH else 'medium' if x >= RISK_MEDIUM else 'low'


class Engine:
    def __init__(self, rows):
        a = np.asarray(rows, dtype=np.float64)
        weekend = a[:, 1] >= 5
        self.idx = {}
        for r in range(5):
            for w in (False, True):
                m = (a[:, 0] == r) & (weekend == w)
                self.idx[(r, w)] = (a[m, 2], a[m, 3], a[m, 4], a[m, 5])
        self.pop = {w: (a[weekend == w, 2], a[weekend == w, 5]) for w in (False, True)}
        self.cache = {}

    @staticmethod
    def _delta(mins, minutes):
        raw = np.abs(mins - minutes)
        return np.minimum(raw, 1440 - raw)

    def forecast(self, route, dow, minutes, rain, event):
        key = (route, dow >= 5, minutes, rain, event)
        hit = self.cache.get(key)
        if hit is not None:
            return hit
        w = dow >= 5
        mins, rains, events, mults = self.idx[(route, w)]
        d = self._delta(mins, minutes)
        widened = False
        vals = mults[(d <= 45) & (rains == rain) & (events == event)]
        if len(vals) < MIN_OBS:
            vals, widened = mults[d <= 45], True
        if len(vals) < MIN_OBS:
            vals, widened = mults[d <= 90], True
        scope = 'route'
        if len(vals) < MIN_OBS:
            pm, pmult = self.pop[w]
            pv = pmult[self._delta(pm, minutes) <= 45]
            if len(pv) >= MIN_OBS:
                vals, scope, widened = pv, 'population', True
        n = len(vals)
        if n < MIN_OBS:
            out = {'status': 'silent', 'n': n, 'scope': scope}
        else:
            point = clip(float(np.percentile(vals, 50)))
            low, high = clip(float(np.percentile(vals, 25))), clip(float(np.percentile(vals, 75)))
            conf = 0.6 * min(1.0, (n - MIN_OBS) / (CONFIDENT_OBS - MIN_OBS)) + 0.4 * max(0.0, 1.0 - (high - low) / 0.9)
            if widened:
                conf *= 0.85
            if scope == 'population':
                conf *= 0.70
            conf = round(max(0, min(1, conf)) * 1000) / 1000
            out = {'status': 'ok', 'point': point, 'multiplier': round2(point), 'low': round2(low), 'high': round2(high),
                   'n': n, 'scope': scope, 'confidence': conf}
        self.cache[key] = out
        return out


class HourOfWeek:
    """Mean multiplier per (route, day of week, hour), optionally split by rain and event.
    A cell with fewer than 8 rows falls back to (route, weekday/weekend, hour), then to
    (weekday/weekend, hour) across all routes."""

    def __init__(self, rows, with_conditions):
        self.start = 0 if with_conditions else 1
        self.tables = [{}, {}, {}, {}]
        for route, dow, minutes, rain, event, mult, *_ in rows:
            for t, k in zip(self.tables, self._keys(int(route), int(dow), int(minutes), int(rain), int(event))):
                s = t.get(k)
                if s is None:
                    t[k] = [mult, 1]
                else:
                    s[0] += mult
                    s[1] += 1

    @staticmethod
    def _keys(route, dow, minutes, rain, event):
        hour, wk = minutes // 60, dow >= 5
        return [(route, dow, hour, rain, event), (route, dow, hour), (route, wk, hour), (wk, hour)]

    def predict(self, route, dow, minutes, rain, event):
        keys = self._keys(route, dow, minutes, rain, event)
        for t, k in list(zip(self.tables, keys))[self.start:]:
            s = t.get(k)
            if s and s[1] >= MIN_OBS:
                return s[0] / s[1]
        s = self.tables[3][keys[3]]
        return s[0] / s[1]


def prf1(tp, fp, fn, tn):
    p = tp / (tp + fp) if tp + fp else 0.0
    r = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * p * r / (p + r) if p + r else 0.0
    tot = tp + fp + fn + tn
    return {'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn, 'precision': round(p, 4), 'recall': round(r, 4),
            'f1': round(f1, 4), 'accuracy': round((tp + tn) / tot, 4) if tot else 0.0}


def naive(dow, minutes):
    return 1 if dow < 5 and (420 <= minutes <= 630 or 1020 <= minutes <= 1230) else 0


def score(train_rows, test_rows, extras=False):
    eng = Engine(train_rows)
    how, howc = HourOfWeek(train_rows, False), HourOfWeek(train_rows, True)
    names = ['naive', 'engine', 'how', 'howc']
    agg = {k: [0, 0, 0, 0] for k in names}
    modes = {n: {k: [0, 0, 0, 0] for k in names} for n, _ in TIERS}
    silent = 0
    n = len(test_rows)

    band = {'inside': 0, 'zero': 0, 'inside_nz': 0, 'n_nz': 0}
    bins = [{'n': 0, 'inside': 0, 'correct': 0, 'abs_err': 0.0} for _ in CONF_BINS]
    risk = {k: {'low': 0, 'medium': 0, 'high': 0} for k in ('low', 'medium', 'high')}
    err = {'engine': [0.0, 0.0], 'how': 0.0, 'howc': 0.0}

    def tally(c, pred, truth):
        c[0 if pred and truth else 1 if pred else 2 if truth else 3] += 1

    for route, dow, minutes, rain, event, mult, *_ in test_rows:
        route, dow, minutes, rain, event = int(route), int(dow), int(minutes), int(rain), int(event)
        f = eng.forecast(route, dow, minutes, rain, event)
        ok = f['status'] == 'ok'
        silent += 0 if ok else 1
        mh, mc = how.predict(route, dow, minutes, rain, event), howc.predict(route, dow, minutes, rain, event)
        truth = mult >= RISK_MEDIUM
        preds = {'naive': naive(dow, minutes) == 1, 'engine': ok and f['point'] >= RISK_MEDIUM, 'how': mh >= RISK_MEDIUM, 'howc': mc >= RISK_MEDIUM}
        for k in names:
            tally(agg[k], preds[k], truth)
        for name, sens in TIERS:
            t_truth = clip(1 + (mult - 1) * sens) >= RISK_MEDIUM
            t_preds = {'naive': preds['naive'], 'engine': ok and clip(1 + (f['point'] - 1) * sens) >= RISK_MEDIUM,
                       'how': clip(1 + (mh - 1) * sens) >= RISK_MEDIUM, 'howc': clip(1 + (mc - 1) * sens) >= RISK_MEDIUM}
            for k in names:
                tally(modes[name][k], t_preds[k], t_truth)
        if not (extras and ok):
            continue
        inside = cents(f['low']) <= cents(mult) <= cents(f['high'])
        zero = cents(f['low']) == cents(f['high'])
        band['inside'] += inside
        band['zero'] += zero
        if not zero:
            band['n_nz'] += 1
            band['inside_nz'] += inside
        for i, (lo, hi) in enumerate(CONF_BINS):
            if lo <= f['confidence'] < hi:
                b = bins[i]
                b['n'] += 1
                b['inside'] += inside
                b['correct'] += preds['engine'] == truth
                b['abs_err'] += abs(mult - f['point'])
                break
        risk[risk_of(f['point'])][risk_of(mult)] += 1
        err['engine'][0] += abs(mult - f['point'])
        err['engine'][1] += mult - f['point']
        err['how'] += abs(mult - mh)
        err['howc'] += abs(mult - mc)

    result = {'n_test': n, 'coverage': round(1 - silent / n, 4), 'engine': prf1(*agg['engine']), 'baseline': prf1(*agg['naive']),
              'how': prf1(*agg['how']), 'howc': prf1(*agg['howc']),
              'per_mode': {k: prf1(*v['engine']) for k, v in modes.items()},
              'per_mode_baselines': {k: {b: prf1(*v[b]) for b in ('naive', 'how', 'howc')} for k, v in modes.items()}}
    if extras:
        m = n - silent
        result['calibration'] = {
            'band': {'rows': m, 'coverage': round(band['inside'] / m, 4), 'zero_width_share': round(band['zero'] / m, 4),
                     'rows_nondegenerate': band['n_nz'], 'coverage_nondegenerate': round(band['inside_nz'] / band['n_nz'], 4) if band['n_nz'] else None},
            'confidence_buckets': [{'range': [lo, min(hi, 1.0)], 'rows': b['n'], 'share': round(b['n'] / m, 4),
                                    'band_coverage': round(b['inside'] / b['n'], 4) if b['n'] else None,
                                    'accuracy': round(b['correct'] / b['n'], 4) if b['n'] else None,
                                    'mae': round(b['abs_err'] / b['n'], 4) if b['n'] else None}
                                   for (lo, hi), b in zip(CONF_BINS, bins)],
            'risk_reliability': {p: {'rows': sum(c.values()), **{a: round(v / sum(c.values()), 4) if sum(c.values()) else None for a, v in c.items()}}
                                 for p, c in risk.items()},
            'point_error': {'engine_mae': round(err['engine'][0] / m, 4), 'engine_bias': round(err['engine'][1] / m, 4),
                            'how_mae': round(err['how'] / m, 4), 'howc_mae': round(err['howc'] / m, 4)},
        }
    return result


def load():
    with open(os.path.join(HERE, 'rows.json')) as f:
        return json.load(f)


def parity():
    d = load()
    eng = Engine(d['rows'])
    rng = np.random.default_rng(11)
    out = []
    for _ in range(300):
        q = (int(rng.integers(0, 5)), int(rng.integers(0, 7)), int(rng.integers(0, 24) * 60 + rng.integers(0, 4) * 15),
             int(rng.integers(0, 2)), int(rng.integers(0, 2)))
        f = eng.forecast(*q)
        out.append({'q': q, 'status': f['status'], 'multiplier': f.get('multiplier'), 'low': f.get('low'), 'high': f.get('high'),
                    'n': f['n'], 'scope': f['scope'], 'confidence': f.get('confidence')})
    print(json.dumps(out))


def main():
    d = load()
    rows, cut = d['rows'], d['train_days']
    train = [r for r in rows if r[6] < cut]
    test = [r for r in rows if r[6] >= cut]
    start = datetime.date.fromisoformat(d['start'])
    cutoff = start + datetime.timedelta(days=cut)
    print(f"train {len(train):,} rows, days 0-{cut - 1} | test {len(test):,} rows, days {cut}-{d['n_days'] - 1} | cutoff {cutoff}")

    temporal = score(train, test, extras=True)
    rng = np.random.default_rng(7)
    perm = rng.permutation(len(rows))
    n_tr = len(train)
    rnd = score([rows[i] for i in perm[:n_tr]], [rows[i] for i in perm[n_tr:]])

    result = {
        'start': d['start'], 'cutoff': cutoff.isoformat(), 'last_day': (start + datetime.timedelta(days=d['n_days'] - 1)).isoformat(),
        'train_days': cut, 'test_days': d['n_days'] - cut, 'n_train': len(train), 'n_test': len(test),
        'temporal': temporal, 'random_split': rnd,
    }
    with open(os.path.join(HERE, 'eval_results.json'), 'w') as f:
        json.dump(result, f, indent=2)
    for k in ('engine', 'baseline', 'how', 'howc'):
        print('TEMPORAL', k.ljust(9), temporal[k])
    print('coverage', temporal['coverage'])
    print('RANDOM  engine', rnd['engine']['f1'], ' naive', rnd['baseline']['f1'], ' how', rnd['how']['f1'], ' howc', rnd['howc']['f1'])
    print(json.dumps(temporal['calibration'], indent=1))


if __name__ == '__main__':
    parity() if '--parity' in sys.argv else main()
