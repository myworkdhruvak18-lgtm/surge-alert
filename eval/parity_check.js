// Checks that eval_temporal.py forecasts exactly what app/app.html forecasts.
// The app's ROWS (all rows) are decoded from the page itself and compared with the Python port's
// answers on 300 fixed queries:  python eval_temporal.py --parity > parity.json
//   node eval/parity_check.js parity.json
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'app.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
let code = scripts[scripts.length - 1][1];
code = code.slice(0, code.indexOf("document.addEventListener('click'"));
vm.runInThisContext(code);

const py = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let bad = 0;
for (const p of py) {
  const [route, dow, minutes, rain, event] = p.q;
  const f = forecastRaw(ROWS, route, minutes, dow, rain, event);
  const same = f.status === p.status && (f.status !== 'ok' || (f.multiplier === p.multiplier && f.bandLow === p.low && f.bandHigh === p.high && f.nObservations === p.n && f.scope === p.scope && Math.abs(f.confidence - p.confidence) < 1e-9));
  if (!same) { bad++; if (bad <= 5) console.log('MISMATCH', p, f); }
}
console.log(`${py.length - bad} of ${py.length} queries identical`);
process.exit(bad ? 1 : 0);
