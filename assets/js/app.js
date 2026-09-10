/* ============================================================
   RajaPremi Modern — App shell
   Renders the shared header/footer/AI launcher on every page,
   owns theme, navigation state, toasts, modals, tabs, counters.
   ============================================================ */
(function (global) {
  'use strict';

  const D = global.RPData;
  const ICON = D.ICONS;

  /* ---------------- small utilities ---------------- */
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function debounce(fn, ms) {
    let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms || 200); };
  }
  function currentPage() {
    const file = (location.pathname.split('/').pop() || 'index.html');
    return file === '' ? 'index.html' : file;
  }
  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }

  /* ---------------- theme ---------------- */
  const THEME_KEY = 'rajapremi.theme';
  const Theme = {
    get() { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } },
    set(mode) {
      document.documentElement.setAttribute('data-theme', mode);
      try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
    },
    init() {
      const stored = Theme.get();
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      Theme.set(stored || (prefersDark ? 'dark' : 'light'));
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
          if (!Theme.get()) Theme.set(e.matches ? 'dark' : 'light');
        });
      }
    },
    toggle() { Theme.set(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); syncThemeIcon(); }
  };
  function syncThemeIcon() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    $$('[data-theme-toggle]').forEach(function (b) {
      b.innerHTML = dark ? ICON.sun : ICON.moon;
      b.setAttribute('aria-label', dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
      b.title = b.getAttribute('aria-label');
    });
  }

  /* ---------------- header ---------------- */
  function megaMarkup(entry) {
    if (!entry.mega) return '';
    const items = entry.items.map(function (it) {
      const href = entry.label === 'Produk' ? ('produk.html?id=' + it.id) : (it.id + '.html');
      return '<a class="mega-item" href="' + href + '">' +
        '<span class="mega-ico">' + (ICON[it.icon] || ICON.shield) + '</span>' +
        '<span><strong>' + esc(it.label) + '</strong><span>' + esc(it.desc) + '</span></span></a>';
    }).join('');
    const aside = entry.label === 'Produk'
      ? '<div class="mega-aside">' +
          '<span class="badge badge-primary">' + ICON.spark + ' Didukung AI</span>' +
          '<strong style="font-size:var(--fs-md)">Belum tahu butuh yang mana?</strong>' +
          '<p style="font-size:var(--fs-sm);color:var(--text-muted);margin:0">Ceritakan kebutuhan Anda dalam satu kalimat — RajaAI merekomendasikan produk dan plafon yang pas.</p>' +
          '<button class="btn btn-soft btn-sm" data-ai-open data-ai-seed="Saya butuh rekomendasi asuransi">Tanya RajaAI</button>' +
        '</div>'
      : '<div class="mega-aside">' +
          '<span class="badge badge-primary">' + ICON.mic + ' Suara & teks</span>' +
          '<strong style="font-size:var(--fs-md)">Bantuan langsung</strong>' +
          '<p style="font-size:var(--fs-sm);color:var(--text-muted);margin:0">Tanya soal polis, klaim, atau perpanjangan langsung dari halaman mana pun.</p>' +
          '<a class="btn btn-soft btn-sm" href="bantuan.html">Buka pusat bantuan</a>' +
        '</div>';
    return '<div class="mega" role="menu">' + '<div class="mega-list">' + items + '</div>' + aside + '</div>';
  }

  function headerMarkup() {
    const page = currentPage();
    const links = D.NAV.map(function (entry) {
      const active = entry.href === page ? ' is-active' : '';
      if (!entry.mega) {
        return '<a class="nav-link' + active + '" href="' + entry.href + '">' + esc(entry.label) + '</a>';
      }
      return '<div class="nav-item">' +
        '<button class="nav-link' + active + '" type="button" aria-haspopup="true">' + esc(entry.label) +
        '<span class="nav-caret">' + ICON.chevron + '</span></button>' + megaMarkup(entry) + '</div>';
    }).join('');

    const drawerLinks = D.NAV.map(function (entry) {
      if (entry.mega) {
        return '<a class="drawer-link' + (entry.href === page ? ' is-active' : '') + '" href="' + entry.href + '">' +
          esc(entry.label) + '<span style="width:16px">' + ICON.chevron + '</span></a>' +
          entry.items.map(function (it) {
            const href = entry.label === 'Produk' ? ('produk.html?id=' + it.id) : (it.id + '.html');
            return '<a class="drawer-link" style="padding-left:var(--s-6);font-size:var(--fs-sm)" href="' + href + '">' + esc(it.label) + '</a>';
          }).join('');
      }
      return '<a class="drawer-link' + (entry.href === page ? ' is-active' : '') + '" href="' + entry.href + '">' +
        esc(entry.label) + '<span style="width:16px">' + ICON.chevron + '</span></a>';
    }).join('');

    return '' +
    '<header class="site-header" id="siteHeader">' +
      '<div class="container">' +
        '<nav class="nav" aria-label="Navigasi utama">' +
          '<a class="nav-brand" href="index.html">' +
            '<img class="brand-logo" src="assets/img/brand/rajapremi-logo.png" alt="" width="34" height="34"><span class="brand-name">' + esc(D.CONFIG.brand) + '</span>' +
            '<span class="badge badge-primary" style="margin-left:.15rem">' + ICON.shield + ' Agregator asuransi</span>' +
          '</a>' +
          '<div class="nav-links">' + links + '</div>' +
          '<div class="nav-actions">' +
            '<button class="btn btn-ghost btn-icon" data-theme-toggle type="button"></button>' +
            '<button class="btn btn-ghost btn-icon" data-ai-open type="button" title="Tanya RajaAI">' + ICON.spark + '</button>' +
            '<a class="btn btn-secondary btn-hide-sm" href="masuk.html">Masuk</a>' +
            '<a class="btn btn-primary" href="bandingkan.html">' + ICON.bolt + ' Bandingkan harga</a>' +
            '<button class="btn btn-secondary btn-icon nav-burger" type="button" data-drawer-open aria-label="Buka menu">' + ICON.menu + '</button>' +
          '</div>' +
        '</nav>' +
      '</div>' +
    '</header>' +
    '<div class="drawer" id="siteDrawer" role="dialog" aria-modal="true" aria-label="Menu">' +
      '<div class="drawer-panel">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s-4)">' +
          '<span class="nav-brand"><img class="brand-logo" src="assets/img/brand/rajapremi-logo.png" alt="" width="34" height="34">' + esc(D.CONFIG.brand) + '</span>' +
          '<button class="btn btn-ghost btn-icon" type="button" data-drawer-close aria-label="Tutup menu">' + ICON.x + '</button>' +
        '</div>' + drawerLinks +
        '<div class="divider-text" style="margin:var(--s-5) 0">atau</div>' +
        '<a class="btn btn-primary btn-block" href="bandingkan.html">' + ICON.bolt + ' Bandingkan harga</a>' +
        '<a class="btn btn-secondary btn-block" href="masuk.html" style="margin-top:var(--s-2)">Masuk ke akun</a>' +
        '<button class="btn btn-soft btn-block" data-ai-open data-ai-seed="Halo RajaAI" style="margin-top:var(--s-2)">' + ICON.spark + ' Tanya RajaAI</button>' +
      '</div>' +
    '</div>';
  }

  /* ---------------- footer ---------------- */
  function footerMarkup() {
    const C = D.CONFIG;
    const year = new Date().getFullYear();
    return '' +
    '<footer class="site-footer">' +
      '<div class="container">' +
        '<a class="wa-box" href="https://wa.me/6285290003471" target="_blank" rel="noopener">' +
        '<span class="wa-box-ico">' + ICON.whatsapp + '</span>' +
        '<span class="wa-box-body">' +
          '<strong>Hubungi kami</strong>' +
          '<span class="wa-box-text">Klik di sini untuk dapatkan Asuransi gratis!</span>' +
          '<span class="wa-box-note">S&K berlaku</span>' +
        '</span>' +
      '</a>' +
      '<div class="footer-grid">' +
          '<div class="footer-col">' +
            '<div class="footer-brand"><img class="brand-logo" src="assets/img/brand/rajapremi-logo.png" alt="" width="34" height="34">' + esc(C.brand) + '</div>' +
            '<p style="color:#94a3b8;font-size:var(--fs-md);max-width:34ch">' + esc(C.tagline) + ' — membandingkan ' + D.PROVIDERS.length + ' perusahaan asuransi mitra untuk satu keputusan yang lebih baik.</p>' +
            '<div style="margin-top:var(--s-4);display:flex;gap:var(--s-3);align-items:center">' +
              '<span class="stars">' + ICON.star + ICON.star + ICON.star + ICON.star + ICON.star + '</span>' +
              '<span style="font-size:var(--fs-sm);color:#94a3b8">Peringkat ' + String(C.csRating).replace('.', ',') + ' / 5 — kepuasan pelanggan</span>' +
            '</div>' +
            '<div class="footer-social" style="margin-top:var(--s-5)">' +
              '<a href="https://wa.me/6285290003471" target="_blank" rel="noopener" aria-label="WhatsApp RajaPremi">' + ICON.whatsapp + '</a>' +
              '<a href="#" aria-label="Instagram">' + ICON.instagram + '</a>' +
              '<a href="#" aria-label="LinkedIn">' + ICON.linkedin + '</a>' +
              '<a href="#" aria-label="Facebook">' + ICON.facebook + '</a>' +
              '<a href="#" aria-label="YouTube">' + ICON.youtube + '</a>' +
            '</div>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h5>Produk</h5>' +
            '<ul>' + D.PRODUCTS.map(function (p) { return '<li><a href="produk.html?id=' + p.id + '">' + esc(p.name) + '</a></li>'; }).join('') + '</ul>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h5>Informasi Lainnya</h5>' +
            '<ul>' +
              '<li><a href="faq.html">FAQ</a></li>' +
              '<li><a href="bantuan.html">Pusat Bantuan</a></li>' +
              '<li><a href="bantuan.html#hubungi">Hubungi Kami</a></li>' +
              '<li><a href="klaim.html">Panduan Klaim</a></li>' +
              '<li><a href="tentang.html">Tentang Kami</a></li>' +
              '<li><a href="partner.html">Jadi Partner</a></li>' +
              '<li><a href="ai.html">Fitur AI</a></li>' +
              '<li><a href="admin/index.html">Dashboard Internal</a></li>' +
            '</ul>' +
          '</div>' +
          '<div class="footer-col" id="hubungi">' +
            '<h5>Hubungi Kami</h5>' +
            '<ul>' +
              '<li style="display:flex;gap:.5rem;align-items:flex-start"><span style="width:16px;flex:none;margin-top:.15rem">' + ICON.phone + '</span><span>' + esc(C.phone) + '</span></li>' +
              '<li style="display:flex;gap:.5rem;align-items:flex-start"><span style="width:16px;flex:none;margin-top:.15rem">' + ICON.whatsapp + '</span><span>WhatsApp ' + esc(C.whatsapp) + '</span></li>' +
              '<li style="display:flex;gap:.5rem;align-items:flex-start"><span style="width:16px;flex:none;margin-top:.15rem">' + ICON.mail + '</span><span>' + esc(C.email) + '</span></li>' +
              '<li style="display:flex;gap:.5rem;align-items:flex-start"><span style="width:16px;flex:none;margin-top:.15rem">' + ICON.clock + '</span><span>' + esc(C.hours) + '</span></li>' +
              '<li style="display:flex;gap:.5rem;align-items:flex-start"><span style="width:16px;flex:none;margin-top:.15rem">' + ICON.pin + '</span><span>' + esc(C.address) + '</span></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span>© ' + year + ' ' + esc(C.brand) + '. Seluruh hak cipta dilindungi.</span>' +
          '<span style="display:flex;gap:var(--s-5);flex-wrap:wrap">' +
            '<a href="#" style="color:#94a3b8">Syarat &amp; Ketentuan</a>' +
            '<a href="#" style="color:#94a3b8">Kebijakan Privasi</a>' +
            '<a href="#" style="color:#94a3b8">Kebijakan Cookie</a>' +
          '</span>' +
        '</div>' +
      '</div>' +
    '</footer>';
  }

  /* ---------------- toasts ---------------- */
  function toast(message, kind, timeout) {
    let stack = $('#toastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.id = 'toastStack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = 'toast toast-' + (kind || 'info');
    const ico = kind === 'success' ? ICON.check : kind === 'warn' ? ICON.warn : kind === 'danger' ? ICON.warn : ICON.info;
    el.innerHTML = '<span style="width:18px;flex:none;color:var(--' + (kind === 'success' ? 'success-500' : kind === 'danger' ? 'danger-500' : kind === 'warn' ? 'warn-500' : 'primary') + ')">' + ico + '</span><span>' + message + '</span>';
    stack.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0'; el.style.transform = 'translateY(6px)';
      setTimeout(function () { el.remove(); }, 260);
    }, timeout || 3800);
  }

  /* ---------------- tabs / modals / counters ---------------- */
  function initTabs(root) {
    $$('[data-tabs]', root).forEach(function (group) {
      const name = group.getAttribute('data-tabs');
      $$('[role="tab"]', group).forEach(function (tab) {
        tab.addEventListener('click', function () {
          $$('[role="tab"]', group).forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
          tab.setAttribute('aria-selected', 'true');
          $$('[data-tab-panel="' + name + '"]').forEach(function (p) { p.hidden = true; });
          const target = $('[data-tab-panel="' + name + '"][data-tab="' + tab.getAttribute('data-tab') + '"]');
          if (target) target.hidden = false;
        });
      });
    });
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(el) {
    const m = typeof el === 'string' ? document.getElementById(el) : el;
    if (!m) return;
    m.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function initCounters(root) {
    const nodes = $$('[data-count-to]', root).filter(function (n) { return !n.dataset.counted; });
    if (!nodes.length) return;
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.dataset.counted = '1';
        const to = parseFloat(el.getAttribute('data-count-to'));
        const suffix = el.getAttribute('data-count-suffix') || '';
        const prefix = el.getAttribute('data-count-prefix') || '';
        const dur = 900;
        const start = performance.now();
        const dec = parseInt(el.getAttribute('data-count-decimals') || '0', 10);
        (function tick(now) {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = to * eased;
          el.textContent = prefix + (dec ? val.toFixed(dec).replace('.', ',') : Math.round(val).toLocaleString('id-ID')) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        })(start);
        io.unobserve(el);
      });
    }, { threshold: .35 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  function initReveal(root) {
    const nodes = $$('.reveal', root).filter(function (n) { return !n.dataset.revealed; });
    if (!nodes.length) return;
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.dataset.revealed = '1';
        en.target.classList.add('is-visible');
        io.unobserve(en.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px' });
    nodes.forEach(function (n, i) { n.style.transitionDelay = (i % 6) * 55 + 'ms'; io.observe(n); });
  }

  /* ---------------- error boundary ----------------
     A demo that fails silently is worse than one that fails loudly:
     surface runtime errors on the page instead of leaving a blank area. */
  function errorBoundary() {
    function report(msg, where) {
      try { global.RP.lastError = msg + ' @ ' + where; } catch (e) {}
      const box = document.createElement('div');
      box.className = 'alert alert-danger';
      box.style.cssText = 'position:fixed;left:1rem;bottom:1rem;z-index:200;max-width:48ch';
      box.innerHTML = '<div><strong>Terjadi kesalahan teknis pada bagian ini.</strong>' +
        '<p style="margin:.25rem 0 0;font-size:var(--fs-sm)">' + esc(msg) + (where ? ' <span class="muted">(' + esc(where) + ')</span>' : '') + '</p>' +
        '<p style="margin:.25rem 0 0;font-size:var(--fs-xs);color:var(--text-subtle)">Rincian lengkap ada di konsol peramban.</p></div>';
      document.body.appendChild(box);
    }
    global.addEventListener('error', function (ev) {
      report(ev.message || 'Pesan tidak tersedia', (ev.filename || '').split('/').pop() + ':' + (ev.lineno || '?'));
    });
    global.addEventListener('unhandledrejection', function (ev) {
      report((ev.reason && ev.reason.message) || 'Promise ditolak', 'async');
    });
  }

  /* ---------------- boot ---------------- */
  function mountChrome() {
    const headerMount = document.getElementById('site-header');
    if (headerMount) headerMount.innerHTML = headerMarkup();
    const footerMount = document.getElementById('site-footer');
    if (footerMount) footerMount.innerHTML = footerMarkup();

    syncThemeIcon();
    document.addEventListener('click', function (e) {
      const themeBtn = e.target.closest('[data-theme-toggle]');
      if (themeBtn) { Theme.toggle(); return; }
      const openDrawer = e.target.closest('[data-drawer-open]');
      if (openDrawer) { const d = $('#siteDrawer'); if (d) d.classList.add('is-open'); document.body.style.overflow = 'hidden'; return; }
      const closeDrawer = e.target.closest('[data-drawer-close]');
      if (closeDrawer) { const d = $('#siteDrawer'); if (d) d.classList.remove('is-open'); document.body.style.overflow = ''; return; }
      if (e.target.id === 'siteDrawer') { e.target.classList.remove('is-open'); document.body.style.overflow = ''; return; }
      const closer = e.target.closest('[data-modal-close]');
      if (closer) { closeModal(closer.closest('.modal')); return; }
      if (e.target.classList && e.target.classList.contains('modal')) { closeModal(e.target); return; }
      const opener = e.target.closest('[data-modal-open]');
      if (opener) { openModal(opener.getAttribute('data-modal-open')); return; }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const d = $('#siteDrawer'); if (d) d.classList.remove('is-open');
        $$('.modal.is-open').forEach(closeModal);
        document.body.style.overflow = '';
      }
    });
    const onScroll = function () {
      const h = $('#siteHeader');
      if (h) h.classList.toggle('is-stuck', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  global.RP = {
    $: $, $$: $$, esc: esc, debounce: debounce, param: param, currentPage: currentPage,
    Theme: Theme, toast: toast, openModal: openModal, closeModal: closeModal,
    initTabs: initTabs, initCounters: initCounters, initReveal: initReveal,
    ICON: ICON, D: D
  };

  errorBoundary();
  Theme.init();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountChrome);
  } else {
    mountChrome();
  }
})(window);
