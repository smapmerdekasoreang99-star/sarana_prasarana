/* Sarana Prasarana — Inventaris Alat (Tahap 1, 31 Okt 2026). Lihat RENCANA_SARANA_PRASARANA.md.
   Server: Merdeka Tools (config.js sama dengan Tryout/Matdas/ER). Semua data lewat fungsi sp_*:
   aplikasi tidak membaca tabel langsung. Hak ubah diperiksa di server; tampilan hanya menyembunyikan tombol.
   ?k=<kode> membuka kartu barang tanpa PIN (dari label QR). */
"use strict";

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

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const bil = (n) => Number(n || 0).toLocaleString("id-ID");
const rp = (n) => n == null || n === "" ? "" : "Rp " + Number(n).toLocaleString("id-ID");
const tgl = (s) => s ? new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("tampil"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("tampil"), 2800); }
async function sibuk(fn) { $("sibuk").hidden = false; try { return await fn(); } finally { $("sibuk").hidden = true; } }
function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function ssSet(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* mode privat */ } }

const S = { pin: null, akses: null, kategori: [], ruang: [], dana: [], guru: null, alat: [], tab: "ringkas",
  saring: { q: "", kat: "", ruang: "", lengkap: "" }, labelRuang: "" };
const admin = () => S.akses && S.akses.peran === "admin";
const bisaUbah = () => S.akses && S.akses.peran !== "lihat";
const bolehRuang = (r) => admin() || (S.akses.peran === "pj" && r && (S.akses.ruang || []).includes(r));
const namaKat = (k) => (S.kategori.find((x) => x.kode === k) || {}).nama || k;
const ruangOf = (k) => S.ruang.find((x) => x.kode === k);
const namaRuang = (k) => (ruangOf(k) || {}).nama || "";
const BOS = (d) => /^BOS/.test(d || "");
const urlKartu = (kode) => location.origin + location.pathname + "?k=" + encodeURIComponent(kode);

// Isian yang masih kosong: dipakai sebagai label di tabel dan saringan "Perlu dilengkapi".
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

/* ================================================================ kartu publik (QR) */
async function kartuPublik(kode) {
  const el = $("layar-publik");
  el.hidden = false;
  el.innerHTML = `<section class="kartu"><p class="sub">Memuat kartu barang ${esc(kode)}…</p></section>`;
  try {
    const b = await rpc("sp_barang_publik", { p_kode: kode });
    if (!b) { el.innerHTML = `<section class="kartu"><h1>Kode tidak ditemukan</h1><p class="sub">Kode ${esc(kode)} belum tercatat di inventaris. Laporkan ke Staf Sarpras.</p></section>`; return; }
    const jml = b.baik + b.rusak_ringan + b.rusak_berat;
    el.innerHTML = `<section class="kartu">
      <span class="kode">${esc(b.kode)}</span>
      <h1>${esc(b.nama)}</h1>
      ${b.status === "dihapus" ? '<p class="catatan awas">Barang ini sudah dihapus dari inventaris.</p>' : ""}
      <dl class="dl">
        <dt>Kategori</dt><dd>${esc(b.kategori)}</dd>
        <dt>Ruang</dt><dd>${esc(b.ruang || "Belum diisi")}</dd>
        <dt>Penanggung jawab</dt><dd>${esc(b.pj || "Staf Sarpras")}</dd>
        <dt>Jumlah &amp; kondisi</dt><dd>${b.jumlah_pasti ? jml : "Belum dihitung"} · <span class="pil b">Baik ${b.baik}</span>${b.rusak_ringan ? `<span class="pil c">Rusak ringan ${b.rusak_ringan}</span>` : ""}${b.rusak_berat ? `<span class="pil k">Rusak berat ${b.rusak_berat}</span>` : ""}</dd>
        ${b.merek ? `<dt>Merek</dt><dd>${esc(b.merek)}</dd>` : ""}
        <dt>Tahun perolehan</dt><dd>${esc(b.tahun || "Belum diisi")}</dd>
        <dt>Sumber dana</dt><dd>${esc(b.sumber_dana || "Belum diisi")}</dd>
      </dl>
      <p class="kecil">Kerusakan? Sampaikan ke penanggung jawab ruang. Penanggung jawab bisa masuk untuk mengubah data.</p>
      <div><a class="tombol utama" href="${esc(location.pathname)}">Masuk dengan PIN</a></div>
    </section>`;
  } catch (e) {
    el.innerHTML = `<section class="kartu"><p class="galat">${esc(e.message)}</p></section>`;
  }
}

/* ================================================================ masuk */
async function masuk(pin) {
  const d = await rpc("sp_masuk", { p_pin: pin });
  S.pin = pin; S.akses = d.akses; S.kategori = d.kategori; S.ruang = d.ruang; S.dana = d.dana; S.guru = d.guru;
  S.alat = await rpc("sp_alat_daftar", { p_pin: pin });
  ssSet("sp_pin", pin);
  $("layar-masuk").hidden = true; $("layar-app").hidden = false; $("keluar").hidden = false;
  const peran = { admin: "Staf Sarpras (semua ruang)", pj: "Penanggung jawab: " + (S.akses.ruang || []).map(namaRuang).join(", "), lihat: "Hanya melihat" }[S.akses.peran];
  $("siapa").innerHTML = `<b>${esc(S.akses.nama)}</b>${esc(peran)}`; $("siapa").hidden = false;
  document.querySelectorAll("[data-admin]").forEach((b) => (b.hidden = !admin()));
  buka(S.tab);
}
async function muatUlang() { S.alat = await rpc("sp_alat_daftar", { p_pin: S.pin }); }
function keluar() { ssSet("sp_pin", null); location.href = location.pathname; }

/* ================================================================ tab */
const TAB = {};
function buka(tab) {
  if (tab === "impor" && !admin()) tab = "ringkas";
  S.tab = tab;
  document.querySelectorAll("#tab button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab));
  $("isi").innerHTML = TAB[tab]();
  if (TAB[tab].sesudah) TAB[tab].sesudah();
}

TAB.ringkas = () => {
  const A = S.alat, unit = A.reduce((s, a) => s + a.jumlah, 0);
  const rr = A.reduce((s, a) => s + a.rusak_ringan, 0), rb = A.reduce((s, a) => s + a.rusak_berat, 0);
  const tidakLengkap = A.filter((a) => kurang(a).length).length;
  const perKat = S.kategori.map((k) => [k.nama, A.filter((a) => a.kategori === k.kode).length]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]);
  const mk = Math.max(1, ...perKat.map((x) => x[1]));
  const isian = ["Ruang", "Jumlah", "Tahun", "Dana", "Harga", "Kode ARKAS"].map((n) => [n, A.filter((a) => kurang(a).includes(n)).length]);
  const tanpaRuang = A.filter((a) => !a.ruang).length;
  const milikku = S.akses.peran === "pj" ? `<p class="catatan">Anda penanggung jawab <b>${esc((S.akses.ruang || []).map(namaRuang).join(", "))}</b>. Barang di ruang itu bisa Anda tambah dan ubah lewat Daftar Alat.</p>` : "";
  return `${milikku}
  <div class="ubin">
    <div class="b"><b>${bil(A.length)}</b><span>jenis alat tercatat</span></div>
    <div><b>${bil(unit)}</b><span>unit seluruhnya</span></div>
    <div class="${rr + rb ? "k" : "b"}"><b>${bil(rr + rb)}</b><span>unit rusak (ringan ${bil(rr)}, berat ${bil(rb)})</span></div>
    <div class="${tidakLengkap ? "c" : "b"}"><b>${bil(tidakLengkap)}</b><span>jenis alat yang datanya belum lengkap</span></div>
  </div>
  <div class="grid2">
    <section class="kartu"><h2>Alat per kategori</h2>
      <div class="batang">${perKat.map(([n, v]) => `<div class="r"><span>${esc(n)}</span><div class="jalur"><i style="width:${(v / mk) * 100}%"></i></div><span class="n">${v}</span></div>`).join("") || '<p class="sub">Belum ada alat.</p>'}</div>
    </section>
    <section class="kartu"><h2>Isian yang masih kosong</h2>
      <p class="sub">Banyaknya jenis alat yang isiannya belum diisi. Kode ARKAS hanya dihitung untuk barang dari dana BOS.</p>
      <div class="batang">${isian.map(([n, v]) => `<div class="r"><span>${esc(n)}</span><div class="jalur"><i class="k" style="width:${A.length ? (v / A.length) * 100 : 0}%"></i></div><span class="n">${v}</span></div>`).join("")}</div>
    </section>
  </div>
  <section class="kartu"><h2>Alat per ruang</h2>
    <div class="gulir"><table><thead><tr><th>Ruang</th><th>Penanggung jawab</th><th class="n">Jenis alat</th><th class="n">Unit</th><th class="n">Rusak</th></tr></thead><tbody>
    ${S.ruang.filter((r) => r.aktif).map((r) => { const x = A.filter((a) => a.ruang === r.kode); return `<tr><td>${esc(r.nama)} <span class="kode">${esc(r.kode)}</span></td><td>${esc(r.pj_nama)}</td><td class="n">${x.length}</td><td class="n">${bil(x.reduce((s, a) => s + a.jumlah, 0))}</td><td class="n">${bil(x.reduce((s, a) => s + a.rusak_ringan + a.rusak_berat, 0)) || ""}</td></tr>`; }).join("")}
    ${tanpaRuang ? `<tr><td colspan="2"><span class="pil k">Belum ada ruang</span></td><td class="n">${tanpaRuang}</td><td></td><td></td></tr>` : ""}
    </tbody></table></div>
  </section>`;
};

/* ---------------------------------------------------------------- daftar alat */
function saringAlat() {
  const { q, kat, ruang, lengkap } = S.saring, qq = q.toLowerCase();
  return S.alat.filter((a) => (!qq || (a.nama + " " + a.kode + " " + (a.kode_lama || "") + " " + (a.merek || "")).toLowerCase().includes(qq))
    && (!kat || a.kategori === kat) && (!ruang || (ruang === "-" ? !a.ruang : ruang === "@saya" ? bolehRuang(a.ruang) : a.ruang === ruang))
    && (!lengkap || (lengkap === "ya" ? !kurang(a).length : kurang(a).length)));
}
TAB.alat = () => {
  const s = S.saring;
  const opsi = (arr, v) => arr.map(([k, n]) => `<option value="${esc(k)}"${k === v ? " selected" : ""}>${esc(n)}</option>`).join("");
  return `<section class="kartu">
    <div class="alat-baris">
      <label class="f" for="s-q">Cari nama, kode, merek<input type="search" id="s-q" value="${esc(s.q)}" placeholder="mis. proyektor"></label>
      <label class="f" for="s-kat">Kategori<select id="s-kat"><option value="">Semua</option>${opsi(S.kategori.map((k) => [k.kode, k.nama]), s.kat)}</select></label>
      <label class="f" for="s-ruang">Ruang<select id="s-ruang"><option value="">Semua</option>${S.akses.peran === "pj" ? `<option value="@saya"${s.ruang === "@saya" ? " selected" : ""}>Ruang saya</option>` : ""}${opsi(S.ruang.map((r) => [r.kode, r.nama]), s.ruang)}<option value="-"${s.ruang === "-" ? " selected" : ""}>Belum ada ruang</option></select></label>
      <label class="f" for="s-lengkap">Kelengkapan<select id="s-lengkap"><option value="">Semua</option>${opsi([["ya", "Sudah lengkap"], ["tidak", "Perlu dilengkapi"]], s.lengkap)}</select></label>
      <div class="dorong">
        ${bisaUbah() ? '<button class="tombol utama" id="b-baru" type="button">+ Catat barang</button>' : ""}
        <button class="tombol" id="b-unduh" type="button">Unduh Excel</button>
      </div>
    </div>
    <p class="kecil" id="jml"></p>
    <div class="gulir"><table><thead><tr><th>Kode</th><th>Nama barang</th><th>Kategori</th><th>Ruang</th><th class="n">Jml</th><th>Kondisi</th><th>Dana</th><th>Tahun</th><th>Belum diisi</th></tr></thead><tbody id="tb"></tbody></table></div>
  </section>`;
};
TAB.alat.sesudah = () => {
  isiTabelAlat();
  const ubah = (id, k) => $(id).addEventListener("input", (e) => { S.saring[k] = e.target.value; isiTabelAlat(); });
  ubah("s-q", "q"); ubah("s-kat", "kat"); ubah("s-ruang", "ruang"); ubah("s-lengkap", "lengkap");
  if ($("b-baru")) $("b-baru").onclick = () => formAlat(null);
  $("b-unduh").onclick = () => unduhExcel(saringAlat());
  $("tb").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) bukaAlat(+tr.dataset.id); });
  $("tb").addEventListener("keydown", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); bukaAlat(+tr.dataset.id); } });
};
function isiTabelAlat() {
  const d = saringAlat();
  $("jml").textContent = `${d.length} dari ${S.alat.length} jenis alat · ${bil(d.reduce((s, a) => s + a.jumlah, 0))} unit`;
  $("tb").innerHTML = d.map((a) => {
    const k = kurang(a);
    return `<tr class="klik" tabindex="0" data-id="${a.id}"><td class="kode">${esc(a.kode)}</td><td>${esc(a.nama)}${a.merek ? `<div class="kecil">${esc(a.merek)}</div>` : ""}</td>
      <td>${esc(namaKat(a.kategori))}</td><td>${esc(namaRuang(a.ruang) || "—")}</td><td class="n">${a.jumlah_pasti ? a.jumlah : "?"}</td>
      <td>${a.rusak_ringan + a.rusak_berat ? `${a.rusak_ringan ? `<span class="pil c">RR ${a.rusak_ringan}</span>` : ""}${a.rusak_berat ? `<span class="pil k">RB ${a.rusak_berat}</span>` : ""}` : '<span class="pil b">Baik</span>'}</td>
      <td>${esc(a.sumber_dana || "—")}</td><td>${esc(a.tahun || "—")}</td>
      <td>${k.map((x) => `<span class="pil ${x === "Ruang" || x === "Kode ARKAS" ? "k" : "c"}">${x}</span>`).join("")}</td></tr>`;
  }).join("") || `<tr><td colspan="9" class="sub">Tidak ada barang yang cocok.</td></tr>`;
}

/* ---------------------------------------------------------------- dialog */
function dialog(judul, isi, kaki, onSimpan) {
  $("dlg-judul").textContent = judul; $("dlg-isi").innerHTML = isi; $("dlg-kaki").innerHTML = kaki; $("dlg-galat").hidden = true;
  const dlg = $("dlg");
  $("dlg-form").onsubmit = async (e) => {
    const tombol = e.submitter && e.submitter.value;
    if (!tombol || tombol === "batal") return;
    e.preventDefault();
    try { await onSimpan(tombol); } catch (err) { $("dlg-galat").textContent = err.message; $("dlg-galat").hidden = false; }
  };
  if (!dlg.open) dlg.showModal();
}
const tutupDialog = () => $("dlg").close();

async function bukaAlat(id) {
  const a = S.alat.find((x) => x.id === id);
  if (!a) return;
  if (bolehRuang(a.ruang)) return formAlat(a);
  // Hanya melihat
  const riw = await rpc("sp_riwayat_daftar", { p_pin: S.pin, p_id: a.id }).catch(() => []);
  dialog(a.nama, `<span class="kode">${esc(a.kode)}</span>${rincianAlat(a)}${htmlRiwayat(riw)}
    <p class="kecil">Barang ini di ruang yang bukan tanggung jawab Anda, jadi hanya bisa dilihat.</p>`,
    '<button class="tombol" value="batal">Tutup</button>', async () => {});
}
function rincianAlat(a) {
  return `<dl class="dl">
    <dt>Kategori</dt><dd>${esc(namaKat(a.kategori))}</dd>
    <dt>Ruang</dt><dd>${esc(namaRuang(a.ruang) || "Belum diisi")}</dd>
    <dt>Jumlah &amp; kondisi</dt><dd>${a.jumlah_pasti ? a.jumlah : "Belum dihitung"} · Baik ${a.baik}, rusak ringan ${a.rusak_ringan}, rusak berat ${a.rusak_berat}</dd>
    <dt>Merek / spesifikasi</dt><dd>${esc([a.merek, a.spesifikasi].filter(Boolean).join(" · ") || "—")}</dd>
    <dt>Tahun · dana</dt><dd>${esc(a.tahun || "—")} · ${esc(a.sumber_dana || "—")}</dd>
    ${BOS(a.sumber_dana) ? `<dt>Kode ARKAS</dt><dd class="kode">${esc(a.kode_arkas || "—")}</dd>` : ""}
    <dt>Bukti BKU</dt><dd>${esc([a.no_bukti, a.tgl_bukti].filter(Boolean).join(" · ") || "—")}</dd>
    <dt>Harga satuan</dt><dd>${esc(rp(a.harga_satuan) || "—")}</dd>
    ${a.kode_lama ? `<dt>Kode lama</dt><dd class="kode">${esc(a.kode_lama)}</dd>` : ""}
    ${a.keterangan ? `<dt>Keterangan</dt><dd>${esc(a.keterangan)}</dd>` : ""}
  </dl>`;
}
const JENIS_RIW = { baru: "Dicatat", impor: "Diimpor dari Excel", ubah: "Diubah", pindah: "Dipindah", kondisi: "Kondisi diubah", hapus: "Dihapus" };
const LABEL_ISIAN = { nama: "nama", kategori: "kategori", ruang: "ruang", merek: "merek", spesifikasi: "spesifikasi", baik: "baik", rusak_ringan: "rusak ringan",
  rusak_berat: "rusak berat", jumlah_pasti: "jumlah pasti", tahun: "tahun", sumber_dana: "dana", kode_arkas: "kode ARKAS", no_bukti: "no. bukti",
  tgl_bukti: "tgl bukti", harga_satuan: "harga", keterangan: "keterangan" };
function htmlRiwayat(riw) {
  if (!riw || !riw.length) return "";
  const urai = (r) => {
    if (!r.rincian) return "";
    if (r.jenis === "hapus") return "Alasan: " + r.rincian.alasan;
    if (r.jenis === "impor") return r.rincian.sumber || "";
    if (r.jenis === "baru") return r.rincian.ruang ? "di " + namaRuang(r.rincian.ruang) : "";
    return Object.entries(r.rincian).map(([k, [l, b]]) => `${LABEL_ISIAN[k] || k}: ${k === "ruang" ? namaRuang(l) || "—" : l ?? "—"} → ${k === "ruang" ? namaRuang(b) || "—" : b ?? "—"}`).join("; ");
  };
  return `<h3>Riwayat</h3><ul class="riwayat">${riw.map((r) => `<li><time>${tgl(r.waktu)}</time><span><b>${JENIS_RIW[r.jenis] || r.jenis}</b> oleh ${esc(r.oleh || "—")}<br><span class="kecil">${esc(urai(r))}</span></span></li>`).join("")}</ul>`;
}

async function formAlat(a) {
  const baru = !a;
  a = a || { baik: 1, rusak_ringan: 0, rusak_berat: 0, jumlah_pasti: true, kategori: "", ruang: S.akses.peran === "pj" ? (S.akses.ruang || [])[0] : "" };
  const riw = baru ? [] : await rpc("sp_riwayat_daftar", { p_pin: S.pin, p_id: a.id }).catch(() => []);
  const ruangBoleh = S.ruang.filter((r) => r.aktif && bolehRuang(r.kode));
  const v = (x) => esc(x == null ? "" : x);
  const opsi = (arr, cur) => arr.map(([k, n]) => `<option value="${esc(k)}"${k === (cur || "") ? " selected" : ""}>${esc(n)}</option>`).join("");
  const isi = `${baru ? "" : `<span class="kode">${esc(a.kode)}${a.kode_lama ? " · kode lama " + esc(a.kode_lama) : ""}</span>`}
    <div class="isian-grid">
      <label class="f lebar" for="f-nama">Nama barang<input id="f-nama" value="${v(a.nama)}" maxlength="150" required></label>
      <label class="f" for="f-kat">Kategori<select id="f-kat" required><option value="">Pilih…</option>${opsi(S.kategori.map((k) => [k.kode, k.nama]), a.kategori)}</select></label>
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
      ${a.jumlah_pasti ? "" : `<label class="kecil"><input type="checkbox" id="f-pasti" style="width:auto;min-height:0"> Jumlah sudah dihitung ulang (di Excel kosong, dicatat 1)</label>`}
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
      <p class="kecil">Kode rekening diambil dari ARKAS (tanyakan bendahara BOS). Kode di RKAS hanya perkiraan.</p>
    </fieldset>
    <label class="f" for="f-ket">Keterangan<textarea id="f-ket" maxlength="500">${v(a.keterangan)}</textarea></label>
    ${baru ? "" : '<p class="kecil">Kode inventaris tidak berubah walaupun tahun, kategori, atau ruang diubah, karena labelnya sudah tertempel.</p>'}
    ${htmlRiwayat(riw)}`;
  const kaki = `${!baru && admin() ? '<button class="tombol bahaya kiri" value="hapus">Hapus…</button>' : ""}
    <button class="tombol" value="batal">Batal</button><button class="tombol utama" value="simpan">${baru ? "Catat" : "Simpan"}</button>`;
  dialog(baru ? "Catat barang baru" : a.nama, isi, kaki, async (aksi) => {
    if (aksi === "hapus") return konfirmasiHapus(a);
    const n = (id) => { const x = $(id).value.trim(); return x === "" ? null : Number(x); };
    const data = {
      nama: $("f-nama").value, kategori: $("f-kat").value, ruang: $("f-ruang").value, merek: $("f-merek").value, spesifikasi: $("f-spes").value,
      baik: n("f-baik") || 0, rusak_ringan: n("f-rr") || 0, rusak_berat: n("f-rb") || 0,
      tahun: n("f-tahun"), sumber_dana: $("f-dana").value, harga_satuan: n("f-harga"), kode_arkas: $("f-arkas").value,
      no_bukti: $("f-bukti").value, tgl_bukti: $("f-tglbukti").value, keterangan: $("f-ket").value,
    };
    if (!data.kategori) throw new Error("Pilih kategori.");
    if (!BOS(data.sumber_dana)) data.kode_arkas = "";
    if (!baru) data.id = a.id;
    if (!baru && !a.jumlah_pasti && $("f-pasti") && $("f-pasti").checked) data.jumlah_pasti = true;
    const hasil = await sibuk(() => rpc("sp_alat_simpan", { p_pin: S.pin, p_a: data }));
    const i = S.alat.findIndex((x) => x.id === hasil.id);
    if (i >= 0) S.alat[i] = hasil; else S.alat.push(hasil);
    tutupDialog(); buka(S.tab);
    toast(baru ? `Tercatat: ${hasil.kode}` : "Tersimpan");
  });
  const aturArkas = () => { $("l-arkas").hidden = !BOS($("f-dana").value); };
  $("f-dana").addEventListener("change", aturArkas); aturArkas();
}
function konfirmasiHapus(a) {
  dialog("Hapus " + a.nama + "?", `<p>Hapus hanya untuk barang yang <b>salah catat atau tercatat dua kali</b>. Barang yang rusak berat tetap dicatat dengan kondisi rusak berat; penghapusan aset resmi menyusul di tahap berikutnya.</p>
    <label class="f" for="f-alasan">Alasan<input id="f-alasan" required minlength="3" placeholder="mis. tercatat dua kali dengan SMA-INV-…"></label>
    <p class="kecil">Riwayat barang tetap disimpan.</p>`,
    '<button class="tombol" value="batal">Batal</button><button class="tombol bahaya" value="ya">Hapus</button>', async () => {
      await sibuk(() => rpc("sp_alat_hapus", { p_pin: S.pin, p_id: a.id, p_alasan: $("f-alasan").value }));
      S.alat = S.alat.filter((x) => x.id !== a.id);
      tutupDialog(); buka(S.tab); toast("Barang dihapus dari daftar");
    });
}

/* ---------------------------------------------------------------- ruang */
TAB.ruang = () => `<section class="kartu">
  <div class="alat-baris"><div><h2>Ruang</h2><p class="sub">Penanggung jawab ruang mengisi dan memperbarui barang di ruangnya. Semua ruang kelas dikelola Staf Sarpras.</p></div>
  ${admin() ? '<div class="dorong"><button class="tombol utama" id="b-ruang" type="button">+ Tambah ruang</button></div>' : ""}</div>
  <div class="gulir"><table><thead><tr><th>Kode</th><th>Nama ruang</th><th>Jenis</th><th>Penanggung jawab</th><th class="n">Jenis alat</th><th>Status</th></tr></thead><tbody id="tb-ruang">
  ${S.ruang.map((r) => `<tr${admin() ? ` class="klik" tabindex="0" data-r="${esc(r.kode)}"` : ""}><td class="kode">${esc(r.kode)}</td><td>${esc(r.nama)}</td><td>${esc({ kelas: "Kelas", lab: "Laboratorium", kantor: "Kantor", lainnya: "Lainnya" }[r.jenis])}</td>
    <td>${esc(r.pj_nama)}</td><td class="n">${r.n}</td><td>${r.aktif ? '<span class="pil b">Aktif</span>' : '<span class="pil n">Tidak dipakai</span>'}</td></tr>`).join("")}
  </tbody></table></div>
  ${admin() ? '<p class="kecil">Klik baris untuk mengubah. Ruang "Ruang Kelas (belum dirinci)" berisi barang dari Excel; pindahkan ke ruang kelas masing-masing setelah ruangnya ditambah, mis. RK-X1.</p>' : ""}
</section>`;
TAB.ruang.sesudah = () => {
  if (!admin()) return;
  $("b-ruang").onclick = () => formRuang(null);
  $("tb-ruang").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-r]"); if (tr) formRuang(ruangOf(tr.dataset.r)); });
};
function formRuang(r) {
  const baru = !r; r = r || { aktif: true, jenis: "kelas" };
  const opsi = (arr, cur) => arr.map(([k, n]) => `<option value="${esc(k)}"${k === (cur || "") ? " selected" : ""}>${esc(n)}</option>`).join("");
  dialog(baru ? "Tambah ruang" : "Ubah " + r.nama, `<div class="isian-grid">
      <label class="f" for="r-kode">Kode (huruf/angka, maks. 12)<input id="r-kode" value="${esc(r.kode || "")}" ${baru ? "" : "readonly"} maxlength="12" placeholder="mis. RK-X1" required></label>
      <label class="f" for="r-nama">Nama ruang<input id="r-nama" value="${esc(r.nama || "")}" maxlength="80" required></label>
      <label class="f" for="r-jenis">Jenis<select id="r-jenis">${opsi([["kelas", "Kelas"], ["lab", "Laboratorium"], ["kantor", "Kantor"], ["lainnya", "Lainnya"]], r.jenis)}</select></label>
      <label class="f" for="r-pj" id="l-pj">Penanggung jawab<select id="r-pj"><option value="">Staf Sarpras</option>${opsi((S.guru || []).map((g) => [g.id, g.nama]), r.pj)}</select></label>
      <label class="f" for="r-aktif">Status<select id="r-aktif">${opsi([["1", "Aktif"], ["0", "Tidak dipakai"]], r.aktif ? "1" : "0")}</select></label>
    </div><p class="kecil">Ruang kelas selalu di bawah Staf Sarpras. Kode ruang tidak bisa diubah setelah dibuat.</p>`,
    '<button class="tombol" value="batal">Batal</button><button class="tombol utama" value="simpan">Simpan</button>', async () => {
      S.ruang = await sibuk(() => rpc("sp_ruang_simpan", { p_pin: S.pin, p_r: {
        kode: $("r-kode").value, nama: $("r-nama").value, jenis: $("r-jenis").value, pj: $("r-pj").value, aktif: $("r-aktif").value === "1" } }));
      tutupDialog(); buka("ruang"); toast("Ruang tersimpan");
    });
  const atur = () => { $("l-pj").hidden = $("r-jenis").value === "kelas"; };
  $("r-jenis").addEventListener("change", atur); atur();
}

/* ---------------------------------------------------------------- label QR */
TAB.label = () => `<section class="kartu">
  <h2>Label QR</h2>
  <p class="sub">Cetak di kertas stiker A4 (3 × 8 label, 70 × 37 mm). Tempel pada barang. Saat dipindai dengan kamera HP, kartu barang terbuka tanpa PIN, tanpa harga.</p>
  <div class="alat-baris">
    <label class="f" for="l-ruang">Ruang<select id="l-ruang"><option value="">Semua ruang</option>${S.ruang.map((r) => `<option value="${esc(r.kode)}"${r.kode === S.labelRuang ? " selected" : ""}>${esc(r.nama)}</option>`).join("")}<option value="-"${S.labelRuang === "-" ? " selected" : ""}>Belum ada ruang</option></select></label>
    <label class="f" for="l-per">Label per barang<select id="l-per"><option value="1">Satu label per jenis</option><option value="n">Satu label per unit (maks. 40)</option></select></label>
    <div class="dorong"><button class="tombol utama" id="b-cetak" type="button">Cetak</button></div>
  </div>
  <p class="kecil" id="l-jml"></p>
  <div class="gulir"><div class="lembar" id="lembar"></div></div>
</section>`;
TAB.label.sesudah = () => {
  const gambar = () => {
    S.labelRuang = $("l-ruang").value;
    const per = $("l-per").value;
    const d = S.alat.filter((a) => !S.labelRuang || (S.labelRuang === "-" ? !a.ruang : a.ruang === S.labelRuang));
    const daftar = [];
    d.forEach((a) => { const n = per === "n" ? Math.min(40, a.jumlah) : 1; for (let i = 1; i <= n; i++) daftar.push([a, n > 1 ? `${i}/${n}` : ""]); });
    $("l-jml").textContent = `${daftar.length} label · ${Math.ceil(daftar.length / 24)} lembar A4`;
    $("lembar").innerHTML = daftar.map(([a, ke], i) => `<div class="label"><div class="qr" id="qr-${i}"></div><div class="t"><small>SMA PLUS MERDEKA SOREANG</small><b>${esc(a.nama)}</b>
      <span class="k">${esc(a.kode)}${ke ? " · " + ke : ""}</span><small>${esc(namaRuang(a.ruang) || "")}${a.sumber_dana ? " · " + esc(a.sumber_dana) : ""}${a.tahun ? " " + a.tahun : ""}</small></div></div>`).join("");
    daftar.forEach(([a], i) => { if (window.QRCode) new QRCode($("qr-" + i), { text: urlKartu(a.kode), width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M }); });
  };
  $("l-ruang").onchange = gambar; $("l-per").onchange = gambar; gambar();
  $("b-cetak").onclick = () => { $("cetak").innerHTML = `<div class="lembar">${$("lembar").innerHTML}</div>`; window.print(); };
};

/* ---------------------------------------------------------------- impor Excel */
let IMPOR = null;
TAB.impor = () => `<section class="kartu">
  <h2>Impor BUKU INDUK.xlsx</h2>
  <p class="sub">Baris diperiksa dan dirapikan sebelum disimpan: penulisan jenis, ruang, dan dana disatukan, kode lama yang tidak cocok ditandai. Tidak ada yang langsung tersimpan sampai Anda menekan Impor. Baris yang sudah pernah diimpor otomatis dilewati.</p>
  <label class="f" for="berkas">Pilih berkas Excel<input id="berkas" type="file" accept=".xlsx,.xls"></label>
  <div id="hasil-baca"></div>
</section>`;
TAB.impor.sesudah = () => {
  $("berkas").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      if (!window.XLSX) await muatSkrip("assets/vendor/xlsx-0.20.3.full.min.js");
      IMPOR = bacaBukuInduk(XLSX.read(await f.arrayBuffer()), f.name);
      tampilImpor();
    } catch (err) { $("hasil-baca").innerHTML = `<p class="galat">${esc(err.message)}</p>`; }
  };
};
function muatSkrip(src) { return new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => gagal(new Error("Pustaka Excel gagal dimuat.")); document.head.appendChild(s); }); }

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
  const K = { no: kol(/^no$/), nama: kol(/nama\s*barang/), jml: kol(/jumlah/), jenis: kol(/jenis/), merek: kol(/merek/), kondisi: kol(/kondisi/),
    tahun: kol(/tahun/), lokasi: kol(/lokasi/), dana: kol(/dana/), kode: kol(/kode/), ket: kol(/keterangan/) };
  const ambil = (r, k) => (K[k] >= 0 ? String(r[K[k]] ?? "") : "").trim();
  const cariRuang = (nama) => {
    const n = nama.toLowerCase().replace(/\s+/g, " ").trim();
    if (!n) return null;
    if (/^ruang kelas$/.test(n)) return "RK";
    const r = S.ruang.find((x) => x.nama.toLowerCase() === n || x.kode.toLowerCase() === n);
    return r ? r.kode : undefined;
  };
  const baris = [], lewati = [], tanda = { ruangTakDikenal: new Set(), kodeTakCocok: [], umum: [] };
  rows.slice(hi + 1).forEach((r, i) => {
    const nama = ambil(r, "nama").replace(/\s*-\s*$/, "");
    if (!nama) return;
    const ke = hi + 2 + i;                                   // nomor baris di Excel
    if (BAHAN_IMPOR.test(nama)) { lewati.push(`${nama} (baris ${ke}): bahan habis pakai, dicatat di tahap Bahan`); return; }
    const kat = kategoriDari(ambil(r, "jenis"));
    const ket = [];
    // Ruang: sel bisa berisi dua ruang (baris baru) → ruang pertama, sisanya ke keterangan.
    const lok = String(K.lokasi >= 0 ? r[K.lokasi] : "").split(/\n|,|\//).map((s) => s.trim()).filter(Boolean);
    let ruang = null;
    if (lok.length) {
      ruang = cariRuang(lok[0]);
      if (ruang === undefined) { tanda.ruangTakDikenal.add(lok[0]); ket.push("Lokasi di Excel: " + lok[0]); ruang = null; }
      if (lok.length > 1) ket.push("Juga di: " + lok.slice(1).join(", "));
    }
    const danaX = ambil(r, "dana");
    const dana = !danaX ? null : /yayasan/i.test(danaX) ? "Yayasan" : /bos/i.test(danaX) ? "BOS Reguler" : "Lainnya";
    if (dana === "Lainnya") ket.push("Dana di Excel: " + danaX);
    const kodeLama = ambil(r, "kode");
    let tahun = parseInt(ambil(r, "tahun"), 10);
    if (!tahun && /-(\d{4})$/.test(kodeLama)) tahun = +kodeLama.slice(-4);
    const jmlX = parseInt(ambil(r, "jml").replace(/\D/g, ""), 10);
    const kond = ambil(r, "kondisi").toLowerCase();
    const n = jmlX > 0 ? jmlX : 1;
    const kondisi = /berat/.test(kond) ? { baik: 0, rusak_ringan: 0, rusak_berat: n } : /rusak/.test(kond) ? { baik: 0, rusak_ringan: n, rusak_berat: 0 } : { baik: n, rusak_ringan: 0, rusak_berat: 0 };
    if (kodeLama) {
      const p = kodeLama.split("-"), kj = p[3], kr = (p[4] || "").toUpperCase();
      const ruangCocok = !ruang || kr === ruang || (kr === "RKUR" && ruang === "RKUR");
      if (kj !== kat || !ruang || !ruangCocok) { tanda.kodeTakCocok.push(`${nama} (baris ${ke}): ${kodeLama}`); ket.push("Kode lama tidak cocok dengan isi baris"); }
    }
    if (/^alat\s*-?\s*alat/i.test(nama)) { tanda.umum.push(nama); ket.push("Perlu dirinci per alat"); }
    if (/obat/i.test(nama)) ket.push("Obat-obatan dicatat sebagai bahan di tahap Bahan");
    const ketX = ambil(r, "ket"); if (ketX) ket.push(ketX);
    baris.push({ sumber: `${namaBerkas} baris ${ke}`, nama: nama.charAt(0).toUpperCase() + nama.slice(1), kategori: kat, ruang, ...kondisi,
      jumlah_pasti: jmlX > 0, tahun: tahun || null, sumber_dana: dana, merek: ambil(r, "merek"), kode_lama: kodeLama, keterangan: ket.join(". ") });
  });
  return { berkas: namaBerkas, baris, lewati, tanda, kolomHilang: Object.entries(K).filter(([, v]) => v < 0).map(([k]) => k) };
}
function tampilImpor() {
  const I = IMPOR, B = I.baris;
  const c = (f) => B.filter(f).length;
  $("hasil-baca").innerHTML = `
    <div class="ubin">
      <div class="b"><b>${B.length}</b><span>baris alat siap diimpor</span></div>
      <div class="c"><b>${c((b) => !b.ruang)}</b><span>tanpa ruang</span></div>
      <div class="c"><b>${c((b) => !b.jumlah_pasti)}</b><span>jumlah kosong, dicatat 1</span></div>
      <div class="k"><b>${I.tanda.kodeTakCocok.length}</b><span>kode lama tidak cocok</span></div>
    </div>
    ${I.kolomHilang.length ? `<p class="catatan awas">Kolom tidak ditemukan: ${esc(I.kolomHilang.join(", "))}. Isinya dianggap kosong.</p>` : ""}
    ${I.lewati.length ? `<p class="catatan">Tidak diimpor (bahan habis pakai):<br>${I.lewati.map(esc).join("<br>")}</p>` : ""}
    ${I.tanda.ruangTakDikenal.size ? `<p class="catatan awas">Lokasi yang belum ada di daftar Ruang: <b>${esc([...I.tanda.ruangTakDikenal].join(", "))}</b>. Barangnya diimpor tanpa ruang. Tambahkan ruangnya dulu di tab Ruang bila ingin langsung terhubung, lalu pilih berkas lagi.</p>` : ""}
    ${I.tanda.kodeTakCocok.length ? `<p class="catatan awas">Kode lama tidak cocok dengan isi baris (tetap disimpan sebagai kode lama, ditandai di keterangan):<br>${I.tanda.kodeTakCocok.map(esc).join("<br>")}</p>` : ""}
    <div class="gulir" style="max-height:420px"><table><thead><tr><th>Asal</th><th>Nama</th><th>Kategori</th><th>Ruang</th><th class="n">Jml</th><th>Dana</th><th>Tahun</th><th>Kode lama</th><th>Keterangan</th></tr></thead><tbody>
      ${B.map((b) => `<tr><td class="kecil">${esc(b.sumber.replace(I.berkas + " ", ""))}</td><td>${esc(b.nama)}</td><td>${esc(namaKat(b.kategori))}</td><td>${esc(namaRuang(b.ruang) || "—")}</td>
        <td class="n">${b.jumlah_pasti ? b.baik + b.rusak_ringan + b.rusak_berat : "?"}</td><td>${esc(b.sumber_dana || "—")}</td><td>${esc(b.tahun || "—")}</td><td class="kode">${esc(b.kode_lama)}</td><td class="kecil">${esc(b.keterangan)}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="alat-baris"><div class="dorong"><button class="tombol utama" id="b-impor" type="button">Impor ${B.length} baris</button></div></div>`;
  $("b-impor").onclick = async () => {
    try {
      const h = await sibuk(() => rpc("sp_impor", { p_pin: S.pin, p_baris: B }));
      await muatUlang();
      S.ruang = (await rpc("sp_masuk", { p_pin: S.pin })).ruang;
      $("hasil-baca").innerHTML = `<p class="catatan">Selesai: <b>${h.masuk}</b> baris diimpor${h.lewat ? `, ${h.lewat} baris dilewati karena sudah pernah diimpor` : ""}. Lihat di Daftar Alat, saring "Perlu dilengkapi".</p>`;
      toast(`${h.masuk} baris diimpor`);
    } catch (err) { toast(err.message); $("hasil-baca").insertAdjacentHTML("afterbegin", `<p class="galat">${esc(err.message)}</p>`); }
  };
}

/* ---------------------------------------------------------------- unduh Excel buku inventaris */
async function unduhExcel(daftar) {
  try {
    if (!window.XLSX) await sibuk(() => muatSkrip("assets/vendor/xlsx-0.20.3.full.min.js"));
    const kepala = ["No", "Kode Inventaris", "Kode Lama", "Nama Barang", "Kategori", "Merek/Tipe", "Spesifikasi", "Ruang", "Penanggung Jawab",
      "Jumlah", "Baik", "Rusak Ringan", "Rusak Berat", "Tahun Perolehan", "Sumber Dana", "Kode Rekening ARKAS", "No. Bukti BKU", "Tgl Bukti",
      "Harga Satuan", "Nilai Perolehan", "Keterangan"];
    const isi = daftar.map((a, i) => [i + 1, a.kode, a.kode_lama || "", a.nama, namaKat(a.kategori), a.merek || "", a.spesifikasi || "",
      namaRuang(a.ruang), a.ruang ? (ruangOf(a.ruang) || {}).pj_nama || "" : "", a.jumlah_pasti ? a.jumlah : "", a.baik, a.rusak_ringan, a.rusak_berat,
      a.tahun || "", a.sumber_dana || "", a.kode_arkas || "", a.no_bukti || "", a.tgl_bukti || "",
      a.harga_satuan == null ? "" : Number(a.harga_satuan), a.harga_satuan == null ? "" : Number(a.harga_satuan) * a.jumlah, a.keterangan || ""]);
    const ws = XLSX.utils.aoa_to_sheet([["BUKU INVENTARIS"], ["SMA PLUS MERDEKA SOREANG"], ["Diunduh " + new Date().toLocaleString("id-ID")], [], kepala, ...isi]);
    ws["!cols"] = [5, 22, 24, 34, 18, 16, 20, 20, 24, 8, 7, 8, 8, 9, 14, 20, 14, 11, 14, 15, 40].map((w) => ({ wch: w }));
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: kepala.length - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: kepala.length - 1 } }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventaris");
    XLSX.writeFile(wb, `Buku_Inventaris_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (err) { toast(err.message); }
}

/* ================================================================ mulai */
document.addEventListener("DOMContentLoaded", async () => {
  $("tab").addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (b) buka(b.dataset.tab); });
  $("keluar").onclick = keluar;
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
