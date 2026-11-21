/* Usulan Perbaikan sarana prasarana (9 Nov 2026). Lihat RENCANA_SARANA_PRASARANA.md bagian 11.
   Sesuai SOP: aplikasi hanya PENGAJUAN. Diajukan wali kelas (ruang kelas rombelnya), penanggung jawab ruang (ruangnya), atau
   Staf Sarpras → ditinjau Staf Sarpras (prioritas, gabung, tolak) → diketahui Kepala Sekolah → bendahara (di luar aplikasi).
   Sesudah diketahui, Staf Sarpras menandai belum/sudah diperbaiki. Siswa belum boleh melapor. Hak diperiksa di server. */
"use strict";
Object.assign(S, { perbaikan: [], saringPbk: "aktif", ruangPbk: "" });
const DAMPAK = { bahaya: ["Membahayakan", "k"], kbm: ["Mengganggu KBM", "c"], ringan: ["Ringan", "i"] };
const PRIORITAS = { segera: "Segera", pekan: "Pekan ini", bulan: "Bulan ini", anggaran: "Dianggarkan" };
const ST_PBK = { diajukan: ["Menunggu Staf Sarpras", "c"], ditinjau: ["Menunggu Kepala Sekolah", "i"], diketahui: ["Diketahui Kepala Sekolah", "b"], ditolak: ["Ditolak", "k"], digabung: ["Digabung", "k"] };
const BAGIAN_BANGUNAN = ["Atap/plafon", "Dinding/lantai", "Pintu/jendela/kunci", "Listrik/lampu/stop kontak", "Air/toilet/saluran", "Lainnya"];
const stafPbk = () => admin();
const kepalaPbk = () => punyaJabatan("kepala_sekolah");
const waliSaya = () => (S.akses && S.akses.wali) || [];
const ruangRombel = (kode) => S.ruang.find((r) => r.rombel === kode && r.aktif);
const bisaUsulPbk = () => stafPbk() || ruangSaya().length > 0 || waliSaya().length > 0;
const bolehPbk = () => bisaUsulPbk() || kepalaPbk();
const aksiPbk = (p) => (p.status === "diajukan" && stafPbk()) || (p.status === "ditinjau" && kepalaPbk());
const tempatPbk = (p) => [p.ruang ? namaRuang(p.ruang) : "", p.rombel ? "Kelas " + p.rombel : ""].filter(Boolean).join(" · ") || "—";
const hariSejak = (s) => s ? Math.max(0, Math.floor((Date.now() - new Date(s).getTime()) / 86400000)) : 0;
const belumPbk = (p) => p.status === "diketahui" && p.perbaikan === "belum";
/* Saran urutan: prioritas Sarpras bila sudah ada; bila belum, dari dampak. Lalu skor: dampak, siswa terdampak, lama menunggu, laporan ganda. */
const RANK = { segera: 1, pekan: 2, bulan: 3, anggaran: 4 }, RANK_DAMPAK = { bahaya: 1, kbm: 2, ringan: 3 };
const skorPbk = (p) => ({ bahaya: 300, kbm: 200, ringan: 100 }[p.dampak] + Math.min(p.jumlah_siswa || 0, 40) + Math.min(hariSejak(p.dibuat), 60) + 20 * (p.dukungan || 0));
const urutPbk = (a, b) => (RANK[a.prioritas] || RANK_DAMPAK[a.dampak]) - (RANK[b.prioritas] || RANK_DAMPAK[b.dampak]) || skorPbk(b) - skorPbk(a);

async function muatPerbaikan() { S.perbaikan = (await rpc("sp_perbaikan_daftar", { p_pin: S.pin }).catch(() => null)) || []; }
async function selesaiPbk(pesan) { await sibuk(muatPerbaikan); aturTab(); segarkan(); if (pesan) toast(pesan); }

const SARING_PBK = [["aktif", "Yang masih berjalan"], ["menunggu", "Menunggu tinjauan/Kepala Sekolah"], ["belum", "Belum diperbaiki"], ["sudah", "Sudah diperbaiki"], ["tolak", "Ditolak/digabung"], ["semua", "Semua"]];
const cocokSaring = (p, s) => ({ aktif: ["diajukan", "ditinjau"].includes(p.status) || belumPbk(p), menunggu: ["diajukan", "ditinjau"].includes(p.status), belum: belumPbk(p),
  sudah: p.perbaikan === "sudah", tolak: ["ditolak", "digabung"].includes(p.status), semua: true }[s]);
const kunciTempat = (p) => p.ruang || "k:" + p.rombel;
const tampilPbk = () => S.perbaikan.filter((p) => cocokSaring(p, S.saringPbk) && (!S.ruangPbk || kunciTempat(p) === S.ruangPbk)).sort(urutPbk);

TAB.perbaikan = () => {
  const d = tampilPbk(), n = (f) => S.perbaikan.filter(f).length;
  const tempat = [...new Map(S.perbaikan.map((p) => [kunciTempat(p), tempatPbk(p)])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Usulan Perbaikan</h2><p class="sub">Kerusakan sarana dan prasarana diajukan wali kelas atau penanggung jawab ruang, ditinjau Staf Sarana Prasarana, lalu diketahui Kepala Sekolah. Pengerjaan dan pembayaran lewat bendahara sesuai keuangan sekolah.</p></div>
      <div class="aksi"><button class="tombol" type="button" data-alur="perbaikan">${ikon("info")}Lihat alur</button><button class="tombol" type="button" id="pb-unduh">${ikon("unduh")}Unduh</button>${bisaUsulPbk() ? `<button class="tombol utama" type="button" id="pb-baru">${ikon("tambah")}Ajukan perbaikan</button>` : ""}</div></div>
    <div class="ubin"><div class="c"><span class="lambang">${ikon("info")}</span><span><b>${n((p) => p.status === "diajukan")}</b><span class="t">menunggu Staf Sarpras</span></span></div>
      <div class="i"><span class="lambang">${ikon("orang")}</span><span><b>${n((p) => p.status === "ditinjau")}</b><span class="t">menunggu Kepala Sekolah</span></span></div>
      <div class="k"><span class="lambang">${ikon("rusak")}</span><span><b>${n(belumPbk)}</b><span class="t">belum diperbaiki</span></span></div>
      <div class="b"><span class="lambang">${ikon("centang")}</span><span><b>${n((p) => p.perbaikan === "sudah")}</b><span class="t">sudah diperbaiki</span></span></div></div>
    <div class="saring"><label class="f" for="pb-saring">Tampilkan<select id="pb-saring">${opsi(SARING_PBK, S.saringPbk)}</select></label>
      <label class="f" for="pb-ruang">Ruang/kelas<select id="pb-ruang"><option value="">Semua</option>${opsi(tempat, S.ruangPbk)}</select></label></div>
    <p class="kecil">Urutan: prioritas dari Staf Sarpras; yang belum ditinjau diurutkan menurut dampak, banyaknya siswa terdampak, lama menunggu, dan laporan yang digabung.</p>
    ${d.length ? `<div class="gulir"><table><thead><tr><th>Ruang/kelas</th><th>Kerusakan</th><th>Dampak</th><th>Prioritas</th><th>Status</th><th></th></tr></thead><tbody>${d.map((p) => `<tr>
      <td class="nama-sel"><b>${esc(tempatPbk(p))}</b><p class="kecil">${p.jumlah_siswa ? `${p.jumlah_siswa} siswa · ` : ""}${esc(p.oleh)} · ${esc(tglSingkat(p.dibuat))}</p></td>
      <td><b>${esc(p.nama)}</b>${p.kode ? ` <span class="kode">${esc(p.kode)}</span>` : ""}<p class="kecil">${esc(p.uraian)}</p>${tombolFotoPbk(p)}${p.dukungan ? ` <span class="pil c">+${p.dukungan} laporan sama</span>` : ""}</td>
      <td><span class="pil ${DAMPAK[p.dampak][1]}">${DAMPAK[p.dampak][0]}</span></td>
      <td>${p.prioritas ? `<b>${PRIORITAS[p.prioritas]}</b>` : `<span class="kecil">belum</span>`}${p.catatan ? `<p class="tanggapan"><b>Tanggapan Sarpras${p.catatan_waktu ? ", " + esc(tglSingkat(p.catatan_waktu)) : ""}</b>${esc(p.catatan)}</p>` : ""}</td>
      <td>${statusPbk(p)}<button class="tautan-alur" type="button" data-alur="perbaikan" data-id="${p.id}">Posisi di alur</button></td>
      <td style="white-space:nowrap">${tombolPbk(p)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div class="kosong">${ikon("centang")}<span>${S.perbaikan.length ? "Tidak ada usulan di sini." : "Belum ada usulan perbaikan."}</span></div>`}
  </section>`;
};
/* Foto (21 Nov 2026): foto keadaan dari pengusul (sebelum) dan foto hasil dari Staf Sarpras (sesudah, tidak wajib). */
function tombolFotoPbk(p) {
  const a = p.n_foto || 0, b = p.n_foto_sesudah || 0;
  if (!a && !b) return "";
  const label = a && b ? "Foto sebelum & sesudah" : b ? `Foto hasil (${b})` : `Foto (${a})`;
  return `<button class="tombol kecil" type="button" data-pbfoto="${p.id}">${ikon("gambar")}${label}</button>`;
}
function statusPbk(p) {
  const st = `<span class="pil ${ST_PBK[p.status][1]}">${ST_PBK[p.status][0]}</span>`;
  const jejak = [p.tinjau_oleh && p.status !== "digabung" ? `Ditinjau ${p.tinjau_oleh}` : "", p.tahu_oleh ? `Diketahui ${p.tahu_oleh}` : "",
    p.status === "digabung" ? `Digabung ke usulan lain oleh ${p.tinjau_oleh || "Staf Sarpras"}` : "", p.tolak_oleh ? `Ditolak ${p.tolak_oleh}: ${p.alasan_tolak || ""}` : ""].filter(Boolean).join(" · ");
  const perb = p.status !== "diketahui" ? "" : p.perbaikan === "sudah"
    ? `<span class="pil b">Sudah diperbaiki ${esc(tglSingkat(p.diperbaiki_tgl))}</span>${p.diperbaiki_ket ? `<p class="kecil">${esc(p.diperbaiki_ket)}</p>` : ""}`
    : `<span class="pil k">Belum diperbaiki · ${hariSejak(p.tahu_waktu)} hari</span>`;
  const baru = (S.pbBaru || []).includes(p.id) ? ` <span class="pil c">Baru</span>` : "";
  return `${st}${baru}${perb}${jejak ? `<p class="kecil">${esc(jejak)}</p>` : ""}${p.status === "diajukan" ? `<p class="kecil">Menunggu ${hariSejak(p.dibuat)} hari</p>` : ""}`;
}
function tombolPbk(p) {
  const t = [], b = (aksi, label, utama) => `<button class="tombol${utama ? " utama" : ""} kecil" type="button" data-pb="${aksi}" data-id="${p.id}">${label}</button>`;
  if (p.status === "diajukan" && stafPbk()) t.push(b("tinjau", "Tinjau", true), b("gabung", "Gabung"), b("tolak", "Tolak"));
  if (p.status === "ditinjau" && kepalaPbk()) t.push(b("tahu", "Mengetahui", true), b("tolak", "Tolak"));
  if (["ditinjau", "diketahui"].includes(p.status) && stafPbk() && p.perbaikan === "belum") t.push(b("prioritas", "Ubah prioritas/tanggapan"));
  if (belumPbk(p) && stafPbk()) t.push(b("diperbaiki", "Sudah diperbaiki", true));
  if (p.perbaikan === "sudah" && stafPbk()) t.push(b("diperbaiki", p.n_foto_sesudah ? "Ubah hasil" : "Tambah foto hasil"), b("belum", "Batalkan tanda"));
  if (p.status === "diajukan" && (p.oleh_id === S.akses.id || stafPbk())) t.push(b("batal", "Batalkan"));
  return t.join(" ");
}
/* Tanda untuk pengusul (21 Nov 2026): ada kabar untuk usulannya (sudah diperbaiki, tanggapan Staf Sarpras, atau ditolak)
   yang belum dilihat. Hilang setelah menu ini dibuka. */
const pbBelumDilihat = () => stafPbk() || !S.akses ? [] : S.perbaikan.filter((p) => p.oleh_id === S.akses.id && p.kabar_waktu && (!p.dilihat_pengusul || p.kabar_waktu > p.dilihat_pengusul));
function ringkasKabarPbk(d) {
  const n = (f) => d.filter(f).length, sudah = n((p) => p.perbaikan === "sudah"), tolak = n((p) => p.status === "ditolak"), tgp = d.length - sudah - tolak;
  return [sudah ? `${sudah} sudah diperbaiki` : "", tgp ? `${tgp} mendapat tanggapan Staf Sarpras` : "", tolak ? `${tolak} ditolak` : ""].filter(Boolean).join(", ");
}
function tampilKabarPbk() {
  const el = $("kabar-pbk"); if (!el) return;
  const d = pbBelumDilihat();
  el.hidden = !d.length || S.tab === "perbaikan";
  if (el.hidden) return;
  el.innerHTML = `<p class="catatan kabar">${ikon("centang")}<span><b>Ada kabar untuk ${d.length} usulan perbaikan Anda:</b> ${esc(ringkasKabarPbk(d))}.</span><button class="tombol kecil" type="button" id="kabar-pbk-buka">Lihat</button></p>`;
  $("kabar-pbk-buka").onclick = () => buka("perbaikan");
}
async function tandaiDilihatPbk() {
  const baru = pbBelumDilihat();
  if (!baru.length) return;
  S.pbBaru = [...new Set([...(S.pbBaru || []), ...baru.map((p) => p.id)])];
  baru.forEach((p) => { p.dilihat_pengusul = new Date().toISOString(); });
  // Pastikan usulan yang mendapat kabar terlihat (saringan bawaan menyembunyikan yang sudah diperbaiki/ditolak).
  const tampak = (s) => baru.every((p) => cocokSaring(p, s));
  if (!tampak(S.saringPbk) || S.ruangPbk) { S.saringPbk = tampak("aktif") ? "aktif" : tampak("sudah") ? "sudah" : "semua"; S.ruangPbk = ""; segarkan(); }
  toast(`Kabar untuk usulan Anda: ${ringkasKabarPbk(baru)}`);
  await rpc("sp_perbaikan_dilihat", { p_pin: S.pin }).catch(() => null);
}
TAB.perbaikan.sesudah = () => {
  tandaiDilihatPbk();
  $("pb-saring").addEventListener("input", (e) => { S.saringPbk = e.target.value; segarkan(); });
  $("pb-ruang").addEventListener("input", (e) => { S.ruangPbk = e.target.value; segarkan(); });
  $("pb-unduh").onclick = unduhPerbaikan;
  if ($("pb-baru")) $("pb-baru").onclick = formAjukanPbk;
  $("isi").querySelector("section").addEventListener("click", async (e) => {
    const f = e.target.closest("[data-pbfoto]");
    if (f) return lihatFotoPbk(S.perbaikan.find((x) => x.id === +f.dataset.pbfoto));
    const t = e.target.closest("[data-pb]"); if (!t) return;
    const p = S.perbaikan.find((x) => x.id === +t.dataset.id), aksi = t.dataset.pb;
    const proses = (data) => rpc("sp_perbaikan_proses", { p_pin: S.pin, p_id: p.id, p_aksi: aksi, p_data: data || null });
    if (aksi === "tinjau" || aksi === "prioritas") return formPrioritasPbk(p, aksi, proses);
    if (aksi === "gabung") return formGabungPbk(p, proses);
    if (aksi === "diperbaiki") return formDiperbaikiPbk(p, proses);
    if (aksi === "tolak") return dialog({ atas: tempatPbk(p), judul: "Tolak usulan perbaikan", isi: `<p class="sub">${esc(p.nama)}: ${esc(p.uraian)}</p>
        <label class="f" for="pb-alasan">Alasan (terlihat oleh pengusul)<input id="pb-alasan" maxlength="300" required></label>`, kaki: kakiSimpan("Tolak"),
      onSimpan: async () => { await sibuk(() => proses({ alasan: $("pb-alasan").value })); tutupDialog(); await selesaiPbk("Usulan ditolak"); } });
    try {
      await sibuk(() => proses());
      await selesaiPbk({ tahu: "Usulan sudah diketahui", belum: "Tanda sudah diperbaiki dibatalkan", batal: "Usulan dibatalkan" }[aksi]);
    } catch (err) { toast(err.message); }
  });
};

/* ---------------------------------------------------------------- formulir */
function pilihanTempatPbk() {
  const o = [];
  waliSaya().forEach((k) => { const r = ruangRombel(k); o.push([`k:${k}`, `Kelas ${k}${r ? " · " + r.nama : ""} (wali kelas)`]); });
  const ruang = stafPbk() ? S.ruang.filter((r) => r.aktif && r.kode !== "RK") : S.ruang.filter((r) => r.aktif && ruangSaya().includes(r.kode));
  ruang.forEach((r) => o.push([`r:${r.kode}`, r.nama + (r.rombel ? ` (Kelas ${r.rombel})` : "")]));
  return o;
}
function formAjukanPbk() {
  const tempat = pilihanTempatPbk();
  if (!tempat.length) return toast("Anda belum memegang ruang atau kelas.");
  let foto = () => [];
  dialog({ judul: "Ajukan perbaikan", isi: `<div class="isian-grid">
      <label class="f lebar" for="pb-tempat">Ruang/kelas<select id="pb-tempat">${opsi(tempat, tempat[0][0])}</select></label>
      <label class="f" for="pb-jenis">Yang rusak<select id="pb-jenis">${opsi([["barang", "Barang inventaris"], ["bangunan", "Bangunan & lainnya"]], "barang")}</select></label>
      <label class="f pb-barang" for="pb-alat">Barang<select id="pb-alat"></select></label>
      <label class="f pb-bangunan" for="pb-bagian">Bagian<select id="pb-bagian">${opsi(BAGIAN_BANGUNAN.map((x) => [x, x]), BAGIAN_BANGUNAN[0])}</select></label>
      <label class="f lebar" for="pb-uraian">Uraian kerusakan<textarea id="pb-uraian" rows="3" maxlength="500" required placeholder="mis. Plafon bocor di pojok belakang, air menetes saat hujan"></textarea></label></div>
    <p class="f" style="margin:var(--j3) 0 var(--j1)">Dampak</p>
    <div class="pilih-gerak" role="radiogroup" aria-label="Dampak">${Object.entries(DAMPAK).map(([k, [n]], i) => `<label><input type="radio" name="pb-dampak" value="${k}"${i === 1 ? " checked" : ""}>${n}</label>`).join("")}</div>
    ${htmlPilihFoto("Foto keadaan (paling banyak 2, opsional)")}
    <p class="kecil" id="pb-info"></p>`, kaki: kakiSimpan("Kirim"),
    onSimpan: async () => {
      const [jt, kode] = $("pb-tempat").value.split(/:(.*)/s), jenis = $("pb-jenis").value;
      const data = { jenis, uraian: $("pb-uraian").value, dampak: document.querySelector('input[name="pb-dampak"]:checked').value, foto: foto() };
      if (jt === "k") data.rombel = kode; else data.ruang = kode;
      if (jenis === "barang") { if (!$("pb-alat").value) throw new Error("Pilih barangnya, atau pilih Bangunan & lainnya."); data.alat = +$("pb-alat").value; }
      else data.nama = $("pb-bagian").value;
      await sibuk(() => rpc("sp_perbaikan_simpan", { p_pin: S.pin, p_p: data }));
      tutupDialog(); await selesaiPbk("Usulan terkirim ke Staf Sarana Prasarana");
    } });
  const ruangDipilih = () => { const [jt, kode] = $("pb-tempat").value.split(/:(.*)/s); return jt === "k" ? (ruangRombel(kode) || {}).kode : kode; };
  const perTempat = () => {
    const rg = ruangDipilih(), barang = rg ? S.alat.filter((a) => a.ruang === rg && a.kategori !== "BK").sort((a, b) => a.nama.localeCompare(b.nama)) : [];
    $("pb-alat").innerHTML = barang.map((a) => `<option value="${a.id}">${esc(a.nama)} · ${esc(a.kode)}</option>`).join("");
    if (!barang.length && $("pb-jenis").value === "barang") $("pb-jenis").value = "bangunan";
    $("pb-info").textContent = !rg ? "Kelas ini belum dipasangkan dengan ruang oleh Staf Sarpras, jadi barang inventarisnya belum bisa dipilih. Pilih Bangunan & lainnya dan sebutkan barangnya di uraian."
      : !barang.length ? "Belum ada barang inventaris tercatat di ruang ini. Sebutkan barangnya di uraian." : "";
    perJenis();
  };
  const perJenis = () => { const j = $("pb-jenis").value; document.querySelectorAll(".pb-barang").forEach((x) => { x.hidden = j !== "barang"; }); document.querySelectorAll(".pb-bangunan").forEach((x) => { x.hidden = j !== "bangunan"; }); };
  $("pb-tempat").onchange = perTempat; $("pb-jenis").onchange = perJenis; perTempat();
  foto = pasangPilihFoto([]);
}
/* Pemilih foto (12 Nov 2026; dipakai juga untuk foto hasil 21 Nov): "Ambil foto" langsung membuka kamera belakang HP (capture);
   "Pilih dari galeri" seperti biasa. Foto dari keduanya dikumpulkan, paling banyak 2; tiap foto bisa dihapus dari pratinjau. */
const htmlPilihFoto = (judul) => `<p class="f" style="margin:var(--j3) 0 var(--j1)">${judul}</p>
    <div class="pb-foto-aksi">
      <label class="tombol" for="pb-kamera">${ikon("kamera")}Ambil foto<input id="pb-kamera" class="pb-berkas" type="file" accept="image/*" capture="environment"></label>
      <label class="tombol" for="pb-foto">${ikon("gambar")}Pilih dari galeri<input id="pb-foto" class="pb-berkas" type="file" accept="image/*" multiple></label></div>
    <div id="pb-pratinjau" class="pb-pratinjau"></div>`;
function pasangPilihFoto(awal) {
  let foto = awal.slice();
  const gambarPratinjau = () => {
    $("pb-pratinjau").innerHTML = foto.map((f, i) => `<span class="pb-foto-kecil"><img src="${f}" alt="Pratinjau foto ${i + 1}"><button type="button" data-hapusfoto="${i}" aria-label="Hapus foto ${i + 1}">${ikon("x")}</button></span>`).join("");
    document.querySelectorAll(".pb-foto-aksi .tombol").forEach((b) => b.classList.toggle("nonaktif", foto.length >= 2));
  };
  const tambahFoto = async (e) => {
    const sisa = 2 - foto.length, berkas = [...e.target.files];
    e.target.value = "";   // supaya foto yang sama bisa dipilih/diambil lagi
    if (!berkas.length) return;
    if (sisa <= 0) return toast("Sudah 2 foto. Hapus salah satu dulu untuk menggantinya.");
    try {
      foto = foto.concat(await sibuk(() => Promise.all(berkas.slice(0, sisa).map(kecilkanFoto))));
      if (berkas.length > sisa) toast("Paling banyak 2 foto; sisanya tidak dipakai.");
    } catch (err) { toast(err.message); }
    gambarPratinjau();
  };
  $("pb-kamera").onchange = tambahFoto; $("pb-foto").onchange = tambahFoto;
  $("pb-pratinjau").onclick = (e) => { const b = e.target.closest("[data-hapusfoto]"); if (!b) return; foto.splice(+b.dataset.hapusfoto, 1); gambarPratinjau(); };
  gambarPratinjau();
  return () => foto.slice();
}
/* Foto diperkecil di HP: sisi terpanjang 1280 px, JPEG; kualitas diturunkan sampai ± 220 KB. */
function kecilkanFoto(berkas) {
  return new Promise((ok, gagal) => {
    const url = URL.createObjectURL(berkas), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let sisi = 1280, hasil = "";
      for (let n = 0; n < 6; n++) {
        const s = Math.min(1, sisi / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        for (const q of [0.72, 0.6, 0.48]) { hasil = c.toDataURL("image/jpeg", q); if (hasil.length <= 300000) return ok(hasil); }
        sisi = Math.round(sisi * 0.75);
      }
      gagal(new Error("Foto terlalu besar untuk diperkecil. Coba foto lain."));
    };
    img.onerror = () => { URL.revokeObjectURL(url); gagal(new Error("Berkas ini bukan gambar yang bisa dibaca.")); };
    img.src = url;
  });
}
/* Foto sebelum (pengusul) dan sesudah (Staf Sarpras) berdampingan; di HP bertumpuk. */
async function lihatFotoPbk(p) {
  try {
    const f = await sibuk(() => rpc("sp_perbaikan_foto_lengkap", { p_pin: S.pin, p_id: p.id }));
    const kolom = (judul, daftar, ket, kosong) => `<figure class="pb-kolom"><figcaption><b>${judul}</b>${ket ? `<span>${esc(ket)}</span>` : ""}</figcaption>
      ${daftar.length ? daftar.map((x, i) => `<img src="${x}" alt="${judul} ${i + 1}">`).join("") : `<p class="pb-tanpa-foto">${kosong}</p>`}</figure>`;
    const sudah = p.perbaikan === "sudah";
    dialog({ atas: tempatPbk(p), judul: p.nama, isi: `<p class="sub">${esc(p.uraian)}</p>
      <div class="pb-banding${sudah ? "" : " satu"}">
        ${kolom("Sebelum", f.sebelum, `${p.oleh}, ${tglSingkat(p.dibuat)}`, "Pengusul tidak melampirkan foto.")}
        ${sudah ? kolom("Sesudah", f.sesudah, `${p.diperbaiki_oleh || "Staf Sarpras"}, ${tglSingkat(p.diperbaiki_tgl)}`, "Tidak ada foto hasil perbaikan.") : ""}
      </div>${sudah && p.diperbaiki_ket ? `<p class="kecil" style="margin-top:var(--j3)">${esc(p.diperbaiki_ket)}</p>` : ""}`,
      kaki: `<button class="tombol" value="batal" formnovalidate>Tutup</button>`, onSimpan: async () => {} });
  } catch (e) { toast(e.message); }
}
/* Tanggapan untuk pengusul (21 Nov 2026): wajib bila perbaikan harus menunggu (Bulan ini/Dianggarkan), supaya pengusul tahu
   usulannya diperhatikan walau belum disegerakan. Setiap tanggapan baru memunculkan tanda di halaman pengusul. */
const PERLU_TANGGAPAN = ["bulan", "anggaran"];
function formPrioritasPbk(p, aksi, proses) {
  dialog({ atas: tempatPbk(p), judul: aksi === "tinjau" ? "Tinjau usulan" : "Ubah prioritas dan tanggapan", isi: `<p class="sub"><b>${esc(p.nama)}</b>: ${esc(p.uraian)}<br>Dampak: ${DAMPAK[p.dampak][0]}${p.jumlah_siswa ? ` · ${p.jumlah_siswa} siswa` : ""}${p.dukungan ? ` · ${p.dukungan} laporan sama` : ""}</p>
    <div class="isian-grid"><label class="f" for="pb-prior">Prioritas<select id="pb-prior">${opsi(Object.entries(PRIORITAS), p.prioritas || (p.dampak === "bahaya" ? "segera" : p.dampak === "kbm" ? "pekan" : "bulan"))}</select></label>
      <label class="f lebar" for="pb-cat"><span id="pb-cat-judul"></span><textarea id="pb-cat" rows="3" maxlength="300" placeholder="mis. Perlu membeli suku cadang; dijadwalkan dari dana pemeliharaan bulan Desember. Sementara, kipas dipindahkan dari ruang guru.">${esc(p.catatan || "")}</textarea></label></div>
    <p class="kecil" id="pb-cat-info"></p>
    ${aksi === "tinjau" ? `<p class="kecil">Sesudah ditinjau, usulan diteruskan ke Kepala Sekolah untuk diketahui.</p>` : ""}`, kaki: kakiSimpan(aksi === "tinjau" ? "Teruskan ke Kepala Sekolah" : "Simpan"),
    onSimpan: async () => {
      if (PERLU_TANGGAPAN.includes($("pb-prior").value) && $("pb-cat").value.trim().length < 10)
        throw new Error("Perbaikan ini perlu menunggu. Tulis tanggapan untuk pengusul: alasannya dan perkiraan waktunya.");
      await sibuk(() => proses({ prioritas: $("pb-prior").value, catatan: $("pb-cat").value }));
      tutupDialog(); await selesaiPbk(aksi === "tinjau" ? "Diteruskan ke Kepala Sekolah" : "Prioritas dan tanggapan tersimpan");
    } });
  const perPrioritas = () => {
    const wajib = PERLU_TANGGAPAN.includes($("pb-prior").value);
    $("pb-cat-judul").textContent = wajib ? "Tanggapan untuk pengusul (wajib)" : "Tanggapan untuk pengusul (opsional)";
    $("pb-cat").required = wajib;
    $("pb-cat-info").textContent = wajib
      ? "Perbaikan ini perlu menunggu. Jelaskan alasannya dan perkiraan waktunya, agar pengusul tahu usulannya diperhatikan."
      : "Tanggapan terlihat oleh pengusul dan Kepala Sekolah. Pengusul mendapat tanda setiap ada tanggapan baru.";
  };
  $("pb-prior").onchange = perPrioritas; perPrioritas();
}
function formGabungPbk(p, proses) {
  const lain = S.perbaikan.filter((x) => x.id !== p.id && !["ditolak", "digabung"].includes(x.status))
    .sort((a, b) => (kunciTempat(b) === kunciTempat(p)) - (kunciTempat(a) === kunciTempat(p)) || b.id - a.id);
  if (!lain.length) return toast("Tidak ada usulan lain yang masih berjalan.");
  dialog({ atas: tempatPbk(p), judul: "Gabungkan dengan usulan lain", isi: `<p class="sub">Untuk laporan ganda atas kerusakan yang sama. Usulan ini ditutup dan menambah bobot usulan tujuan.</p>
    <label class="f" for="pb-ke">Usulan tujuan<select id="pb-ke">${opsi(lain.map((x) => [x.id, `${tempatPbk(x)} · ${x.nama} · ${x.uraian.slice(0, 50)}`]), lain[0].id)}</select></label>`, kaki: kakiSimpan("Gabungkan"),
    onSimpan: async () => { await sibuk(() => proses({ ke: +$("pb-ke").value })); tutupDialog(); await selesaiPbk("Usulan digabung"); } });
}
/* Tandai sudah diperbaiki, atau ubah hasilnya. Foto hasil (21 Nov 2026) tidak wajib, tetapi dianjurkan:
   pengusul dan Kepala Sekolah melihatnya berdampingan dengan foto keadaan sebelum. */
async function formDiperbaikiPbk(p, proses) {
  const hari = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10), ubah = p.perbaikan === "sudah";
  let awal = [];
  if (ubah && p.n_foto_sesudah) { try { awal = (await sibuk(() => rpc("sp_perbaikan_foto_lengkap", { p_pin: S.pin, p_id: p.id }))).sesudah; } catch (e) { return toast(e.message); } }
  let foto = () => [];
  dialog({ atas: tempatPbk(p), judul: ubah ? "Ubah hasil perbaikan" : "Tandai sudah diperbaiki", isi: `<p class="sub"><b>${esc(p.nama)}</b>: ${esc(p.uraian)}</p>
    <div class="isian-grid"><label class="f" for="pb-tgl">Tanggal diperbaiki<input id="pb-tgl" type="date" max="${hari}" value="${esc(ubah && p.diperbaiki_tgl ? p.diperbaiki_tgl : hari)}" required></label>
      <label class="f lebar" for="pb-ket">Keterangan (opsional)<input id="pb-ket" maxlength="300" placeholder="mis. Diganti lampu baru oleh tukang" value="${esc(ubah ? p.diperbaiki_ket || "" : "")}"></label></div>
    ${htmlPilihFoto("Foto hasil perbaikan (paling banyak 2, tidak wajib)")}
    <p class="kecil">${p.n_foto ? "Ambil dari sudut yang sama dengan foto pengusul agar mudah dibandingkan. " : ""}Pengusul dan Kepala Sekolah dapat melihat foto ini.</p>
    ${p.alat ? `<p class="catatan">${ikon("info")}<span>Bila kondisi barang berubah (mis. rusak ringan menjadi baik), perbarui juga di kartu barang <b>${esc(p.kode)}</b>.</span></p>` : ""}`, kaki: kakiSimpan("Simpan"),
    onSimpan: async () => { await sibuk(() => proses({ tgl: $("pb-tgl").value, ket: $("pb-ket").value, foto: foto() })); tutupDialog(); await selesaiPbk(ubah ? "Hasil perbaikan diperbarui" : "Ditandai sudah diperbaiki"); } });
  foto = pasangPilihFoto(awal);
}

/* ---------------------------------------------------------------- unduhan berkop untuk Kepala Sekolah & bendahara */
async function unduhPerbaikan() {
  const d = tampilPbk();
  if (!d.length) return toast("Tidak ada usulan untuk diunduh.");
  const p = profilKop(), staf = stafPbk() ? S.akses.nama : (d.find((x) => x.tinjau_oleh) || {}).tinjau_oleh || p.staf_sarpras || "";
  try {
    await sibuk(async () => {
      const wb = new (await muatExcelJS()).Workbook();
      await lembarBerkop(wb, { nama: "Usulan Perbaikan", judul: "Daftar Usulan Perbaikan Sarana dan Prasarana", sub: `${SARING_PBK.find((x) => x[0] === S.saringPbk)[1]}  ·  ${d.length} usulan  ·  keadaan ${tglPanjang()}`,
        kolom: [{ judul: "Ruang/Kelas", lebar: 22 }, { judul: "Kerusakan", lebar: 22 }, { judul: "Uraian", lebar: 36 }, { judul: "Dampak", lebar: 13 }, { judul: "Siswa", lebar: 7, tengah: true },
          { judul: "Prioritas", lebar: 12 }, { judul: "Catatan Sarpras", lebar: 24 }, { judul: "Diajukan", lebar: 22 }, { judul: "Status", lebar: 20 }, { judul: "Perbaikan", lebar: 18 }],
        baris: d.map((x) => [tempatPbk(x), x.nama + (x.kode ? ` (${x.kode})` : ""), x.uraian, DAMPAK[x.dampak][0], x.jumlah_siswa || "", PRIORITAS[x.prioritas] || "", x.catatan || "",
          `${x.oleh}, ${tglSingkat(x.dibuat)}`, ST_PBK[x.status][0], x.status !== "diketahui" ? "" : x.perbaikan === "sudah" ? `Sudah, ${tglSingkat(x.diperbaiki_tgl)}` : `Belum (${hariSejak(x.tahu_waktu)} hari)`]),
        blok: [{ atas: ["Diperiksa,", "Sarana Prasarana,"], nama: staf },
          { atas: ["Mengetahui,", "Kepala Sekolah,"], nama: p.kepala_sekolah || "", nip: p.nip_kepala ? "NIP. " + p.nip_kepala : null }] });
      await simpanBuku(wb, "Usulan_Perbaikan");
    });
  } catch (e) { toast(e.message); }
}
