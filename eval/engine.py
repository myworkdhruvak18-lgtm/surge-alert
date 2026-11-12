"""
Python port of the Surge Alert forecast engine, mirroring app.html's JS engine
exactly (matchRows / matchPopulation / forecast), to independently reproduce
and extend the EVAL constant baked into app.html.
"""
import json, math

SURGE_CAP = 2.0
SURGE_FLOOR = 0.5
MIN_OBSERVATIONS = 8
CONFIDENT_OBSERVATIONS = 20
RISK_MEDIUM = 1.25
RISK_HIGH = 1.55

def clip_mult(x):
    return max(SURGE_FLOOR, min(SURGE_CAP, x))

def percentile(sorted_vals, p):
    if not sorted_vals:
        return 1.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    idx = p * (len(sorted_vals) - 1)
    lo = math.floor(idx)
    hi = math.ceil(idx)
    if lo == hi:
        return sorted_vals[lo]
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (idx - lo)

def match_rows(rows, route_idx, dow, minutes, rain, event, half_window, strict):
    weekend = dow >= 5
    out = []
    for r in rows:
        if r[0] != route_idx:
            continue
        if (r[1] >= 5) != weekend:
            continue
        raw = abs(r[2] - minutes)
        delta = min(raw, 1440 - raw)
        if delta > half_window:
            continue
        if strict and (r[3] != rain or r[4] != event):
            continue
        out.append(r[5])
    return out

def match_population(rows, dow, minutes, half_window):
    weekend = dow >= 5
    out = []
    for r in rows:
        if (r[1] >= 5) != weekend:
            continue
        raw = abs(r[2] - minutes)
        delta = min(raw, 1440 - raw)
        if delta > half_window:
            continue
        out.append(r[5])
    return out

def forecast(rows, route_idx, minutes, dow, rain=0, event=0):
    widened = False
    vals = match_rows(rows, route_idx, dow, minutes, rain, event, 45, True)
    if len(vals) < MIN_OBSERVATIONS:
        vals = match_rows(rows, route_idx, dow, minutes, rain, event, 45, False)
        widened = True
    if len(vals) < MIN_OBSERVATIONS:
        vals = match_rows(rows, route_idx, dow, minutes, rain, event, 90, False)
        widened = True

    scope = 'route'
    if len(vals) < MIN_OBSERVATIONS:
        pop = match_population(rows, dow, minutes, 45)
        if len(pop) >= MIN_OBSERVATIONS:
            vals = pop
            scope = 'population'
            widened = True

    n = len(vals)
    if n < MIN_OBSERVATIONS:
        return {'status': 'silent', 'n': n, 'scope': scope}

    vals = sorted(vals)
    point = clip_mult(percentile(vals, 0.5))
    low = clip_mult(percentile(vals, 0.25))
    high = clip_mult(percentile(vals, 0.75))

    size_term = min(1.0, (n - MIN_OBSERVATIONS) / (CONFIDENT_OBSERVATIONS - MIN_OBSERVATIONS))
    spread_term = max(0.0, 1.0 - (high - low) / 0.9)
    confidence = 0.60 * size_term + 0.40 * spread_term
    if widened:
        confidence *= 0.85
    if scope == 'population':
        confidence *= 0.70
    confidence = round(max(0, min(1, confidence)) * 1000) / 1000

    risk = 'high' if point >= RISK_HIGH else 'medium' if point >= RISK_MEDIUM else 'low'

    return {'status': 'ok', 'multiplier': round(point, 2), 'bandLow': round(low, 2),
            'bandHigh': round(high, 2), 'risk': risk, 'confidence': confidence,
            'n': n, 'scope': scope}

def naive_rush_hour(dow, minutes):
    """Naive baseline: predict 'surge' iff weekday morning or evening peak window."""
    if dow >= 5:
        return 0
    if 420 <= minutes <= 630:
        return 1
    if 1020 <= minutes <= 1230:
        return 1
    return 0

TIERS = [
    {'name': 'Two-wheeler',   'sens': 0.25},
    {'name': 'Three-wheeler', 'sens': 0.55},
    {'name': 'Standard',      'sens': 1.00},
]

def tier_mult(surge, sens):
    return 1 + (surge - 1) * sens

def prf1(tp, fp, fn, tn):
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    accuracy = (tp + tn) / (tp + fp + fn + tn) if (tp + fp + fn + tn) else 0.0
    return {'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn,
            'precision': precision, 'recall': recall, 'f1': f1, 'accuracy': accuracy}

def main():
    rows = json.load(open('rows.json'))
    n_total = len(rows)
    n_train = 8690
    train = rows[:n_train]
    test = rows[n_train:]
    print('n_total', n_total, 'n_train', len(train), 'n_test', len(test))

    # ---- Aggregate (route-level) reproduction of EVAL ----
    agg = {'engine': {'tp':0,'fp':0,'fn':0,'tn':0}, 'baseline': {'tp':0,'fp':0,'fn':0,'tn':0}}
    silent_n = 0
    for r in test:
        route_idx, dow, minutes, rain, event, true_mult = r
        truth = 1 if true_mult >= RISK_MEDIUM else 0
        f = forecast(train, route_idx, minutes, dow, rain, event)
        if f['status'] == 'silent':
            pred = 0
            silent_n += 1
        else:
            pred = 1 if f['multiplier'] >= RISK_MEDIUM else 0
        base_pred = naive_rush_hour(dow, minutes)

        for key, p in (('engine', pred), ('baseline', base_pred)):
            if p == 1 and truth == 1: agg[key]['tp'] += 1
            elif p == 1 and truth == 0: agg[key]['fp'] += 1
            elif p == 0 and truth == 1: agg[key]['fn'] += 1
            else: agg[key]['tn'] += 1

    print('\n=== AGGREGATE (route-level, reproduced) ===')
    print('coverage (non-silent share):', round(1 - silent_n/len(test), 4))
    for key in ('engine', 'baseline'):
        c = agg[key]
        r = prf1(c['tp'], c['fp'], c['fn'], c['tn'])
        print(key, {k: (round(v,4) if isinstance(v,float) else v) for k,v in r.items()})

    # ---- Per-mode breakout (new) ----
    print('\n=== PER-MODE BREAKOUT (new) ===')
    per_mode = {}
    for tier in TIERS:
        sens = tier['sens']
        c = {'tp':0,'fp':0,'fn':0,'tn':0}
        silent = 0
        for r in test:
            route_idx, dow, minutes, rain, event, true_mult = r
            true_tier_mult = clip_mult(tier_mult(true_mult, sens))
            truth = 1 if true_tier_mult >= RISK_MEDIUM else 0
            f = forecast(train, route_idx, minutes, dow, rain, event)
            if f['status'] == 'silent':
                pred = 0
                silent += 1
            else:
                pred_tier_mult = clip_mult(tier_mult(f['multiplier'], sens))
                pred = 1 if pred_tier_mult >= RISK_MEDIUM else 0
            if pred == 1 and truth == 1: c['tp'] += 1
            elif pred == 1 and truth == 0: c['fp'] += 1
            elif pred == 0 and truth == 1: c['fn'] += 1
            else: c['tn'] += 1
        r = prf1(c['tp'], c['fp'], c['fn'], c['tn'])
        r['coverage'] = round(1 - silent/len(test), 4)
        r['positive_rate'] = round((c['tp']+c['fn'])/len(test), 4)
        per_mode[tier['name']] = {k: (round(v,4) if isinstance(v,float) else v) for k,v in r.items()}
        print(tier['name'], per_mode[tier['name']])

    json.dump({'n_train': len(train), 'n_test': len(test), 'per_mode': per_mode}, open('per_mode_eval.json','w'), indent=2)

if __name__ == '__main__':
    main()
