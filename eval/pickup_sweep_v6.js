// Sweep for the CURRENT prototype (app/app-uber-ui.html) and the v6 rules.
// Replaces pickup_sweep.js, which ran against the old app.html and the old 2-8 min / nearest-wins rules.
//   node eval/pickup_sweep_v6.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'app-uber-ui.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
let code = scripts[scripts.length - 1][1];
code = code.slice(0, code.indexOf("document.addEventListener('click'"));
const body = fs.readFileSync(path.join(__dirname, 'pickup_sweep_v6_body.js'), 'utf8');

vm.runInThisContext(code + '\n' + body);

const out = path.join(__dirname, 'pickup_sweep_v6_results.json');
fs.writeFileSync(out, JSON.stringify(globalThis.__SWEEP6, null, 2));
console.log(JSON.stringify(globalThis.__SWEEP6, null, 2));
process.exit(globalThis.__SWEEP6.violationCount ? 1 : 0);
