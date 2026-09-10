/* One-off build helper: pre-render the JS-generated content blocks on the
   homepage into static markup, so the eight product cards (the page's SEO
   payload) exist in the HTML like everything else. Run from repo root:

     node tools/prerender-home.mjs
*/
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = {};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.console = console;
sandbox.location = { search: '', pathname: '/index.html' };
sandbox.addEventListener = () => {};
sandbox.document = { readyState: 'complete', addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('assets/js/data.js', 'utf8'), sandbox);
const D = sandbox.RPData;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---- product cards (icons inlined from the same ICON set the JS uses) ---- */
const cards = D.PRODUCTS.map((p) => `        <a class="card card-hover prod-card reveal" href="produk.html?id=${p.id}">
          <span class="prod-ico" style="background:var(--bg-sunken);color:var(--prod-${p.id})">${D.ICONS[p.icon] || ''}</span>
          ${p.popular ? '<span class="badge badge-gold" style="align-self:flex-start">Populer</span>' : ''}
          <strong>${esc(p.name)}</strong>
          <span class="muted" style="font-size:var(--fs-sm)">${esc(p.desc)}</span>
          <span class="prod-card-cta">Mulai dari ${D.rupiah(p.from, false)} ${esc(p.unit)}${D.ICONS.arrow || ''}</span>
        </a>`).join('\n');

/* ---- testimonials ---- */
const T = [
  { n: 'Rani P.', c: 'Jakarta', r: 5, q: 'Klaim motor saya cair 4 hari kerja. Yang paling membantu: aplikasi menunjukkan tahapan klaimnya, jadi saya tidak perlu menelepon tiap hari.' },
  { n: 'Budi S.', c: 'Surabaya', r: 5, q: 'Bandingkan empat mitra langsung dalam satu layar. Selisihnya Rp300 ribu untuk perlindungan yang sama — itu yang bikin saya pindah ke sini.' },
  { n: 'Melati A.', c: 'Bandung', r: 4, q: 'Harga dan proses jelas. Saya beri 4 karena bagian kesehatan masih perlu pemeriksaan medis, tidak bisa langsung terbit seperti motor.' }
];
const testimonials = T.map((x) => `        <div class="card testimonial-card reveal">
          <span class="stars">${D.ICONS.star.repeat(x.r)}</span>
          <blockquote>"${esc(x.q)}"</blockquote>
          <div class="who"><span class="avatar">${esc(x.n.charAt(0))}</span>
            <span><strong style="font-size:var(--fs-sm);display:block">${esc(x.n)}</strong>
            <span class="muted" style="font-size:var(--fs-xs)">${esc(x.c)} · pelanggan sejak 2024</span></span></div>
        </div>`).join('\n');

/* ---- promos ---- */
const promos = D.PROMOS.map((p) => `        <div class="card card-hover reveal">
          <span class="badge badge-primary">${esc(p.tag)}</span>
          <strong style="margin-top:.5rem;display:block">${esc(p.title)}</strong>
          <p class="muted" style="font-size:var(--fs-sm)">${esc(p.desc)}</p>
          <div class="row" style="gap:.5rem;justify-content:space-between;margin-top:auto">
            <a class="btn btn-soft btn-sm" href="${p.href}">${esc(p.cta)}</a>
            <span class="muted" style="font-size:var(--fs-2xs)">${esc(p.until)}</span>
          </div>
        </div>`).join('\n');

/* ---- FAQ teaser ---- */
const faq = D.FAQ.slice(0, 5).map((f, i) => `        <details class="acc"${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary>
          <div class="acc-body">${esc(f.a)}</div></details>`).join('\n');

let html = fs.readFileSync('index.html', 'utf8');
const before = html;

html = html.replace(
  /      <div class="grid grid-4" id="productGrid"><\/div>/,
  '      <div class="grid grid-4">\n' + cards + '\n      </div>');
html = html.replace(
  /      <div class="grid grid-3" id="testimonialGrid"><\/div>/,
  '      <div class="grid grid-3">\n' + testimonials + '\n      </div>');
html = html.replace(
  /      <div class="grid grid-3" id="promoGrid"><\/div>/,
  '      <div class="grid grid-3">\n' + promos + '\n      </div>');
html = html.replace(
  /      <div id="faqTeaser"><\/div>/,
  '      <div id="faqTeaser">\n' + faq + '\n      </div>');

/* drop the JS that used to build them: content now ships in the HTML */
html = html.replace(/  \/\* product grid \*\/[\s\S]*?\n\n/, '\n');
html = html.replace(/  \/\* testimonials[\s\S]*?\n\n(?=  \/\* promos)/, '');
html = html.replace(/  \/\* promos \*\/[\s\S]*?\n\n(?=  \/\* FAQ teaser)/, '');
html = html.replace(/  \/\* FAQ teaser[\s\S]*?\n\n(?=  \/\* feature icons)/, '');

if (html === before) { console.error('no replacements made — aborting'); process.exit(1); }
fs.writeFileSync('index.html', html);
console.log('pre-rendered: %d product cards, %d testimonials, %d promos, %d FAQ items',
  D.PRODUCTS.length, T.length, D.PROMOS.length, Math.min(5, D.FAQ.length));
