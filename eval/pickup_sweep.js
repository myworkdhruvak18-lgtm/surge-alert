const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'app.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
let code = scripts[scripts.length - 1][1];
code = code.slice(0, code.indexOf("document.addEventListener('click'"));
const body = fs.readFileSync(path.join(__dirname, 'pickup_sweep_body.js'), 'utf8');

vm.runInThisContext(code + '\n' + body);

const out = path.join(__dirname, 'pickup_sweep_results.json');
fs.writeFileSync(out, JSON.stringify(globalThis.__SWEEP, null, 2));
console.log(JSON.stringify(globalThis.__SWEEP, null, 2));
