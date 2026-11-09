/* Pengajuan buku, penghapusan buku & barang, kategori barang (2 Nov 2026). Lihat RENCANA_PERPUSTAKAAN.md.
   Pengajuan: diusulkan → disetujui Wakasek Kurikulum → diketahui Kepala Sekolah → masuk Penerimaan Buku.
   Penghapusan: diusulkan pengelola → disetujui (buku: Wakasek Kurikulum; barang: Wakasek/Staf Sarpras) → diketahui Kepala Sekolah → selesai.
   Hak tiap langkah diperiksa di server; tombol hanya mengikuti. */
"use strict";
Object.assign(S, { pengajuan: [], penghapusan: [], saringAju: "aktif", saringHps: "aktif" });
const ST_AJU = { diajukan: ["Menunggu Wakasek Kurikulum", "c"], disetujui: ["Menunggu Kepala Sekolah", "i"], diketahui: ["Siap dibeli", "b"], dibeli: ["Sudah dibeli", "b"], ditolak: ["Ditolak", "k"] };
const ST_HPS = { diusulkan: ["Menunggu persetujuan", "c"], disetujui: ["Menunggu Kepala Sekolah", "i"], diketahui: ["Siap diselesaikan", "b"], selesai: ["Sudah dihapus", "b"], ditolak: ["Ditolak", "k"] };
const ALASAN_HPS = { rusak: "Rusak", hilang: "Hilang", ganti_kurikulum: "Ganti kurikulum", lainnya: "Lainnya" };
const punyaJabatan = (j) => S.akses && (S.akses.id === "ADMIN" || (S.akses.jabatan || []).includes(j));
const pimpinan = () => punyaJabatan("kepala_sekolah") || punyaJabatan("wakasek_kurikulum");
const bolehUsulBuku = () => !!aksesBuku();
const bolehUsulBarang = () => admin() || (pjRuang() && ruangBarang().length > 0);
const bolehKelolaHapus = (h) => h.jenis === "buku" ? bukuSemua() || (bukuLiterasi() && h.lokasi_jenis === "literasi") : admin() || (pjRuang() && ruangSaya().includes(h.ruang));

async function muatUsulan() {
  const [a, h] = await Promise.all([rpc("sp_pengajuan_daftar", { p_pin: S.pin }).catch(() => null), rpc("sp_penghapusan_daftar", { p_pin: S.pin }).catch(() => null)]);
  S.pengajuan = a || []; S.penghapusan = h || [];
}
const aksiAju = (a) => (a.status === "diajukan" && punyaJabatan("wakasek_kurikulum")) || (a.status === "disetujui" && punyaJabatan("kepala_sekolah"));
const aksiHps = (h) => (h.status === "diusulkan" && punyaJabatan(h.jenis === "buku" ? "wakasek_kurikulum" : "sarpras")) || (h.status === "disetujui" && punyaJabatan("kepala_sekolah")) || (h.status === "diketahui" && bolehKelolaHapus(h));
const jumlahTugas = () => S.pengajuan.filter(aksiAju).length + S.penghapusan.filter(aksiHps).length;
const jejakTeks = (r) => [r.setuju_oleh ? `Disetujui ${r.setuju_oleh}` : "", r.tahu_oleh ? `Diketahui ${r.tahu_oleh}` : "", r.tolak_oleh ? `Ditolak ${r.tolak_oleh}: ${r.alasan_tolak || ""}` : ""].filter(Boolean).join(" · ");
async function selesaiUsulan(pesan) { await sibuk(muatUsulan); aturTab(); segarkan(); if (pesan) toast(pesan); }

/* ================================================================ Pengajuan Buku */
TAB.pengajuan = () => {
  const d = S.pengajuan.filter((a) => S.saringAju === "semua" || (S.saringAju === "aktif" ? ["diajukan", "disetujui", "diketahui"].includes(a.status) : a.status === S.saringAju));
  const n = (s) => S.pengajuan.filter((a) => a.status === s).length;
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Pengajuan Buku</h2><p class="sub">Usulan buku dari guru dan siswa: disetujui Wakasek Kurikulum, diketahui Kepala Sekolah, lalu dicatat di Penerimaan Buku saat dibeli.</p></div>
      <div class="aksi"><button class="tombol" type="button" id="aj-unduh">${ikon("unduh")}Unduh</button><button class="tombol" type="button" data-template="pengajuan">${ikon("tabel")}Unduh template</button><button class="tombol" type="button" data-unggah="pengajuan">${ikon("unggah")}Unggah</button><button class="tombol utama" type="button" id="aj-baru">${ikon("tambah")}Ajukan buku</button></div></div>
    <div class="ubin"><div class="c"><span class="lambang">${ikon("info")}</span><span><b>${n("diajukan")}</b><span class="t">menunggu Wakasek Kurikulum</span></span></div>
      <div class="i"><span class="lambang">${ikon("orang")}</span><span><b>${n("disetujui")}</b><span class="t">menunggu Kepala Sekolah</span></span></div>
      <div class="b"><span class="lambang">${ikon("centang")}</span><span><b>${n("diketahui")}</b><span class="t">siap dibeli</span></span></div></div>
    <div class="saring"><label class="f" for="aj-saring">Tampilkan<select id="aj-saring">${opsi([["aktif", "Yang masih berjalan"], ["dibeli", "Sudah dibeli"], ["ditolak", "Ditolak"], ["semua", "Semua"]], S.saringAju)}</select></label></div>
    ${d.length ? `<div class="gulir"><table><thead><tr><th>Judul</th><th class="n">Eks</th><th>Pengusul</th><th>Alasan</th><th>Status</th><th></th></tr></thead><tbody>${d.map((a) => `<tr>
      <td class="nama-sel"><b>${esc(a.judul)}</b><p class="kecil">${esc([a.penulis, a.penerbit].filter(Boolean).join(" · "))}</p></td><td class="n">${a.jumlah}</td>
      <td>${esc(a.nama_pengusul)}<p class="kecil">${esc(a.keterangan || "")}</p></td><td class="kecil">${esc(a.alasan || "")}</td>
      <td><span class="pil ${ST_AJU[a.status][1]}">${ST_AJU[a.status][0]}</span><p class="kecil">${esc(jejakTeks(a))}</p></td>
      <td style="white-space:nowrap">${tombolAju(a)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div class="kosong">${ikon("buku")}<span>Tidak ada pengajuan di sini.</span></div>`}
  </section>`;
};
function tombolAju(a) {
  const t = [];
  if (a.status === "diajukan" && punyaJabatan("wakasek_kurikulum")) t.push(`<button class="tombol utama kecil" type="button" data-aaju="setuju" data-id="${a.id}">Setujui</button>`, `<button class="tombol kecil" type="button" data-aaju="tolak" data-id="${a.id}">Tolak</button>`);
  if (a.status === "disetujui" && punyaJabatan("kepala_sekolah")) t.push(`<button class="tombol utama kecil" type="button" data-aaju="tahu" data-id="${a.id}">Mengetahui</button>`);
  if (a.status === "diketahui" && bukuSemua()) t.push(`<button class="tombol kecil" type="button" data-aaju="beli" data-id="${a.id}">Catat penerimaan</button>`);
  if (a.status === "diajukan" && (a.guru === S.akses.id || bukuSemua() || S.akses.id === "ADMIN")) t.push(`<button class="tombol kecil" type="button" data-aaju="batal" data-id="${a.id}">Batalkan</button>`);
  return t.join(" ");
}
TAB.pengajuan.sesudah = () => {
  $("aj-saring").addEventListener("input", (e) => { S.saringAju = e.target.value; segarkan(); });
  $("aj-baru").onclick = formAjukan;
  $("aj-unduh").onclick = unduhPengajuan;
  pasangTombolBerkas($("isi").querySelector("section"));
  $("isi").querySelector("section").addEventListener("click", async (e) => {
    const t = e.target.closest("[data-aaju]"); if (!t) return;
    const id = +t.dataset.id, aksi = t.dataset.aaju, a = S.pengajuan.find((x) => x.id === id);
    if (aksi === "beli") return formTerima([a]);
    if (aksi === "tolak") return formTolakUsul("Tolak pengajuan", a.judul, (alasan) => rpc("sp_pengajuan_proses", { p_pin: S.pin, p_id: id, p_aksi: "tolak", p_alasan: alasan }));
    try { await sibuk(() => rpc("sp_pengajuan_proses", { p_pin: S.pin, p_id: id, p_aksi: aksi, p_alasan: null })); await selesaiUsulan({ setuju: "Pengajuan disetujui", tahu: "Pengajuan sudah diketahui", batal: "Pengajuan dibatalkan" }[aksi]); }
    catch (err) { toast(err.message); }
  });
};
function formTolakUsul(judul, atas, kirim) {
  dialog({ atas, judul, isi: `<label class="f" for="u-alasan">Alasan (terlihat oleh pengusul)<input id="u-alasan" maxlength="200" required></label>`, kaki: kakiSimpan("Tolak"),
    onSimpan: async () => { await sibuk(() => kirim($("u-alasan").value)); tutupDialog(); await selesaiUsulan("Sudah ditolak"); } });
}
function formAjukan() {
  dialog({ judul: "Ajukan buku", isi: `<div class="isian-grid">
      <label class="f lebar" for="a-judul">Judul buku<input id="a-judul" maxlength="200" required></label>
      <label class="f" for="a-penulis">Penulis<input id="a-penulis" maxlength="150"></label>
      <label class="f" for="a-penerbit">Penerbit<input id="a-penerbit" maxlength="100"></label>
      <label class="f" for="a-jumlah">Jumlah eksemplar<input id="a-jumlah" type="number" min="1" value="1" required></label>
      <label class="f" for="a-ket">Mapel atau kelas<input id="a-ket" maxlength="80" placeholder="mis. Sejarah"></label>
      <label class="f lebar" for="a-alasan">Alasan dan kegunaan<input id="a-alasan" maxlength="300"></label></div>
      <p class="kecil">Usulan diteruskan ke Wakasek Kurikulum, lalu diketahui Kepala Sekolah.</p>`, kaki: kakiSimpan("Kirim"),
    onSimpan: async () => {
      await sibuk(() => rpc("sp_pengajuan_simpan", { p_pin: S.pin, p_a: { judul: $("a-judul").value, penulis: $("a-penulis").value, penerbit: $("a-penerbit").value, jumlah: $("a-jumlah").value, keterangan: $("a-ket").value, alasan: $("a-alasan").value } }));
      tutupDialog(); await selesaiUsulan("Pengajuan terkirim ke Wakasek Kurikulum");
    } });
}
async function unduhPengajuan() {
  const d = S.pengajuan.filter((a) => ["diajukan", "disetujui", "diketahui"].includes(a.status));
  if (!d.length) return toast("Tidak ada pengajuan yang masih berjalan.");
  const p = profilKop(), wk = (d.find((a) => a.setuju_oleh) || {}).setuju_oleh || "";
  try {
    await sibuk(async () => {
      const wb = new (await muatExcelJS()).Workbook();
      await lembarBerkop(wb, { nama: "Pengajuan Buku", judul: "Daftar Pengajuan Buku Perpustakaan", sub: `${d.length} judul  ·  keadaan ${tglPanjang()}`,
        kolom: [{ judul: "Judul", lebar: 34 }, { judul: "Penulis", lebar: 20 }, { judul: "Penerbit", lebar: 18 }, { judul: "Jumlah", lebar: 8, tengah: true }, { judul: "Pengusul", lebar: 24 }, { judul: "Mapel/Kelas", lebar: 14 }, { judul: "Alasan", lebar: 30 }, { judul: "Status", lebar: 20 }],
        baris: d.map((a) => [a.judul, a.penulis || "", a.penerbit || "", a.jumlah, a.nama_pengusul, a.keterangan || "", a.alasan || "", ST_AJU[a.status][0]]),
        blok: [{ atas: ["Diajukan oleh,", "Penanggung Jawab Perpustakaan,"], nama: (ruangOf("PERPUS") || {}).pj_nama || "" }, { atas: ["Menyetujui,", "Wakasek Kurikulum,"], nama: wk },
          { atas: ["Mengetahui,", "Kepala Sekolah,"], nama: p.kepala_sekolah || "", nip: p.nip_kepala ? "NIP. " + p.nip_kepala : null }] });
      await simpanBuku(wb, "Pengajuan_Buku");
    });
  } catch (e) { toast(e.message); }
}

/* Pengajuan dari Excel (9 Nov 2026): template → isi beberapa judul → unggah; dikirim sekaligus lewat sp_pengajuan_unggah. */
TEMPLATE.pengajuan = () => ({ judul: "Pengajuan Buku", berkas: "Pengajuan_Buku",
  kolom: [{ judul: "Judul", lebar: 36, wajib: true }, { judul: "Penulis", lebar: 22 }, { judul: "Penerbit", lebar: 20 }, { judul: "Jumlah", lebar: 9 },
    { judul: "Mapel/Kelas", lebar: 16 }, { judul: "Alasan", lebar: 40 }],
  daftar: [],
  petunjuk: ["• Satu baris = satu judul buku yang diajukan. Kolom berwarna merah wajib: Judul.",
    "• Jumlah = banyak eksemplar, bilangan bulat 1–1000. Bila kosong, dicatat 1.",
    "• Mapel/Kelas: mapel atau kelas yang memakai buku itu (mis. Sejarah, atau Kelas 11). Alasan: kegunaan buku.",
    "• Panjang isian paling banyak: Judul 200 huruf, Penulis 150, Penerbit 100, Mapel/Kelas 80, Alasan 300.",
    "• Pengajuan tercatat atas nama Anda, lalu diteruskan ke Wakasek Kurikulum dan diketahui Kepala Sekolah, sama seperti tombol Ajukan buku.",
    "• Satu unggahan dikirim seluruhnya atau tidak sama sekali. Bila ada baris yang ditolak, pesannya menyebut nomor barisnya.",
    "• Jangan mengunggah berkas hasil tombol Unduh (daftar pengajuan berkop); pakai template ini."] });
function bacaPengajuan(XLSX, wb) {
  const L = bacaLembar(XLSX, wb, /^judul$/);
  if (!L) throw new Error('Kolom "Judul" tidak ditemukan. Pakai template Pengajuan Buku.');
  const K = kolomDari(L.kep, { judul: /^judul$/, penulis: /^penulis/, penerbit: /^penerbit/, jumlah: /^(jumlah|eks)/, ket: /^(mapel|kelas|keterangan)/, alasan: /^alasan/, pengusul: /^pengusul/, status: /^status/ });
  if (K.pengusul >= 0 || K.status >= 0) throw new Error("Ini berkas hasil tombol Unduh (daftar pengajuan yang sudah ada). Mengunggahnya akan mengajukan ulang buku yang sama. Pakai Unduh template.");
  const ambil = (r, k) => normal(K[k] >= 0 ? r[K[k]] : "");
  const hasil = { baris: [], galat: [], peringatan: [], baru: 0, ubah: 0 };
  const dalam = new Map(), berjalan = new Set(S.pengajuan.filter((a) => ["diajukan", "disetujui", "diketahui"].includes(a.status)).map((a) => kecil(a.judul)));
  const batas = [["judul", "Judul", 200], ["penulis", "Penulis", 150], ["penerbit", "Penerbit", 100], ["ket", "Mapel/Kelas", 80], ["alasan", "Alasan", 300]];
  for (let i = L.hi + 1; i < L.rows.length; i++) {
    const r = L.rows[i], ke = i + 1, judul = ambil(r, "judul");
    if (r.every((v) => normal(v) === "")) continue;
    if (!judul) { hasil.galat.push(`Baris ${ke}: Judul kosong.`); continue; }
    const panjang = batas.find(([k, , n]) => ambil(r, k).length > n);
    if (panjang) { hasil.galat.push(`Baris ${ke}: ${panjang[1]} terlalu panjang (paling banyak ${panjang[2]} huruf).`); continue; }
    const o = { baris: ke, judul };
    const jx = ambil(r, "jumlah");
    if (jx) { const n = Number(jx); if (!Number.isInteger(n) || n < 1 || n > 1000) { hasil.galat.push(`Baris ${ke}: Jumlah "${jx}" harus bilangan bulat 1–1000.`); continue; } o.jumlah = n; }
    [["penulis", "penulis"], ["penerbit", "penerbit"], ["ket", "keterangan"], ["alasan", "alasan"]].forEach(([k, f]) => { const x = ambil(r, k); if (x) o[f] = x; });
    const kj = kecil(judul);
    if (dalam.has(kj)) hasil.peringatan.push(`Baris ${ke}: judul sama dengan baris ${dalam.get(kj)}.`); else dalam.set(kj, ke);
    if (berjalan.has(kj)) hasil.peringatan.push(`Baris ${ke}: "${judul}" sudah ada di pengajuan yang masih berjalan.`);
    hasil.baru++;
    hasil.baris.push(o);
  }
  return hasil;
}
UNGGAH.pengajuan = { judul: "Unggah pengajuan buku", baca: bacaPengajuan, rpc: "sp_pengajuan_unggah", muat: muatUsulan, sesudah: aturTab,
  ringkas: (h) => `${h.baru} judul akan diajukan`,
  hasil: (x) => `${x.baru} judul diajukan ke Wakasek Kurikulum`,
  tombol: (h) => `Kirim ${h.baris.length} pengajuan`,
  catatan: "Semua baris dikirim sekaligus ke Wakasek Kurikulum atas nama Anda, atau tidak sama sekali bila ada yang gagal.",
  kolom: (o) => [esc(o.judul), esc([o.penulis, o.penerbit].filter(Boolean).join(" · ")), esc(o.jumlah ?? 1), esc(o.keterangan || ""), esc(o.alasan || "")],
  kepala: ["Judul", "Penulis · Penerbit", "Eks", "Mapel/Kelas", "Alasan"] };

/* ================================================================ Penghapusan */
TAB.hapusan = () => {
  const d = S.penghapusan.filter((h) => S.saringHps === "semua" || (S.saringHps === "aktif" ? ["diusulkan", "disetujui", "diketahui"].includes(h.status) : h.status === S.saringHps));
  const n = (a) => S.penghapusan.filter((h) => h.status !== "ditolak" && h.alasan === a).reduce((s, h) => s + h.jumlah, 0);
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Penghapusan</h2><p class="sub">Mengeluarkan buku atau barang karena rusak, hilang, ganti kurikulum, atau alasan lain. Buku disetujui Wakasek Kurikulum, barang disetujui Wakasek atau Staf Sarana Prasarana; keduanya diketahui Kepala Sekolah, lalu terbit berita acara.</p></div>
      <div class="aksi">${bolehUsulBuku() ? `<button class="tombol" type="button" data-template="hapusbuku">${ikon("tabel")}Template hapus buku</button><button class="tombol" type="button" data-unggah="hapusbuku">${ikon("unggah")}Unggah hapus buku</button>` : ""}${bolehUsulBuku() || bolehUsulBarang() ? `<button class="tombol utama" type="button" id="h-baru">${ikon("tambah")}Usulkan penghapusan</button>` : ""}</div></div>
    <div class="ubin">${Object.entries(ALASAN_HPS).map(([k, v]) => `<div><span class="lambang">${ikon(k === "hilang" ? "awas" : k === "rusak" ? "rusak" : "dokumen")}</span><span><b>${bil(n(k))}</b><span class="t">${v}</span></span></div>`).join("")}</div>
    <div class="saring"><label class="f" for="h-saring">Tampilkan<select id="h-saring">${opsi([["aktif", "Yang masih berjalan"], ["selesai", "Sudah dihapus"], ["ditolak", "Ditolak"], ["semua", "Semua"]], S.saringHps)}</select></label></div>
    ${d.length ? `<div class="gulir"><table><thead><tr><th>Buku / barang</th><th class="n">Jumlah</th><th>Alasan</th><th>Keterangan</th><th>Status</th><th></th></tr></thead><tbody>${d.map((h) => `<tr>
      <td class="nama-sel"><b>${esc(h.nama)}</b><p class="kecil">${h.jenis === "buku" ? "Buku" : "Barang"} · ${esc(h.kode)}${h.jenis === "buku" ? ` · ${esc(namaLokasi({ jenis: h.lokasi_jenis, tempat: h.lokasi_tempat }))}` : h.ruang ? ` · ${esc(namaRuang(h.ruang))}` : ""}</p></td>
      <td class="n">${h.jumlah}</td><td>${ALASAN_HPS[h.alasan]}</td><td class="kecil">${esc(h.keterangan)}<br>Diusulkan ${esc(h.oleh)}</td>
      <td><span class="pil ${ST_HPS[h.status][1]}">${ST_HPS[h.status][0]}</span>${h.nomor_ba ? `<p class="kode">${esc(h.nomor_ba)}</p>` : ""}<p class="kecil">${esc(jejakTeks(h))}</p></td>
      <td style="white-space:nowrap">${tombolHps(h)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div class="kosong">${ikon("centang")}<span>Tidak ada usulan di sini.</span></div>`}
  </section>`;
};
function tombolHps(h) {
  const t = [];
  if (h.status === "diusulkan" && punyaJabatan(h.jenis === "buku" ? "wakasek_kurikulum" : "sarpras")) t.push(`<button class="tombol utama kecil" type="button" data-ahps="setuju" data-id="${h.id}">Setujui</button>`, `<button class="tombol kecil" type="button" data-ahps="tolak" data-id="${h.id}">Tolak</button>`);
  if (h.status === "disetujui" && punyaJabatan("kepala_sekolah")) t.push(`<button class="tombol utama kecil" type="button" data-ahps="tahu" data-id="${h.id}">Mengetahui</button>`);
  if (h.status === "diketahui" && bolehKelolaHapus(h)) t.push(`<button class="tombol utama kecil" type="button" data-ahps="selesai" data-id="${h.id}">Hapus dari ${h.jenis === "buku" ? "katalog" : "inventaris"}</button>`);
  if (h.nomor_ba) t.push(`<button class="tombol kecil" type="button" data-ahps="ba" data-id="${h.id}">${ikon("unduh")}Berita acara</button>`);
  if (h.status === "diusulkan" && (h.oleh_id === S.akses.id || S.akses.id === "ADMIN")) t.push(`<button class="tombol kecil" type="button" data-ahps="batal" data-id="${h.id}">Batalkan</button>`);
  return t.join(" ");
}
TAB.hapusan.sesudah = () => {
  $("h-saring").addEventListener("input", (e) => { S.saringHps = e.target.value; segarkan(); });
  if ($("h-baru")) $("h-baru").onclick = () => formUsulHapus();
  pasangTombolBerkas($("isi").querySelector("section"));
  $("isi").querySelector("section").addEventListener("click", async (e) => {
    const t = e.target.closest("[data-ahps]"); if (!t) return;
    const id = +t.dataset.id, aksi = t.dataset.ahps, h = S.penghapusan.find((x) => x.id === id);
    if (aksi === "ba") return unduhBA(h);
    if (aksi === "tolak") return formTolakUsul("Tolak usulan", h.nama, (alasan) => rpc("sp_penghapusan_proses", { p_pin: S.pin, p_id: id, p_aksi: "tolak", p_alasan: alasan }));
    if (aksi === "selesai") return dialog({ atas: h.nomor_ba, judul: `Hapus ${h.nama}?`, isi: `<p class="catatan awas">${ikon("awas")}<span><b>${h.jumlah}</b> ${h.jenis === "buku" ? "eksemplar dikeluarkan dari stok dan asetnya ikut berkurang" : "unit dikeluarkan dari inventaris"}. Langkah ini tidak bisa dibatalkan.</span></p>`, kaki: kakiSimpan("Hapus"),
      onSimpan: async () => { await sibuk(async () => { await rpc("sp_penghapusan_proses", { p_pin: S.pin, p_id: id, p_aksi: "selesai", p_alasan: null }); await muatUlang(); }); tutupDialog(); await selesaiUsulan("Penghapusan selesai"); } });
    try { await sibuk(() => rpc("sp_penghapusan_proses", { p_pin: S.pin, p_id: id, p_aksi: aksi, p_alasan: null })); await selesaiUsulan({ setuju: "Usulan disetujui", tahu: "Sudah diketahui; berita acara terbit", batal: "Usulan dibatalkan" }[aksi]); }
    catch (err) { toast(err.message); }
  });
};
function formUsulHapus(awal = {}) {
  const bisaBuku = bolehUsulBuku(), bisaBarang = bolehUsulBarang(), jenis0 = awal.jenis || (bisaBuku ? "buku" : "barang");
  const buku = bukuTampil(), barang = S.alat.filter((a) => a.kategori !== "BK" && (admin() || ruangBarang().includes(a.ruang)));
  dialog({ judul: "Usulkan penghapusan", isi: `<div class="isian-grid">
      ${bisaBuku && bisaBarang ? `<label class="f" for="h-jenis">Jenis<select id="h-jenis">${opsi([["buku", "Buku"], ["barang", "Barang"]], jenis0)}</select></label>` : ""}
      <label class="f lebar h-buku" for="h-buku">Buku<select id="h-buku">${opsi(buku.map((b) => [b.id, labelBuku(b)]), awal.buku ? awal.buku.id : "")}</select></label>
      <label class="f lebar h-buku" for="h-lokasi">Lokasi<select id="h-lokasi"></select></label>
      <label class="f lebar h-barang" for="h-alat">Barang<select id="h-alat">${opsi(barang.map((a) => [a.id, `${a.kode} · ${a.nama}${a.ruang ? " · " + namaRuang(a.ruang) : ""} (${a.jumlah} unit)`]), awal.alat ? awal.alat.id : "")}</select></label>
      <label class="f" for="h-jumlah">Jumlah<input id="h-jumlah" type="number" min="1" value="1" required></label>
      <label class="f" for="h-alasan">Alasan<select id="h-alasan">${opsi(Object.entries(ALASAN_HPS), "rusak")}</select></label>
      <label class="f lebar" for="h-ket">Keterangan kondisi<input id="h-ket" maxlength="300" required placeholder="mis. Jilid lepas, halaman 12–30 hilang"></label></div>
      <p class="kecil" id="h-info"></p>`, kaki: kakiSimpan("Kirim usulan"),
    onSimpan: async () => {
      const jn = $("h-jenis") ? $("h-jenis").value : jenis0, lk = (b) => b.lokasi[+$("h-lokasi").value];
      const data = { jumlah: $("h-jumlah").value, alasan: $("h-alasan").value, keterangan: $("h-ket").value, jenis: jn };
      if (jn === "buku") { const b = S.buku.find((x) => x.id === +$("h-buku").value), l = b && lk(b); if (!l) throw new Error("Buku ini tidak punya lokasi yang bisa dipilih."); Object.assign(data, { buku: b.id, lokasi_jenis: l.jenis, lokasi_tempat: l.tempat }); }
      else { if (!$("h-alat").value) throw new Error("Pilih barangnya."); data.alat = +$("h-alat").value; }
      await sibuk(() => rpc("sp_penghapusan_usul", { p_pin: S.pin, p_h: data }));
      tutupDialog(); S.tab === "hapusan" ? await selesaiUsulan("Usulan terkirim") : (await sibuk(muatUsulan), aturTab(), toast("Usulan terkirim. Lihat di menu Penghapusan."));
    } });
  const perBuku = () => { const b = S.buku.find((x) => x.id === +$("h-buku").value), lok = b ? b.lokasi.filter((l) => !bukuLiterasi() || l.jenis === "literasi") : [];
    $("h-lokasi").innerHTML = (b ? b.lokasi : []).map((l, i) => bukuLiterasi() && l.jenis !== "literasi" ? "" : `<option value="${i}">${esc(namaLokasi(l))} (${l.jumlah} eks)</option>`).join(""); return lok; };
  const perJenis = () => { const jn = $("h-jenis") ? $("h-jenis").value : jenis0;
    document.querySelectorAll(".h-buku").forEach((x) => { x.hidden = jn !== "buku"; }); document.querySelectorAll(".h-barang").forEach((x) => { x.hidden = jn !== "barang"; });
    $("h-info").textContent = jn === "buku" ? "Disetujui Wakasek Kurikulum, lalu diketahui Kepala Sekolah. Bila buku hilang, tidak ada denda; tulis nama peminjam terakhir di keterangan." : "Disetujui Wakasek atau Staf Sarana Prasarana, lalu diketahui Kepala Sekolah. Unit rusak berat dikurangi lebih dulu."; };
  if ($("h-jenis")) $("h-jenis").onchange = perJenis;
  $("h-buku").onchange = perBuku; perBuku(); perJenis();
}
document.addEventListener("click", (e) => { const t = e.target.closest("#b-usul-hapus"); if (!t) return; const a = S.alat.find((x) => x.id === +t.dataset.alat); if (a) formUsulHapus({ jenis: "barang", alat: a }); });
async function unduhBA(h) {
  const p = profilKop(), buku = h.jenis === "buku";
  try {
    await sibuk(async () => {
      const wb = new (await muatExcelJS()).Workbook();
      await lembarBerkop(wb, { nama: "Berita Acara", judul: `Berita Acara Penghapusan ${buku ? "Buku Perpustakaan" : "Barang Inventaris"}`, sub: `Nomor ${h.nomor_ba}  ·  ${tglPanjang()}`,
        kolom: [{ judul: "Kode", lebar: 24 }, { judul: buku ? "Judul" : "Nama Barang", lebar: 34 }, { judul: "Lokasi", lebar: 22 }, { judul: "Jumlah", lebar: 8, tengah: true }, { judul: "Alasan", lebar: 16 }, { judul: "Keterangan", lebar: 36 }],
        baris: [[h.kode, h.nama, buku ? namaLokasi({ jenis: h.lokasi_jenis, tempat: h.lokasi_tempat }) : namaRuang(h.ruang), h.jumlah, ALASAN_HPS[h.alasan], h.keterangan]],
        blok: [{ atas: ["Diusulkan oleh,", buku ? "Pengelola Buku," : "Penanggung Jawab Ruang,"], nama: h.oleh }, { atas: ["Menyetujui,", buku ? "Wakasek Kurikulum," : "Sarana Prasarana,"], nama: h.setuju_oleh || "" },
          { atas: ["Mengetahui,", "Kepala Sekolah,"], nama: p.kepala_sekolah || "", nip: p.nip_kepala ? "NIP. " + p.nip_kepala : null }] });
      await simpanBuku(wb, "Berita_Acara_" + h.nomor_ba.replace(/\W+/g, "_"));
    });
  } catch (e) { toast(e.message); }
}

/* Usulan penghapusan buku dari Excel (9 Nov 2026): template berisi buku per lokasi yang dikelola; isi Jumlah Dihapus,
   Alasan, Keterangan pada buku yang akan dihapus, lalu unggah. Dikirim sekaligus lewat sp_penghapusan_unggah. */
TEMPLATE.hapusbuku = () => ({ judul: "Usulan Penghapusan Buku", berkas: "Penghapusan_Buku",
  kolom: [{ judul: "Kode Buku", lebar: 11, wajib: true }, { judul: "Judul", lebar: 34 }, { judul: "Lokasi", lebar: 15, wajib: true }, { judul: "Tempat", lebar: 16 },
    { judul: "Stok", lebar: 7 }, { judul: "Jumlah Dihapus", lebar: 10, wajib: true }, { judul: "Alasan", lebar: 17, wajib: true }, { judul: "Keterangan", lebar: 40, wajib: true }],
  isi: bukuTampil().flatMap((b) => b.lokasi.filter((l) => l.jumlah > 0 && (!bukuLiterasi() || l.jenis === "literasi"))
    .map((l) => [b.kode, b.judul, LOKASI_BUKU[l.jenis], l.tempat || "", l.jumlah, "", "", ""])),
  daftar: [{ judul: "Alasan", untuk: "Alasan", isi: Object.values(ALASAN_HPS) }],
  petunjuk: ["• Template sudah berisi semua buku yang Anda kelola, satu baris per lokasi. Isi hanya baris buku yang akan dihapus; baris dengan Jumlah Dihapus kosong dilewati.",
    "• Jumlah Dihapus: bilangan bulat, paling banyak sebanyak Stok di lokasi itu.",
    "• Alasan pilih dari daftar: Rusak, Hilang, Ganti kurikulum, atau Lainnya.",
    "• Keterangan kondisi wajib (minimal 3 huruf), mis. \"Jilid lepas, halaman 12–30 hilang\". Bila buku hilang, tulis nama peminjam terakhir.",
    "• Jangan mengubah Kode Buku, Lokasi, dan Tempat; ketiganya menunjuk buku dan tempat yang dihapus. Judul dan Stok hanya keterangan.",
    "• Usulan diteruskan ke Wakasek Kurikulum, lalu diketahui Kepala Sekolah dan terbit berita acara, sama seperti tombol Usulkan penghapusan.",
    "• Satu unggahan dikirim seluruhnya atau tidak sama sekali. Bila ada baris yang ditolak, pesannya menyebut nomor barisnya."] });
function bacaHapusBuku(XLSX, wb) {
  const L = bacaLembar(XLSX, wb, /^kode buku$/);
  if (!L) throw new Error('Kolom "Kode Buku" tidak ditemukan. Pakai template Penghapusan Buku.');
  const K = kolomDari(L.kep, { kode: /^kode buku$/, lokasi: /^lokasi/, tempat: /^tempat/, jumlah: /^jumlah dihapus/, alasan: /^alasan/, ket: /^keterangan/ });
  if (K.jumlah < 0) throw new Error('Kolom "Jumlah Dihapus" tidak ditemukan. Pakai template Penghapusan Buku (bukan template atau unduhan Katalog Buku).');
  const ambil = (r, k) => normal(K[k] >= 0 ? r[K[k]] : "");
  const lokasiDari = (v) => Object.keys(LOKASI_BUKU).find((k) => k === kecil(v) || kecil(LOKASI_BUKU[k]) === kecil(v));
  const alasanDari = (v) => Object.keys(ALASAN_HPS).find((k) => k === kecil(v) || kecil(ALASAN_HPS[k]) === kecil(v));
  const berjalan = S.penghapusan.filter((h) => h.jenis === "buku" && ["diusulkan", "disetujui", "diketahui"].includes(h.status));
  const terpakai = new Map(), hasil = { baris: [], galat: [], peringatan: [], baru: 0, ubah: 0 };
  for (let i = L.hi + 1; i < L.rows.length; i++) {
    const r = L.rows[i], ke = i + 1, jx = ambil(r, "jumlah"), ax = ambil(r, "alasan"), ket = ambil(r, "ket");
    if (!jx) { if (ax || ket) hasil.galat.push(`Baris ${ke}: Alasan/Keterangan terisi tetapi Jumlah Dihapus kosong.`); continue; }
    const kode = ambil(r, "kode").toUpperCase(), b = S.buku.find((x) => x.kode === kode);
    if (!b) { hasil.galat.push(`Baris ${ke}: kode buku "${kode}" tidak ditemukan.`); continue; }
    const lx = ambil(r, "lokasi"), lok = lokasiDari(lx), tx = kecil(ambil(r, "tempat"));
    if (!lok) { hasil.galat.push(`Baris ${ke}: Lokasi "${lx}" tidak dikenal.`); continue; }
    if (bukuLiterasi() && lok !== "literasi") { hasil.galat.push(`Baris ${ke}: Anda hanya mengelola buku berlokasi Pojok Literasi.`); continue; }
    const l = b.lokasi.find((x) => x.jenis === lok && kecil(x.tempat || "") === tx);
    if (!l) { hasil.galat.push(`Baris ${ke}: ${b.kode} tidak ada di ${LOKASI_BUKU[lok]}${tx ? " · " + ambil(r, "tempat") : ""}.`); continue; }
    const n = Number(jx);
    if (!Number.isInteger(n) || n < 1) { hasil.galat.push(`Baris ${ke}: Jumlah Dihapus "${jx}" harus bilangan bulat minimal 1.`); continue; }
    const kunci = `${b.id}|${lok}|${l.tempat || ""}`, total = (terpakai.get(kunci) || 0) + n;
    if (total > l.jumlah) { hasil.galat.push(`Baris ${ke}: ${b.kode} di ${namaLokasi(l)} hanya ${l.jumlah} eksemplar${total > n ? " (dihitung bersama baris lain untuk buku dan tempat yang sama)" : ""}.`); continue; }
    const alasan = alasanDari(ax);
    if (!alasan) { hasil.galat.push(`Baris ${ke}: Alasan "${ax}" harus Rusak, Hilang, Ganti kurikulum, atau Lainnya.`); continue; }
    if (ket.length < 3) { hasil.galat.push(`Baris ${ke}: tulis Keterangan kondisinya (minimal 3 huruf).`); continue; }
    if (ket.length > 300) { hasil.galat.push(`Baris ${ke}: Keterangan terlalu panjang (paling banyak 300 huruf).`); continue; }
    terpakai.set(kunci, total);
    if (berjalan.some((h) => h.buku === b.id && h.lokasi_jenis === lok && (h.lokasi_tempat || "") === (l.tempat || ""))) hasil.peringatan.push(`Baris ${ke}: ${b.kode} di ${namaLokasi(l)} sudah punya usulan penghapusan yang masih berjalan.`);
    hasil.baru++;
    hasil.baris.push({ baris: ke, buku: b.id, lokasi_jenis: lok, lokasi_tempat: l.tempat || "", jumlah: n, alasan, keterangan: ket, kode: b.kode, judul: b.judul });
  }
  if (!hasil.baris.length && !hasil.galat.length) hasil.galat.push("Belum ada baris dengan Jumlah Dihapus terisi.");
  return hasil;
}
UNGGAH.hapusbuku = { judul: "Unggah usulan penghapusan buku", baca: bacaHapusBuku, rpc: "sp_penghapusan_unggah", muat: muatUsulan, sesudah: aturTab,
  ringkas: (h) => `${h.baru} usulan penghapusan buku`,
  hasil: (x) => `${x.baru} usulan penghapusan dikirim ke Wakasek Kurikulum`,
  tombol: (h) => `Kirim ${h.baris.length} usulan`,
  catatan: "Semua baris dikirim sekaligus ke Wakasek Kurikulum atas nama Anda, atau tidak sama sekali bila ada yang gagal. Stok belum berkurang sampai penghapusan diselesaikan.",
  kolom: (o) => [esc(o.kode), esc(o.judul), esc(namaLokasi({ jenis: o.lokasi_jenis, tempat: o.lokasi_tempat })), esc(o.jumlah), esc(ALASAN_HPS[o.alasan]), esc(o.keterangan)],
  kepala: ["Kode", "Judul", "Lokasi", "Jumlah", "Alasan", "Keterangan"] };

/* ================================================================ Kategori barang (Staf Sarpras) */
function formKategoriBarang() {
  const hitung = (k) => S.alat.filter((a) => a.kategori === k).length;
  const baris = (k) => `<tr data-k="${esc(k.kode)}"><td class="kode">${esc(k.kode)}</td><td><input class="kb-nama" value="${esc(k.nama)}" maxlength="60" required aria-label="Nama kategori ${esc(k.kode)}"></td>
    <td><select class="kb-gol" aria-label="Golongan ${esc(k.kode)}">${opsi([["sarana", "Sarana"], ["alat", "Alat"]], k.golongan)}</select></td><td class="n">${bil(hitung(k.kode))}</td>
    <td>${!hitung(k.kode) && k.kode !== "BK" ? `<button class="tombol kecil" type="button" data-kbhapus="${esc(k.kode)}">Hapus</button>` : ""}</td></tr>`;
  dialog({ judul: "Kategori barang", isi: `<p class="sub">Kode ikut masuk ke kode inventaris, jadi tidak bisa diubah. Nama dan golongan boleh diubah.</p>
    <div class="gulir" style="max-height:340px"><table><thead><tr><th>Kode</th><th>Nama</th><th>Golongan</th><th class="n">Barang</th><th></th></tr></thead><tbody>${S.kategori.map(baris).join("")}</tbody></table></div>
    <h3>Tambah kategori</h3><div class="isian-grid"><label class="f" for="kb-kode">Kode (1–3 huruf)<input id="kb-kode" maxlength="3" placeholder="mis. T"></label><label class="f" for="kb-nama">Nama<input id="kb-nama" maxlength="60" placeholder="mis. Taman"></label>
      <label class="f" for="kb-gol">Golongan<select id="kb-gol">${opsi([["alat", "Alat"], ["sarana", "Sarana"]], "alat")}</select></label></div>`,
    kaki: kakiSimpan("Simpan"),
    onSimpan: async () => {
      const ubahan = [...$("dlg-isi").querySelectorAll("tr[data-k]")].map((tr) => ({ kode: tr.dataset.k, nama: tr.querySelector(".kb-nama").value.trim(), golongan: tr.querySelector(".kb-gol").value }))
        .filter((x) => { const k = katOf(x.kode); return k.nama !== x.nama || k.golongan !== x.golongan; });
      const kode = $("kb-kode").value.trim(), nama = $("kb-nama").value.trim();
      if (!!kode !== !!nama) throw new Error("Isi kode dan nama untuk menambah kategori.");
      await sibuk(async () => {
        let h = null;
        for (const x of ubahan) h = await rpc("sp_kategori_simpan", { p_pin: S.pin, p_k: x });
        if (kode) h = await rpc("sp_kategori_simpan", { p_pin: S.pin, p_k: { kode, nama, golongan: $("kb-gol").value, baru: true } });
        if (h) S.kategori = h;
      });
      tutupDialog(); segarkan(); toast("Kategori tersimpan");
    } });
  $("dlg-isi").onclick = async (e) => {
    const t = e.target.closest("[data-kbhapus]"); if (!t) return;
    try { S.kategori = await sibuk(() => rpc("sp_kategori_hapus", { p_pin: S.pin, p_kode: t.dataset.kbhapus })); formKategoriBarang(); toast("Kategori dihapus"); }
    catch (err) { $("dlg-galat").textContent = err.message; $("dlg-galat").hidden = false; }
  };
}
