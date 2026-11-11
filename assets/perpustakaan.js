/* Perpustakaan di dalam Sarana Prasarana, Tahap A (2 Nov 2026): Katalog Buku dan Penerimaan Buku. Lihat RENCANA_PERPUSTAKAAN.md.
   Dimuat sesudah sarana_prasarana.js dan memakai S, TAB, rpc, dialog, lembarBerkop, TEMPLATE, UNGGAH dari sana.
   Hak ubah diperiksa di server (akses.buku: semua = pustakawan/admin, literasi = PJ Pojok Literasi, kosong = hanya melihat).
   Stok dihitung per jumlah per lokasi; satu baris unduhan = satu buku di satu lokasi, jadi berkasnya bisa diunggah ulang. */
"use strict";

const JENIS_BUKU = { paket: "Buku paket", bacaan: "Bacaan", referensi: "Referensi", agama: "Agama", lainnya: "Lainnya" };
const LOKASI_BUKU = { perpustakaan: "Perpustakaan", kelas: "Kelas", literasi: "Pojok Literasi", guru: "Guru", lainnya: "Tempat lain" };
// Daftar kategori dari server (sp_buku_kategori); nilai di atas hanya cadangan bila belum terbaca.
const kategoriAktif = () => S.katBuku.length ? S.katBuku.filter((k) => k.aktif).map((k) => [k.kode, k.nama]) : Object.entries(JENIS_BUKU);
const STATUS_TERIMA = { dipesan: ["Dipesan", "c"], diterima: ["Sudah datang", "b"] };
Object.assign(S, { buku: [], terima: [], katBuku: [], bukuGalat: null, saringBuku: { q: "", tingkat: "", jenis: "", lokasi: "" }, saringTerima: { q: "", dana: "", status: "" } });

const aksesBuku = () => S.akses && S.akses.buku;
const bukuSemua = () => aksesBuku() === "semua";
const bukuLiterasi = () => aksesBuku() === "literasi";
const bisaUbahBuku = () => !!aksesBuku();
const adaDiLiterasi = (b) => b.lokasi.some((l) => l.jenis === "literasi");
const bolehBuku = (b) => bukuSemua() || (bukuLiterasi() && adaDiLiterasi(b));
// Ruang kelas tetap; rombelnya ditampilkan mengikuti pasangan tahun ajaran ini.
const rombelRuang = (nama) => { const r = S.ruang.find((x) => x.nama === nama && x.jenis === "kelas"); return r && r.rombel; };
const namaLokasi = (l) => LOKASI_BUKU[l.jenis] + (l.tempat ? " · " + l.tempat + (l.jenis === "kelas" && rombelRuang(l.tempat) ? ` (${rombelRuang(l.tempat)})` : "") : "");
const bukuTampil = () => bukuLiterasi() ? S.buku.filter(adaDiLiterasi) : S.buku;
const danaTeks = (p) => p.sumber_dana ? p.sumber_dana + (p.tahap ? " tahap " + p.tahap : "") : "";
const penerimaanBuku = (id) => S.terima.flatMap((p) => p.baris.filter((r) => r.buku === id).map((r) => ({ p, r })));
const tglBuku = (s) => s ? new Date(s + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "";

async function muatPerpus() {
  try {
    [S.buku, S.terima] = await Promise.all([rpc("sp_buku_daftar", { p_pin: S.pin }), rpc("sp_penerimaan_daftar", { p_pin: S.pin })]);
    S.bukuGalat = null;
  } catch (e) { S.buku = []; S.terima = []; S.bukuGalat = e.message; }   // Inventaris barang tetap bisa dipakai.
  S.katBuku = (await rpc("sp_buku_kategori_daftar", { p_pin: S.pin }).catch(() => null)) || [];
  if (S.katBuku.length) { Object.keys(JENIS_BUKU).forEach((k) => delete JENIS_BUKU[k]); S.katBuku.forEach((k) => { JENIS_BUKU[k.kode] = k.nama; }); }
  await muatPinjam();
  await muatUsulan();
}
const catatanGalatBuku = () => S.bukuGalat ? `<p class="catatan awas">${ikon("awas")}<span>Data buku belum terbaca: ${esc(S.bukuGalat)}</span></p>` : "";

// Penanda tangan dokumen buku: Kepala Sekolah di kiri, pengelola koleksi di kanan (nama dari Data Induk).
function penandaTanganBuku() {
  const p = profilKop(), kode = bukuLiterasi() ? "LIT" : "PERPUS";
  return [
    { atas: ["Mengetahui,", "Kepala Sekolah,"], nama: p.kepala_sekolah || "", nip: p.nip_kepala ? "NIP. " + p.nip_kepala : null },
    { atas: [(p.kota || "") + ", " + tglPanjang(), kode === "LIT" ? "Penanggung Jawab Literasi," : "Penanggung Jawab Perpustakaan,"], nama: (ruangOf(kode) || {}).pj_nama || "" },
  ];
}

/* ================================================================ Katalog Buku */
TAB.buku = () => {
  const s = S.saringBuku;
  return `${aksesBuku() ? "" : htmlSetKelasGuru()}<section class="kartu">
    <div class="kepala-bagian"><div><h2>${bukuLiterasi() ? "Koleksi Pojok Literasi" : "Katalog Buku"}</h2><p class="sub">${bukuLiterasi()
      ? "Novel dan bacaan lain yang Anda kelola. Semuanya tetap tercatat di katalog pustakawan."
      : "Semua buku sekolah, termasuk yang disimpan di kelas, Pojok Literasi, guru, atau tempat lain."}</p></div>
      <div class="aksi"><button class="tombol" type="button" id="b-unduh-buku">${ikon("unduh")}Unduh</button>
        ${bisaUbahBuku() ? `${bukuSemua() ? `<button class="tombol" type="button" id="b-kategori">${ikon("tabel")}Kategori</button>` : ""}<button class="tombol" type="button" data-template="buku">${ikon("tabel")}Unduh template</button>
        <button class="tombol" type="button" data-unggah="buku">${ikon("unggah")}Unggah data</button>
        <button class="tombol utama" type="button" id="b-buku-baru">${ikon("tambah")}Tambah buku</button>` : ""}</div></div>
    ${catatanGalatBuku()}
    <div class="saring">
      <label class="f cari" for="bk-q">Cari${ikon("cari")}<input type="search" id="bk-q" value="${esc(s.q)}" placeholder="Judul, mapel, kode"></label>
      <label class="f" for="bk-tingkat">Kelas<select id="bk-tingkat"><option value="">Semua</option>${opsi([["10", "10"], ["11", "11"], ["12", "12"], ["-", "Lintas kelas"]], s.tingkat)}</select></label>
      <label class="f" for="bk-jenis">Kategori<select id="bk-jenis"><option value="">Semua</option>${opsi(Object.entries(JENIS_BUKU), s.jenis)}</select></label>
      ${bukuLiterasi() ? "" : `<label class="f" for="bk-lokasi">Lokasi<select id="bk-lokasi"><option value="">Semua</option>${opsi(Object.entries(LOKASI_BUKU), s.lokasi)}</select></label>`}
    </div>
    <div class="ubin" id="bk-ringkas"></div>
    <div id="bk-tabel"></div>
  </section>`;
};
function saringBuku() {
  const { q, tingkat, jenis, lokasi } = S.saringBuku, qq = kecil(q);
  return bukuTampil().filter((b) => (!qq || kecil([b.judul, b.mapel, b.penerbit, b.penulis, b.kode, b.kode_penerbit].filter(Boolean).join(" ")).includes(qq))
    && (!tingkat || (tingkat === "-" ? !b.tingkat : b.tingkat === tingkat)) && (!jenis || b.jenis === jenis)
    && (!lokasi || b.lokasi.some((l) => l.jenis === lokasi)));
}
TAB.buku.sesudah = () => {
  const isi = () => {
    const d = saringBuku(), eks = d.reduce((s, b) => s + b.jumlah, 0);
    const per = (j) => d.reduce((s, b) => s + b.lokasi.filter((l) => l.jenis === j).reduce((t, l) => t + l.jumlah, 0), 0);
    const luar = eks - per("perpustakaan");
    $("bk-ringkas").innerHTML = `<div class="i"><span class="lambang">${ikon("buku")}</span><span><b>${bil(d.length)}</b><span class="t">judul</span></span></div>
      <div class="b"><span class="lambang">${ikon("kotak")}</span><span><b>${bil(eks)}</b><span class="t">eksemplar</span></span></div>
      ${bukuLiterasi() ? "" : `<div class="${luar ? "c" : "b"}"><span class="lambang">${ikon("ruang")}</span><span><b>${bil(luar)}</b><span class="t">eksemplar di luar perpustakaan</span></span></div>`}`;
    $("bk-tabel").innerHTML = d.length ? `<div class="gulir" style="max-height:640px"><table><thead><tr><th>Kode</th><th>Judul</th><th>Mapel</th><th>Kelas</th><th>Penerbit</th><th>Kode barang</th><th class="n">Eks</th><th class="n">Dipinjam</th><th>Sumber dana</th><th>Lokasi</th></tr></thead><tbody>
      ${d.map((b) => `<tr class="klik" tabindex="0" data-buku="${b.id}"><td class="kode">${esc(b.kode)}</td><td class="nama-sel"><b>${esc(b.judul)}</b>${b.penulis ? `<p class="kecil">${esc(b.penulis)}</p>` : ""}</td>
        <td>${esc(b.mapel || "")}</td><td>${esc(b.tingkat || "")}</td><td>${esc(b.penerbit || "")}</td><td class="kode">${esc(b.kode_penerbit || "")}</td><td class="n">${bil(b.jumlah)}</td><td class="n">${b.dipinjam ? bil(b.dipinjam) : ""}</td><td class="kecil">${esc(sumberBuku(b.id))}</td>
        <td class="kecil">${b.lokasi.map((l) => `${esc(namaLokasi(l))} (${l.jumlah})`).join("<br>")}</td></tr>`).join("")}
      </tbody></table></div>`
      : `<div class="kosong">${ikon("buku")}<span>${bukuTampil().length ? "Tidak ada buku yang cocok dengan saringan." : "Belum ada buku di sini. Tambahkan lewat tombol Tambah buku atau Unggah data."}</span></div>`;
  };
  isi();
  [["bk-q", "q"], ["bk-tingkat", "tingkat"], ["bk-jenis", "jenis"], ["bk-lokasi", "lokasi"]].forEach(([id, k]) => { if ($(id)) $(id).addEventListener("input", (e) => { S.saringBuku[k] = e.target.value; isi(); }); });
  const bukaBaris = (e) => { const tr = e.target.closest("tr[data-buku]"); if (tr) kartuBuku(+tr.dataset.buku); };
  $("bk-tabel").addEventListener("click", bukaBaris);
  $("bk-tabel").addEventListener("keydown", (e) => { if (e.key === "Enter") bukaBaris(e); });
  if ($("b-kategori")) $("b-kategori").onclick = formKategori;
  $("b-unduh-buku").onclick = () => unduhBuku(saringBuku());
  if ($("b-buku-baru")) $("b-buku-baru").onclick = () => formBuku(null);
  pasangSetKelasGuru();
  pasangTombolBerkas($("isi"));
};

/* Kategori buku: pustakawan dan admin menambah, mengganti nama, menonaktifkan, atau menghapus yang belum terpakai. */
function formKategori() {
  const baris = (k) => `<tr data-k="${esc(k.kode)}"><td><input class="k-nama" value="${esc(k.nama)}" maxlength="60" required aria-label="Nama kategori"></td><td class="n">${bil(k.n)}</td>
    <td style="text-align:center"><input class="k-aktif" type="checkbox"${k.aktif ? " checked" : ""} aria-label="Aktif ${esc(k.nama)}"></td>
    <td>${!k.n && !k.bawaan ? `<button class="tombol kecil" type="button" data-khapus="${esc(k.kode)}">Hapus</button>` : ""}</td></tr>`;
  dialog({ judul: "Kategori buku", isi: `<p class="sub">Kategori nonaktif tidak muncul di pilihan buku baru, tetapi buku lamanya tetap berkategori itu.</p>
    <div class="gulir"><table><thead><tr><th>Nama</th><th class="n">Buku</th><th>Aktif</th><th></th></tr></thead><tbody>${S.katBuku.map(baris).join("")}</tbody></table></div>
    <label class="f" for="k-baru">Tambah kategori baru<input id="k-baru" maxlength="60" placeholder="mis. Novel, Kamus, Komik"></label>`,
    kaki: kakiSimpan("Simpan"),
    onSimpan: async () => {
      const ubahan = [...$("dlg-isi").querySelectorAll("tr[data-k]")].map((tr) => ({ kode: tr.dataset.k, nama: tr.querySelector(".k-nama").value.trim(), aktif: tr.querySelector(".k-aktif").checked }))
        .filter((x) => { const k = S.katBuku.find((y) => y.kode === x.kode); return k && (k.nama !== x.nama || k.aktif !== x.aktif); });
      const baru = $("k-baru").value.trim();
      await sibuk(async () => {
        for (const x of ubahan) await rpc("sp_buku_kategori_simpan", { p_pin: S.pin, p_k: x });
        if (baru) await rpc("sp_buku_kategori_simpan", { p_pin: S.pin, p_k: { nama: baru } });
        await muatPerpus();
      });
      tutupDialog(); segarkan(); toast("Kategori tersimpan");
    } });
  $("dlg-isi").onclick = async (e) => {
    const t = e.target.closest("[data-khapus]");
    if (!t) return;
    try { await sibuk(async () => { await rpc("sp_buku_kategori_hapus", { p_pin: S.pin, p_kode: t.dataset.khapus }); await muatPerpus(); }); formKategori(); toast("Kategori dihapus"); }
    catch (err) { $("dlg-galat").textContent = err.message; $("dlg-galat").hidden = false; }
  };
}
const JENIS_RIW_BUKU = { baru: "Dicatat", unggah: "Diunggah dari Excel", ubah: "Diubah", pindah: "Dipindah lokasi", terima: "Penerimaan", hapus: "Dihapus" };
function uraiRiwayatBuku(r) {
  const x = r.rincian || {};
  if (r.jenis === "pindah") return `${x.jumlah} eks: ${namaLokasi(x.dari)} → ${namaLokasi(x.ke)}`;
  if (r.jenis === "terima") return `+${x.jumlah} eks${x.sumber ? " · " + x.sumber : ""}`;
  if (r.jenis === "baru") return x.jumlah ? `${x.jumlah} eks di ${LOKASI_BUKU[x.lokasi] || ""}` : "";
  if (r.jenis === "ubah") return Object.keys(x).join(", ");
  return "";
}
async function kartuBuku(id) {
  const b = S.buku.find((x) => x.id === id);
  if (!b) return;
  const riw = await sibuk(() => rpc("sp_buku_riwayat_daftar", { p_pin: S.pin, p_id: id })).catch(() => []);
  const boleh = bolehBuku(b);
  dialog({ atas: b.kode, judul: b.judul, isi: `
    <dl class="dl">
      <dt>Mapel</dt><dd>${esc(b.mapel || "—")}</dd><dt>Kelas</dt><dd>${esc(b.tingkat || "Lintas kelas")}</dd><dt>Kategori</dt><dd>${esc(JENIS_BUKU[b.jenis] || b.jenis)}</dd>
      <dt>Penulis</dt><dd>${esc(b.penulis || "—")}</dd><dt>Penerbit</dt><dd>${esc([b.penerbit, b.tahun_terbit].filter(Boolean).join(", ") || "—")}</dd>
      <dt>Kode barang</dt><dd>${esc(b.kode_penerbit || "—")}</dd><dt>ISBN</dt><dd>${esc(b.isbn || "—")}</dd><dt>Nomor panggil</dt><dd>${esc(b.nomor_panggil || "—")}</dd>
      ${b.keterangan ? `<dt>Keterangan</dt><dd>${esc(b.keterangan)}</dd>` : ""}
    </dl>
    ${(() => { const d = penerimaanBuku(b.id); return d.length ? `<h3>Pengadaan</h3><div class="gulir"><table><thead><tr><th>Tanggal</th><th class="n">Jumlah</th><th class="n">Harga satuan</th><th>Sumber dana</th><th>Toko / penerbit</th><th>No. bukti</th></tr></thead><tbody>
      ${d.map(({ p, r }) => `<tr class="klik" tabindex="0" data-terima="${p.id}"><td>${esc(tglBuku(p.tanggal))}</td><td class="n">${bil(r.jumlah)}</td><td class="n">${r.harga_satuan == null ? '<span class="pil c">belum</span>' : rp(r.harga_satuan)}</td><td>${esc(danaTeks(p) || "—")}</td><td>${esc(r.penerbit || p.penyedia || "")}</td><td>${esc(p.no_bukti || "")}</td></tr>`).join("")}</tbody></table></div>` : ""; })()}
    <h3>Lokasi simpan · ${bil(b.jumlah)} eksemplar</h3>
    <div class="gulir"><table><tbody>${b.lokasi.map((l) => `<tr><td>${esc(namaLokasi(l))}</td><td class="n">${bil(l.jumlah)}</td></tr>`).join("") || `<tr><td class="kecil">Belum ada eksemplar.</td></tr>`}</tbody></table></div>
    ${riw.length ? `<h3>Riwayat</h3><div class="gulir" style="max-height:200px"><table><tbody>${riw.slice(0, 30).map((r) => `<tr><td class="kecil">${esc(tgl(r.waktu))}</td><td>${esc(JENIS_RIW_BUKU[r.jenis] || r.jenis)}</td><td class="kecil">${esc(uraiRiwayatBuku(r))}</td><td class="kecil">${esc(r.oleh || "")}</td></tr>`).join("")}</tbody></table></div>` : ""}`,
    kaki: `<button class="tombol" value="batal" formnovalidate>Tutup</button>
      ${bukuSemua() && b.lokasi.length ? `<button class="tombol" type="button" id="bk-pindah">${ikon("ruang")}Pindahkan</button>` : ""}
      ${boleh ? `<button class="tombol" type="button" id="bk-usul-hapus">Usulkan penghapusan</button><button class="tombol utama" type="button" id="bk-ubah">${ikon("ubah")}Ubah</button>` : ""}` });
  $("dlg-isi").onclick = (e) => { const tr = e.target.closest("tr[data-terima]"); if (tr) kartuTerima(+tr.dataset.terima); };
  if ($("bk-pindah")) $("bk-pindah").onclick = () => formPindahBuku(b);
  if ($("bk-usul-hapus")) $("bk-usul-hapus").onclick = () => formUsulHapus({ jenis: "buku", buku: b });
  if ($("bk-ubah")) $("bk-ubah").onclick = () => formBuku(b);
}
function gantiBukuDiS(h) {
  const i = S.buku.findIndex((x) => x.id === h.id);
  if (i >= 0) S.buku[i] = h; else S.buku.push(h);
}
/* Pilihan Tempat mengikuti daftar yang sudah ada: ruang dari Sarpras, guru dari Data Induk. Rak perpustakaan tetap diketik.
   Kelas memakai ruang (tetap), bukan rombel (berganti tiap tahun); rombel hanya ditampilkan sebagai keterangan. */
function pilihanTempat(jenis) {
  const R = S.refPinjam || { siswa: [], guru: [] }, ruang = S.ruang.filter((r) => r.aktif);
  if (jenis === "kelas") {
    const kelas = ruang.filter((r) => r.jenis === "kelas" && r.kode !== "RK").map((r) => [r.nama, r.nama + (r.rombel ? " (" + r.rombel + ")" : "")]);
    if (kelas.length) return { label: "Ruang kelas", opsi: kelas };
    return { label: "Ruang kelas", opsi: ruang.filter((r) => r.kode === "RK").map((r) => [r.nama, r.nama]), ket: "Ruang tiap kelas belum diisi Staf Sarpras. Untuk sementara catat di sini; pindahkan bila ruangnya sudah ada." };
  }
  if (jenis === "guru") return { label: "Guru", opsi: R.guru.map((g) => [g.nama, g.nama]) };
  if (jenis === "lainnya") return { label: "Ruang", opsi: ruang.filter((r) => r.jenis !== "kelas" && r.kode !== "PERPUS" && r.kode !== "LIT").map((r) => [r.nama, r.nama]), ket: "Ruang belum ada? Minta Staf Sarpras menambahkannya di menu Ruang." };
  return { label: "Rak", teks: jenis === "perpustakaan" ? "mis. F-02, boleh dikosongkan" : "Boleh dikosongkan" };
}
function gambarTempat(wadah, id, jenis) {
  const c = pilihanTempat(jenis);
  $(wadah).innerHTML = `<label class="f" for="${id}">${esc(c.label)}${c.opsi ? `<select id="${id}" required><option value="">Pilih…</option>${opsi(c.opsi, "")}</select>` : `<input id="${id}" maxlength="80" placeholder="${esc(c.teks)}">`}</label>${c.ket ? `<p class="kecil">${esc(c.ket)}</p>` : ""}`;
}
async function muatRefTempat() {
  if (S.refPinjam || !bukuSemua()) return true;
  try { S.refPinjam = await sibuk(() => rpc("sp_pinjam_referensi", { p_pin: S.pin })); return true; } catch (e) { toast(e.message); return false; }
}
async function formBuku(b) {
  if (!b && !(await muatRefTempat())) return;
  const baru = !b, v = (k) => esc(b && b[k] != null ? b[k] : "");
  dialog({ judul: baru ? (bukuLiterasi() ? "Tambah buku Pojok Literasi" : "Tambah buku") : "Ubah " + b.judul, isi: `<div class="isian-grid">
      <label class="f lebar" for="f-judul">Judul<input id="f-judul" value="${v("judul")}" maxlength="200" required></label>
      <label class="f" for="f-mapel">Mapel<input id="f-mapel" value="${v("mapel")}" maxlength="80" placeholder="Kosongkan untuk bacaan umum"></label>
      <label class="f" for="f-tingkat">Kelas<select id="f-tingkat"><option value="">Lintas kelas</option>${opsi([["10", "10"], ["11", "11"], ["12", "12"]], b && b.tingkat)}</select></label>
      <label class="f" for="f-jenis">Kategori<select id="f-jenis">${opsi([...kategoriAktif(), ...(b && !kategoriAktif().some(([k]) => k === b.jenis) ? [[b.jenis, JENIS_BUKU[b.jenis] || b.jenis]] : [])], b ? b.jenis : bukuLiterasi() ? "bacaan" : "paket")}</select></label>
      <label class="f" for="f-penulis">Penulis<input id="f-penulis" value="${v("penulis")}" maxlength="150"></label>
      <label class="f" for="f-penerbit">Penerbit<input id="f-penerbit" value="${v("penerbit")}" maxlength="100"></label>
      <label class="f" for="f-tahun">Tahun terbit<input id="f-tahun" type="number" min="1900" max="2100" value="${v("tahun_terbit")}"></label>
      <label class="f" for="f-isbn">ISBN<input id="f-isbn" value="${v("isbn")}" maxlength="30"></label>
      <label class="f" for="f-kode">Kode barang penerbit<input id="f-kode" value="${v("kode_penerbit")}" maxlength="40"></label>
      <label class="f" for="f-panggil">Nomor panggil<input id="f-panggil" value="${v("nomor_panggil")}" maxlength="40" placeholder="mis. 540 SUD k"></label>
      ${baru ? `<label class="f" for="f-jumlah">Jumlah eksemplar<input id="f-jumlah" type="number" min="1" value="1" required></label>
      ${bukuLiterasi() ? "" : `<label class="f" for="f-lokasi">Lokasi<select id="f-lokasi">${opsi(Object.entries(LOKASI_BUKU), "perpustakaan")}</select></label>`}
      <div id="f-tempat-wadah"></div>` : ""}
      <label class="f lebar" for="f-ket">Keterangan<input id="f-ket" value="${v("keterangan")}" maxlength="300"></label>
    </div>${baru ? "" : `<p class="kecil">Jumlah dan lokasi diubah lewat Pindahkan atau Unggah data, supaya setiap perubahan tercatat.</p>`}`,
    kaki: kakiSimpan(baru ? "Tambah" : "Simpan"),
    onSimpan: async () => {
      const data = { judul: $("f-judul").value, mapel: $("f-mapel").value, tingkat: $("f-tingkat").value, jenis: $("f-jenis").value, penulis: $("f-penulis").value,
        penerbit: $("f-penerbit").value, tahun_terbit: $("f-tahun").value, isbn: $("f-isbn").value, kode_penerbit: $("f-kode").value, nomor_panggil: $("f-panggil").value, keterangan: $("f-ket").value };
      if (baru) Object.assign(data, { jumlah: $("f-jumlah").value, lokasi: bukuLiterasi() ? "literasi" : $("f-lokasi").value, tempat: $("f-tempat").value });
      else data.id = b.id;
      const h = await sibuk(() => rpc("sp_buku_simpan", { p_pin: S.pin, p_b: data }));
      gantiBukuDiS(h);
      tutupDialog(); segarkan(); toast(baru ? `Buku tersimpan dengan kode ${h.kode}` : "Perubahan tersimpan");
    } });
  if (baru) {
    gambarTempat("f-tempat-wadah", "f-tempat", bukuLiterasi() ? "literasi" : "perpustakaan");
    if ($("f-lokasi")) $("f-lokasi").onchange = (e) => gambarTempat("f-tempat-wadah", "f-tempat", e.target.value);
  }
}
// Semua tujuan dalam satu daftar, supaya Pojok Literasi dan ruang lain langsung terlihat.
function tujuanPindah() {
  const isi = (jenis) => (pilihanTempat(jenis).opsi || []).map(([tempat, nama]) => ({ jenis, tempat, nama }));
  const rak = (jenis) => ({ jenis, tempat: "", nama: LOKASI_BUKU[jenis], rak: true });
  return [["Perpustakaan dan Pojok Literasi", [rak("perpustakaan"), rak("literasi")]], ["Ruang kelas", isi("kelas")], ["Ruang lain", isi("lainnya")], ["Guru", isi("guru")]].filter(([, d]) => d.length);
}
async function formPindahBuku(b) {
  if (!(await muatRefTempat())) return;
  const grup = tujuanPindah(), T = grup.flatMap(([, d]) => d), tujuan = () => T[+$("p-ke").value];
  dialog({ atas: b.kode, judul: "Pindahkan " + b.judul, isi: `<div class="isian-grid">
      <label class="f lebar" for="p-dari">Dari<select id="p-dari">${b.lokasi.map((l, i) => `<option value="${i}">${esc(namaLokasi(l))} (${l.jumlah} eks)</option>`).join("")}</select></label>
      <label class="f lebar" for="p-ke">Pindahkan ke<select id="p-ke" required><option value="">Pilih tujuan…</option>${grup.map(([n, d]) => `<optgroup label="${esc(n)}">${d.map((t) => `<option value="${T.indexOf(t)}">${esc(t.nama)}</option>`).join("")}</optgroup>`).join("")}</select></label>
      <div id="p-tempat-wadah" class="lebar"></div>
      <label class="f" for="p-jumlah">Jumlah eksemplar<input id="p-jumlah" type="number" min="1" value="1" required></label>
    </div><p class="kecil">Di mana pun disimpan, buku tetap tercatat di katalog perpustakaan. Ruang belum ada di daftar? Minta Staf Sarpras menambahkannya di menu Ruang.</p>`,
    kaki: kakiSimpan("Pindahkan"),
    onSimpan: async () => {
      const d = b.lokasi[+$("p-dari").value], n = +$("p-jumlah").value, k = tujuan();
      const h = await sibuk(() => rpc("sp_buku_pindah", { p_pin: S.pin, p_id: b.id, p_dari: { jenis: d.jenis, tempat: d.tempat }, p_ke: { jenis: k.jenis, tempat: k.rak ? $("p-tempat").value : k.tempat }, p_jumlah: n }));
      gantiBukuDiS(h);
      tutupDialog(); segarkan(); toast(`${n} eksemplar dipindahkan`);
    } });
  $("p-ke").onchange = () => {
    if ($("p-ke").value === "") { $("p-tempat-wadah").innerHTML = ""; return; }
    const k = tujuan(), ket = k.jenis === "kelas" ? pilihanTempat("kelas").ket : "";
    if (k.rak) gambarTempat("p-tempat-wadah", "p-tempat", k.jenis);
    else $("p-tempat-wadah").innerHTML = ket ? `<p class="kecil">${esc(ket)}</p>` : "";
  };
}

/* ---------------------------------------------------------------- unduh, template, unggah */
const KOLOM_BUKU = [
  { judul: "Kode Buku", lebar: 10 }, { judul: "Judul", lebar: 34 }, { judul: "Mapel", lebar: 18 }, { judul: "Kelas", lebar: 7, tengah: true }, { judul: "Kategori", lebar: 14 },
  { judul: "Penulis", lebar: 20 }, { judul: "Penerbit", lebar: 18 }, { judul: "Tahun Terbit", lebar: 8, tengah: true }, { judul: "ISBN", lebar: 16 }, { judul: "Kode Barang", lebar: 14 },
  { judul: "Nomor Panggil", lebar: 14 }, { judul: "Lokasi", lebar: 14 }, { judul: "Tempat", lebar: 16 }, { judul: "Jumlah", lebar: 8, tengah: true },
  { judul: "Sumber Dana", lebar: 18 }, { judul: "Keterangan", lebar: 28 },
];
function sumberBuku(id) {
  const d = new Set();
  S.terima.forEach((p) => { if (p.baris.some((r) => r.buku === id) && p.sumber_dana) d.add(danaTeks(p)); });
  return [...d].join(", ");
}
async function unduhBuku(daftar) {
  if (!daftar.length) return toast("Tidak ada buku untuk diunduh.");
  const hanyaLit = bukuLiterasi();
  const baris = [];
  daftar.forEach((b) => {
    const lok = b.lokasi.filter((l) => !hanyaLit || l.jenis === "literasi");
    (lok.length ? lok : [{}]).forEach((l) => baris.push([b.kode, b.judul, b.mapel || "", b.tingkat || "", JENIS_BUKU[b.jenis], b.penulis || "", b.penerbit || "", b.tahun_terbit || "", b.isbn || "",
      b.kode_penerbit || "", b.nomor_panggil || "", LOKASI_BUKU[l.jenis] || "", l.tempat || "", l.jumlah == null ? "" : l.jumlah, sumberBuku(b.id), b.keterangan || ""]));
  });
  const total = baris.reduce((s, r) => s + (r[13] || 0), 0);
  try {
    await sibuk(async () => {
      const wb = new (await muatExcelJS()).Workbook();
      await lembarBerkop(wb, { nama: "Daftar Buku", judul: hanyaLit ? "Daftar Buku Pojok Literasi" : "Daftar Buku Perpustakaan", sub: `${daftar.length} judul  ·  ${bil(total)} eksemplar  ·  keadaan ${tglPanjang()}`,
        kolom: KOLOM_BUKU, baris, jumlah: { label: "Jumlah", kolom: { 13: total } }, blok: penandaTanganBuku() });
      await simpanBuku(wb, hanyaLit ? "Daftar_Buku_Literasi" : "Daftar_Buku");
    });
  } catch (e) { toast(e.message); }
}
TEMPLATE.buku = () => ({ judul: "Daftar Buku", berkas: "Buku",
  kolom: [{ judul: "Kode Buku", lebar: 11 }, { judul: "Judul", lebar: 34, wajib: true }, { judul: "Mapel", lebar: 18 }, { judul: "Kelas", lebar: 7 }, { judul: "Kategori", lebar: 14 },
    { judul: "Penulis", lebar: 20 }, { judul: "Penerbit", lebar: 18 }, { judul: "Tahun Terbit", lebar: 8 }, { judul: "ISBN", lebar: 16 }, { judul: "Kode Barang", lebar: 14 },
    { judul: "Nomor Panggil", lebar: 14 }, { judul: "Lokasi", lebar: 14 }, { judul: "Tempat", lebar: 18 }, { judul: "Jumlah", lebar: 8 }, { judul: "Keterangan", lebar: 30 }],
  daftar: [{ judul: "Kelas", untuk: "Kelas", isi: ["10", "11", "12"] }, { judul: "Kategori", untuk: "Kategori", isi: kategoriAktif().map((x) => x[1]) },
    { judul: "Lokasi", untuk: "Lokasi", isi: bukuLiterasi() ? [LOKASI_BUKU.literasi] : Object.values(LOKASI_BUKU) }],
  petunjuk: ["• Satu baris = satu buku di satu lokasi. Kolom berwarna merah wajib untuk buku baru: Judul.",
    "• Buku BARU: kosongkan Kode Buku; kode dibuat otomatis (B-0038 dan seterusnya). Bila Jumlah kosong, dicatat 1.",
    "• MENGUBAH buku yang sudah ada: isi Kode Buku, lalu isi hanya kolom yang ingin diubah. Sel kosong tidak menghapus isi lama.",
    "• Jumlah pada baris berkode MENGGANTI jumlah di lokasi dan tempat itu, bukan menambah.",
    "• Lokasi: Perpustakaan, Kelas, Pojok Literasi, Guru, atau Tempat lain. Bila kosong, dicatat di " + (bukuLiterasi() ? "Pojok Literasi." : "Perpustakaan."),
    "• Tempat: rak, nama kelas, nama guru, atau nama tempat (mis. Mushola).",
    "• Kelas: 10, 11, 12, atau kosong untuk buku lintas kelas. Kode Barang = kode produk dari penerbit.",
    "• Cara cepat melengkapi data: unduh daftar buku, isi kolom yang kosong, lalu unggah berkas itu. Kop dan tanda tangan diabaikan.",
    "• Satu unggahan disimpan seluruhnya atau tidak sama sekali. Bila ada baris yang ditolak, pesannya menyebut nomor barisnya."] });

function bacaBuku(XLSX, wb) {
  const L = bacaLembar(XLSX, wb, /^judul$/);
  if (!L) throw new Error('Kolom "Judul" tidak ditemukan. Pakai template buku atau hasil unduhan daftar buku.');
  const K = kolomDari(L.kep, { kode: /^kode buku$/, judul: /^judul$/, mapel: /^mapel/, kelas: /^kelas/, jenis: /^(jenis|kategori)/, penulis: /^penulis/, penerbit: /^penerbit/, tahun: /^tahun/,
    isbn: /^isbn/, barang: /^kode barang/, panggil: /^nomor panggil/, lokasi: /^lokasi/, tempat: /^tempat/, jumlah: /^jumlah/, ket: /^keterangan/ });
  const ambil = (r, k) => normal(K[k] >= 0 ? r[K[k]] : "");
  const jenisDari = (v) => Object.keys(JENIS_BUKU).find((k) => k === kecil(v) || kecil(JENIS_BUKU[k]) === kecil(v) || (k === "paket" && kecil(v) === "paket"));
  const lokasiDari = (v) => Object.keys(LOKASI_BUKU).find((k) => k === kecil(v) || kecil(LOKASI_BUKU[k]) === kecil(v));
  const hasil = { baris: [], galat: [], peringatan: [], baru: 0, ubah: 0 };
  for (let i = L.hi + 1; i < L.rows.length; i++) {
    const r = L.rows[i], ke = i + 1, kode = ambil(r, "kode").toUpperCase(), judul = ambil(r, "judul");
    if (!kode && !judul) { if (r.every((v) => normal(v) === "")) continue; break; }   // baris jumlah, kaki, tanda tangan
    const ada = kode ? S.buku.find((b) => b.kode === kode) : null;
    if (kode && !ada) { hasil.galat.push(`Baris ${ke}: kode buku ${kode} tidak ditemukan. Kosongkan kode untuk buku baru.`); continue; }
    const o = { baris: ke };
    if (kode) o.kode = kode;
    if (judul) o.judul = judul;
    [["mapel", "mapel"], ["penulis", "penulis"], ["penerbit", "penerbit"], ["isbn", "isbn"], ["barang", "kode_penerbit"], ["panggil", "nomor_panggil"], ["tempat", "tempat"], ["ket", "keterangan"]]
      .forEach(([k, f]) => { const x = ambil(r, k); if (x) o[f] = x; });
    const kl = ambil(r, "kelas").replace(/^kelas\s*/i, "").toUpperCase();
    if (kl) {
      const t = { 10: "10", X: "10", 11: "11", XI: "11", 12: "12", XII: "12" }[kl];
      if (!t) { hasil.galat.push(`Baris ${ke}: Kelas "${kl}" harus 10, 11, 12, atau kosong.`); continue; }
      o.tingkat = t;
    }
    const jx = ambil(r, "jenis");
    if (jx) { const j = jenisDari(jx); if (!j) { hasil.galat.push(`Baris ${ke}: Kategori "${jx}" tidak dikenal. Tambahkan dulu lewat tombol Kategori, atau pilih dari lembar Daftar.`); continue; } o.jenis = j; }
    else if (!kode && bukuLiterasi()) o.jenis = "bacaan";
    const th = ambil(r, "tahun");
    if (th) { if (!/^\d{4}$/.test(th)) { hasil.galat.push(`Baris ${ke}: Tahun Terbit "${th}" harus 4 angka.`); continue; } o.tahun_terbit = th; }
    const lx = ambil(r, "lokasi");
    const lok = lx ? lokasiDari(lx) : bukuLiterasi() ? "literasi" : "perpustakaan";
    if (!lok) { hasil.galat.push(`Baris ${ke}: Lokasi "${lx}" tidak dikenal. Pakai Perpustakaan, Kelas, Pojok Literasi, Guru, atau Tempat lain.`); continue; }
    if (bukuLiterasi() && lok !== "literasi") { hasil.galat.push(`Baris ${ke}: Anda hanya mengelola buku berlokasi Pojok Literasi.`); continue; }
    o.lokasi = lok;
    const jm = ambil(r, "jumlah");
    if (jm) { const n = Number(jm); if (!Number.isInteger(n) || n < 0) { hasil.galat.push(`Baris ${ke}: Jumlah "${jm}" harus bilangan bulat.`); continue; } o.jumlah = n; }
    else if (!kode) hasil.peringatan.push(`Baris ${ke}: Jumlah kosong, dicatat 1 eksemplar.`);
    if (kode) hasil.ubah++; else hasil.baru++;
    hasil.baris.push(o);
  }
  return hasil;
}
UNGGAH.buku = { judul: "Unggah buku", baca: bacaBuku, rpc: "sp_buku_unggah",
  ringkas: (h) => `${h.baru} buku baru, ${h.ubah} baris memperbarui buku`,
  hasil: (x) => `${x.baru} buku baru, ${x.ubah} baris diperbarui`,
  kolom: (o) => [o.kode ? esc(o.kode) : `<span class="pil b">Baru</span>`, esc(o.judul || (S.buku.find((b) => b.kode === o.kode) || {}).judul || ""), esc(o.tingkat || ""), esc(o.penerbit || ""), esc(LOKASI_BUKU[o.lokasi] + (o.tempat ? " · " + o.tempat : "")), esc(o.jumlah ?? "")],
  kepala: ["Kode", "Judul", "Kelas", "Penerbit", "Lokasi", "Jumlah"] };

/* ================================================================ Penerimaan Buku */
TAB.terima = () => {
  const s = S.saringTerima;
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Penerimaan Buku</h2><p class="sub">Pembelian dan sumbangan buku beserta sumber dananya. Buku yang sudah datang langsung menambah stok di Perpustakaan.</p></div>
      <div class="aksi"><button class="tombol" type="button" id="b-unduh-terima">${ikon("unduh")}Unduh laporan</button>
        ${bukuSemua() ? `<button class="tombol utama" type="button" id="b-terima-baru">${ikon("tambah")}Catat penerimaan</button>` : ""}</div></div>
    ${catatanGalatBuku()}
    <div class="saring">
      <label class="f cari" for="t-q">Cari${ikon("cari")}<input type="search" id="t-q" value="${esc(s.q)}" placeholder="Judul, kode barang"></label>
      <label class="f" for="t-dana">Sumber dana<select id="t-dana"><option value="">Semua</option>${opsi(S.dana.map((d) => [d, d]), s.dana)}</select></label>
      <label class="f" for="t-status">Status<select id="t-status"><option value="">Semua</option>${opsi(Object.entries(STATUS_TERIMA).map(([k, v]) => [k, v[0]]), s.status)}</select></label>
    </div>
    <div class="ubin" id="t-ringkas"></div>
    <div id="t-tabel"></div>
  </section>`;
};
function barisTerima() {
  const { q, dana, status } = S.saringTerima, qq = kecil(q), hasil = [];
  S.terima.forEach((p) => {
    if ((dana && p.sumber_dana !== dana) || (status && p.status !== status)) return;
    p.baris.forEach((r) => { if (!qq || kecil([r.nama, r.kode_penerbit, r.penerbit, p.penyedia, p.nomor].filter(Boolean).join(" ")).includes(qq)) hasil.push({ p, r }); });
  });
  return hasil;
}
TAB.terima.sesudah = () => {
  const isi = () => {
    const d = barisTerima(), eks = d.reduce((s, x) => s + x.r.jumlah, 0), pesan = new Set(d.filter((x) => x.p.status === "dipesan").map((x) => x.p.id)).size;
    $("t-ringkas").innerHTML = `<div class="i"><span class="lambang">${ikon("tabel")}</span><span><b>${bil(d.length)}</b><span class="t">baris penerimaan</span></span></div>
      <div class="b"><span class="lambang">${ikon("kotak")}</span><span><b>${bil(eks)}</b><span class="t">eksemplar</span></span></div>
      <div class="${pesan ? "c" : "b"}"><span class="lambang">${ikon("masukStok")}</span><span><b>${bil(pesan)}</b><span class="t">pesanan belum datang</span></span></div>`;
    $("t-tabel").innerHTML = d.length ? `<div class="gulir" style="max-height:640px"><table><thead><tr><th>Tanggal</th><th>Kode barang</th><th>Nama barang</th><th>Kelas</th><th class="n">Jumlah</th><th class="n">Harga satuan</th><th>Penerbit</th><th>Sumber dana</th><th>Status</th></tr></thead><tbody>
      ${d.map(({ p, r }) => `<tr class="klik" tabindex="0" data-terima="${p.id}"><td>${esc(tglBuku(p.tanggal))}</td><td class="kode">${esc(r.kode_penerbit || "")}</td><td class="nama-sel"><b>${esc(r.nama)}</b></td><td>${esc(r.tingkat || "")}</td>
        <td class="n">${bil(r.jumlah)}</td><td class="n">${r.harga_satuan == null ? "" : bil(r.harga_satuan)}</td><td>${esc(r.penerbit || p.penyedia || "")}</td><td>${esc(danaTeks(p))}</td><td><span class="pil ${STATUS_TERIMA[p.status][1]}">${STATUS_TERIMA[p.status][0]}</span></td></tr>`).join("")}
      </tbody></table></div>`
      : `<div class="kosong">${ikon("kotak")}<span>${S.terima.length ? "Tidak ada penerimaan yang cocok dengan saringan." : "Belum ada penerimaan buku."}</span></div>`;
  };
  isi();
  [["t-q", "q"], ["t-dana", "dana"], ["t-status", "status"]].forEach(([id, k]) => $(id).addEventListener("input", (e) => { S.saringTerima[k] = e.target.value; isi(); }));
  const bukaBaris = (e) => { const tr = e.target.closest("tr[data-terima]"); if (tr) kartuTerima(+tr.dataset.terima); };
  $("t-tabel").addEventListener("click", bukaBaris);
  $("t-tabel").addEventListener("keydown", (e) => { if (e.key === "Enter") bukaBaris(e); });
  $("b-unduh-terima").onclick = unduhLaporanTerima;
  if ($("b-terima-baru")) $("b-terima-baru").onclick = formTerima;
};
function kartuTerima(id) {
  const p = S.terima.find((x) => x.id === id);
  if (!p) return;
  const eks = p.baris.reduce((s, r) => s + r.jumlah, 0);
  dialog({ atas: p.nomor, judul: `Penerimaan ${tglBuku(p.tanggal)}`, isi: `
    <dl class="dl">
      <dt>Status</dt><dd><span class="pil ${STATUS_TERIMA[p.status][1]}">${STATUS_TERIMA[p.status][0]}</span></dd>
      <dt>Sumber dana</dt><dd>${esc(danaTeks(p) || "Belum diisi")}</dd>
      ${p.kode_arkas ? `<dt>Kode ARKAS</dt><dd>${esc(p.kode_arkas)}</dd>` : ""}${p.no_bukti ? `<dt>No. bukti BKU</dt><dd>${esc(p.no_bukti)}</dd>` : ""}
      <dt>Toko / penerbit / penyumbang</dt><dd>${esc(p.penyedia || "—")}</dd>
      ${p.keterangan ? `<dt>Keterangan</dt><dd>${esc(p.keterangan)}</dd>` : ""}<dt>Dicatat oleh</dt><dd>${esc(p.oleh || "—")}</dd>
    </dl>
    <div class="gulir"><table><thead><tr><th>Nama barang</th><th>Kode barang</th><th>Kelas</th><th class="n">Jumlah</th><th class="n">Harga satuan</th></tr></thead><tbody>
      ${p.baris.map((r) => `<tr><td>${esc(r.nama)}${r.kode_buku ? `<p class="kecil">${esc(r.kode_buku)}</p>` : ""}</td><td class="kode">${esc(r.kode_penerbit || "")}</td><td>${esc(r.tingkat || "")}</td><td class="n">${bil(r.jumlah)}</td><td class="n">${r.harga_satuan == null ? "" : bil(r.harga_satuan)}</td></tr>`).join("")}
    </tbody><tfoot><tr><td colspan="3">Jumlah</td><td class="n">${bil(eks)}</td><td></td></tr></tfoot></table></div>`,
    kaki: `<button class="tombol" value="batal" formnovalidate>Tutup</button>${bukuSemua() ? `<button class="tombol" type="button" id="t-ubah">${ikon("ubah")}Ubah</button>` : ""}${bukuSemua() && p.status === "dipesan" ? `<button class="tombol utama" value="simpan">${ikon("centang")}Tandai sudah datang</button>` : ""}`,
    onSimpan: async () => {
      await sibuk(async () => { await rpc("sp_penerimaan_terima", { p_pin: S.pin, p_id: p.id }); await muatPerpus(); });
      tutupDialog(); segarkan(); toast(`${bil(eks)} eksemplar masuk ke stok Perpustakaan`);
    } });
  if ($("t-ubah")) $("t-ubah").onclick = () => formUbahTerima(p);
}
// Melengkapi catatan: sumber dana, bukti, harga. Jumlah tidak diubah di sini karena sudah menjadi stok.
function formUbahTerima(p) {
  const v = (x) => esc(x == null ? "" : x), bos0 = BOS(p.sumber_dana);
  dialog({ atas: p.nomor, judul: "Lengkapi penerimaan", isi: `<div class="isian-grid">
      <label class="f" for="u-tanggal">Tanggal<input id="u-tanggal" type="date" required value="${v(p.tanggal)}"></label>
      <label class="f" for="u-sumber">Sumber dana<select id="u-sumber"><option value="">Belum diisi</option>${opsi(S.dana.map((d) => [d, d]), p.sumber_dana)}</select></label>
      <label class="f u-bos" for="u-tahap"${bos0 ? "" : " hidden"}>Tahap<select id="u-tahap"><option value="">—</option>${opsi([["1", "1"], ["2", "2"], ["3", "3"]], p.tahap)}</select></label>
      <label class="f u-bos" for="u-arkas"${bos0 ? "" : " hidden"}>Kode rekening ARKAS<input id="u-arkas" maxlength="40" value="${v(p.kode_arkas)}" placeholder="mis. 5.1.02.01.02.0001"></label>
      <label class="f" for="u-bukti">No. bukti BKU<input id="u-bukti" maxlength="60" value="${v(p.no_bukti)}"></label>
      <label class="f" for="u-penyedia">Toko / penerbit / penyumbang<input id="u-penyedia" maxlength="120" value="${v(p.penyedia)}"></label>
      <label class="f lebar" for="u-ket">Keterangan<input id="u-ket" maxlength="300" value="${v(p.keterangan)}"></label>
    </div>
    <div class="gulir"><table><thead><tr><th>Nama barang</th><th class="n">Jumlah</th><th>Harga satuan (Rp)</th></tr></thead><tbody>${p.baris.map((r) => `<tr><td>${esc(r.nama)}${r.tingkat ? ` · kelas ${esc(r.tingkat)}` : ""}</td><td class="n">${bil(r.jumlah)}</td><td><input class="u-harga" data-id="${r.id}" type="number" min="0" step="500" value="${v(r.harga_satuan)}" aria-label="Harga ${esc(r.nama)}" style="width:130px"></td></tr>`).join("")}</tbody></table></div>
    <p class="kecil">Jumlah buku tidak diubah di sini karena sudah menjadi stok.${p.diubah_oleh ? ` Terakhir diubah ${esc(p.diubah_oleh)}, ${esc(tgl(p.diubah))}.` : ""}</p>`,
    kaki: kakiSimpan("Simpan"),
    onSimpan: async () => {
      const dana = $("u-sumber").value, arkas = $("u-arkas").value.trim();
      if (BOS(dana) && arkas && !/^[0-9]+(\.[0-9]+)*$/.test(arkas)) throw new Error("Kode rekening ARKAS berupa angka bertitik, mis. 5.1.02.01.02.0001.");
      await sibuk(async () => {
        await rpc("sp_penerimaan_ubah", { p_pin: S.pin, p_id: p.id, p_p: { tanggal: $("u-tanggal").value, sumber_dana: dana, tahap: $("u-tahap").value, kode_arkas: arkas, no_bukti: $("u-bukti").value, penyedia: $("u-penyedia").value, keterangan: $("u-ket").value,
          baris: [...document.querySelectorAll(".u-harga")].map((x) => ({ id: +x.dataset.id, harga_satuan: x.value })) } });
        await muatPerpus();
      });
      tutupDialog(); segarkan(); toast("Penerimaan tersimpan");
    } });
  $("u-sumber").onchange = (e) => document.querySelectorAll(".u-bos").forEach((x) => { x.hidden = !BOS(e.target.value); });
}
function barisFormTerima(a) {
  return `<tr${a ? ` data-pengajuan="${a.id}"` : ""}><td><input class="t-nama" list="t-judul" maxlength="200" aria-label="Nama buku" style="min-width:190px" value="${a ? esc(a.judul) : ""}"></td><td><input class="t-kode" maxlength="40" aria-label="Kode barang"></td>
    <td><select class="t-kelas" aria-label="Kelas" style="min-width:70px"><option value="">—</option><option>10</option><option>11</option><option>12</option></select></td>
    <td><input class="t-jumlah" type="number" min="1" aria-label="Jumlah" style="width:76px" value="${a ? a.jumlah : ""}"></td><td><input class="t-penerbit" maxlength="100" aria-label="Penerbit" value="${a ? esc(a.penerbit || "") : ""}"></td>
    <td><input class="t-harga" type="number" min="0" step="500" aria-label="Harga satuan" style="width:110px"></td></tr>`;
}
function formTerima(dariAju) {
  if (!Array.isArray(dariAju)) dariAju = [];
  const siapBeli = S.pengajuan.filter((a) => a.status === "diketahui" && !dariAju.includes(a));
  const hari = new Date(), pad = (n) => String(n).padStart(2, "0");
  dialog({ judul: "Catat penerimaan buku", isi: `<div class="isian-grid">
      <label class="f" for="t-tanggal">Tanggal<input id="t-tanggal" type="date" required value="${hari.getFullYear()}-${pad(hari.getMonth() + 1)}-${pad(hari.getDate())}"></label>
      <label class="f" for="t-st">Status<select id="t-st">${opsi([["diterima", "Sudah datang"], ["dipesan", "Baru dipesan"]], "diterima")}</select></label>
      <label class="f" for="t-sumber">Sumber dana<select id="t-sumber" required><option value="">Pilih…</option>${opsi(S.dana.map((d) => [d, d]), "")}</select></label>
      <label class="f t-bos" for="t-tahap" hidden>Tahap<select id="t-tahap"><option value="">—</option><option>1</option><option>2</option><option>3</option></select></label>
      <label class="f t-bos" for="t-arkas" hidden>Kode rekening ARKAS<input id="t-arkas" maxlength="40" placeholder="mis. 5.1.02.01.02.0001"></label>
      <label class="f" for="t-bukti">No. bukti BKU<input id="t-bukti" maxlength="60"></label>
      <label class="f" for="t-penyedia">Toko / penerbit / penyumbang<input id="t-penyedia" maxlength="120"></label>
      <label class="f lebar" for="t-ket">Keterangan<input id="t-ket" maxlength="300"></label>
    </div>
    <datalist id="t-judul">${[...new Set(S.buku.map((b) => b.judul))].map((j) => `<option value="${esc(j)}">`).join("")}</datalist>
    <div class="gulir"><table><thead><tr><th>Nama buku</th><th>Kode barang</th><th>Kelas</th><th>Jumlah</th><th>Penerbit</th><th>Harga satuan</th></tr></thead><tbody id="t-baris">${dariAju.map(barisFormTerima).join("")}${barisFormTerima().repeat(dariAju.length ? 1 : 3)}</tbody></table></div>
    <div class="baris-aksi"><button class="tombol" type="button" id="t-tambah">${ikon("tambah")}Tambah baris</button>${siapBeli.length ? `<label class="f" for="t-aju">Ambil dari pengajuan<select id="t-aju"><option value="">Pilih…</option>${opsi(siapBeli.map((a) => [a.id, `${a.judul} (${a.jumlah} eks, ${a.nama_pengusul})`]), "")}</select></label>` : ""}</div>
    <p class="kecil">Bila kode barang atau judul dan kelasnya sudah ada di katalog, jumlahnya menambah buku itu. Bila belum ada, buku baru dibuat otomatis.</p>`,
    kaki: kakiSimpan("Simpan"),
    onSimpan: async () => {
      const baris = [...$("t-baris").rows].map((tr) => ({ nama: tr.querySelector(".t-nama").value.trim(), kode_penerbit: tr.querySelector(".t-kode").value, tingkat: tr.querySelector(".t-kelas").value,
        jumlah: tr.querySelector(".t-jumlah").value, penerbit: tr.querySelector(".t-penerbit").value, harga_satuan: tr.querySelector(".t-harga").value, pengajuan: tr.dataset.pengajuan || "" })).filter((r) => r.nama);
      if (!baris.length) throw new Error("Isi minimal satu nama buku.");
      const kosong = baris.find((r) => !(+r.jumlah >= 1));
      if (kosong) throw new Error(`Isi jumlah untuk "${kosong.nama}".`);
      const dana = $("t-sumber").value, bos = BOS(dana), arkas = $("t-arkas").value.trim();
      if (bos && arkas && !/^[0-9]+(\.[0-9]+)*$/.test(arkas)) throw new Error("Kode rekening ARKAS berupa angka bertitik, mis. 5.1.02.01.02.0001.");
      const h = await sibuk(async () => {
        const x = await rpc("sp_penerimaan_simpan", { p_pin: S.pin, p_p: { tanggal: $("t-tanggal").value, status: $("t-st").value, sumber_dana: dana, tahap: bos ? $("t-tahap").value : "", kode_arkas: bos ? arkas : "",
          no_bukti: $("t-bukti").value, penyedia: $("t-penyedia").value, keterangan: $("t-ket").value, baris } });
        await muatPerpus();
        return x;
      });
      tutupDialog(); segarkan(); toast(`Penerimaan ${h.nomor} tersimpan`);
    } });
  $("t-sumber").onchange = (e) => document.querySelectorAll(".t-bos").forEach((x) => { x.hidden = !BOS(e.target.value); });
  $("t-tambah").onclick = () => $("t-baris").insertAdjacentHTML("beforeend", barisFormTerima());
  if ($("t-aju")) $("t-aju").onchange = (e) => { const a = S.pengajuan.find((x) => x.id === +e.target.value); if (!a) return; const kosong = [...$("t-baris").rows].find((tr) => !tr.querySelector(".t-nama").value.trim()); if (kosong) kosong.remove(); $("t-baris").insertAdjacentHTML("beforeend", barisFormTerima(a)); e.target.selectedOptions[0].remove(); e.target.value = ""; };
}
// Mengikuti kolom "Format Penerimaan Buku" yang dipakai perpustakaan selama ini. Pesanan yang belum datang tidak ikut.
async function unduhLaporanTerima() {
  const d = barisTerima().filter((x) => x.p.status === "diterima").sort((a, b) => a.p.tanggal.localeCompare(b.p.tanggal) || a.r.id - b.r.id);
  if (!d.length) return toast("Tidak ada penerimaan untuk diunduh.");
  const total = d.reduce((s, x) => s + x.r.jumlah, 0);
  try {
    await sibuk(async () => {
      const wb = new (await muatExcelJS()).Workbook();
      await lembarBerkop(wb, { nama: "Penerimaan Buku", judul: "Laporan Penerimaan Buku", sub: `${d.length} baris  ·  ${bil(total)} eksemplar  ·  keadaan ${tglPanjang()}`,
        kolom: [{ judul: "Tanggal", lebar: 18 }, { judul: "Kode Barang", lebar: 15 }, { judul: "Nama Barang", lebar: 34 }, { judul: "Kelas", lebar: 7, tengah: true }, { judul: "Jumlah", lebar: 8, tengah: true }, { judul: "Penerbit", lebar: 20 }, { judul: "Sumber Dana", lebar: 20 }],
        baris: d.map(({ p, r }) => [tglBuku(p.tanggal), r.kode_penerbit || "", r.nama, r.tingkat || "", r.jumlah, r.penerbit || p.penyedia || "", danaTeks(p)]),
        jumlah: { label: "Jumlah", kolom: { 4: total } }, blok: penandaTanganBuku() });
      await simpanBuku(wb, "Laporan_Penerimaan_Buku");
    });
  } catch (e) { toast(e.message); }
}
