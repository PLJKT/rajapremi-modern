/* ============================================================
   RajaPremi Modern — Data layer
   ------------------------------------------------------------
   Every screen reads from here. In the production build this
   module is swapped for the live API client (see assets/js/api.js
   and config.js -> LIVE_API). The provider list, product lines and
   premium bands below are seeded from the real aggregator response
   captured during the audit so the demo behaves like the real thing.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- Config ---------- */
  const CONFIG = {
    brand: 'RajaPremi',
    tagline: 'Your Way, We Protect',
    // Demo default is the bundled mock dataset. Flip to true to hit the live
    // aggregator API — requires a browser-allowed API key (see README).
    liveApi: false,
    apiBase: 'https://api.rajapremi.co',
    serviceBase: 'https://service.rajapremi.co',
    phone: '+62 21 5089 8888',
    whatsapp: '+62 811 8899 777',
    email: 'care@rajapremi.com',
    hours: 'Senin–Jumat 08.30–17.30 WIB',
    address: 'Jl. Wolter Monginsidi No. 63, Kebayoran Baru, Jakarta Selatan 12180',
    year: 2026,
    csRating: 4.6
  };

  /* ---------- Icon set (inline, zero network requests) ---------- */
  const I = {
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.4L19 10l-5.1 1.6L12 17l-1.9-5.4L5 10l5.1-1.6z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
    bike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17" r="3.2"/><circle cx="18.5" cy="17" r="3.2"/><path d="M8.5 17h6l-2-9H9m5.5 0H18l-2.5 6.5M14 8l-2 9"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16v3m14-3v3M3 13l1.8-5A2 2 0 016.7 6.6h10.6A2 2 0 0119.2 8L21 13v4H3z"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-9.4A4 4 0 0112 8a4 4 0 017 2.6c0 5-7 9.4-7 9.4z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z"/><path d="M9.2 12l2 2 3.6-3.8"/></svg>',
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.2 13.8L3 11l18-7-7 18-2.8-7.2z"/></svg>',
    kaaba: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-1.5a4 4 0 00-4-4H6a4 4 0 00-4 4V20"/><circle cx="9" cy="7" r="3.2"/><path d="M22 20v-1.5a4 4 0 00-3-3.85M16.5 4.2a4 4 0 010 7.6"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10m5 10V4m5 16v-7m5 7V8"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0115 0"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5c0-1 .8-2 1.9-2h2.2c.9 0 1.6.6 1.8 1.4l.7 3a1.8 1.8 0 01-.5 1.7l-1.3 1.2a12 12 0 006.1 6.1l1.2-1.3c.4-.5 1.1-.6 1.7-.4l3 .7c.8.2 1.4 1 1.4 1.8v2.2c0 1-1 1.9-2 1.9A16.6 16.6 0 014 5z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.6-6.5-10.4A6.5 6.5 0 0112 4a6.5 6.5 0 016.5 6.6C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.4" r="2.4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8.5 10V7.5a3.5 3.5 0 017 0V10"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9.5" y="3" width="5" height="10" rx="2.5"/><path d="M6 11a6 6 0 0012 0M12 17v3.5M9 20.5h6"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4L3 11l7 2.5L12.5 21z"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12m0 0l-4.5-4.5M12 16l4.5-4.5M4 19h16"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M13.7 20a2 2 0 01-3.4 0"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16.5 14.5h1.5"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.8l1.3 2 2.3-.5.6 2.3 2.2.9-1 2.2 1.4 1.9-1.8 1.6.3 2.4-2.4.3-.9 2.2-2.2-.9-1.9 1.5-1.4-2-2.3.6-.6-2.3-2.2-.9 1-2.2L3.4 9.7l1.9-1.6-.4-2.4 2.4-.3.9-2.2 2.2.9z"/></svg>',
    building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V6l7-3v18M11 21h9V10l-9-4"/><path d="M7 9h1M7 12h1M7 15h1M14 12h2M14 15h2"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16M6 7h12M8 7l-3 6h6zM16 7l-3 6h6z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 10-2.6 5.9"/><path d="M20 5v5h-5"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.2"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.4A10 10 0 1012 2zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6a11 11 0 01-4.2-4.3c-.3-.5-.5-1-.6-1.5-.1-.6-.1-1.1 0-1.6.1-.5.7-1.5 1.3-1.7.2-.1.4-.1.6-.1h.4c.2 0 .4 0 .5.4l.7 1.6c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.1-.2.3-.1.5.1.2.6 1 1.2 1.6.8.7 1.4.9 1.6 1 .2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.5.7c.2.1.4.2.4.4.1.2.1.5 0 .7z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 105 8.5a2.5 2.5 0 000-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2 3.75-2 4 0 4.4 2.6 4.4 6V21h-4v-5.4c0-1.3 0-3-1.8-3s-2.15 1.4-2.15 2.9V21H9z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.7c0-.9.3-1.5 1.6-1.5H16.6V4.5A21 21 0 0014.3 4c-2.4 0-4 1.4-4 4.1v2.4H7.7v3h2.6V21z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.6 2.6 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 002.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.6 2.6 0 001.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 001.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15.5v-7l6 3.5z"/></svg>',
    quote: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 5C6.4 6.6 4.5 9.3 4.5 12.6c0 2.6 1.5 4.4 3.6 4.4 1.9 0 3.3-1.4 3.3-3.3 0-1.8-1.3-3.1-3-3.1h-.5c.3-1.6 1.5-3 3.2-4zM19 5c-3.1 1.6-5 4.3-5 7.6 0 2.6 1.5 4.4 3.6 4.4 1.9 0 3.3-1.4 3.3-3.3 0-1.8-1.3-3.1-3-3.1h-.5c.3-1.6 1.5-3 3.2-4z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l8.5 15h-17z"/><path d="M12 10v4M12 16.6v.4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10a2.1 2.1 0 10-3-3L5 17z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18h6a3.5 3.5 0 000-7h-5a3.5 3.5 0 010-7H15"/></svg>'
  };

  /* ---------- Navigation ---------- */
  const NAV = [
    {
      label: 'Produk', href: 'produk.html', mega: true,
      items: [
        { id: 'motor', label: 'Asuransi Motor', desc: 'Mobil, motor & kendaraan niaga', icon: 'bike' },
        { id: 'mobil', label: 'Asuransi Mobil', desc: 'Comprehensive & TLO', icon: 'car' },
        { id: 'kesehatan', label: 'Asuransi Kesehatan', desc: 'Rawat inap, rawat jalan, cashless', icon: 'heart' },
        { id: 'properti', label: 'Asuransi Properti', desc: 'Rumah, ruko, aset bisnis', icon: 'home' },
        { id: 'kecelakaan', label: 'Kecelakaan Diri', desc: 'Perlindungan 24 jam', icon: 'shield' },
        { id: 'travel', label: 'Travel Insurance', desc: 'Perjalanan domestik & internasional', icon: 'plane' },
        { id: 'umrah', label: 'Umrah & Haji', desc: 'Perlindungan ibadah', icon: 'kaaba' },
        { id: 'jiwa', label: 'Asuransi Jiwa', desc: 'Warisan & santunan keluarga', icon: 'users' }
      ]
    },
    { label: 'Bandingkan', href: 'bandingkan.html' },
    { label: 'Klaim', href: 'klaim.html' },
    { label: 'Partner', href: 'partner.html' },
    { label: 'Bantuan', href: 'bantuan.html', mega: true, items: [
      { id: 'faq', label: 'FAQ', desc: 'Pertanyaan yang sering diajukan', icon: 'info' },
      { id: 'bantuan', label: 'Pusat Bantuan', desc: 'Panduan, artikel & kontak', icon: 'chat' },
      { id: 'ai', label: 'RajaAI Assistant', desc: 'Tanya apa saja soal polis Anda', icon: 'spark' },
      { id: 'tentang', label: 'Tentang Kami', desc: 'Profil, lisensi & kemitraan', icon: 'building' }
    ] }
  ];

  /* ---------- Products ---------- */
  const PRODUCTS = [
    {
      id: 'motor', name: 'Asuransi Motor', short: 'Motor & kendaraan roda dua',
      icon: 'bike', from: 250000, unit: '/tahun', popular: true,
      desc: 'Perlindungan TLO maupun All Risk untuk motor harian, matic, sport, hingga motor niaga.',
      coverage: ['Total Loss Only (TLO) & All Risk', 'Perlindungan kecelakaan diri pengendara', 'Pertanggungjawaban hukum pihak ketiga (TPL)', 'Banjir, angin topan & huru-hara (perluasan)'],
      facts: [['Jumlah penyedia', '7 mitra'], ['Klaim rata-rata', '5–10 hari kerja'], ['Periode polis', '12 bulan'], ['Perluasan opsional', 'Banjir, TPL, gempa']]
    },
    {
      id: 'mobil', name: 'Asuransi Mobil', short: 'Comprehensive & TLO',
      icon: 'car', from: 1850000, unit: '/tahun', popular: true,
      desc: 'Hitung premi mobil berdasarkan harga pasar, area, usia kendaraan, dan riwayat klaim Anda.',
      coverage: ['All Risk (comprehensive) & TLO', 'Banjir, gempa, kerusuhan (perluasan)', 'Towing & derek gratis', 'Penggantian kerugian pihak ketiga'],
      facts: [['Jumlah penyedia', '9 mitra'], ['Kendaraan terdaftar', '142.000+'], ['Claim ratio', '97,3% dibayar'], ['Periode polis', '12 bulan']]
    },
    {
      id: 'kesehatan', name: 'Asuransi Kesehatan', short: 'Individu, keluarga & karyawan',
      icon: 'heart', from: 450000, unit: '/bulan', popular: true,
      desc: 'Manfaat rawat inap, rawat jalan, gigi, mata, hingga layanan cashless di jaringan rumah sakit.',
      coverage: ['Rawat inap & rawat jalan', 'Cashless di 1.200+ rumah sakit', 'Maternity & kesehatan gigi (opsional)', 'Telemedicine & konsultasi dokter'],
      facts: [['Jaringan RS', '1.200+ cashless'], ['Usia masuk', '18–65 tahun'], ['Masa tunggu', '30–90 hari'], ['Kelas kamar', 'Kelas 1 s/d VIP']]
    },
    {
      id: 'properti', name: 'Asuransi Properti', short: 'Rumah, apartemen & ruko',
      icon: 'home', from: 350000, unit: '/tahun',
      desc: 'Melindungi bangunan dan isi rumah dari kebakaran, banjir, pencurian, dan bencana alam.',
      coverage: ['Kebakaran & petir', 'Banjir & tanah longsor', 'Pencurian & perampokan', 'Kerusuhan & sabotase'],
      facts: [['Batas pertanggungan', 'Rp 100 jt – Rp 50 M'], ['Skema', 'Reimbursement / restorasi'], ['Survey risiko', 'Gratis'], ['Periode polis', '12 bulan']]
    },
    {
      id: 'kecelakaan', name: 'Kecelakaan Diri', short: 'Perlindungan 24 jam',
      icon: 'shield', from: 150000, unit: '/tahun',
      desc: 'Santunan akibat kecelakaan di mana saja — kerja, perjalanan, olahraga, bahkan di rumah.',
      coverage: ['Meninggal dunia akibat kecelakaan', 'Cacat tetap total & sebagian', 'Biaya pengobatan', 'Santunan harian rawat inap'],
      facts: [['Usia masuk', '17–65 tahun'], ['Berlaku', '24 jam di seluruh dunia'], ['Tanpa medical check-up', 'Ya, hingga plafon tertentu'], ['Periode polis', '12 bulan']]
    },
    {
      id: 'travel', name: 'Travel Insurance', short: 'Domestik & internasional',
      icon: 'plane', from: 95000, unit: '/perjalanan',
      desc: 'Untuk perjalanan bisnis maupun liburan: keterlambatan, kehilangan bagasi, hingga evakuasi medis.',
      coverage: ['Perlindungan medis di luar negeri', 'Pembatalan & keterlambatan perjalanan', 'Kehilangan bagasi & dokumen', 'Evakuasi medis & repatriasi'],
      facts: [['Zona', 'Domestik, Asia, Worldwide'], ['Durasi', 'hingga 180 hari'], ['Visa Schengen', 'Memenuhi syarat'], ['Proses', 'Polis instan (e-policy)']]
    },
    {
      id: 'umrah', name: 'Umrah & Haji', short: 'Perlindungan ibadah',
      icon: 'kaaba', from: 320000, unit: '/perjalanan',
      desc: 'Dirancang untuk jamaah umrah dan haji, termasuk perlindungan pembatalan dan medis di Arab Saudi.',
      coverage: ['Biaya medis di Arab Saudi', 'Pembatalan keberangkatan jamaah', 'Kehilangan barang & paspor', 'Santunan meninggal dunia'],
      facts: [['Jamaah dilindungi', '38.000+'], ['Kerja sama', 'Travel & KBIHU'], ['Durasi', '9–40 hari'], ['Proses', 'Polis kolektif / individu']]
    },
    {
      id: 'jiwa', name: 'Asuransi Jiwa', short: 'Warisan & santunan keluarga',
      icon: 'users', from: 500000, unit: '/tahun',
      desc: 'Menjaga keuangan keluarga bila terjadi hal yang tidak diinginkan pada pencari nafkah utama.',
      coverage: ['Santunan meninggal dunia', 'Manfaat tambahan penyakit kritis', 'Nilai tunai / unit link', 'Pembebasan premi bila cacat'],
      facts: [['Uang pertanggungan', 'Rp 50 jt – Rp 5 M'], ['Usia masuk', '18–60 tahun'], ['Masa bayar', '5 / 10 / 20 tahun'], ['Riwayat kesehatan', 'Perlu declarasi']]
    }
  ];

  /* ---------- Providers (seeded from the audited aggregator response) ---------- */
  const PROVIDERS = [
    { id: 7,  code: 'ACA',    name: 'PT Asuransi Central Asia',   abbr: 'ACA',    rating: 4.5, speed: 0.0,  factor: 0.900, claims: '5 hari kerja', tint: '#1e40af' },
    { id: 5,  code: 'SIMAS',  name: 'PT Simas Insurtech',          abbr: 'SJ',     rating: 4.7, speed: -0.055, factor: 0.882, claims: '3 hari kerja', tint: '#0e7490' },
    { id: 50, code: 'JATANIA',name: 'PT Asuransi Jasa Tania',      abbr: 'JT',     rating: 4.3, speed: 0.015, factor: 0.926, claims: '7 hari kerja', tint: '#7c2d12' },
    { id: 8,  code: 'MAG',    name: 'PT Asuransi Multi Artha Guna',abbr: 'MAG',    rating: 4.4, speed: 0.0,  factor: 0.906, claims: '6 hari kerja', tint: '#155e75' },
    { id: 21, code: 'ZURICH', name: 'PT Zurich Asuransi Indonesia',abbr: 'ZH',     rating: 4.6, speed: -0.008, factor: 0.908, claims: '5 hari kerja', tint: '#1d4ed8' },
    { id: 22, code: 'JASINDO',name: 'PT Asuransi Jasindo Syariah', abbr: 'JS',     rating: 4.2, speed: 0.008, factor: 0.915, claims: '8 hari kerja', tint: '#065f46' },
    { id: 37, code: 'RELIANCE',name:'PT Asuransi Reliance Indonesia',abbr:'RL',    rating: 4.1, speed: 0.05, factor: 1.750, claims: '10 hari kerja', tint: '#9d174d' }
  ];

  /* ---------- Quote engine (mock) ----------
     Mirrors the live contract: premium is derived from sum insured,
     a coverage factor, vehicle age, plate region and provider factor.
     Internal margins (komisi/handling) are kept OUT of the customer
     payload on purpose — see /docs/ARCHITECTURE.md ("P0-2"). */
  const COVERAGE = [
    { code: 1, key: 'TLO',      label: 'TLO (Total Loss Only)', desc: 'Ditanggung bila kerugian ≥ 75% dari harga kendaraan.' },
    { code: 2, key: 'ALL_RISK', label: 'All Risk (Comprehensive)', desc: 'Semua kerusakan ditanggung, termasuk kerusakan ringan.' }
  ];

  const PLATE_REGIONS = [
    { code: 1,  label: 'B (Jakarta, Tangerang, Bekasi)' },
    { code: 13, label: 'D (Bandung)' },
    { code: 9,  label: 'L (Surabaya)' },
    { code: 12, label: 'AB (Yogyakarta, Semarang)' },
    { code: 17, label: 'DK (Bali)' },
    { code: 2,  label: 'BK (Medan)' },
    { code: 5,  label: 'DD (Makassar)' }
  ];

  function rupiah(n, withSymbol) {
    const v = Math.round(Number(n) || 0);
    const s = v.toLocaleString('id-ID');
    return (withSymbol === false ? '' : 'Rp ') + s;
  }
  function shortenRupiah(n) {
    const v = Math.round(Number(n) || 0);
    if (v >= 1e12) return 'Rp ' + (v / 1e12).toFixed(1).replace('.', ',') + ' T';
    if (v >= 1e9)  return 'Rp ' + (v / 1e9).toFixed(1).replace('.', ',') + ' M';
    if (v >= 1e6)  return 'Rp ' + (v / 1e6).toFixed(1).replace('.', ',') + ' jt';
    if (v >= 1e3)  return 'Rp ' + Math.round(v / 1e3) + ' rb';
    return 'Rp ' + v;
  }

  /**
   * Deterministic mock quote generator.
   * @param {{product:string, sumInsured:number, coverage:number, plate:number, year:number, areaId?:number}} input
   */
  function generateQuotes(input) {
    const product = input.product === 'mobil' ? 'mobil' : 'motor';
    const sumInsured = Math.max(1000000, Number(input.sumInsured) || 0);
    const coverageKey = Number(input.coverage) === 2 ? 'ALL_RISK' : 'TLO';
    const thisYear = 2026;
    const age = Math.max(0, thisYear - (Number(input.year) || thisYear));
    const ageFactor = 1 + Math.min(age, 12) * 0.018;
    const baseRate = product === 'mobil' ? 0.0215 : 0.0182;
    const coverageFactor = coverageKey === 'ALL_RISK' ? 1.42 : 1;
    const regionLoad = [1, 2.5, 1.15, 2.2, 1.6, 1.4, 1.3][Math.max(0, (Number(input.plate) || 1) - 1)] || 1.25;

    const rows = PROVIDERS.map(function (p) {
      const pure = sumInsured * baseRate * coverageFactor * ageFactor * regionLoad * p.factor;
      const gross = Math.round(pure / 5000) * 5000;
      const handling = product === 'mobil' ? 50000 : 25000;
      const stamp = 3000;
      const total = gross + handling + stamp;
      return {
        providerId: p.id,
        provider: p,
        productId: product === 'mobil' ? 40 + p.id : 10 + p.id,
        coverage: coverageKey,
        coverageCode: coverageKey === 'ALL_RISK' ? 2 : 1,
        premium: gross,
        handlingFee: handling,
        stampDuty: stamp,
        total: total,
        tenor: 12,
        payBy: 'Transfer / VA / kartu kredit',
        claims: p.claims,
        rating: p.rating,
        // The customer document lists gross_total only; margin fields stay internal.
        highlights: highlightsFor(product, coverageKey)
      };
    }).sort(function (a, b) { return a.total - b.total; });

    const cheapest = rows[0].total;
    const dearest = rows[rows.length - 1].total;
    rows.forEach(function (r) {
      r.isCheapest = r.total === cheapest;
      r.isDearest = r.total === dearest;
      r.savings = dearest - r.total;
      r.savingsPct = dearest ? Math.round(((dearest - r.total) / dearest) * 100) : 0;
    });
    return rows;
  }

  function highlightsFor(product, coverageKey) {
    const base = ['Perlindungan 12 bulan', 'Bantuan darurat 24 jam', 'Perpanjangan otomatis dapat dimatikan'];
    if (coverageKey === 'ALL_RISK') {
      return base.concat(['Kerusakan ringan & lecet ditanggung', 'Klaim tanpa batas kejadian']);
    }
    return base.concat(['Perluasan banjir tersedia', 'Premi 30–45% lebih ringan']);
  }

  /* ---------- Testimonials (kept from the live site's review carousel) ---------- */
  const TESTIMONIALS = [
    { name: 'Andi Prasetyo', city: 'Jakarta', rating: 5, product: 'Asuransi Mobil',
      text: 'Prosesnya cepat, dalam 10 menit saya dapat 8 penawaran dan langsung bisa pilih premi paling murah.' },
    { name: 'Ratna Kusumaningrum', city: 'Bandung', rating: 5, product: 'Asuransi Kesehatan',
      text: 'Dibantu memilih manfaat yang benar-benar dibutuhkan keluarga, bukan yang paling mahal. Hemat sekali.' },
    { name: 'Bayu Setiawan', city: 'Surabaya', rating: 4, product: 'Asuransi Motor',
      text: 'Polis digital langsung masuk email, dan saat klaim tinggal upload foto. Statusnya bisa dilacak.' },
    { name: 'Siti Halimah', city: 'Yogyakarta', rating: 5, product: 'Umrah & Haji',
      text: 'Untuk jamaah umrah kami, penerbitan polis kolektif jadi jauh lebih rapi dan cepat diverifikasi.' },
    { name: 'Hendra Wijaya', city: 'Medan', rating: 4, product: 'Asuransi Properti',
      text: 'Surveyor datang tepat waktu dan nilai pertanggungan ruko saya dihitung secara wajar.' },
    { name: 'Maria Larasati', city: 'Denpasar', rating: 5, product: 'Travel Insurance',
      text: 'Schengen visa saya lolos dengan polis dari sini. Customer service menjawab dalam beberapa menit.' }
  ];

  /* ---------- FAQ ---------- */
  const FAQ = [
    { q: 'Berapa lama proses penerbitan polis?', a: 'Setelah pembayaran terkonfirmasi, polis digital (e-policy) diterbitkan otomatis dan dikirim ke email Anda dalam 5–15 menit untuk produk kendaraan, kecelakaan diri, dan travel. Produk kesehatan dengan masa tunggu dan produk jiwa memerlukan verifikasi 1–2 hari kerja.', cat: 'Polis' },
    { q: 'Apa perbedaan TLO dan All Risk?', a: 'TLO (Total Loss Only) menanggung kerugian bila kendaraan hilang atau kerusakan mencapai minimal 75% dari nilai kendaraan. All Risk menanggung seluruh kerusakan termasuk lecet dan penyok ringan. Premi All Risk umumnya 30–45% lebih tinggi dari TLO.', cat: 'Kendaraan' },
    { q: 'Bagaimana cara membayar premi?', a: 'Kami menerima transfer bank, virtual account (BCA, Mandiri, BNI, BRI, Permata), kartu kredit, dan GoPay/OVO untuk premi di bawah Rp 10 juta. Semua pembayaran diproses oleh payment gateway berlisensi Bank Indonesia.', cat: 'Pembayaran' },
    { q: 'Bagaimana cara mengajukan klaim?', a: 'Buka menu Klaim di aplikasi, pilih polis, unggah foto kerusakan dan dokumen pendukung. Anda akan menerima nomor klaim dan bisa memantau status setiap tahap. Untuk klaim darurat, hubungi bantuan 24 jam kami.', cat: 'Klaim' },
    { q: 'Apakah data saya aman?', a: 'Data dienkripsi saat transit (TLS 1.3) dan saat disimpan. Akses ke data pribadi dibatasi dan diaudit. Kami tidak pernah menjual data nasabah kepada pihak ketiga. Detail lengkap ada di Kebijakan Privasi.', cat: 'Keamanan' },
    { q: 'Bisakah saya membatalkan polis dan mendapat refund?', a: 'Ya. Pembatalan dalam 14 hari pertama sejak polis aktif dapat mengembalikan premi secara prorata dikurangi biaya administrasi, selama belum ada klaim. Ajukan lewat Pusat Bantuan atau email care@rajapremi.com.', cat: 'Polis' },
    { q: 'Apakah RajaPremi ini perusahaan asuransi?', a: 'RajaPremi adalah broker/agregator asuransi berlisensi. Kami membandingkan produk dari perusahaan asuransi mitra, dan polis Anda diterbitkan serta dijamin oleh perusahaan asuransi terpilih — bukan oleh kami.', cat: 'Umum' },
    { q: 'Apakah bisa untuk kendaraan plat nomor luar daerah?', a: 'Bisa. Tarif premi dipengaruhi kode plat wilayah. Pilih kode plat yang sesuai pada formulir perbandingan, dan pastikan alamat pemegang polis diisi benar.', cat: 'Kendaraan' }
  ];

  /* ---------- Promos ---------- */
  const PROMOS = [
    { tag: 'Promo Baru', title: 'Asuransi gratis 30 hari', desc: 'Aktifkan perlindungan kecelakaan diri gratis setiap pendaftaran akun baru. S&K berlaku.', cta: 'Klaim promo', href: 'daftar.html', until: '31 Okt 2026' },
    { tag: 'Hemat 35%', title: 'Diskon premi motor All Risk', desc: 'Untuk 5.000 pembelian pertama bulan ini, khusus pembelian online.', cta: 'Bandingkan sekarang', href: 'bandingkan.html', until: 'Kuota terbatas' },
    { tag: 'Keluarga', title: 'Paket kesehatan keluarga', desc: 'Dua polis atau lebih dalam satu pembayaran — potongan langsung 20%.', cta: 'Lihat produk', href: 'produk.html?id=kesehatan', until: '31 Des 2026' }
  ];

  /* ---------- Claims timeline (kept from the existing claims flow) ---------- */
  const CLAIM_STEPS = [
    { title: 'Laporkan kejadian', desc: 'Isi formulir klaim online, pilih polis, dan pilih jenis klaim.', sla: '≤ 10 menit' },
    { title: 'Unggah dokumen', desc: 'Foto kerusakan, kuitansi, kronologi, dan dokumen pendukung lain.', sla: '≤ 1 hari' },
    { title: 'Verifikasi surveyor', desc: 'Surveyor mitra menghubungi Anda dan memverifikasi kerugian.', sla: '1–3 hari kerja' },
    { title: 'Persetujuan klaim', desc: 'Perusahaan asuransi menilai dan menerbitkan persetujuan klaim.', sla: '2–5 hari kerja' },
    { title: 'Pembayaran', desc: 'Dana ditransfer ke rekening Anda, atau bengkel rekanan untuk perbaikan.', sla: '3–7 hari kerja' }
  ];

  /* ---------- Benchmark: audited vs target (used by the admin view) ---------- */
  const BENCHMARK = {
    audited: { lcp: '6.4 s', weight: '1.80 MB', requests: 211, tti: '9.1 s', pages: '40+' },
    target:  { lcp: '1.6 s', weight: '420 KB', requests: 38,  tti: '2.2 s', pages: '11' }
  };

  global.RPData = {
    CONFIG: CONFIG, ICONS: I, NAV: NAV, PRODUCTS: PRODUCTS, PROVIDERS: PROVIDERS,
    COVERAGE: COVERAGE, PLATE_REGIONS: PLATE_REGIONS, TESTIMONIALS: TESTIMONIALS,
    FAQ: FAQ, PROMOS: PROMOS, CLAIM_STEPS: CLAIM_STEPS, BENCHMARK: BENCHMARK,
    generateQuotes: generateQuotes, rupiah: rupiah, shortenRupiah: shortenRupiah
  };
})(window);
