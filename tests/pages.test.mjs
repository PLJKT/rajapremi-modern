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
  'ai.html', 'admin/index.html'
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
  if (!isAdmin) {
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

  /* 5. tag balance — stack based, so the report names the offending tag */
  const structure = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ');
  const VOID = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
  const stack = [];
  let issue = null;
  for (const m of structure.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
    const tag = m[2].toLowerCase();
    if (VOID.has(tag) || m[0].endsWith('/>')) continue;
    if (m[1] === '/') {
      const idx = stack.lastIndexOf(tag);
      if (idx === -1) { issue = issue || ('</' + tag + '> has no opening tag'); }
      else stack.length = idx;         /* implicitly closes anything left open inside */
    } else stack.push(tag);
  }
  if (stack.length) issue = issue || ('</' + stack[stack.length - 1] + '> missing');
  if (!issue) ok('tags balanced');
  else bad('tags balanced', issue);

  /* 6. content presence — the failure mode the audit found */
  const textLen = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
  if (textLen > 600) ok('renders content without JavaScript (' + textLen + ' chars of text)');
  else bad('renders content without JavaScript', textLen + ' chars');
}

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' checks passed, ' + fail + ' failed');
if (fail) console.log('\nProblems:\n- ' + problems.join('\n- '));
process.exit(fail === 0 ? 0 : 1);
