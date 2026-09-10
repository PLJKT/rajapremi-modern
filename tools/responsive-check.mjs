#!/usr/bin/env node
/**
 * responsive-check.mjs — catches the layout bug class that unit tests can't see:
 * a page that ends up wider than the screen, so phones clip text or zoom out.
 *
 * It drives a real Chromium over the DevTools Protocol with zero dependencies
 * (Node >= 22 ships a global WebSocket), emulates a range of device widths and
 * reports, for every page, any element that sticks out past the viewport.
 *
 *   node tools/responsive-check.mjs                        # http://127.0.0.1:8899/
 *   node tools/responsive-check.mjs https://example.com/   # any deployment
 *   node tools/responsive-check.mjs --launch               # start its own Chrome
 *   node tools/responsive-check.mjs --widths 320,414,768 --json report.json
 *
 * Exit code 1 when a page overflows at any width, 0 when every page fits.
 * Chrome must be reachable on --cdp (default http://127.0.0.1:9222); use
 * --launch, or start it yourself with:
 *   chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp
 */
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- args */
const DEFAULT_WIDTHS = [320, 375, 414, 480, 640, 768, 900, 1024, 1280, 1440, 1920];
const opts = { launch: false, json: null, widths: DEFAULT_WIDTHS, cdp: 'http://127.0.0.1:9222', quiet: false };
const positional = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--launch') opts.launch = true;
  else if (a === '--json') opts.json = argv[++i];
  else if (a === '--cdp') opts.cdp = argv[++i];
  else if (a === '--widths') opts.widths = argv[++i].split(',').map(Number).filter((n) => n > 0);
  else if (a === '--quiet') opts.quiet = true;
  else positional.push(a);
}
const BASE = (positional[0] || 'http://127.0.0.1:8899/').replace(/\/+$/, '/');

function sitePages() {
  const files = readdirSync(ROOT);
  const pages = files.filter((f) => f.endsWith('.html') && f !== '404.html').sort();
  if (files.includes('admin') && existsSync(path.join(ROOT, 'admin', 'index.html'))) pages.push('admin/index.html');
  return pages;
}

/* ---------------------------------------------------------------- chrome */
function chromePath() {
  const candidates = {
    win32: [
      `${process.env['PROGRAMFILES']}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['LOCALAPPDATA']}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  }[process.platform] || [];
  return candidates.find((p) => p && existsSync(p)) || null;
}

async function cdpInfo(base) {
  try {
    return await (await fetch(base.replace(/\/+$/, '') + '/json/version')).json();
  } catch { return null; }
}

async function ensureBrowser() {
  if (await cdpInfo(opts.cdp)) return null;
  if (!opts.launch) {
    console.error(`No Chrome on ${opts.cdp}. Start one, or re-run with --launch:\n` +
      '  chrome --headless=new --remote-debugging-port=9222 --user-data-dir=' + path.join(os.tmpdir(), 'cdp-profile'));
    process.exit(2);
  }
  const exe = chromePath();
  if (!exe) { console.error('Could not find a Chrome/Edge binary. Pass --cdp of a running browser.'); process.exit(2); }
  const child = spawn(exe, ['--headless=new', '--remote-debugging-port=9222',
    `--user-data-dir=${path.join(os.tmpdir(), 'responsive-check-profile')}`,
    '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore', detached: false });
  for (let i = 0; i < 60; i++) { await sleep(250); if (await cdpInfo(opts.cdp)) return child; }
  child.kill();
  console.error('Chrome did not expose CDP in 15s.');
  process.exit(2);
}

/* ---------------------------------------------------------------- CDP */
class Session {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.pending = new Map();
    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    };
  }
  static open(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.onopen = () => resolve(new Session(ws));
      ws.onerror = () => reject(new Error('cannot connect to ' + url));
    });
  }
  send(method, params = {}, timeout = 30000) {
    const id = ++this.seq;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`timeout: ${method}`));
      }, timeout);
    });
  }
  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

/* Collector installed before any page script runs, so we also catch JS errors. */
const PRELUDE = `window.__errs=[];const _ce=console.error;
console.error=function(){window.__errs.push('console.error: '+Array.from(arguments).map(String).join(' ').slice(0,200));return _ce.apply(console,arguments)};
window.addEventListener('error',e=>window.__errs.push('error: '+(e.message||'')+' @'+String(e.filename||'').split('/').pop()+':'+(e.lineno||'')));
window.addEventListener('unhandledrejection',e=>window.__errs.push('unhandledrejection: '+String(e.reason&&e.reason.message||e.reason).slice(0,200)));`;

const MEASURE = (width) => `(() => {
  const W = ${width};
  const name = (el) => {
    const c = (el.getAttribute('class') || '').trim().split(/\\s+/).slice(0, 3).join('.');
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : '');
  };
  const insideScroller = (el) => {
    let n = el.parentElement;
    while (n && n !== document.documentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(n).overflowX)) return true;
      n = n.parentElement;
    }
    return false;
  };
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if ((r.width === 0 && r.height === 0) || r.right <= W + 1.5 || insideScroller(el)) continue;
    let deeper = false;
    for (const kid of el.children) {
      if (getComputedStyle(kid).display !== 'none' && kid.getBoundingClientRect().right > W + 1.5) { deeper = true; break; }
    }
    if (deeper) continue;
    offenders.push({ el: name(el), right: Math.round(r.right), width: Math.round(r.width),
      minWidth: cs.minWidth, whiteSpace: cs.whiteSpace,
      text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 48) });
  }
  const de = document.documentElement;
  return { width: W, viewport: window.innerWidth, scrollWidth: de.scrollWidth,
    overflow: Math.max(0, de.scrollWidth - W), offenders: offenders.slice(0, 8),
    errors: (window.__errs || []).slice(0, 6),
    brokenImages: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).length };
})()`;

async function waitReady(s) {
  for (let i = 0; i < 60; i++) {
    const r = await s.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
    if (r.result.value === 'complete') break;
    await sleep(150);
  }
  await sleep(350);
}

/* ---------------------------------------------------------------- run */
const pages = sitePages();
const widths = [...new Set(opts.widths)].sort((a, b) => a - b);
const child = await ensureBrowser();
const target = await (await fetch(opts.cdp.replace(/\/+$/, '') + '/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
const s = await Session.open(target.webSocketDebuggerUrl);
await s.send('Page.enable');
await s.send('Runtime.enable');
await s.send('Page.addScriptToEvaluateOnNewDocument', { source: PRELUDE });

console.log(`responsive-check  base=${BASE}`);
console.log(`  pages: ${pages.length}   widths: ${widths.join(', ')}\n`);

const report = {};
let failures = 0;
for (const page of pages) {
  report[page] = {};
  const rows = [];
  let pageErrors = [];
  let broken = 0;
  for (const w of widths) {
    await s.send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
    await s.send('Page.navigate', { url: BASE + page });
    await waitReady(s);
    const r = await s.send('Runtime.evaluate', { expression: MEASURE(w), returnByValue: true });
    const v = r.result.value;
    report[page][w] = v;
    if (v.overflow > 1) { failures++; rows.push(v); }
    if (v.errors.length > pageErrors.length) pageErrors = v.errors;
    broken = Math.max(broken, v.brokenImages);
  }
  const status = rows.length ? `OVERFLOW at ${rows.map((r) => r.width).join(', ')}` : 'ok';
  console.log(`${rows.length ? '  ✗' : '  ✓'} ${page.padEnd(20)} ${status}`);
  for (const r of rows.slice(0, 6)) {
    console.log(`        @${r.width}px  page is ${r.scrollWidth}px wide (+${r.overflow})  ${r.offenders.slice(0, 3).map((o) => `${o.el}[${o.right}]`).join(' ')}`);
  }
  if (broken) console.log(`        broken images: ${broken}`);
  if (pageErrors.length) console.log(`        js errors: ${pageErrors.join(' | ')}`);
}

if (opts.json) { writeFileSync(opts.json, JSON.stringify(report, null, 1)); console.log(`\nreport written to ${opts.json}`); }
s.close();
if (child) child.kill();
console.log(failures ? `\nFAIL — ${failures} page/width combination(s) overflow horizontally.` : '\nPASS — every page fits every width.');
process.exit(failures ? 1 : 0);
