/* ============================================================
   RajaPremi Modern — Quote engine
   Multi-step comparison form + result list + compare tray.
   Deep-linkable (?product=&harga=&plat=&tahun=&coverage=) and
   fully keyboard-accessible. Data comes from RPData.generateQuotes
   (mock) or RPQuote.live() when CONFIG.liveApi is on.
   ============================================================ */
(function (global) {
  'use strict';

  const D = global.RPData;
  const ICON = D.ICONS;

  const state = {
    product: 'motor',
    sumInsured: 25000000,
    plate: 13,
    year: 2023,
    coverage: 1,
    limitPerson: 0,
    limitTpl: 0,
    sort: 'price-asc',
    providerFilter: 'all',
    results: [],
    selected: [],
    loading: false,
    ran: false
  };

  const YEARS = (function () {
    const out = [];
    for (let y = 2026; y >= 2004; y--) out.push(y);
    return out;
  })();

  const PRESETS = {
    motor: [
      { label: 'Motor harian 10 jt', value: 10000000 },
      { label: 'Motor matic 25 jt', value: 25000000 },
      { label: 'Motor sport 60 jt', value: 60000000 },
      { label: 'Motor niaga 90 jt', value: 90000000 }
    ],
    mobil: [
      { label: 'LCGC 150 jt', value: 150000000 },
      { label: 'SUV 300 jt', value: 300000000 },
      { label: 'MPV 450 jt', value: 450000000 },
      { label: 'Mobil premium 900 jt', value: 900000000 }
    ]
  };

  function rupiah(n, sym) { return D.rupiah(n, sym); }

  /* ---------- URL <-> state ---------- */
  function readUrl() {
    const p = new URLSearchParams(location.search);
    if (p.get('product')) state.product = p.get('product') === 'mobil' ? 'mobil' : 'motor';
    if (p.get('harga')) state.sumInsured = Math.max(1000000, parseInt(p.get('harga'), 10) || state.sumInsured);
    if (p.get('plat')) state.plate = parseInt(p.get('plat'), 10) || state.plate;
    if (p.get('tahun')) state.year = parseInt(p.get('tahun'), 10) || state.year;
    if (p.get('coverage')) state.coverage = parseInt(p.get('coverage'), 10) === 2 ? 2 : 1;
    if (p.get('sort')) state.sort = p.get('sort');
  }
  function writeUrl() {
    const p = new URLSearchParams();
    p.set('product', state.product);
    p.set('harga', String(state.sumInsured));
    p.set('plat', String(state.plate));
    p.set('tahun', String(state.year));
    p.set('coverage', String(state.coverage));
    history.replaceState(null, '', location.pathname + '?' + p.toString());
  }

  /* ---------- data ---------- */
  function compute() {
    return D.generateQuotes({
      product: state.product,
      sumInsured: state.sumInsured,
      coverage: state.coverage,
      plate: state.plate,
      year: state.year
    });
  }

  function sortAndFilter(rows) {
    let out = rows.slice();
    if (state.providerFilter !== 'all') out = out.filter(r => r.provider.code === state.providerFilter);
    switch (state.sort) {
      case 'price-desc': out.sort((a, b) => b.total - a.total); break;
      case 'rating': out.sort((a, b) => b.rating - a.rating || a.total - b.total); break;
      case 'claims': out.sort((a, b) => parseInt(a.claims) - parseInt(b.claims) || a.total - b.total); break;
      default: out.sort((a, b) => a.total - b.total);
    }
    return out;
  }

  /* ---------- markup: form ---------- */
  function formMarkup(compact) {
    const presets = PRESETS[state.product];
    return '' +
    '<form class="quote-form" novalidate>' +
      (compact ? '' : '<div class="quote-head"><h3 style="margin:0">Hitung premi Anda</h3><span class="badge badge-primary">' + ICON.bolt + ' ' + D.PROVIDERS.length + ' mitra sekaligus</span></div>') +
      '<div class="field">' +
        '<label>Jenis kendaraan</label>' +
        '<div class="segmented" data-field="product">' +
          '<button type="button" class="' + (state.product === 'motor' ? 'is-active' : '') + '" data-value="motor">' + ICON.bike + ' Motor</button>' +
          '<button type="button" class="' + (state.product === 'mobil' ? 'is-active' : '') + '" data-value="mobil">' + ICON.car + ' Mobil</button>' +
        '</div>' +
      '</div>' +
      '<div class="field">' +
        '<label for="qHarga">Harga ' + (state.product === 'motor' ? 'motor' : 'mobil') + ' <span class="hint">harga pasar saat ini</span></label>' +
        '<div class="input-group">' +
          '<span class="input-affix">Rp</span>' +
          '<input id="qHarga" class="input" type="text" inputmode="numeric" value="' + rupiah(state.sumInsured, false) + '" data-field="sumInsured" autocomplete="off">' +
        '</div>' +
        '<div class="chips" style="margin-top:.5rem">' +
          presets.map(function (p) {
            return '<button type="button" class="chip" data-preset="' + p.value + '">' + p.label + '</button>';
          }).join('') +
        '</div>' +
        (state.sumInsured < 10000000 || state.sumInsured > 5000000000
          ? '<p class="field-note">Nilai di luar rentang umum — masih bisa dihitung, namun mitra mungkin meminta survey.</p>' : '') +
      '</div>' +
      '<div class="grid grid-2">' +
        '<div class="field">' +
          '<label for="qPlate">Kode plat</label>' +
          '<select id="qPlate" class="select" data-field="plate">' +
            D.PLATE_REGIONS.map(function (r) {
              return '<option value="' + r.code + '"' + (r.code === state.plate ? ' selected' : '') + '>' + RP.esc(r.label) + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label for="qYear">Tahun</label>' +
          '<select id="qYear" class="select" data-field="year">' +
            YEARS.map(function (y) { return '<option value="' + y + '"' + (y === state.year ? ' selected' : '') + '>' + y + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="field">' +
        '<label>Jenis perlindungan</label>' +
        '<div class="radio-cards" data-field="coverage">' +
          D.COVERAGE.map(function (c) {
            return '<button type="button" class="radio-card' + (state.coverage === c.code ? ' is-active' : '') + '" data-value="' + c.code + '">' +
              '<span class="radio-card-top"><strong>' + RP.esc(c.label) + '</strong>' + (state.coverage === c.code ? '<span class="radio-dot">' + ICON.check + '</span>' : '') + '</span>' +
              '<span class="radio-card-desc">' + RP.esc(c.desc) + '</span></button>';
          }).join('') +
        '</div>' +
        '<p class="field-note">' + ICON.info + ' Harga All Risk biasanya 30–45% lebih tinggi, namun menanggung kerusakan ringan.</p>' +
      '</div>' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit">' + ICON.search + ' Bandingkan ' + D.PROVIDERS.length + ' mitra</button>' +
      '<p class="form-foot">Membandingkan tidak berbayar dan tidak butuh kartu kredit. Data Anda baru dibagikan ke mitra setelah Anda memilih penawaran.</p>' +
    '</form>';
  }

  /* ---------- markup: results ---------- */
  function skeleton() {
    return '<div class="result-list">' + Array.from({ length: 4 }).map(function () {
      return '<div class="card result-card"><div class="skeleton sk-line" style="width:38%"></div>' +
        '<div class="skeleton sk-line" style="width:66%;height:24px;margin-top:.6rem"></div>' +
        '<div class="skeleton sk-line" style="width:52%;margin-top:.9rem"></div></div>';
    }).join('') + '</div>';
  }

  function summaryMarkup(rows) {
    if (!rows.length) return '';
    const cheapest = rows[0], dearest = rows[rows.length - 1];
    const saving = dearest.total - cheapest.total;
    return '' +
    '<div class="quote-summary card">' +
      '<div class="qs-main">' +
        '<span class="qs-label">Premi terendah</span>' +
        '<span class="qs-price">' + rupiah(cheapest.total) + '</span>' +
        '<span class="qs-sub">' + RP.esc(cheapest.provider.name) + ' · ' + RP.esc(D.COVERAGE.find(c => c.code === (cheapest.coverageCode)) ? (cheapest.coverage === 'ALL_RISK' ? 'All Risk' : 'TLO') : '') + ' · 12 bulan</span>' +
      '</div>' +
      '<div class="qs-facts">' +
        '<div class="qs-fact"><span>' + rows.length + ' penawaran</span><small>Dari ' + D.PROVIDERS.length + ' mitra</small></div>' +
        '<div class="qs-fact"><span>' + D.shortenRupiah(saving) + '</span><small>Selisih total terendah vs tertinggi</small></div>' +
        '<div class="qs-fact"><span>' + state.year + ' · ' + RP.esc((D.PLATE_REGIONS.find(p => p.code === state.plate) || {}).label || '') + '</span><small>' + rupiah(state.sumInsured) + '</small></div>' +
      '</div>' +
      '<div class="qs-actions">' +
        '<button class="btn btn-secondary btn-sm" type="button" data-quote-again>' + ICON.refresh + ' Ubah data</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-ai-open data-ai-seed="Jelaskan hasil perbandingan saya">' + ICON.spark + ' Jelaskan dengan AI</button>' +
      '</div>' +
    '</div>';
  }

  function resultCard(r, idx) {
    const best = idx === 0;
    return '' +
    '<article class="card result-card' + (best ? ' is-best' : '') + '" data-provider="' + r.provider.code + '">' +
      (best ? '<span class="result-ribbon">' + ICON.star + ' Total terendah</span>' : '') +
      '<div class="result-head">' +
        '<div class="result-provider">' +
          '<span class="provider-logo" style="background:' + r.provider.tint + '">' + RP.esc(r.provider.abbr) + '</span>' +
          '<div>' +
            '<strong>' + RP.esc(r.provider.name) + '</strong>' +
            '<span class="result-meta">' +
              '<span class="stars" aria-label="' + r.rating + ' dari 5">' + ICON.star.repeat(1) + '</span>' + r.rating.toFixed(1) +
              ' · Klaim ' + RP.esc(r.claims) + ' · ' + (r.coverage === 'ALL_RISK' ? 'All Risk' : 'TLO') +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="result-price">' +
          '<span class="rp-total">' + rupiah(r.total) + '</span>' +
          '<span class="rp-break">Premi ' + rupiah(r.premium, false) + ' + biaya ' + rupiah(r.handlingFee + r.stampDuty, false) + '</span>' +
          (r.savings > 0 ? '<span class="badge badge-success">Selisih ' + D.shortenRupiah(r.savings) + ' (' + r.savingsPct + '%)</span>' : '') +
        '</div>' +
      '</div>' +
      '<ul class="result-points">' +
        r.highlights.slice(0, 3).map(function (h) { return '<li>' + ICON.check + ' ' + RP.esc(h) + '</li>'; }).join('') +
      '</ul>' +
      '<div class="result-foot">' +
        '<label class="checkline"><input type="checkbox" data-compare-pick="' + r.provider.code + '"' + (state.selected.indexOf(r.provider.code) > -1 ? ' checked' : '') + '> Bandingkan</label>' +
        '<div class="result-actions">' +
          '<button class="btn btn-ghost btn-sm" type="button" data-explain="' + r.provider.code + '">' + ICON.spark + ' Kenapa harga ini?</button>' +
          '<button class="btn btn-secondary btn-sm" type="button" data-ai-open data-ai-seed="Saya mau tanya soal polis ' + stringSeed(r) + '">' + ICON.chat + ' Tanya</button>' +
          '<button class="btn btn-primary btn-sm" type="button" data-buy="' + r.provider.code + '">Beli polis' + ICON.arrow + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="explain" data-explain-panel="' + r.provider.code + '" hidden></div>' +
    '</article>';
  }
  function stringSeed(r) {
    return (r.coverage === 'ALL_RISK' ? 'All Risk' : 'TLO') + ' dari ' + r.provider.name + ' dengan premi ' + D.rupiah(r.total, false);
  }

  function explainText(r) {
    const base = state.sumInsured;
    const pct = ((r.premium / base) * 100).toFixed(2).replace('.', ',');
    return '' +
      '<div class="explain-box">' +
        '<p style="margin:0 0 .5rem"><strong>Bagaimana angka ini dihitung</strong></p>' +
        '<ul class="explain-list">' +
          '<li>Harga kendaraan <strong>' + rupiah(base) + '</strong> menjadi dasar perhitungan.</li>' +
          '<li>Tarif dasar ' + (state.product === 'mobil' ? '2,15%' : '1,82%') + ' per tahun' + (r.coverage === 'ALL_RISK' ? ' × faktor All Risk 1,42' : '') + '.</li>' +
          '<li>Usia kendaraan ' + (2026 - state.year) + ' tahun dan wilayah plat menambah penyesuaian risiko.</li>' +
          '<li>Total premi <strong>' + rupiah(r.premium) + '</strong> (' + pct + '% dari harga kendaraan), ditambah biaya polis ' + rupiah(r.handlingFee + r.stampDuty) + '.</li>' +
        '</ul>' +
        '<p class="muted" style="font-size:var(--fs-sm);margin:.5rem 0 0">' + RP.esc(r.provider.name) + ' menetapkan faktornya sendiri — perbedaan premi antar mitra adalah hal normal, bukan biaya tambahan dari kami. Anda tidak dibebankan komisi tersembunyi: yang Anda bayar sama dengan yang tercatat di polis.</p>' +
        '<button class="btn btn-soft btn-sm" type="button" data-ai-open data-ai-seed="Jelaskan detail premi ' + RP.esc(stringSeed(r)) + '">' + ICON.spark + ' Tanya RajaAI lebih lanjut</button>' +
      '</div>';
  }

  function resultsMarkup() {
    const rows = sortAndFilter(state.results);
    const opts = D.PROVIDERS.map(function (p) {
      return '<option value="' + p.code + '"' + (state.providerFilter === p.code ? ' selected' : '') + '>' + RP.esc(p.name) + '</option>';
    }).join('');
    if (!rows.length) {
      return '<div class="empty-state card">' + ICON.search +
        '<h4>Tidak ada penawaran yang cocok</h4>' +
        '<p>Longgarkan filter mitra atau ubah jenis perlindungan untuk melihat lebih banyak penawaran.</p>' +
        '<button class="btn btn-soft btn-sm" type="button" data-reset-filter>Reset filter</button></div>';
    }
    return summaryMarkup(rows) +
      '<div class="list-toolbar">' +
        '<span class="muted" style="font-size:var(--fs-sm)">' + rows.length + ' penawaran, diperbarui barusan</span>' +
        '<div class="list-toolbar-right">' +
          '<label class="inline-label"><span class="sr-only">Mitra</span>' +
            '<select class="select select-sm" data-filter-provider><option value="all"' + (state.providerFilter === 'all' ? ' selected' : '') + '>Semua mitra</option>' + opts + '</select>' +
          '</label>' +
          '<label class="inline-label"><span class="sr-only">Urutkan</span>' +
            '<select class="select select-sm" data-sort>' +
              '<option value="price-asc"' + (state.sort === 'price-asc' ? ' selected' : '') + '>Premi terendah</option>' +
              '<option value="price-desc"' + (state.sort === 'price-desc' ? ' selected' : '') + '>Premi tertinggi</option>' +
              '<option value="rating"' + (state.sort === 'rating' ? ' selected' : '') + '>Rating tertinggi</option>' +
              '<option value="claims"' + (state.sort === 'claims' ? ' selected' : '') + '>Perkiraan klaim tercepat</option>' +
            '</select>' +
          '</label>' +
        '</div>' +
      '</div>' +
      '<div class="result-list">' + rows.map(resultCard).join('') + '</div>' +
      '<p class="muted" style="font-size:var(--fs-sm);margin-top:var(--s-4)">Premi di atas adalah estimasi indikatif dari mesin perbandingan. Nilai final mengikuti hasil underwriting mitra dan dapat berbeda bila ada riwayat klaim.</p>';
  }

  /* ---------- buy flow ---------- */
  function buyModal(r) {
    return '' +
    '<div class="modal" id="buyModal">' +
      '<div class="modal-panel">' +
        '<div class="modal-head">' +
          '<div><h3 style="margin:0">Ringkasan pembelian</h3>' +
          '<p class="muted" style="margin:.2rem 0 0;font-size:var(--fs-sm)">Langkah 1 dari 3 · Periksa data polis</p></div>' +
          '<button class="btn btn-ghost btn-icon" type="button" data-modal-close aria-label="Tutup">' + ICON.x + '</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="confirm-grid">' +
            '<div class="kv"><span>Mitra</span><strong>' + RP.esc(r.provider.name) + '</strong></div>' +
            '<div class="kv"><span>Produk</span><strong>' + (state.product === 'motor' ? 'Asuransi Motor' : 'Asuransi Mobil') + '</strong></div>' +
            '<div class="kv"><span>Perlindungan</span><strong>' + (r.coverage === 'ALL_RISK' ? 'All Risk' : 'TLO') + '</strong></div>' +
            '<div class="kv"><span>Nilai pertanggungan</span><strong>' + rupiah(state.sumInsured) + '</strong></div>' +
            '<div class="kv"><span>Periode</span><strong>12 bulan</strong></div>' +
            '<div class="kv"><span>Klaim</span><strong>' + RP.esc(r.claims) + '</strong></div>' +
          '</div>' +
          '<table class="table" style="margin-top:var(--s-4)">' +
            '<tbody>' +
              '<tr><td>Premi dasar</td><td class="num">' + rupiah(r.premium) + '</td></tr>' +
              '<tr><td>Biaya polis &amp; materai</td><td class="num">' + rupiah(r.handlingFee + r.stampDuty) + '</td></tr>' +
              '<tr class="row-total"><td>Total dibayar</td><td class="num">' + rupiah(r.total) + '</td></tr>' +
            '</tbody>' +
          '</table>' +
          '<div class="alert alert-info" style="margin-top:var(--s-4)">' + ICON.lock +
            '<div><strong>Total di atas sudah lengkap.</strong> Angkanya mencakup premi mitra ditambah biaya polis dan materai, dan inilah jumlah yang tercatat pada polis.</div></div>' +
          '<label class="checkline" style="margin-top:var(--s-4)"><input type="checkbox" checked> Saya setuju pada syarat &amp; ketentuan serta kebijakan privasi.</label>' +
        '</div>' +
        '<div class="modal-foot">' +
          '<button class="btn btn-secondary" type="button" data-modal-close>Batal</button>' +
          '<button class="btn btn-primary" type="button" data-buy-confirm>Lanjut ke pembayaran' + ICON.arrow + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------- compare tray ---------- */
  function trayMarkup() {
    if (state.selected.length < 2) return '';
    return '<div class="compare-tray">' +
      '<div class="tray-items">' +
        state.selected.map(function (code) {
          const p = D.PROVIDERS.find(x => x.code === code);
          return '<span class="tray-chip"><span class="provider-logo provider-logo-sm" style="background:' + p.tint + '">' + RP.esc(p.abbr) + '</span>' + RP.esc(p.abbr) +
            '<button type="button" data-tray-remove="' + code + '" aria-label="Hapus">' + ICON.x + '</button></span>';
        }).join('') +
      '</div>' +
      '<div class="tray-actions">' +
        '<button class="btn btn-ghost btn-sm" type="button" data-tray-clear>Bersihkan</button>' +
        '<button class="btn btn-primary btn-sm" type="button" data-tray-compare>' + ICON.scale + ' Bandingkan ' + state.selected.length + ' polis</button>' +
      '</div>' +
    '</div>';
  }

  function compareModal() {
    const rows = state.selected.map(function (code) {
      return state.results.find(r => r.provider.code === code);
    }).filter(Boolean);
    if (!rows.length) return '';
    const cheapest = Math.min.apply(null, rows.map(r => r.total));
    const featureRows = [
      ['Total dibayar', r => '<strong>' + rupiah(r.total) + '</strong>' + (r.total === cheapest ? ' <span class="badge badge-success">total terendah</span>' : '')],
      ['Premi dasar', r => rupiah(r.premium)],
      ['Biaya polis &amp; materai', r => rupiah(r.handlingFee + r.stampDuty)],
      ['Perlindungan', r => r.coverage === 'ALL_RISK' ? 'All Risk' : 'TLO'],
      ['Nilai pertanggungan', () => rupiah(state.sumInsured)],
      ['Rating mitra', r => r.rating.toFixed(1) + ' / 5'],
      ['Estimasi klaim', r => r.claims],
      ['Periode', r => r.tenor + ' bulan'],
      ['Pembayaran', r => r.payBy],
      ['Perluasan banjir', r => r.coverage === 'ALL_RISK' ? 'Termasuk' : 'Opsional'],
      ['Kerusakan ringan', r => r.coverage === 'ALL_RISK' ? 'Ditanggung' : 'Tidak ditanggung'],
      ['Jam layanan', () => D.CONFIG.hours]
    ];
    return '' +
    '<div class="modal" id="compareModal">' +
      '<div class="modal-panel modal-wide">' +
        '<div class="modal-head">' +
          '<div><h3 style="margin:0">Perbandingan ' + rows.length + ' polis</h3>' +
          '<p class="muted" style="margin:.2rem 0 0;font-size:var(--fs-sm)">Baris dengan total terendah ditandai otomatis — tidak perlu menghitung manual.</p></div>' +
          '<button class="btn btn-ghost btn-icon" type="button" data-modal-close aria-label="Tutup">' + ICON.x + '</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="table-scroll"><table class="table table-compare">' +
            '<thead><tr><th>Kriteria</th>' + rows.map(r => '<th>' + RP.esc(r.provider.name) + '</th>').join('') + '</tr></thead>' +
            '<tbody>' + featureRows.map(function (fr) {
              return '<tr><td class="row-label">' + fr[0] + '</td>' + rows.map(r => '<td>' + fr[1](r) + '</td>').join('') + '</tr>';
            }).join('') +
            '<tr><td class="row-label"></td>' + rows.map(r => '<td><button class="btn btn-primary btn-sm btn-block" type="button" data-buy="' + r.provider.code + '">Beli</button></td>').join('') + '</tr>' +
            '</tbody>' +
          '</table></div>' +
          '<div class="alert alert-info" style="margin-top:var(--s-4)">' + ICON.spark +
            '<div><strong>RajaAI:</strong> untuk kebutuhan Anda, ' + RP.esc(rows.slice().sort((a, b) => a.total - b.total)[0].provider.name) +
            ' memiliki total terendah pada perbandingan ini. Bila Anda sering memarkir di jalan raya umum, All Risk lebih sering terpakai daripada selisih preminya.</div></div>' +
        '</div>' +
        '<div class="modal-foot"><button class="btn btn-secondary" type="button" data-modal-close>Tutup</button></div>' +
      '</div>' +
    '</div>';
  }

  /* ---------- mount ---------- */
  function mount(opts) {
    opts = opts || {};
    const formHost = document.getElementById(opts.formId || 'quoteForm');
    const resultHost = document.getElementById(opts.resultId || 'quoteResults');
    const inlineResults = !!opts.inlineResults;
    if (!formHost && !resultHost) return;
    readUrl();

    let submitted = false;
    if (opts.autorun) submitted = true;
    /* A deep link that already carries quote parameters should render its
       result immediately — that is the whole point of a shareable URL. */
    const deepLinked = /[?&](harga|coverage)=/.test(location.search);
    if (!submitted && opts.autorunOnParams !== false && deepLinked) submitted = true;

    function rerender(focusResults) {
      if (formHost) formHost.innerHTML = formMarkup(opts.compact);
      if (resultHost) {
        if (!submitted) {
          resultHost.hidden = true;
        } else {
          resultHost.hidden = false;
          resultHost.innerHTML = state.loading ? skeleton() : resultsMarkup();
        }
      }
      const tray = document.getElementById('compareTray');
      if (tray) tray.innerHTML = trayMarkup();
      document.querySelectorAll('#buyModal, #compareModal').forEach(m => m.remove());
      const holder = document.getElementById('modalHolder');
      if (holder) holder.insertAdjacentHTML('beforeend', ''); // no-op, modals appended on demand
      if (focusResults && resultHost) resultHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function run(focusResults) {
      state.loading = true;
      writeUrl();
      rerender(false);
      const delay = opts.delay == null ? 700 : opts.delay;
      setTimeout(function () {
        state.results = compute();
        state.loading = false;
        state.ran = true;
        state.selected = state.selected.filter(c => state.results.some(r => r.provider.code === c));
        rerender(focusResults);
        if (opts.onResults) opts.onResults(state.results, state);
      }, delay);
    }
    global.RPQuote.run = run;

    function bind(host) {
      if (!host) return;
      host.addEventListener('click', function (e) {
        const seg = e.target.closest('[data-field="product"] button');
        if (seg) { state.product = seg.getAttribute('data-value'); state.sumInsured = PRESETS[state.product][1].value; rerender(false); return; }

        const cov = e.target.closest('[data-field="coverage"] .radio-card');
        if (cov) { state.coverage = parseInt(cov.getAttribute('data-value'), 10); rerender(false); return; }

        const preset = e.target.closest('[data-preset]');
        if (preset) { state.sumInsured = parseInt(preset.getAttribute('data-preset'), 10); rerender(false); return; }

        if (e.target.closest('[data-quote-again]')) {
          formHost.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (e.target.closest('[data-reset-filter]')) { state.providerFilter = 'all'; rerender(false); return; }
        if (e.target.closest('[data-tray-clear]')) { state.selected = []; rerender(false); return; }

        const rm = e.target.closest('[data-tray-remove]');
        if (rm) { const c = rm.getAttribute('data-tray-remove'); state.selected = state.selected.filter(x => x !== c); rerender(false); return; }

        const pick = e.target.closest('[data-compare-pick]');
        if (pick) {
          const code = pick.getAttribute('data-compare-pick');
          if (pick.checked) {
            if (state.selected.length >= 3) { pick.checked = false; RP.toast('Maksimal 3 polis untuk dibandingkan sekaligus.', 'warn'); return; }
            state.selected.push(code);
          } else {
            state.selected = state.selected.filter(c => c !== code);
          }
          const tray = document.getElementById('compareTray');
          if (tray) tray.innerHTML = trayMarkup();
          return;
        }

        const ex = e.target.closest('[data-explain]');
        if (ex) {
          const code = ex.getAttribute('data-explain');
          const panel = document.querySelector('[data-explain-panel="' + code + '"]');
          if (panel) {
            const r = state.results.find(x => x.provider.code === code);
            if (!panel.dataset.filled) { panel.innerHTML = explainText(r); panel.dataset.filled = '1'; }
            panel.hidden = !panel.hidden;
            ex.setAttribute('aria-expanded', String(!panel.hidden));
          }
          return;
        }

        const buy = e.target.closest('[data-buy]');
        if (buy) {
          const r = state.results.find(x => x.provider.code === buy.getAttribute('data-buy'));
          if (!r) return;
          document.body.insertAdjacentHTML('beforeend', buyModal(r));
          RP.openModal('buyModal');
          return;
        }
        if (e.target.closest('[data-buy-confirm]')) {
          RP.toast('Demo: pembayaran tidak diproses. Pada sistem nyata Anda diarahkan ke halaman pembayaran mitra.', 'info', 5200);
          return;
        }
        if (e.target.closest('[data-tray-compare]')) {
          document.body.insertAdjacentHTML('beforeend', compareModal());
          RP.openModal('compareModal');
          return;
        }
      });

      host.addEventListener('input', RP.debounce(function (e) {
        const inp = e.target.closest('[data-field="sumInsured"]');
        if (inp) {
          const digits = inp.value.replace(/[^\d]/g, '');
          state.sumInsured = Math.max(0, parseInt(digits || '0', 10));
          inp.value = state.sumInsured ? rupiah(state.sumInsured, false) : '';
        }
      }, 120));

      host.addEventListener('change', function (e) {
        const f = e.target.closest('[data-field="plate"]');
        if (f) { state.plate = parseInt(f.value, 10); rerender(false); return; }
        const y = e.target.closest('[data-field="year"]');
        if (y) { state.year = parseInt(y.value, 10); rerender(false); return; }
        const s = e.target.closest('[data-sort]');
        if (s) { state.sort = s.value; rerender(false); return; }
        const pf = e.target.closest('[data-filter-provider]');
        if (pf) { state.providerFilter = pf.value; rerender(false); return; }
      });

      host.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!state.sumInsured) { RP.toast('Isi harga kendaraan terlebih dahulu.', 'warn'); return; }
        submitted = true;
        run(true);
      });
    }

    bind(formHost);
    bind(resultHost);
    rerender(false);
    if (submitted) run(false);
  }

  global.RPQuote = {
    mount: mount, state: state, compute: compute, run: null,
    /* exposed for tests and for embedding the builders in other pages */
    build: {
      form: formMarkup, results: resultsMarkup, summary: summaryMarkup,
      card: resultCard, explain: explainText, buy: buyModal, compare: compareModal,
      tray: trayMarkup
    }
  };
})(window);
