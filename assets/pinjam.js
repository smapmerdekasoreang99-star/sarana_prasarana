/* Perpustakaan Tahap B (2 Nov 2026): peminjaman. Lihat RENCANA_PERPUSTAKAAN.md.
   Petugas: menu Pinjam & Kembali (ACC permintaan HP, pinjamkan di meja, terima kembali, unduh berkop).
   Siswa: ?pinjam atau ?b=<kode dari QR>, masuk dengan NISN, tanpa PIN.
   Set kelas atas nama guru, siswa yang mengambil ikut dicatat; pribadi paling banyak 3 buku, 7 hari; tanpa denda. Aturan diperiksa di server. */
"use strict";

const STATUS_PINJAM = { menunggu: ["Menunggu ACC", "c"], dipinjam: ["Dipinjam", "i"], kembali: ["Kembali", "b"], ditolak: ["Ditolak", "k"] };
const JENIS_PINJAM = { set_kelas: "Set kelas", pribadi: "Pribadi" };
Object.assign(S, { pinjam: [], refPinjam: null, waliKelas: [], pengingat: { kelas: [], terlambat: [] }, saringPinjam: { q: "", status: "berjalan", jenis: "" } });

const tglSingkat = (s) => s ? new Date(String(s).length === 10 ? s + "T00:00:00" : s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "";
const isoHari = (tambah = 0) => { const d = new Date(); d.setDate(d.getDate() + tambah); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const pilPinjam = (p) => p.terlambat > 0 ? `<span class="pil k">Terlambat ${p.terlambat} hari</span>` : `<span class="pil ${STATUS_PINJAM[p.status][1]}">${STATUS_PINJAM[p.status][0]}${p.status === "dipinjam" && p.jumlah_kembali ? ` · sisa ${p.sisa}` : ""}</span>`;
const peminjamTeks = (p) => p.jenis === "set_kelas" ? [p.nama_guru, p.nama_siswa ? "diambil " + p.nama_siswa : ""].filter(Boolean).join(" · ") : p.nama_siswa || "";

async function muatPinjam() {
  S.pengingat = (await rpc("sp_pinjam_pengingat", { p_pin: S.pin }).catch(() => null)) || { kelas: [], terlambat: [] };
  if (!aksesBuku()) { S.pinjam = []; return; }
  const [p, w] = await Promise.all([rpc("sp_pinjam_daftar", { p_pin: S.pin, p_dari: null }).catch(() => []), rpc("sp_pinjam_wali", { p_pin: S.pin }).catch(() => [])]);
  S.pinjam = p || []; S.waliKelas = w || [];
}
// WhatsApp terbuka dengan pesan terisi; pengirim tinggal menekan kirim. Tanpa nomor, pengirim memilih kontak sendiri.
function tautanWA(hp, teks) {
  const d = String(hp || "").replace(/\D/g, "").replace(/^0/, "62");
  return `https://wa.me/${d}?text=${encodeURIComponent(teks)}`;
}
function pesanWali(kelas, wali, daftar) {
  return `Yth. ${wali ? wali + ", " : ""}wali kelas ${kelas}. Pengingat Perpustakaan SMA Plus Merdeka, pinjaman buku yang terlambat dikembalikan:\n`
    + daftar.map((p, i) => `${i + 1}. ${p.jenis === "set_kelas" ? p.nama_guru + (p.nama_siswa ? " (diambil " + p.nama_siswa + ")" : "") : p.nama_siswa}: ${p.judul}, ${p.sisa} eksemplar, batas ${tglSingkat(p.batas)}`).join("\n")
    + "\nMohon dibantu mengingatkan. Terima kasih.";
}
async function segarPinjam() { await muatPerpus(); }

TAB.pinjam = () => {
  const s = S.saringPinjam;
  const minta = S.pinjam.filter((p) => p.status === "menunggu");
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Pinjam &amp; Kembali</h2><p class="sub">${bukuLiterasi() ? "Peminjaman buku Pojok Literasi." : "Set kelas atas nama guru, atau pribadi paling banyak 3 buku selama 7 hari."} Tidak ada denda; yang terlambat cukup diingatkan.</p></div>
      <div class="aksi"><button class="tombol" type="button" id="b-unduh-pinjam">${ikon("unduh")}Unduh</button><button class="tombol utama" type="button" id="b-pinjam-baru">${ikon("tambah")}Pinjamkan</button></div></div>
    <div class="ubin" id="pj-ringkas"></div>
    ${minta.length ? `<h3>Permintaan dari HP siswa</h3><p class="sub">Periksa bukunya di meja, lalu ACC.</p>
      <div class="gulir"><table><thead><tr><th>No.</th><th>Buku</th><th class="n">Jml</th><th>Peminjam</th><th>Kelas</th><th>Jenis</th><th>Diminta</th><th></th></tr></thead><tbody>
      ${minta.map((p) => `<tr><td class="kode">${p.nomor}</td><td class="nama-sel"><b>${esc(p.judul)}</b><p class="kecil">${esc(p.kode)}</p></td><td class="n">${p.jumlah}</td><td>${esc(p.jenis === "set_kelas" ? `${p.nama_siswa} untuk ${p.nama_guru}` : p.nama_siswa)}</td><td>${esc(p.kelas || "")}</td><td>${JENIS_PINJAM[p.jenis]}</td><td class="kecil">${esc(tgl(p.waktu_minta))}</td>
        <td style="white-space:nowrap"><button class="tombol utama kecil" type="button" data-acc="${p.id}">${ikon("centang")}ACC</button> <button class="tombol kecil" type="button" data-tolak="${p.id}">Tolak</button></td></tr>`).join("")}
      </tbody></table></div>` : ""}
    ${htmlTelatPerKelas()}
    <div class="saring">
      <label class="f cari" for="pj-q">Cari${ikon("cari")}<input type="search" id="pj-q" value="${esc(s.q)}" placeholder="Nama, kelas, judul, nomor"></label>
      <label class="f" for="pj-status">Tampilkan<select id="pj-status">${opsi([["berjalan", "Sedang dipinjam"], ["terlambat", "Terlambat"], ["kembali", "Sudah kembali"], ["semua", "Semua (60 hari)"]], s.status)}</select></label>
      <label class="f" for="pj-jenis">Jenis<select id="pj-jenis"><option value="">Semua</option>${opsi(Object.entries(JENIS_PINJAM), s.jenis)}</select></label>
    </div>
    <div id="pj-tabel"></div>
  </section>`;
};
function htmlTelatPerKelas() {
  const telat = S.pinjam.filter((p) => p.terlambat > 0);
  if (!telat.length) return "";
  const kelas = [...new Set(telat.map((p) => p.kelas || ""))].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
  return `<h3>Terlambat per kelas</h3><p class="sub">Wali kelas otomatis melihat daftar ini saat masuk dengan PIN-nya. Tombol di bawah membuka WhatsApp dengan pesan yang sudah terisi.</p>
    <div class="gulir"><table><thead><tr><th>Kelas</th><th>Wali kelas</th><th class="n">Pinjaman</th><th></th></tr></thead><tbody>${kelas.map((k) => {
      const d = telat.filter((p) => (p.kelas || "") === k), w = S.waliKelas.find((x) => x.kelas === k) || {};
      return `<tr><td>${esc(k || "—")}</td><td>${esc(w.nama || "—")}${w.nama && !w.no_hp ? `<p class="kecil">Nomor HP belum ada di Data Induk; pilih kontaknya di WhatsApp.</p>` : ""}</td><td class="n">${d.length}</td>
        <td style="white-space:nowrap"><a class="tombol kecil" target="_blank" rel="noopener" href="${esc(tautanWA(w.no_hp, pesanWali(k, w.nama, d)))}">Kirim ke wali kelas</a></td></tr>`; }).join("")}</tbody></table></div>`;
}
/* Menu Pengingat Buku: tampil otomatis untuk wali kelas dan guru yang punya pinjaman set kelas terlambat. */
TAB.pengingat = () => {
  const P = S.pengingat, saya = S.akses.id, kelas = P.terlambat.filter((p) => p.guru !== saya), milik = P.terlambat.filter((p) => p.guru === saya);
  const tabel = (d) => `<div class="gulir"><table><thead><tr><th>No.</th><th>Peminjam</th><th>Kelas</th><th>Judul buku</th><th class="n">Belum kembali</th><th>Batas</th><th>Terlambat</th></tr></thead><tbody>
    ${d.map((p) => `<tr><td class="kode">${p.nomor}</td><td class="nama-sel"><b>${esc(p.jenis === "set_kelas" ? p.nama_guru : p.nama_siswa)}</b>${p.jenis === "set_kelas" && p.nama_siswa ? `<p class="kecil">diambil ${esc(p.nama_siswa)}</p>` : ""}</td><td>${esc(p.kelas || "")}</td><td>${esc(p.judul)}</td><td class="n">${p.sisa}</td><td class="kecil">${esc(tglSingkat(p.batas))}</td><td><span class="pil k">${p.terlambat} hari</span></td></tr>`).join("")}</tbody></table></div>`;
  return `<section class="kartu"><div class="kepala-bagian"><div><h2>Pengingat Buku</h2><p class="sub">${(P.kelas || []).length ? `Wali kelas ${esc(P.kelas.join(", "))}. ` : ""}Pinjaman buku yang lewat batas kembali. Daftar ini diperbarui otomatis; baris hilang setelah pustakawan menerima bukunya.</p></div></div>
    ${P.terlambat.length ? "" : `<div class="kosong">${ikon("centang")}<span>Tidak ada buku yang terlambat.</span></div>`}
    ${milik.length ? `<h3>Atas nama Anda</h3>${tabel(milik)}` : ""}${kelas.length ? `<h3>Siswa dan kelas Anda</h3>${tabel(kelas)}<p class="kecil">Mohon ingatkan peminjamnya untuk mengembalikan buku ke perpustakaan. Tidak ada denda.</p>` : ""}</section>`;
};
function saringPinjam() {
  const { q, status, jenis } = S.saringPinjam, qq = kecil(q);
  return S.pinjam.filter((p) => p.status !== "menunggu" && (!jenis || p.jenis === jenis)
    && (status === "semua" || (status === "berjalan" && p.status === "dipinjam") || (status === "terlambat" && p.terlambat > 0) || (status === "kembali" && p.status === "kembali"))
    && (!qq || kecil([p.nomor, p.judul, p.kode, p.nama_siswa, p.nama_guru, p.kelas, p.keperluan].filter(Boolean).join(" ")).includes(qq)));
}
TAB.pinjam.sesudah = () => {
  const aktif = S.pinjam.filter((p) => p.status === "dipinjam"), telat = aktif.filter((p) => p.terlambat > 0), minta = S.pinjam.filter((p) => p.status === "menunggu");
  $("pj-ringkas").innerHTML = `<div class="${minta.length ? "c" : "b"}"><span class="lambang">${ikon("info")}</span><span><b>${minta.length}</b><span class="t">menunggu ACC</span></span></div>
    <div class="i"><span class="lambang">${ikon("buku")}</span><span><b>${bil(aktif.reduce((s, p) => s + p.sisa, 0))}</b><span class="t">eksemplar sedang dipinjam</span></span></div>
    <div class="${telat.length ? "k" : "b"}"><span class="lambang">${ikon(telat.length ? "awas" : "centang")}</span><span><b>${telat.length}</b><span class="t">pinjaman terlambat</span></span></div>`;
  const isi = () => {
    const d = saringPinjam();
    $("pj-tabel").innerHTML = d.length ? `<div class="gulir" style="max-height:640px"><table><thead><tr><th>No.</th><th>Peminjam</th><th>Kelas</th><th>Judul buku</th><th class="n">Jml</th><th>Pinjam</th><th>Batas</th><th>Kembali</th><th>Status</th><th></th></tr></thead><tbody>
      ${d.map((p) => `<tr><td class="kode">${p.nomor}</td><td class="nama-sel"><b>${esc(p.jenis === "set_kelas" ? p.nama_guru : p.nama_siswa)}</b>${p.jenis === "set_kelas" && p.nama_siswa ? `<p class="kecil">diambil ${esc(p.nama_siswa)}</p>` : ""}${p.keperluan ? `<p class="kecil">${esc(p.keperluan)}</p>` : ""}</td><td>${esc(p.kelas || "")}</td>
        <td>${esc(p.judul)}${p.sumber === "literasi" ? `<p class="kecil">Pojok Literasi</p>` : ""}</td><td class="n">${p.jumlah}</td><td class="kecil">${esc(tglSingkat(p.waktu_pinjam))}</td><td class="kecil">${esc(tglSingkat(p.batas))}</td><td class="kecil">${esc(tglSingkat(p.waktu_kembali))}</td><td>${pilPinjam(p)}</td>
        <td style="white-space:nowrap">${p.status === "dipinjam" ? `<button class="tombol kecil" type="button" data-kembali="${p.id}">Terima kembali</button>${p.terlambat > 0 ? ` <button class="tombol kecil" type="button" data-ingat="${p.id}">Salin pengingat</button>` : ""}` : ""}</td></tr>`).join("")}
      </tbody></table></div>`
      : `<div class="kosong">${ikon("buku")}<span>Tidak ada pinjaman yang cocok.</span></div>`;
  };
  isi();
  [["pj-q", "q"], ["pj-status", "status"], ["pj-jenis", "jenis"]].forEach(([id, k]) => $(id).addEventListener("input", (e) => { S.saringPinjam[k] = e.target.value; isi(); }));
  $("isi").addEventListener("click", klikPinjam);
  $("b-pinjam-baru").onclick = formPinjam;
  $("b-unduh-pinjam").onclick = formUnduhPinjam;
};
// #isi dipakai semua tab dan tidak ikut digambar ulang; fungsi yang sama hanya terpasang sekali, dan tab lain dilewati.
async function klikPinjam(e) {
  if (S.tab !== "pinjam") return;
  const t = e.target.closest("[data-acc],[data-tolak],[data-kembali],[data-ingat]");
  if (!t) return;
  const cari = (id) => S.pinjam.find((p) => p.id === +id);
  if (t.dataset.acc) {
    try {
      const h = await sibuk(async () => { const x = await rpc("sp_pinjam_acc", { p_pin: S.pin, p_id: +t.dataset.acc }); await segarPinjam(); return x; });
      segarkan(); toast(`ACC: ${h.judul}, batas kembali ${tglSingkat(h.batas)}`);
    } catch (err) { toast(err.message); }
  } else if (t.dataset.tolak) formTolakPinjam(cari(t.dataset.tolak));
  else if (t.dataset.kembali) formKembali(cari(t.dataset.kembali));
  else if (t.dataset.ingat) {
    const p = cari(t.dataset.ingat);
    const teks = `Pengingat Perpustakaan SMA Plus Merdeka: buku "${p.judul}" (${p.sisa} eksemplar, pinjaman no. ${p.nomor}${p.kelas ? ", kelas " + p.kelas : ""}) atas nama ${p.jenis === "set_kelas" ? p.nama_guru : p.nama_siswa} seharusnya kembali ${tglSingkat(p.batas)}. Mohon segera dikembalikan. Terima kasih.`;
    try { await navigator.clipboard.writeText(teks); toast("Pengingat tersalin. Tempel di WhatsApp."); } catch (err) { dialog({ judul: "Salin pengingat", isi: `<p>${esc(teks)}</p>`, kaki: `<button class="tombol" value="batal" formnovalidate>Tutup</button>` }); }
  }
}
function formKembali(p) {
  dialog({ atas: "Pinjaman no. " + p.nomor, judul: p.judul, isi: `
    <dl class="dl"><dt>Peminjam</dt><dd>${esc(peminjamTeks(p))}</dd><dt>Kelas</dt><dd>${esc(p.kelas || "—")}</dd><dt>Dipinjam</dt><dd>${p.jumlah} eksemplar${p.jumlah_kembali ? `, sudah kembali ${p.jumlah_kembali}` : ""}</dd><dt>Batas</dt><dd>${esc(tglSingkat(p.batas))}</dd></dl>
    <label class="f" for="k-jumlah">Jumlah yang kembali<input id="k-jumlah" type="number" min="1" max="${p.sisa}" value="${p.sisa}" required></label>
    <p class="kecil">Bila belum semua kembali, sisanya tetap tercatat sebagai dipinjam.</p>`,
    kaki: kakiSimpan("Terima"),
    onSimpan: async () => {
      const n = +$("k-jumlah").value;
      await sibuk(async () => { await rpc("sp_pinjam_kembali", { p_pin: S.pin, p_id: p.id, p_jumlah: n }); await segarPinjam(); });
      tutupDialog(); segarkan(); toast(n === p.sisa ? "Semua sudah kembali" : `${n} diterima, sisa ${p.sisa - n}`);
    } });
}
function formTolakPinjam(p) {
  dialog({ atas: "Permintaan no. " + p.nomor, judul: "Tolak permintaan", isi: `<p>${esc(p.judul)} · ${esc(p.nama_siswa || "")}</p>
    <label class="f" for="t-alasan">Alasan (terlihat di HP siswa)<input id="t-alasan" maxlength="200" required placeholder="mis. Bukunya sedang diperbaiki"></label>`,
    kaki: kakiSimpan("Tolak"),
    onSimpan: async () => {
      await sibuk(async () => { await rpc("sp_pinjam_tolak", { p_pin: S.pin, p_id: p.id, p_alasan: $("t-alasan").value }); await segarPinjam(); });
      tutupDialog(); segarkan(); toast("Permintaan ditolak");
    } });
}
const labelBuku = (b) => `${b.kode} · ${b.judul}${b.tingkat ? " · kelas " + b.tingkat : ""}`;
const labelSiswa = (s) => `${s.nama} · ${s.kelas} · ${s.nisn}`;
async function formPinjam() {
  if (!S.refPinjam) {
    try { S.refPinjam = await sibuk(() => rpc("sp_pinjam_referensi", { p_pin: S.pin })); } catch (e) { return toast(e.message); }
  }
  const R = S.refPinjam, daftar = bukuTampil();
  const kelas = [...new Set(R.siswa.map((s) => s.kelas))].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
  dialog({ judul: "Pinjamkan buku", isi: `<div class="isian-grid">
      <label class="f" for="m-jenis">Jenis<select id="m-jenis">${opsi([["set_kelas", "Set kelas (atas nama guru)"], ["pribadi", "Pribadi siswa"]], "set_kelas")}</select></label>
      <label class="f" for="m-batas">Batas kembali<input id="m-batas" type="date" required value="${isoHari(1)}"></label>
      <label class="f lebar" for="m-buku">Buku<input id="m-buku" list="m-daftar-buku" required placeholder="Ketik judul, mapel, atau pindai kode" autocomplete="off"></label>
      <p class="kecil lebar" id="m-info"></p>
      <label class="f" for="m-jumlah">Jumlah<input id="m-jumlah" type="number" min="1" value="20" required></label>
      <label class="f m-sumber" for="m-sumber" hidden>Ambil dari<select id="m-sumber">${opsi([["perpustakaan", "Perpustakaan"], ["literasi", "Pojok Literasi"]], "perpustakaan")}</select></label>
      <label class="f m-kelas" for="m-guru">Atas nama guru<select id="m-guru" required><option value="">Pilih…</option>${opsi(R.guru.map((g) => [g.id, g.nama]), "")}</select></label>
      <label class="f lebar" for="m-siswa"><span id="m-siswa-label">Siswa yang mengambil (boleh kosong bila guru sendiri)</span><input id="m-siswa" list="m-daftar-siswa" placeholder="Ketik nama siswa atau kelas" autocomplete="off"></label>
      <label class="f m-kelas" for="m-kelas">Untuk kelas<select id="m-kelas"><option value="">Mengikuti kelas siswa</option>${opsi(kelas.map((k) => [k, k]), "")}</select></label>
      <label class="f m-kelas" for="m-perlu">Keperluan<input id="m-perlu" maxlength="120" placeholder="mis. Kimia jam ke-3"></label>
    </div>
    <datalist id="m-daftar-buku">${daftar.map((b) => `<option value="${esc(labelBuku(b))}">`).join("")}</datalist>
    <datalist id="m-daftar-siswa">${R.siswa.map((s) => `<option value="${esc(labelSiswa(s))}">`).join("")}</datalist>`,
    kaki: kakiSimpan("Pinjamkan"),
    onSimpan: async () => {
      const m = $("m-buku").value.trim().toUpperCase().match(/^B-\d+/), b = m && S.buku.find((x) => x.kode === m[0]);
      if (!b) throw new Error("Pilih buku dari daftar, atau ketik kode bukunya (mis. B-0003).");
      const sx = $("m-siswa").value.trim(), s = sx ? R.siswa.find((x) => sx === labelSiswa(x) || sx === x.nisn) : null;
      if (sx && !s) throw new Error("Siswa tidak dikenal. Pilih dari daftar, atau kosongkan.");
      const set = $("m-jenis").value === "set_kelas";
      const h = await sibuk(async () => {
        const x = await rpc("sp_pinjam_simpan", { p_pin: S.pin, p_p: { jenis: $("m-jenis").value, buku: b.id, sumber: $("m-sumber").value, jumlah: $("m-jumlah").value, batas: $("m-batas").value,
          nisn: s ? s.nisn : "", guru: set ? $("m-guru").value : "", kelas: set ? $("m-kelas").value : "", keperluan: set ? $("m-perlu").value : "" } });
        await segarPinjam();
        return x;
      });
      tutupDialog(); segarkan(); toast(`Tercatat no. ${h.nomor}: ${h.jumlah} × ${h.judul}`);
    } });
  const perJenis = () => {
    const set = $("m-jenis").value === "set_kelas";
    document.querySelectorAll(".m-kelas").forEach((x) => { x.hidden = !set; });
    $("m-guru").required = set; $("m-siswa").required = !set;
    $("m-siswa-label").textContent = set ? "Siswa yang mengambil (boleh kosong bila guru sendiri)" : "Siswa";
    $("m-jumlah").value = set ? 20 : 1; $("m-batas").value = isoHari(set ? 1 : 7);
  };
  const perBuku = () => {
    const m = $("m-buku").value.trim().toUpperCase().match(/^B-\d+/), b = m && S.buku.find((x) => x.kode === m[0]);
    const ganda = b && bukuSemua() && b.tersedia_literasi > 0;
    document.querySelectorAll(".m-sumber").forEach((x) => { x.hidden = !ganda; });
    if (!ganda) $("m-sumber").value = "perpustakaan";
    $("m-info").textContent = b ? `Tersedia ${bukuLiterasi() ? b.tersedia_literasi : b.tersedia} eksemplar di ${bukuLiterasi() ? "Pojok Literasi" : "Perpustakaan"}${ganda ? `, ${b.tersedia_literasi} di Pojok Literasi` : ""}. Dimiliki ${b.jumlah}.` : "";
  };
  $("m-jenis").onchange = perJenis;
  $("m-buku").addEventListener("input", perBuku);
  perJenis();
}
function formUnduhPinjam() {
  dialog({ judul: "Unduh buku peminjaman", isi: `<div class="isian-grid">
      <label class="f" for="u-dari">Dari tanggal<input id="u-dari" type="date" required value="${isoHari(0).slice(0, 8)}01"></label>
      <label class="f" for="u-sampai">Sampai tanggal<input id="u-sampai" type="date" required value="${isoHari(0)}"></label></div>
    <p class="kecil">Berkop Profil Dokumen. Kolomnya mengikuti buku peminjaman tulis tangan, ditambah guru dan batas kembali.</p>`,
    kaki: kakiSimpan("Unduh"),
    onSimpan: async () => {
      const dari = $("u-dari").value, sampai = $("u-sampai").value;
      await sibuk(async () => {
        const semua = await rpc("sp_pinjam_daftar", { p_pin: S.pin, p_dari: dari });
        const d = semua.filter((p) => ["dipinjam", "kembali"].includes(p.status) && (p.waktu_pinjam || p.waktu_minta).slice(0, 10) >= dari && (p.waktu_pinjam || p.waktu_minta).slice(0, 10) <= sampai).sort((a, b) => a.nomor - b.nomor);
        if (!d.length) throw new Error("Tidak ada pinjaman pada rentang itu.");
        const wb = new (await muatExcelJS()).Workbook();
        await lembarBerkop(wb, { nama: "Peminjaman", judul: bukuLiterasi() ? "Buku Peminjaman Pojok Literasi" : "Buku Peminjaman Perpustakaan", sub: `${tglSingkat(dari)} s.d. ${tglSingkat(sampai)}  ·  ${d.length} pinjaman`,
          kolom: [{ judul: "No. Pinjam", lebar: 8, tengah: true }, { judul: "Nama", lebar: 26 }, { judul: "Kelas", lebar: 7, tengah: true }, { judul: "Guru", lebar: 26 }, { judul: "Judul Buku", lebar: 32 }, { judul: "Jumlah", lebar: 8, tengah: true },
            { judul: "Tanggal Pinjam", lebar: 13 }, { judul: "Batas Kembali", lebar: 13 }, { judul: "Tanggal Kembali", lebar: 13 }, { judul: "Status", lebar: 14 }],
          baris: d.map((p) => [p.nomor, p.nama_siswa || "", p.kelas || "", p.nama_guru || "", p.judul, p.jumlah, tglSingkat(p.waktu_pinjam), tglSingkat(p.batas), tglSingkat(p.waktu_kembali), p.terlambat > 0 ? `Terlambat ${p.terlambat} hari` : STATUS_PINJAM[p.status][0]]),
          blok: penandaTanganBuku() });
        await simpanBuku(wb, "Buku_Peminjaman");
      });
      tutupDialog();
    } });
}

/* ================================================================ halaman siswa: ?pinjam atau ?b=<kode> */
async function halamanSiswa(kodeAwal) {
  aturPanduan(["siswa"]);
  const el = $("layar-publik");
  el.hidden = false;
  const formNisn = (galat = "") => {
    el.innerHTML = `<section class="kartu kartu-masuk"><img src="assets/ikon-192.png" alt="" class="ikon-besar"><h1>Pinjam Buku</h1><p class="sub">Masuk dengan NISN, sama seperti Matematika Dasar dan English Reading.</p>
      <form id="form-nisn" class="form-pin" autocomplete="off"><label class="f" for="nisn">NISN<input id="nisn" inputmode="numeric" required placeholder="Ketik NISN"></label>
      <button class="tombol utama besar" type="submit">${ikon("masuk")}Masuk</button></form>${galat ? `<p class="galat" role="alert">${esc(galat)}</p>` : ""}<p class="kecil">Guru atau petugas? <a href="${esc(location.pathname)}">Masuk dengan PIN</a></p></section>`;
    $("nisn").focus();
    $("form-nisn").onsubmit = (e) => { e.preventDefault(); masukSiswa($("nisn").value.trim()); };
  };
  const masukSiswa = async (nisn) => {
    try {
      const d = await sibuk(() => rpc("sp_siswa_perpus", { p_nisn: nisn }));
      ssSet("sp_nisn", nisn);
      gambar(d);
    } catch (e) { ssSet("sp_nisn", null); formNisn(e.message); }
  };
  const segarSiswa = () => masukSiswa(ssGet("sp_nisn"));
  const kartuHasil = (b) => {
    const ada = (b.tersedia || 0) + (b.tersedia_literasi || 0);
    return `<div class="siswa-buku"><div><b>${esc(b.judul)}</b><p class="kecil">${esc([b.mapel, b.tingkat ? "Kelas " + b.tingkat : "", b.penerbit].filter(Boolean).join(" · "))}</p>
      <span class="pil ${ada ? "b" : "c"}">${ada ? `Tersedia ${ada}` : "Sedang dipinjam semua"}</span></div>${ada ? `<button class="tombol utama" type="button" data-pinjam="${esc(b.kode)}" data-ada="${ada}" data-judul="${esc(b.judul)}">Pinjam</button>` : ""}</div>`;
  };
  const gambar = (d) => {
    const lembar = (p) => `<div class="siswa-buku"><div><b>${esc(p.judul)}</b><p class="kecil">${p.jenis === "set_kelas" ? `Set kelas · ${p.sisa} buku` : `${p.sisa} buku`}${p.status === "dipinjam" ? ` · kembali ${esc(tglSingkat(p.batas))}` : ""}</p>
      ${p.terlambat > 0 ? `<span class="pil k">Terlambat ${p.terlambat} hari, mohon segera dikembalikan</span>` : `<span class="pil ${STATUS_PINJAM[p.status][1]}">${p.status === "menunggu" ? "Tunjukkan buku ke pustakawan untuk di-ACC" : STATUS_PINJAM[p.status][0]}</span>`}
      ${p.alasan_tolak ? `<p class="kecil">Alasan: ${esc(p.alasan_tolak)}</p>` : ""}</div>${p.status === "menunggu" ? `<button class="tombol" type="button" data-batal="${p.id}">Batalkan</button>` : ""}</div>`;
    el.innerHTML = `<section class="kartu"><div class="kepala-bagian"><div><h2>${esc(d.nama)}</h2><p class="sub">Kelas ${esc(d.kelas)}</p></div><div class="aksi"><button class="tombol" type="button" id="s-keluar">${ikon("keluar")}Keluar</button></div></div>
        <div id="s-qr"></div></section>
      <section class="kartu"><h3>Pinjamanku</h3>${d.pinjaman.length ? d.pinjaman.map(lembar).join("") : `<p class="sub">Belum ada buku yang dipinjam.</p>`}</section>
      <section class="kartu"><h3>Cari buku</h3><label class="f cari" for="s-q">${ikon("cari")}<input type="search" id="s-q" placeholder="Judul, mapel, atau penulis"></label><div id="s-hasil"></div></section>`;
    $("s-keluar").onclick = () => { ssSet("sp_nisn", null); location.href = location.pathname + "?pinjam"; };
    let jeda;
    $("s-q").addEventListener("input", (e) => { clearTimeout(jeda); jeda = setTimeout(async () => {
      const q = e.target.value.trim();
      if (q.length < 2) { $("s-hasil").innerHTML = ""; return; }
      try { const h = await rpc("sp_buku_cari_publik", { p_q: q }); $("s-hasil").innerHTML = h.length ? h.map(kartuHasil).join("") : `<p class="sub">Tidak ada buku yang cocok.</p>`; }
      catch (err) { $("s-hasil").innerHTML = `<p class="galat">${esc(err.message)}</p>`; }
    }, 300); });
    el.onclick = async (e) => {
      const t = e.target.closest("[data-pinjam],[data-batal]");
      if (!t) return;
      if (t.dataset.batal) {
        try { await sibuk(() => rpc("sp_pinjam_batal", { p_nisn: d.nisn, p_id: +t.dataset.batal })); toast("Permintaan dibatalkan"); await segarSiswa(); } catch (err) { toast(err.message); }
      } else formMinta(d, t.dataset.pinjam, t.dataset.judul, +t.dataset.ada);
    };
    if (kodeAwal) {
      rpc("sp_buku_publik", { p_kode: kodeAwal }).then((b) => { if ($("s-qr")) $("s-qr").innerHTML = b ? `<h3>Buku yang dipindai</h3>${kartuHasil(b)}` : `<p class="catatan awas">${ikon("awas")}<span>Kode ${esc(kodeAwal)} tidak ditemukan di katalog.</span></p>`; }).catch(() => {});
    }
  };
  const formMinta = (d, kode, judul, ada) => {
    dialog({ atas: kode, judul, isi: `<div class="isian-grid">
        <label class="f lebar" for="q-jenis">Untuk<select id="q-jenis">${opsi([["pribadi", "Saya sendiri (paling banyak 3 buku, 7 hari)"], ["set_kelas", `Kelas ${d.kelas} (atas nama guru)`]], "pribadi")}</select></label>
        <label class="f" for="q-jumlah">Jumlah<input id="q-jumlah" type="number" min="1" max="${ada}" value="1" required></label>
        <label class="f" for="q-guru" hidden>Guru yang meminta<select id="q-guru"><option value="">Pilih…</option>${opsi(d.guru.map((g) => [g.id, g.nama]), "")}</select></label>
      </div><p class="kecil">Sesudah mengirim, tunjukkan bukunya ke pustakawan untuk di-ACC.</p>`,
      kaki: kakiSimpan("Kirim"),
      onSimpan: async () => {
        const set = $("q-jenis").value === "set_kelas";
        if (set && !$("q-guru").value) throw new Error("Pilih guru yang meminta buku ini.");
        await sibuk(() => rpc("sp_pinjam_minta", { p_nisn: d.nisn, p_kode: kode, p_jenis: $("q-jenis").value, p_jumlah: +$("q-jumlah").value, p_guru: set ? $("q-guru").value : null }));
        tutupDialog(); toast("Terkirim. Tunjukkan bukunya ke pustakawan."); kodeAwal = null; await segarSiswa();
      } });
    $("q-jenis").onchange = (e) => { document.querySelector('[for="q-guru"]').hidden = e.target.value !== "set_kelas"; };
  };
  const tersimpan = ssGet("sp_nisn");
  if (tersimpan) await masukSiswa(tersimpan); else formNisn();
}
