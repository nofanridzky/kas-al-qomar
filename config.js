// Pengaturan aplikasi Kas Al Qomar. Hanya file ini yang perlu diubah.
window.KAS_CONFIG = {
  // CARA UTAMA (Sheets tetap privat): URL Apps Script yang berakhiran /exec.
  // Lihat PANDUAN-SHEETS.md, bagian "Sambungkan lewat Apps Script".
  apiUrl: "https://script.google.com/macros/s/AKfycbzIaFaqp6xLo_lUJo9ZtDRGN7sc_YAjcNnZeaLtRGZiq6qZ1N6M4eJAxZMPSmj6Bh9T/exec",

  // Halaman pengurus (catat & periksa transaksi). Muncul sebagai tautan kecil di tab Info.
  pengurusUrl: "https://script.google.com/macros/s/AKfycbx4z_rRekaY-vgZ5sFDbbi-dZE8jNmm4lMPfQJQ6CfKvu5LbhF5cjhKr479sLnDnNWH/exec?halaman=pengurus",

  // Cara lama (Sheets harus dibagikan ke "Siapa saja yang memiliki link"):
  // ID Google Sheets, bagian di antara /d/ dan /edit pada link Sheets.
  // Diabaikan bila apiUrl diisi.
  sheetId: "",

  // Bila keduanya kosong, app memakai data contoh.

  // Seberapa sering data dimuat ulang (menit). Layar TV memakai angka ini.
  segarkanMenit: 5,
};
