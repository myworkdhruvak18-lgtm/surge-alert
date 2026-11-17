"""
Time-ordered evaluation of the Surge Alert forecast engine against a naive rush-hour baseline.

Train = every row on a day before the cutoff (18 weeks). Test = every row from the cutoff on
(the final 8 weeks), which the engine never saw. As a comparison it also scores a random row
split of the same data, which is what earlier versions of this eval actually did while the
app labelled it "temporal".

The forecast function is a port of forecast() in app/app.html (same matching tiers, same
confidence maths). Run `python eval_temporal.py --parity` to print forecasts on ALL rows for a
fixed set of queries; eval/parity_check.js prints the app's answers for the same queries.

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
RISK_MEDIUM = 1.25
TIERS = [('Two-wheeler', 0.25), ('Three-wheeler', 0.55), ('Standard', 1.00), ('Sedan', 1.00), ('Six-seater', 1.00)]

HERE = os.path.dirname(os.path.abspath(__file__))


def clip(x):
    return max(SURGE_FLOOR, min(SURGE_CAP, x))


def round2(x):
    return math.floor(x * 100 + 0.5 + 1e-9) / 100


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
            out = {'status': 'ok', 'point': point, 'multiplier': round2(point), 'n': n, 'scope': scope, 'confidence': conf}
        self.cache[key] = out
        return out


def prf1(tp, fp, fn, tn):
    p = tp / (tp + fp) if tp + fp else 0.0
    r = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * p * r / (p + r) if p + r else 0.0
    tot = tp + fp + fn + tn
    return {'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn, 'precision': round(p, 4), 'recall': round(r, 4),
            'f1': round(f1, 4), 'accuracy': round((tp + tn) / tot, 4) if tot else 0.0}


def naive(dow, minutes):
    return 1 if dow < 5 and (420 <= minutes <= 630 or 1020 <= minutes <= 1230) else 0


def score(train_rows, test_rows):
    eng = Engine(train_rows)
    agg = {'engine': [0, 0, 0, 0], 'baseline': [0, 0, 0, 0]}
    modes = {n: [0, 0, 0, 0] for n, _ in TIERS}
    silent = 0

    def tally(c, pred, truth):
        c[0 if pred and truth else 1 if pred else 2 if truth else 3] += 1

    for route, dow, minutes, rain, event, mult, *_ in test_rows:
        f = eng.forecast(int(route), int(dow), int(minutes), int(rain), int(event))
        ok = f['status'] == 'ok'
        silent += 0 if ok else 1
        tally(agg['engine'], ok and f['point'] >= RISK_MEDIUM, mult >= RISK_MEDIUM)
        tally(agg['baseline'], naive(dow, minutes), mult >= RISK_MEDIUM)
        for name, sens in TIERS:
            truth = clip(1 + (mult - 1) * sens) >= RISK_MEDIUM
            pred = ok and clip(1 + (f['point'] - 1) * sens) >= RISK_MEDIUM
            tally(modes[name], pred, truth)
    n = len(test_rows)
    return {'n_test': n, 'coverage': round(1 - silent / n, 4), 'engine': prf1(*agg['engine']),
            'baseline': prf1(*agg['baseline']), 'per_mode': {k: prf1(*v) for k, v in modes.items()}}


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
        out.append({'q': q, 'status': f['status'], 'multiplier': f.get('multiplier'), 'n': f['n'], 'scope': f['scope'], 'confidence': f.get('confidence')})
    print(json.dumps(out))


def main():
    d = load()
    rows, cut = d['rows'], d['train_days']
    train = [r for r in rows if r[6] < cut]
    test = [r for r in rows if r[6] >= cut]
    start = datetime.date.fromisoformat(d['start'])
    cutoff = start + datetime.timedelta(days=cut)
    print(f"train {len(train):,} rows, days 0-{cut - 1} | test {len(test):,} rows, days {cut}-{d['n_days'] - 1} | cutoff {cutoff}")

    temporal = score(train, test)

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
    print('TEMPORAL  engine', temporal['engine'], '\n          baseline', temporal['baseline'], '\n          coverage', temporal['coverage'])
    print('RANDOM    engine', rnd['engine'], '\n          baseline', rnd['baseline'])
    for k, v in temporal['per_mode'].items():
        print('mode', k, v)


if __name__ == '__main__':
    parity() if '--parity' in sys.argv else main()
