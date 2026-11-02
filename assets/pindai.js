/* Pindai label buku oleh petugas (2 Nov 2026). Lihat RENCANA_PERPUSTAKAAN.md.
   Tiga jalan: kamera di dalam aplikasi (jsQR, barkode lewat BarcodeDetector bila ada), alat pemindai/ketik di kotak Pindai,
   dan kamera bawaan HP (?b=<kode> lalu masuk dengan PIN). Stok dihitung per jumlah, jadi label hanya mengenali judul:
   petugas memilih pinjamannya dari daftar peminjam judul itu. */
"use strict";

// Isi label: alamat ...?b=B-0003.012 (QR) atau B-0003.012 (barkode, ketik). Mengembalikan kode buku, atau null.
function kodeDariPindaian(teks) {
  const s = String(teks || "").trim();
  const m = s.match(/[?&]b=([^&#\s]+)/i);
  const isi = m ? decodeURIComponent(m[1]) : s;
  const k = isi.toUpperCase().match(/^B-\d{4,}(\.\d+)?$/);
  return k ? k[0] : null;
}
function prosesPindaian(teks) {
  const kode = kodeDariPindaian(teks);
  if (!kode) return toast(/[?&]k=/.test(String(teks)) ? "Ini label barang, bukan label buku." : "Kode tidak dikenali. Contoh: B-0003.012");
  kartuPindai(kode);
}
function kartuPindai(kode) {
  const k = kodeDariPindaian(kode), b = k && S.buku.find((x) => x.kode === k.split(".")[0]);
  if (!b) return toast(`Buku ${kode} tidak ada di katalog.`);
  if (!aksesBuku()) return kartuBuku(b.id);
  if (bukuLiterasi() && !adaDiLiterasi(b)) return dialog({ atas: k, judul: b.judul, isi: `<p class="catatan awas">${ikon("awas")}<span>Buku ini bukan koleksi Pojok Literasi. Peminjamannya dilayani pustakawan.</span></p>`, kaki: `<button class="tombol" value="batal" formnovalidate>Tutup</button>` });
  const milik = S.pinjam.filter((p) => p.buku === b.id), minta = milik.filter((p) => p.status === "menunggu"), aktif = milik.filter((p) => p.status === "dipinjam");
  const ada = bukuLiterasi() ? b.tersedia_literasi : b.tersedia;
  dialog({ atas: k, judul: b.judul, isi: `
    <p class="sub">${esc([b.tingkat ? "Kelas " + b.tingkat : "", b.penerbit].filter(Boolean).join(" · "))}${b.tingkat || b.penerbit ? " · " : ""}Tersedia <b>${bil(ada)}</b> dari ${bil(b.jumlah)} eksemplar</p>
    ${minta.length ? `<h3>Menunggu ACC</h3><div class="gulir"><table><tbody>${minta.map((p) => `<tr><td class="nama-sel"><b>${esc(p.nama_siswa || "")}</b><p class="kecil">${esc(p.kelas || "")} · ${JENIS_PINJAM[p.jenis]}${p.nama_guru ? " · " + esc(p.nama_guru) : ""}</p></td><td class="n">${p.jumlah}</td>
      <td style="white-space:nowrap"><button class="tombol utama kecil" type="button" data-pacc="${p.id}">ACC</button> <button class="tombol kecil" type="button" data-ptolak="${p.id}">Tolak</button></td></tr>`).join("")}</tbody></table></div>` : ""}
    <h3>Sedang dipinjam</h3>
    ${aktif.length ? `<div class="gulir"><table><tbody>${aktif.map((p) => `<tr><td class="nama-sel"><b>${esc(p.jenis === "set_kelas" ? p.nama_guru : p.nama_siswa)}</b><p class="kecil">${esc([p.kelas, p.jenis === "set_kelas" && p.nama_siswa ? "diambil " + p.nama_siswa : "", "no. " + p.nomor].filter(Boolean).join(" · "))}</p></td><td class="n">${p.sisa}</td><td>${pilPinjam(p)}</td>
      <td style="white-space:nowrap"><button class="tombol utama kecil" type="button" data-pkembali="${p.id}">Terima kembali</button></td></tr>`).join("")}</tbody></table></div>`
      : `<p class="sub">Judul ini tidak sedang dipinjam.</p>`}`,
    kaki: `<button class="tombol" value="batal" formnovalidate>Tutup</button><button class="tombol" type="button" id="p-lagi">${ikon("qr")}Pindai lagi</button><button class="tombol utama" type="button" id="p-pinjamkan">${ikon("tambah")}Pinjamkan</button>` });
  $("p-lagi").onclick = () => bukaKamera();
  $("p-pinjamkan").onclick = () => formPinjam(b, () => kartuPindai(k));
  $("dlg-isi").onclick = async (e) => {
    const t = e.target.closest("[data-pacc],[data-ptolak],[data-pkembali]");
    if (!t) return;
    const cari = (id) => S.pinjam.find((p) => p.id === +id);
    if (t.dataset.pkembali) return formKembali(cari(t.dataset.pkembali), () => kartuPindai(k));
    if (t.dataset.ptolak) return formTolakPinjam(cari(t.dataset.ptolak), () => kartuPindai(k));
    try {
      await sibuk(async () => { await rpc("sp_pinjam_acc", { p_pin: S.pin, p_id: +t.dataset.pacc }); await segarPinjam(); });
      segarkan(); toast("Permintaan di-ACC"); kartuPindai(k);
    } catch (err) { $("dlg-galat").textContent = err.message; $("dlg-galat").hidden = false; }
  };
}
/* ---------------------------------------------------------------- kamera di dalam aplikasi */
let aliranKamera = null, putarKamera = 0;
function matikanKamera() {
  cancelAnimationFrame(putarKamera);
  if (aliranKamera) aliranKamera.getTracks().forEach((t) => t.stop());
  aliranKamera = null;
}
const bacaQR = (citra) => { const h = window.jsQR && window.jsQR(citra.data, citra.width, citra.height, { inversionAttempts: "dontInvert" }); return h ? h.data : null; };
// Barkode lewat kamera hanya di browser yang menyediakannya (mis. Chrome di Android); QR selalu bisa.
async function bisaBacaBarkode() {
  if (!("BarcodeDetector" in window)) return false;
  try { return (await window.BarcodeDetector.getSupportedFormats()).includes("code_128"); } catch (e) { return false; }
}
async function bukaKamera() {
  dialog({ judul: "Pindai label buku", isi: `<div class="kamera"><video id="k-video" playsinline muted></video><span class="kamera-bingkai"></span></div>
      <p class="kecil" id="k-pesan">Arahkan kamera ke QR pada label buku.</p><p class="catatan" id="k-ket" hidden></p>
      <label class="f" for="k-ketik">Atau ketik kodenya<input id="k-ketik" placeholder="mis. B-0003.012" autocomplete="off"></label>`,
    kaki: `<button class="tombol" value="batal" formnovalidate>Tutup</button><button class="tombol utama" value="simpan">Cari</button>`,
    onSimpan: async () => { const v = $("k-ketik").value; if (!kodeDariPindaian(v)) throw new Error("Kode tidak dikenali. Contoh: B-0003.012"); matikanKamera(); kartuPindai(v); } });
  $("dlg").addEventListener("close", matikanKamera, { once: true });
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("tidak didukung");
    await muatSkrip("assets/vendor/jsQR-1.4.0.min.js");
    const adaBarkode = await bisaBacaBarkode();
    if (adaBarkode && $("k-pesan")) $("k-pesan").textContent = "Arahkan kamera ke QR atau barkode pada label buku.";
    else if ($("k-ket")) { $("k-ket").innerHTML = `${ikon("info")}<span>Browser ini hanya bisa membaca <b>QR</b> lewat kamera. Untuk barkode, pakai alat pemindai atau ketik kodenya.</span>`; $("k-ket").hidden = false; }
    aliranKamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    const v = $("k-video"); if (!v) return matikanKamera();
    v.srcObject = aliranKamera; await v.play();
    const kanvas = document.createElement("canvas"), g = kanvas.getContext("2d", { willReadFrequently: true });
    const barkode = adaBarkode ? new window.BarcodeDetector({ formats: ["code_128"] }) : null;
    let bingkai = 0;
    const baca = async () => {
      if (!aliranKamera) return;
      if (v.videoWidth && ++bingkai % 6 === 0) {
        const lebar = 640, tinggi = Math.round(v.videoHeight * lebar / v.videoWidth);
        kanvas.width = lebar; kanvas.height = tinggi; g.drawImage(v, 0, 0, lebar, tinggi);
        let isi = bacaQR(g.getImageData(0, 0, lebar, tinggi));
        if (!isi && barkode) { try { const h = await barkode.detect(kanvas); if (h[0]) isi = h[0].rawValue; } catch (e) { /* kamera sedang berganti bingkai */ } }
        if (isi && kodeDariPindaian(isi)) { matikanKamera(); return kartuPindai(isi); }
        if (isi) $("k-pesan").textContent = /[?&]k=/.test(isi) ? "Ini label barang, bukan label buku." : "Kode ini bukan label buku.";
      }
      putarKamera = requestAnimationFrame(baca);
    };
    baca();
  } catch (e) {
    matikanKamera();
    if ($("k-pesan")) $("k-pesan").textContent = "Kamera tidak bisa dibuka. Izinkan kamera di pengaturan browser, atau ketik kodenya.";
  }
}
// Dari kamera bawaan HP: ?b=<kode> sesudah masuk dengan PIN.
function bukaPindaianAlamat() {
  const k = new URLSearchParams(location.search).get("b");
  if (!k || bukaPindaianAlamat.sudah) return;
  bukaPindaianAlamat.sudah = true;
  if (aksesBuku()) buka("pinjam");
  kartuPindai(k);
}
