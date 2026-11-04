/* Sarana Prasarana — Inventaris Sarana, Alat & Bahan (31 Okt 2026). Lihat RENCANA_SARANA_PRASARANA.md.
   Server: Merdeka Tools (config.js sama dengan Tryout/Matdas/ER). Semua data lewat fungsi sp_*: aplikasi tidak membaca
   tabel langsung. Hak ubah diperiksa di server; tampilan hanya menyembunyikan tombol yang tidak boleh dipakai.
   ?k=<kode> membuka kartu barang tanpa PIN (dari label QR). */
"use strict";

/* ================================================================ server */
const SB = (() => {
  const q = new URLSearchParams(location.search);
  if (q.get("sb") && q.get("key")) return { url: q.get("sb"), key: q.get("key") };
  const c = window.TKA_SUPABASE;
  return c && c.url && c.key ? c : null;
})();
const authJwt = (k) => /^eyJ[\w-]*\.[\w-]+\.[\w-]*$/.test(k || "") ? { Authorization: "Bearer " + k } : {};
async function rpc(fn, args) {
  if (!SB) throw new Error("Server belum diatur (config.js belum ada).");
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 30000);
  let r, t;
  try {
    r = await fetch(`${SB.url}/rest/v1/rpc/${fn}`, {
      method: "POST", signal: ac.signal,
      headers: { "Content-Type": "application/json", apikey: SB.key, ...authJwt(SB.key) },
      body: JSON.stringify(args || {}),
    });
    t = await r.text();
  } catch (e) {
    throw new Error(e.name === "AbortError" ? "Server tidak menjawab dalam 30 detik. Periksa internet lalu coba lagi."
      : "Tidak tersambung ke server. Periksa internet lalu coba lagi.");
  } finally { clearTimeout(tm); }
  let j = null;
  try { j = t ? JSON.parse(t) : null; } catch (e) { /* bukan JSON */ }
  if (!r.ok) throw new Error((j && (j.message || j.hint)) || t || ("Galat " + r.status));
  return j;
}

/* ================================================================ alat bantu */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const bil = (n) => Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const rp = (n) => n == null || n === "" ? "" : "Rp " + Number(n).toLocaleString("id-ID");
const tgl = (s) => s ? new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("tampil"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("tampil"), 3000); }
async function sibuk(fn) { $("sibuk").hidden = false; try { return await fn(); } finally { $("sibuk").hidden = true; } }
function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function ssSet(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* mode privat */ } }
const inisial = (n) => String(n || "?").replace(/,.*$/, "").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();

/* Ikon garis (24 × 24), satu gaya untuk seluruh halaman */
const P = {
  ringkas: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  ruang: '<path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-7h6v7"/><path d="M3 21h18"/>',
  alat: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  sarana: '<path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><path d="M3 11h18v5H3z"/><path d="M5 16v3M19 16v3"/>',
  bahan: '<path d="M9 3h6"/><path d="M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h3v4h-3"/>',
  unggah: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  unduh: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  tambah: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  cari: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  keluar: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  masuk: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
  kembali: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  orang: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  ubah: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  cetak: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  hapus: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  awas: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  centang: '<path d="M20 6 9 17l-5-5"/>',
  kotak: '<path d="m21 8-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  rusak: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  lab: '<path d="M9 3h6M10 3v7l-5 9h14l-5-9V3"/>',
  kelas: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M7 20h10M12 16v4"/>',
  kantor: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  layanan: '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/>',
  lainnya: '<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
  panduan: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  tabel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  dokumen: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  buku: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v17H6.5A2.5 2.5 0 0 0 4 22.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19"/><path d="M8 7h7"/>',
  rak: '<path d="M5 4v16M10 4v16"/><path d="m14.5 4.5 4.5 15.5"/>',
  masukStok: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  keluarStok: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
};
const ikon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
function pasangIkon(root) { (root || document).querySelectorAll("[data-ikon]").forEach((el) => { if (!el.firstChild) el.innerHTML = ikon(el.dataset.ikon); }); }

/* ================================================================ keadaan */
const S = { pin: null, akses: null, kategori: [], katBahan: [], ruang: [], dana: [], guru: null, alat: [], bahan: [],
  tab: "ringkas", ruangBuka: null, segmen: "sarana",
  saring: { q: "", gol: "", kat: "", ruang: "", lengkap: "" }, saringBahan: { q: "", kat: "", ruang: "", status: "" }, saringInduk: { q: "", ruang: "", gol: "", dana: "", tahun: "" }, labelRuang: "", profil: null };
const admin = () => S.akses && S.akses.peran === "admin";
const bisaUbah = () => S.akses && S.akses.peran !== "lihat";
const ruangSaya = () => (S.akses && S.akses.ruang) || [];
// Pojok Literasi hanya menu buku. Penanggung jawab ruang lain, termasuk pustakawan untuk ruang Perpustakaan, melihat barang di ruangnya sendiri.
const ruangBarang = () => ruangSaya().filter((k) => k !== "LIT");
const pjRuang = () => S.akses && S.akses.peran === "pj";
const ruangTampil = () => pjRuang() ? S.ruang.filter((r) => ruangBarang().includes(r.kode)) : S.ruang;
const ruangSatu = () => pjRuang() && ruangBarang().length === 1 ? ruangBarang()[0] : null;
const opsiTanpaRuang = (v) => pjRuang() ? "" : opsi([["-", "Belum ada ruang"]], v);
const bolehRuang = (r) => admin() || (pjRuang() && !!r && ruangBarang().includes(r));
const katOf = (k) => S.kategori.find((x) => x.kode === k) || {};
const namaKat = (k) => katOf(k).nama || k;
const golongan = (a) => katOf(a.kategori).golongan || "alat";
const ruangOf = (k) => S.ruang.find((x) => x.kode === k);
const namaRuang = (k) => (ruangOf(k) || {}).nama || "";
const BOS = (d) => /^BOS/.test(d || "");
const urlKartu = (kode) => location.origin + location.pathname + "?k=" + encodeURIComponent(kode);
const JENIS_RUANG = { lab: ["Laboratorium", "lab"], layanan: ["Ruang layanan", "layanan"], kantor: ["Kantor", "kantor"], kelas: ["Ruang kelas", "kelas"], lainnya: ["Lainnya", "lainnya"] };
const warnaRuang = (j) => `--warna: var(--r-${JENIS_RUANG[j] ? j : "lainnya"}); --warna-muda: var(--r-${JENIS_RUANG[j] ? j : "lainnya"}-muda);`;

function kurang(a) {
  const k = [];
  if (!a.ruang) k.push("Ruang");
  if (!a.jumlah_pasti) k.push("Jumlah");
  if (!a.tahun) k.push("Tahun");
  if (!a.sumber_dana) k.push("Dana");
  if (a.harga_satuan == null) k.push("Harga");
  if (BOS(a.sumber_dana) && !a.kode_arkas) k.push("Kode ARKAS");
  return k;
}
function statusBahan(b) {
  const s = Number(b.stok), m = Number(b.batas_min);
  if (s <= 0) return ["Habis", "k"];
  if (m > 0 && s <= m) return ["Menipis", "c"];
  return ["Cukup", "b"];
}

/* ================================================================ kartu publik (QR) */
async function kartuPublik(kode) {
  const el = $("layar-publik");
  el.hidden = false;
  el.innerHTML = `<section class="kartu"><p class="sub">Memuat kartu barang ${esc(kode)}…</p></section>`;
  try {
    const b = await rpc("sp_barang_publik", { p_kode: kode });
    if (!b) { el.innerHTML = `<section class="kartu kartu-publik"><div class="kosong">${ikon("cari")}<h2>Kode tidak ditemukan</h2><p class="sub">Kode ${esc(kode)} belum tercatat di inventaris. Laporkan ke Staf Sarpras.</p></div></section>`; return; }
    const jml = b.baik + b.rusak_ringan + b.rusak_berat;
    el.innerHTML = `<section class="kartu kartu-publik">
      <div class="kepala-pub"><span class="lambang">${ikon("kotak")}</span><div><p class="kode">${esc(b.kode)}</p><h1>${esc(b.nama)}</h1></div></div>
      ${b.status === "dihapus" ? `<p class="catatan awas">${ikon("awas")}<span>Barang ini sudah dihapus dari inventaris.</span></p>` : ""}
      <dl class="dl">
        <dt>Kategori</dt><dd>${esc(b.kategori)}</dd>
        <dt>Ruang</dt><dd>${esc(b.ruang || "Belum diisi")}</dd>
        <dt>Penanggung jawab</dt><dd>${esc(b.pj || "Staf Sarpras")}</dd>
        <dt>Jumlah &amp; kondisi</dt><dd>${b.jumlah_pasti ? jml + " unit" : "Belum dihitung"}<br><span class="pil b">Baik ${b.baik}</span>${b.rusak_ringan ? `<span class="pil c">Rusak ringan ${b.rusak_ringan}</span>` : ""}${b.rusak_berat ? `<span class="pil k">Rusak berat ${b.rusak_berat}</span>` : ""}</dd>
        ${b.merek ? `<dt>Merek</dt><dd>${esc(b.merek)}</dd>` : ""}
        <dt>Tahun perolehan</dt><dd>${esc(b.tahun || "Belum diisi")}</dd>
        <dt>Sumber dana</dt><dd>${esc(b.sumber_dana || "Belum diisi")}</dd>
      </dl>
      <p class="catatan">${ikon("info")}<span>Menemukan kerusakan? Sampaikan ke penanggung jawab ruang di atas.</span></p>
      <a class="tombol utama besar" href="${esc(location.pathname)}">${ikon("masuk")}Masuk untuk mengubah</a>
    </section>`;
  } catch (e) {
    el.innerHTML = `<section class="kartu"><p class="galat">${esc(e.message)}</p></section>`;
  }
}

/* ================================================================ masuk */
async function masuk(pin) {
  const d = await rpc("sp_masuk", { p_pin: pin });
  Object.assign(S, { pin, akses: d.akses, kategori: d.kategori, katBahan: d.kategori_bahan || [], ruang: d.ruang, dana: d.dana, guru: d.guru });
  [S.alat, S.bahan, S.profil] = await Promise.all([rpc("sp_alat_daftar", { p_pin: pin }), rpc("sp_bahan_daftar", { p_pin: pin }),
    rpc("sp_profil", { p_pin: pin }).catch(() => null)]);
  await muatPerpus();
  batasiKeRuangSaya();
  ssSet("sp_pin", pin);
  $("layar-masuk").hidden = true; $("layar-app").hidden = false;
  const peran = { admin: "Staf Sarpras · semua ruang", pj: "Penanggung jawab · " + ruangSaya().map(namaRuang).join(", "), lihat: pimpinanSaja() ? (punyaJabatan("kepala_sekolah") ? "Kepala Sekolah" : "Wakasek Kurikulum") : "Hanya melihat" }[S.akses.peran];
  $("pengguna").innerHTML = `<span class="chip"><span class="avatar">${esc(inisial(S.akses.nama))}</span><span class="nama"><b>${esc(S.akses.nama)}</b><span>${esc(peran)}</span></span></span>
    <button class="tombol-atas" id="keluar" type="button">${ikon("keluar")}<span class="t">Keluar</span></button>`;
  $("pengguna").hidden = false;
  $("keluar").onclick = keluar;
  document.querySelectorAll("[data-admin]").forEach((b) => (b.hidden = !admin()));
  aturTab();
  aturPanduan(panduanSaya());
  buka(admin() ? "ringkas" : aksesBuku() ? "buku" : pimpinan() && S.pengajuan.some(aksiAju) ? "pengajuan" : pimpinan() && S.penghapusan.some(aksiHps) ? "hapusan" : S.pengingat.terlambat.length ? "pengingat" : pimpinanSaja() ? (punyaJabatan("kepala_sekolah") ? "ringkas" : "pengajuan") : "ruang");
  bukaPindaianAlamat();
}
async function muatUlang() {
  [S.alat, S.bahan, S.ruang] = await Promise.all([rpc("sp_alat_daftar", { p_pin: S.pin }), rpc("sp_bahan_daftar", { p_pin: S.pin }),
    rpc("sp_masuk", { p_pin: S.pin }).then((d) => d.ruang)]);
  await muatPerpus();
  batasiKeRuangSaya();
}
function batasiKeRuangSaya() {
  if (!pjRuang()) return;
  S.alat = S.alat.filter((a) => ruangBarang().includes(a.ruang));
  S.bahan = S.bahan.filter((b) => ruangBarang().includes(b.ruang));
}
// Tiap peran hanya melihat menu bagiannya; admin dan guru yang hanya melihat tetap melihat semua menu.
// Bila menunya lebih dari BATAS_MENU, menu sejenis jadi satu kelompok dengan tab di baris kedua.
const KELOMPOK = { grupruang: ["ruang", "alat", "bahan", "induk", "label"], grupbuku: ["buku", "pinjam", "labelbuku", "terima", "pengingat"], grupusulan: ["pengajuan", "hapusan"] };
const BATAS_MENU = 5;
const tombolMenu = (k) => document.querySelector(`#tab [data-tab="${k}"]`);
const namaKelompok = (k) => ({
  grupruang: !pjRuang() ? "Inventaris" : ruangBarang().length === 1 ? "Ruang " + namaRuang(ruangBarang()[0]) : "Ruang Saya",
  grupbuku: bukuLiterasi() ? "Buku Literasi" : "Buku", grupusulan: "Pengajuan & Penghapusan" }[k]);
// Pimpinan yang tidak memegang ruang: Wakasek Kurikulum hanya persetujuan; Kepala Sekolah ditambah pantauan.
const pimpinanSaja = () => S.akses.peran === "lihat" && pimpinan();
const MENU_PIMPINAN = () => ["pengajuan", "hapusan", "pengingat", ...(punyaJabatan("kepala_sekolah") ? ["ringkas", "induk"] : [])];
function aturTab() {
  const pj = pjRuang(), barang = !pj || ruangBarang().length > 0;
  const boleh = { ringkas: !pj, ruang: barang, alat: barang, bahan: barang, induk: barang, label: barang,
    buku: !pj || !!aksesBuku(), pinjam: !!aksesBuku(), labelbuku: !!aksesBuku(), terima: bukuSemua(), pengajuan: !pj || !!aksesBuku() || pimpinan(), hapusan: admin() || !!aksesBuku() || (pj && ruangBarang().length > 0) || pimpinan(), pengingat: (S.akses.wali || []).length > 0 || S.pengingat.terlambat.length > 0, profil: barang || bukuSemua() };
  if (pimpinanSaja()) Object.keys(boleh).forEach((k) => { if (!MENU_PIMPINAN().includes(k)) boleh[k] = false; });
  document.querySelectorAll("#tab button[data-tab]").forEach((b) => { b.hidden = !boleh[b.dataset.tab]; });
  const adaTugas = (s) => s ? ` (${s})` : "";
  document.querySelector('#tab [data-tab="pengajuan"]').lastChild.textContent = "Pengajuan Buku" + adaTugas(S.pengajuan.filter(aksiAju).length);
  document.querySelector('#tab [data-tab="hapusan"]').lastChild.textContent = "Penghapusan" + adaTugas(S.penghapusan.filter(aksiHps).length);
  document.querySelector('#tab [data-tab="buku"]').lastChild.textContent = bukuLiterasi() ? "Koleksi Literasi" : "Katalog Buku";
  document.querySelector('#tab [data-tab="pengingat"]').lastChild.textContent = "Pengingat Buku" + (S.pengingat.terlambat.length ? ` (${S.pengingat.terlambat.length})` : "");
  // Pengingat tidak ikut dihitung, supaya susunan menu tidak berubah hanya karena ada yang terlambat.
  const banyak = Object.keys(boleh).filter((k) => boleh[k] && k !== "pengingat").length > BATAS_MENU;
  S.grupMenu = {};
  Object.entries(KELOMPOK).forEach(([g, sub]) => {
    const isi = sub.filter((k) => boleh[k]), aktif = banyak && isi.length > 1;
    tombolMenu(g).hidden = !aktif;
    if (!aktif) return;
    isi.forEach((k) => { S.grupMenu[k] = g; tombolMenu(k).hidden = true; });
    const tugas = isi.reduce((n, k) => n + +(tombolMenu(k).textContent.match(/\((\d+)\)$/) || [0, 0])[1], 0);
    tombolMenu(g).lastChild.textContent = namaKelompok(g) + adaTugas(tugas);
  });
  // Pustakawan: buku lebih dulu, ruangnya di akhir sebelum Profil Dokumen.
  tombolMenu(pj && bukuSemua() ? "profil" : "ruang").before(tombolMenu("grupruang"));
}
function keluar() { ssSet("sp_pin", null); location.href = location.pathname; }

/* ================================================================ panduan per peran */
const PANDUAN = {
  staf: ["Panduan_Sarana_Prasarana", "Staf Sarpras dan admin", "Inventaris semua ruang, Buku Induk, unggah data, dan label QR."],
  pimpinan: ["Panduan_Pimpinan", "Wakasek Kurikulum dan Kepala Sekolah", "Menyetujui dan mengetahui pengajuan serta penghapusan."],
  wali: ["Panduan_Wali_Kelas", "Wali kelas dan guru", "Membaca pengingat buku yang terlambat."],
  pj: ["Panduan_Penanggung_Jawab_Ruang", "Penanggung jawab ruang", "Mencatat inventaris ruang Anda: UKS, Lab IPA, Lab Komputer, dan lainnya."],
  perpus: ["Panduan_Perpustakaan", "Perpustakaan", "Katalog buku, peminjaman, dan penerimaan buku."],
  literasi: ["Panduan_Pojok_Literasi", "Pojok Literasi", "Mengelola novel dan bacaan literasi, termasuk peminjamannya."],
  siswa: ["Panduan_Pinjam_Buku_Siswa", "Pinjam buku (siswa)", "Meminjam buku dari HP dengan NISN."],
};
function panduanSaya() {
  const wali = [...(pimpinan() && S.akses.id !== "ADMIN" ? ["pimpinan"] : []), ...((S.akses.wali || []).length || S.pengingat.terlambat.length ? ["wali"] : [])];
  if (pimpinanSaja()) return wali;
  if (!pjRuang()) return ["staf", ...(bukuSemua() ? ["perpus"] : []), ...wali];
  return [...(bukuSemua() ? ["perpus"] : []), ...(bukuLiterasi() ? ["literasi"] : []), ...(ruangBarang().length ? ["pj"] : []), ...wali];
}
function aturPanduan(kunci) {
  $("panduan-menu").innerHTML = kunci.map((k) => { const [berkas, judul, ket] = PANDUAN[k];
    return `<p><b>${esc(judul)}</b><br>${esc(ket)}</p><a href="${berkas}.pdf" target="_blank" rel="noopener">Buka panduan (PDF)<small>Langsung terbuka di browser, cocok untuk HP</small></a><a href="${berkas}.docx" download>Unduh versi Word (.docx)<small>Untuk dicetak atau disunting</small></a>`; }).join("");
}

/* ================================================================ tab */
const TAB = {};
function buka(tab, tetap) {
  const grupMenu = S.grupMenu || {};
  if (KELOMPOK[tab]) tab = (S.subMenu || {})[tab] || KELOMPOK[tab].find((k) => grupMenu[k] === tab);
  if (!TAB[tab]) tab = "ringkas";
  if (tab !== S.tab && !tetap) S.ruangBuka = null;
  S.tab = tab;
  const diGrup = grupMenu[tab];
  if (diGrup) (S.subMenu = S.subMenu || {})[diGrup] = tab;
  document.querySelectorAll("#tab button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === (diGrup || tab)));
  $("subtab").hidden = !diGrup;
  $("subtab").innerHTML = diGrup ? KELOMPOK[diGrup].filter((k) => grupMenu[k] === diGrup).map((k) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${k === tab}">${tombolMenu(k).innerHTML}</button>`).join("") : "";
  $("isi").innerHTML = TAB[tab]();
  if (TAB[tab].sesudah) TAB[tab].sesudah();
}
const segarkan = () => buka(S.tab, true);

/* ---------------------------------------------------------------- ringkasan */
TAB.ringkas = () => {
  const A = S.alat, B = S.bahan, unit = A.reduce((s, a) => s + a.jumlah, 0);
  const rr = A.reduce((s, a) => s + a.rusak_ringan, 0), rb = A.reduce((s, a) => s + a.rusak_berat, 0);
  const tipis = B.filter((b) => statusBahan(b)[1] !== "b").length;
  const tidakLengkap = A.filter((a) => kurang(a).length).length;
  const perKat = S.kategori.map((k) => [k.nama, A.filter((a) => a.kategori === k.kode).length, k.golongan]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]);
  const mk = Math.max(1, ...perKat.map((x) => x[1]));
  const isian = ["Ruang", "Jumlah", "Tahun", "Dana", "Harga", "Kode ARKAS"].map((n) => [n, A.filter((a) => kurang(a).includes(n)).length]);
  const sapa = S.akses.peran === "pj" ? `<p class="catatan emas">${ikon("orang")}<span>Anda penanggung jawab <b>${esc(ruangSaya().map(namaRuang).join(", "))}</b>. Buka tab Ruang untuk mencatat sarana, alat, dan bahan di ruang Anda.</span></p>` : "";
  return `${sapa}
  <div class="ubin">
    <div class="i"><span class="lambang">${ikon("kotak")}</span><span><b>${bil(A.length)}</b><span class="t">jenis sarana &amp; alat · ${bil(unit)} unit</span></span></div>
    <div class="${rr + rb ? "k" : "b"}"><span class="lambang">${ikon(rr + rb ? "rusak" : "centang")}</span><span><b>${bil(rr + rb)}</b><span class="t">unit rusak (ringan ${bil(rr)}, berat ${bil(rb)})</span></span></div>
    <div class="${tipis ? "c" : "b"}"><span class="lambang">${ikon("bahan")}</span><span><b>${bil(B.length)}</b><span class="t">jenis bahan · ${tipis} menipis atau habis</span></span></div>
    <div class="${tidakLengkap ? "c" : "b"}"><span class="lambang">${ikon("ubah")}</span><span><b>${bil(tidakLengkap)}</b><span class="t">data sarana &amp; alat belum lengkap</span></span></div>
  </div>
  <div class="grid2">
    <section class="kartu"><div class="kepala-bagian"><div><h2>Per kategori</h2><p class="sub">Biru = sarana (perabot &amp; perlengkapan ruang), emas = alat.</p></div></div>
      <div class="batang">${perKat.map(([n, v, g]) => `<div class="r"><span>${esc(n)}</span><div class="jalur"><i class="${g === "alat" ? "c" : ""}" style="width:${(v / mk) * 100}%"></i></div><span class="n">${v}</span></div>`).join("") || `<div class="kosong">${ikon("kotak")}<span>Belum ada data. Unggah BUKU INDUK.xlsx lewat menu Buku Induk → Unggah data.</span></div>`}</div>
    </section>
    <section class="kartu"><div class="kepala-bagian"><div><h2>Isian yang masih kosong</h2><p class="sub">Jumlah jenis sarana &amp; alat yang isiannya belum diisi. Kode ARKAS hanya untuk barang dana BOS.</p></div>
      ${pimpinanSaja() ? "" : `<button class="tombol kecil" type="button" id="b-lengkapi">${ikon("ubah")}Lengkapi</button>`}</div>
      <div class="batang">${isian.map(([n, v]) => `<div class="r"><span>${esc(n)}</span><div class="jalur"><i class="k" style="width:${A.length ? (v / A.length) * 100 : 0}%"></i></div><span class="n">${v}</span></div>`).join("")}</div>
    </section>
  </div>`;
};
TAB.ringkas.sesudah = () => { if ($("b-lengkapi")) $("b-lengkapi").onclick = () => { S.saring = { q: "", gol: "", kat: "", ruang: "", lengkap: "tidak" }; buka("alat"); }; };

/* ---------------------------------------------------------------- ruang: denah & halaman ruang */
function hitungRuang(kode) {
  const A = S.alat.filter((a) => a.ruang === kode), B = S.bahan.filter((b) => b.ruang === kode);
  return { sarana: A.filter((a) => golongan(a) === "sarana"), alat: A.filter((a) => golongan(a) === "alat"), bahan: B,
    rusak: A.reduce((s, a) => s + a.rusak_ringan + a.rusak_berat, 0), tipis: B.filter((b) => statusBahan(b)[1] !== "b").length,
    belum: A.filter((a) => kurang(a).length).length };
}
TAB.ruang = () => { if (!S.ruangBuka && ruangSatu()) S.ruangBuka = ruangSatu(); return S.ruangBuka ? halamanRuang(S.ruangBuka) : denah(); };
function denah() {
  const urut = ["lab", "layanan", "kantor", "kelas", "lainnya"];
  const aktif = ruangTampil().filter((r) => r.aktif);
  const tanpa = { sarana: S.alat.filter((a) => !a.ruang && golongan(a) === "sarana").length, alat: S.alat.filter((a) => !a.ruang && golongan(a) === "alat").length, bahan: S.bahan.filter((b) => !b.ruang).length };
  const kotak = (r) => {
    const h = hitungRuang(r.kode), saya = ruangSaya().includes(r.kode);
    return `<button class="ruang-kotak${saya ? " saya" : ""}" type="button" data-ruang="${esc(r.kode)}" style="${warnaRuang(r.jenis)}" aria-label="${esc(r.nama)}, ${h.sarana.length} sarana, ${h.alat.length} alat, ${h.bahan.length} bahan">
      <span class="atas-kotak"><span class="lambang">${ikon(JENIS_RUANG[r.jenis] ? r.jenis : "lainnya")}</span>
        <span class="judul-kotak"><b>${esc(r.nama)}</b><span class="pj">${ikon("orang")}${esc(r.pj_nama)}</span></span></span>
      <span class="tanda">${r.rombel ? `<span class="pil i">${esc(r.rombel)}</span>` : ""}${saya ? '<span class="pil saya">Ruang saya</span>' : ""}${h.rusak ? `<span class="pil k">${h.rusak} rusak</span>` : ""}${h.tipis ? `<span class="pil c">${h.tipis} bahan menipis</span>` : ""}${h.belum ? `<span class="pil n">${h.belum} belum lengkap</span>` : ""}</span>
      <span class="hitung3"><span><b>${h.sarana.length}</b><small>Sarana</small></span><span><b>${h.alat.length}</b><small>Alat</small></span><span><b>${h.bahan.length}</b><small>Bahan</small></span></span>
    </button>`;
  };
  const kelompok = urut.map((j) => {
    const rs = aktif.filter((r) => r.jenis === j);
    if (!rs.length && !(j === "kelas" && admin())) return "";
    return `<section class="kelompok-ruang"><h3>${ikon(j)} ${JENIS_RUANG[j][0]} <small>${rs.length} ruang</small></h3>
      <div class="denah">${rs.map(kotak).join("")}${j === "kelas" && admin() ? `<button class="ruang-kotak ruang-tambah" type="button" data-tambah="kelas">${ikon("tambah")}<span>Tambah ruang kelas</span></button>` : ""}</div></section>`;
  }).join("");
  const tidakAktif = ruangTampil().filter((r) => !r.aktif);
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Denah ruang</h2><p class="sub">Pilih ruang untuk melihat sarana, alat, dan bahan di dalamnya. ${S.akses.peran === "pj" ? "Ruang Anda bertanda emas." : ""}</p></div>
      <div class="aksi">${pjRuang() ? "" : tombolBerkas("ruang", "b-unduh-ruang")}${admin() ? `<button class="tombol" type="button" id="b-pasang-rombel">${ikon("kelas")}Pasangkan rombel</button><button class="tombol utama" type="button" id="b-ruang-baru">${ikon("tambah")}Tambah ruang</button>` : ""}</div></div>
    <div class="legenda">${urut.map((j) => `<span style="${warnaRuang(j)}"><i></i>${JENIS_RUANG[j][0]}</span>`).join("")}</div>
  </section>
  ${kelompok}
  ${tanpa.sarana + tanpa.alat + tanpa.bahan ? `<section class="kelompok-ruang"><h3>${ikon("awas")} Belum ada ruang <small>perlu ditempatkan</small></h3><div class="denah">
    <button class="ruang-kotak" type="button" data-ruang="-" style="--warna: var(--absen); --warna-muda: var(--absen-muda);">
      <span class="atas-kotak"><span class="lambang">${ikon("awas")}</span><span class="judul-kotak"><b>Tanpa ruang</b><span class="pj">${ikon("orang")}Staf Sarpras</span></span></span>
      <span class="tanda"><span class="pil k">Tentukan ruangnya</span></span>
      <span class="hitung3"><span><b>${tanpa.sarana}</b><small>Sarana</small></span><span><b>${tanpa.alat}</b><small>Alat</small></span><span><b>${tanpa.bahan}</b><small>Bahan</small></span></span>
    </button></div></section>` : ""}
  ${tidakAktif.length && admin() ? `<p class="kecil">Ruang tidak dipakai: ${tidakAktif.map((r) => `<a href="#" data-ubah-ruang="${esc(r.kode)}">${esc(r.nama)}</a>`).join(", ")}</p>` : ""}`;
}
function halamanRuang(kode) {
  const r = kode === "-" ? { kode: "-", nama: "Barang tanpa ruang", jenis: "lainnya", pj_nama: "Staf Sarpras" } : ruangOf(kode);
  if (!r) { S.ruangBuka = null; return denah(); }
  const h = kode === "-" ? { sarana: S.alat.filter((a) => !a.ruang && golongan(a) === "sarana"), alat: S.alat.filter((a) => !a.ruang && golongan(a) === "alat"), bahan: S.bahan.filter((b) => !b.ruang), rusak: 0, tipis: 0 } : hitungRuang(kode);
  const boleh = kode === "-" ? admin() : bolehRuang(kode);
  const seg = S.segmen;
  const daftar = seg === "bahan" ? h.bahan : h[seg];
  const unit = (xs) => xs.reduce((s, a) => s + a.jumlah, 0);
  const tombolTambah = !boleh ? "" : seg === "bahan"
    ? `<button class="tombol utama" type="button" id="b-tambah-di">${ikon("tambah")}Tambah bahan</button>`
    : `<button class="tombol utama" type="button" id="b-tambah-di">${ikon("tambah")}Catat ${seg === "sarana" ? "sarana" : "alat"}</button>`;
  return `<button class="tombol hantu kembali" type="button" id="b-kembali">${ikon("kembali")}Semua ruang</button>
  <section class="kartu ruang-kepala" style="${warnaRuang(r.jenis)}">
    <div class="baris1"><span class="lambang">${ikon(JENIS_RUANG[r.jenis] ? r.jenis : "lainnya")}</span>
      <div class="teks"><h1>${esc(r.nama)}</h1>
        <div class="meta"><span>${ikon("orang")}${esc(r.pj_nama)}</span>${kode !== "-" ? `<span class="kode">${esc(r.kode)}</span><span>${esc(JENIS_RUANG[r.jenis] ? JENIS_RUANG[r.jenis][0] : "")}</span>` : ""}</div></div>
      <div class="aksi">
        ${kode !== "-" ? `<button class="tombol" type="button" id="b-label-ruang">${ikon("cetak")}Label ruang ini</button>` : ""}
        ${admin() && kode !== "-" ? `<button class="tombol" type="button" id="b-ubah-ruang">${ikon("ubah")}Ubah ruang</button>` : ""}
      </div></div>
    <div class="ubin">
      <div class="i"><span class="lambang">${ikon("sarana")}</span><span><b>${h.sarana.length}</b><span class="t">sarana · ${bil(unit(h.sarana))} unit</span></span></div>
      <div class="i"><span class="lambang">${ikon("alat")}</span><span><b>${h.alat.length}</b><span class="t">alat · ${bil(unit(h.alat))} unit</span></span></div>
      <div class="${h.tipis ? "c" : "i"}"><span class="lambang">${ikon("bahan")}</span><span><b>${h.bahan.length}</b><span class="t">bahan${h.tipis ? ` · ${h.tipis} menipis` : ""}</span></span></div>
      <div class="${h.rusak ? "k" : "b"}"><span class="lambang">${ikon(h.rusak ? "rusak" : "centang")}</span><span><b>${h.rusak}</b><span class="t">unit rusak</span></span></div>
    </div>
    ${!boleh && bisaUbah() ? `<p class="catatan">${ikon("info")}<span>Ruang ini dikelola ${esc(r.pj_nama)}. Anda hanya dapat melihat isinya.</span></p>` : ""}
  </section>
  <section class="kartu">
    <div class="kepala-bagian">
      <div class="segmen" role="group" aria-label="Jenis isi ruang">
        ${[["sarana", "Sarana", h.sarana.length], ["alat", "Alat", h.alat.length], ["bahan", "Bahan", h.bahan.length]].map(([k, n, j]) =>
          `<button type="button" data-seg="${k}" aria-pressed="${seg === k}">${ikon(k)}${n}<span class="jml">${j}</span></button>`).join("")}
      </div>
      <div class="aksi">${tombolTambah}</div>
    </div>
    <p class="sub">${seg === "sarana" ? "Sarana: perabot dan perlengkapan ruang (mebel, papan tulis, gorden, jam dinding, dan sejenisnya)." : seg === "alat" ? "Alat: peralatan yang dipakai untuk kegiatan (elektronik, alat lab, olahraga, kesenian, kebersihan, UKS, dan sejenisnya)." : "Bahan: barang habis pakai yang dicatat stoknya."}</p>
    ${seg === "bahan" ? tabelBahan(daftar, { tanpaRuang: true }) : tabelAlat(daftar, { tanpaRuang: true })}
  </section>`;
}
TAB.ruang.sesudah = () => {
  const isi = $("isi");
  isi.querySelectorAll("[data-ruang]").forEach((b) => b.onclick = () => { S.ruangBuka = b.dataset.ruang; S.segmen = "sarana"; segarkan(); window.scrollTo(0, 0); });
  isi.querySelectorAll("[data-tambah]").forEach((b) => b.onclick = () => formRuang(null, b.dataset.tambah));
  isi.querySelectorAll("[data-ubah-ruang]").forEach((a) => a.onclick = (e) => { e.preventDefault(); formRuang(ruangOf(a.dataset.ubahRuang)); });
  if ($("b-ruang-baru")) $("b-ruang-baru").onclick = () => formRuang(null);
  if ($("b-pasang-rombel")) $("b-pasang-rombel").onclick = formPasangRombel;
  if ($("b-unduh-ruang")) { $("b-unduh-ruang").onclick = unduhRuang; pasangTombolBerkas(isi); }
  if (!S.ruangBuka) return;
  $("b-kembali").onclick = () => { S.ruangBuka = null; segarkan(); };
  if (ruangSatu()) $("b-kembali").hidden = true;
  isi.querySelectorAll("[data-seg]").forEach((b) => b.onclick = () => { S.segmen = b.dataset.seg; segarkan(); });
  const ruangIni = S.ruangBuka === "-" ? "" : S.ruangBuka;
  if ($("b-tambah-di")) $("b-tambah-di").onclick = () => S.segmen === "bahan" ? formBahan(null, ruangIni)
    : formAlat(null, { ruang: ruangIni, kategori: S.segmen === "sarana" ? "F" : "" });
  if ($("b-label-ruang")) $("b-label-ruang").onclick = () => { S.labelRuang = S.ruangBuka; buka("label"); };
  if ($("b-ubah-ruang")) $("b-ubah-ruang").onclick = () => formRuang(ruangOf(S.ruangBuka));
  pasangKlikTabel(isi);
};

/* ---------------------------------------------------------------- tabel bersama */
function tabelAlat(d, o = {}) {
  if (!d.length) return `<div class="kosong">${ikon("kotak")}<span>Belum ada yang tercatat di sini.</span></div>`;
  return `<div class="gulir"><table><thead><tr><th>Nama</th>${o.tanpaRuang ? "" : "<th>Ruang</th>"}<th>Kategori</th><th class="n">Jumlah</th><th>Kondisi</th><th>Dana · tahun</th><th>Belum diisi</th></tr></thead><tbody>
  ${d.map((a) => {
    const k = kurang(a).filter((x) => !(o.tanpaRuang && x === "Ruang"));
    return `<tr class="klik" tabindex="0" data-alat="${a.id}"><td class="nama-sel"><b>${esc(a.nama)}</b><p class="kecil kode">${esc(a.kode)}${a.merek ? " · " + esc(a.merek) : ""}</p></td>
      ${o.tanpaRuang ? "" : `<td>${a.ruang ? esc(namaRuang(a.ruang)) : '<span class="pil k">Belum ada</span>'}</td>`}
      <td>${esc(namaKat(a.kategori))}</td><td class="n">${a.jumlah_pasti ? bil(a.jumlah) : '<span class="pil n">?</span>'}</td>
      <td>${a.rusak_ringan + a.rusak_berat ? `${a.baik ? `<span class="pil b">Baik ${a.baik}</span>` : ""}${a.rusak_ringan ? `<span class="pil c">RR ${a.rusak_ringan}</span>` : ""}${a.rusak_berat ? `<span class="pil k">RB ${a.rusak_berat}</span>` : ""}` : '<span class="pil b">Baik</span>'}</td>
      <td>${esc(a.sumber_dana || "—")}${a.tahun ? ` · ${a.tahun}` : ""}</td>
      <td>${k.length ? k.map((x) => `<span class="pil ${x === "Ruang" || x === "Kode ARKAS" ? "k" : "n"}">${x}</span>`).join("") : '<span class="pil b">Lengkap</span>'}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}
function tabelBahan(d, o = {}) {
  if (!d.length) return `<div class="kosong">${ikon("bahan")}<span>Belum ada bahan yang dicatat di sini.</span></div>`;
  return `<div class="gulir"><table><thead><tr><th>Bahan</th>${o.tanpaRuang ? "" : "<th>Ruang</th>"}<th>Kategori</th><th>Stok</th><th class="n">Batas minimum</th><th>Status</th><th></th></tr></thead><tbody>
  ${d.map((b) => {
    const [st, kl] = statusBahan(b), s = Number(b.stok), m = Number(b.batas_min);
    const lebar = Math.min(100, m > 0 ? (s / (m * 3)) * 100 : s > 0 ? 100 : 0);
    const boleh = bolehRuang(b.ruang);
    return `<tr class="klik" tabindex="0" data-bahan="${b.id}"><td class="nama-sel"><b>${esc(b.nama)}</b>${b.keterangan ? `<p class="kecil">${esc(b.keterangan)}</p>` : ""}</td>
      ${o.tanpaRuang ? "" : `<td>${b.ruang ? esc(namaRuang(b.ruang)) : '<span class="pil k">Belum ada</span>'}</td>`}
      <td>${esc(b.kategori)}</td>
      <td><div class="stok"><span><b>${bil(s)}</b> ${esc(b.satuan)}</span><span class="jalur"><i class="${kl === "b" ? "" : kl}" style="width:${lebar}%"></i></span></div></td>
      <td class="n">${m ? bil(m) : "—"}</td><td><span class="pil ${kl}">${st}</span></td>
      <td class="n">${boleh ? `<span class="aksi" style="justify-content:flex-end"><button class="tombol kecil" type="button" data-gerak="masuk" data-id="${b.id}">${ikon("masukStok")}Masuk</button><button class="tombol kecil" type="button" data-gerak="keluar" data-id="${b.id}">${ikon("keluarStok")}Keluar</button></span>` : ""}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}
function pasangKlikTabel(root) {
  root.querySelectorAll("[data-gerak]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); formGerak(S.bahan.find((x) => x.id === +b.dataset.id), b.dataset.gerak); });
  const bukaBaris = (tr) => { if (tr.dataset.alat) bukaAlat(+tr.dataset.alat); else if (tr.dataset.bahan) kartuBahan(+tr.dataset.bahan); };
  root.querySelectorAll("tr.klik").forEach((tr) => {
    tr.onclick = () => bukaBaris(tr);
    tr.onkeydown = (e) => { if (e.target === tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); bukaBaris(tr); } };
  });
}

/* ---------------------------------------------------------------- sarana & alat */
function saringAlat() {
  const { q, gol, kat, ruang, lengkap } = S.saring, qq = q.toLowerCase();
  return S.alat.filter((a) => (!qq || (a.nama + " " + a.kode + " " + (a.merek || "")).toLowerCase().includes(qq))
    && (!gol || golongan(a) === gol) && (!kat || a.kategori === kat)
    && (!ruang || (ruang === "-" ? !a.ruang : ruang === "@saya" ? ruangSaya().includes(a.ruang) : a.ruang === ruang))
    && (!lengkap || (lengkap === "ya" ? !kurang(a).length : kurang(a).length)));
}
const opsi = (arr, v) => arr.map(([k, n]) => `<option value="${esc(k)}"${String(k) === String(v ?? "") ? " selected" : ""}>${esc(n)}</option>`).join("");
TAB.alat = () => {
  const s = S.saring;
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Sarana &amp; Alat</h2><p class="sub">Seluruh sarana dan alat di semua ruang. Klik baris untuk melihat rincian dan riwayatnya.</p></div>
      <div class="aksi">${admin() ? `<button class="tombol" type="button" id="b-kategori-barang">${ikon("tabel")}Kategori</button>` : ""}${tombolBerkas("alat", "b-unduh")}${bisaUbah() ? `<button class="tombol utama" id="b-baru" type="button">${ikon("tambah")}Catat barang</button>` : ""}</div></div>
    <div class="saring">
      <label class="f cari" for="s-q">Cari${ikon("cari")}<input type="search" id="s-q" value="${esc(s.q)}" placeholder="Nama, kode, atau merek"></label>
      <label class="f" for="s-gol">Golongan<select id="s-gol"><option value="">Sarana &amp; alat</option>${opsi([["sarana", "Sarana"], ["alat", "Alat"]], s.gol)}</select></label>
      <label class="f" for="s-kat">Kategori<select id="s-kat"><option value="">Semua</option>${opsi(S.kategori.map((k) => [k.kode, k.nama]), s.kat)}</select></label>
      <label class="f" for="s-ruang">Ruang<select id="s-ruang"><option value="">Semua</option>${opsi(ruangTampil().map((r) => [r.kode, r.nama]), s.ruang)}${opsiTanpaRuang(s.ruang)}</select></label>
      <label class="f" for="s-lengkap">Kelengkapan<select id="s-lengkap"><option value="">Semua</option>${opsi([["ya", "Sudah lengkap"], ["tidak", "Perlu dilengkapi"]], s.lengkap)}</select></label>
    </div>
    <p class="kecil" id="jml"></p>
    <div id="wadah-tabel"></div>
  </section>`;
};
TAB.alat.sesudah = () => {
  const isi = () => { const d = saringAlat(); $("jml").textContent = `${d.length} dari ${S.alat.length} jenis · ${bil(d.reduce((s, a) => s + a.jumlah, 0))} unit`; $("wadah-tabel").innerHTML = tabelAlat(d); pasangKlikTabel($("wadah-tabel")); };
  isi();
  [["s-q", "q"], ["s-gol", "gol"], ["s-kat", "kat"], ["s-ruang", "ruang"], ["s-lengkap", "lengkap"]].forEach(([id, k]) => $(id).addEventListener("input", (e) => { S.saring[k] = e.target.value; isi(); }));
  if ($("b-baru")) $("b-baru").onclick = () => formAlat(null, { ruang: S.akses.peran === "pj" ? ruangSaya()[0] : "" });
  if ($("b-kategori-barang")) $("b-kategori-barang").onclick = formKategoriBarang;
  $("b-unduh").onclick = () => unduhBukuInduk(saringAlat().sort((a, b) => a.kode.localeCompare(b.kode)), "Sarana & Alat");
  pasangTombolBerkas($("isi"));
};

/* ---------------------------------------------------------------- bahan */
TAB.bahan = () => {
  const s = S.saringBahan;
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Bahan habis pakai</h2><p class="sub">Stok bahan di setiap ruang. Catat setiap bahan masuk (pembelian) dan keluar (pemakaian); sisa stok dihitung otomatis.</p></div>
      <div class="aksi">${tombolBerkas("bahan", "b-unduh-bahan")}${bisaUbah() ? `<button class="tombol utama" id="b-bahan-baru" type="button">${ikon("tambah")}Tambah bahan</button>` : ""}</div></div>
    <div class="saring">
      <label class="f cari" for="sb-q">Cari${ikon("cari")}<input type="search" id="sb-q" value="${esc(s.q)}" placeholder="Nama bahan"></label>
      <label class="f" for="sb-kat">Kategori<select id="sb-kat"><option value="">Semua</option>${opsi(S.katBahan.map((k) => [k, k]), s.kat)}</select></label>
      <label class="f" for="sb-ruang">Ruang<select id="sb-ruang"><option value="">Semua</option>${opsi(ruangTampil().map((r) => [r.kode, r.nama]), s.ruang)}${opsiTanpaRuang(s.ruang)}</select></label>
      <label class="f" for="sb-status">Status<select id="sb-status"><option value="">Semua</option>${opsi([["k", "Habis"], ["c", "Menipis"], ["b", "Cukup"]], s.status)}</select></label>
    </div>
    <div id="wadah-bahan"></div>
  </section>`;
};
TAB.bahan.sesudah = () => {
  const isi = () => {
    const { q, kat, ruang, status } = S.saringBahan, qq = q.toLowerCase();
    const d = S.bahan.filter((b) => (!qq || b.nama.toLowerCase().includes(qq)) && (!kat || b.kategori === kat)
      && (!ruang || (ruang === "-" ? !b.ruang : ruang === "@saya" ? ruangSaya().includes(b.ruang) : b.ruang === ruang)) && (!status || statusBahan(b)[1] === status));
    $("wadah-bahan").innerHTML = tabelBahan(d); pasangKlikTabel($("wadah-bahan"));
  };
  isi();
  [["sb-q", "q"], ["sb-kat", "kat"], ["sb-ruang", "ruang"], ["sb-status", "status"]].forEach(([id, k]) => $(id).addEventListener("input", (e) => { S.saringBahan[k] = e.target.value; isi(); }));
  if ($("b-bahan-baru")) $("b-bahan-baru").onclick = () => formBahan(null, S.akses.peran === "pj" ? ruangSaya()[0] : "");
  $("b-unduh-bahan").onclick = () => unduhBahan(S.bahan);
  pasangTombolBerkas($("isi"));
};

/* ---------------------------------------------------------------- dialog */
function dialog({ atas = "", judul, isi, kaki, onSimpan }) {
  $("dlg-atas").textContent = atas; $("dlg-judul").textContent = judul; $("dlg-isi").innerHTML = isi; $("dlg-kaki").innerHTML = kaki; $("dlg-galat").hidden = true;
  pasangIkon($("dlg"));
  const dlg = $("dlg");
  $("dlg-form").onsubmit = async (e) => {
    const tombol = e.submitter && e.submitter.value;
    if (!tombol || tombol === "batal") return;
    e.preventDefault();
    try { await onSimpan(tombol); } catch (err) { $("dlg-galat").textContent = err.message; $("dlg-galat").hidden = false; }
  };
  if (!dlg.open) dlg.showModal();
  $("dlg-isi").scrollTop = 0;
  // Fokus awal ke isian pertama (bukan tombol Tutup), supaya cincin fokus tidak muncul di pojok.
  const pertama = $("dlg-isi").querySelector("input:not([type=radio]):not([readonly]), select, textarea");
  if (pertama) pertama.focus({ preventScroll: true }); else { $("dlg-isi").tabIndex = -1; $("dlg-isi").focus({ preventScroll: true }); }
}
const tutupDialog = () => $("dlg").close();
const kakiSimpan = (label, kiri = "") => `${kiri}<button class="tombol" value="batal" formnovalidate>Batal</button><button class="tombol utama" value="simpan">${ikon("centang")}${label}</button>`;

const JENIS_RIW = { baru: "Dicatat", impor: "Diunggah dari Excel", ubah: "Diubah", pindah: "Dipindah ruang", kondisi: "Kondisi diubah", hapus: "Dihapus",
  awal: "Stok awal", masuk: "Masuk", keluar: "Keluar", koreksi: "Hitung ulang" };
const LABEL_ISIAN = { kode: "kode inventaris", nama: "nama", kategori: "kategori", ruang: "ruang", merek: "merek", spesifikasi: "spesifikasi", baik: "baik", rusak_ringan: "rusak ringan",
  rusak_berat: "rusak berat", jumlah_pasti: "jumlah pasti", tahun: "tahun", sumber_dana: "dana", kode_arkas: "kode ARKAS", no_bukti: "no. bukti",
  tgl_bukti: "tgl bukti", harga_satuan: "harga", keterangan: "keterangan" };
function htmlRiwayat(riw, judul = "Riwayat") {
  if (!riw || !riw.length) return "";
  const nilai = (k, v) => k === "ruang" ? namaRuang(v) || "—" : k === "kategori" ? namaKat(v) : v ?? "—";
  const urai = (r) => {
    if (r.jumlah != null || r.sisa != null) return [r.jumlah != null && r.jenis !== "awal" ? `${r.jenis === "keluar" ? "−" : r.jenis === "masuk" ? "+" : "="}${bil(r.jumlah)}` : "", r.sisa != null ? `sisa ${bil(r.sisa)}` : "", r.sumber_dana, r.keterangan].filter(Boolean).join(" · ");
    if (!r.rincian) return r.keterangan || "";
    if (r.jenis === "hapus") return "Alasan: " + r.rincian.alasan;
    if (r.jenis === "impor") return r.rincian.sumber || "";
    if (r.jenis === "baru") return r.rincian.ruang ? "di " + namaRuang(r.rincian.ruang) : "";
    return Object.entries(r.rincian).map(([k, [l, b]]) => `${LABEL_ISIAN[k] || k}: ${nilai(k, l)} → ${nilai(k, b)}`).join("; ");
  };
  return `<div><h3>${judul}</h3><ul class="riwayat">${riw.map((r) => `<li><time>${tgl(r.waktu)}</time><span><b>${JENIS_RIW[r.jenis] || r.jenis}</b> · ${esc(r.oleh || "—")}<br><span class="kecil">${esc(urai(r))}</span></span></li>`).join("")}</ul></div>`;
}

/* ---------------------------------------------------------------- formulir alat */
async function bukaAlat(id) {
  const a = S.alat.find((x) => x.id === id);
  if (!a) return;
  if (bolehRuang(a.ruang) || (!a.ruang && admin())) return formAlat(a);
  const riw = await rpc("sp_riwayat_daftar", { p_pin: S.pin, p_id: a.id }).catch(() => []);
  dialog({ atas: a.kode, judul: a.nama, isi: `${rincianAlat(a)}${htmlRiwayat(riw)}
    <p class="catatan">${ikon("info")}<span>Barang ini berada di ruang yang dikelola ${esc((ruangOf(a.ruang) || {}).pj_nama || "Staf Sarpras")}, jadi Anda hanya dapat melihatnya.</span></p>`,
    kaki: '<button class="tombol" value="batal" formnovalidate>Tutup</button>', onSimpan: async () => {} });
}
function rincianAlat(a) {
  return `<dl class="dl">
    <dt>Golongan · kategori</dt><dd>${golongan(a) === "sarana" ? "Sarana" : "Alat"} · ${esc(namaKat(a.kategori))}</dd>
    <dt>Ruang</dt><dd>${esc(namaRuang(a.ruang) || "Belum diisi")}</dd>
    <dt>Jumlah &amp; kondisi</dt><dd>${a.jumlah_pasti ? a.jumlah + " unit" : "Belum dihitung"} · baik ${a.baik}, rusak ringan ${a.rusak_ringan}, rusak berat ${a.rusak_berat}</dd>
    <dt>Merek / spesifikasi</dt><dd>${esc([a.merek, a.spesifikasi].filter(Boolean).join(" · ") || "—")}</dd>
    <dt>Tahun · dana</dt><dd>${esc(a.tahun || "—")} · ${esc(a.sumber_dana || "—")}</dd>
    ${BOS(a.sumber_dana) ? `<dt>Kode rekening ARKAS</dt><dd class="kode">${esc(a.kode_arkas || "—")}</dd>` : ""}
    <dt>Bukti BKU</dt><dd>${esc([a.no_bukti, a.tgl_bukti].filter(Boolean).join(" · ") || "—")}</dd>
    <dt>Harga satuan</dt><dd>${esc(rp(a.harga_satuan) || "—")}</dd>
    ${a.keterangan ? `<dt>Keterangan</dt><dd>${esc(a.keterangan)}</dd>` : ""}
  </dl>`;
}
async function formAlat(a, awal = {}) {
  const baru = !a;
  a = a || { baik: 1, rusak_ringan: 0, rusak_berat: 0, jumlah_pasti: true, kategori: awal.kategori || "", ruang: awal.ruang || "" };
  const riw = baru ? [] : await rpc("sp_riwayat_daftar", { p_pin: S.pin, p_id: a.id }).catch(() => []);
  const ruangBoleh = S.ruang.filter((r) => r.aktif && bolehRuang(r.kode));
  const v = (x) => esc(x == null ? "" : x);
  const katOpsi = ["sarana", "alat"].map((g) => `<optgroup label="${g === "sarana" ? "Sarana" : "Alat"}">${opsi(S.kategori.filter((k) => k.golongan === g).map((k) => [k.kode, k.nama]), a.kategori)}</optgroup>`).join("");
  const isi = `
    <div class="isian-grid">
      <label class="f lebar" for="f-nama">Nama barang<input id="f-nama" value="${v(a.nama)}" maxlength="150" required placeholder="mis. Proyektor Epson EB-X51"></label>
      ${baru ? `<label class="f lebar" for="f-kode">Kode inventaris (boleh dikosongkan)<input id="f-kode" maxlength="40" placeholder="Isi bila barang sudah punya kode/label; kosong = dibuat otomatis" autocapitalize="characters"></label>` : ""}
      <label class="f" for="f-kat">Kategori<select id="f-kat" required><option value="">Pilih kategori…</option>${katOpsi}</select></label>
      <label class="f" for="f-ruang">Ruang<select id="f-ruang">${admin() ? '<option value="">Belum ditentukan</option>' : ""}${opsi(ruangBoleh.map((r) => [r.kode, r.nama]), a.ruang)}</select></label>
      <label class="f" for="f-merek">Merek / tipe<input id="f-merek" value="${v(a.merek)}" maxlength="80"></label>
      <label class="f" for="f-spes">Spesifikasi / nomor seri<input id="f-spes" value="${v(a.spesifikasi)}" maxlength="200"></label>
    </div>
    <fieldset><legend>Jumlah menurut kondisi</legend>
      <div class="isian-grid">
        <label class="f" for="f-baik">Baik<input id="f-baik" type="number" min="0" step="1" value="${v(a.baik)}"></label>
        <label class="f" for="f-rr">Rusak ringan<input id="f-rr" type="number" min="0" step="1" value="${v(a.rusak_ringan)}"></label>
        <label class="f" for="f-rb">Rusak berat<input id="f-rb" type="number" min="0" step="1" value="${v(a.rusak_berat)}"></label>
      </div>
      ${a.jumlah_pasti ? "" : `<label class="centang" for="f-pasti"><input type="checkbox" id="f-pasti"> Jumlah sudah dihitung ulang (di Excel kosong, sementara dicatat 1)</label>`}
    </fieldset>
    <fieldset><legend>Perolehan &amp; pencatatan BOS</legend>
      <div class="isian-grid">
        <label class="f" for="f-tahun">Tahun perolehan<input id="f-tahun" type="number" min="1980" max="2100" value="${v(a.tahun)}"></label>
        <label class="f" for="f-dana">Sumber dana<select id="f-dana"><option value="">Belum diketahui</option>${opsi(S.dana.map((d) => [d, d]), a.sumber_dana)}</select></label>
        <label class="f" for="f-harga">Harga satuan (Rp)<input id="f-harga" type="number" min="0" step="1" value="${v(a.harga_satuan)}"></label>
        <label class="f" for="f-arkas" id="l-arkas">Kode rekening ARKAS<input id="f-arkas" value="${v(a.kode_arkas)}" placeholder="mis. 5.1.02.01.02.0001" inputmode="decimal"></label>
        <label class="f" for="f-bukti">No. bukti BKU<input id="f-bukti" value="${v(a.no_bukti)}" maxlength="60"></label>
        <label class="f" for="f-tglbukti">Tanggal bukti<input id="f-tglbukti" type="date" value="${v(a.tgl_bukti)}"></label>
      </div>
      <p class="kecil" id="k-arkas">Kode rekening diambil dari ARKAS (tanyakan bendahara BOS). Kode di RKAS hanya perkiraan.</p>
    </fieldset>
    <label class="f" for="f-ket">Keterangan<textarea id="f-ket" maxlength="500">${v(a.keterangan)}</textarea></label>
    ${baru ? "" : '<p class="kecil">Kode inventaris tidak berubah walaupun tahun, kategori, atau ruang diubah, karena labelnya sudah tertempel.</p>'}
    ${htmlRiwayat(riw)}`;
  dialog({ atas: baru ? "" : a.kode, judul: baru ? "Catat sarana / alat baru" : a.nama, isi,
    kaki: kakiSimpan(baru ? "Catat" : "Simpan", `${!baru && admin() ? `<button class="tombol bahaya kiri" value="hapus" formnovalidate>${ikon("hapus")}Hapus</button>` : ""}${!baru && a.kategori !== "BK" ? `<button class="tombol${admin() ? "" : " kiri"}" type="button" id="b-usul-hapus" data-alat="${a.id}">Usulkan penghapusan</button>` : ""}`),
    onSimpan: async (aksi) => {
      if (aksi === "hapus") return konfirmasiHapus(a, "alat");
      const n = (id) => { const x = $(id).value.trim(); return x === "" ? null : Number(x); };
      const data = { nama: $("f-nama").value, kategori: $("f-kat").value, ruang: $("f-ruang").value, merek: $("f-merek").value, spesifikasi: $("f-spes").value,
        baik: n("f-baik") || 0, rusak_ringan: n("f-rr") || 0, rusak_berat: n("f-rb") || 0, tahun: n("f-tahun"), sumber_dana: $("f-dana").value,
        harga_satuan: n("f-harga"), kode_arkas: $("f-arkas").value, no_bukti: $("f-bukti").value, tgl_bukti: $("f-tglbukti").value, keterangan: $("f-ket").value };
      if (!data.kategori) throw new Error("Pilih kategori.");
      if (!BOS(data.sumber_dana)) data.kode_arkas = "";
      if (!baru) data.id = a.id; else if ($("f-kode").value.trim()) data.kode = $("f-kode").value.trim();
      if (!baru && !a.jumlah_pasti && $("f-pasti") && $("f-pasti").checked) data.jumlah_pasti = true;
      const hasil = await sibuk(() => rpc("sp_alat_simpan", { p_pin: S.pin, p_a: data }));
      const i = S.alat.findIndex((x) => x.id === hasil.id);
      if (i >= 0) S.alat[i] = hasil; else S.alat.push(hasil);
      tutupDialog(); segarkan();
      toast(baru ? `Tercatat dengan kode ${hasil.kode}` : "Perubahan tersimpan");
    } });
  const aturArkas = () => { const bos = BOS($("f-dana").value); $("l-arkas").hidden = !bos; $("k-arkas").hidden = !bos; };
  $("f-dana").addEventListener("change", aturArkas); aturArkas();
}
function konfirmasiHapus(x, jenis) {
  dialog({ atas: x.kode || "", judul: `Hapus ${x.nama}?`, isi: `<p class="catatan awas">${ikon("awas")}<span>Hapus hanya untuk ${jenis === "alat" ? "barang" : "bahan"} yang <b>salah catat atau tercatat dua kali</b>. ${jenis === "alat" ? "Barang rusak berat tetap dicatat dengan kondisi rusak berat; penghapusan aset resmi menyusul di tahap berikutnya." : ""}</span></p>
    <label class="f" for="f-alasan">Alasan<input id="f-alasan" required minlength="3" placeholder="mis. tercatat dua kali"></label>
    <p class="kecil">Riwayatnya tetap disimpan.</p>`,
    kaki: `<button class="tombol" value="batal" formnovalidate>Batal</button><button class="tombol bahaya" value="ya">${ikon("hapus")}Hapus</button>`,
    onSimpan: async () => {
      if (jenis === "alat") { await sibuk(() => rpc("sp_alat_hapus", { p_pin: S.pin, p_id: x.id, p_alasan: $("f-alasan").value })); S.alat = S.alat.filter((y) => y.id !== x.id); }
      else { await sibuk(() => rpc("sp_bahan_hapus", { p_pin: S.pin, p_id: x.id, p_alasan: $("f-alasan").value })); S.bahan = S.bahan.filter((y) => y.id !== x.id); }
      tutupDialog(); segarkan(); toast("Dihapus dari daftar");
    } });
}

/* ---------------------------------------------------------------- formulir bahan */
function formBahan(b, ruangAwal = "") {
  const baru = !b;
  b = b || { kategori: "", ruang: ruangAwal, satuan: "buah", stok: 0, batas_min: 0 };
  const ruangBoleh = S.ruang.filter((r) => r.aktif && bolehRuang(r.kode));
  const v = (x) => esc(x == null ? "" : x);
  dialog({ judul: baru ? "Tambah bahan habis pakai" : "Ubah " + b.nama, isi: `<div class="isian-grid">
      <label class="f lebar" for="b-nama">Nama bahan<input id="b-nama" value="${v(b.nama)}" maxlength="150" required placeholder="mis. Kertas HVS A4 70 gram"></label>
      <label class="f" for="b-kat">Kategori<select id="b-kat"><option value="">Pilih…</option>${opsi(S.katBahan.map((k) => [k, k]), b.kategori)}</select></label>
      <label class="f" for="b-ruang">Disimpan di ruang<select id="b-ruang">${admin() ? '<option value="">Belum ditentukan</option>' : ""}${opsi(ruangBoleh.map((r) => [r.kode, r.nama]), b.ruang)}</select></label>
      <label class="f" for="b-satuan">Satuan<input id="b-satuan" value="${v(b.satuan)}" maxlength="20" placeholder="rim, pak, botol, buah" list="daftar-satuan"></label>
      ${baru ? `<label class="f" for="b-stok">Stok sekarang<input id="b-stok" type="number" min="0" step="any" value="0"></label>` : ""}
      <label class="f" for="b-min">Batas minimum<input id="b-min" type="number" min="0" step="any" value="${v(b.batas_min)}"></label>
      <label class="f lebar" for="b-ket">Keterangan<input id="b-ket" value="${v(b.keterangan)}" maxlength="300"></label>
    </div>
    <datalist id="daftar-satuan">${["buah", "pak", "rim", "kotak", "botol", "liter", "kg", "lusin", "rol", "set"].map((x) => `<option value="${x}">`).join("")}</datalist>
    <p class="kecil">${baru ? "Stok berikutnya diubah lewat tombol Masuk dan Keluar, supaya setiap perubahan tercatat." : "Stok diubah lewat tombol Masuk, Keluar, atau Hitung ulang di kartu stok."} Status "Menipis" muncul bila stok sama dengan atau di bawah batas minimum.</p>`,
    kaki: kakiSimpan(baru ? "Tambah" : "Simpan"),
    onSimpan: async () => {
      const data = { nama: $("b-nama").value, kategori: $("b-kat").value || "Lainnya", ruang: $("b-ruang").value, satuan: $("b-satuan").value,
        batas_min: $("b-min").value || 0, keterangan: $("b-ket").value };
      if (baru) data.stok = $("b-stok").value || 0; else data.id = b.id;
      const h = await sibuk(() => rpc("sp_bahan_simpan", { p_pin: S.pin, p_b: data }));
      const i = S.bahan.findIndex((x) => x.id === h.id);
      if (i >= 0) S.bahan[i] = h; else S.bahan.push(h);
      tutupDialog(); segarkan(); toast(baru ? "Bahan ditambahkan" : "Perubahan tersimpan");
    } });
}
async function kartuBahan(id) {
  const b = S.bahan.find((x) => x.id === id);
  if (!b) return;
  const riw = await rpc("sp_bahan_riwayat", { p_pin: S.pin, p_id: b.id }).catch(() => []);
  const boleh = bolehRuang(b.ruang) || (!b.ruang && admin());
  const [st, kl] = statusBahan(b);
  dialog({ atas: b.kategori, judul: b.nama, isi: `<div class="ubin">
      <div class="${kl === "b" ? "b" : kl}"><span class="lambang">${ikon("bahan")}</span><span><b>${bil(b.stok)}</b><span class="t">${esc(b.satuan)} · ${st}</span></span></div>
      <div class="i"><span class="lambang">${ikon("ruang")}</span><span><b style="font-size:17px">${esc(namaRuang(b.ruang) || "Belum ada ruang")}</b><span class="t">batas minimum ${bil(b.batas_min)} ${esc(b.satuan)}</span></span></div>
    </div>
    ${b.keterangan ? `<p class="sub">${esc(b.keterangan)}</p>` : ""}
    ${htmlRiwayat(riw, "Kartu stok")}
    ${!boleh ? `<p class="catatan">${ikon("info")}<span>Bahan ini berada di ruang yang bukan tanggung jawab Anda.</span></p>` : ""}`,
    kaki: boleh ? `${admin() ? `<button class="tombol bahaya kiri" value="hapus" formnovalidate>${ikon("hapus")}Hapus</button>` : ""}
      <button class="tombol" value="ubah" formnovalidate>${ikon("ubah")}Ubah data</button><button class="tombol" value="koreksi" formnovalidate>Hitung ulang</button>
      <button class="tombol" value="keluar" formnovalidate>${ikon("keluarStok")}Keluar</button><button class="tombol utama" value="masuk" formnovalidate>${ikon("masukStok")}Masuk</button>`
      : '<button class="tombol" value="batal" formnovalidate>Tutup</button>',
    onSimpan: async (aksi) => {
      if (aksi === "hapus") return konfirmasiHapus(b, "bahan");
      if (aksi === "ubah") return formBahan(b);
      return formGerak(b, aksi);
    } });
}
function formGerak(b, jenis) {
  const judul = { masuk: "Bahan masuk", keluar: "Bahan keluar", koreksi: "Hitung ulang stok" };
  dialog({ atas: b.nama, judul: judul[jenis], isi: `
    <div class="pilih-gerak" role="radiogroup" aria-label="Jenis catatan">
      ${["masuk", "keluar", "koreksi"].map((j) => `<label><input type="radio" name="jenis" value="${j}"${j === jenis ? " checked" : ""}>${j === "masuk" ? ikon("masukStok") + "Masuk" : j === "keluar" ? ikon("keluarStok") + "Keluar" : "Hitung ulang"}</label>`).join("")}
    </div>
    <p class="sub">Stok sekarang: <b>${bil(b.stok)} ${esc(b.satuan)}</b>. <span id="g-arti"></span></p>
    <div class="gerak-baris">
      <label class="f" for="g-jml"><span id="g-label">Jumlah</span><input id="g-jml" type="number" min="0" step="any" required></label>
      <label class="f" for="g-dana" id="l-gdana">Sumber dana<select id="g-dana"><option value="">—</option>${opsi(S.dana.map((d) => [d, d]))}</select></label>
    </div>
    <label class="f" for="g-ket">Keterangan<input id="g-ket" maxlength="200" placeholder="mis. pembelian bukti BKU 045, dipakai kelas X-2"></label>`,
    kaki: kakiSimpan("Catat"),
    onSimpan: async () => {
      const j = document.querySelector('input[name="jenis"]:checked').value;
      const h = await sibuk(() => rpc("sp_bahan_gerak_simpan", { p_pin: S.pin, p_id: b.id, p_jenis: j, p_jumlah: Number($("g-jml").value), p_ket: $("g-ket").value, p_dana: j === "masuk" ? $("g-dana").value : null }));
      const i = S.bahan.findIndex((x) => x.id === h.id); if (i >= 0) S.bahan[i] = h;
      tutupDialog(); segarkan(); toast(`Stok ${h.nama}: ${bil(h.stok)} ${h.satuan}`);
    } });
  const atur = () => {
    const j = document.querySelector('input[name="jenis"]:checked').value;
    $("l-gdana").hidden = j !== "masuk";
    $("g-label").textContent = j === "koreksi" ? "Jumlah hasil hitung" : "Jumlah " + j;
    $("g-arti").textContent = j === "koreksi" ? "Isi jumlah sebenarnya hasil menghitung ulang." : j === "masuk" ? "Jumlah ditambahkan ke stok." : "Jumlah dikurangkan dari stok.";
  };
  document.querySelectorAll('input[name="jenis"]').forEach((x) => x.onchange = atur); atur();
  $("g-jml").focus({ preventScroll: true });
}

/* ---------------------------------------------------------------- ruang: formulir */
function formRuang(r, jenisAwal) {
  const baru = !r; r = r || { aktif: true, jenis: jenisAwal || "kelas" };
  dialog({ atas: baru ? "" : r.kode, judul: baru ? "Tambah ruang" : "Ubah " + r.nama, isi: `<div class="isian-grid">
      <label class="f" for="r-kode">Kode ruang<input id="r-kode" value="${esc(r.kode || "")}" ${baru ? "" : "readonly"} maxlength="12" placeholder="mis. RK-01" required></label>
      <label class="f" for="r-nama">Nama ruang<input id="r-nama" value="${esc(r.nama || "")}" maxlength="80" required placeholder="mis. Ruang Kelas 01"></label>
      <label class="f" for="r-jenis">Jenis<select id="r-jenis">${opsi(Object.entries(JENIS_RUANG).map(([k, [n]]) => [k, n]), r.jenis)}</select></label>
      <label class="f" for="r-pj" id="l-pj">Penanggung jawab<select id="r-pj"><option value="">Staf Sarpras</option>${opsi((S.guru || []).map((g) => [g.id, g.nama]), r.pj)}</select></label>
      <label class="f" for="r-aktif">Status<select id="r-aktif">${opsi([["1", "Dipakai"], ["0", "Tidak dipakai"]], r.aktif ? "1" : "0")}</select></label>
    </div><p class="kecil" id="k-kelas">Ruang kelas selalu di bawah Staf Sarpras. Kode ruang 1–12 huruf/angka dan tidak bisa diubah setelah dibuat.</p>`,
    kaki: kakiSimpan("Simpan"),
    onSimpan: async () => {
      S.ruang = await sibuk(() => rpc("sp_ruang_simpan", { p_pin: S.pin, p_r: {
        kode: $("r-kode").value, nama: $("r-nama").value, jenis: $("r-jenis").value, pj: $("r-pj").value, aktif: $("r-aktif").value === "1" } }));
      tutupDialog(); segarkan(); toast("Ruang tersimpan");
    } });
  const atur = () => { $("l-pj").hidden = $("r-jenis").value === "kelas"; };
  $("r-jenis").addEventListener("change", atur); atur();
}

/* Ruang kelas tetap, rombel berganti tiap tahun: pasangannya diatur per tahun ajaran. */
async function formPasangRombel() {
  let d;
  try { d = await sibuk(() => rpc("sp_ruang_rombel_daftar", { p_pin: S.pin })); } catch (e) { return toast(e.message); }
  const ruangKelas = S.ruang.filter((r) => r.aktif && r.jenis === "kelas" && r.kode !== "RK");
  dialog({ atas: "Tahun ajaran " + d.tahun_ajaran, judul: "Pasangkan ruang kelas dengan rombel", isi: `
    <p class="sub">Barang dan buku dicatat di ruang, jadi tidak perlu dipindah saat rombel berganti. Atur pasangan ini setiap tahun ajaran baru.</p>
    ${ruangKelas.length ? "" : `<p class="catatan awas">${ikon("awas")}<span>Belum ada ruang kelas. Tambahkan dulu ruangnya dengan nama yang tetap, mis. Ruang Kelas 01, jenis Ruang kelas.</span></p>`}
    <div class="gulir" style="max-height:420px"><table><thead><tr><th>Rombel</th><th>Ruang kelas</th></tr></thead><tbody>${d.rombel.map((x) => `<tr><td><b>${esc(x.kode)}</b></td><td><select class="p-rombel" data-rombel="${esc(x.id)}" aria-label="Ruang rombel ${esc(x.kode)}"><option value="">Belum dipasangkan</option>${opsi(ruangKelas.map((r) => [r.kode, r.nama]), x.ruang)}</select></td></tr>`).join("")}</tbody></table></div>`,
    kaki: kakiSimpan("Simpan"),
    onSimpan: async () => {
      const pasangan = [...document.querySelectorAll(".p-rombel")].map((s) => ({ rombel: s.dataset.rombel, ruang: s.value }));
      const dipakai = pasangan.map((x) => x.ruang).filter(Boolean), kembar = dipakai.find((k, i) => dipakai.indexOf(k) !== i);
      if (kembar) throw new Error(`${namaRuang(kembar)} dipasangkan dengan lebih dari satu rombel.`);
      S.ruang = await sibuk(() => rpc("sp_ruang_rombel_simpan", { p_pin: S.pin, p_pasangan: pasangan }));
      tutupDialog(); segarkan(); toast("Pasangan ruang dan rombel tersimpan");
    } });
}

/* ---------------------------------------------------------------- label QR */
TAB.label = () => `<section class="kartu">
  <div class="kepala-bagian"><div><h2>Label QR</h2><p class="sub">Cetak di kertas stiker A4, lalu tempel pada barang. Saat QR dipindai kamera HP, kartu barang terbuka tanpa PIN dan tanpa harga. Barkode perlu alat pemindai dan kodenya panjang, jadi pada ukuran kecil pakailah QR bila bisa.</p></div>
    <div class="aksi"><button class="tombol utama" id="b-cetak" type="button">${ikon("cetak")}Cetak</button></div></div>
  <div class="saring">
    <label class="f" for="l-ruang">Ruang<select id="l-ruang"><option value="">Semua ruang</option>${opsi(ruangTampil().map((r) => [r.kode, r.nama]), S.labelRuang)}${opsiTanpaRuang(S.labelRuang)}</select></label>
    <label class="f" for="l-gol">Golongan<select id="l-gol"><option value="">Sarana &amp; alat</option><option value="sarana">Sarana</option><option value="alat">Alat</option></select></label>
    <label class="f" for="l-ukuran">Ukuran<select id="l-ukuran"><option value="besar">Besar, A4 isi 24 (70 × 37 mm)</option><option value="kecil">Kecil, A4 isi 65 (38 × 21 mm)</option></select></label>
    <label class="f" for="l-isi">Isi<select id="l-isi"><option value="qr">QR</option><option value="bc">Barkode</option><option value="dua">QR dan barkode</option></select></label>
    <label class="f" for="l-per">Banyak label<select id="l-per"><option value="1">Satu per jenis barang</option><option value="n">Satu per unit (maks. 40 per jenis)</option></select></label>
  </div>
  <p class="kecil" id="l-jml"></p>
  <div class="lembar-wadah"><div class="lembar" id="lembar"></div></div>
  <div class="lembar-nav" id="l-nav" hidden></div>
</section>`;
TAB.label.sesudah = () => {
  const p = { items: [], per: 24, hal: 0 };
  const gambar = async () => {
    S.labelRuang = $("l-ruang").value;
    const per = $("l-per").value, gol = $("l-gol").value, kecilL = $("l-ukuran").value === "kecil", isiL = $("l-isi").value, adaQR = isiL !== "bc", adaBc = isiL !== "qr";
    try {
      if (adaBc && !window.JsBarcode) await muatSkrip("assets/vendor/JsBarcode-3.11.6.all.min.js");
      if (adaQR) await siapkanQR();
    } catch (e) { $("lembar").innerHTML = ""; $("l-jml").textContent = e.message; return; }
    // Aset buku berlabel sendiri di menu Label Buku.
    const d = S.alat.filter((a) => a.kategori !== "BK" && (!S.labelRuang || (S.labelRuang === "-" ? !a.ruang : a.ruang === S.labelRuang)) && (!gol || golongan(a) === gol));
    const daftar = [];
    d.forEach((a) => { const n = per === "n" ? Math.min(40, a.jumlah) : 1; for (let i = 1; i <= n; i++) daftar.push([a, n > 1 ? `${i}/${n}` : ""]); });
    const perLembar = kecilL ? 65 : 24, totalL = daftar.length * (adaQR && adaBc ? 2 : 1), lembarL = Math.max(1, Math.ceil(totalL / perLembar));
    $("l-jml").textContent = `${totalL} label · ${lembarL} lembar A4${lembarL > 1 ? " · tombol Cetak mencetak semua lembar" : ""}`;
    $("lembar").className = kecilL ? "lembar-kecil" : "lembar";
    const tandaQR = (a) => `<div class="qr" data-qr="${esc(urlKartu(a.kode))}" data-uk="160"></div>`, tandaBc = (a) => `<svg data-kode="${esc(a.kode)}" data-tinggi="40"></svg>`;
    p.per = perLembar; p.hal = 0;
    p.items = daftar.flatMap(([a, ke]) => kecilL
      ? [`${adaQR ? `<div class="lb lb-qr">${tandaQR(a)}<div class="t">${LOGO_LABEL}<span class="j">${esc(a.nama)}</span><span class="k panjang">${esc(a.kode)}${ke ? " · " + ke : ""}</span></div></div>` : ""}`, `${adaBc ? `<div class="lb lb-bc"><div class="lb-bc-atas">${LOGO_LABEL}<small>${esc(a.nama)}</small></div>${tandaBc(a)}</div>` : ""}`]
      : [`${adaBc ? `<div class="label label-bc"><div class="lb-bc-atas">${LOGO_LABEL}<small>${esc(a.nama)}${ke ? " · " + ke : ""}</small></div>${tandaBc(a)}</div>` : ""}`, `${adaQR ? `<div class="label">${tandaQR(a)}<div class="t">${LOGO_LABEL}<small>SMA PLUS MERDEKA SOREANG</small><b>${esc(a.nama)}</b>
      <span class="k">${esc(a.kode)}${ke ? " · " + ke : ""}</span><small>${esc(namaRuang(a.ruang) || "")}${a.sumber_dana ? " · " + esc(a.sumber_dana) : ""}${a.tahun ? " " + a.tahun : ""}</small></div></div>` : ""}`]).filter(Boolean);
    tampilLembar($("lembar"), $("l-nav"), p);
  };
  ["l-ruang", "l-per", "l-gol", "l-ukuran", "l-isi"].forEach((id) => { $(id).onchange = gambar; }); gambar();
  $("b-cetak").onclick = () => cetakLabel($("lembar").className, p.items, $("b-cetak"));
};

/* ---------------------------------------------------------------- impor Excel */
/* ================================================================ dokumen: Excel berkop, template, unggah
   Unduhan berkop memakai kop bersama (assets/kop-dokumen.js, sama persis dengan Data Induk, Kehadiran Guru,
   Absensi Ekskul, Induk Pembiayaan) dan profil dari Data Induk → Profil Dokumen (sp_profil). ExcelJS dimuat dari
   CDN dengan pemeriksaan integritas, sama dengan Data Induk. Membaca unggahan memakai SheetJS (assets/vendor). */
const CDN_EXCELJS = ["https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js", "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js"];
const SRI_EXCELJS = "sha384-Pqp51FUN2/qzfxZxBCtF0stpc9ONI6MYZpVqmo8m20SoaQCzf+arZvACkLkirlPz";
async function muatExcelJS() {
  if (window.ExcelJS) return window.ExcelJS;
  for (const alamat of CDN_EXCELJS) {
    try {
      await new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = alamat; s.integrity = SRI_EXCELJS; s.crossOrigin = "anonymous";
        s.onload = ok; s.onerror = () => gagal(new Error(alamat)); document.head.appendChild(s); });
      if (window.ExcelJS) return window.ExcelJS;
    } catch (e) { /* coba CDN berikutnya */ }
  }
  throw new Error("Pembuat Excel (ExcelJS) tidak bisa diunduh. Biasanya jaringan memblokir cdnjs.cloudflare.com dan cdn.jsdelivr.net; coba jaringan lain.");
}
function muatSkrip(src) { return new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => gagal(new Error("Pustaka pendukung gagal dimuat. Periksa internet lalu coba lagi.")); document.head.appendChild(s); }); }
/* Label (3 Nov 2026): QR langsung dijadikan satu gambar. Pustaka QR menggambar di kanvas lalu menukarnya ke gambar
   belakangan, padahal isi kanvas hilang saat label disalin ke lembar cetak, sehingga QR bisa tercetak kosong. */
async function siapkanQR() { if (!window.QRCode) await muatSkrip("assets/vendor/qrcode-1.0.0.min.js"); }
/* Label cepat (4 Nov 2026): satu QR butuh sekitar 46 ms, jadi menggambar semuanya sekaligus membekukan halaman.
   Layar hanya menggambar lembar yang dilihat; sisanya digambar bertahap saat Cetak. QR yang sudah jadi diingat. */
const _qrJadi = new Map();
function gambarQR(el, teks, ukuran) {
  const kunci = ukuran + "|" + teks;
  let src = _qrJadi.get(kunci);
  if (!src) {
    const sementara = document.createElement("div");
    new QRCode(sementara, { text: teks, width: ukuran, height: ukuran, correctLevel: QRCode.CorrectLevel.M });
    src = sementara.querySelector("canvas").toDataURL("image/png");
    _qrJadi.set(kunci, src);
  }
  const img = document.createElement("img");
  img.alt = "QR"; img.src = src;
  el.replaceChildren(img);
}
const jeda = (ms = 0) => new Promise((r) => setTimeout(r, ms));
// Mengisi QR (.qr[data-qr]) dan barkode (svg[data-kode]), memberi jeda agar halaman tetap bisa dipakai. false = dibatalkan.
async function isiLabel(akar, { lanjut = () => true, kemajuan } = {}) {
  const sasaran = [...akar.querySelectorAll(".qr[data-qr], svg[data-kode]")];
  let mulai = performance.now();
  for (let i = 0; i < sasaran.length; i++) {
    if (!lanjut()) return false;
    const el = sasaran[i];
    if (el.dataset.qr) gambarQR(el, el.dataset.qr, +el.dataset.uk);
    else if (window.JsBarcode) JsBarcode(el, el.dataset.kode, { format: "CODE128", height: +el.dataset.tinggi, width: 1, fontSize: 10, margin: 0, background: "transparent" });
    if (performance.now() - mulai > 40) {
      if (kemajuan) kemajuan(i + 1, sasaran.length);
      await jeda();
      mulai = performance.now();
    }
  }
  return true;
}
// p = { items: [html per label], per: label per lembar, hal: lembar yang tampil (mulai 0) }
let _giliranLembar = 0;
function tampilLembar(lembar, nav, p) {
  const n = Math.max(1, Math.ceil(p.items.length / p.per));
  p.hal = Math.min(Math.max(0, p.hal), n - 1);
  lembar.innerHTML = p.items.slice(p.hal * p.per, (p.hal + 1) * p.per).join("");
  nav.hidden = n < 2;
  nav.innerHTML = n < 2 ? "" : `<button class="tombol" type="button" data-geser="-1"${p.hal === 0 ? " disabled" : ""}>Lembar sebelumnya</button><span class="kecil">Lembar ${p.hal + 1} dari ${n}</span><button class="tombol" type="button" data-geser="1"${p.hal === n - 1 ? " disabled" : ""}>Lembar berikutnya</button>`;
  nav.querySelectorAll("button").forEach((b) => { b.onclick = () => { p.hal += +b.dataset.geser; tampilLembar(lembar, nav, p); }; });
  const giliran = ++_giliranLembar;
  isiLabel(lembar, { lanjut: () => giliran === _giliranLembar && lembar.isConnected }).catch((e) => toast(e.message));
}
async function cetakLabel(kelas, items, tombol) {
  if (!items.length) return toast("Belum ada label untuk dicetak.");
  const wadah = $("cetak"), asal = tombol.innerHTML;
  tombol.disabled = true; tombol.textContent = "Menyiapkan...";
  try {
    await jeda(20);
    wadah.innerHTML = `<div class="${kelas}">${items.join("")}</div>`;
    await isiLabel(wadah, { kemajuan: (i, n) => { tombol.textContent = `Menyiapkan ${i} dari ${n}...`; } });
    if ([...wadah.querySelectorAll(".qr")].some((q) => !q.querySelector("img"))) return toast("QR belum tergambar. Muat ulang halaman lalu coba lagi.");
    // Tunggu semua gambar siap: browser tertentu memuat gambar salinan belakangan, dan print() tidak menunggunya.
    await Promise.all([...wadah.querySelectorAll("img")].map((i) => i.decode().catch(() => {})));
    window.print();
  } catch (e) { toast(e.message); }
  finally { tombol.disabled = false; tombol.innerHTML = asal; }
}
async function muatSheetJS() { if (!window.XLSX) await muatSkrip("assets/vendor/xlsx-0.20.3.full.min.js"); return window.XLSX; }
function unduhBlob(blob, nama) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nama;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const stempel = () => { const t = new Date(), p = (n) => String(n).padStart(2, "0"); return `${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}`; };
const tglPanjang = () => new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ISI_KEPALA = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE8DD" } };
const GARIS_TIPIS = { style: "hair", color: { argb: "FFD6DEDC" } };

function profilKop() {
  return S.profil || { nama_sekolah: "SMA Plus Merdeka Soreang", kota: "Soreang", logo_url: "assets/logo.png" };
}
let _logo;
async function logoKop() {
  if (_logo !== undefined) return _logo;
  try { _logo = { buffer: await fetch(profilKop().logo_url || "assets/logo.png").then((r) => r.ok ? r.arrayBuffer() : Promise.reject()) }; }
  catch (e) { _logo = null; }
  return _logo;
}
// Penanda tangan dokumen Sarpras: Kepala Sekolah (Profil Dokumen) dan Wakasek Sarana Prasarana, atau bila belum ada, Staf Sarana Prasarana (Tugas Guru).
function penandaTangan() {
  const p = profilKop();
  const kanan = p.wakasek_sarpras ? ["Wakasek Sarana Prasarana,", p.wakasek_sarpras] : ["Staf Sarana Prasarana,", p.staf_sarpras || ""];
  return [
    { atas: ["Mengetahui,", "Kepala Sekolah,"], nama: p.kepala_sekolah || "", nip: p.nip_kepala ? "NIP. " + p.nip_kepala : null },
    { atas: [(p.kota || "") + ", " + tglPanjang(), kanan[0]], nama: kanan[1] },
  ];
}

/* Satu lembar tabel berkop. kolom: [{ judul, lebar, angka?, rupiah? }]; baris: array nilai; jumlah: { label, kolom: {indeks: nilai} } */
async function lembarBerkop(wb, { nama, judul, sub, kolom, baris, jumlah, ttd = true, blok }) {
  const K = window.KopDokumen;
  if (!K) throw new Error("Berkas assets/kop-dokumen.js belum termuat. Muat ulang halaman.");
  const ws = wb.addWorksheet(nama.slice(0, 31), { pageSetup: { paperSize: 9, orientation: kolom.length > 7 ? "landscape" : "portrait",
    fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } } });
  const kolomAkhir = kolom.length + 1;
  ws.columns = [{ width: 5 }, ...kolom.map((k) => ({ width: k.lebar }))];
  let r = K.kopExcel(ws, { wb, logo: await logoKop(), profil: profilKop(), judul: judul.toUpperCase(), sub, kolomAkhir, warnaGaris: "FF12262E" });
  const rKepala = r;
  const kep = ws.getRow(r);
  ["No.", ...kolom.map((k) => k.judul)].forEach((t, i) => {
    const c = kep.getCell(i + 1);
    c.value = t; c.font = { bold: true, size: 10.5, color: { argb: "FF221E17" } }; c.fill = ISI_KEPALA;
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  kep.height = 24;
  if (window.pasKepalaExcel) window.pasKepalaExcel(ws, rKepala, rKepala, { kolomAkhir });
  r++;
  baris.forEach((isi, i) => {
    const br = ws.getRow(r);
    br.getCell(1).value = i + 1; br.getCell(1).alignment = { horizontal: "center" };
    isi.forEach((v, n) => {
      const c = br.getCell(n + 2);
      c.value = v === null || v === undefined ? "" : v;
      if (kolom[n].rupiah && typeof v === "number") c.numFmt = '#,##0';
      if (kolom[n].tengah) c.alignment = { horizontal: "center" };
    });
    for (let k = 1; k <= kolomAkhir; k++) {
      const c = br.getCell(k);
      c.font = { size: 10 }; c.border = { top: GARIS_TIPIS, bottom: GARIS_TIPIS, left: GARIS_TIPIS, right: GARIS_TIPIS };
      c.alignment = Object.assign({ vertical: "middle", wrapText: true }, c.alignment || {});
      if (i % 2) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7FAF9" } };
    }
    r++;
  });
  if (jumlah) {
    // Baris jumlah: labelnya digabung dari kolom No. sampai sebelum kolom angka pertama, supaya kolom nama tetap kosong
    // (unggahan berkas ini berhenti membaca di baris tanpa nama barang).
    const awalAngka = Math.min(...Object.keys(jumlah.kolom).map(Number)) + 2;
    if (awalAngka > 2) ws.mergeCells(r, 1, r, awalAngka - 1);
    const c = ws.getCell(r, 1); c.value = jumlah.label; c.alignment = { horizontal: "right" };
    Object.entries(jumlah.kolom).forEach(([n, v]) => { const x = ws.getCell(r, +n + 2); x.value = v; if (kolom[n].rupiah) x.numFmt = '#,##0'; });
    for (let k = 1; k <= kolomAkhir; k++) { const x = ws.getCell(r, k); x.font = { bold: true, size: 10 }; x.fill = ISI_KEPALA; x.border = { top: { style: "thin" }, bottom: { style: "thin" } }; }
    r++;
  }
  ws.views = [{ state: "frozen", ySplit: rKepala }];
  if (baris.length) ws.autoFilter = { from: { row: rKepala, column: 1 }, to: { row: rKepala + baris.length, column: kolomAkhir } };
  r = K.kakiExcel(ws, r + 1, { profil: profilKop(), kolomAkhir });
  if (ttd) K.ttdExcel(ws, r + 2, { kolomAkhir, ruang: 3, blok: blok || penandaTangan() });
  return ws;
}
async function simpanBuku(wb, nama) {
  const buf = await wb.xlsx.writeBuffer();
  unduhBlob(new Blob([buf], { type: MIME_XLSX }), `${nama}_${stempel()}.xlsx`);
}

/* ---------------------------------------------------------------- unduhan berkop */
const KOLOM_INDUK = [
  { judul: "Kode Inventaris", lebar: 26 }, { judul: "Nama Barang", lebar: 30 }, { judul: "Golongan", lebar: 9 },
  { judul: "Kategori", lebar: 16 }, { judul: "Merek/Tipe", lebar: 14 }, { judul: "Spesifikasi", lebar: 16 }, { judul: "Ruang", lebar: 18 },
  { judul: "Penanggung Jawab", lebar: 20 }, { judul: "Jumlah", lebar: 8, tengah: true }, { judul: "Baik", lebar: 6, tengah: true },
  { judul: "Rusak Ringan", lebar: 7, tengah: true }, { judul: "Rusak Berat", lebar: 7, tengah: true }, { judul: "Tahun Perolehan", lebar: 9, tengah: true },
  { judul: "Sumber Dana", lebar: 13 }, { judul: "Kode Rekening ARKAS", lebar: 19 }, { judul: "No. Bukti BKU", lebar: 13 }, { judul: "Tgl Bukti", lebar: 11 },
  { judul: "Harga Satuan", lebar: 13, rupiah: true }, { judul: "Nilai Perolehan", lebar: 15, rupiah: true }, { judul: "Keterangan", lebar: 30 },
];
const barisInduk = (a) => [a.kode, a.nama, golongan(a) === "sarana" ? "Sarana" : "Alat", namaKat(a.kategori), a.merek || "", a.spesifikasi || "",
  namaRuang(a.ruang), a.ruang ? (ruangOf(a.ruang) || {}).pj_nama || "" : "", a.jumlah_pasti ? a.jumlah : "", a.baik, a.rusak_ringan, a.rusak_berat, a.tahun || "",
  a.sumber_dana || "", a.kode_arkas || "", a.no_bukti || "", a.tgl_bukti || "", a.harga_satuan == null ? "" : Number(a.harga_satuan),
  a.harga_satuan == null ? "" : Number(a.harga_satuan) * a.jumlah, a.keterangan || ""];
async function unduhBukuInduk(daftar, keterangan) {
  if (!daftar.length) return toast("Tidak ada barang untuk diunduh.");
  try {
    await sibuk(async () => {
      const ExcelJS = await muatExcelJS();
      const wb = new ExcelJS.Workbook(); wb.creator = "Sarana Prasarana";
      const unit = daftar.reduce((s, a) => s + a.jumlah, 0), nilai = daftar.reduce((s, a) => s + (a.harga_satuan == null ? 0 : Number(a.harga_satuan) * a.jumlah), 0);
      await lembarBerkop(wb, { nama: "Buku Induk", judul: "Buku Induk Sarana dan Prasarana", sub: `${keterangan || (pjRuang() ? ruangTampil().map((r) => r.nama).join(", ") : "Semua ruang")}  ·  ${daftar.length} jenis barang  ·  ${bil(unit)} unit  ·  keadaan ${tglPanjang()}`,
        kolom: KOLOM_INDUK, baris: daftar.map(barisInduk), jumlah: { label: "JUMLAH", kolom: { 8: unit, 18: nilai } } });
      await simpanBuku(wb, "Buku_Induk_Sarpras");
    });
    toast(`${daftar.length} jenis barang diunduh`);
  } catch (e) { toast(e.message); }
}
async function unduhBahan(daftar) {
  if (!daftar.length) return toast("Tidak ada bahan untuk diunduh.");
  try {
    await sibuk(async () => {
      const ExcelJS = await muatExcelJS();
      const wb = new ExcelJS.Workbook();
      await lembarBerkop(wb, { nama: "Stok Bahan", judul: "Stok Bahan Habis Pakai", sub: `${daftar.length} jenis bahan  ·  keadaan ${tglPanjang()}`,
        kolom: [{ judul: "Nama Bahan", lebar: 30 }, { judul: "Kategori", lebar: 16 }, { judul: "Ruang", lebar: 20 }, { judul: "Stok", lebar: 8, tengah: true },
          { judul: "Satuan", lebar: 9 }, { judul: "Batas Minimum", lebar: 9, tengah: true }, { judul: "Status", lebar: 10 }, { judul: "Keterangan", lebar: 30 }],
        baris: daftar.map((b) => [b.nama, b.kategori, namaRuang(b.ruang), Number(b.stok), b.satuan, Number(b.batas_min), statusBahan(b)[0], b.keterangan || ""]) });
      await simpanBuku(wb, "Stok_Bahan");
    });
  } catch (e) { toast(e.message); }
}
async function unduhRuang() {
  try {
    await sibuk(async () => {
      const ExcelJS = await muatExcelJS();
      const wb = new ExcelJS.Workbook();
      await lembarBerkop(wb, { nama: "Daftar Ruang", judul: "Daftar Ruang dan Penanggung Jawab", sub: `${S.ruang.length} ruang  ·  keadaan ${tglPanjang()}`,
        kolom: [{ judul: "Kode", lebar: 10 }, { judul: "Nama Ruang", lebar: 26 }, { judul: "Jenis", lebar: 15 }, { judul: "Penanggung Jawab", lebar: 26 },
          { judul: "Sarana", lebar: 8, tengah: true }, { judul: "Alat", lebar: 8, tengah: true }, { judul: "Bahan", lebar: 8, tengah: true }, { judul: "Status", lebar: 12 }],
        baris: S.ruang.map((r) => { const h = hitungRuang(r.kode); return [r.kode, r.nama, (JENIS_RUANG[r.jenis] || ["Lainnya"])[0], r.pj_nama, h.sarana.length, h.alat.length, h.bahan.length, r.aktif ? "Dipakai" : "Tidak dipakai"]; }) });
      await simpanBuku(wb, "Daftar_Ruang");
    });
  } catch (e) { toast(e.message); }
}

/* ---------------------------------------------------------------- template */
async function unduhTemplate(jenis) {
  try {
    await sibuk(async () => {
      const ExcelJS = await muatExcelJS();
      const wb = new ExcelJS.Workbook();
      const T = TEMPLATE[jenis]();
      const ws = wb.addWorksheet("Data");
      ws.columns = T.kolom.map((k) => ({ header: k.judul, key: k.judul, width: k.lebar }));
      const kep = ws.getRow(1); kep.height = 30;
      kep.eachCell((c, i) => { c.font = { bold: true, color: { argb: T.kolom[i - 1].wajib ? "FF7C2F1F" : "FF221E17" } }; c.fill = ISI_KEPALA;
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; c.border = { bottom: { style: "thin" } }; });
      (T.isi || []).forEach((b) => ws.addRow(b));
      ws.views = [{ state: "frozen", ySplit: 1 }];
      // Daftar pilihan (lembar Daftar) + validasi isian
      const daftar = wb.addWorksheet("Daftar");
      T.daftar.forEach((d, i) => {
        const kol = String.fromCharCode(65 + i);
        daftar.getCell(`${kol}1`).value = d.judul; daftar.getCell(`${kol}1`).font = { bold: true }; daftar.getColumn(i + 1).width = 30;
        d.isi.forEach((v, j) => { daftar.getCell(`${kol}${j + 2}`).value = v; });
        const kolData = String.fromCharCode(65 + T.kolom.findIndex((k) => k.judul === d.untuk));
        if (d.isi.length) ws.dataValidations.add(`${kolData}2:${kolData}2000`, { type: "list", allowBlank: true, showErrorMessage: false,
          formulae: [`Daftar!$${kol}$2:$${kol}$${d.isi.length + 1}`] });
      });
      const pt = wb.addWorksheet("Petunjuk");
      pt.getColumn(1).width = 110;
      ["PETUNJUK MENGISI — " + T.judul.toUpperCase(), "", ...T.petunjuk].forEach((t, i) => { const c = pt.getCell(i + 1, 1); c.value = t; c.alignment = { wrapText: true };
        if (i === 0) c.font = { bold: true, size: 13 }; });
      wb.views = [{ activeTab: 0 }];
      await simpanBuku(wb, "Template_" + T.berkas);
    });
  } catch (e) { toast(e.message); }
}
const TEMPLATE = {
  alat: () => ({ judul: "Sarana & Alat", berkas: "Sarana_Alat",
    kolom: [{ judul: "Kode Inventaris", lebar: 22 }, { judul: "Nama Barang", lebar: 30, wajib: true }, { judul: "Kategori", lebar: 18, wajib: true }, { judul: "Ruang", lebar: 22 },
      { judul: "Merek/Tipe", lebar: 16 }, { judul: "Spesifikasi", lebar: 18 }, { judul: "Baik", lebar: 7 }, { judul: "Rusak Ringan", lebar: 8 }, { judul: "Rusak Berat", lebar: 8 },
      { judul: "Tahun Perolehan", lebar: 10 }, { judul: "Sumber Dana", lebar: 15 }, { judul: "Kode Rekening ARKAS", lebar: 20 }, { judul: "No. Bukti BKU", lebar: 14 },
      { judul: "Tgl Bukti", lebar: 12 }, { judul: "Harga Satuan", lebar: 14 }, { judul: "Keterangan", lebar: 30 }],
    daftar: [{ judul: "Kategori", untuk: "Kategori", isi: S.kategori.map((k) => k.nama) },
      { judul: "Ruang", untuk: "Ruang", isi: S.ruang.filter((r) => r.aktif && bolehRuang(r.kode)).map((r) => r.nama) },
      { judul: "Sumber Dana", untuk: "Sumber Dana", isi: S.dana }],
    petunjuk: ["• Satu baris = satu jenis barang di satu ruang dari satu pembelian. Kolom berwarna merah wajib untuk barang baru: Nama Barang dan Kategori.",
      "• Barang BARU: isi Kode Inventaris bila barang sudah punya kode atau label; kosongkan agar kode dibuat otomatis (SMA-INV-tahun-kategori-urut).",
      "• MENGUBAH barang yang sudah ada: isi Kode Inventaris persis seperti di Buku Induk, lalu isi hanya kolom yang ingin diubah. Sel kosong tidak menghapus isi lama.",
      "• Cara cepat melengkapi data: unduh Buku Induk, isi kolom yang kosong (harga, tahun, kode ARKAS, dst.), lalu unggah berkas itu. Kop dan tanda tangan diabaikan.",
      "• Jumlah ditulis menurut kondisi: Baik, Rusak Ringan, Rusak Berat. Bila ketiganya kosong untuk barang baru, dicatat 1 unit dan ditandai \"Jumlah\" belum pasti.",
      "• Kategori, Ruang, dan Sumber Dana pilih dari daftar (lembar Daftar). Penanggung jawab ruang hanya bisa mengunggah barang di ruangnya sendiri.",
      "• Kode Rekening ARKAS hanya untuk dana BOS, berupa angka bertitik (mis. 5.1.02.01.02.0001), diambil dari ARKAS lewat bendahara.",
      "• Tahun Perolehan 4 angka. Tgl Bukti berformat tanggal. Harga Satuan angka tanpa titik/Rp.",
      "• Berkas BUKU INDUK.xlsx lama juga bisa langsung diunggah; kolomnya dikenali otomatis.",
      "• Satu unggahan disimpan seluruhnya atau tidak sama sekali. Bila ada baris yang ditolak, pesannya menyebut nomor barisnya."] }),
  bahan: () => ({ judul: "Bahan Habis Pakai", berkas: "Bahan",
    kolom: [{ judul: "Nama Bahan", lebar: 30, wajib: true }, { judul: "Kategori", lebar: 18 }, { judul: "Ruang", lebar: 22 }, { judul: "Satuan", lebar: 10 },
      { judul: "Stok", lebar: 8 }, { judul: "Batas Minimum", lebar: 10 }, { judul: "Keterangan", lebar: 30 }],
    isi: S.bahan.filter((b) => bolehRuang(b.ruang)).map((b) => [b.nama, b.kategori, namaRuang(b.ruang), b.satuan, Number(b.stok), Number(b.batas_min), b.keterangan || ""]),
    daftar: [{ judul: "Kategori", untuk: "Kategori", isi: S.katBahan }, { judul: "Ruang", untuk: "Ruang", isi: S.ruang.filter((r) => r.aktif && bolehRuang(r.kode)).map((r) => r.nama) }],
    petunjuk: ["• Template sudah berisi bahan di ruang Anda. Ubah, tambah baris baru, lalu unggah.",
      "• Bahan dikenali dari Nama Bahan + Ruang (huruf besar/kecil tidak dibedakan). Yang belum ada menjadi bahan baru dengan stok awal sesuai kolom Stok.",
      "• Bila Stok berbeda dengan stok di aplikasi, dicatat sebagai \"Hitung ulang\" di kartu stok. Pemakaian sehari-hari sebaiknya dicatat lewat tombol Masuk/Keluar.",
      "• Status Menipis muncul bila stok sama dengan atau di bawah Batas Minimum.",
      "• Satu unggahan disimpan seluruhnya atau tidak sama sekali."] }),
  ruang: () => ({ judul: "Ruang", berkas: "Ruang",
    kolom: [{ judul: "Kode", lebar: 12, wajib: true }, { judul: "Nama Ruang", lebar: 28, wajib: true }, { judul: "Jenis", lebar: 16 }, { judul: "Penanggung Jawab", lebar: 30 }, { judul: "Status", lebar: 14 }],
    isi: S.ruang.map((r) => [r.kode, r.nama, (JENIS_RUANG[r.jenis] || ["Lainnya"])[0], r.pj ? r.pj_nama : "Staf Sarpras", r.aktif ? "Dipakai" : "Tidak dipakai"]),
    daftar: [{ judul: "Jenis", untuk: "Jenis", isi: Object.values(JENIS_RUANG).map((x) => x[0]) },
      { judul: "Penanggung Jawab", untuk: "Penanggung Jawab", isi: ["Staf Sarpras", ...(S.guru || []).map((g) => g.nama)] },
      { judul: "Status", untuk: "Status", isi: ["Dipakai", "Tidak dipakai"] }],
    petunjuk: ["• Template sudah berisi semua ruang. Tambahkan baris untuk ruang baru, mis. Kode RK-01, Nama Ruang Kelas 01, Jenis Ruang kelas. Pakai nama ruang yang tetap, bukan nama rombel; rombelnya dipasangkan lewat tombol Pasangkan rombel.",
      "• Kode 1–12 huruf/angka/tanda minus dan tidak bisa diubah. Baris dengan Kode yang sudah ada mengubah ruang itu.",
      "• Ruang kelas selalu di bawah Staf Sarpras; kolom Penanggung Jawab untuk ruang kelas diabaikan.",
      "• Hanya Staf Sarpras yang bisa mengunggah data ruang."] }),
};

/* ---------------------------------------------------------------- membaca unggahan */
const normal = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const kecil = (s) => normal(s).toLowerCase();
function bacaLembar(XLSX, wb, cocokKepala) {
  // Lembar pertama yang punya baris kepala cocok (lembar "Petunjuk"/"Daftar" dilewati).
  for (const nama of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[nama], { header: 1, defval: "", raw: true });
    const hi = rows.findIndex((r) => r.some((v) => cocokKepala.test(kecil(v))));
    if (hi >= 0) return { rows, hi, kep: rows[hi].map(kecil) };
  }
  return null;
}
function kolomDari(kep, aturan) {
  const K = {};
  Object.entries(aturan).forEach(([k, re]) => { K[k] = kep.findIndex((h) => re.test(h)); });
  return K;
}
function tanggalISO(v) {
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  if (typeof v === "number" && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return d.toISOString().slice(0, 10); }
  const s = normal(v); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s ? undefined : "";
}
const angka = (v) => { if (v === "" || v == null) return null; if (typeof v === "number") return v; const s = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."); return s === "" || isNaN(+s) ? undefined : +s; };
function cariRuangDari(v) {
  const n = kecil(v);
  if (!n) return null;
  if (n === "ruang kelas") return "RK";
  const r = S.ruang.find((x) => kecil(x.nama) === n || kecil(x.kode) === n);
  return r ? r.kode : undefined;
}
function kategoriDari(j) {
  const n = kecil(j);
  const pas = S.kategori.find((k) => kecil(k.nama) === n || kecil(k.kode) === n);
  if (pas) return pas.kode;
  if (/furni|mebel|meubel/.test(n)) return "F";
  if (/elektronik|tik|komputer/.test(n)) return "E";
  if (/kebersihan/.test(n)) return "K";
  if (/olahraga/.test(n)) return "O";
  if (/praktikum|lab/.test(n)) return "L";
  if (/kesenian|musik|seni/.test(n)) return "S";
  if (/dapur/.test(n)) return "D";
  if (/medis|uks|kesehatan/.test(n)) return "U";
  if (/ibadah|pai/.test(n)) return "PI";
  return n ? "P" : "";
}
function danaDari(v) {
  const n = kecil(v);
  if (!n) return null;
  const pas = S.dana.find((d) => kecil(d) === n);
  if (pas) return pas;
  if (/yayasan/.test(n)) return "Yayasan";
  if (/kinerja/.test(n)) return "BOS Kinerja";
  if (/bopd/.test(n)) return "BOPD";
  if (/bos/.test(n)) return "BOS Reguler";
  if (/komite/.test(n)) return "Komite";
  if (/hibah|sumbangan/.test(n)) return "Hibah/Sumbangan";
  return "Lainnya";
}
const BAHAN_DI_ALAT = /kantong plastik|lap lembut/i;

function bacaAlat(XLSX, wb, berkas) {
  const L = bacaLembar(XLSX, wb, /^nama barang$/);
  if (!L) throw new Error('Kolom "Nama Barang" tidak ditemukan. Pakai template Sarana & Alat, Buku Induk, atau BUKU INDUK.xlsx.');
  const K = kolomDari(L.kep, { arkas: /arkas|rekening/, kode: /^kode( inventaris)?$/, nama: /^nama barang$/, kategori: /^kategori/, jenis: /^jenis/,
    ruang: /^ruang$|lokasi/, merek: /merek/, spes: /spesifikasi/, jumlah: /^jumlah$/, baik: /^baik$/, rr: /rusak ringan/, rb: /rusak berat/, kondisi: /^kondisi/,
    tahun: /tahun/, dana: /dana/, bukti: /bukti bku|^no\.? ?bukti/, tgl: /^tgl|^tanggal/, harga: /^harga/, ket: /^keterangan/ });
  const ambil = (r, k) => (K[k] >= 0 ? r[K[k]] : "");
  const kodeDiBerkas = new Set();
  const hasil = { baris: [], galat: [], peringatan: [], baru: 0, ubah: 0, bahan: 0 };
  for (let i = L.hi + 1; i < L.rows.length; i++) {
    const r = L.rows[i], ke = i + 1;
    const nama = normal(ambil(r, "nama")).replace(/\s*-\s*$/, ""), kodeX = normal(ambil(r, "kode")).toUpperCase();
    if (!nama && !kodeX) { if (r.every((v) => normal(v) === "")) continue; break; }   // baris JUMLAH / tanda tangan: berhenti
    const ada = kodeX && S.alat.find((a) => a.kode === kodeX);
    const ket = [];
    const o = { baris: ke };
    // isian bersama
    if (nama) o.nama = nama.charAt(0).toUpperCase() + nama.slice(1);
    const katX = normal(ambil(r, "kategori")) || normal(ambil(r, "jenis"));
    if (katX) o.kategori = kategoriDari(katX);
    const ruangX = String(ambil(r, "ruang") || "").split(/\n|,|\//).map(normal).filter(Boolean);
    if (ruangX.length) {
      const rk = cariRuangDari(ruangX[0]);
      if (rk === undefined) { (ada ? hasil.peringatan : ket).push(ada ? `Baris ${ke}: ruang "${ruangX[0]}" tidak dikenal, ruang barang tidak diubah.` : "Lokasi di Excel: " + ruangX[0]); }
      else o.ruang = rk;
      if (ruangX.length > 1) ket.push("Juga di: " + ruangX.slice(1).join(", "));
    }
    [["merek", "merek"], ["spes", "spesifikasi"]].forEach(([k, f]) => { const v = normal(ambil(r, k)); if (v) o[f] = v; });
    const th = angka(ambil(r, "tahun"));
    if (th) o.tahun = th; else if (th === undefined) hasil.galat.push(`Baris ${ke}: Tahun Perolehan "${ambil(r, "tahun")}" bukan angka.`);
    const danaX = normal(ambil(r, "dana"));
    if (danaX) { o.sumber_dana = danaDari(danaX); if (o.sumber_dana === "Lainnya" && kecil(danaX) !== "lainnya") ket.push("Dana di Excel: " + danaX); }
    const ark = normal(ambil(r, "arkas")); if (ark) o.kode_arkas = ark;
    const bk = normal(ambil(r, "bukti")); if (bk) o.no_bukti = bk;
    const tg = tanggalISO(ambil(r, "tgl")); if (tg) o.tgl_bukti = tg; else if (tg === undefined) hasil.galat.push(`Baris ${ke}: Tgl Bukti "${ambil(r, "tgl")}" tidak dikenali.`);
    const hg = angka(ambil(r, "harga")); if (hg != null && hg !== undefined) o.harga_satuan = hg; else if (hg === undefined) hasil.galat.push(`Baris ${ke}: Harga Satuan bukan angka.`);
    // jumlah & kondisi
    const nb = angka(ambil(r, "baik")), nr = angka(ambil(r, "rr")), nB = angka(ambil(r, "rb")), nj = angka(ambil(r, "jumlah"));
    const kond = kecil(ambil(r, "kondisi"));
    if (nb != null || nr != null || nB != null) {
      o.baik = nb ?? (ada ? ada.baik : 0); o.rusak_ringan = nr ?? (ada ? ada.rusak_ringan : 0); o.rusak_berat = nB ?? (ada ? ada.rusak_berat : 0); o.jumlah_pasti = true;
    } else if (nj) {
      const n = Math.round(nj);
      Object.assign(o, /berat/.test(kond) ? { baik: 0, rusak_ringan: 0, rusak_berat: n } : /rusak/.test(kond) ? { baik: 0, rusak_ringan: n, rusak_berat: 0 }
        : ada && ada.rusak_ringan + ada.rusak_berat ? {} : { baik: n, rusak_ringan: 0, rusak_berat: 0 });
      o.jumlah_pasti = true;
    }
    const ketX = normal(ambil(r, "ket"));
    if (ada) {
      if (ketX) o.keterangan = ketX;
      o.kode = kodeX;
      // Unggah ulang Buku Induk tanpa mengubah jumlah: jangan menandai jumlah yang belum pasti menjadi pasti.
      if (!ada.jumlah_pasti && !nj && o.baik === ada.baik && o.rusak_ringan === ada.rusak_ringan && o.rusak_berat === ada.rusak_berat) {
        delete o.jumlah_pasti; delete o.baik; delete o.rusak_ringan; delete o.rusak_berat;
      }
      hasil.ubah++;
    } else {
      if (!o.nama) { hasil.galat.push(`Baris ${ke}: Nama Barang kosong.`); continue; }
      // Kode yang belum ada di inventaris = kode barang baru (mis. kode lama yang sudah tertempel); kosong = dibuat otomatis.
      const kodeBaru = kodeX.replace(/\s/g, "");
      if (kodeBaru && !/^[A-Z0-9][A-Z0-9./-]{2,39}$/.test(kodeBaru)) { hasil.galat.push(`Baris ${ke}: Kode Inventaris "${kodeX}" tidak valid (3–40 huruf/angka/titik/garis miring/tanda minus).`); continue; }
      if (kodeBaru && kodeDiBerkas.has(kodeBaru)) { hasil.galat.push(`Baris ${ke}: Kode Inventaris ${kodeBaru} dipakai dua kali di berkas ini.`); continue; }
      if (kodeBaru) kodeDiBerkas.add(kodeBaru);
      o.sumber = `${berkas} baris ${ke}`;
      if (BAHAN_DI_ALAT.test(o.nama)) {
        hasil.baris.push({ baris: ke, jenis_baris: "bahan", sumber: o.sumber, nama: o.nama, kategori: "Kebersihan", ruang: o.ruang || null,
          satuan: /kantong/i.test(o.nama) ? "pak" : "buah", stok: nj ? Math.round(nj) : 0, batas_min: 0, keterangan: [...ket, ketX].filter(Boolean).join(". ") });
        hasil.bahan++; continue;
      }
      if (!o.kategori) { hasil.galat.push(`Baris ${ke}: Kategori kosong.`); continue; }
      if (o.baik === undefined) Object.assign(o, { baik: 1, rusak_ringan: 0, rusak_berat: 0, jumlah_pasti: false });
      if (kodeBaru) {
        o.kode = kodeBaru;
        if (!o.tahun && /-(\d{4})$/.test(kodeBaru)) o.tahun = +kodeBaru.slice(-4);   // BUKU INDUK.xlsx: tahun di akhir kode
      }
      if (/^alat\s*-?\s*alat/i.test(o.nama)) ket.push("Perlu dirinci per alat");
      if (ketX) ket.push(ketX);
      if (ket.length) o.keterangan = ket.join(". ");
      if (o.ruang && !bolehRuang(o.ruang)) { hasil.galat.push(`Baris ${ke}: ${namaRuang(o.ruang)} bukan ruang tanggung jawab Anda.`); continue; }
      if (!o.ruang && !admin()) { hasil.galat.push(`Baris ${ke}: isi kolom Ruang dengan ruang Anda.`); continue; }
      hasil.baru++;
    }
    hasil.baris.push(o);
  }
  return hasil;
}
function bacaBahan(XLSX, wb) {
  const L = bacaLembar(XLSX, wb, /^nama bahan$/);
  if (!L) throw new Error('Kolom "Nama Bahan" tidak ditemukan. Pakai template Bahan.');
  const K = kolomDari(L.kep, { nama: /^nama bahan$/, kategori: /^kategori/, ruang: /^ruang/, satuan: /^satuan/, stok: /^stok/, batas: /batas/, ket: /^keterangan/ });
  const ambil = (r, k) => (K[k] >= 0 ? r[K[k]] : "");
  const hasil = { baris: [], galat: [], peringatan: [], baru: 0, ubah: 0 };
  for (let i = L.hi + 1; i < L.rows.length; i++) {
    const r = L.rows[i], ke = i + 1, nama = normal(ambil(r, "nama"));
    if (!nama) { if (r.every((v) => normal(v) === "")) continue; break; }
    const o = { baris: ke, nama };
    const katX = normal(ambil(r, "kategori"));
    if (katX) o.kategori = S.katBahan.find((k) => kecil(k) === kecil(katX)) || "Lainnya";
    const rx = normal(ambil(r, "ruang")), rk = cariRuangDari(rx);
    if (rk === undefined) { hasil.galat.push(`Baris ${ke}: ruang "${rx}" tidak dikenal.`); continue; }
    o.ruang = rk || "";
    if (!bolehRuang(o.ruang) && !(admin() && !o.ruang)) { hasil.galat.push(`Baris ${ke}: ${namaRuang(o.ruang) || "tanpa ruang"} bukan ruang tanggung jawab Anda.`); continue; }
    const st = normal(ambil(r, "satuan")); if (st) o.satuan = st;
    const sk = angka(ambil(r, "stok")); if (sk === undefined || sk < 0) { hasil.galat.push(`Baris ${ke}: Stok bukan angka.`); continue; } if (sk != null) o.stok = sk;
    const bm = angka(ambil(r, "batas")); if (bm != null && bm !== undefined) o.batas_min = bm;
    const kt = normal(ambil(r, "ket")); if (kt) o.keterangan = kt;
    const ada = S.bahan.find((b) => kecil(b.nama) === kecil(nama) && (b.ruang || "") === o.ruang);
    if (ada) hasil.ubah++; else hasil.baru++;
    hasil.baris.push(o);
  }
  return hasil;
}
function bacaRuang(XLSX, wb) {
  const L = bacaLembar(XLSX, wb, /^nama ruang$/);
  if (!L) throw new Error('Kolom "Nama Ruang" tidak ditemukan. Pakai template Ruang.');
  const K = kolomDari(L.kep, { kode: /^kode/, nama: /^nama ruang$/, jenis: /^jenis/, pj: /penanggung/, status: /^status/ });
  const ambil = (r, k) => (K[k] >= 0 ? r[K[k]] : "");
  const hasil = { baris: [], galat: [], peringatan: [], baru: 0, ubah: 0 };
  for (let i = L.hi + 1; i < L.rows.length; i++) {
    const r = L.rows[i], ke = i + 1, kode = normal(ambil(r, "kode")).toUpperCase(), nama = normal(ambil(r, "nama"));
    if (!kode && !nama) { if (r.every((v) => normal(v) === "")) continue; break; }
    if (!/^[A-Z0-9-]{1,12}$/.test(kode)) { hasil.galat.push(`Baris ${ke}: Kode "${kode}" harus 1–12 huruf/angka/tanda minus.`); continue; }
    if (!nama) { hasil.galat.push(`Baris ${ke}: Nama Ruang kosong.`); continue; }
    const jx = kecil(ambil(r, "jenis"));
    const jenis = (Object.entries(JENIS_RUANG).find(([k, [n]]) => kecil(n) === jx || k === jx) || [jx.includes("kelas") ? "kelas" : jx.includes("lab") ? "lab" : "lainnya"])[0];
    const px = kecil(ambil(r, "pj"));
    let pj = "";
    if (px && px !== "staf sarpras" && jenis !== "kelas") {
      const g = (S.guru || []).find((g) => kecil(g.nama) === px) || (S.guru || []).find((g) => kecil(g.nama).startsWith(px));
      if (!g) { hasil.galat.push(`Baris ${ke}: penanggung jawab "${ambil(r, "pj")}" tidak ditemukan di data guru.`); continue; }
      pj = g.id;
    }
    const aktif = !/tidak/.test(kecil(ambil(r, "status")));
    if (S.ruang.some((x) => x.kode === kode)) hasil.ubah++; else hasil.baru++;
    hasil.baris.push({ baris: ke, kode, nama, jenis, pj, aktif });
  }
  return hasil;
}

/* Tombol Unggah: pilih berkas → baca → pratinjau → simpan */
const UNGGAH = {
  alat: { judul: "Unggah sarana & alat", baca: bacaAlat, rpc: "sp_alat_unggah",
    ringkas: (h) => `${h.baru} barang baru, ${h.ubah} barang diubah${h.bahan ? `, ${h.bahan} bahan` : ""}`,
    hasil: (x) => `${x.baru} baru, ${x.ubah} diubah${x.sama ? `, ${x.sama} tanpa perubahan` : ""}${x.lewat ? `, ${x.lewat} dilewati (sudah pernah diunggah)` : ""}${x.bahan ? `, ${x.bahan} bahan` : ""}`,
    kolom: (o) => [S.alat.some((a) => a.kode === o.kode) ? esc(o.kode) : `<span class="pil b">Baru</span> ${esc(o.kode || "")}`, esc(o.nama || (S.alat.find((a) => a.kode === o.kode) || {}).nama || ""), esc(o.jenis_baris === "bahan" ? "Bahan" : o.kategori ? namaKat(o.kategori) : ""), esc(namaRuang(o.ruang) || "—"),
      esc(o.baik != null ? `${o.baik}/${o.rusak_ringan}/${o.rusak_berat}` : o.stok != null ? o.stok : ""), esc(Object.keys(o).filter((k) => !["baris", "kode", "nama", "kategori", "ruang", "baik", "rusak_ringan", "rusak_berat", "sumber", "jumlah_pasti", "jenis_baris", "stok", "satuan", "batas_min"].includes(k)).map((k) => LABEL_ISIAN[k] || k).join(", "))],
    kepala: ["Kode", "Nama", "Kategori", "Ruang", "B/RR/RB", "Isian lain"] },
  bahan: { judul: "Unggah bahan habis pakai", baca: bacaBahan, rpc: "sp_bahan_unggah",
    ringkas: (h) => `${h.baru} bahan baru, ${h.ubah} bahan diperbarui`,
    hasil: (x) => `${x.baru} baru, ${x.ubah} diperbarui${x.stok ? ` (${x.stok} stok dihitung ulang)` : ""}${x.sama ? `, ${x.sama} tanpa perubahan` : ""}`,
    kolom: (o) => [esc(o.nama), esc(o.kategori || ""), esc(namaRuang(o.ruang) || "—"), esc(o.stok ?? ""), esc(o.satuan || ""), esc(o.batas_min ?? "")],
    kepala: ["Nama bahan", "Kategori", "Ruang", "Stok", "Satuan", "Batas min."] },
  ruang: { judul: "Unggah data ruang", baca: bacaRuang, rpc: "sp_ruang_unggah",
    ringkas: (h) => `${h.baru} ruang baru, ${h.ubah} ruang diperbarui`,
    hasil: (x) => `${x.baru} ruang baru, ${x.ubah} diperbarui`,
    kolom: (o) => [esc(o.kode), esc(o.nama), esc((JENIS_RUANG[o.jenis] || ["Lainnya"])[0]), esc(o.pj ? ((S.guru || []).find((g) => g.id === o.pj) || {}).nama : "Staf Sarpras"), o.aktif ? "Dipakai" : "Tidak dipakai"],
    kepala: ["Kode", "Nama ruang", "Jenis", "Penanggung jawab", "Status"] },
};
function pilihUnggah(jenis) {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = ".xlsx,.xls";
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const XLSX = await sibuk(muatSheetJS);
      const h = UNGGAH[jenis].baca(XLSX, XLSX.read(await f.arrayBuffer(), { cellDates: true }), f.name);
      pratinjauUnggah(jenis, f.name, h);
    } catch (e) { toast(e.message); }
  };
  inp.click();
}
function pratinjauUnggah(jenis, berkas, h) {
  const U = UNGGAH[jenis], bisa = h.baris.length && !h.galat.length;
  dialog({ atas: berkas, judul: U.judul, isi: `
    <div class="ubin">
      <div class="${h.baris.length ? "b" : "c"}"><span class="lambang">${ikon("unggah")}</span><span><b>${h.baris.length}</b><span class="t">${esc(U.ringkas(h))}</span></span></div>
      <div class="${h.galat.length ? "k" : "b"}"><span class="lambang">${ikon(h.galat.length ? "awas" : "centang")}</span><span><b>${h.galat.length}</b><span class="t">baris perlu diperbaiki</span></span></div>
    </div>
    ${h.galat.length ? `<p class="catatan awas">${ikon("awas")}<span>Perbaiki baris berikut di Excel, lalu unggah lagi. Belum ada yang disimpan.<br>${h.galat.slice(0, 30).map(esc).join("<br>")}${h.galat.length > 30 ? `<br>… dan ${h.galat.length - 30} lainnya` : ""}</span></p>` : ""}
    ${h.peringatan.length ? `<p class="catatan emas">${ikon("info")}<span>${h.peringatan.slice(0, 20).map(esc).join("<br>")}</span></p>` : ""}
    ${h.baris.length ? `<div class="gulir" style="max-height:340px"><table><thead><tr><th>Baris</th>${U.kepala.map((k) => `<th>${k}</th>`).join("")}</tr></thead><tbody>
      ${h.baris.slice(0, 300).map((o) => `<tr><td class="kecil">${o.baris}</td>${U.kolom(o).map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      ${h.baris.length > 300 ? `<p class="kecil">Menampilkan 300 baris pertama dari ${h.baris.length}.</p>` : ""}` : ""}
    <p class="kecil">Satu unggahan disimpan seluruhnya atau tidak sama sekali. Sel kosong tidak menghapus isi yang sudah ada.</p>`,
    kaki: `<button class="tombol" value="batal" formnovalidate>Batal</button>${bisa ? `<button class="tombol utama" value="simpan">${ikon("unggah")}Simpan ${h.baris.length} baris</button>` : ""}`,
    onSimpan: async () => {
      const x = await sibuk(() => rpc(U.rpc, { p_pin: S.pin, p_baris: h.baris }));
      await sibuk(muatUlang);
      tutupDialog(); segarkan(); toast("Tersimpan: " + U.hasil(x));
    } });
}
const tombolBerkas = (jenis, unduhId) => `
  ${unduhId ? `<button class="tombol" type="button" id="${unduhId}">${ikon("unduh")}Unduh</button>` : ""}
  ${bisaUbah() && (jenis !== "ruang" || admin()) ? `<button class="tombol" type="button" data-template="${jenis}">${ikon("tabel")}Unduh template</button>
  <button class="tombol" type="button" data-unggah="${jenis}">${ikon("unggah")}Unggah data</button>` : ""}`;
function pasangTombolBerkas(root) {
  root.querySelectorAll("[data-template]").forEach((b) => b.onclick = () => unduhTemplate(b.dataset.template));
  root.querySelectorAll("[data-unggah]").forEach((b) => b.onclick = () => pilihUnggah(b.dataset.unggah));
}

/* ---------------------------------------------------------------- Buku Induk */
TAB.induk = () => {
  const s = S.saringInduk;
  const tahun = [...new Set(S.alat.map((a) => a.tahun).filter(Boolean))].sort((a, b) => b - a);
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Buku Induk Sarana &amp; Prasarana</h2><p class="sub">Daftar inventaris resmi seluruh sarana dan alat. Unduhannya memakai kop dan penanda tangan dari Profil Dokumen.</p></div>
      <div class="aksi">${tombolBerkas("alat", "b-unduh-induk")}</div></div>
    <div class="saring">
      <label class="f cari" for="i-q">Cari${ikon("cari")}<input type="search" id="i-q" value="${esc(s.q)}" placeholder="Nama, kode, merek"></label>
      <label class="f" for="i-ruang">Ruang<select id="i-ruang"><option value="">Semua ruang</option>${opsi(ruangTampil().map((r) => [r.kode, r.nama]), s.ruang)}${opsiTanpaRuang(s.ruang)}</select></label>
      <label class="f" for="i-gol">Golongan<select id="i-gol"><option value="">Sarana &amp; alat</option>${opsi([["sarana", "Sarana"], ["alat", "Alat"]], s.gol)}</select></label>
      <label class="f" for="i-dana">Sumber dana<select id="i-dana"><option value="">Semua</option>${opsi(S.dana.map((d) => [d, d]), s.dana)}${opsi([["-", "Belum diisi"]], s.dana)}</select></label>
      <label class="f" for="i-tahun">Tahun<select id="i-tahun"><option value="">Semua</option>${opsi(tahun.map((t) => [t, t]), s.tahun)}</select></label>
    </div>
    <div class="ubin" id="i-ringkas"></div>
    <div id="i-tabel"></div>
  </section>`;
};
function saringInduk() {
  const { q, ruang, gol, dana, tahun } = S.saringInduk, qq = kecil(q);
  return S.alat.filter((a) => (!qq || kecil(a.nama + " " + a.kode + " " + (a.merek || "")).includes(qq))
    && (!ruang || (ruang === "-" ? !a.ruang : a.ruang === ruang)) && (!gol || golongan(a) === gol)
    && (!dana || (dana === "-" ? !a.sumber_dana : a.sumber_dana === dana)) && (!tahun || String(a.tahun) === String(tahun)))
    .sort((a, b) => a.kode.localeCompare(b.kode));
}
// Posisi kolom beku mengikuti lebar kolom sebelumnya, yang berubah menurut isi.
function aturKolomBeku() {
  const t = document.querySelector("#i-tabel table");
  if (!t) return;
  const [a, b] = t.querySelectorAll("thead th");
  t.style.setProperty("--kiri-2", a.offsetWidth + "px");
  t.style.setProperty("--kiri-3", a.offsetWidth + b.offsetWidth + "px");
}
TAB.induk.sesudah = () => {
  const isi = () => {
    const d = saringInduk(), unit = d.reduce((s, a) => s + a.jumlah, 0);
    const nilai = d.reduce((s, a) => s + (a.harga_satuan == null ? 0 : Number(a.harga_satuan) * a.jumlah), 0), tanpaHarga = d.filter((a) => a.harga_satuan == null).length;
    $("i-ringkas").innerHTML = `<div class="i"><span class="lambang">${ikon("kotak")}</span><span><b>${bil(d.length)}</b><span class="t">jenis barang · ${bil(unit)} unit</span></span></div>
      <div class="${tanpaHarga ? "c" : "b"}"><span class="lambang">${ikon("tabel")}</span><span><b style="font-size:20px">${rp(nilai) || "Rp 0"}</b><span class="t">nilai perolehan${tanpaHarga ? ` · ${tanpaHarga} belum ada harga` : ""}</span></span></div>`;
    $("i-tabel").innerHTML = d.length ? `<div class="gulir" style="max-height:640px"><table class="tabel-induk"><thead><tr><th class="beku">No.</th><th class="beku">Kode inventaris</th><th class="beku beku-akhir">Nama barang</th><th>Kategori</th><th>Ruang</th>
      <th class="n">Jml</th><th class="n">B</th><th class="n">RR</th><th class="n">RB</th><th>Tahun</th><th>Sumber dana</th><th>Kode ARKAS</th><th>Bukti BKU</th><th class="n">Harga satuan</th><th class="n">Nilai</th><th>Keterangan</th></tr></thead><tbody>
      ${d.map((a, i) => `<tr class="klik" tabindex="0" data-alat="${a.id}"><td class="n beku">${i + 1}</td><td class="kode beku">${esc(a.kode)}</td>
        <td class="nama-sel beku beku-akhir"><b>${esc(a.nama)}</b>${a.merek ? `<p class="kecil">${esc(a.merek)}</p>` : ""}</td><td>${esc(namaKat(a.kategori))}</td><td>${esc(namaRuang(a.ruang) || "—")}</td>
        <td class="n">${a.jumlah_pasti ? a.jumlah : "?"}</td><td class="n">${a.baik}</td><td class="n">${a.rusak_ringan || ""}</td><td class="n">${a.rusak_berat || ""}</td><td>${esc(a.tahun || "")}</td>
        <td>${esc(a.sumber_dana || "")}</td><td class="kode">${esc(a.kode_arkas || "")}</td><td class="kecil">${esc([a.no_bukti, a.tgl_bukti].filter(Boolean).join(" · "))}</td>
        <td class="n">${a.harga_satuan == null ? "" : bil(a.harga_satuan)}</td><td class="n">${a.harga_satuan == null ? "" : bil(Number(a.harga_satuan) * a.jumlah)}</td><td class="kecil">${esc(a.keterangan || "")}</td></tr>`).join("")}
      </tbody><tfoot><tr><td colspan="3" class="beku beku-akhir">Jumlah</td><td colspan="2"></td><td class="n">${bil(unit)}</td><td colspan="8"></td><td class="n">${bil(nilai)}</td><td></td></tr></tfoot></table></div>`
      : `<div class="kosong">${ikon("kotak")}<span>${S.alat.length ? "Tidak ada barang yang cocok dengan saringan." : "Buku induk masih kosong. Unggah BUKU INDUK.xlsx atau template Sarana & Alat lewat tombol Unggah data."}</span></div>`;
    pasangKlikTabel($("i-tabel"));
    aturKolomBeku();
  };
  isi();
  if (document.fonts) document.fonts.ready.then(aturKolomBeku);
  [["i-q", "q"], ["i-ruang", "ruang"], ["i-gol", "gol"], ["i-dana", "dana"], ["i-tahun", "tahun"]].forEach(([id, k]) => $(id).addEventListener("input", (e) => { S.saringInduk[k] = e.target.value; isi(); }));
  $("b-unduh-induk").onclick = () => {
    const s = S.saringInduk;
    const ket = [s.ruang ? (s.ruang === "-" ? "Belum ada ruang" : namaRuang(s.ruang)) : "", s.gol ? (s.gol === "sarana" ? "Sarana" : "Alat") : "", s.dana && s.dana !== "-" ? s.dana : "", s.tahun ? "Tahun " + s.tahun : ""].filter(Boolean).join(" · ");
    unduhBukuInduk(saringInduk(), ket);
  };
  pasangTombolBerkas($("isi"));
};

/* ---------------------------------------------------------------- Profil Dokumen */
TAB.profil = () => {
  const p = profilKop();
  const isian = [["Nama sekolah", p.nama_sekolah], ["Alamat", p.alamat], ["Kota tanda tangan", p.kota], ["NPSN", p.npsn], ["Telepon", p.telepon], ["Email", p.email],
    ["Laman", p.laman], ["Kepala sekolah", p.kepala_sekolah], ["NIP kepala sekolah", p.nip_kepala], ["Berkas logo", p.logo_url], ["Catatan kaki", p.catatan_kaki]];
  const ttd = [["Kepala Sekolah", p.kepala_sekolah, "Profil Dokumen", "Kiri: Mengetahui"],
    ["Wakasek Sarana Prasarana", p.wakasek_sarpras, "Tugas Guru", p.wakasek_sarpras ? "Kanan" : "Belum ada; dipakai Staf Sarpras"],
    ["Staf Sarana Prasarana", p.staf_sarpras, "Tugas Guru", p.wakasek_sarpras ? "Tidak dipakai" : "Kanan"],
    ["Penanggung Jawab Perpustakaan", (ruangOf("PERPUS") || {}).pj_nama, "Ruang Perpustakaan", "Kanan, dokumen buku"],
    ["Penanggung Jawab Literasi", (ruangOf("LIT") || {}).pj_nama, "Ruang Pojok Literasi", "Kanan, daftar buku literasi"]];
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Profil Dokumen</h2><p class="sub">Identitas sekolah, tata letak kop, dan penanda tangan yang dipakai semua unduhan Excel di aplikasi ini. Sama dengan Data Induk, Kehadiran Guru, Absensi Ekskul, dan Induk Pembiayaan.</p></div>
      <div class="aksi"><a class="tombol" href="https://smapmerdekasoreang99-star.github.io/data_induk/" target="_blank" rel="noopener">${ikon("ubah")}Ubah di Data Induk</a>
        <button class="tombol utama" type="button" id="b-contoh">${ikon("unduh")}Unduh contoh</button></div></div>
    ${!S.profil ? `<p class="catatan awas">${ikon("awas")}<span>Profil dokumen belum terbaca, sehingga kop memakai nilai bawaan.</span></p>` : ""}
    <p class="catatan">${ikon("info")}<span>Profil dan kop berlaku untuk seluruh aplikasi sekolah, jadi hanya diubah oleh operator Data Induk (menu Profil Dokumen) yang masuk dengan akun. Perubahan di sana langsung terpakai di sini.</span></p>
  </section>
  <section class="kartu"><div class="kepala-bagian"><div><h3>Pratinjau kop</h3><p class="sub">Susunan sama persis dengan yang keluar di berkas Excel.</p></div></div>
    <div class="kop-pratinjau"><canvas id="kop-kanvas" aria-label="Pratinjau kop dokumen"></canvas></div></section>
  <div class="grid2">
    <section class="kartu"><h3>Isian</h3><div class="gulir"><table><tbody>${isian.map(([l, v]) => `<tr><td class="kecil" style="width:180px">${esc(l)}</td><td>${v ? esc(v) : '<span class="kecil">belum diisi</span>'}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="kartu"><h3>Penanda tangan dokumen Sarpras</h3>
      <div class="gulir"><table><thead><tr><th>Jabatan</th><th>Nama</th><th>Asal</th><th>Di dokumen</th></tr></thead><tbody>
      ${ttd.map(([j, n, asal, pakai]) => `<tr><td>${esc(j)}</td><td>${n ? `<b>${esc(n)}</b>` : '<span class="pil c">belum ada</span>'}</td><td class="kecil">${esc(asal)}</td><td class="kecil">${esc(pakai)}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="kecil">Nama pejabat diturunkan dari jabatan di Data Induk → Tugas Guru, tidak diketik di sini. Bila Wakasek Sarana Prasarana dipasang di sana, ia otomatis menggantikan Staf Sarpras di kolom kanan.</p></section>
  </div>`;
};
TAB.profil.sesudah = async () => {
  $("b-contoh").onclick = () => unduhBukuInduk(S.alat.slice(0, 5).length ? S.alat.slice(0, 5) : [{ kode: "SMA-INV-2026-E-0001", nama: "Contoh: Proyektor", kategori: "E", ruang: "", baik: 1, rusak_ringan: 0, rusak_berat: 0, jumlah: 1, jumlah_pasti: true }], "Contoh unduhan");
  const K = window.KopDokumen, kv = $("kop-kanvas");
  if (!K || !kv) return;
  const lebar = 760, judul = "BUKU INDUK SARANA DAN PRASARANA", sub = "Semua ruang · keadaan " + tglPanjang();
  const tinggi = K.tinggiKopKanvas(profilKop(), judul, sub);
  const skala = window.devicePixelRatio || 1;
  kv.width = lebar * skala; kv.height = tinggi * skala; kv.style.width = lebar + "px"; kv.style.height = tinggi + "px";
  const g = kv.getContext("2d"); g.scale(skala, skala); g.fillStyle = "#fff"; g.fillRect(0, 0, lebar, tinggi);
  const gambar = (logo) => K.kopKanvas(g, { logo, profil: profilKop(), judul, sub, padding: 16, lebar });
  const img = new Image(); img.onload = () => gambar(img); img.onerror = () => gambar(null); img.src = profilKop().logo_url || "assets/logo.png";
};

/* ================================================================ mulai */
document.addEventListener("DOMContentLoaded", async () => {
  pasangIkon();
  // Tinggi kepala halaman bisa berubah (nama sekolah turun baris di HP): bilah tab & menu Panduan menempel tepat di bawahnya.
  const atas = document.querySelector(".atas");
  const aturTinggi = () => document.documentElement.style.setProperty("--tinggi-atas", atas.offsetHeight + "px");
  aturTinggi();
  if (window.ResizeObserver) new ResizeObserver(aturTinggi).observe(atas); else window.addEventListener("resize", aturTinggi);
  document.addEventListener("click", (e) => { const d = document.querySelector(".panduan"); if (d && d.open && !d.contains(e.target)) d.open = false; });
  ["tab", "subtab"].forEach((id) => $(id).addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (b) buka(b.dataset.tab); }));
  $("form-pin").onsubmit = async (e) => {
    e.preventDefault(); $("galat-pin").hidden = true;
    try { await sibuk(() => masuk($("pin").value.trim())); }
    catch (err) { $("galat-pin").textContent = err.message; $("galat-pin").hidden = false; }
  };
  aturPanduan(["pj", "perpus", "literasi", "wali", "pimpinan", "staf", "siswa"]);
  const cari = new URLSearchParams(location.search), kode = cari.get("k");
  if (kode) return kartuPublik(kode);
  // ?b= dari kamera bawaan HP: petugas yang sudah masuk atau menekan "Masuk dengan PIN" ke halaman petugas, selain itu halaman siswa.
  if (cari.has("pinjam") || (cari.get("b") && !cari.has("petugas") && !ssGet("sp_pin"))) return halamanSiswa(cari.get("b"));
  const pin = ssGet("sp_pin");
  if (pin) { try { await sibuk(() => masuk(pin)); return; } catch (e) { ssSet("sp_pin", null); } }
  $("layar-masuk").hidden = false; $("pin").focus();
});
