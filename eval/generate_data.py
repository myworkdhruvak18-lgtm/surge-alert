"""
Regenerates the Surge Alert synthetic dataset with a REAL rain/event effect
on the true multiplier, and enough density per (route, dow-class, hour,
rain, event) cell that the engine's strict match tier (Section 1 of the PRD)
can actually succeed for plausible queries -- so toggling rain/event in the
prototype visibly changes the forecast, not just the confidence score.

Encoding matches app.html's packed format exactly:
  v = route | (dow<<3) | (minutes<<6) | (rain<<17) | (event<<18) | (code<<19)
  code = round(multiplier*100) - 50   (multiplier in [0.50, 2.05], 8 bits -> 0..255)
decode (from app.html):
  route = v&7; dow=(v>>3)&7; minutes=(v>>6)&2047; rain=(v>>17)&1; event=(v>>18)&1
  multiplier = (((v>>19)&255)+50)/100
"""
import random, json

random.seed(42)

N_ROUTES = 5
SURGE_FLOOR, SURGE_CAP = 0.5, 2.0

# Per-route base "busyness" multiplier on top of the time-of-day curve.
ROUTE_BUSY = [1.00, 1.15, 0.90, 1.05, 0.80]

def clip(x):
    return max(SURGE_FLOOR, min(SURGE_CAP, x))

def base_curve(dow, minutes):
    """Typical time-of-day/day-of-week surge shape, before rain/event/noise."""
    weekend = dow >= 5
    hour = minutes / 60.0
    if not weekend:
        if 7.5 <= hour <= 10.0:      # weekday morning peak
            peak = 1.0 - abs(hour - 8.75) / 1.25
            return 1.15 + 0.55 * max(0, peak)
        if 17.0 <= hour <= 20.5:     # weekday evening peak
            peak = 1.0 - abs(hour - 18.75) / 1.75
            return 1.20 + 0.60 * max(0, peak)
        if 0 <= hour <= 5.5 or hour >= 23:
            return 0.70
        return 1.00
    else:
        if 20.0 <= hour <= 23.5:     # weekend night demand
            peak = 1.0 - abs(hour - 21.75) / 1.75
            return 1.15 + 0.55 * max(0, peak)
        if 0 <= hour <= 5.5:
            return 0.65
        return 0.95

def gen_row(route_idx):
    dow = random.randint(0, 6)
    # bias minutes toward active hours (more bookings when people actually book)
    bucket = random.choices(
        ['morning', 'evening', 'night', 'other'],
        weights=[28, 30, 18, 24],
    )[0]
    if bucket == 'morning':
        minutes = int(random.gauss(8.75, 0.9) * 60) % 1440
    elif bucket == 'evening':
        minutes = int(random.gauss(18.75, 1.1) * 60) % 1440
    elif bucket == 'night':
        minutes = int(random.gauss(21.5, 1.5) * 60) % 1440
    else:
        minutes = random.randint(0, 1439)

    rain = 1 if random.random() < 0.22 else 0
    event = 1 if random.random() < 0.12 else 0

    mult = base_curve(dow, minutes) * ROUTE_BUSY[route_idx]
    if rain:
        mult += random.uniform(0.28, 0.42)
    if event:
        mult += random.uniform(0.32, 0.48)
    mult += random.gauss(0, 0.06)
    mult = clip(mult)

    return [route_idx, dow, minutes, rain, event, round(mult, 2)]

def main():
    rows = []
    # ~140k rows: enough that strict (route+dow-class+-/-45min+same rain+same
    # event) matches clear the 8-observation floor at common query times.
    for route_idx in range(N_ROUTES):
        n = int(28000 * ROUTE_BUSY[route_idx])
        for _ in range(n):
            rows.append(gen_row(route_idx))
    random.shuffle(rows)  # keep "array order == chronological" assumption harmless
    print('total rows', len(rows))

    packed = []
    for r in rows:
        route, dow, minutes, rain, event, mult = r
        code = round(mult * 100) - 50
        code = max(0, min(255, code))
        v = route | (dow << 3) | (minutes << 6) | (rain << 17) | (event << 18) | (code << 19)
        packed.append(base36(v))
    packed_str = ','.join(packed)
    print('packed length', len(packed_str))

    with open('rows_new.json', 'w') as f:
        json.dump(rows, f)
    with open('packed_new.txt', 'w') as f:
        f.write(packed_str)

def base36(v):
    digits = '0123456789abcdefghijklmnopqrstuvwxyz'
    if v == 0:
        return '0'
    out = []
    while v:
        v, d = divmod(v, 36)
        out.append(digits[d])
    return ''.join(reversed(out))

if __name__ == '__main__':
    main()
