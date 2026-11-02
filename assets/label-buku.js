/* Label Buku (2 Nov 2026): kertas stiker kecil A4 isi 65 (5 × 13, 38,1 × 21,2 mm). Lihat RENCANA_PERPUSTAKAAN.md.
   Satu eksemplar bisa punya label punggung (nomor panggil), label QR, dan label barkode. Kode: B-0004.012 = buku B-0004, eksemplar ke-12.
   QR membuka ?b=<kode>: halaman pinjam siswa. Stok tetap dihitung per jumlah; nomor eksemplar hanya identitas di label. */
"use strict";
Object.assign(S, { labelBuku: { id: "", dari: 1, sampai: 0, punggung: true, qr: true, barkode: false } });
const BATAS_LABEL = 650;   // 10 lembar sekali cetak, supaya browser tidak kewalahan
const kodeEksemplar = (b, n) => `${b.kode}.${String(n).padStart(3, "0")}`;

TAB.labelbuku = () => {
  const s = S.labelBuku, daftar = bukuTampil();
  if (!daftar.some((b) => String(b.id) === String(s.id))) { s.id = daftar[0] ? daftar[0].id : ""; s.dari = 1; s.sampai = daftar[0] ? daftar[0].jumlah : 0; }
  return `<section class="kartu">
    <div class="kepala-bagian"><div><h2>Label Buku</h2><p class="sub">Cetak di kertas stiker kecil A4 isi 65 (38 × 21 mm). Saat QR dipindai kamera HP, siswa langsung ke halaman pinjam buku itu.</p></div>
      <div class="aksi"><button class="tombol utama" id="lb-cetak" type="button">${ikon("cetak")}Cetak</button></div></div>
    <div class="saring">
      <label class="f" for="lb-buku" style="flex:1 1 320px">Buku<select id="lb-buku">${opsi(daftar.map((b) => [b.id, labelBuku(b)]), s.id)}</select></label>
      <label class="f" for="lb-dari" style="flex:0 1 110px">Eksemplar dari<input id="lb-dari" type="number" min="1" value="${s.dari}"></label>
      <label class="f" for="lb-sampai" style="flex:0 1 110px">sampai<input id="lb-sampai" type="number" min="1" value="${s.sampai}"></label>
    </div>
    <div class="saring lb-pilih">
      <label><input type="checkbox" id="lb-punggung"${s.punggung ? " checked" : ""}> Label punggung (nomor panggil)</label>
      <label><input type="checkbox" id="lb-qr"${s.qr ? " checked" : ""}> Label QR</label>
      <label><input type="checkbox" id="lb-barkode"${s.barkode ? " checked" : ""}> Label barkode (untuk alat pemindai)</label>
    </div>
    <p class="kecil" id="lb-jml"></p>
    <div class="lembar-wadah"><div class="lembar-kecil" id="lb-lembar"></div></div>
    <p class="kecil">Coba cetak satu lembar di kertas biasa, lalu tumpuk dengan kertas stiker untuk memeriksa posisinya. Saat mencetak pilih A4, skala 100%, tanpa kepala dan kaki halaman.</p>
  </section>`;
};
TAB.labelbuku.sesudah = async () => {
  const s = S.labelBuku;
  const gambar = async () => {
    const b = S.buku.find((x) => String(x.id) === String(s.id));
    if (!b) { $("lb-lembar").innerHTML = ""; $("lb-jml").textContent = "Belum ada buku."; return; }
    const dari = Math.max(1, +s.dari || 1), sampai = Math.max(dari, +s.sampai || dari), jenis = (s.punggung ? 1 : 0) + (s.qr ? 1 : 0) + (s.barkode ? 1 : 0);
    const eks = sampai - dari + 1, total = eks * jenis;
    if (!jenis) { $("lb-lembar").innerHTML = ""; $("lb-jml").textContent = "Pilih minimal satu jenis label."; return; }
    if (total > BATAS_LABEL) { $("lb-lembar").innerHTML = ""; $("lb-jml").textContent = `${total} label terlalu banyak untuk sekali cetak. Paling banyak ${BATAS_LABEL} label; bagi rentang eksemplarnya.`; return; }
    $("lb-jml").textContent = `${eks} eksemplar × ${jenis} jenis = ${total} label · ${Math.ceil(total / 65)} lembar A4` + (sampai > b.jumlah ? ` · perhatian: buku ini tercatat ${b.jumlah} eksemplar` : "");
    if (s.barkode && !window.JsBarcode) await muatSkrip("assets/vendor/JsBarcode-3.11.6.all.min.js");
    const atas = esc(b.nomor_panggil || b.mapel || b.kode), judul = esc(b.judul);
    let h = "";
    for (let n = dari; n <= sampai; n++) {
      const kode = kodeEksemplar(b, n);
      if (s.punggung) h += `<div class="lb lb-pg"><small>PERPUS</small><b>${(b.nomor_panggil ? b.nomor_panggil.split(/\s+/).map(esc) : [atas]).join("<br>")}</b><small>${esc(kode)}</small></div>`;
      if (s.qr) h += `<div class="lb lb-qr"><div class="qr" data-kode="${esc(kode)}"></div><div class="t"><small>Perpustakaan SMA Plus Merdeka</small><span class="k">${esc(kode)}</span><span class="j">${judul}</span></div></div>`;
      if (s.barkode) h += `<div class="lb lb-bc"><small>${judul}</small><svg data-kode="${esc(kode)}"></svg></div>`;
    }
    $("lb-lembar").innerHTML = h;
    const dasar = location.origin + location.pathname + "?b=";
    $("lb-lembar").querySelectorAll(".qr").forEach((el) => { if (window.QRCode) new QRCode(el, { text: dasar + encodeURIComponent(el.dataset.kode), width: 128, height: 128, correctLevel: QRCode.CorrectLevel.M }); });
    if (window.JsBarcode) $("lb-lembar").querySelectorAll("svg[data-kode]").forEach((el) => JsBarcode(el, el.dataset.kode, { format: "CODE128", height: 34, width: 1, fontSize: 10, margin: 0, background: "transparent" }));
  };
  await gambar();
  $("lb-buku").addEventListener("input", (e) => { s.id = e.target.value; const b = S.buku.find((x) => String(x.id) === String(s.id)); s.dari = 1; s.sampai = b ? b.jumlah : 0; $("lb-dari").value = 1; $("lb-sampai").value = s.sampai; gambar(); });
  [["lb-dari", "dari"], ["lb-sampai", "sampai"]].forEach(([id, k]) => $(id).addEventListener("input", (e) => { s[k] = e.target.value; gambar(); }));
  [["lb-punggung", "punggung"], ["lb-qr", "qr"], ["lb-barkode", "barkode"]].forEach(([id, k]) => $(id).addEventListener("input", (e) => { s[k] = e.target.checked; gambar(); }));
  $("lb-cetak").onclick = () => { if (!$("lb-lembar").children.length) return toast($("lb-jml").textContent); $("cetak").innerHTML = `<div class="lembar-kecil">${$("lb-lembar").innerHTML}</div>`; window.print(); };
};
