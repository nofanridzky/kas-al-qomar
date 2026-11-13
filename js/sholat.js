// Jadwal sholat — dihitung di perangkat (tanpa internet) dengan kriteria Kemenag RI:
// Subuh −20°, Isya −18°, Asar bayangan 1× (Syafi'i), ihtiyath +2 menit, Imsak = Subuh − 10 menit.
(function () {
  const RAD = Math.PI / 180;
  const sin = d => Math.sin(d * RAD), cos = d => Math.cos(d * RAD), tan = d => Math.tan(d * RAD);
  const asin = x => Math.asin(x) / RAD, acos = x => Math.acos(x) / RAD, atan2 = (y, x) => Math.atan2(y, x) / RAD;
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };

  // posisi matahari (algoritme USNO) untuk Julian Day jd
  function matahari(jd) {
    const D = jd - 2451545.0;
    const g = fix(357.529 + 0.98560028 * D, 360);
    const q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360);
    const e = 23.439 - 0.00000036 * D;
    const RA = fix(atan2(cos(e) * sin(L), cos(L)) / 15, 24);
    return { dekl: asin(sin(e) * sin(L)), eqt: q / 15 - RA };
  }
  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  // waktu (jam lokal desimal) saat matahari di ketinggian `alt` derajat; arah -1 = pagi, +1 = sore
  function hitung(tgl, lok) {
    const [y, m, d] = tgl.split("-").map(Number);
    const jd0 = julian(y, m, d) - lok.lng / 360;
    const transit = t => 12 - matahari(jd0 + t / 24).eqt;
    const sudut = (alt, t, arah) => {
      const s = matahari(jd0 + t / 24);
      const h = acos((-sin(alt) - sin(s.dekl) * sin(lok.lat)) / (cos(s.dekl) * cos(lok.lat))) / 15;
      return transit(t) + arah * h;
    };
    const asar = t => {
      const s = matahari(jd0 + t / 24);
      const alt = -atan2(1, 1 + tan(Math.abs(lok.lat - s.dekl))); // acot(1 + tan|φ−δ|), dibalik tanda
      return sudut(alt, t, 1);
    };
    const koreksiTinggi = 0.0347 * Math.sqrt(Math.max(0, lok.tinggi || 0));
    const terbitAlt = 0.8333 + koreksiTinggi;
    // dua kali iterasi agar deklinasi diambil pada jam yang tepat
    let t = { subuh: 5, terbit: 6, dhuha: 6.5, dzuhur: 12, asar: 15, maghrib: 18, isya: 19 };
    for (let i = 0; i < 2; i++) {
      t = {
        subuh: sudut(20, t.subuh, -1),
        terbit: sudut(terbitAlt, t.terbit, -1),
        dhuha: sudut(-4.5, t.dhuha, -1),
        dzuhur: transit(t.dzuhur),
        asar: asar(t.asar),
        maghrib: sudut(terbitAlt, t.maghrib, 1),
        isya: sudut(18, t.isya, 1),
      };
    }
    const zona = lok.zona, lng = lok.lng / 15;
    const ke = (x, ih) => {
      let mnt = (x + zona - lng) * 60 + ih;
      mnt = ih >= 0 ? Math.ceil(mnt) : Math.floor(mnt);
      return mnt;
    };
    const IH = 2; // Dzuhur +2,5 menit: cocok dengan tabel Kemenag Denpasar (Agu & Nov 2026)
    const w = {
      subuh: ke(t.subuh, IH), terbit: ke(t.terbit, -IH), dhuha: ke(t.dhuha, IH),
      dzuhur: ke(t.dzuhur, IH + 0.5), asar: ke(t.asar, IH), maghrib: ke(t.maghrib, IH), isya: ke(t.isya, IH),
    };
    w.imsak = w.subuh - 10;
    return w; // menit sejak 00:00 waktu setempat
  }
  const jam = mnt => `${String(Math.floor(mnt / 60) % 24).padStart(2, "0")}:${String(mnt % 60).padStart(2, "0")}`;

  window.KasSholat = { hitung, jam };
  if (typeof module !== "undefined") module.exports = { hitung, jam };
})();
