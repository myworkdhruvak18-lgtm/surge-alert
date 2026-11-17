"""Vectorized (numpy) re-run of the eval against the new, denser dataset."""
import json
import numpy as np

SURGE_FLOOR, SURGE_CAP = 0.5, 2.0
MIN_OBSERVATIONS, CONFIDENT_OBSERVATIONS = 8, 20
RISK_MEDIUM = 1.25

TIERS = [('Two-wheeler', 0.25), ('Three-wheeler', 0.55), ('Standard', 1.00)]

def tier_mult(surge, sens):
    return 1 + (surge - 1) * sens

def clip(x):
    return np.clip(x, SURGE_FLOOR, SURGE_CAP)

def main():
    rows = json.load(open('rows.json'))
    arr = np.array(rows, dtype=np.float64)
    n_total = len(arr)
    n_train = int(n_total * 0.636)  # match the original 8690/13629 ratio
    train = arr[:n_train]
    test = arr[n_train:]
    print('n_total', n_total, 'n_train', len(train), 'n_test', len(test))

    t_route, t_dow, t_min, t_rain, t_event, t_mult = train.T
    t_weekend = t_dow >= 5

    def forecast_batch(route_q, dow_q, min_q, rain_q, event_q):
        weekend_q = dow_q >= 5
        raw = np.abs(t_min - min_q)
        delta = np.minimum(raw, 1440 - raw)

        route_match = (t_route == route_q)
        weekend_match = (t_weekend == weekend_q)
        cond_match = (t_rain == rain_q) & (t_event == event_q)

        m1 = route_match & weekend_match & (delta <= 45) & cond_match
        if m1.sum() >= MIN_OBSERVATIONS:
            vals, widened, scope = t_mult[m1], False, 'route'
        else:
            m2 = route_match & weekend_match & (delta <= 45)
            if m2.sum() >= MIN_OBSERVATIONS:
                vals, widened, scope = t_mult[m2], True, 'route'
            else:
                m3 = route_match & weekend_match & (delta <= 90)
                if m3.sum() >= MIN_OBSERVATIONS:
                    vals, widened, scope = t_mult[m3], True, 'route'
                else:
                    m4 = weekend_match & (delta <= 45)
                    if m4.sum() >= MIN_OBSERVATIONS:
                        vals, widened, scope = t_mult[m4], True, 'population'
                    else:
                        return None
        point = clip(np.percentile(vals, 50))
        return {'multiplier': round(float(point), 2), 'n': len(vals)}

    def naive(dow, minutes):
        if dow >= 5: return 0
        if 420 <= minutes <= 630: return 1
        if 1020 <= minutes <= 1230: return 1
        return 0

    def prf1(tp, fp, fn, tn):
        p = tp/(tp+fp) if (tp+fp) else 0.0
        r = tp/(tp+fn) if (tp+fn) else 0.0
        f1 = 2*p*r/(p+r) if (p+r) else 0.0
        acc = (tp+tn)/(tp+fp+fn+tn) if (tp+fp+fn+tn) else 0.0
        return dict(tp=tp, fp=fp, fn=fn, tn=tn, precision=round(p,4), recall=round(r,4), f1=round(f1,4), accuracy=round(acc,4))

    agg = {'engine': [0,0,0,0], 'baseline': [0,0,0,0]}
    silent = 0
    per_mode = {name: [0,0,0,0] for name, _ in TIERS}
    per_mode_silent = {name: 0 for name, _ in TIERS}

    step = max(1, len(test)//2000)  # subsample test set for speed, still thousands of points
    sample_idx = range(0, len(test), step)
    n_scored = 0

    for i in sample_idx:
        route_q, dow_q, min_q, rain_q, event_q, true_mult = test[i]
        n_scored += 1
        f = forecast_batch(route_q, dow_q, min_q, rain_q, event_q)
        truth = 1 if true_mult >= RISK_MEDIUM else 0
        if f is None:
            pred = 0
            silent += 1
        else:
            pred = 1 if f['multiplier'] >= RISK_MEDIUM else 0
        base_pred = naive(dow_q, min_q)
        for key, p in (('engine', pred), ('baseline', base_pred)):
            c = agg[key]
            if p==1 and truth==1: c[0]+=1
            elif p==1 and truth==0: c[1]+=1
            elif p==0 and truth==1: c[2]+=1
            else: c[3]+=1

        for name, sens in TIERS:
            true_tier = clip(1 + (true_mult-1)*sens)
            truth_t = 1 if true_tier >= RISK_MEDIUM else 0
            if f is None:
                pred_t = 0
                per_mode_silent[name] += 1
            else:
                pred_tier = clip(1 + (f['multiplier']-1)*sens)
                pred_t = 1 if pred_tier >= RISK_MEDIUM else 0
            c = per_mode[name]
            if pred_t==1 and truth_t==1: c[0]+=1
            elif pred_t==1 and truth_t==0: c[1]+=1
            elif pred_t==0 and truth_t==1: c[2]+=1
            else: c[3]+=1

    print('n_scored (subsampled)', n_scored)
    print('coverage', round(1-silent/n_scored, 4))
    for key in ('engine','baseline'):
        print(key, prf1(*agg[key]))

    print('\nper-mode:')
    results = {}
    for name, _ in TIERS:
        r = prf1(*per_mode[name])
        r['coverage'] = round(1 - per_mode_silent[name]/n_scored, 4)
        r['positive_rate'] = round((per_mode[name][0]+per_mode[name][2])/n_scored, 4)
        print(name, r)
        results[name] = r

    json.dump({
        'n_train': len(train), 'n_test_scored': n_scored,
        'coverage': round(1-silent/n_scored, 4),
        'engine': prf1(*agg['engine']), 'baseline': prf1(*agg['baseline']),
        'per_mode': results,
    }, open('new_eval_results.json', 'w'), indent=2)

if __name__ == '__main__':
    main()
