/* ============================================================
   RajaPremi Modern — engine tests (no dependencies, no browser)
   Run:  node tests/quote-engine.test.mjs
   Loads the real assets/js/data.js and assets/js/quote.js inside a
   sandbox with a minimal DOM + RP stub, then exercises the quote
   engine's pure builders. This is the check that keeps the
   comparison and calculation rules honest as content changes.
   ============================================================ */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const sandbox = {};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.console = console;
sandbox.setTimeout = setTimeout;
sandbox.clearTimeout = clearTimeout;
sandbox.URLSearchParams = URLSearchParams;
sandbox.location = { search: '', pathname: '/bandingkan.html', href: 'http://localhost/bandingkan.html' };
sandbox.history = { replaceState() {} };
sandbox.localStorage = { getItem: () => null, setItem() {} };
sandbox.addEventListener = () => {};
sandbox.document = {
  readyState: 'complete',
  addEventListener() {},
  getElementById: () => null,
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => ({ classList: { add() {}, remove() {}, toggle() {} }, style: {}, setAttribute() {}, appendChild() {}, insertAdjacentHTML() {} })
};
/* minimal shell stub: quote.js only needs these RP members to build markup */
sandbox.RP = {
  esc: (s) => String(s == null ? '' : s),
  toast() {}, openModal() {}, closeModal() {},
  debounce: (f) => f,
  initTabs() {}, initCounters() {}, initReveal() {},
  currentPage: () => 'bandingkan.html',
  param: () => null
};

vm.createContext(sandbox);
vm.runInContext(read('assets/js/data.js'), sandbox, { filename: 'data.js' });
vm.runInContext(read('assets/js/quote.js'), sandbox, { filename: 'quote.js' });

const { RPData: D, RPQuote } = sandbox;
let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  → ' + detail : '')); }
};
const section = (t) => console.log('\n' + t);

/* ---------------------------------------------------------------- */
section('1. Quote generation');
const rows = D.generateQuotes({ product: 'motor', sumInsured: 25000000, coverage: 1, plate: 13, year: 2021 });
check('returns one row per partner insurer', rows.length === D.PROVIDERS.length, 'got ' + rows.length);
check('sorted ascending by total', rows.every((r, i) => i === 0 || rows[i - 1].total <= r.total));
check('every row carries the fields the UI renders', rows.every(r =>
  r.provider && r.provider.name && r.provider.tint && typeof r.total === 'number' &&
  typeof r.premium === 'number' && typeof r.handlingFee === 'number' &&
  typeof r.stampDuty === 'number' && typeof r.rating === 'number' &&
  typeof r.claims === 'string' && Array.isArray(r.highlights) && r.highlights.length >= 3));
check('total = premium + handling + stamp', rows.every(r => r.total === r.premium + r.handlingFee + r.stampDuty));
check('savings computed against the dearest quote', rows[0].savings === Math.max(...rows.map(r => r.total)) - rows[0].total);
check('savings percentage is 0..100', rows.every(r => r.savingsPct >= 0 && r.savingsPct <= 100));

section('2. Coverage mapping (the bug the audit found on the old site)');
const tlo = D.generateQuotes({ product: 'motor', sumInsured: 25000000, coverage: 1, plate: 13, year: 2021 });
const allRisk = D.generateQuotes({ product: 'motor', sumInsured: 25000000, coverage: 2, plate: 13, year: 2021 });
check('coverage=1 is labelled TLO in the UI', tlo[0].coverage === 'TLO', tlo[0].coverage);
check('coverage=2 is labelled ALL_RISK in the UI', allRisk[0].coverage === 'ALL_RISK', allRisk[0].coverage);
check('every coverage option returns quotes (no dead option)', tlo.length > 0 && allRisk.length > 0,
  'tlo=' + tlo.length + ' allrisk=' + allRisk.length);
check('All Risk is priced higher than TLO', allRisk[0].premium > tlo[0].premium,
  tlo[0].premium + ' vs ' + allRisk[0].premium);

section('3. Internal data never reaches the public markup');
const resultsHtml = RPQuote.build.results.call(null) || '';
const setState = (o) => Object.assign(RPQuote.state, o);
setState({ product: 'motor', sumInsured: 25000000, plate: 13, year: 2021, coverage: 1, sort: 'price-asc', providerFilter: 'all', results: rows, selected: [], loading: false, ran: true });
const html = RPQuote.build.results();
/* strip tags first: inline styles contain the word "margin" and would
   otherwise trip a naive text scan */
const visible = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
check('results markup is non-empty', html.length > 2000, html.length + ' chars');
check('every partner insurer appears', D.PROVIDERS.every(p => html.indexOf(p.name) > -1));
check('formatted rupiah is present', /Rp\s?\d/.test(html));
check('no commission or margin field leaks into customer-visible text',
  !/(commision|commission|margin|rate_basic|gross_premium)/i.test(visible(html)),
  'leaked margin wording');
check('cheapest offer is flagged', /Total terendah/.test(html));
check('no market-wide superlative on the offer card', !/Termurah/.test(html));
check('zero-result filter shows a recovery state', (() => {
  setState({ providerFilter: '___none___' });
  const empty = RPQuote.build.results();
  setState({ providerFilter: 'all' });
  return /Tidak ada penawaran/.test(empty);
})());

section('4. Compare tray and modals');
setState({ selected: [] });
check('tray stays hidden with fewer than two picks', RPQuote.build.tray() === '');
setState({ selected: [rows[0].provider.code, rows[1].provider.code] });
const tray = RPQuote.build.tray();
check('tray lists both picked insurers', tray.indexOf(rows[0].provider.abbr) > -1 && tray.indexOf(rows[1].provider.abbr) > -1);
check('tray offers the compare action', /Bandingkan 2 polis/.test(tray), tray.slice(0, 120));
const cmp = RPQuote.build.compare();
check('compare modal renders a criteria table', cmp.indexOf('<table') > -1 && cmp.indexOf(rows[0].provider.name) > -1);
check('compare modal names the value pick', /RajaAI/.test(cmp));
check('compare modal keeps margin data out', !/(commision|commission|margin|rate_basic|gross_premium)/i.test(cmp.replace(/<[^>]+>/g, ' ')));
setState({ selected: [] });

section('5. Builders render without throwing');
for (const [name, fn] of [['form', () => RPQuote.build.form(false)], ['summary', () => RPQuote.build.summary(rows)],
  ['card', () => RPQuote.build.card(rows[0], 0)], ['explain', () => RPQuote.build.explain(rows[0])],
  ['buy modal', () => RPQuote.build.buy(rows[0])]]) {
  try { const out = fn(); check(name + ' builder', typeof out === 'string' && out.length > 20, String(out).slice(0, 60)); }
  catch (e) { check(name + ' builder', false, e.message); }
}

section('6. Product catalogue integrity');
check('eight product lines preserved', D.PRODUCTS.length === 8, String(D.PRODUCTS.length));
check('every product has coverage bullets and facts', D.PRODUCTS.every(p => Array.isArray(p.coverage) && p.coverage.length >= 4 && Array.isArray(p.facts)));
check('seven partner insurers preserved', D.PROVIDERS.length === 7, String(D.PROVIDERS.length));
check('every navigation target resolves to a page in this repo',
  D.NAV.flatMap(e => [e.href].concat((e.items || []).map(i => e.label === 'Produk' ? 'produk.html?id=' + i.id : i.id + '.html')))
    .every(h => h.indexOf('produk.html?id=') === 0 || fs.existsSync(path.join(root, h))),
  D.NAV.flatMap(e => [e.href].concat((e.items || []).map(i => e.label === 'Produk' ? 'produk.html?id=' + i.id : i.id + '.html'))).filter(h => h.indexOf('produk.html?id=') !== 0 && !fs.existsSync(path.join(root, h))).join(', '));

section('7. Every delegation target is bound');

/* The comparison tray sits outside both mount hosts. When nobody bound it, the
   clear / remove / "Bandingkan N polis" buttons rendered but did nothing at
   all: no error, no modal, no visual difference. Mount into a recording DOM and
   assert that every element the engine listens on actually received a handler. */
function mountProbe() {
  const hosts = {};
  const makeEl = (id) => {
    const el = {
      id, hidden: false, innerHTML: '', dataset: {}, style: {}, children: [],
      listeners: {},
      addEventListener(type) { (this.listeners[type] = this.listeners[type] || []).push(true); },
      insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null,
      querySelector: () => null, querySelectorAll: () => [], scrollIntoView() {},
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      getBoundingClientRect: () => ({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 })
    };
    return el;
  };
  for (const id of ['quoteForm', 'quoteResults', 'compareTray', 'modalHolder']) hosts[id] = makeEl(id);
  const box = Object.assign({}, sandbox);
  delete box.RPData; delete box.RPQuote;
  /* quote.js publishes onto `global` (=== `window`), so the copy must point at
     itself, not at the sandbox it was cloned from. */
  box.window = box;
  box.globalThis = box;
  box.document = Object.assign({}, sandbox.document, {
    getElementById: (id) => hosts[id] || null,
    querySelector: (sel) => (sel === '#compareTray' ? hosts.compareTray : null),
    querySelectorAll: () => [],
    body: makeEl('body')
  });
  vm.createContext(box);
  vm.runInContext(read('assets/js/data.js'), box, { filename: 'data.js' });
  vm.runInContext(read('assets/js/quote.js'), box, { filename: 'quote.js' });
  box.RPQuote.mount({ formId: 'quoteForm', resultId: 'quoteResults' });
  return hosts;
}
try {
  const hosts = mountProbe();
  for (const id of ['quoteForm', 'quoteResults', 'compareTray']) {
    const types = Object.keys(hosts[id].listeners);
    check(`${id} receives a click handler`, types.indexOf('click') > -1, 'bound: ' + (types.join(', ') || 'nothing'));
  }
} catch (e) {
  check('mount() binds every host', false, e.message);
}

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
