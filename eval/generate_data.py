"""
Generates the Surge Alert synthetic dataset with a real calendar.

Every row belongs to a dated day. Weather and events are day-level (rain comes in spells that
persist from day to day; an event occupies an evening window), and each day carries a small
demand shock, so rows from the same day are correlated. That is what makes a time-ordered
train/test split meaningful: a random row split would put the same day on both sides.

The process is still stationary (no trend, no seasonality), so a time-ordered split is only a
mild test here. Real data will drift.

Row format: [route, dow, minutes, rain, event, multiplier, day, mode]
  dow: 0 = Monday ... 6 = Sunday, derived from the date. day: 0 = START.
  mode: 0 Two-wheeler, 1 Three-wheeler (auto), 2 Standard (the benchmark cab pool), 3 Sedan, 4 Six-seater.

PER-MODE (v6): every ride type has its own rows and its own surge behaviour, so the engine can match, go silent and report
coverage per ride type. The per-mode behaviour below is still an ASSUMPTION of this simulation (how strongly each pool
follows the shared demand curve, how hard rain and events hit each pool, how thin its supply is). It is not real data.

Usage: python generate_data.py [path to write the app's packed ROWS string]
"""
import datetime
import json
import os
import random
import sys

random.seed(7)

START = datetime.date(2026, 5, 18)   # a Monday
N_DAYS = 182                         # 26 whole weeks
TRAIN_DAYS = 126                     # 18 weeks train, 8 weeks test (cutoff 2026-09-21)
N_ROUTES = 5
SURGE_FLOOR, SURGE_CAP = 0.5, 2.0
ROUTE_BUSY = [1.00, 1.15, 0.90, 1.05, 0.80]
ROWS_PER_ROUTE = 28000

# per-mode behaviour: share of the Standard row volume, how much of the demand curve's excess the pool follows,
# rain and event add-ons (uniform ranges), and extra noise
MODES = [
    # name,           volume, follow, rain (lo, hi),  event (lo, hi), noise
    ('Two-wheeler',   0.70,   0.30,  (0.10, 0.22),  (0.02, 0.08),   0.05),
    ('Three-wheeler', 0.80,   0.60,  (0.18, 0.32),  (0.12, 0.24),   0.06),
    ('Standard',      1.00,   1.00,  (0.28, 0.42),  (0.32, 0.48),   0.06),
    ('Sedan',         0.35,   1.05,  (0.30, 0.45),  (0.30, 0.46),   0.07),
    ('Six-seater',    0.012,  1.15,  (0.30, 0.50),  (0.30, 0.50),   0.10),
]
N_MODES = len(MODES)

RAIN_STAY, RAIN_START = 0.70, 0.30   # P(rainy today | rainy yesterday / dry yesterday)
RAIN_LEN = (7.0, 12.0)               # hours
EVENT_DAY_P = 0.60
EVENT_LEN = (4.0, 6.0)               # hours
DAY_SHOCK_SD = 0.04


def clip(x):
    return max(SURGE_FLOOR, min(SURGE_CAP, x))


def base_curve(dow, minutes):
    weekend = dow >= 5
    hour = minutes / 60.0
    if not weekend:
        if 7.5 <= hour <= 10.0:
            return 1.15 + 0.55 * max(0, 1.0 - abs(hour - 8.75) / 1.25)
        if 17.0 <= hour <= 20.5:
            return 1.20 + 0.60 * max(0, 1.0 - abs(hour - 18.75) / 1.75)
        if 0 <= hour <= 5.5 or hour >= 23:
            return 0.70
        return 1.00
    if 20.0 <= hour <= 23.5:
        return 1.15 + 0.55 * max(0, 1.0 - abs(hour - 21.75) / 1.75)
    if 0 <= hour <= 5.5:
        return 0.65
    return 0.95


def make_days():
    days, rainy = [], random.random() < 0.5
    for d in range(N_DAYS):
        rainy = random.random() < (RAIN_STAY if rainy else RAIN_START)
        rain_win = None
        if rainy:
            s = random.uniform(5, 14)
            rain_win = (s * 60, (s + random.uniform(*RAIN_LEN)) * 60)
        event_win = None
        if random.random() < EVENT_DAY_P:
            s = random.uniform(6, 21)
            event_win = (s * 60, (s + random.uniform(*EVENT_LEN)) * 60)
        days.append({'dow': (START + datetime.timedelta(days=d)).weekday(), 'rain': rain_win,
                     'event': event_win, 'shock': random.gauss(0, DAY_SHOCK_SD)})
    return days


def pick_minutes():
    bucket = random.choices(['morning', 'evening', 'night', 'other'], weights=[28, 30, 18, 24])[0]
    if bucket == 'morning':
        return int(random.gauss(8.75, 0.9) * 60) % 1440
    if bucket == 'evening':
        return int(random.gauss(18.75, 1.1) * 60) % 1440
    if bucket == 'night':
        return int(random.gauss(21.5, 1.5) * 60) % 1440
    return random.randint(0, 1439)


def inside(win, minutes):
    return 1 if win and win[0] <= minutes <= win[1] else 0


def gen_row(route_idx, d, day, mode=2):
    _name, _vol, follow, rain_rng, event_rng, noise = MODES[mode]
    minutes = pick_minutes()
    rain, event = inside(day['rain'], minutes), inside(day['event'], minutes)
    # the pool follows its own share of the demand curve's excess over 1.0 (a quiet night is a discount, scaled the same way)
    excess = base_curve(day['dow'], minutes) * ROUTE_BUSY[route_idx] - 1.0 + day['shock']
    mult = 1.0 + excess * follow
    if rain:
        mult += random.uniform(*rain_rng)
    if event:
        mult += random.uniform(*event_rng)
    mult += random.gauss(0, noise)
    return [route_idx, day['dow'], minutes, rain, event, round(clip(mult), 2), d, mode]


def base36(v):
    digits = '0123456789abcdefghijklmnopqrstuvwxyz'
    out = []
    while v:
        v, r = divmod(v, 36)
        out.append(digits[r])
    return ''.join(reversed(out)) or '0'


def pack(rows):
    parts = []
    for route, dow, minutes, rain, event, mult, _day, mode in rows:
        code = max(0, min(255, round(mult * 100) - 50))
        parts.append(base36(route | (dow << 3) | (minutes << 6) | (rain << 17) | (event << 18) | (code << 19) | (mode << 27)))
    return ','.join(parts)


def main():
    days = make_days()
    rows = []
    for route_idx in range(N_ROUTES):
        for mode in range(N_MODES):
            per_day = int(ROWS_PER_ROUTE * ROUTE_BUSY[route_idx] * MODES[mode][1]) / N_DAYS
            for d, day in enumerate(days):
                n = int(per_day) + (1 if random.random() < per_day - int(per_day) else 0)
                rows.extend(gen_row(route_idx, d, day, mode) for _ in range(n))
    rows.sort(key=lambda r: (r[6], r[2], r[7]))

    n = len(rows)
    print('rows by mode', [sum(1 for r in rows if r[7] == m) for m in range(N_MODES)])
    print('rows', n, '| train rows', sum(1 for r in rows if r[6] < TRAIN_DAYS), '| test rows', sum(1 for r in rows if r[6] >= TRAIN_DAYS))
    print('rain share of rows  %.3f' % (sum(r[3] for r in rows) / n))
    print('event share of rows %.3f' % (sum(r[4] for r in rows) / n))
    print('rainy days %d of %d, event days %d' % (sum(1 for d in days if d['rain']), N_DAYS, sum(1 for d in days if d['event'])))
    print('cutoff', START + datetime.timedelta(days=TRAIN_DAYS), 'last day', START + datetime.timedelta(days=N_DAYS - 1))

    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, 'rows.json'), 'w') as f:
        json.dump({'start': START.isoformat(), 'train_days': TRAIN_DAYS, 'n_days': N_DAYS, 'rows': rows}, f)
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'w') as f:
            f.write(pack(rows))
        print('packed ROWS string written to', sys.argv[1])


if __name__ == '__main__':
    main()
