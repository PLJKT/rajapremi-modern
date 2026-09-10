/* ============================================================
   RajaPremi Modern — page QA gate
   Run:  node tests/pages.test.mjs
   Checks every page in the build for the defects that the audit
   found on the live site: missing content, broken asset paths,
   metadata gaps, and CSS classes that no stylesheet defines.
   No dependencies — it parses the HTML with a small state machine.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = [
  'index.html', 'bandingkan.html', 'produk.html', 'klaim.html', 'partner.html',
  'faq.html', 'bantuan.html', 'tentang.html', 'masuk.html', 'daftar.html',
  'ai.html', '404.html', 'admin/index.html'
];

const cssFiles = ['assets/css/tokens.css', 'assets/css/base.css', 'assets/css/components.css', 'assets/css/product.css'];
const css = cssFiles.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const classesIn = (text) => {
  const set = new Set();
  for (const m of text.matchAll(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g)) set.add(m[1]);
  return set;
};
const definedClasses = classesIn(css);
/* <script> bodies contain template literals and concatenations that look
   like markup; only real HTML is checked */
const onlyMarkup = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ');

/* config-level classes emitted from JS rather than HTML are still in CSS, so no whitelist is needed */
const IGNORE = new Set([]);

let pass = 0, fail = 0;
const problems = [];
const ok = (name) => { pass++; console.log('  ok   ' + name); };
const bad = (name, detail) => { fail++; problems.push(name + (detail ? ' → ' + detail : '')); console.log('  FAIL ' + name + (detail ? '  → ' + detail : '')); };

for (const page of PAGES) {
  const file = path.join(root, page);
  console.log('\n' + page);
  if (!fs.existsSync(file)) { bad('page exists'); continue; }
  const html = fs.readFileSync(file, 'utf8');

  /* 1. shell */
  const isAdmin = page.startsWith('admin/');
  if (!isAdmin) {
    if (html.includes('id="site-header"') && html.includes('id="site-footer"')) ok('shell mounts present');
    else bad('shell mounts present');
    const scripts = ['assets/js/data.js', 'assets/js/app.js', 'assets/js/quote.js', 'assets/js/ai.js'];
    const prefix = isAdmin ? '../' : '';
    const missing = scripts.filter(s => !html.includes(prefix + s));
    if (missing.length === 0) ok('all four scripts wired');
    else bad('all four scripts wired', 'missing ' + missing.join(', '));
  }

  /* 2. metadata */
  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1];
  if (title && title.length > 12) ok('has a real <title>'); else bad('has a real <title>', String(title));
  if (/<meta name="description" content="[^"]{40,}"/.test(html)) ok('has a description'); else bad('has a description');
  if (page !== '404.html' && !isAdmin) {
    if (/rel="canonical"/.test(html)) ok('has canonical'); else bad('has canonical');
  }

  /* 3. local asset paths resolve (static markup only) */
  const markup = onlyMarkup(html);
  const refs = [...markup.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map(m => m[1])
    .filter(u => !/^(https?:|mailto:|tel:|data:|javascript:)/.test(u));
  const baseDir = isAdmin ? path.join(root, 'admin') : root;
  const brokenRefs = refs.filter(u => {
    const clean = u.split('?')[0].split('#')[0];
    if (!clean || clean === '/') return false;
    return !fs.existsSync(path.resolve(baseDir, clean));
  });
  if (brokenRefs.length === 0) ok('every local link and asset resolves');
  else bad('every local link and asset resolves', brokenRefs.slice(0, 6).join(', '));

  /* 4. classes all exist in the stylesheets or this page's own <style> block */
  const pageClasses = classesIn([...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
  const classes = new Set();
  for (const m of markup.matchAll(/class="([^"]+)"/g)) {
    m[1].split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
  }
  const unknown = [...classes].filter(c => !IGNORE.has(c) && !definedClasses.has(c) && !pageClasses.has(c));
  if (unknown.length === 0) ok('every CSS class used is defined (' + classes.size + ' classes)');
  else bad('every CSS class used is defined', unknown.join(', '));

  /* 5. tag balance */
  const stacks = { };
  let balance = 0, unbalanced = [];
  for (const m of html.matchAll(/<\/?(div|section|main|article|aside|header|footer|nav|form|table|tbody|thead|tr|td|th|ul|ol|li|details|span|p|h1|h2|h3|h4|h5|select|label|button|a)\b[^>]*>/g)) {
    const tag = m[1];
    if (m[0].startsWith('</')) balance--;
    else if (!m[0].endsWith('/>') && !['br', 'img', 'input', 'meta', 'link'].includes(tag)) balance++;
    if (balance < 0) { unbalanced.push('closing ' + tag + ' with nothing open'); balance = 0; }
  }
  if (balance === 0 && unbalanced.length === 0) ok('tags balanced');
  else bad('tags balanced', 'depth ' + balance + (unbalanced.length ? '; ' + unbalanced[0] : ''));

  /* 6. content presence — the failure mode the audit found */
  const textLen = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
  if (textLen > 600) ok('renders content without JavaScript (' + textLen + ' chars of text)');
  else bad('renders content without JavaScript', textLen + ' chars');
}

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' checks passed, ' + fail + ' failed');
if (fail) console.log('\nProblems:\n- ' + problems.join('\n- '));
process.exit(fail === 0 ? 0 : 1);
