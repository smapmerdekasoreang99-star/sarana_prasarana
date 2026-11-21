/* Alur bergambar (21 Nov 2026): tombol "Lihat alur" di menu Usulan Perbaikan dan Pengajuan Buku menampilkan langkah-langkah
   per peran. Tombol "Posisi" pada satu usulan menyorot langkah yang sedang berjalan untuk usulan itu.
   Sumber diagram lengkap (di luar aplikasi): RENCANA_SARANA_PRASARANA.md bagian 11 dan RENCANA_PERPUSTAKAAN.md. */
"use strict";
const PERAN_ALUR = {
  pengusul: ["Pengusul", "var(--sakit)"], staf: ["Staf Sarpras", "var(--emas-tua)"], kepala: ["Kepala Sekolah", "var(--gelap)"],
  wakasek: ["Wakasek Kurikulum", "#6A4C93"], pustakawan: ["Pustakawan", "var(--hadir)"], lihat: ["Pengusul dan Kepala Sekolah", "var(--sakit)"],
  pembaca: ["Guru dan siswa", "var(--sakit)"] };
const ALUR = {
  perbaikan: { judul: "Alur Usulan Perbaikan", sub: "Dari kerusakan yang dilihat wali kelas sampai foto hasil perbaikan. Pembayaran lewat bendahara sesuai SOP.",
    langkah: [
      ["pengusul", "Ajukan usulan", "Wali kelas atau penanggung jawab ruang memilih barang atau bagian bangunan, menulis uraian dan dampaknya, dan melampirkan foto keadaan (maks. 2)."],
      ["staf", "Tinjau dan beri tanggapan", "Staf Sarpras menetapkan prioritas dan menulis tanggapan untuk pengusul; wajib bila perbaikan harus menunggu (Bulan ini atau Dianggarkan)."],
      ["kepala", "Mengetahui", "Kepala Sekolah mengetahui usulan; biaya diteruskan ke bendahara."],
      ["staf", "Kerjakan perbaikan", "Menyesuaikan keuangan sekolah. Lama menunggu tampil, dan tanggapan bisa diperbarui kapan saja."],
      ["staf", "Foto hasil, tandai selesai", "Staf Sarpras menandai Sudah diperbaiki dengan tanggal, keterangan, dan foto hasil (tidak wajib)."],
      ["lihat", "Lihat hasil", "Foto sebelum dan sesudah tampil berdampingan. Pengusul mendapat tanda kabar saat masuk."]],
    akhir: "Usulan selesai: sudah diperbaiki." },
  buku: { judul: "Alur Pengajuan Buku", sub: "Dari usulan guru atau siswa sampai buku berlabel dan bisa dipinjam. Pembelian lewat bendahara sesuai keuangan sekolah.",
    langkah: [
      ["pengusul", "Ajukan buku", "Guru lewat menu ini, siswa lewat halaman Pinjam Buku, atau banyak judul sekaligus lewat template Excel."],
      ["wakasek", "Setujui", "Wakasek Kurikulum menilai kesesuaian dengan kurikulum, lalu menyetujui atau menolak dengan alasan."],
      ["kepala", "Mengetahui", "Kepala Sekolah mengetahui. Daftar berkop bisa diunduh sebagai bahan pengadaan."],
      ["pustakawan", "Catat penerimaan", "Saat buku datang, data dari usulan terisi otomatis dan buku masuk katalog."],
      ["pustakawan", "Beri label", "Label punggung, QR, dan barkode dicetak; buku ditata di rak."],
      ["pembaca", "Pinjam bukunya", "Buku tampil di Katalog Buku dan bisa dipinjam."]],
    akhir: "Buku sudah dibeli dan dicatat. Cari di Katalog Buku." } };

/* Posisi satu usulan: kini = nomor langkah yang sedang berjalan (1..n), selesai = semua langkah lewat,
   henti = langkah tempat usulan berhenti (ditolak/digabung) beserta keterangannya. */
function posisiAlur(jenis, x) {
  if (!x) return null;
  if (jenis === "perbaikan") {
    if (x.status === "digabung") return { henti: 2, ket: "Digabung dengan usulan lain untuk kerusakan yang sama; usulan itu yang dilanjutkan." };
    if (x.status === "ditolak") return { henti: x.tinjau_oleh ? 3 : 2, ket: `Ditolak ${x.tolak_oleh || ""}${x.alasan_tolak ? ": " + x.alasan_tolak : ""}` };
    if (x.perbaikan === "sudah") return { selesai: true };
    return { kini: { diajukan: 2, ditinjau: 3, diketahui: 4 }[x.status] || 1 };
  }
  if (x.status === "ditolak") return { henti: x.setuju_oleh ? 3 : 2, ket: `Ditolak ${x.tolak_oleh || ""}${x.alasan_tolak ? ": " + x.alasan_tolak : ""}` };
  if (x.status === "dibeli") return { selesai: true };
  return { kini: { diajukan: 2, disetujui: 3, diketahui: 4 }[x.status] || 1 };
}
function lihatAlur(jenis, x) {
  const A = ALUR[jenis]; if (!A) return;
  const pos = posisiAlur(jenis, x);
  const keadaan = (n) => !pos ? "" : pos.selesai ? "selesai" : pos.henti ? (n < pos.henti ? "selesai" : n === pos.henti ? "henti" : "nanti") : n < pos.kini ? "selesai" : n === pos.kini ? "kini" : "nanti";
  const nama = x ? (jenis === "perbaikan" ? `${x.nama} · ${tempatPbk(x)}` : x.judul) : "";
  const pil = x ? (jenis === "perbaikan" ? statusPbk(x).replace(/<p[\s\S]*$/, "") : `<span class="pil ${ST_AJU[x.status][1]}">${ST_AJU[x.status][0]}</span>`) : "";
  const isi = `<p class="sub">${A.sub}</p>
    ${x ? `<div class="alur-posisi"><span class="kecil">Usulan ini</span><b>${esc(nama)}</b><span>${pil}</span></div>` : ""}
    <ol class="alur-daftar${pos ? " berposisi" : ""}">${A.langkah.map(([peran, judul, ket], i) => {
      const n = i + 1, k = keadaan(n), [pn, warna] = PERAN_ALUR[peran];
      return `<li class="alur-l ${k}" style="--warna:${warna}">
        <span class="alur-tanda" aria-hidden="true">${k === "selesai" ? ikon("centang") : k === "henti" ? ikon("x") : n}</span>
        <div class="alur-isi"><div class="alur-atas"><span class="alur-peran">${pn}</span>${k === "kini" ? `<span class="alur-kini">Di sini sekarang</span>` : ""}</div>
          <b>${n}. ${judul}</b><p>${ket}</p>${k === "henti" ? `<p class="alur-henti">${esc(pos.ket)}</p>` : ""}</div></li>`;
    }).join("")}</ol>
    ${pos && pos.selesai ? `<p class="catatan kabar">${ikon("centang")}<span>${A.akhir}</span></p>` : ""}`;
  dialog({ atas: x ? "Posisi usulan" : "Alur", judul: A.judul, isi, kaki: `<button class="tombol" value="batal" formnovalidate>Tutup</button>`, onSimpan: async () => {} });
}
// Satu pendengar untuk semua tombol alur: data-alur="perbaikan|buku", data-id bila untuk satu usulan.
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-alur]"); if (!b) return;
  const jenis = b.dataset.alur, id = b.dataset.id ? +b.dataset.id : null;
  const x = id == null ? null : (jenis === "perbaikan" ? S.perbaikan : S.pengajuan).find((r) => r.id === id);
  lihatAlur(jenis, x);
});
