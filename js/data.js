// Memuat dan mengolah data dari Google Sheets (atau data contoh).
(function () {
  const TABS = ["Transaksi", "Dana", "Kategori", "Program", "Profil", "Pengurus", "Kegiatan"];
  const CACHE_KEY = "kas-al-qomar:data";

  // ---------- CSV ----------
  function parseCSV(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ""));
  }
  // header -> key: "Bukti (link foto)" -> "bukti", "Saldo awal" -> "saldo_awal"
  const keyOf = h => h.toLowerCase().replace(/\(.*?\)/g, "").trim().replace(/\s+/g, "_");
  // menerima teks CSV (gviz / data contoh) atau array baris (Apps Script)
  function table(text) {
    const rows = Array.isArray(text) ? text.map(r => r.map(c => String(c == null ? "" : c))) : parseCSV(text || "");
    if (!rows.length) return [];
    const head = rows[0].map(keyOf);
    return rows.slice(1).map((r, i) => {
      const o = { _baris: i + 2 };
      head.forEach((h, j) => { o[h] = (r[j] || "").trim(); });
      return o;
    });
  }

  // ---------- value parsing ----------
  const angka = s => {
    if (s == null) return 0;
    s = String(s).trim();
    if (!s) return 0;
    const neg = /^-|^\(|−/.test(s);
    const n = parseInt(s.replace(/[,.]\d{1,2}$/, "").replace(/[^\d]/g, ""), 10) || 0;
    return neg ? -n : n;
  };
  // returns "YYYY-MM-DD" or ""
  function tanggal(s) {
    s = (s || "").trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/); // d/m/yyyy (format Indonesia)
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    m = s.match(/^Date\((\d+),(\d+),(\d+)/); // gviz JSON style
    if (m) return `${m[1]}-${String(+m[2] + 1).padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    return "";
  }
  const jam = s => { const m = (s || "").match(/(\d{1,2})[.:](\d{2})/); return m ? `${m[1].padStart(2, "0")}.${m[2]}` : ""; };
  const ya = s => !/^(tidak|no|false|0|sembunyi)/i.test((s || "").trim());

  // ---------- model ----------
  function build(raw, sumber) {
    const t = {}; TABS.forEach(k => { t[k] = table(raw[k]); });
    const profil = {};
    t.Profil.forEach(r => { if (r.kunci) profil[r.kunci.trim()] = r.nilai; });

    const kategori = {};
    t.Kategori.forEach(r => { if (r.nama) kategori[r.nama] = { jenis: r.jenis, ikon: r.ikon || "" }; });

    const dana = t.Dana.filter(r => r.nama).map(r => ({
      nama: r.nama, saldoAwal: angka(r.saldo_awal), per: tanggal(r.per_tanggal) || "0000-00-00", ket: r.keterangan,
    }));

    const masalah = [];
    const transaksi = t.Transaksi.map(r => {
      const tgl = tanggal(r.tanggal);
      const jenis = /^k/i.test(r.jenis) ? "Keluar" : /^m/i.test(r.jenis) ? "Masuk" : "";
      const nominal = Math.abs(angka(r.nominal));
      if (!tgl && !nominal && !r.kategori) return null; // baris kosong
      if (!tgl || !jenis || !nominal) {
        masalah.push(`Baris ${r._baris} di tab Transaksi dilewati: ${!tgl ? "tanggal" : !jenis ? "jenis (Masuk/Keluar)" : "nominal"} tidak terbaca.`);
        return null;
      }
      return {
        id: String(r._baris), tanggal: tgl, jam: jam(r.jam), jenis, kategori: r.kategori || "Lainnya",
        dana: r.dana || (dana[0] && dana[0].nama) || "Kas Umum", nominal,
        uraian: r.uraian, keterangan: r.keterangan, bukti: r.bukti, dicatat: r.dicatat_oleh,
        diperiksa: r.diperiksa_oleh, tampil: ya(r.tampilkan),
      };
    }).filter(x => x && x.tampil);
    transaksi.sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam) || (+a.id - +b.id));

    const program = t.Program.filter(r => r.nama && ya(r.tampilkan)).map(r => ({
      nama: r.nama, target: angka(r.target), terkumpul: r.terkumpul ? angka(r.terkumpul) : null, dana: r.dana, ket: r.keterangan,
    }));
    const pengurus = t.Pengurus.filter(r => r.jabatan || r.nama).map(r => ({ jabatan: r.jabatan, nama: r.nama, wa: r.whatsapp }));
    const kegiatan = t.Kegiatan.filter(r => r.nama).map(r => ({ nama: r.nama, jadwal: r.jadwal, ikon: r.ikon }));

    const d = { sumber, profil, kategori, dana, transaksi, program, pengurus, kegiatan, masalah };
    // program yang Terkumpul-nya kosong memakai saldo dananya
    program.forEach(p => { if (p.terkumpul == null) p.terkumpul = saldoDana(d, p.dana); });
    return d;
  }

  // ---------- calculations ----------
  const sign = tx => (tx.jenis === "Masuk" ? tx.nominal : -tx.nominal);
  function saldoDana(d, nama, sampai) {
    const f = d.dana.find(x => x.nama === nama);
    let s = f ? f.saldoAwal : 0;
    const dari = f ? f.per : "0000-00-00";
    d.transaksi.forEach(tx => {
      if (tx.dana === nama && tx.tanggal >= dari && (!sampai || tx.tanggal <= sampai)) s += sign(tx);
    });
    return s;
  }
  // total saldo at end of `sampai` (inclusive), or now
  function saldoTotal(d, sampai) {
    const names = new Set(d.dana.map(f => f.nama));
    d.transaksi.forEach(tx => names.add(tx.dana));
    let s = 0; names.forEach(n => { s += saldoDana(d, n, sampai); });
    return s;
  }
  function arus(d, dari, sampai, filter) {
    let masuk = 0, keluar = 0;
    d.transaksi.forEach(tx => {
      if (tx.tanggal >= dari && tx.tanggal <= sampai && (!filter || filter(tx))) {
        if (tx.jenis === "Masuk") masuk += tx.nominal; else keluar += tx.nominal;
      }
    });
    return { masuk, keluar };
  }
  function perKategori(d, dari, sampai, jenis) {
    const m = new Map(); let total = 0;
    d.transaksi.forEach(tx => {
      if (tx.jenis === jenis && tx.tanggal >= dari && tx.tanggal <= sampai) {
        m.set(tx.kategori, (m.get(tx.kategori) || 0) + tx.nominal); total += tx.nominal;
      }
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([nama, nilai]) => ({ nama, nilai, persen: total ? nilai / total : 0 }));
  }

  // ---------- loading ----------
  async function fetchTab(id, tab) {
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}&_=${Date.now()}`;
    let r;
    try { r = await fetch(url, { cache: "no-store" }); }
    catch (e) { throw new Error("Tidak bisa terhubung ke Google Sheets. Periksa internet, atau pastikan file dibagikan ke 'Siapa saja yang memiliki link'."); }
    if (r.status === 404) throw new Error("ID Google Sheets di config.js tidak ditemukan.");
    if (!r.ok) throw new Error(`Tab ${tab} tidak bisa dibaca (HTTP ${r.status}). Pastikan nama tab tidak diubah.`);
    const text = await r.text();
    if (/^\s*<!DOCTYPE|<html/i.test(text)) throw new Error("Sheets belum dibagikan ke 'Siapa saja yang memiliki link'.");
    return text;
  }
  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) { return null; }
  }
  function writeCache(v) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch (e) { /* abaikan */ } }

  // Apps Script (Sheets tetap privat): satu permintaan, semua tab sekaligus
  async function fetchApi(url) {
    let r;
    try { r = await fetch(url + (url.includes("?") ? "&" : "?") + "_=" + Date.now(), { cache: "no-store", redirect: "follow" }); }
    catch (e) { throw new Error("Tidak bisa terhubung ke server data. Periksa internet, atau pastikan Apps Script sudah di-deploy untuk 'Siapa saja'."); }
    if (!r.ok) throw new Error(`Server data menjawab HTTP ${r.status}. Periksa apiUrl di config.js.`);
    let j;
    try { j = await r.json(); }
    catch (e) { throw new Error("Jawaban server data bukan JSON. Pastikan URL yang disalin berakhiran /exec."); }
    if (!j || !j.tabs || !j.tabs.Transaksi) throw new Error("Data dari Apps Script tidak lengkap (tab Transaksi tidak ada).");
    const raw = {}; TABS.forEach(t => { raw[t] = j.tabs[t] || []; });
    return raw;
  }

  async function muat() {
    const cfg = window.KAS_CONFIG || {};
    const api = (cfg.apiUrl || "").trim();
    const id = (cfg.sheetId || "").trim();
    if (!api && !id) return build(window.KAS_CONTOH, { jenis: "contoh", waktu: new Date().toISOString() });
    try {
      let raw;
      if (api) raw = await fetchApi(api);
      else {
        const texts = await Promise.all(TABS.map(t => fetchTab(id, t).catch(e => (t === "Transaksi" ? Promise.reject(e) : ""))));
        raw = {}; TABS.forEach((t, i) => { raw[t] = texts[i]; });
      }
      const sumber = { jenis: "sheets", waktu: new Date().toISOString() };
      writeCache({ raw, sumber });
      return build(raw, sumber);
    } catch (e) {
      const c = readCache();
      if (c && c.raw) return build(c.raw, Object.assign({}, c.sumber, { jenis: "cache", galat: String(e.message || e) }));
      throw e;
    }
  }

  // Data terakhir yang tersimpan di perangkat, untuk ditampilkan seketika sebelum data baru tiba.
  function muatTersimpan() {
    const cfg = window.KAS_CONFIG || {};
    if (!(cfg.apiUrl || cfg.sheetId)) return null;
    const c = readCache();
    if (!c || !c.raw) return null;
    try { return build(c.raw, Object.assign({}, c.sumber, { jenis: "tersimpan" })); } catch (e) { return null; }
  }

  window.KasData = { muat, muatTersimpan,saldoDana, saldoTotal, arus, perKategori, sign, _parseCSV: parseCSV, _tanggal: tanggal, _angka: angka };
})();
