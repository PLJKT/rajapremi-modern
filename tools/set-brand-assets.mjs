/* ============================================================
   set-brand-assets.mjs
   ------------------------------------------------------------
   Points every page at the ORIGINAL RajaPremi brand assets that
   were downloaded from the live site (assets/img/brand/*).

   Replaces whatever <link rel="icon"> the template shipped with
   (the demo previously carried an inline SVG placeholder mark) and
   installs the favicon set + apple-touch-icon in one place.

   Usage: node tools/set-brand-assets.mjs
   ============================================================ */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'docs' || name === 'assets') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const pages = walk(root);
let changed = 0;

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const depth = relative(root, dirname(page)).split(/[\\/]/).filter(Boolean).length;
  const up = depth ? '../'.repeat(depth) : '';
  const base = up + 'assets/img/brand/';

  const block = [
    `<link rel="icon" href="${base}favicon.ico" sizes="any">`,
    `<link rel="icon" type="image/png" sizes="32x32" href="${base}favicon-32x32.png">`,
    `<link rel="apple-touch-icon" href="${base}apple-touch-icon.png">`
  ].join('\n');

  // drop the old icon/apple-touch links, keep everything else in order
  let next = html
    .replace(/<link rel="icon"[^>]*>\s*/g, '')
    .replace(/<link rel="apple-touch-icon"[^>]*>\s*/g, '');

  if (!/rel="stylesheet"/.test(next)) { console.log('SKIP (no stylesheet anchor):', relative(root, page)); continue; }
  next = next.replace(/(\s*)<link rel="stylesheet"/, '\n' + block + '$1<link rel="stylesheet"');

  if (next !== html) { writeFileSync(page, next); changed++; console.log('updated', relative(root, page)); }
}

console.log(`\n${changed} page(s) now point at the original brand assets.`);
