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
  masukStok: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  keluarStok: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
};
const ikon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
function pasangIkon(root) { (root || document).querySelectorAll("[data-ikon]").forEach((el) => { if (!el.firstChild) el.innerHTML = ikon(el.dataset.ikon); }); }

/* ================================================================ keadaan */
const S = { pin: null, akses: null, kategori: [], katBahan: [], ruang: [], dana: [], guru: null, alat: [], bahan: [],
  tab: "ringkas", ruangBuka: null, segmen: "sarana",
  saring: { q: "", gol: "", kat: "", ruang: "", lengkap: "" }, saringBahan: { q: "", kat: "", ruang: "", status: "" }, labelRuang: "" };
const admin = () => S.akses && S.akses.peran === "admin";
const bisaUbah = () => S.akses && S.akses.peran !== "lihat";
const ruangSaya = () => (S.akses && S.akses.ruang) || [];
const bolehRuang = (r) => admin() || (S.akses.peran === "pj" && !!r && ruangSaya().includes(r));
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
  [S.alat, S.bahan] = await Promise.all([rpc("sp_alat_daftar", { p_pin: pin }), rpc("sp_bahan_daftar", { p_pin: pin })]);
  ssSet("sp_pin", pin);
  $("layar-masuk").hidden = true; $("layar-app").hidden = false;
  const peran = { admin: "Staf Sarpras · semua ruang", pj: "Penanggung jawab · " + ruangSaya().map(namaRuang).join(", "), lihat: "Hanya melihat" }[S.akses.peran];
  $("pengguna").innerHTML = `<span class="chip"><span class="avatar">${esc(inisial(S.akses.nama))}</span><span class="nama"><b>${esc(S.akses.nama)}</b><span>${esc(peran)}</span></span></span>
    <button class="tombol-atas" id="keluar" type="button">${ikon("keluar")}<span class="t">Keluar</span></button>`;
  $("pengguna").hidden = false;
  $("keluar").onclick = keluar;
  document.querySelectorAll("[data-admin]").forEach((b) => (b.hidden = !admin()));
  buka(S.akses.peran === "admin" ? "ringkas" : "ruang");
}
async function muatUlang() {
  [S.alat, S.bahan, S.ruang] = await Promise.all([rpc("sp_alat_daftar", { p_pin: S.pin }), rpc("sp_bahan_daftar", { p_pin: S.pin }),
    rpc("sp_masuk", { p_pin: S.pin }).then((d) => d.ruang)]);
}
function keluar() { ssSet("sp_pin", null); location.href = location.pathname; }

/* ================================================================ tab */
const TAB = {};
function buka(tab, tetap) {
  if (tab === "impor" && !admin()) tab = "ringkas";
  if (tab !== S.tab && !tetap) S.ruangBuka = null;
  S.tab = tab;
  document.querySelectorAll("#tab button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab));
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
      <div class="batang">${perKat.map(([n, v, g]) => `<div class="r"><span>${esc(n)}</span><div class="jalur"><i class="${g === "alat" ? "c" : ""}" style="width:${(v / mk) * 100}%"></i></div><span class="n">${v}</span></div>`).join("") || `<div class="kosong">${ikon("kotak")}<span>Belum ada data. Staf Sarpras dapat mengimpor BUKU INDUK.xlsx.</span></div>`}</div>
    </section>
    <section class="kartu"><div class="kepala-bagian"><div><h2>Isian yang masih kosong</h2><p class="sub">Jumlah jenis sarana &amp; alat yang isiannya belum diisi. Kode ARKAS hanya untuk barang dana BOS.</p></div>
      <button class="tombol kecil" type="button" id="b-lengkapi">${ikon("ubah")}Lengkapi</button></div>
      <div class="batang">${isian.map(([n, v]) => `<div class="r"><span>${esc(n)}</span><div class="jalur"><i class="k" style="width:${A.length ? (v / A.length) * 100 : 0}%"></i></div><span class="n">${v}</span></div>`).join("")}</div>
    </section>
  </div>`;
};
TAB.ringkas.sesudah = () => { $("b-lengkapi").onclick = () => { S.saring = { q: "", gol: "", kat: "", ruang: "", lengkap: "tidak" }; buka("alat"); }; };

/* ---------------------------------------------------------------- ruang: denah & halaman ruang */
function hitungRuang(kode) {
  const A = S.alat.filter((a) => a.ruang === kode), B = S.bahan.filter((b) => b.ruang === kode);
  return { sarana: A.filter((a) => golongan(a) === "sarana"), alat: A.filter((a) => golongan(a) === "alat"), bahan: B,
    rusak: A.reduce((s, a) => s + a.rusak_ringan + a.rusak_berat, 0), tipis: B.filter((b) => statusBahan(b)[1] !== "b").length,
    belum: A.filter((a) => kurang(a).length).length };
}
TAB.ruang = () => S.ruangBuka ? halamanRuang(S.ruangBuka) : denah();
function denah() {
  const urut = ["lab", "layanan", "kantor", "kelas", "lainnya"];
  const aktif = S.ruang.filter((r) => r.aktif);
  const tanpa = { sarana: S.alat.filter((a) => !a.ruang && golongan(a) === "sarana").length, alat: S.alat.filter((a) => !a.ruang && golongan(a) === "alat").length, bahan: S.bahan.filter((b) => !b.ruang).length };
  const kotak = (r) => {
    const h = hitungRuang(r.kode), saya = ruangSaya().includes(r.kode);
    return `<button class="ruang-kotak${saya ? " saya" : ""}" type="button" data-ruang="${esc(r.kode)}" style="${warnaRuang(r.jenis)}" aria-label="${esc(r.nama)}, ${h.sarana.length} sarana, ${h.alat.length} alat, ${h.bahan.length} bahan">
      <span class="atas-kotak"><span class="lambang">${ikon(JENIS_RUANG[r.jenis] ? r.jenis : "lainnya")}</span>
        <span class="judul-kotak"><b>${esc(r.nama)}</b><span class="pj">${ikon("orang")}${esc(r.pj_nama)}</span></span></span>
      <span class="tanda">${saya ? '<span class="pil saya">Ruang saya</span>' : ""}${h.rusak ? `<span class="pil k">${h.rusak} rusak</span>` : ""}${h.tipis ? `<span class="pil c">${h.tipis} bahan menipis</span>` : ""}${h.belum ? `<span class="pil n">${h.belum} belum lengkap</span>` : ""}</span>
      <span class="hitung3"><span><b>${h.sarana.length}</b><small>Sarana</small></span><span><b>${h.alat.length}</b><small>Alat</small></span><span><b>${h.bahan.length}</b><small>Bahan</small></span></span>
    </button>`;
  };
  const kelompok = urut.map((j) => {
    const rs = aktif.filter((r) => r.jenis === j);
    if (!rs.length && !(j === "kelas" && admin())) return "";
    return `<section class="kelompok-ruang"><h3>${ikon(j)} ${JENIS_RUANG[j][0]} <small>${rs.length} ruang</small></h3>
      <div class="denah">${rs.map(kotak).join("")}${j === "kelas" && admin() ? `<button class="ruang-kotak ruang-tambah" type="button" data-tambah="kelas">${ikon("tambah")}<span>Tambah ruang kelas</span></button>` : ""}</div></section>`;
  }).join("");
  const tidakAktif = S.ruang.filter((r) => !r.aktif);
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Denah ruang</h2><p class="sub">Pilih ruang untuk melihat sarana, alat, dan bahan di dalamnya. ${S.akses.peran === "pj" ? "Ruang Anda bertanda emas." : ""}</p></div>
      ${admin() ? `<div class="aksi"><button class="tombol utama" type="button" id="b-ruang-baru">${ikon("tambah")}Tambah ruang</button></div>` : ""}</div>
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
  if (!S.ruangBuka) return;
  $("b-kembali").onclick = () => { S.ruangBuka = null; segarkan(); };
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
  return S.alat.filter((a) => (!qq || (a.nama + " " + a.kode + " " + (a.kode_lama || "") + " " + (a.merek || "")).toLowerCase().includes(qq))
    && (!gol || golongan(a) === gol) && (!kat || a.kategori === kat)
    && (!ruang || (ruang === "-" ? !a.ruang : ruang === "@saya" ? ruangSaya().includes(a.ruang) : a.ruang === ruang))
    && (!lengkap || (lengkap === "ya" ? !kurang(a).length : kurang(a).length)));
}
const opsi = (arr, v) => arr.map(([k, n]) => `<option value="${esc(k)}"${String(k) === String(v ?? "") ? " selected" : ""}>${esc(n)}</option>`).join("");
TAB.alat = () => {
  const s = S.saring;
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Sarana &amp; Alat</h2><p class="sub">Seluruh sarana dan alat di semua ruang. Klik baris untuk melihat rincian dan riwayatnya.</p></div>
      <div class="aksi">${bisaUbah() ? `<button class="tombol utama" id="b-baru" type="button">${ikon("tambah")}Catat barang</button>` : ""}
        <button class="tombol" id="b-unduh" type="button">${ikon("unduh")}Unduh Excel</button></div></div>
    <div class="saring">
      <label class="f cari" for="s-q">Cari${ikon("cari")}<input type="search" id="s-q" value="${esc(s.q)}" placeholder="Nama, kode, atau merek"></label>
      <label class="f" for="s-gol">Golongan<select id="s-gol"><option value="">Sarana &amp; alat</option>${opsi([["sarana", "Sarana"], ["alat", "Alat"]], s.gol)}</select></label>
      <label class="f" for="s-kat">Kategori<select id="s-kat"><option value="">Semua</option>${opsi(S.kategori.map((k) => [k.kode, k.nama]), s.kat)}</select></label>
      <label class="f" for="s-ruang">Ruang<select id="s-ruang"><option value="">Semua</option>${S.akses.peran === "pj" ? opsi([["@saya", "Ruang saya"]], s.ruang) : ""}${opsi(S.ruang.map((r) => [r.kode, r.nama]), s.ruang)}${opsi([["-", "Belum ada ruang"]], s.ruang)}</select></label>
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
  $("b-unduh").onclick = () => unduhExcel(saringAlat());
};

/* ---------------------------------------------------------------- bahan */
TAB.bahan = () => {
  const s = S.saringBahan;
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Bahan habis pakai</h2><p class="sub">Stok bahan di setiap ruang. Catat setiap bahan masuk (pembelian) dan keluar (pemakaian); sisa stok dihitung otomatis.</p></div>
      <div class="aksi">${bisaUbah() ? `<button class="tombol utama" id="b-bahan-baru" type="button">${ikon("tambah")}Tambah bahan</button>` : ""}</div></div>
    <div class="saring">
      <label class="f cari" for="sb-q">Cari${ikon("cari")}<input type="search" id="sb-q" value="${esc(s.q)}" placeholder="Nama bahan"></label>
      <label class="f" for="sb-kat">Kategori<select id="sb-kat"><option value="">Semua</option>${opsi(S.katBahan.map((k) => [k, k]), s.kat)}</select></label>
      <label class="f" for="sb-ruang">Ruang<select id="sb-ruang"><option value="">Semua</option>${S.akses.peran === "pj" ? opsi([["@saya", "Ruang saya"]], s.ruang) : ""}${opsi(S.ruang.map((r) => [r.kode, r.nama]), s.ruang)}${opsi([["-", "Belum ada ruang"]], s.ruang)}</select></label>
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

const JENIS_RIW = { baru: "Dicatat", impor: "Diimpor dari Excel", ubah: "Diubah", pindah: "Dipindah ruang", kondisi: "Kondisi diubah", hapus: "Dihapus",
  awal: "Stok awal", masuk: "Masuk", keluar: "Keluar", koreksi: "Hitung ulang" };
const LABEL_ISIAN = { nama: "nama", kategori: "kategori", ruang: "ruang", merek: "merek", spesifikasi: "spesifikasi", baik: "baik", rusak_ringan: "rusak ringan",
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
    ${a.kode_lama ? `<dt>Kode lama</dt><dd class="kode">${esc(a.kode_lama)}</dd>` : ""}
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
  dialog({ atas: baru ? "" : a.kode + (a.kode_lama ? " · kode lama " + a.kode_lama : ""), judul: baru ? "Catat sarana / alat baru" : a.nama, isi,
    kaki: kakiSimpan(baru ? "Catat" : "Simpan", !baru && admin() ? `<button class="tombol bahaya kiri" value="hapus" formnovalidate>${ikon("hapus")}Hapus</button>` : ""),
    onSimpan: async (aksi) => {
      if (aksi === "hapus") return konfirmasiHapus(a, "alat");
      const n = (id) => { const x = $(id).value.trim(); return x === "" ? null : Number(x); };
      const data = { nama: $("f-nama").value, kategori: $("f-kat").value, ruang: $("f-ruang").value, merek: $("f-merek").value, spesifikasi: $("f-spes").value,
        baik: n("f-baik") || 0, rusak_ringan: n("f-rr") || 0, rusak_berat: n("f-rb") || 0, tahun: n("f-tahun"), sumber_dana: $("f-dana").value,
        harga_satuan: n("f-harga"), kode_arkas: $("f-arkas").value, no_bukti: $("f-bukti").value, tgl_bukti: $("f-tglbukti").value, keterangan: $("f-ket").value };
      if (!data.kategori) throw new Error("Pilih kategori.");
      if (!BOS(data.sumber_dana)) data.kode_arkas = "";
      if (!baru) data.id = a.id;
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
      <label class="f" for="r-kode">Kode ruang<input id="r-kode" value="${esc(r.kode || "")}" ${baru ? "" : "readonly"} maxlength="12" placeholder="mis. RK-X1" required></label>
      <label class="f" for="r-nama">Nama ruang<input id="r-nama" value="${esc(r.nama || "")}" maxlength="80" required placeholder="mis. Kelas X-1"></label>
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

/* ---------------------------------------------------------------- label QR */
TAB.label = () => `<section class="kartu">
  <div class="kepala-bagian"><div><h2>Label QR</h2><p class="sub">Cetak di kertas stiker A4 isi 24 (3 × 8, ukuran 70 × 37 mm), lalu tempel pada barang. Saat dipindai kamera HP, kartu barang terbuka tanpa PIN dan tanpa harga.</p></div>
    <div class="aksi"><button class="tombol utama" id="b-cetak" type="button">${ikon("cetak")}Cetak</button></div></div>
  <div class="saring">
    <label class="f" for="l-ruang">Ruang<select id="l-ruang"><option value="">Semua ruang</option>${opsi(S.ruang.map((r) => [r.kode, r.nama]), S.labelRuang)}${opsi([["-", "Belum ada ruang"]], S.labelRuang)}</select></label>
    <label class="f" for="l-gol">Golongan<select id="l-gol"><option value="">Sarana &amp; alat</option><option value="sarana">Sarana</option><option value="alat">Alat</option></select></label>
    <label class="f" for="l-per">Banyak label<select id="l-per"><option value="1">Satu per jenis barang</option><option value="n">Satu per unit (maks. 40 per jenis)</option></select></label>
  </div>
  <p class="kecil" id="l-jml"></p>
  <div class="lembar-wadah"><div class="lembar" id="lembar"></div></div>
</section>`;
TAB.label.sesudah = () => {
  const gambar = () => {
    S.labelRuang = $("l-ruang").value;
    const per = $("l-per").value, gol = $("l-gol").value;
    const d = S.alat.filter((a) => (!S.labelRuang || (S.labelRuang === "-" ? !a.ruang : a.ruang === S.labelRuang)) && (!gol || golongan(a) === gol));
    const daftar = [];
    d.forEach((a) => { const n = per === "n" ? Math.min(40, a.jumlah) : 1; for (let i = 1; i <= n; i++) daftar.push([a, n > 1 ? `${i}/${n}` : ""]); });
    $("l-jml").textContent = `${daftar.length} label · ${Math.max(1, Math.ceil(daftar.length / 24))} lembar A4`;
    $("lembar").innerHTML = daftar.map(([a, ke], i) => `<div class="label"><div class="qr" id="qr-${i}"></div><div class="t"><small>SMA PLUS MERDEKA SOREANG</small><b>${esc(a.nama)}</b>
      <span class="k">${esc(a.kode)}${ke ? " · " + ke : ""}</span><small>${esc(namaRuang(a.ruang) || "")}${a.sumber_dana ? " · " + esc(a.sumber_dana) : ""}${a.tahun ? " " + a.tahun : ""}</small></div></div>`).join("");
    daftar.forEach(([a], i) => { if (window.QRCode) new QRCode($("qr-" + i), { text: urlKartu(a.kode), width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M }); });
  };
  $("l-ruang").onchange = gambar; $("l-per").onchange = gambar; $("l-gol").onchange = gambar; gambar();
  $("b-cetak").onclick = () => { $("cetak").innerHTML = `<div class="lembar">${$("lembar").innerHTML}</div>`; window.print(); };
};

/* ---------------------------------------------------------------- impor Excel */
let IMPOR = null;
TAB.impor = () => `<section class="kartu">
  <div class="kepala-bagian"><div><h2>Impor BUKU INDUK.xlsx</h2><p class="sub">Setiap baris diperiksa dan dirapikan lebih dulu: penulisan jenis, ruang, dan dana disatukan; kode lama yang tidak cocok ditandai; barang habis pakai masuk ke Bahan. Belum ada yang tersimpan sampai Anda menekan Impor. Baris yang pernah diimpor otomatis dilewati.</p></div></div>
  <label class="f" for="berkas">Pilih berkas Excel<input id="berkas" type="file" accept=".xlsx,.xls"></label>
  <div id="hasil-baca"></div>
</section>`;
TAB.impor.sesudah = () => {
  $("berkas").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      if (!window.XLSX) await sibuk(() => muatSkrip("assets/vendor/xlsx-0.20.3.full.min.js"));
      IMPOR = bacaBukuInduk(XLSX.read(await f.arrayBuffer()), f.name);
      tampilImpor();
    } catch (err) { $("hasil-baca").innerHTML = `<p class="galat">${esc(err.message)}</p>`; }
  };
};
function muatSkrip(src) { return new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => gagal(new Error("Pustaka Excel gagal dimuat. Periksa internet lalu coba lagi.")); document.head.appendChild(s); }); }
function kategoriDari(j) {
  j = String(j || "").toLowerCase();
  if (/furni|mebel|meubel/.test(j)) return "F";
  if (/elektronik|tik|komputer/.test(j)) return "E";
  if (/kebersihan/.test(j)) return "K";
  if (/olahraga/.test(j)) return "O";
  if (/praktikum|lab/.test(j)) return "L";
  if (/kesenian|musik|seni/.test(j)) return "S";
  if (/dapur/.test(j)) return "D";
  if (/medis|uks|kesehatan/.test(j)) return "U";
  if (/ibadah|pai/.test(j)) return "PI";
  return "P";
}
const BAHAN_IMPOR = /kantong plastik|lap lembut/i;
function bacaBukuInduk(wb, namaBerkas) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
  const hi = rows.findIndex((r) => r.some((v) => /nama\s*barang/i.test(String(v))));
  if (hi < 0) throw new Error('Kolom "NAMA BARANG" tidak ditemukan di lembar pertama.');
  const kep = rows[hi].map((v) => String(v).trim().toLowerCase());
  const kol = (re) => kep.findIndex((k) => re.test(k));
  const K = { nama: kol(/nama\s*barang/), jml: kol(/jumlah/), jenis: kol(/jenis/), merek: kol(/merek/), kondisi: kol(/kondisi/),
    tahun: kol(/tahun/), lokasi: kol(/lokasi/), dana: kol(/dana/), kode: kol(/kode/), ket: kol(/keterangan/) };
  const ambil = (r, k) => (K[k] >= 0 ? String(r[K[k]] ?? "") : "").trim();
  const cariRuang = (nama) => {
    const n = nama.toLowerCase().replace(/\s+/g, " ").trim();
    if (!n) return null;
    if (/^ruang kelas$/.test(n)) return "RK";
    const r = S.ruang.find((x) => x.nama.toLowerCase() === n || x.kode.toLowerCase() === n);
    return r ? r.kode : undefined;
  };
  const baris = [], tanda = { ruangTakDikenal: new Set(), kodeTakCocok: [], bahan: [] };
  rows.slice(hi + 1).forEach((r, i) => {
    const nama = ambil(r, "nama").replace(/\s*-\s*$/, "");
    if (!nama) return;
    const ke = hi + 2 + i;
    const ket = [];
    const lok = String(K.lokasi >= 0 ? r[K.lokasi] : "").split(/\n|,|\//).map((s) => s.trim()).filter(Boolean);
    let ruang = null;
    if (lok.length) {
      ruang = cariRuang(lok[0]);
      if (ruang === undefined) { tanda.ruangTakDikenal.add(lok[0]); ket.push("Lokasi di Excel: " + lok[0]); ruang = null; }
      if (lok.length > 1) ket.push("Juga di: " + lok.slice(1).join(", "));
    }
    const jmlX = parseInt(ambil(r, "jml").replace(/\D/g, ""), 10);
    const ketX = ambil(r, "ket");
    if (BAHAN_IMPOR.test(nama)) {
      tanda.bahan.push(nama);
      if (ketX) ket.push(ketX);
      baris.push({ jenis_baris: "bahan", sumber: `${namaBerkas} baris ${ke}`, nama: nama.charAt(0).toUpperCase() + nama.slice(1), kategori: "Kebersihan",
        ruang, satuan: /kantong/i.test(nama) ? "pak" : "buah", stok: jmlX > 0 ? jmlX : 0, batas_min: 0, keterangan: ket.join(". ") });
      return;
    }
    const kat = kategoriDari(ambil(r, "jenis"));
    const danaX = ambil(r, "dana");
    const dana = !danaX ? null : /yayasan/i.test(danaX) ? "Yayasan" : /bos/i.test(danaX) ? "BOS Reguler" : "Lainnya";
    if (dana === "Lainnya") ket.push("Dana di Excel: " + danaX);
    const kodeLama = ambil(r, "kode");
    let tahun = parseInt(ambil(r, "tahun"), 10);
    if (!tahun && /-(\d{4})$/.test(kodeLama)) tahun = +kodeLama.slice(-4);
    const kond = ambil(r, "kondisi").toLowerCase(), n = jmlX > 0 ? jmlX : 1;
    const kondisi = /berat/.test(kond) ? { baik: 0, rusak_ringan: 0, rusak_berat: n } : /rusak/.test(kond) ? { baik: 0, rusak_ringan: n, rusak_berat: 0 } : { baik: n, rusak_ringan: 0, rusak_berat: 0 };
    if (kodeLama) {
      const p = kodeLama.split("-"), kj = p[3], kr = (p[4] || "").toUpperCase();
      if (kj !== kat || !ruang || kr !== ruang) { tanda.kodeTakCocok.push(`${nama} (baris ${ke}): ${kodeLama}`); ket.push("Kode lama tidak cocok dengan isi baris"); }
    }
    if (/^alat\s*-?\s*alat/i.test(nama)) ket.push("Perlu dirinci per alat");
    if (/obat/i.test(nama)) ket.push("Obat-obatan sebaiknya dicatat juga sebagai bahan");
    if (ketX) ket.push(ketX);
    baris.push({ sumber: `${namaBerkas} baris ${ke}`, nama: nama.charAt(0).toUpperCase() + nama.slice(1), kategori: kat, ruang, ...kondisi,
      jumlah_pasti: jmlX > 0, tahun: tahun || null, sumber_dana: dana, merek: ambil(r, "merek"), kode_lama: kodeLama, keterangan: ket.join(". ") });
  });
  return { berkas: namaBerkas, baris, tanda, kolomHilang: Object.entries(K).filter(([, v]) => v < 0).map(([k]) => k) };
}
function tampilImpor() {
  const I = IMPOR, B = I.baris, A = B.filter((b) => b.jenis_baris !== "bahan"), H = B.filter((b) => b.jenis_baris === "bahan");
  $("hasil-baca").innerHTML = `
    <div class="ubin">
      <div class="b"><span class="lambang">${ikon("kotak")}</span><span><b>${A.length}</b><span class="t">sarana &amp; alat siap diimpor</span></span></div>
      <div class="i"><span class="lambang">${ikon("bahan")}</span><span><b>${H.length}</b><span class="t">bahan habis pakai</span></span></div>
      <div class="c"><span class="lambang">${ikon("ruang")}</span><span><b>${A.filter((b) => !b.ruang).length}</b><span class="t">tanpa ruang</span></span></div>
      <div class="k"><span class="lambang">${ikon("awas")}</span><span><b>${I.tanda.kodeTakCocok.length}</b><span class="t">kode lama tidak cocok</span></span></div>
    </div>
    ${I.kolomHilang.length ? `<p class="catatan awas">${ikon("awas")}<span>Kolom tidak ditemukan: ${esc(I.kolomHilang.join(", "))}. Isinya dianggap kosong.</span></p>` : ""}
    ${H.length ? `<p class="catatan">${ikon("bahan")}<span>Masuk ke <b>Bahan</b> dengan stok sesuai kolom JUMLAH: ${H.map((b) => esc(b.nama)).join(", ")}.</span></p>` : ""}
    ${I.tanda.ruangTakDikenal.size ? `<p class="catatan awas">${ikon("awas")}<span>Lokasi yang belum ada di daftar ruang: <b>${esc([...I.tanda.ruangTakDikenal].join(", "))}</b>. Barangnya diimpor tanpa ruang. Tambahkan ruangnya lebih dulu bila ingin langsung terhubung, lalu pilih berkas lagi.</span></p>` : ""}
    ${I.tanda.kodeTakCocok.length ? `<p class="catatan emas">${ikon("info")}<span>Kode lama tidak cocok dengan isi baris (tetap disimpan sebagai kode lama dan ditandai di keterangan):<br>${I.tanda.kodeTakCocok.map(esc).join("<br>")}</span></p>` : ""}
    ${A.filter((b) => !b.jumlah_pasti).length ? `<p class="catatan emas">${ikon("info")}<span>${A.filter((b) => !b.jumlah_pasti).length} baris jumlahnya kosong. Sementara dicatat 1 dan ditandai "Jumlah" sampai dihitung ulang.</span></p>` : ""}
    <div class="gulir" style="max-height:440px"><table><thead><tr><th>Baris</th><th>Nama</th><th>Masuk ke</th><th>Ruang</th><th class="n">Jml</th><th>Dana</th><th>Tahun</th><th>Kode lama</th><th>Keterangan</th></tr></thead><tbody>
      ${B.map((b) => `<tr><td class="kecil">${esc(b.sumber.replace(I.berkas + " baris ", ""))}</td><td><b>${esc(b.nama)}</b></td>
        <td>${b.jenis_baris === "bahan" ? '<span class="pil i">Bahan</span>' : `<span class="pil n">${esc(namaKat(b.kategori))}</span>`}</td><td>${esc(namaRuang(b.ruang) || "—")}</td>
        <td class="n">${b.jenis_baris === "bahan" ? bil(b.stok) : b.jumlah_pasti ? b.baik + b.rusak_ringan + b.rusak_berat : "?"}</td><td>${esc(b.sumber_dana || "—")}</td><td>${esc(b.tahun || "—")}</td>
        <td class="kode">${esc(b.kode_lama || "")}</td><td class="kecil">${esc(b.keterangan)}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="aksi" style="justify-content:flex-end"><button class="tombol utama besar" id="b-impor" type="button">${ikon("unggah")}Impor ${B.length} baris</button></div>`;
  $("b-impor").onclick = async () => {
    try {
      const h = await sibuk(() => rpc("sp_impor", { p_pin: S.pin, p_baris: B }));
      await muatUlang();
      $("hasil-baca").innerHTML = `<p class="catatan">${ikon("centang")}<span>Selesai: <b>${h.masuk}</b> baris diimpor${h.lewat ? `, ${h.lewat} baris dilewati karena sudah pernah diimpor` : ""}. Lanjutkan di tab Ruang atau di Sarana &amp; Alat (saring "Perlu dilengkapi").</span></p>`;
      toast(`${h.masuk} baris diimpor`);
    } catch (err) { $("hasil-baca").insertAdjacentHTML("afterbegin", `<p class="galat">${esc(err.message)}</p>`); }
  };
}

/* ---------------------------------------------------------------- unduh Excel */
async function unduhExcel(daftar) {
  try {
    if (!window.XLSX) await sibuk(() => muatSkrip("assets/vendor/xlsx-0.20.3.full.min.js"));
    const kepala = ["No", "Kode Inventaris", "Kode Lama", "Nama Barang", "Golongan", "Kategori", "Merek/Tipe", "Spesifikasi", "Ruang", "Penanggung Jawab",
      "Jumlah", "Baik", "Rusak Ringan", "Rusak Berat", "Tahun Perolehan", "Sumber Dana", "Kode Rekening ARKAS", "No. Bukti BKU", "Tgl Bukti",
      "Harga Satuan", "Nilai Perolehan", "Keterangan"];
    const isi = daftar.map((a, i) => [i + 1, a.kode, a.kode_lama || "", a.nama, golongan(a) === "sarana" ? "Sarana" : "Alat", namaKat(a.kategori), a.merek || "", a.spesifikasi || "",
      namaRuang(a.ruang), a.ruang ? (ruangOf(a.ruang) || {}).pj_nama || "" : "", a.jumlah_pasti ? a.jumlah : "", a.baik, a.rusak_ringan, a.rusak_berat,
      a.tahun || "", a.sumber_dana || "", a.kode_arkas || "", a.no_bukti || "", a.tgl_bukti || "",
      a.harga_satuan == null ? "" : Number(a.harga_satuan), a.harga_satuan == null ? "" : Number(a.harga_satuan) * a.jumlah, a.keterangan || ""]);
    const ws = XLSX.utils.aoa_to_sheet([["BUKU INVENTARIS SARANA & ALAT"], ["SMA PLUS MERDEKA SOREANG"], ["Diunduh " + new Date().toLocaleString("id-ID")], [], kepala, ...isi]);
    ws["!cols"] = [5, 22, 24, 34, 9, 18, 16, 20, 20, 24, 8, 7, 8, 8, 9, 14, 20, 14, 11, 14, 15, 40].map((w) => ({ wch: w }));
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: kepala.length - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: kepala.length - 1 } }];
    const kb = ["No", "Nama Bahan", "Kategori", "Ruang", "Stok", "Satuan", "Batas Minimum", "Status", "Keterangan"];
    const isiB = S.bahan.map((b, i) => [i + 1, b.nama, b.kategori, namaRuang(b.ruang), Number(b.stok), b.satuan, Number(b.batas_min), statusBahan(b)[0], b.keterangan || ""]);
    const wsB = XLSX.utils.aoa_to_sheet([["STOK BAHAN HABIS PAKAI"], ["SMA PLUS MERDEKA SOREANG"], [], kb, ...isiB]);
    wsB["!cols"] = [5, 34, 16, 22, 8, 10, 12, 10, 40].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sarana & Alat");
    XLSX.utils.book_append_sheet(wb, wsB, "Bahan");
    XLSX.writeFile(wb, `Buku_Inventaris_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (err) { toast(err.message); }
}

/* ================================================================ mulai */
document.addEventListener("DOMContentLoaded", async () => {
  pasangIkon();
  $("tab").addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (b) buka(b.dataset.tab); });
  $("form-pin").onsubmit = async (e) => {
    e.preventDefault(); $("galat-pin").hidden = true;
    try { await sibuk(() => masuk($("pin").value.trim())); }
    catch (err) { $("galat-pin").textContent = err.message; $("galat-pin").hidden = false; }
  };
  const kode = new URLSearchParams(location.search).get("k");
  if (kode) return kartuPublik(kode);
  const pin = ssGet("sp_pin");
  if (pin) { try { await sibuk(() => masuk(pin)); return; } catch (e) { ssSet("sp_pin", null); } }
  $("layar-masuk").hidden = false; $("pin").focus();
});
