#!/usr/bin/env node
/**
 * Responsive guards — the cheap, always-on half of the responsive work.
 *
 * tools/responsive-check.mjs drives a real browser and is the actual proof that
 * no page overflows at any width; these checks are static, so they run with the
 * rest of the suite and fail loudly if someone reintroduces one of the specific
 * mistakes that made phones scroll sideways:
 *
 *   - an unfluidded heading scale (fixed rem sizes that snap at one breakpoint)
 *   - a table without a horizontal scroll container (nowrap cells inflate the
 *     grid track and drag the whole page wide)
 *   - a grid/flex item that cannot shrink below its content (min-width: auto)
 *   - a row of chips/steps/segments that refuses to wrap
 *   - an inline SVG icon with no size of its own (it renders as a 300x150 box)
 *
 * Usage: node tests/responsive.test.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const pages = [...readdirSync(ROOT).filter((f) => f.endsWith('.html') && f !== '404.html').sort(),
  'admin/index.html'];

const css = ['assets/css/tokens.css', 'assets/css/base.css', 'assets/css/components.css', 'assets/css/product.css']
  .map(read).join('\n');
const appJs = read('assets/js/app.js');

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  → ' + detail : '')); }
};

/* 1. every page declares a device-width viewport */
for (const p of pages) {
  const html = read(p);
  check(`${p}: viewport meta uses device-width`,
    /<meta[^>]+name="viewport"[^>]+content="[^"]*width=device-width/.test(html));
}

/* 2. no inline fixed pixel widths that can't shrink (wider than the narrowest phone) */
for (const p of pages) {
  const html = read(p);
  const bad = [...html.matchAll(/style="[^"]*\b(width|min-width)\s*:\s*(\d{3,})px/g)]
    .filter((m) => Number(m[2]) > 300).map((m) => `${m[1]}:${m[2]}px`);
  check(`${p}: no inline fixed width above 300px`, bad.length === 0, bad.join(', '));
}

/* 3. every data table sits in a horizontal scroll container */
const VOID = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'area', 'col', 'path',
  'circle', 'use', 'stop', 'rect', 'line', 'polyline', 'polygon', 'ellipse']);
function tableAudit(html) {
  const stack = [];
  const bare = [];
  let n = 0;
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
  let m;
  while ((m = re.exec(html))) {
    const closing = m[1] === '/', tag = m[2].toLowerCase(), attrs = m[3];
    if (VOID.has(tag) || /\/\s*$/.test(attrs)) continue;
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    if (tag === 'table') {
      n++;
      if (!stack.some((e) => /table-(scroll|wrap)/.test(e.cls))) bare.push(n);
    }
    stack.push({ tag, cls: (attrs.match(/class="([^"]*)"/) || [, ''])[1] });
  }
  return { n, bare };
}
for (const p of pages) {
  const { n, bare } = tableAudit(read(p));
  check(`${p}: every table (${n}) has a scroll container`, bare.length === 0, `table #${bare.join(', #')} is bare`);
}

/* 4. the table scroll container must not impose a fixed minimum wider than a phone */
check('css: .table-scroll table min-width is clamped to the container',
  /\.table-scroll \.table[^{]*\{[^}]*min-width:\s*min\(/.test(css));

/* 5. fluid type scale — headings must use clamp(), not a single fixed rem */
for (const token of ['--fs-3xl', '--fs-4xl', '--fs-5xl']) {
  check(`css: ${token} is fluid (clamp)`,
    new RegExp(`${token}:\\s*clamp\\(`).test(css));
}

/* 6. the hardening rules that stop tracks from inflating */
check('css: grid/flex children may shrink (min-width: 0)',
  /\.two-col > \*[^{]*\{[^}]*min-width:\s*0/.test(css) && /\.admin-content > \*/.test(css));
check('css: step rows wrap', /\.steps\s*\{[^}]*flex-wrap:\s*wrap/.test(css));
check('css: segmented control wraps', /\.segmented\s*\{[^}]*flex-wrap:\s*wrap/.test(css));
check('css: chip/badge rows wrap', /\.chips[^{]*\{[^}]*flex-wrap:\s*wrap/.test(css));

/* 7. inline SVG icons that live in a pill or a card CTA must be sized */
check('css: .badge and .chip icons have an explicit size',
  /\.badge svg[^{]*\{[^}]*width:/.test(css));
check('css: product-card arrow icons have an explicit size',
  /\.prod-card-cta svg[^{]*\{[^}]*width:/.test(css));

/* 8. long unbreakable strings may wrap */
check('css: body allows long words to break', /body\s*\{[^}]*overflow-wrap:\s*break-word/.test(css));

/* 9. the header action row compacts instead of overflowing */
check('css: header actions compact on small screens',
  /@media \(max-width: 640px\)\s*\{[^@]*\.nav-actions/.test(css));

/* 10. the brand mark keeps the real logo on every page (owner instruction) */
for (const p of pages) {
  if (p === 'admin/index.html') continue;
  check(`${p}: real brand logo present`, /assets\/img\/brand\/rajapremi-logo\.png/.test(read(p) + appJs));
}

/* 11. the official WhatsApp number, linked exactly as on the live site */
check('js: official WhatsApp link wa.me/6285290003471',
  /wa\.me\/6285290003471/.test(appJs));
check('js: official WhatsApp number shown in text',
  /0852[- ]?9000[- ]?3471/.test(appJs) || /0852[- ]?9000[- ]?3471/.test(read('assets/js/data.js')));

console.log(`\n${fail ? 'FAIL' : 'PASS'} — ${pass} passed, ${fail} failed`);
console.log('Reminder: tools/responsive-check.mjs is the browser-level proof (run it before shipping).');
process.exit(fail ? 1 : 0);
