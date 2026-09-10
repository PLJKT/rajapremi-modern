/* ============================================================
   RajaPremi Modern — RajaAI
   ------------------------------------------------------------
   1. Floating assistant available on every page (intent-routed,
      grounded in the same FAQ/policy content the site publishes).
   2. Embeddable demos used by ai.html and the admin console:
      needs analysis, STNK document extraction, claim photo
      triage, and a back-office natural-language copilot.
   The intent engine is deliberately local and deterministic so
   the demo runs offline; README explains how to swap in a real
   LLM endpoint (one function: RP.AI.answer).
   ============================================================ */
(function (global) {
  'use strict';

  const D = global.RPData;
  const ICON = D.ICONS;
  let RP;

  /* ------------------------------------------------------------------
     Intent model: score-based keyword routing, no network required.
     ------------------------------------------------------------------ */
  const INTENTS = [
    {
      id: 'tlo-vs-allrisk',
      keys: ['tlo', 'all risk', 'allrisk', 'perlindungan', 'comprehensive', 'perbedaan', 'coverage', 'jenis'],
      run: function () {
        return {
          text: 'Perbedaan <strong>TLO</strong> dan <strong>All Risk</strong> terletak pada kerusakan ringan:\n' +
            '• <strong>TLO (Total Loss Only)</strong> — klaim dibayar hanya bila kerugian ≥ 75% dari harga kendaraan, atau hilang dicuri. Premi paling ringan.\n' +
            '• <strong>All Risk</strong> — hampir semua kerusakan ditanggung: lecet, penyok, kaca pecah, banjir. Premi 30–45% lebih tinggi.\n\n' +
            'Aturan praktis: motor yang diparkir di jalan umum atau mobil di bawah 5 tahun umumnya lebih hemat pakai All Risk; kendaraan tua bernilai rendah biasanya cukup TLO.',
          chips: ['Hitung selisih preminya', 'Apa itu TPL?', 'Saya sering kena banjir'],
          action: { label: 'Bandingkan harga', href: 'bandingkan.html' }
        };
      }
    },
    {
      id: 'price',
      keys: ['mahal', 'harga', 'premi', 'kenapa', 'biaya', 'murah', 'perhitungan', 'hitung'],
      run: function (q, ctx) {
        const base = (ctx && ctx.sumInsured) || 25000000;
        return {
          text: 'Premi = <strong>tarif dasar</strong> × <strong>faktor perlindungan</strong> × <strong>penyesuaian risiko</strong> (± usia kendaraan, kode plat wilayah, riwayat klaim).\n\n' +
            'Untuk kendaraan senilai <strong>' + D.rupiah(base) + '</strong>, tarif dasar tahunan sekitar 1,8–2,2%. Bila memilih All Risk, kalikan sekitar 1,4.\n\n' +
            'Perbedaan antar mitra itu normal — masing-masing punya tarif dan biaya polis sendiri (lihat kolom "biaya" pada kartu penawaran). Yang Anda bayar sama dengan yang tertulis di polis; RajaPremi tidak menambahkan markup.',
          chips: ['Bandingkan 7 mitra', 'Apakah ada cicilan?', 'Cara turunkan premi saya'],
          action: { label: 'Buka perbandingan', href: 'bandingkan.html' }
        };
      }
    },
    {
      id: 'needs',
      keys: ['butuh', 'rekomendasi', 'saran', 'cocok', 'sebaiknya', 'pilih', 'keluarga', 'prioritas'],
      run: function () {
        return {
          text: 'Saya bisa menyusun urutan prioritas proteksi dari tiga pertanyaan singkat — ini lebih akurat daripada menebak dari nama produk.',
          widget: 'needs'
        };
      }
    },
    {
      id: 'claim-status',
      keys: ['status klaim', 'nomor klaim', 'lacak', 'klaim saya', 'sudah diproses', 'progress klaim'],
      run: function (q) {
        const m = q.match(/[A-Z]{2,3}-?\d{3,10}/i);
        if (!m) {
          return {
            text: 'Boleh sebutkan nomor klaim Anda (format seperti <strong>RP-20260914-0198</strong>)? Nomor itu ada di email konfirmasi pelaporan klaim. Saya juga bisa menjelaskan tahapan klaim bila Anda belum melapor.',
            chips: ['Bagaimana cara klaim?', 'Dokumen apa yang diperlukan?']
          };
        }
        return {
          text: 'Klaim <strong>' + RP.esc(m[0].toUpperCase()) + '</strong> — status terakhir: <strong>verifikasi surveyor</strong> (hari ke-2 dari estimasi 5 hari kerja).\n' +
            '• Dokumen diterima lengkap ' + '\n• Surveyor mitra dijadwalkan menghubungi Anda hari ini\n• Estimasi persetujuan: 2 hari kerja lagi\n\n' +
            'Catatan: ini demo, jadi status bersifat contoh. Pada sistem produksi, jawaban ini diambil dari API klaim milik mitra secara real-time.',
          chips: ['Hubungi surveyor', 'Apa yang memperlambat klaim?'],
          action: { label: 'Pusat klaim', href: 'klaim.html' }
        };
      }
    },
    {
      id: 'claim-how',
      keys: ['cara klaim', 'bagaimana klaim', 'dokumen', 'syarat klaim', 'lapor', 'klaim'],
      run: function () {
        return {
          text: 'Alur klaim standar (sama seperti alur yang berlaku sekarang, kini bisa dipantau per tahap):\n' +
            '1. Laporkan kejadian — isi formulir, ≤ 10 menit.\n' +
            '2. Unggah foto kerusakan, kronologi, dan dokumen pendukung.\n' +
            '3. Verifikasi surveyor mitra — 1–3 hari kerja.\n' +
            '4. Persetujuan klaim — 2–5 hari kerja.\n' +
            '5. Dana ditransfer atau perbaikan di bengkel rekanan — 3–7 hari kerja.\n\n' +
            'Tips: foto dari beberapa sudut pada pencahayaan terang dan sertakan kuitansi mempercepat verifikasi.',
          chips: ['Klaim saya sudah berapa lama?', 'Bagaimana kalau ditolak?'],
          action: { label: 'Mulai lapor klaim', href: 'klaim.html' }
        };
      }
    },
    {
      id: 'document',
      keys: ['stnk', 'upload', 'unggah', 'dokumen kendaraan', 'scan', 'foto dokumen', 'ktp'],
      run: function () {
        return {
          text: 'Unggah foto <strong>STNK</strong> (atau BPKB/KTP) — saya baca datanya dan mengisi formulir otomatis, jadi Anda tidak perlu mengetik nomor rangka dan nomor mesin manual.',
          widget: 'ocr'
        };
      }
    },
    {
      id: 'payment',
      keys: ['bayar', 'pembayaran', 'cicilan', 'transfer', 'kartu kredit', 'angsuran', 'va'],
      run: function () {
        return {
          text: 'Pembayaran yang tersedia: <strong>virtual account</strong> (BCA, Mandiri, BNI, BRI, Permata), kartu kredit, dan <strong>cicilan 3/6/12 bulan</strong> tanpa bunga untuk sebagian mitra.\n' +
            'Polis elektronik terbit otomatis begitu pembayaran terverifikasi — biasanya dalam 5–15 menit, dan langsung masuk email Anda.',
          chips: ['Ada biaya admin?', 'Bagaimana pembatalan polis?']
        };
      }
    },
    {
      id: 'cancel',
      keys: ['batalkan', 'refund', 'pengembalian', 'cancel', 'batal'],
      run: function () {
        return {
          text: D.FAQ.find(f => f.cat === 'Polis').a +
            '\n\nPada demo ini, tombol pembatalan ada di panel admin (menu Polis), lengkap dengan perhitungan prorata otomatis.',
          chips: ['Buat klaim', 'Ubah data polis']
        };
      }
    },
    {
      id: 'security',
      keys: ['aman', 'privasi', 'data', 'bocor', 'enkripsi'],
      run: function () {
        return {
          text: D.FAQ.find(f => f.cat === 'Keamanan').a +
            '\n\nSatu perbaikan penting pada versi modern ini: kunci API dan data mitra tidak lagi dikirim ke browser. Semua panggilan ke mitra lewat server, dan browser hanya menerima angka premi yang perlu ditampilkan.',
          chips: ['Apa itu RajaPremi?', 'Bagaimana cara klaim?']
        };
      }
    },
    {
      id: 'handoff',
      keys: ['manusia', 'cs', 'customer service', 'telepon', 'chat dengan orang', 'whatsapp', 'agen'],
      run: function () {
        return {
          text: 'Saya sambungkan ke tim kami. Jam layanan ' + D.CONFIG.hours + '.',
          chips: [],
          actions: [
            { label: 'WhatsApp CS', href: D.CONFIG.whatsapp, external: true },
            { label: 'Telepon ' + D.CONFIG.phone, href: 'tel:' + D.CONFIG.phone.replace(/[^\d+]/g, '') },
            { label: 'Email ' + D.CONFIG.email, href: 'mailto:' + D.CONFIG.email }
          ]
        };
      }
    },
    {
      id: 'greeting',
      keys: ['halo', 'hai', 'hi', 'pagi', 'siang', 'malam', 'assalamualaikum', 'tes', 'test'],
      run: function () {
        return {
          text: 'Halo! Saya <strong>RajaAI</strong>, asisten asuransi RajaPremi. Saya bisa membandingkan produk, menjelaskan istilah polis, dan membantu klaim.',
          chips: ['TLO vs All Risk', 'Produk apa yang cocok untuk saya?', 'Cara klaim', 'Kenapa premi saya mahal?']
        };
      }
    }
  ];

  const FALLBACK = {
    text: 'Saya belum yakin menangkap maksudnya. Saya paling kuat di empat hal ini — pilih salah satu, atau tulis pertanyaan Anda dengan kata kunci lain.',
    chips: ['TLO vs All Risk', 'Produk apa yang cocok untuk saya?', 'Cara klaim', 'Kenapa premi saya mahal?']
  };

  /* ------------------------------------------------------------------
     Router
     ------------------------------------------------------------------ */
  function classify(q) {
    const s = q.toLowerCase();
    let best = null, bestScore = 0;
    INTENTS.forEach(function (intent) {
      let score = 0;
      intent.keys.forEach(function (k) { if (s.indexOf(k) > -1) score += k.split(' ').length + 1; });
      if (score > bestScore) { bestScore = score; best = intent; }
    });
    return best;
  }

  function answer(q, ctx) {
    if (!q || !q.trim()) return FALLBACK;
    const intent = classify(q);
    if (intent) return intent.run(q, ctx || {});
    // FAQ search as a second pass
    const hit = D.FAQ.find(function (f) {
      return f.q.toLowerCase().split(' ').some(w => w.length > 4 && q.toLowerCase().indexOf(w) > -1);
    });
    if (hit) return { text: '<strong>' + RP.esc(hit.q) + '</strong>\n\n' + RP.esc(hit.a), chips: ['TLO vs All Risk', 'Cara klaim'], cat: hit.cat };
    return FALLBACK;
  }

  /* ------------------------------------------------------------------
     Panel UI
     ------------------------------------------------------------------ */
  const SEED = [
    'Halo! Saya RajaAI. Mau saya bantu hitung premi, menjelaskan polis, atau memproses klaim?',
    'Coba tanya: "bedanya TLO dan All Risk apa?" atau "unggah STNK saya".'
  ];

  function panelMarkup() {
    return '' +
    '<div class="ai-panel" id="aiPanel" aria-hidden="true">' +
      '<div class="ai-head">' +
        '<span class="ai-avatar">' + ICON.spark + '</span>' +
        '<div class="ai-head-text"><strong>RajaAI</strong>' +
        '<span class="ai-status">' + ICON.check + ' Online · menjawab dalam &lt; 2 detik</span></div>' +
        '<button class="btn btn-ghost btn-icon" type="button" data-ai-close aria-label="Tutup">' + ICON.x + '</button>' +
      '</div>' +
      '<div class="ai-body" id="aiBody"></div>' +
      '<div class="ai-foot">' +
        '<form class="ai-input" data-ai-form>' +
          '<button class="btn btn-ghost btn-icon" type="button" data-ai-voice title="Rekam suara">' + ICON.mic + '</button>' +
          '<input class="input" type="text" placeholder="Tulis pertanyaan Anda…" data-ai-input autocomplete="off" aria-label="Pertanyaan">' +
          '<button class="btn btn-primary btn-icon" type="submit" aria-label="Kirim">' + ICON.send + '</button>' +
        '</form>' +
        '<p class="ai-disclaimer">RajaAI dapat keliru. Untuk keputusan polis, verifikasi dengan dokumen resmi atau tim kami.</p>' +
      '</div>' +
    '</div>' +
    '<button class="ai-fab" type="button" data-ai-open aria-label="Buka RajaAI">' + ICON.spark + '<span class="ai-fab-label">Tanya RajaAI</span></button>';
  }

  function bubble(role, html) {
    return '<div class="ai-msg ai-msg-' + role + '"><div class="ai-bubble">' + html + '</div></div>';
  }

  function renderRich(res) {
    /* Escape everything first, then whitelist a few inline tags. This keeps
       answer text safe to render even if the source later becomes an LLM
       response rather than our own strings. */
    const ALLOWED = /&lt;(\/?)(strong|em|br|ul|li)&gt;/g;
    let out = RP.esc(res.text).replace(ALLOWED, '<$1$2>');
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\n/g, '<br>');
    out = out.replace(/(^|<br>)(\d+\.)/g, '$1<strong>$2</strong>');
    if (res.cat) out += '<span class="ai-cat">' + RP.esc(res.cat) + '</span>';
    if (res.chips && res.chips.length) {
      out += '<div class="ai-chips">' + res.chips.map(c => '<button type="button" class="chip chip-sm" data-ai-chip="' + RP.esc(c) + '">' + RP.esc(c) + '</button>').join('') + '</div>';
    }
    if (res.action) out += '<a class="btn btn-soft btn-sm" href="' + res.action.href + '">' + RP.esc(res.action.label) + ICON.arrow + '</a>';
    if (res.actions) out += '<div class="ai-actions">' + res.actions.map(a => '<a class="btn btn-soft btn-sm" ' + (a.external ? 'target="_blank" rel="noopener" ' : '') + 'href="' + a.href + '">' + RP.esc(a.label) + '</a>').join('') + '</div>';
    if (res.widget === 'needs') out += needsWizardMarkup();
    if (res.widget === 'ocr') out += ocrWidgetMarkup();
    return out;
  }

  function push(role, html) {
    const body = document.getElementById('aiBody');
    if (!body) return;
    body.insertAdjacentHTML('beforeend', bubble(role, html));
    body.scrollTop = body.scrollHeight;
  }

  function typing() {
    const body = document.getElementById('aiBody');
    if (!body) return;
    body.insertAdjacentHTML('beforeend',
      '<div class="ai-msg ai-msg-bot" id="aiTyping"><div class="ai-bubble ai-typing"><span></span><span></span><span></span></div></div>');
    body.scrollTop = body.scrollHeight;
  }
  function untype() { const t = document.getElementById('aiTyping'); if (t) t.remove(); }

  function respond(text, ctx) {
    typing();
    setTimeout(function () {
      untype();
      const res = answer(text, ctx);
      push('bot', renderRich(res));
    }, 420 + Math.random() * 380);
  }

  function open(seed) {
    const p = document.getElementById('aiPanel');
    if (!p) return;
    p.classList.add('is-open');
    p.setAttribute('aria-hidden', 'false');
    const body = document.getElementById('aiBody');
    if (!body.dataset.ready) {
      SEED.forEach(function (s, i) {
        setTimeout(function () { push('bot', RP.esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')); }, 260 + i * 420);
      });
      setTimeout(function () { push('bot', renderRich({ text: 'Mau mulai dari mana?', chips: ['TLO vs All Risk', 'Produk apa yang cocok untuk saya?', 'Cara klaim', 'Kenapa premi saya mahal?'] })); }, 1220);
      body.dataset.ready = '1';
    }
    if (seed) { push('user', RP.esc(seed)); respond(seed); }
    setTimeout(function () { const i = document.querySelector('[data-ai-input]'); if (i) i.focus(); }, 260);
  }
  function close() {
    const p = document.getElementById('aiPanel');
    if (p) { p.classList.remove('is-open'); p.setAttribute('aria-hidden', 'true'); }
  }
  function toggle() {
    const p = document.getElementById('aiPanel');
    if (p && p.classList.contains('is-open')) close(); else open();
  }

  /* ------------------------------------------------------------------
     Needs-analysis wizard (3 questions -> ranked recommendation)
     ------------------------------------------------------------------ */
  const NEEDS = [
    { q: 'Apa yang paling ingin Anda lindungi?', opts: [['kendaraan', 'Kendaraan saya'], ['kesehatan', 'Kesehatan keluarga'], ['harta', 'Rumah / aset bisnis'], ['perjalanan', 'Perjalanan']] },
    { q: 'Berapa orang yang bergantung pada penghasilan Anda?', opts: [['0', 'Belum ada'], ['1-2', '1–2 orang'], ['3+', '3 orang atau lebih']] },
    { q: 'Anggaran premi per bulan yang nyaman?', opts: [['<250', 'Di bawah Rp250 ribu'], ['250-750', 'Rp250–750 ribu'], ['>750', 'Di atas Rp750 ribu']] }
  ];
  const needsState = { step: 0, ans: [] };

  function needsWizardMarkup() {
    const s = NEEDS[needsState.step];
    return '<div class="needs-wizard">' +
      '<div class="needs-progress"><span style="width:' + (needsState.step / NEEDS.length * 100) + '%"></span></div>' +
      '<p class="needs-q">' + RP.esc(s.q) + '</p>' +
      '<div class="needs-opts">' + s.opts.map(o => '<button type="button" class="btn btn-soft btn-sm" data-needs-step="' + o[0] + '">' + RP.esc(o[1]) + '</button>').join('') + '</div>' +
      '</div>';
  }

  function needsResult() {
    const [focus, deps, budget] = needsState.ans;
    const rec = [];
    if (focus === 'kendaraan') rec.push(['motor', 'Asuransi Motor — All Risk bila motor sering diparkir di jalan umum; TLO cukup untuk motor tua bernilai rendah.']);
    if (focus === 'kesehatan') rec.push(['kesehatan', 'Asuransi Kesehatan — mulai dari rawat inap, tambahkan rawat jalan bila ada anak kecil.']);
    if (focus === 'harta') rec.push(['properti', 'Asuransi Properti — nilai bangunan cukup untuk nilai ganti, bukan harga pasar.']);
    if (focus === 'perjalanan') rec.push(['travel', 'Travel Insurance — perhatikan batas tanggungan medis dan pembatalan perjalanan.']);
    if (deps === '3+') rec.push(['jiwa', 'Asuransi Jiwa — santunan minimal 10× penghasilan tahunan untuk 3 tanggungan atau lebih.']);
    if (deps === '1-2') rec.push(['kecelakaan', 'Kecelakaan Diri — penambahan murah yang memberi santunan bila pencari nafkah terhenti.']);
    if (budget === '>750' && focus !== 'kesehatan') rec.push(['kesehatan', 'Asuransi Kesehatan — anggaran Anda memungkinkan manfaat cashless rumah sakit.']);
    return {
      text: 'Berdasarkan jawaban Anda, ini urutan prioritas yang saya sarankan:',
      actions: rec.slice(0, 3).map(r => ({ label: r[1].split('—')[0].trim(), href: 'produk.html?id=' + r[0] })),
      list: rec.slice(0, 3).map(r => '• <strong>' + RP.esc(r[1].split('—')[0].trim()) + '</strong> — ' + RP.esc(r[1].split('—')[1].trim()))
    };
  }

  /* ------------------------------------------------------------------
     STNK extraction demo
     ------------------------------------------------------------------ */
  const STNK_SAMPLE = {
    plate: 'B 1234 XYZ',
    owner: 'Nama Pemilik Terdaftar',
    brand: 'Honda Vario 150',
    year: 2021,
    engine: 'JF15E-1234567',
    chassis: 'MH1JF1500MK123456',
    value: 21000000
  };

  function ocrWidgetMarkup() {
    return '<div class="ocr-widget" data-ocr>' +
      '<label class="ocr-drop" data-ocr-drop>' + ICON.upload +
        '<strong>Jatuhkan foto STNK di sini</strong>' +
        '<span class="muted">JPG/PNG/PDF hingga 8 MB — atau klik untuk memilih</span>' +
        '<input type="file" accept="image/*,.pdf" hidden data-ocr-file>' +
      '</label>' +
      '<div class="ocr-result" data-ocr-result hidden></div>' +
      '<div class="ocr-actions" style="margin-top:.6rem">' +
        '<button class="btn btn-soft btn-sm" type="button" data-ocr-demo>' + ICON.camera + ' Pakai contoh STNK</button>' +
      '</div>' +
    '</div>';
  }

  function runOcr(fileName) {
    const host = document.querySelector('[data-ocr-result]');
    if (!host) return;
    host.hidden = false;
    host.innerHTML = '<div class="ocr-scan"><div class="ocr-scan-bar"></div><p>Membaca dokumen…</p></div>';
    const steps = ['Menajamkan gambar', 'Mendeteksi bidang teks', 'Mengekstrak entitas', 'Memvalidasi nomor rangka'];
    let i = 0;
    const int = setInterval(function () {
      const p = host.querySelector('.ocr-scan p');
      if (p && i < steps.length) p.textContent = steps[i++] + '…';
      if (i >= steps.length) {
        clearInterval(int);
        renderExtraction(host, fileName);
      }
    }, 480);
  }

  function renderExtraction(host, fileName) {
    const rows = [
      ['Nomor polisi', STNK_SAMPLE.plate, 0.99],
      ['Pemilik', STNK_SAMPLE.owner, 0.94],
      ['Merek / model', STNK_SAMPLE.brand, 0.96],
      ['Tahun pembuatan', String(STNK_SAMPLE.year), 0.98],
      ['Nomor mesin', STNK_SAMPLE.engine, 0.91],
      ['Nomor rangka', STNK_SAMPLE.chassis, 0.97]
    ];
    host.innerHTML = '' +
    '<div class="alert alert-success">' + ICON.check + '<div><strong>Data terbaca' + (fileName ? ' dari ' + RP.esc(fileName) : ' dari contoh dokumen') + '.</strong> Periksa dulu sebelum dipakai.</div></div>' +
    '<table class="table table-tight">' + rows.map(function (r) {
      return '<tr><td class="row-label">' + r[0] + '</td><td><strong>' + RP.esc(r[1]) + '</strong></td>' +
        '<td class="num"><span class="conf ' + (r[2] > 0.95 ? 'conf-high' : 'conf-mid') + '">' + Math.round(r[2] * 100) + '% yakin</span></td></tr>';
    }).join('') + '</table>' +
    '<div class="ocr-actions">' +
      '<a class="btn btn-primary btn-sm" href="bandingkan.html?product=motor&harga=' + STNK_SAMPLE.value + '&tahun=' + STNK_SAMPLE.year + '&plat=13">' + ICON.bolt + ' Isi formulir &amp; hitung premi</a>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-ocr-demo>Ulangi</button>' +
    '</div>' +
    '<p class="field-note">Nilai bidang <strong>tahun</strong> dan <strong>plat</strong> sudah dipetakan ke formulir perbandingan. Pada produksi, langkah ini memakai model vision di server — gambar tidak pernah disimpan.</p>';
  }

  /* ------------------------------------------------------------------
     Claim photo triage demo
     ------------------------------------------------------------------ */
  const TRIAGE = [
    { label: 'Kerusakan body belakang', conf: 0.92, severity: 'Sedang', est: 1850000, note: 'Penyok panel bagasi + lampu retak. Bisa diklaim bila polis All Risk.' },
    { label: 'Kerusakan kaca depan', conf: 0.88, severity: 'Ringan', est: 950000, note: 'Retak menjalar < 20 cm. Banyak mitra menanggung kaca tanpa memengaruhi NCD.' },
    { label: 'Kerusakan berat / rangka', conf: 0.81, severity: 'Berat', est: 12750000, note: 'Indikasi kerusakan struktural — surveyor wajib datang. Siapkan kronologi kejadian.' }
  ];

  function mountTriage(host) {
    if (!host) return;
    host.innerHTML = '' +
    '<div class="triage-grid">' +
      '<label class="ocr-drop" data-triage-drop>' + ICON.camera +
        '<strong>Unggah foto kerusakan</strong><span class="muted">Beberapa sudut, pencahayaan terang</span>' +
        '<input type="file" accept="image/*" multiple hidden data-triage-file></label>' +
      '<div class="triage-out" data-triage-out><p class="muted">Hasil analisis muncul di sini.</p></div>' +
    '</div>' +
    '<div class="row" style="gap:.5rem;margin-top:.75rem">' +
      '<button class="btn btn-soft btn-sm" type="button" data-triage-demo>' + ICON.spark + ' Analisis contoh foto</button>' +
    '</div>';
    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-triage-demo]') || e.target.closest('[data-triage-drop]')) {
        const out = host.querySelector('[data-triage-out]');
        out.innerHTML = '<div class="ocr-scan"><div class="ocr-scan-bar"></div><p>Menganalisis kerusakan…</p></div>';
        setTimeout(function () {
          out.innerHTML =
            '<div class="alert alert-success">' + ICON.check + '<div><strong>Triage selesai.</strong> Estimasi awal untuk mempercepat verifikasi — bukan penetapan klaim.</div></div>' +
            TRIAGE.map(function (t) {
              return '<div class="triage-row"><div><strong>' + t.label + '</strong><span class="muted">' + RP.esc(t.note) + '</span></div>' +
                '<div class="triage-row-right"><span class="badge badge-' + (t.severity === 'Berat' ? 'danger' : t.severity === 'Sedang' ? 'warn' : 'success') + '">' + t.severity + '</span>' +
                '<span class="num">' + D.rupiah(t.est) + '</span><span class="conf conf-high">' + Math.round(t.conf * 100) + '% yakin</span></div></div>';
            }).join('') +
            '<div class="row" style="gap:.5rem;margin-top:.75rem"><a class="btn btn-primary btn-sm" href="klaim.html">Lanjutkan lapor klaim' + ICON.arrow + '</a>' +
            '<span class="muted" style="font-size:var(--fs-sm)">Tidak ada foto yang benar-benar dikirim pada demo ini.</span></div>';
        }, 1700);
      }
    });
  }

  /* ------------------------------------------------------------------
     Back-office copilot (admin)
     ------------------------------------------------------------------ */
  const COPILOT_QUESTIONS = [
    { q: 'Berapa premi masuk bulan ini dibanding bulan lalu?',
      a: '<span class="muted">(data contoh)</span> Premi bruto bulan ini <strong>Rp2,84 miliar</strong>, naik <strong>18,4%</strong> dari bulan lalu (Rp2,40 miliar). Kenaikan didorong produk motor (+31%).',
      table: { head: ['Kanal', 'Bulan ini', 'Bulan lalu', 'Δ'], rows: [['Website', 'Rp1.640 jt', 'Rp1.420 jt', '+15,5%'], ['Partner/agen', 'Rp780 jt', 'Rp690 jt', '+13,0%'], ['Marketplace', 'Rp420 jt', 'Rp290 jt', '+44,8%']] } },
    { q: 'Mitra mana yang claim ratio-nya memburuk?',
      a: '<span class="muted">(data contoh — nama mitra disamarkan)</span> Dua mitra perlu diperhatikan: <strong>Mitra A</strong> (claim ratio 118%) dan <strong>Mitra B</strong> (97%). Keduanya bertarif lebih tinggi untuk risiko yang sama, jadi peninjauan tarifnya akan berpengaruh pada konversi.',
      table: { head: ['Mitra', 'Claim ratio', 'Kebijakan aktif', 'Tren'], rows: [['Mitra A', '118%', '1.240', 'Memburuk'], ['Mitra B', '97%', '2.180', 'Memburuk'], ['Mitra C', '62%', '3.410', 'Stabil'], ['Mitra D', '58%', '4.120', 'Membaik']] } },
    { q: 'Produk apa yang paling sering ditinggalkan sebelum bayar?',
      a: '<span class="muted">(data contoh)</span> Kesehatan adalah yang tertinggi: <strong>64%</strong> pengguna sampai halaman kuotasi lalu berhenti, terutama pada tahap verifikasi usia. Menambahkan kuotasi instan tanpa pemeriksaan kesehatan diperkirakan menaikkan konversi 6–9 poin.',
      table: { head: ['Produk', 'Drop-off', 'Tahap tersering'], rows: [['Kesehatan', '64%', 'Verifikasi usia'], ['Motor', '41%', 'Pilih mitra'], ['Properti', '57%', 'Survey'], ['Travel', '22%', 'Bayar']] } },
    { q: 'Tampilkan polis yang akan berakhir 30 hari ke depan',
      a: '<span class="muted">(data contoh)</span> Ada <strong>1.876 polis</strong> berakhir dalam 30 hari dengan nilai premi perpanjangan potensial <strong>Rp612 juta</strong>. Yang paling bernilai untuk dihubungi lebih dulu: 214 polis motor All Risk.',
      table: { head: ['Produk', 'Polis', 'Nilai perpanjangan'], rows: [['Motor All Risk', '214', 'Rp186 jt'], ['Kesehatan', '96', 'Rp241 jt'], ['Properti', '58', 'Rp142 jt'], ['Travel', '1.508', 'Rp43 jt']] } }
  ];

  function mountCopilot(host) {
    if (!host) return;
    host.innerHTML = '' +
      '<div class="copilot">' +
        '<form class="row" style="gap:.5rem" data-copilot-form>' +
          '<input class="input" type="text" placeholder="Tanya soal data bisnis… mis. claim ratio mitra" data-copilot-input>' +
          '<button class="btn btn-primary" type="submit">' + ICON.spark + ' Tanya</button>' +
        '</form>' +
        '<div class="chips" style="margin-top:.6rem">' +
          COPILOT_QUESTIONS.map(q => '<button type="button" class="chip chip-sm" data-copilot-q="' + RP.esc(q.q) + '">' + RP.esc(q.q) + '</button>').join('') +
        '</div>' +
        '<div class="copilot-out" data-copilot-out></div>' +
      '</div>';
    host.addEventListener('click', function (e) {
      const chip = e.target.closest('[data-copilot-q]');
      if (!chip) return;
      const inp = host.querySelector('[data-copilot-input]');
      inp.value = chip.getAttribute('data-copilot-q');
      host.querySelector('[data-copilot-form]').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
    host.addEventListener('submit', function (e) {
      e.preventDefault();
      const out = host.querySelector('[data-copilot-out]');
      const q = host.querySelector('[data-copilot-input]').value.trim();
      if (!q) return;
      out.innerHTML = '<div class="ocr-scan"><div class="ocr-scan-bar"></div><p>Menyusun kueri…</p></div>';
      setTimeout(function () {
        const hit = COPILOT_QUESTIONS.find(c => c.q.toLowerCase() === q.toLowerCase()) ||
          COPILOT_QUESTIONS.find(c => q.toLowerCase().split(' ').some(w => w.length > 4 && c.q.toLowerCase().indexOf(w) > -1)) ||
          COPILOT_QUESTIONS[0];
        const max = Math.max.apply(null, hit.table.rows.map(r => parseFloat(String(r[1]).replace(/[^\d.,]/g, '').replace(',', '.')) || 1));
        out.innerHTML = '' +
          '<div class="copilot-answer"><p>' + hit.a + '</p>' +
          '<table class="table table-tight">' +
            '<thead><tr>' + hit.table.head.map(h => '<th>' + RP.esc(h) + '</th>').join('') + '</tr></thead>' +
            '<tbody>' + hit.table.rows.map(function (r) {
              const v = parseFloat(String(r[1]).replace(/[^\d.,]/g, '').replace(',', '.')) || 1;
              return '<tr>' + r.map((c, i) => '<td' + (i ? ' class="num"' : '') + '>' + RP.esc(c) + '</td>').join('') +
                '<td class="bar-cell"><span class="bar" style="width:' + Math.min(100, v / max * 100) + '%"></span></td></tr>';
            }).join('') + '</tbody>' +
          '</table>' +
          '<p class="field-note">Angka pada panel ini adalah data contoh untuk demo, bukan data produksi — pada produksi kueri diterjemahkan ke SQL lalu dijalankan pada replika baca-saja.</p></div>';
      }, 900);
    });
  }

  /* ------------------------------------------------------------------
     wire up
     ------------------------------------------------------------------ */
  function mountFloating() {
    if (document.getElementById('aiPanel')) return;
    document.body.insertAdjacentHTML('beforeend', panelMarkup());

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-ai-open]')) {
        const trigger = e.target.closest('[data-ai-open]');
        open(trigger.getAttribute('data-ai-seed') || '');
        return;
      }
      if (e.target.closest('[data-ai-close]')) { close(); return; }
      const chip = e.target.closest('[data-ai-chip]');
      if (chip) { const t = chip.getAttribute('data-ai-chip'); push('user', RP.esc(t)); respond(t); return; }
      const step = e.target.closest('[data-needs-step]');
      if (step) {
        needsState.ans[needsState.step] = step.getAttribute('data-needs-step');
        needsState.step++;
        if (needsState.step < NEEDS.length) {
          push('bot', needsWizardMarkup());
        } else {
          const r = needsResult();
          needsState.step = 0; needsState.ans = [];
          const body = r.list ? r.list.join('<br>') : '';
          push('bot', renderRich({ text: r.text + '\n\n' + body, actions: r.actions }));
        }
        return;
      }
      if (e.target.closest('[data-ocr-demo]')) { runOcr(''); return; }
      const drop = e.target.closest('[data-ocr-drop]');
      if (drop) { const f = drop.querySelector('[data-ocr-file]'); if (f) f.click(); return; }
      if (e.target.closest('[data-ai-voice]')) { startVoice(); return; }
    });

    document.addEventListener('change', function (e) {
      const f = e.target.closest('[data-ocr-file]');
      if (f && f.files && f.files[0]) runOcr(f.files[0].name);
    });

    document.addEventListener('submit', function (e) {
      const form = e.target.closest('[data-ai-form]');
      if (!form) return;
      e.preventDefault();
      const input = form.querySelector('[data-ai-input]');
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      push('user', RP.esc(q));
      respond(q);
    });
  }

  /* ------------------------------------------------------------------
     Voice input — real Web Speech API when the browser supports it
     ------------------------------------------------------------------ */
  const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
  function startVoice() {
    if (!SR) {
      RP.toast('Peramban ini tidak mendukung pengenalan suara. Di Chrome/Edge fitur ini aktif.', 'warn', 5000);
      return;
    }
    const rec = new SR();
    rec.lang = 'id-ID';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    const input = document.querySelector('[data-ai-input]');
    if (input) { input.placeholder = 'Mendengarkan…'; input.classList.add('is-listening'); }
    RP.toast('Mendengarkan — bicara dalam Bahasa Indonesia.', 'info', 2600);
    rec.onresult = function (ev) {
      const text = ev.results[0][0].transcript;
      if (input) { input.value = text; input.classList.remove('is-listening'); }
      push('user', ICON.mic + ' ' + RP.esc(text));
      respond(text);
    };
    rec.onerror = function () {
      if (input) { input.classList.remove('is-listening'); input.placeholder = 'Tulis pertanyaan Anda…'; }
      RP.toast('Suara tidak terbaca. Coba lagi atau ketik pertanyaannya.', 'warn');
    };
    rec.onend = function () {
      if (input) { input.classList.remove('is-listening'); input.placeholder = 'Tulis pertanyaan Anda…'; }
    };
    try { rec.start(); } catch (err) { RP.toast('Mikrofon tidak dapat diakses.', 'warn'); }
  }

  function mountAll() {
    RP = global.RP;
    if (!RP) { console.error('[RajaAI] app shell not loaded'); return; }
    mountFloating();
    mountTriage(document.getElementById('triageDemo'));
    mountCopilot(document.getElementById('copilotDemo'));

    /* Deep links that open the assistant, so a campaign or a support email can
       point straight at a question:  ...?ai=Bedanya TLO dan All Risk   or  #tanya */
    try {
      const params = new URLSearchParams(global.location.search);
      if (params.has('ai')) open(params.get('ai') || 'Halo RajaAI');
      else if (global.location.hash === '#tanya') open('Halo RajaAI');
    } catch (e) { /* no location (sandboxed) — nothing to do */ }
  }

  global.RPAI = {
    mount: mountAll,
    open: open, close: close, toggle: toggle,
    answer: answer,                 // swap this for a real LLM call
    mountTriage: mountTriage, mountCopilot: mountCopilot,
    runOcr: runOcr, startVoice: startVoice
  };

  document.addEventListener('DOMContentLoaded', function () {
    // app.js loads first and mounts the chrome; defer a tick so RP exists.
    setTimeout(mountAll, 0);
  });
})(window);
