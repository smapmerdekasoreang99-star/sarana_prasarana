/* Label Buku (2 Nov 2026): kertas stiker kecil A4 isi 65 (5 × 13, 38,1 × 21,2 mm). Lihat RENCANA_PERPUSTAKAAN.md.
   Satu eksemplar bisa punya label punggung (nomor panggil), label QR, dan label barkode. Kode: B-0004.012 = buku B-0004, eksemplar ke-12.
   QR membuka ?b=<kode>: halaman pinjam siswa. Stok tetap dihitung per jumlah; nomor eksemplar hanya identitas di label. */
"use strict";
Object.assign(S, { labelBuku: { id: "", dari: 1, sampai: 0, punggung: true, qr: true, barkode: false } });
const BATAS_LABEL = 650;   // 10 lembar sekali cetak, supaya browser tidak kewalahan
const LOGO_LABEL = `<img class="lb-logo" src="assets/logo-bw.jpg" alt="">`;
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
    <p class="kecil"><b>QR</b> terbaca kamera semua HP. <b>Barkode</b> perlu alat pemindai, atau kamera di browser tertentu seperti Chrome di Android. Bila belum punya alat pemindai, cukup pilih QR.</p>
    <p class="kecil" id="lb-jml"></p>
    <div class="lembar-wadah"><div class="lembar-kecil" id="lb-lembar"></div></div>
    <div class="lembar-nav" id="lb-nav" hidden></div>
    <p class="kecil">Coba cetak satu lembar di kertas biasa, lalu tumpuk dengan kertas stiker untuk memeriksa posisinya. Saat mencetak pilih A4, skala 100%, tanpa kepala dan kaki halaman.</p>
  </section>`;
};
TAB.labelbuku.sesudah = async () => {
  const s = S.labelBuku, p = { items: [], per: 65, hal: 0 };
  const kosongkan = (pesan) => { p.items = []; tampilLembar($("lb-lembar"), $("lb-nav"), p); $("lb-jml").textContent = pesan; };
  const gambar = async () => {
    const b = S.buku.find((x) => String(x.id) === String(s.id));
    if (!b) return kosongkan("Belum ada buku.");
    const dari = Math.max(1, +s.dari || 1), sampai = Math.max(dari, +s.sampai || dari), jenis = (s.punggung ? 1 : 0) + (s.qr ? 1 : 0) + (s.barkode ? 1 : 0);
    const eks = sampai - dari + 1, total = eks * jenis;
    if (!jenis) return kosongkan("Pilih minimal satu jenis label.");
    if (total > BATAS_LABEL) return kosongkan(`${total} label terlalu banyak untuk sekali cetak. Paling banyak ${BATAS_LABEL} label; bagi rentang eksemplarnya.`);
    $("lb-jml").textContent = `${eks} eksemplar × ${jenis} jenis = ${total} label · ${Math.ceil(total / 65)} lembar A4` + (total > 65 ? " · tombol Cetak mencetak semua lembar" : "") + (sampai > b.jumlah ? ` · perhatian: buku ini tercatat ${b.jumlah} eksemplar` : "");
    try {
      if (s.barkode && !window.JsBarcode) await muatSkrip("assets/vendor/JsBarcode-3.11.6.all.min.js");
      if (s.qr) await siapkanQR();
    } catch (e) { return kosongkan(e.message); }
    const atas = esc(b.nomor_panggil || b.mapel || b.kode), judul = esc(b.judul);
    const dasar = location.origin + location.pathname + "?b=", h = [];
    for (let n = dari; n <= sampai; n++) {
      const kode = kodeEksemplar(b, n);
      if (s.punggung) h.push(`<div class="lb lb-pg">${LOGO_LABEL}<b>${(b.nomor_panggil ? b.nomor_panggil.split(/\s+/).map(esc) : [atas]).join("<br>")}</b><small>${esc(kode)}</small></div>`);
      if (s.qr) h.push(`<div class="lb lb-qr"><div class="qr" data-qr="${esc(dasar + encodeURIComponent(kode))}" data-uk="128"></div><div class="t">${LOGO_LABEL}<small>Perpustakaan SMA Plus Merdeka</small><span class="k">${esc(kode)}</span><span class="j">${judul}</span></div></div>`);
      if (s.barkode) h.push(`<div class="lb lb-bc"><div class="lb-bc-atas">${LOGO_LABEL}<small>${judul}</small></div><svg data-kode="${esc(kode)}" data-tinggi="34"></svg></div>`);
    }
    p.items = h; p.hal = 0;
    tampilLembar($("lb-lembar"), $("lb-nav"), p);
  };
  await gambar();
  $("lb-buku").addEventListener("input", (e) => { s.id = e.target.value; const b = S.buku.find((x) => String(x.id) === String(s.id)); s.dari = 1; s.sampai = b ? b.jumlah : 0; $("lb-dari").value = 1; $("lb-sampai").value = s.sampai; gambar(); });
  [["lb-dari", "dari"], ["lb-sampai", "sampai"]].forEach(([id, k]) => $(id).addEventListener("input", (e) => { s[k] = e.target.value; gambar(); }));
  [["lb-punggung", "punggung"], ["lb-qr", "qr"], ["lb-barkode", "barkode"]].forEach(([id, k]) => $(id).addEventListener("input", (e) => { s[k] = e.target.checked; gambar(); }));
  $("lb-cetak").onclick = () => { if (!p.items.length) return toast($("lb-jml").textContent); cetakLabel("lembar-kecil", p.items, $("lb-cetak")); };
};
