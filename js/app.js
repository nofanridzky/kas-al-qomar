// Kas Al Qomar — tampilan untuk jamaah. Tanpa framework, tanpa build.
(function () {
  const K = window.KasData;
  const app = document.getElementById("app");
  let D = null;            // data aktif
  let galatMuat = null;    // pesan bila gagal memuat
  const ui = { cari: "", jenis: "", dana: "", batasHari: 30 };

  // ---------- helpers ----------
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const urlAman = u => (/^https?:\/\//i.test((u || "").trim()) ? u.trim() : "");
  const ic = (n, cls = "") => {
    const p = window.KAS_IKON[n] || window.KAS_IKON.struk;
    return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${p}"/></svg>`;
  };
  const ribu = n => Math.abs(Math.round(n)).toLocaleString("id-ID");
  const rp = n => (n < 0 ? "– " : "") + "Rp " + ribu(n);
  const rpTanda = (n, jenis) => (jenis === "Keluar" ? "– " : "+ ") + "Rp " + ribu(n);
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const BL3 = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dOf = s => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const iso = dt => dt.toISOString().slice(0, 10);
  const tglPendek = s => { const d = dOf(s); return `${d.getUTCDate()} ${BL3[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  const tglTanpaTahun = s => { const d = dOf(s); return `${d.getUTCDate()} ${BL3[d.getUTCMonth()]}`; };
  const tglPanjang = s => { const d = dOf(s); return `${HARI[d.getUTCDay()]}, ${tglPendek(s)}`; };
  const bulanNama = ym => { const [y, m] = ym.split("-").map(Number); return `${BLN[m - 1]} ${y}`; };
  const awalBulan = ym => ym + "-01";
  const akhirBulan = ym => { const [y, m] = ym.split("-").map(Number); return iso(new Date(Date.UTC(y, m, 0))); };
  const geserBulan = (ym, n) => { const [y, m] = ym.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return iso(d).slice(0, 7); };
  const kemarin = s => iso(new Date(dOf(s).getTime() - 864e5));
  const rentang = (a, b) => {
    const da = dOf(a), db = dOf(b);
    if (a === b) return tglPendek(a);
    if (da.getUTCMonth() === db.getUTCMonth() && da.getUTCFullYear() === db.getUTCFullYear()) return `${da.getUTCDate()}–${tglPendek(b)}`;
    return `${tglTanpaTahun(a)} – ${tglPendek(b)}`;
  };
  const persen = p => Math.round(p * 100) + "%";
  const zona = () => (D && D.profil.zona_waktu) || "WITA";
  function hariIni() {
    if (D && D.sumber.jenis === "contoh" && D.transaksi.length) return D.transaksi[D.transaksi.length - 1].tanggal;
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }
  const ikonKategori = tx => {
    const k = D.kategori[tx.kategori];
    return (k && k.ikon && window.KAS_IKON[k.ikon]) ? k.ikon : (tx.jenis === "Masuk" ? "panah-masuk" : "panah-keluar");
  };
  function driveGambar(u) {
    u = urlAman(u); if (!u) return null;
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
    if (m) return { img: `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`, link: u };
    if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(u) || /googleusercontent\.com/.test(u)) return { img: u, link: u };
    return { img: null, link: u };
  }
  const waLink = (nomor, teks) => {
    const n = String(nomor || "").replace(/[^\d]/g, "").replace(/^0/, "62");
    return n.length >= 9 ? `https://wa.me/${n}${teks ? "?text=" + encodeURIComponent(teks) : ""}` : "";
  };
  const placeholder = s => /^\s*\[.*\]\s*$/.test(s || "");

  // ---------- shared pieces ----------
  function logo(size = 40) {
    const g = driveGambar(D.profil.logo);
    if (g && g.img) return `<img class="logo" style="width:${size}px;height:${size}px" src="${esc(g.img)}" alt="Logo ${esc(D.profil.nama)}">`;
    return `<span class="logo logo-ph" style="width:${size}px;height:${size}px" title="Logo sementara — ganti dengan file resmi">${ic("masjid")}</span>`;
  }
  function tabBar(aktif) {
    const t = [["beranda", "Beranda", "#/"], ["laporan", "Laporan", "#/laporan"], ["riwayat", "Riwayat", "#/riwayat"], ["program", "Program", "#/program"], ["info", "Info", "#/info"]];
    return `<nav class="tabbar" aria-label="Menu utama">${t.map(([k, l, h]) =>
      `<a href="${h}" class="tab ${aktif === k ? "on" : ""}" ${aktif === k ? 'aria-current="page"' : ""}><span class="tab-ic">${ic(k)}</span><span>${l}</span></a>`).join("")}</nav>`;
  }
  function banner() {
    if (galatMuat) return `<div class="banner warn">Data belum bisa dimuat: ${esc(galatMuat)}</div>`;
    const s = D.sumber;
    if (s.jenis === "contoh") return `<div class="banner">Data contoh — belum tersambung ke Google Sheets.</div>`;
    if (s.jenis === "cache") return `<div class="banner warn">Sedang offline. Menampilkan data terakhir (${esc(new Date(s.waktu).toLocaleString("id-ID"))}).</div>`;
    return "";
  }
  function headerTab(judul) { return `<header class="hdr-tab"><h1>${esc(judul)}</h1></header>`; }
  function headerBack(judul, ke) {
    return `<header class="hdr-back"><a class="btn-ic" href="${ke}" data-kembali aria-label="Kembali">${ic("kembali")}</a><h1>${esc(judul)}</h1></header>`;
  }
  function barisTx(tx, opsi = {}) {
    const keluar = tx.jenis === "Keluar";
    const sub = opsi.tanpaTanggal ? [tx.uraian, tx.dana].filter(Boolean).join(" · ") : `${tglTanpaTahun(tx.tanggal)} · ${tx.dana}`;
    return `<a class="tx" href="#/t/${esc(tx.id)}">
      <span class="tx-ic ${keluar ? "out" : "in"}">${ic(ikonKategori(tx))}</span>
      <span class="tx-main"><span class="tx-judul">${esc(tx.kategori)}</span><span class="tx-sub">${esc(sub)}</span></span>
      <span class="tx-kanan"><span class="tx-nom ${keluar ? "out" : "in"}">${rpTanda(tx.nominal, tx.jenis)}</span>
      ${tx.bukti ? `<span class="tx-bukti">${ic("struk")}Ada bukti</span>` : ""}</span></a>`;
  }
  function barKategori(rows, jenis) {
    if (!rows.length) return `<p class="kosong">Belum ada ${jenis === "Masuk" ? "pemasukan" : "pengeluaran"}.</p>`;
    return rows.map(r => `<div class="bk"><div class="bk-atas"><span class="bk-nama">${esc(r.nama)}</span><span class="bk-nilai">${rp(r.nilai)} · ${persen(r.persen)}</span></div>
      <div class="bar"><span class="${jenis === "Masuk" ? "in" : "out"}" style="width:${Math.max(2, r.persen * 100).toFixed(1)}%"></span></div></div>`).join("");
  }
  const ornamen = `<svg class="ornamen" viewBox="0 0 120 120" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-width="1.5">
    <path opacity=".5" d="M60 6 L73 31 L98 22 L89 47 L114 60 L89 73 L98 98 L73 89 L60 114 L47 89 L22 98 L31 73 L6 60 L31 47 L22 22 L47 31 Z"/>
    <path opacity=".35" transform="translate(30 30) scale(.5)" d="M60 6 L73 31 L98 22 L89 47 L114 60 L89 73 L98 98 L73 89 L60 114 L47 89 L22 98 L31 73 L6 60 L31 47 L22 22 L47 31 Z"/></g></svg>`;

  // ---------- Agenda (pengumuman & kegiatan) ----------
  function pengumumanAktif() {
    const h = hariIni();
    return (D.agenda || []).filter(a => a.jenis === "Pengumuman" && (!a.mulai || a.mulai <= h) && (!a.selesai || a.selesai >= h));
  }
  function kegiatanMendatang(n) {
    const h = hariIni();
    return (D.agenda || []).filter(a => a.jenis === "Kegiatan" && a.mulai && (a.selesai || a.mulai) >= h).slice(0, n || 99);
  }
  function waktuAgenda(a) {
    const tgl = !a.mulai ? "" : a.selesai && a.selesai !== a.mulai ? rentang(a.mulai, a.selesai) : tglPanjang(a.mulai);
    return [tgl, a.jam, a.tempat].filter(Boolean).join(" · ");
  }
  function kartuPengumuman(a) {
    return `<div class="umum"><span class="umum-ic">${ic("info")}</span><div><b>${esc(a.judul)}</b>${a.isi ? `<p>${esc(a.isi)}</p>` : ""}
      ${a.selesai ? `<span class="sub">Berlaku sampai ${tglPendek(a.selesai)}</span>` : ""}</div></div>`;
  }
  function barisKegiatan(a) {
    const d = dOf(a.mulai);
    return `<div class="agenda"><span class="agenda-tgl"><b>${d.getUTCDate()}</b><span>${BL3[d.getUTCMonth()]}</span></span>
      <div><b>${esc(a.judul)}</b><span>${esc(waktuAgenda(a))}</span>${a.isi ? `<span>${esc(a.isi)}</span>` : ""}</div></div>`;
  }

  // pekan berjalan: Minggu sampai hari ini (sama dengan layar TV)
  function pekanIni() {
    const h = hariIni(), d = dOf(h);
    const minggu = iso(new Date(d.getTime() - d.getUTCDay() * 864e5));
    return { dari: minggu, sampai: h, ...K.arus(D, minggu, h) };
  }
  function teksRingkasanPekan() {
    const p = D.profil, w = pekanIni();
    const dana = D.dana.map(f => `• ${f.nama}: ${rp(K.saldoDana(D, f.nama))}`).join("\n");
    const umum = pengumumanAktif().slice(0, 3).map(a => `• ${a.judul}`).join("\n");
    const agenda = kegiatanMendatang(3).map(a => `• ${a.judul} (${waktuAgenda(a)})`).join("\n");
    return `*Laporan Kas ${p.nama || ""}*\nPekan ${rentang(w.dari, w.sampai)}\n\n` +
      `Pemasukan: + ${rp(w.masuk)}\nPengeluaran: – ${rp(w.keluar)}\n\n` +
      `Saldo per ${tglPendek(w.sampai)}:\n${dana}\n*Total: ${rp(K.saldoTotal(D))}*` +
      (umum ? `\n\n*Pengumuman*\n${umum}` : "") + (agenda ? `\n\n*Agenda*\n${agenda}` : "") +
      `\n\nRincian lengkap: ${location.href.split("#")[0]}` + (D.sumber.jenis === "contoh" ? "\n\n(DATA CONTOH)" : "");
  }

  // ---------- Beranda ----------
  function vBeranda() {
    const p = D.profil, hari = hariIni(), ym = hari.slice(0, 7);
    const total = K.saldoTotal(D);
    const last = D.transaksi[D.transaksi.length - 1];
    const a = K.arus(D, awalBulan(ym), hari);
    const top = K.perKategori(D, awalBulan(ym), hari, "Keluar").slice(0, 3);
    const terbaru = D.transaksi.slice(-5).reverse();
    const rg = rentang(awalBulan(ym), hari);
    return `${banner()}
      <header class="hdr-home">${logo(40)}<div class="hdr-nama"><b>${esc(p.nama_pendek || p.nama)}</b><span>${esc(p.kota || "")}</span></div>
        <a class="btn-ic" href="#/info" aria-label="Info musholla">${ic("info")}</a></header>
      <p class="salam">Assalamu'alaikum. Berikut laporan kas ${esc(p.nama_pendek || p.nama)} hari ini.</p>
      ${pengumumanAktif().slice(0, 3).map(kartuPengumuman).join("")}
      <a class="kartu-saldo" href="#/laporan">${ornamen}
        <span class="overline">Saldo seluruh dana</span>
        <span class="saldo">${rp(total)}</span>
        <span class="diperbarui">${last ? `Diperbarui ${tglPendek(last.tanggal)}${last.jam ? ", " + last.jam + " " + esc(zona()) : ""}` : "Belum ada transaksi"}</span></a>
      <div class="card list">${D.dana.map(f => `<div class="row"><span>${esc(f.nama)}</span><b class="num">${rp(K.saldoDana(D, f.nama))}</b></div>`).join("")}</div>

      <section><h2>${bulanNama(ym)}</h2><p class="sub">Arus kas ${rg}</p>
        <div class="tiles">
          <a class="tile" href="#/riwayat?jenis=Masuk"><span class="tile-ic in">${ic("panah-masuk")}</span><span class="overline">Pemasukan</span><b class="num in">+ ${rp(a.masuk)}</b><span class="sub">${rg}</span></a>
          <a class="tile" href="#/riwayat?jenis=Keluar"><span class="tile-ic out">${ic("panah-keluar")}</span><span class="overline">Pengeluaran</span><b class="num out">– ${rp(a.keluar)}</b><span class="sub">${rg}</span></a>
        </div></section>

      <section><h2>Dipakai untuk apa?</h2><p class="sub">Pengeluaran terbesar bulan ini</p>
        <div class="card pad">${barKategori(top, "Keluar")}<a class="link-c" href="#/laporan/${ym}">Lihat laporan lengkap</a></div></section>

      <section><h2>Transaksi terbaru</h2>
        <div class="card txlist">${terbaru.map(t => barisTx(t)).join("") || '<p class="kosong">Belum ada transaksi.</p>'}</div>
        <a class="btn sec" href="#/riwayat">Lihat semua transaksi</a></section>
      ${kegiatanMendatang(2).length ? `<section><h2>Agenda terdekat</h2><div class="card list">${kegiatanMendatang(2).map(barisKegiatan).join("")}</div>
        <a class="link-c" href="#/info">Lihat semua agenda</a></section>` : ""}
      ${tabBar("beranda")}`;
  }

  // ---------- Laporan ----------
  function bulanTersedia() {
    const s = new Set(D.transaksi.map(t => t.tanggal.slice(0, 7)));
    s.add(hariIni().slice(0, 7));
    return [...s].sort();
  }
  function grafik(ym) {
    const bln = []; for (let i = 5; i >= 0; i--) bln.push(geserBulan(ym, -i));
    const data = bln.map(b => ({ b, ...K.arus(D, awalBulan(b), akhirBulan(b)) }));
    const max = Math.max(1, ...data.map(x => Math.max(x.masuk, x.keluar)));
    const juta = max / 1e6; const step = juta <= 4 ? 1 : juta <= 10 ? 2 : juta <= 20 ? 5 : juta <= 50 ? 10 : Math.ceil(juta / 5 / 10) * 10;
    const top = Math.ceil(juta / step) * step || step;
    const W = 320, H = 190, L = 34, B = 22, T = 8, ch = H - B - T, cw = (W - L) / 6;
    let g = "";
    for (let v = 0; v <= top; v += step) {
      const y = T + ch - (v / top) * ch;
      g += `<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" class="gl"/><text x="0" y="${y + 4}" class="ax">${v ? v + " jt" : "0"}</text>`;
    }
    data.forEach((x, i) => {
      const cx = L + cw * i + cw / 2, hm = x.masuk / 1e6 / top * ch, hk = x.keluar / 1e6 / top * ch;
      g += `<rect x="${cx - 13}" y="${T + ch - hm}" width="12" height="${hm}" rx="2" class="in"><title>Masuk ${rp(x.masuk)}</title></rect>`;
      g += `<rect x="${cx + 1}" y="${T + ch - hk}" width="12" height="${hk}" rx="2" class="out"><title>Keluar ${rp(x.keluar)}</title></rect>`;
      g += `<text x="${cx}" y="${H - 4}" class="ax" text-anchor="middle">${BL3[+x.b.slice(5) - 1]}</text>`;
    });
    return `<div class="legend"><span><i class="in"></i>Pemasukan</span><span><i class="out"></i>Pengeluaran</span></div>
      <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik pemasukan dan pengeluaran 6 bulan">${g}</svg>`;
  }
  function vLaporan(ym) {
    const ada = bulanTersedia(), hari = hariIni();
    if (!ym) ym = ada.includes(geserBulan(hari.slice(0, 7), -1)) ? geserBulan(hari.slice(0, 7), -1) : hari.slice(0, 7);
    const i = ada.indexOf(ym);
    const berjalan = ym === hari.slice(0, 7);
    const akhir = berjalan ? hari : akhirBulan(ym);
    const awal = K.saldoTotal(D, kemarin(awalBulan(ym)));
    const a = K.arus(D, awalBulan(ym), akhir);
    const nm = BLN[+ym.slice(5) - 1];
    const pr = D.profil;
    const prev = i > 0 ? ada[i - 1] : null, next = i >= 0 && i < ada.length - 1 ? ada[i + 1] : null;
    const teksWA = `Laporan kas ${pr.nama || ""} — ${bulanNama(ym)}\nSaldo awal: ${rp(awal)}\nPemasukan: + ${rp(a.masuk)}\nPengeluaran: – ${rp(a.keluar)}\nSaldo ${berjalan ? "per " + tglPendek(akhir) : "akhir"}: ${rp(awal + a.masuk - a.keluar)}\n\n${location.href.split("#")[0]}#/laporan/${ym}`;
    const w = pekanIni();
    return `${banner()}${headerTab("Laporan keuangan")}
      <section class="pekan card pad"><div><h2>Pekan ini</h2><p class="sub">${rentang(w.dari, w.sampai)} · untuk diumumkan setiap Jum'at</p></div>
        <div class="dua-kol"><div><span class="overline">Pemasukan</span><b class="num in">+ ${rp(w.masuk)}</b></div><div><span class="overline">Pengeluaran</span><b class="num out">– ${rp(w.keluar)}</b></div></div>
        <a class="btn pri" href="https://wa.me/?text=${encodeURIComponent(teksRingkasanPekan())}" target="_blank" rel="noopener">${ic("bagikan")}Kirim ringkasan ke WhatsApp</a>
        <button class="btn sec" id="salinPekan">${ic("salin")}Salin teks ringkasan</button></section>
      <div class="pemilih card">
        <a class="btn-ic ${prev ? "" : "off"}" ${prev ? `href="#/laporan/${prev}"` : 'aria-disabled="true"'} aria-label="Bulan sebelumnya">${ic("chevron-kiri")}</a>
        <b>${bulanNama(ym)}</b>
        <a class="btn-ic ${next ? "" : "off"}" ${next ? `href="#/laporan/${next}"` : 'aria-disabled="true"'} aria-label="Bulan berikutnya">${ic("chevron-kanan")}</a></div>
      <section><h2>Buku kas ${nm}</h2><p class="sub">Semua dana${berjalan ? " · bulan berjalan" : ""}</p>
        <div class="card list">
          <div class="row"><span>Saldo awal, 1 ${BL3[+ym.slice(5) - 1]}</span><b class="num">${rp(awal)}</b></div>
          <div class="row"><span>Pemasukan</span><b class="num in">+ ${rp(a.masuk)}</b></div>
          <div class="row"><span>Pengeluaran</span><b class="num out">– ${rp(a.keluar)}</b></div>
          <div class="row total"><span>Saldo ${berjalan ? "per" : "akhir,"} ${tglTanpaTahun(akhir)}</span><b class="num">${rp(awal + a.masuk - a.keluar)}</b></div></div>
        <p class="note">Saldo awal + pemasukan − pengeluaran = saldo akhir</p></section>
      <section><h2>6 bulan terakhir</h2><p class="sub">Dalam juta rupiah</p><div class="card pad">${grafik(ym)}</div></section>
      <section><h2>Pemasukan per kategori</h2><div class="card pad">${barKategori(K.perKategori(D, awalBulan(ym), akhir, "Masuk"), "Masuk")}</div></section>
      <section><h2>Pengeluaran per kategori</h2><div class="card pad">${barKategori(K.perKategori(D, awalBulan(ym), akhir, "Keluar"), "Keluar")}</div></section>
      <a class="btn pri" href="#/cetak/${ym}">${ic("unduh")}Unduh laporan PDF</a>
      <a class="btn sec" href="#/tahun/${ym.slice(0, 4)}">${ic("kalender")}Laporan tahunan ${ym.slice(0, 4)}</a>
      <a class="btn sec" href="https://wa.me/?text=${encodeURIComponent(teksWA)}" target="_blank" rel="noopener">${ic("bagikan")}Bagikan ke WhatsApp</a>
      <p class="note c">Diperiksa oleh ${esc(pr.pemeriksa || "—")}${pr.tanggal_pemeriksaan ? " · " + esc(pr.tanggal_pemeriksaan) : ""}</p>
      ${tabBar("laporan")}`;
  }

  // ---------- Laporan tahunan ----------
  function dataTahun(y) {
    const hari = hariIni();
    const mulaiCatat = D.dana.reduce((m, f) => (f.per > "0000-00-00" && (!m || f.per < m) ? f.per : m), "") || `${y}-01-01`;
    const dari = `${y}-01-01` < mulaiCatat ? mulaiCatat : `${y}-01-01`;
    const sampai = `${y}-12-31` > hari ? hari : `${y}-12-31`;
    const awal = K.saldoTotal(D, kemarin(dari));
    const bulan = [];
    for (let m = 1; m <= 12; m++) {
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      if (akhirBulan(ym) < dari || awalBulan(ym) > sampai) { bulan.push({ ym, kosong: true }); continue; }
      const a = K.arus(D, awalBulan(ym) < dari ? dari : awalBulan(ym), akhirBulan(ym) > sampai ? sampai : akhirBulan(ym));
      bulan.push({ ym, ...a, saldo: K.saldoTotal(D, akhirBulan(ym) > sampai ? sampai : akhirBulan(ym)) });
    }
    const tot = K.arus(D, dari, sampai);
    return { y, dari, sampai, awal, bulan, tot, akhir: awal + tot.masuk - tot.keluar, berjalan: sampai === hari && sampai < `${y}-12-31`,
             mulaiCatatan: dari !== `${y}-01-01` };
  }
  function tahunTersedia() {
    const s = new Set(D.transaksi.map(t => t.tanggal.slice(0, 4))); s.add(hariIni().slice(0, 4));
    return [...s].sort();
  }
  function vTahun(y) {
    const ada = tahunTersedia(); y = ada.includes(y) ? y : ada[ada.length - 1];
    const T = dataTahun(y), i = ada.indexOf(y);
    const prev = i > 0 ? ada[i - 1] : null, next = i < ada.length - 1 ? ada[i + 1] : null;
    const maks = Math.max(1, ...T.bulan.filter(b => !b.kosong).map(b => Math.max(b.masuk, b.keluar)));
    return `${banner()}${headerBack("Laporan tahunan", "#/laporan")}
      <div class="pemilih card">
        <a class="btn-ic ${prev ? "" : "off"}" ${prev ? `href="#/tahun/${prev}"` : 'aria-disabled="true"'} aria-label="Tahun sebelumnya">${ic("chevron-kiri")}</a>
        <b>Tahun ${y}</b>
        <a class="btn-ic ${next ? "" : "off"}" ${next ? `href="#/tahun/${next}"` : 'aria-disabled="true"'} aria-label="Tahun berikutnya">${ic("chevron-kanan")}</a></div>
      <section><h2>Ringkasan ${y}</h2><p class="sub">Semua dana${T.berjalan ? " · tahun berjalan" : ""}${T.mulaiCatatan ? ` · pencatatan mulai ${tglPendek(T.dari)}` : ""}</p>
        <div class="card list">
          <div class="row"><span>Saldo awal, ${tglTanpaTahun(T.dari)}</span><b class="num">${rp(T.awal)}</b></div>
          <div class="row"><span>Pemasukan</span><b class="num in">+ ${rp(T.tot.masuk)}</b></div>
          <div class="row"><span>Pengeluaran</span><b class="num out">– ${rp(T.tot.keluar)}</b></div>
          <div class="row total"><span>Saldo ${T.berjalan ? "per" : "akhir,"} ${tglTanpaTahun(T.sampai)}</span><b class="num">${rp(T.akhir)}</b></div></div></section>
      <section><h2>Per bulan</h2><div class="card list">${T.bulan.map(b => b.kosong
        ? `<div class="row bln kosong"><span>${BLN[+b.ym.slice(5) - 1]}</span><span class="sub">—</span></div>`
        : `<a class="row bln" href="#/laporan/${b.ym}"><span>${BLN[+b.ym.slice(5) - 1]}</span>
            <span class="bln-bar"><i class="in" style="width:${(b.masuk / maks * 100).toFixed(1)}%"></i><i class="out" style="width:${(b.keluar / maks * 100).toFixed(1)}%"></i></span>
            <span class="bln-n"><b class="num in">+ ${ribu(b.masuk)}</b><b class="num out">– ${ribu(b.keluar)}</b></span></a>`).join("")}</div>
        <p class="note">Angka dalam rupiah. Ketuk bulan untuk melihat laporannya.</p></section>
      <section><h2>Pemasukan per kategori</h2><div class="card pad">${barKategori(K.perKategori(D, T.dari, T.sampai, "Masuk"), "Masuk")}</div></section>
      <section><h2>Pengeluaran per kategori</h2><div class="card pad">${barKategori(K.perKategori(D, T.dari, T.sampai, "Keluar"), "Keluar")}</div></section>
      <a class="btn pri" href="#/cetak-tahun/${y}">${ic("unduh")}Unduh laporan tahunan PDF</a>
      ${tabBar("laporan")}`;
  }
  function vCetakTahun(y) {
    const T = dataTahun(y || hariIni().slice(0, 4)), p = D.profil;
    const kat = j => K.perKategori(D, T.dari, T.sampai, j).map(r => `<tr><td>${esc(r.nama)}</td><td class="r">${ribu(r.nilai)}</td><td class="r">${persen(r.persen)}</td></tr>`).join("") || `<tr><td colspan="3">—</td></tr>`;
    const org = j => (D.pengurus.find(o => (o.jabatan || "").toLowerCase() === j) || {}).nama || "";
    return `<div class="cetak-alat"><a class="btn sec" href="#/tahun/${T.y}" data-kembali>${ic("kembali")}Kembali</a><button class="btn pri" id="cetak">${ic("cetak")}Cetak / simpan PDF</button></div>
      <article class="a4">
        <header class="a4-hdr">${logo(44)}<div><h1>Laporan Kas Tahunan ${esc(p.nama || "")}</h1><p>Tahun ${T.y} (${tglPendek(T.dari)} – ${tglPendek(T.sampai)}) · ${esc(p.alamat || "")}</p></div></header>
        <h2>Ringkasan</h2>
        <table class="t"><tr><td>Saldo awal, ${tglPendek(T.dari)}</td><td class="r">${rp(T.awal)}</td></tr>
          <tr><td>Pemasukan</td><td class="r">${rp(T.tot.masuk)}</td></tr><tr><td>Pengeluaran</td><td class="r">${rp(T.tot.keluar)}</td></tr>
          <tr class="b"><td>Saldo ${T.berjalan ? "per" : "akhir,"} ${tglPendek(T.sampai)}</td><td class="r">${rp(T.akhir)}</td></tr></table>
        <table class="t"><tr class="h"><td>Saldo per dana (${tglPendek(T.sampai)})</td><td class="r">Rp</td></tr>${D.dana.map(f => `<tr><td>${esc(f.nama)}</td><td class="r">${ribu(K.saldoDana(D, f.nama, T.sampai))}</td></tr>`).join("")}</table>
        <h2>Per bulan</h2>
        <table class="t"><tr class="h"><td>Bulan</td><td class="r">Pemasukan</td><td class="r">Pengeluaran</td><td class="r">Selisih</td><td class="r">Saldo akhir</td></tr>
          ${T.bulan.map(b => b.kosong ? `<tr><td>${BLN[+b.ym.slice(5) - 1]}</td><td class="r">—</td><td class="r">—</td><td class="r">—</td><td class="r">—</td></tr>`
            : `<tr><td>${BLN[+b.ym.slice(5) - 1]}</td><td class="r">${ribu(b.masuk)}</td><td class="r">${ribu(b.keluar)}</td><td class="r">${b.masuk - b.keluar < 0 ? "–" : ""}${ribu(b.masuk - b.keluar)}</td><td class="r">${ribu(b.saldo)}</td></tr>`).join("")}
          <tr class="b"><td>Jumlah</td><td class="r">${ribu(T.tot.masuk)}</td><td class="r">${ribu(T.tot.keluar)}</td><td class="r">${T.tot.masuk - T.tot.keluar < 0 ? "–" : ""}${ribu(T.tot.masuk - T.tot.keluar)}</td><td class="r">${ribu(T.akhir)}</td></tr></table>
        <div class="dua"><div><h2>Pemasukan per kategori</h2><table class="t">${kat("Masuk")}</table></div><div><h2>Pengeluaran per kategori</h2><table class="t">${kat("Keluar")}</table></div></div>
        <div class="ttd">${[["Bendahara", org("bendahara")], ["Pemeriksa", p.pemeriksa], ["Ketua", org("ketua")]].map(([j, n]) =>
          `<div><span>${j}</span><i></i><b>${esc(n || "")}</b></div>`).join("")}</div>
        <p class="a4-kaki">Dicetak ${tglPendek(hariIni())} · ${D.sumber.jenis === "contoh" ? "DATA CONTOH · " : ""}Sumber: lembar data kas ${esc(p.nama_pendek || "")}</p>
      </article>`;
  }

  // ---------- Riwayat ----------
  function vRiwayat(q) {
    if (q.has("jenis")) ui.jenis = q.get("jenis");
    const chip = (label, aktif, data) => `<button class="chip ${aktif ? "on" : ""}" ${data} aria-pressed="${aktif}">${esc(label)}</button>`;
    const semua = !ui.jenis && !ui.dana;
    return `${banner()}${headerTab("Riwayat transaksi")}
      <label class="cari card">${ic("cari")}<input id="cari" type="search" placeholder="Cari transaksi" value="${esc(ui.cari)}" autocomplete="off"></label>
      <div class="chips">${chip("Semua", semua, 'data-f="semua"')}${chip("Masuk", ui.jenis === "Masuk", 'data-jenis="Masuk"')}${chip("Keluar", ui.jenis === "Keluar", 'data-jenis="Keluar"')}
        ${D.dana.map(f => chip(f.nama, ui.dana === f.nama, `data-dana="${esc(f.nama)}"`)).join("")}</div>
      <div id="daftar">${daftarRiwayat()}</div>
      ${tabBar("riwayat")}`;
  }
  function daftarRiwayat() {
    const c = ui.cari.toLowerCase().trim();
    const list = D.transaksi.filter(t => (!ui.jenis || t.jenis === ui.jenis) && (!ui.dana || t.dana === ui.dana) &&
      (!c || [t.kategori, t.uraian, t.keterangan, t.dana, String(t.nominal), tglPanjang(t.tanggal)].join(" ").toLowerCase().includes(c)));
    if (!list.length) return `<div class="kosong-besar">${ic("cari")}<b>Tidak ada transaksi</b><span>Coba kata lain atau hapus filter.</span></div>`;
    const grup = new Map();
    for (let i = list.length - 1; i >= 0; i--) { const t = list[i]; if (!grup.has(t.tanggal)) grup.set(t.tanggal, []); grup.get(t.tanggal).push(t); }
    const hari = [...grup.keys()];
    const tampil = hari.slice(0, ui.batasHari);
    return tampil.map(h => {
      const ts = grup.get(h).slice().reverse();
      const net = ts.reduce((s, t) => s + K.sign(t), 0);
      return `<div class="hari"><span>${tglPanjang(h)}</span><span class="num">${net < 0 ? "– " : "+ "}Rp ${ribu(net)}</span></div>
        <div class="card txlist">${ts.map(t => barisTx(t, { tanpaTanggal: true })).join("")}</div>`;
    }).join("") + (hari.length > ui.batasHari ? `<button class="btn sec" id="lagi">Muat lebih banyak</button>` : "");
  }

  // ---------- Detail ----------
  function vDetail(id) {
    const t = D.transaksi.find(x => x.id === id);
    if (!t) return `${headerBack("Detail transaksi", "#/riwayat")}<div class="kosong-besar">${ic("struk")}<b>Transaksi tidak ditemukan</b><span>Mungkin sudah diubah di lembar data.</span></div>`;
    const keluar = t.jenis === "Keluar";
    const cek = !!(t.diperiksa && t.diperiksa.trim());
    const g = driveGambar(t.bukti);
    const pr = D.profil;
    const teks = `Assalamu'alaikum. Saya ingin menanyakan transaksi ${t.kategori} ${rpTanda(t.nominal, t.jenis)} tanggal ${tglPendek(t.tanggal)} (baris ${t.id} di lembar data).`;
    const wa = waLink(pr.wa_laporan, teks);
    const rows = [["Kategori", t.kategori], ["Dana", t.dana], ["Waktu", tglPanjang(t.tanggal) + (t.jam ? `, ${t.jam} ${zona()}` : "")],
      t.uraian ? ["Uraian", t.uraian] : null, ["Dicatat oleh", t.dicatat || "—"], ["Diperiksa oleh", t.diperiksa || "Belum diperiksa"],
      t.keterangan ? ["Keterangan", t.keterangan] : null].filter(Boolean);
    let bukti;
    if (g && g.img) bukti = `<a class="bukti" href="${esc(g.link)}" target="_blank" rel="noopener"><img src="${esc(g.img)}" alt="Foto bukti ${esc(t.kategori)}" loading="lazy"></a>`;
    else if (g) bukti = `<a class="btn sec" href="${esc(g.link)}" target="_blank" rel="noopener">${ic("struk")}Buka bukti</a>`;
    else if (t.bukti) bukti = `<div class="bukti ph">${ic("struk")}<b>Foto nota</b><span>${esc(t.bukti)}</span></div>`;
    else bukti = `<div class="bukti ph">${ic("struk")}<b>Belum ada foto bukti</b><span>Tanyakan ke bendahara bila diperlukan.</span></div>`;
    return `${headerBack("Detail transaksi", "#/riwayat")}
      <div class="card detail-top"><span class="tx-ic big ${keluar ? "out" : "in"}">${ic(ikonKategori(t))}</span>
        <b class="dt-kat">${esc(t.kategori)}</b><span class="dt-nom ${keluar ? "out" : "in"}">${rpTanda(t.nominal, t.jenis)}</span>
        <span class="badge ${cek ? "ok" : "wait"}">${ic(cek ? "centang" : "jam")}${cek ? "Terverifikasi" : "Menunggu pemeriksaan"}</span></div>
      <div class="card list info">${rows.map(([k, v]) => `<div class="row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div>
      <section><h2>Bukti</h2>${bukti}</section>
      ${wa ? `<a class="link-c" href="${esc(wa)}" target="_blank" rel="noopener">${ic("info")}Laporkan kejanggalan</a><p class="note c">Pesan akan dikirim ke WhatsApp pengurus.</p>`
        : `<p class="note c">Ada yang janggal? Sampaikan langsung ke pengurus.</p>`}`;
  }

  // ---------- Program ----------
  function vProgram() {
    const p = D.profil;
    const qris = driveGambar(p.qris);
    const rek = p.no_rekening || "";
    const rekAsli = rek && !placeholder(rek);
    return `${banner()}${headerTab("Program & donasi")}
      <p class="salam">${esc(p.catatan_program || "")}</p>
      ${D.program.map(g => {
        const pc = g.target ? Math.min(1, g.terkumpul / g.target) : 0;
        return `<div class="card pad prog"><h3>${esc(g.nama)}</h3>
          <p><b class="num in">${rp(g.terkumpul)}</b>${g.target ? ` <span class="sub">dari ${rp(g.target)}</span>` : ""}</p>
          ${g.target ? `<div class="bar"><span class="in" style="width:${(pc * 100).toFixed(1)}%"></span></div>` : ""}
          <div class="prog-bawah">${g.target ? `<b class="in">${persen(pc)} terkumpul</b>` : "<span></span>"}<span class="sub">${esc(g.dana || "")}</span></div></div>`;
      }).join("") || '<p class="kosong">Belum ada program.</p>'}
      <div class="card pad infaq"><h3>Cara berinfaq</h3><p class="sub2">Transfer ke rekening musholla:</p>
        <div class="rek"><span class="overline">${esc(p.bank || "[BANK]")}</span><b>${esc(rek || "[NO. REKENING]")}</b><span>a.n. ${esc(p.nama_rekening || "[NAMA REKENING]")}</span></div>
        <button class="btn sec" id="salin" ${rekAsli ? "" : "disabled"} data-rek="${esc(rek)}">${ic("salin")}Salin nomor rekening</button>
        <p class="note c">atau pindai QRIS</p>
        ${qris && qris.img ? `<img class="qris" src="${esc(qris.img)}" alt="QRIS ${esc(p.nama || "")}">` : `<div class="qris ph">[QRIS]</div>`}
        <div class="peringatan">${ic("info")}<span>Pastikan nama penerima sesuai sebelum transfer.</span></div></div>
      ${tabBar("program")}`;
  }

  // ---------- Info ----------
  function vInfo() {
    const p = D.profil;
    const peta = urlAman(p.link_peta) || (p.alamat ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.alamat) : "");
    const fb = urlAman(p.link_facebook);
    const s = D.sumber;
    const sumber = s.jenis === "contoh" ? "Data contoh (config.js belum diisi)" : s.jenis === "cache" ? "Data tersimpan (offline)" : s.jenis === "tersimpan" ? "Data tersimpan di perangkat, sedang diperbarui" : "Google Sheets";
    const tema = document.documentElement.dataset.theme || "auto";
    return `${banner()}${headerTab("Info musholla")}
      <div class="card pad profil">${logo(72)}<b>${esc(p.nama)}</b><span>${esc(p.naungan || "")}</span></div>
      <div class="card pad"><div class="ikrow">${`<span class="tx-ic in">${ic("peta")}</span>`}<div><b>Alamat</b><span>${esc(p.alamat || "—")}</span></div></div>
        ${peta ? `<a class="btn sec" href="${esc(peta)}" target="_blank" rel="noopener">${ic("peta")}Buka di peta</a>` : ""}</div>
      ${kegiatanMendatang().length ? `<section><h2>Agenda mendatang</h2><div class="card list">${kegiatanMendatang().map(barisKegiatan).join("")}</div></section>` : ""}
      ${D.kegiatan.length ? `<section><h2>Kegiatan rutin</h2><div class="card list">${D.kegiatan.map(k =>
        `<div class="ikrow"><span class="tx-ic in">${ic(window.KAS_IKON[k.ikon] ? k.ikon : "jam")}</span><div><b>${esc(k.nama)}</b><span>${esc(k.jadwal)}</span></div></div>`).join("")}</div></section>` : ""}
      ${D.pengurus.length ? `<section><h2>Pengurus</h2><div class="card list">${D.pengurus.map(o => {
        const w = waLink(o.wa);
        return `<div class="ikrow"><div><b>${esc(o.jabatan)}</b><span>${esc(o.nama)}</span></div>${w ? `<a class="btn-ic" href="${esc(w)}" target="_blank" rel="noopener" aria-label="Hubungi ${esc(o.jabatan)}">${ic("telepon")}</a>` : ""}</div>`;
      }).join("")}</div></section>` : ""}
      ${fb ? `<a class="link-c" href="${esc(fb)}" target="_blank" rel="noopener">${ic("tautan")}Facebook ${esc(p.nama)}</a>` : ""}
      <section><h2>Tampilan</h2><div class="card pad">
        <div class="seg" role="group" aria-label="Tema">${[["auto", "Otomatis"], ["light", "Terang"], ["dark", "Gelap"]].map(([v, l]) =>
          `<button data-tema="${v}" class="${tema === v ? "on" : ""}" aria-pressed="${tema === v}">${l}</button>`).join("")}</div>
        <a class="btn sec" href="#/tv">${ic("tv")}Buka layar TV</a></div></section>
      <section><h2>Sumber data</h2><div class="card pad sumber">
        <p>${esc(sumber)} · dimuat ${esc(new Date(s.waktu).toLocaleString("id-ID"))}</p>
        ${D.masalah.length ? `<details><summary>${D.masalah.length} baris tidak terbaca</summary><ul>${D.masalah.map(m => `<li>${esc(m)}</li>`).join("")}</ul></details>` : ""}
        <button class="btn sec" id="muatUlang">${ic("segarkan")}Muat ulang data</button></div></section>
      <a class="link-c" href="#/privasi">Kebijakan privasi</a>
      ${urlAman((window.KAS_CONFIG || {}).pengurusUrl) ? `<a class="link-c kecil" href="${esc(urlAman(window.KAS_CONFIG.pengurusUrl))}" target="_blank" rel="noopener">Masuk sebagai pengurus</a>` : ""}
      ${tabBar("info")}`;
  }
  function vPrivasi() {
    return `${headerBack("Kebijakan privasi", "#/info")}<div class="card pad prosa">
      <p>Aplikasi ini hanya menampilkan laporan keuangan ${esc(D.profil.nama || "musholla")}. Tidak ada akun, tidak ada formulir, dan tidak ada pelacakan pengunjung.</p>
      <p>Data diambil dari lembar Google Sheets yang dikelola bendahara. Nama donatur tidak dicatat; donasi tanpa nama ditulis sebagai kategori saja.</p>
      <p>Pengaturan tema dan salinan data terakhir disimpan di perangkat Anda sendiri agar aplikasi tetap bisa dibuka saat offline.</p>
      <p>Pertanyaan tentang laporan dapat disampaikan langsung ke pengurus.</p></div>`;
  }

  // ---------- TV ----------
  function vTV() {
    const p = D.profil, hari = hariIni();
    const d = dOf(hari); const minggu = iso(new Date(d.getTime() - d.getUTCDay() * 864e5));
    const a = K.arus(D, minggu, hari);
    const besar = D.transaksi.filter(t => t.tanggal >= minggu && t.tanggal <= hari).sort((x, y) => y.nominal - x.nominal).slice(0, 6);
    const prog = D.program[0];
    const pc = prog && prog.target ? Math.min(1, prog.terkumpul / prog.target) : 0;
    const rg = rentang(minggu, hari);
    return `<div class="tv-wrap"><div class="tv" id="tv">
      <div class="tv-kiri">
        <div class="tv-hdr">${logo(96)}<div><b>${esc(p.nama)}</b><span>Laporan kas · ${tglPanjang(hari)}</span></div></div>
        <div class="tv-saldo"><span class="overline">Saldo seluruh dana</span><b>${rp(K.saldoTotal(D))}</b></div>
        <div class="card tv-dana">${D.dana.map(f => `<div class="row"><span>${esc(f.nama)}</span><b class="num">${rp(K.saldoDana(D, f.nama))}</b></div>`).join("")}</div>
        ${prog ? `<div class="card tv-prog"><span>${esc(prog.nama)}</span><b class="in">${prog.target ? persen(pc) + " · " : ""}${rp(prog.terkumpul)}${prog.target ? " dari " + rp(prog.target) : ""}</b>
          ${prog.target ? `<div class="bar"><span class="in" style="width:${(pc * 100).toFixed(1)}%"></span></div>` : ""}</div>` : ""}
      </div>
      <div class="tv-kanan">
        <div class="tv-arus"><div class="card"><span class="overline">Pemasukan pekan ini</span><b class="in">+ ${rp(a.masuk)}</b><span>${rg}</span></div>
          <div class="card"><span class="overline">Pengeluaran pekan ini</span><b class="out">– ${rp(a.keluar)}</b><span>${rg}</span></div></div>
        <div class="card tv-list"><span class="overline">Transaksi terbesar pekan ini</span>
          ${besar.map(t => `<div class="row"><span>${esc(t.kategori)} · ${tglTanpaTahun(t.tanggal)}</span><b class="num ${t.jenis === "Keluar" ? "out" : "in"}">${rpTanda(t.nominal, t.jenis)}</b></div>`).join("") || '<div class="row"><span>Belum ada transaksi pekan ini.</span></div>'}</div>
      </div></div><a class="tv-keluar" href="#/info">Keluar dari layar TV</a></div>`;
  }
  function skalaTV() {
    const tv = document.getElementById("tv"); if (!tv) return;
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    tv.style.transform = `translate(-50%,-50%) scale(${s})`;
  }

  // ---------- Cetak ----------
  function vCetak(ym) {
    const hari = hariIni(); ym = ym || hari.slice(0, 7);
    const berjalan = ym === hari.slice(0, 7), akhir = berjalan ? hari : akhirBulan(ym);
    const awal = K.saldoTotal(D, kemarin(awalBulan(ym)));
    const a = K.arus(D, awalBulan(ym), akhir);
    const p = D.profil;
    const list = D.transaksi.filter(t => t.tanggal >= awalBulan(ym) && t.tanggal <= akhir);
    let s = awal;
    const baris = list.map(t => { s += K.sign(t); return `<tr><td>${tglTanpaTahun(t.tanggal)}</td><td>${esc(t.kategori)}${t.uraian ? " · " + esc(t.uraian) : ""}</td><td>${esc(t.dana)}</td>
      <td class="r">${t.jenis === "Masuk" ? ribu(t.nominal) : ""}</td><td class="r">${t.jenis === "Keluar" ? ribu(t.nominal) : ""}</td><td class="r">${ribu(s)}</td></tr>`; }).join("");
    const kat = (j) => K.perKategori(D, awalBulan(ym), akhir, j).map(r => `<tr><td>${esc(r.nama)}</td><td class="r">${ribu(r.nilai)}</td><td class="r">${persen(r.persen)}</td></tr>`).join("") || `<tr><td colspan="3">—</td></tr>`;
    const org = j => (D.pengurus.find(o => (o.jabatan || "").toLowerCase() === j) || {}).nama || "";
    return `<div class="cetak-alat"><a class="btn sec" href="#/laporan/${ym}" data-kembali>${ic("kembali")}Kembali</a><button class="btn pri" id="cetak">${ic("cetak")}Cetak / simpan PDF</button></div>
      <article class="a4">
        <header class="a4-hdr">${logo(44)}<div><h1>Laporan Kas ${esc(p.nama || "")}</h1><p>${bulanNama(ym)}${berjalan ? ` (sampai ${tglPendek(akhir)})` : ""} · ${esc(p.alamat || "")}</p></div></header>
        <h2>Ringkasan</h2>
        <table class="t"><tr><td>Saldo awal, 1 ${BLN[+ym.slice(5) - 1]} ${ym.slice(0, 4)}</td><td class="r">${rp(awal)}</td></tr>
          <tr><td>Pemasukan</td><td class="r">${rp(a.masuk)}</td></tr><tr><td>Pengeluaran</td><td class="r">${rp(a.keluar)}</td></tr>
          <tr class="b"><td>Saldo ${berjalan ? "per" : "akhir,"} ${tglPendek(akhir)}</td><td class="r">${rp(awal + a.masuk - a.keluar)}</td></tr></table>
        <table class="t"><tr class="h"><td>Saldo per dana (${tglPendek(akhir)})</td><td class="r">Rp</td></tr>${D.dana.map(f => `<tr><td>${esc(f.nama)}</td><td class="r">${ribu(K.saldoDana(D, f.nama, akhir))}</td></tr>`).join("")}</table>
        <div class="dua"><div><h2>Pemasukan per kategori</h2><table class="t">${kat("Masuk")}</table></div><div><h2>Pengeluaran per kategori</h2><table class="t">${kat("Keluar")}</table></div></div>
        <h2>Buku kas</h2>
        <table class="t buku"><tr class="h"><td>Tgl</td><td>Uraian</td><td>Dana</td><td class="r">Masuk</td><td class="r">Keluar</td><td class="r">Saldo</td></tr>
          <tr><td></td><td>Saldo awal</td><td></td><td></td><td></td><td class="r">${ribu(awal)}</td></tr>${baris}
          <tr class="b"><td></td><td>Jumlah</td><td></td><td class="r">${ribu(a.masuk)}</td><td class="r">${ribu(a.keluar)}</td><td class="r">${ribu(s)}</td></tr></table>
        <div class="ttd">${[["Bendahara", org("bendahara")], ["Pemeriksa", p.pemeriksa], ["Ketua", org("ketua")]].map(([j, n]) =>
          `<div><span>${j}</span><i></i><b>${esc(n || "")}</b></div>`).join("")}</div>
        <p class="a4-kaki">Dicetak ${tglPendek(hariIni())} · ${D.sumber.jenis === "contoh" ? "DATA CONTOH · " : ""}Sumber: lembar data kas ${esc(p.nama_pendek || "")}</p>
      </article>`;
  }

  // ---------- router ----------
  function render() {
    const [path, qs] = (location.hash.slice(1) || "/").split("?");
    const q = new URLSearchParams(qs || "");
    const seg = path.split("/").filter(Boolean);
    document.body.className = "";
    let html;
    if (!D) { app.innerHTML = `<div class="kosong-besar">${galatMuat ? `${ic("info")}<b>Data belum bisa dimuat</b><span>${esc(galatMuat)}</span><button class="btn sec" id="muatUlang">Coba lagi</button>` : `<b>Memuat laporan…</b>`}</div>`; return; }
    switch (seg[0]) {
      case "laporan": html = vLaporan(seg[1]); break;
      case "riwayat": html = vRiwayat(q); break;
      case "t": html = vDetail(seg[1]); break;
      case "program": html = vProgram(); break;
      case "info": html = vInfo(); break;
      case "privasi": html = vPrivasi(); break;
      case "tv": html = vTV(); document.body.className = "mode-tv"; break;
      case "cetak": html = vCetak(seg[1]); document.body.className = "mode-cetak"; break;
      case "tahun": html = vTahun(seg[1]); break;
      case "cetak-tahun": html = vCetakTahun(seg[1]); document.body.className = "mode-cetak"; break;
      default: html = vBeranda();
    }
    app.innerHTML = html;
    skalaTV();
    const judul = { laporan: "Laporan", riwayat: "Riwayat", t: "Detail", program: "Program", info: "Info", tv: "Layar TV", cetak: "Laporan cetak", tahun: "Laporan tahunan", "cetak-tahun": "Laporan tahunan" }[seg[0]];
    document.title = (judul ? judul + " · " : "") + "Kas " + (D.profil.nama_pendek || "Al Qomar");
  }
  let rutePrev = "", langkah = 0;
  window.addEventListener("hashchange", () => {
    langkah++;
    const now = location.hash.split("?")[0];
    render();
    if (now !== rutePrev) window.scrollTo(0, 0);
    rutePrev = now;
  });
  window.addEventListener("resize", skalaTV);

  // ---------- events ----------
  app.addEventListener("click", async e => {
    const el = e.target.closest("button, a"); if (!el) return;
    if (el.hasAttribute("data-kembali") && langkah > 0) { e.preventDefault(); history.back(); return; }
    if (el.dataset.f === "semua") { ui.jenis = ""; ui.dana = ""; ui.batasHari = 30; history.replaceState(null, "", "#/riwayat"); render(); }
    else if (el.dataset.jenis) { ui.jenis = ui.jenis === el.dataset.jenis ? "" : el.dataset.jenis; ui.batasHari = 30; history.replaceState(null, "", "#/riwayat"); render(); }
    else if (el.dataset.dana) { ui.dana = ui.dana === el.dataset.dana ? "" : el.dataset.dana; ui.batasHari = 30; render(); }
    else if (el.id === "lagi") { ui.batasHari += 30; document.getElementById("daftar").innerHTML = daftarRiwayat(); }
    else if (el.id === "salin") {
      try { await navigator.clipboard.writeText(el.dataset.rek.replace(/\s/g, "")); el.lastChild.textContent = "Nomor tersalin"; }
      catch (err) { el.lastChild.textContent = el.dataset.rek; }
      setTimeout(() => { el.lastChild.textContent = "Salin nomor rekening"; }, 2500);
    }
    else if (el.dataset.tema) { setTema(el.dataset.tema); render(); }
    else if (el.id === "muatUlang") { el.disabled = true; await muat(); }
    else if (el.id === "cetak") { window.print(); }
    else if (el.id === "salinPekan") {
      const lbl = el.lastChild;
      try { await navigator.clipboard.writeText(teksRingkasanPekan()); lbl.textContent = "Teks tersalin"; }
      catch (err) { lbl.textContent = "Gagal menyalin"; }
      setTimeout(() => { lbl.textContent = "Salin teks ringkasan"; }, 2500);
    }
  });
  app.addEventListener("input", e => {
    if (e.target.id === "cari") { ui.cari = e.target.value; ui.batasHari = 30; document.getElementById("daftar").innerHTML = daftarRiwayat(); }
  });

  function setTema(t) {
    if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    try { localStorage.setItem("kas-al-qomar:tema", t); } catch (e) { /* abaikan */ }
  }

  async function muat(latar) {
    try { D = await K.muat(); galatMuat = D.sumber.galat || null; if (D.sumber.jenis === "cache") galatMuat = null; }
    catch (e) { if (!latar || !D) galatMuat = String(e.message || e); else if (D.sumber.jenis === "tersimpan") D.sumber.jenis = "cache"; }
    // jangan ganggu orang yang sedang mengetik di kolom cari
    if (latar && document.activeElement && document.activeElement.id === "cari") return;
    const y = scrollY; render(); if (latar) scrollTo(0, y);
  }

  // ---------- start ----------
  try { const t = localStorage.getItem("kas-al-qomar:tema"); if (t && t !== "auto") document.documentElement.dataset.theme = t; } catch (e) { /* abaikan */ }
  rutePrev = location.hash.split("?")[0];
  // tampilkan data tersimpan seketika (bila ada), lalu ambil data terbaru di belakang layar
  const tersimpan = K.muatTersimpan();
  if (tersimpan) { D = tersimpan; render(); }
  muat(!!tersimpan);
  const menit = Math.max(1, +(window.KAS_CONFIG || {}).segarkanMenit || 5);
  setInterval(() => { if (document.visibilityState === "visible" && !document.body.classList.contains("mode-cetak")) muat(true); }, menit * 60000);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
