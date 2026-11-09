/* Pembuat Panduan Sarana Prasarana (31 Okt 2026) — mesin sama dengan kehadiran_guru/alat/buat-panduan.js
   ---------------------------------------------------------------
   Lima panduan per peran (2 Nov 2026): Staf Sarpras & admin (ISI_STAF di bawah), lalu penanggung jawab ruang, Perpustakaan, Pojok Literasi,
   dan siswa (alat/panduan-peran.js). Tiap panduan menjadi dua berkas di akar proyek, dibuka lewat tombol Panduan di kepala halaman:
     <nama>.pdf   (dicetak Chrome/Edge tanpa jendela, lewat DevTools Protocol)
     <nama>.docx  (paket npm "docx")
   Jalankan dari akar proyek (paket docx dipinjam dari Tryout_Guru, tidak perlu node_modules di sini):
     NODE_PATH=../Tryout_Guru/node_modules node alat/buat-panduan.js
   Ubah isi panduan di sini bila tampilan atau aturan aplikasi berubah, lalu jalankan ulang.
   JANGAN menulis PIN apa pun di sini: berkas panduan terbuka untuk umum di GitHub Pages. */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), { spawn } = require("child_process");

let SUBJUDUL, UNTUK, NAMA, JUDUL, ISI, DAFTAR;
const AKAR = path.join(__dirname, ".."), VERSI = "9 November 2026", MEREK = "SARANA PRASARANA · SMA PLUS MERDEKA SOREANG";

/* ================= Isi panduan =================
   Blok: H1/H2/H3 (judul, dinomori otomatis), P (paragraf), UL/OL (daftar), TB (tabel: kepala, baris, lebar relatif),
   KOTAK (jenis: info | saran | awas | bahaya), STAT (kotak angka contoh). Teks boleh memakai **tebal**. */
const H1 = s => ({ t: "h1", s }), H2 = s => ({ t: "h2", s }), H3 = s => ({ t: "h3", s }), P = s => ({ t: "p", s });
const UL = (...a) => ({ t: "ul", a }), OL = (...a) => ({ t: "ol", a });
const TB = (kepala, baris, lebar) => ({ t: "tb", kepala, baris, lebar: lebar || kepala.map(() => 1) });
const KOTAK = (jenis, judul, ...isi) => ({ t: "kotak", jenis, judul, isi });
const STAT = (ket, ...a) => ({ t: "stat", a, ket });

const ISI_STAF = [
  /* ============================ 1 ============================ */
  H1("Mengenal Sarana Prasarana"),
  P("Sarana Prasarana adalah aplikasi web sekolah untuk mencatat **semua barang milik sekolah per ruang**: berapa jumlahnya, bagaimana kondisinya, dari dana apa dibeli, dan berapa harganya. Hasilnya adalah **Buku Induk** yang rapi, **label QR** di setiap barang, dan stok **bahan habis pakai** yang selalu terbaru."),
  P("Alamat aplikasi: **smapmerdekasoreang99-star.github.io/sarana_prasarana**. Bisa dibuka di komputer maupun HP. Untuk pekerjaan panjang (unggah Excel, cetak label), lebih nyaman memakai komputer."),
  H2("Tiga macam barang"),
  TB(["Golongan", "Artinya", "Contoh", "Dicatat sebagai"], [
    ["**Sarana**", "Perabot dan perlengkapan ruang", "Meja, kursi, lemari, papan tulis, gorden, jam dinding", "Jumlah per kondisi, punya kode & label QR"],
    ["**Alat**", "Peralatan untuk kegiatan", "Proyektor, komputer, alat lab, bola, gamelan, sapu, tandu UKS", "Jumlah per kondisi, punya kode & label QR"],
    ["**Bahan**", "Barang habis pakai", "Kertas, spidol, tinta, kantong plastik, obat, bahan kimia lab", "Stok (masuk, keluar, sisa), tanpa label"],
  ], [1, 1.6, 2.4, 2]),
  P("Golongan sarana atau alat ditentukan oleh **kategori** barang: kategori **Mebel** dan **Pelengkap ruangan** termasuk sarana, kategori lainnya termasuk alat."),
  H2("Menu aplikasi"),
  P("Menu dikelompokkan. Tekan kelompoknya, lalu pilih tab di baris kedua: **Inventaris** (Ruang, Sarana & Alat, Bahan, Buku Induk, Label QR), **Buku** (Katalog Buku, Pinjam & Kembali, Label Buku, Penerimaan Buku, Pengingat Buku), dan **Pengajuan & Penghapusan**. Panduan ini menyebut nama tabnya."),
  TB(["Menu", "Isi"], [
    ["**Ringkasan**", "Jumlah barang dan unit, unit rusak, bahan menipis, isian yang masih kosong."],
    ["**Ruang**", "Denah kotak semua ruang. Pilih satu kotak untuk melihat sarana, alat, dan bahan di dalamnya."],
    ["**Sarana & Alat**", "Daftar seluruh barang dengan pencarian dan saringan; mencatat dan mengubah barang."],
    ["**Bahan**", "Stok bahan habis pakai; mencatat bahan masuk dan keluar."],
    ["**Buku Induk**", "Daftar inventaris resmi; unduh Excel berkop dan bertanda tangan."],
    ["**Label QR**", "Mencetak label stiker untuk ditempel pada barang."],
    ["**Katalog Buku**, **Pinjam & Kembali**, **Label Buku**, **Penerimaan Buku**", "Perpustakaan (bagian 12)."],
    ["**Pengingat Buku**", "Muncul untuk wali kelas dan guru yang punya pinjaman terlambat."],
    ["**Profil Dokumen**", "Kop, identitas sekolah, dan penanda tangan yang dipakai semua unduhan."],
  ], [1.4, 4.6]),
  P("Tombol **Unduh**, **Unduh template**, dan **Unggah data** ada di menu Ruang, Sarana & Alat, Bahan, dan Buku Induk (bagian 9)."),
  H2("Kode inventaris"),
  P("Setiap barang (sarana atau alat) punya satu **kode inventaris**. Barang yang sudah punya kode, misalnya dari BUKU INDUK.xlsx (**SMA-INV-005-F-RLKOM-BOS**), **tetap memakai kode itu**. Barang yang belum punya kode mendapat kode otomatis saat dicatat, misalnya **SMA-INV-2024-E-0029**:"),
  TB(["Bagian", "Arti"], [
    ["**SMA-INV**", "Penanda inventaris sekolah."],
    ["**2024**", "Tahun perolehan. Bila tahunnya belum diketahui saat dicatat, dipakai tahun pencatatan."],
    ["**E**", "Huruf kategori (lihat tabel di bawah)."],
    ["**0029**", "Nomor urut, tidak pernah dipakai dua kali."],
  ], [1.2, 4.8]),
  KOTAK("info", "Kode tidak pernah berubah",
    "Kode diberikan sekali dan **tetap sama** walaupun tahun, kategori, atau ruang barang diubah kemudian, karena labelnya sudah tertempel. Barang yang pindah ruang tetap memakai label yang sama.",
    "Saat mencatat barang baru, kode boleh diisi sendiri (mis. kode yang sudah tertempel pada barang). Bila dikosongkan, kode dibuat otomatis. Kode yang sudah dipakai barang lain ditolak."),
  TB(["Huruf", "Kategori", "Golongan"], [
    ["F", "Mebel", "Sarana"], ["P", "Pelengkap ruangan", "Sarana"], ["E", "Elektronik & TIK", "Alat"], ["L", "Alat praktikum lab", "Alat"],
    ["O", "Olahraga", "Alat"], ["S", "Kesenian & musik", "Alat"], ["K", "Kebersihan", "Alat"], ["D", "Dapur", "Alat"],
    ["U", "Kesehatan (UKS)", "Alat"], ["PI", "Ibadah", "Alat"],
  ], [0.8, 2.6, 1.4]),

  /* ============================ 2 ============================ */
  H1("Masuk dan Hak Akses"),
  P("Masuk dengan **PIN pribadi** Anda, yaitu PIN yang sama dengan Matematika Dasar dan Asesmen. Tidak ada PIN baru yang perlu diingat."),
  OL("Buka alamat aplikasi.", "Ketik PIN di kotak **PIN**, lalu tekan **Masuk**. Tekan ikon **mata** di ujung kotak untuk melihat PIN yang diketik; tekan lagi untuk menyembunyikannya.",
    "Nama dan peran Anda tampil di pojok kanan atas. Untuk keluar, tekan **Keluar**. Bila tab peramban ditutup, Anda juga otomatis keluar."),
  H2("Tiga peran"),
  TB(["Peran", "Siapa", "Boleh"], [
    ["**Staf Sarpras (admin)**", "Guru/staf berjabatan **Staf Sarana Prasarana** atau **Wakasek Sarana Prasarana** di Data Induk, atau pemegang PIN admin Sarpras", "Semua ruang, termasuk **seluruh ruang kelas**; menambah dan mengubah ruang; menghapus barang; mengunggah data ruang"],
    ["**Penanggung jawab ruang**", "Guru yang dipasang sebagai penanggung jawab ruang tertentu", "Hanya **melihat dan mengisi ruangnya sendiri**. Punya panduan sendiri: Panduan Penanggung Jawab Ruang"],
    ["**Penanggung jawab Perpustakaan**", "Penanggung jawab ruang Perpustakaan", "Menu buku, pengadaan buku, dan barang di ruang Perpustakaan. Punya panduan sendiri: Panduan Perpustakaan"],
    ["**Penanggung jawab Pojok Literasi**", "Penanggung jawab ruang Pojok Literasi", "Hanya buku di Pojok Literasi. Punya panduan sendiri: Panduan Pojok Literasi"],
    ["**Guru lain**", "Guru lain yang punya PIN pribadi", "Melihat dan mengunduh; tidak mengubah"],
  ], [1.6, 2.4, 2.6]),
  TB(["Ruang", "Penanggung jawab"], [
    ["Lab Komputer", "Yeni Isnaeni"], ["Lab IPA", "Yanti Ratnasih, S.Pd."], ["Perpustakaan", "Candra Wibawa, S.Pd."], ["Pojok Literasi", "Puspa Adiyuka Nurzanah, S.Pd."], ["Ruang UKS", "Imas Kurniasih, S.Pd.I."],
    ["Semua ruang kelas, Gudang A, Gudang B, dan ruang lain yang belum punya penanggung jawab", "Staf Sarpras"],
  ], [3, 3]),
  KOTAK("awas", "Batasan diperiksa di server",
    "Penanggung jawab tidak bisa mencatat barang di ruang orang lain, dan tidak bisa memindahkan barang ke ruang yang bukan tanggung jawabnya. Pemindahan antarruang dilakukan oleh Staf Sarpras.",
    "Jaga PIN Anda. Jangan memberikannya kepada siswa atau orang luar."),
  P("**Menu yang pertama terbuka.** Staf Sarpras langsung masuk ke **Ringkasan**, guru lain ke **Ruang**, penanggung jawab ruang ke halaman ruangnya, dan pengelola buku ke menu bukunya."),
  KOTAK("info", "Barang di ruang buku", "Barang di ruang Perpustakaan dicatat penanggung jawabnya. Barang di Pojok Literasi (meja, rak, dan sebagainya) dicatat Staf Sarpras, karena penanggung jawabnya hanya melihat menu buku. **Rak buku perpus** dan barang lain yang belum berruang perlu ditempatkan dulu oleh Staf Sarpras."),

  /* ============================ 3 ============================ */
  H1("Memulai: Langkah Pertama Staf Sarpras"),
  P("Lakukan sekali saja, berurutan, saat aplikasi mulai dipakai."),
  OL("**Unggah BUKU INDUK.xlsx.** Buka **Buku Induk → Unggah data**, pilih berkas BUKU INDUK.xlsx lama. Periksa pratinjau, lalu tekan **Simpan**. Kantong plastik dan lap otomatis masuk ke Bahan (bagian 9).",
    "**Tambah ruang kelas.** Buka **Ruang → Unduh template**. Di Excel, tambahkan satu baris per ruang kelas (mis. Kode **RK-01**, Nama **Ruang Kelas 01**, Jenis **Ruang kelas**; pakai nama yang tetap, bukan nama rombel). Simpan, lalu **Unggah data**.",
    "**Tempatkan barang.** Buka kotak **Ruang Kelas (belum dirinci)** dan **Tanpa ruang** di denah. Buka tiap barang dan pilih ruangnya yang benar.",
    "**Lengkapi data.** Di **Buku Induk**, tekan **Unduh**. Isi kolom yang masih kosong di Excel (jumlah, tahun, harga, kode ARKAS, nomor bukti), lalu unggah kembali berkas yang sama.",
    "**Cetak dan tempel label QR** per ruang (bagian 10)."),
  KOTAK("saran", "Bagi pekerjaan dengan penanggung jawab ruang",
    "Setelah langkah 1, setiap penanggung jawab dapat melengkapi ruangnya sendiri: memeriksa jumlah dan kondisi, mencatat barang yang belum ada, dan mengisi stok bahan."),

  /* ============================ 4 ============================ */
  H1("Ringkasan"),
  P("Gambaran cepat seluruh inventaris."),
  TB(["Kotak", "Arti"], [
    ["**Jenis sarana & alat**", "Banyaknya jenis barang dan jumlah unitnya."],
    ["**Unit rusak**", "Jumlah unit rusak ringan dan rusak berat di semua ruang."],
    ["**Jenis bahan**", "Banyaknya jenis bahan, berapa yang menipis atau habis."],
    ["**Data belum lengkap**", "Banyaknya barang yang isiannya masih ada yang kosong."],
  ], [1.8, 4.2]),
  P("Bagian **Per kategori** membandingkan banyaknya barang tiap kategori (biru = sarana, emas = alat). Bagian **Isian yang masih kosong** menunjukkan isian mana yang paling banyak belum diisi. Tombol **Lengkapi** langsung membuka daftar barang yang perlu dilengkapi."),

  /* ============================ 5 ============================ */
  H1("Ruang"),
  H2("Denah ruang"),
  P("Setiap ruang tampil sebagai kotak, dikelompokkan menurut jenisnya dengan warna pita berbeda: **Laboratorium**, **Ruang layanan** (perpustakaan, UKS, BK), **Kantor**, **Ruang kelas**, dan **Lainnya**."),
  UL("Di setiap kotak: nama ruang, penanggung jawab, serta jumlah **Sarana**, **Alat**, dan **Bahan**.",
    "Tanda kecil: **rusak** (ada unit rusak), **bahan menipis**, **belum lengkap** (ada barang yang isiannya kosong), dan **Ruang saya**.",
    "Kotak merah **Tanpa ruang** muncul bila ada barang yang ruangnya belum ditentukan."),
  H2("Halaman satu ruang"),
  P("Pilih kotak untuk membuka halaman ruang. Di atasnya tampil jumlah sarana, alat, bahan, dan unit rusak. Di bawahnya ada tiga pilihan:"),
  TB(["Pilihan", "Isi", "Tombol"], [
    ["**Sarana**", "Perabot dan perlengkapan ruang.", "**Catat sarana**"],
    ["**Alat**", "Peralatan di ruang itu.", "**Catat alat**"],
    ["**Bahan**", "Bahan habis pakai yang disimpan di ruang itu, dengan tombol **Masuk** dan **Keluar**.", "**Tambah bahan**"],
  ], [1, 3.6, 1.4]),
  P("Barang baru yang dicatat dari halaman ini langsung terisi ruangnya. Tombol **Label ruang ini** membuka Label QR khusus ruang tersebut. Kembali ke denah dengan **Semua ruang**."),
  H2("Menambah dan mengubah ruang (Staf Sarpras)"),
  OL("Tekan **Tambah ruang** (atau kotak **Tambah ruang kelas**), atau **Ubah ruang** di halaman satu ruang.",
    "Isi **Kode** (1–12 huruf/angka/tanda minus, mis. RK-01), **Nama ruang**, **Jenis**, **Penanggung jawab**, dan **Status**.",
    "Tekan **Simpan**."),
  KOTAK("info", "Aturan ruang",
    "Kode ruang **tidak bisa diubah** setelah dibuat. Ruang kelas **selalu** di bawah Staf Sarpras, jadi isian penanggung jawabnya tersembunyi. Ruang yang sudah tidak dipakai diberi status **Tidak dipakai**, bukan dihapus, supaya riwayat barangnya tetap utuh.",
    "Untuk menambah banyak ruang sekaligus, pakai **Unduh template** lalu **Unggah data** (bagian 9)."),

  H2("Menyalin isi ruang ke ruang lain"),
  P("Ruang yang isinya serupa, mis. ruang kelas, tidak perlu dicatat satu per satu. Catat lengkap satu ruang, lalu salin sarana dan alatnya ke ruang lain."),
  OL("Buka ruang yang sudah lengkap isinya, lalu tekan **Salin isi ke ruang lain**.",
    "Centang **Ruang tujuan**. Boleh lebih dari satu ruang sekaligus.",
    "Centang barang yang akan disalin (**Pilih semua** untuk semuanya), lalu ubah **Jumlah di ruang tujuan** bila berbeda.",
    "Tekan **Salin**. Di bawah daftar tertulis berapa catatan baru yang akan dibuat."),
  KOTAK("info", "Hasil salinan",
    "Setiap salinan menjadi barang baru dengan **kode inventaris baru** dan kondisi **Baik**. Nama, kategori, merek, spesifikasi, tahun, sumber dana, harga, dan kode ARKAS ikut disalin; no./tanggal bukti dan keterangan tidak. Bahan habis pakai tidak ikut disalin.",
    "Jumlah yang di ruang asal **belum dihitung** tetap ditandai belum dihitung, kecuali jumlahnya diganti saat menyalin. Periksa kondisi barang di ruang tujuan lalu perbarui bila ada yang rusak."),

  H2("Memasangkan ruang kelas dengan rombel"),
  P("Ruang kelas adalah tempat yang tetap, sedangkan rombel berganti tiap tahun. Barang dan buku dicatat di **ruang**, jadi tidak perlu dipindah saat rombel berganti."),
  OL("Di denah **Ruang**, tekan **Pasangkan rombel**.", "Pilih ruang kelas untuk tiap rombel tahun ajaran aktif. Satu ruang hanya untuk satu rombel.", "Tekan **Simpan**. Rombel tampil pada kotak ruang di denah."),
  KOTAK("saran", "Setiap tahun ajaran baru", "Setelah tahun ajaran baru diaktifkan di Data Induk, buka lagi **Pasangkan rombel** dan pilih ruangnya. Pasangan tahun sebelumnya tetap tersimpan."),

  /* ============================ 6 ============================ */
  H1("Sarana & Alat"),
  H2("Daftar dan saringan"),
  P("Menampilkan seluruh barang. Cari dengan nama, kode, atau merek. Saring menurut **Golongan**, **Kategori**, **Ruang**, dan **Kelengkapan**. Kolom **Belum diisi** menyebut isian yang masih kosong; **Ruang** dan **Kode ARKAS** bertanda merah karena paling penting."),
  H2("Mencatat barang baru"),
  OL("Tekan **Catat barang** (atau **Catat sarana/alat** di halaman ruang).",
    "Isi **Nama barang**. Isi **Kode inventaris** bila barang sudah punya kode atau label; kosongkan agar dibuat otomatis. Pilih **Kategori** dan **Ruang**, lalu isi merek dan spesifikasi atau nomor seri bila ada.",
    "Isi **Jumlah menurut kondisi**: Baik, Rusak ringan, Rusak berat.",
    "Isi **Perolehan & pencatatan BOS** (lihat di bawah).",
    "Tekan **Catat**. Kode inventaris muncul di pesan dan di daftar."),
  H2("Isian perolehan dan pencatatan BOS"),
  TB(["Isian", "Keterangan"], [
    ["**Tahun perolehan**", "Tahun barang dibeli atau diterima."],
    ["**Sumber dana**", "BOS Reguler, BOS Kinerja, BOPD, Yayasan, Komite, Hibah/Sumbangan, atau Lainnya."],
    ["**Harga satuan**", "Harga per unit dalam rupiah, tanpa titik. Nilai perolehan dihitung otomatis: harga × jumlah."],
    ["**Kode rekening ARKAS**", "Hanya muncul bila sumber dananya BOS. Angka bertitik, mis. 5.1.02.01.02.0001. Ambil dari ARKAS lewat bendahara BOS."],
    ["**No. bukti BKU** dan **Tanggal bukti**", "Nomor dan tanggal bukti pembelian di Buku Kas Umum."],
  ], [1.8, 4.2]),
  KOTAK("awas", "Kode di RKAS hanya perkiraan",
    "Kode rekening yang tertulis di RKAS bersifat perkiraan. Pakai kode yang benar-benar tercatat di ARKAS untuk pembelian barang itu."),
  H2("Mengubah barang, kondisi, dan pindah ruang"),
  P("Klik baris barang untuk membuka formulirnya. Ubah isian, lalu **Simpan**. Setiap perubahan tercatat di **Riwayat** di bagian bawah formulir: siapa, kapan, dan apa yang berubah (mis. \"baik: 2 → 1; rusak ringan: 0 → 1\")."),
  UL("**Kondisi berubah**: ubah angka Baik, Rusak ringan, Rusak berat. Jumlah unit dihitung dari ketiganya.",
    "**Pindah ruang**: pilih ruang lain. Penanggung jawab hanya bisa memindah di antara ruang miliknya; pemindahan ke ruang lain dilakukan Staf Sarpras.",
    "**Jumlah belum pasti**: barang dari Excel yang jumlahnya kosong dicatat 1 dan bertanda **?**. Setelah dihitung, isi angkanya dan centang **Jumlah sudah dihitung ulang**."),
  P("Barang di ruang yang bukan tanggung jawab Anda terbuka sebagai rincian saja, tanpa tombol simpan."),
  H2("Mengatur kategori (Staf Sarpras)"),
  P("Tekan **Kategori** di menu Sarana & Alat untuk menambah kategori, mengganti nama, mengubah golongan, atau menghapus kategori yang belum dipakai. Kode kategori masuk ke kode inventaris, jadi tidak bisa diubah."),
  H2("Menghapus (Staf Sarpras)"),
  P("Tombol **Hapus** hanya untuk barang yang **salah catat atau tercatat dua kali**. Tulis alasannya. Barang hilang dari daftar, tetapi riwayatnya tetap disimpan."),
  H2("Penghapusan barang"),
  P("Barang rusak, hilang, atau tidak terpakai diusulkan lewat tombol **Usulkan penghapusan** atau menu **Penghapusan**: dibuat penanggung jawab ruang atau Staf Sarpras → **disetujui Wakasek atau Staf Sarana Prasarana** → **diketahui Kepala Sekolah** → terbit berita acara → **Hapus dari inventaris**. Unit rusak berat dikurangi lebih dulu. Foto belum bisa dilampirkan; tulis kondisinya di keterangan."),
  P("Untuk banyak barang sekaligus: di menu **Penghapusan** tekan **Template hapus barang** (berisi semua sarana dan alat), isi **Jumlah Dihapus**, **Alasan**, dan **Keterangan** pada baris yang akan dihapus, lalu tekan **Unggah hapus barang**. Semua baris dikirim sekaligus atau tidak sama sekali; tiap usulan tetap disetujui dan diketahui satu per satu. Penanggung jawab ruang (UKS, Lab Komputer, dst.) memakai cara yang sama untuk ruangnya."),

  /* ============================ 7 ============================ */
  H1("Bahan Habis Pakai"),
  P("Bahan dicatat per jenis dan per ruang penyimpanan, berupa **stok**. Setiap perubahan stok tercatat di **kartu stok**."),
  H2("Menambah bahan"),
  OL("Tekan **Tambah bahan** (di menu Bahan atau di halaman ruang, pilihan Bahan).",
    "Isi **Nama bahan**, **Kategori** (ATK, Kebersihan, Bahan praktikum, Kesehatan (UKS), Konsumsi, Lainnya), **Ruang**, **Satuan** (rim, pak, botol, buah, dst.), **Stok sekarang**, dan **Batas minimum**.",
    "Tekan **Tambah**."),
  H2("Mencatat masuk, keluar, dan hitung ulang"),
  TB(["Tombol", "Dipakai saat", "Isian"], [
    ["**Masuk**", "Bahan dibeli atau diterima", "Jumlah, sumber dana, keterangan (mis. nomor bukti BKU)"],
    ["**Keluar**", "Bahan dipakai atau diberikan", "Jumlah, keterangan (mis. dipakai kelas X-2)"],
    ["**Hitung ulang**", "Stok dihitung langsung dan ternyata berbeda", "Jumlah hasil hitung"],
  ], [1.3, 2.4, 2.8]),
  P("Stok tidak bisa kurang dari nol. Klik baris bahan untuk membuka **kartu stok**: seluruh catatan masuk, keluar, dan hitung ulang, lengkap dengan sisa setelahnya."),
  TB(["Status", "Arti"], [
    ["**Cukup**", "Stok di atas batas minimum."],
    ["**Menipis**", "Stok sama dengan atau di bawah batas minimum. Segera ajukan pembelian."],
    ["**Habis**", "Stok nol."],
  ], [1.2, 4.8]),

  /* ============================ 8 ============================ */
  H1("Buku Induk"),
  P("Buku Induk adalah daftar inventaris resmi seluruh sarana dan alat: kode, nama, kategori, ruang, jumlah dan kondisi, tahun, sumber dana, kode ARKAS, bukti BKU, harga satuan, nilai perolehan, dan keterangan. Di bawah tabel ada jumlah unit dan jumlah nilai perolehan."),
  UL("Saring menurut **Ruang**, **Golongan**, **Sumber dana**, dan **Tahun**, atau cari dengan nama, kode, dan merek.",
    "Klik baris untuk membuka formulir barang.",
    "Tekan **Unduh** untuk mendapatkan Buku Induk dalam Excel **sesuai saringan yang sedang dipakai**."),
  P("**Berkas Excel berkop.** Berkas yang diunduh memakai format standar Profil Dokumen yang sama dengan aplikasi Data Induk:"),
  UL("**Kop sekolah** dengan logo, nama, alamat, NPSN, judul **BUKU INDUK SARANA DAN PRASARANA**, dan keterangan saringan serta tanggal.",
    "Tabel dengan kepala berwarna, baris berselang, dan baris **JUMLAH** (unit dan nilai perolehan).",
    "Catatan kaki dari Profil Dokumen.",
    "Tanda tangan: kiri **Mengetahui, Kepala Sekolah**; kanan **Wakasek Sarana Prasarana**, atau **Staf Sarana Prasarana** selama jabatan Wakasek belum diisi di Data Induk.",
    "Ukuran kertas A4 mendatar, pas satu lebar halaman saat dicetak."),
  KOTAK("saran", "Berkas Buku Induk bisa diunggah kembali",
    "Unduh Buku Induk, isi kolom yang kosong di Excel, lalu unggah berkas itu di **Unggah data**. Kop, baris JUMLAH, dan tanda tangan diabaikan otomatis. Cara ini paling cepat untuk melengkapi harga, tahun, dan kode ARKAS banyak barang sekaligus."),

  /* ============================ 9 ============================ */
  H1("Unduh, Template, dan Unggah Data"),
  P("Ketiga tombol ini ada di **Ruang**, **Sarana & Alat**, **Bahan**, dan **Buku Induk**."),
  TB(["Tombol", "Hasil"], [
    ["**Unduh**", "Excel berkop berisi data yang sedang tampil: Daftar Ruang, Buku Induk, atau Stok Bahan."],
    ["**Unduh template**", "Excel kosong atau berisi data Anda, siap diisi: lembar **Data**, **Daftar** (pilihan isian), dan **Petunjuk**. Kolom berjudul merah wajib diisi."],
    ["**Unggah data**", "Membaca Excel yang sudah diisi, menampilkan pratinjau, lalu menyimpan."],
  ], [1.5, 4.5]),
  H2("Langkah mengunggah"),
  OL("Tekan **Unggah data** dan pilih berkas Excel.",
    "Periksa **pratinjau**: berapa baris baru, berapa yang diubah, dan daftar **baris yang perlu diperbaiki** (dengan nomor barisnya).",
    "Bila ada yang perlu diperbaiki, tekan **Batal**, perbaiki di Excel, lalu unggah lagi.",
    "Bila sudah benar, tekan **Simpan … baris**."),
  KOTAK("info", "Semua atau tidak sama sekali",
    "Satu unggahan disimpan seluruhnya, atau tidak sama sekali bila ada satu baris yang ditolak. Pesannya menyebut nomor baris Excel yang bermasalah. Tidak ada unggahan yang tersimpan setengah.",
    "**Sel kosong tidak menghapus** isi yang sudah ada. Untuk mengosongkan sebuah isian, ubah lewat formulir barang."),
  H2("Aturan unggah per menu"),
  TB(["Menu", "Baris dikenali sebagai", "Catatan"], [
    ["**Sarana & Alat / Buku Induk**", "**Kode Inventaris** sudah ada di inventaris → barang itu **diubah**. Kode belum ada → **barang baru dengan kode itu**. Kosong → **barang baru** dengan kode otomatis.", "Menerima template, Buku Induk berkop hasil unduhan, dan **BUKU INDUK.xlsx lama**. Berkas yang sama diunggah dua kali → baris barunya dilewati."],
    ["**Bahan**", "**Nama bahan + ruang** sama (huruf besar/kecil tidak dibedakan) → **diperbarui**. Selain itu → **bahan baru**.", "Kolom Stok yang berbeda dicatat sebagai **Hitung ulang** di kartu stok."],
    ["**Ruang**", "**Kode** sudah ada → **diubah**. Kode baru → **ruang baru**.", "Hanya Staf Sarpras."],
  ], [1.5, 2.7, 2.8]),
  P("Penanggung jawab ruang hanya bisa mengunggah barang dan bahan untuk **ruangnya sendiri**. Baris untuk ruang lain akan ditolak."),
  H2("BUKU INDUK.xlsx lama"),
  P("Berkas lama dikenali otomatis: penulisan jenis, ruang, dan dana disatukan; KODE INVENTARIS di berkas itu langsung dipakai sebagai kode inventaris; kantong plastik dan lap masuk ke **Bahan**; jumlah kosong dicatat 1 dan bertanda belum pasti."),

  /* ============================ 10 ============================ */
  H1("Label QR"),
  OL("Buka **Label QR** (atau **Label ruang ini** dari halaman ruang).",
    "Pilih **Ruang**, **Golongan**, **Ukuran**, **Isi** (QR, barkode, atau keduanya), dan **Banyak label**: satu per jenis barang, atau satu per unit (paling banyak 40 per jenis).",
    "Periksa pratinjau lembar. Jumlah label dan lembar A4 tertulis di atasnya.",
    "Tekan **Cetak**. Pilih kertas **A4**, skala **100%** (bukan \"sesuaikan dengan halaman\"), tanpa kepala dan kaki halaman peramban."),
  P("Kertas: **stiker A4 isi 24 (70 × 37 mm)** atau **isi 65 (38 × 21 mm)**. Kode inventaris panjang, jadi pada ukuran kecil lebih baik memakai QR; barkode perlu alat pemindai. Setiap label berisi kode QR, nama sekolah, nama barang, kode inventaris (dan nomor unit bila per unit), ruang, sumber dana, dan tahun."),
  P("**Memindai label.** Arahkan kamera HP ke label. Kartu barang terbuka **tanpa PIN**: nama, kategori, ruang, penanggung jawab, jumlah dan kondisi, merek, tahun, dan sumber dana. **Harga dan bukti belanja tidak ditampilkan.** Menemukan kerusakan? Sampaikan ke penanggung jawab yang tertulis di kartu. Penanggung jawab bisa menekan **Masuk untuk mengubah**."),
  KOTAK("saran", "Tips menempel label",
    "Tempel di tempat yang mudah dipindai dan tidak cepat aus: sisi belakang atau samping, bukan permukaan yang sering digosok. Untuk barang kecil sejenis (bola, kabel), cukup satu label per jenis pada wadah atau rak penyimpanannya."),

  /* ============================ 11 ============================ */
  H1("Profil Dokumen"),
  P("Menampilkan kop, identitas sekolah, dan penanda tangan yang dipakai semua unduhan Excel di aplikasi ini, sama dengan Data Induk, Kehadiran Guru, Absensi Ekskul, dan Induk Pembiayaan."),
  UL("**Pratinjau kop**: susunannya sama persis dengan yang keluar di berkas Excel.",
    "**Isian**: nama sekolah, alamat, kota tanda tangan, NPSN, kepala sekolah, berkas logo, catatan kaki.",
    "**Penanda tangan dokumen Sarpras**: Kepala Sekolah (dari Profil Dokumen) dan Wakasek atau Staf Sarana Prasarana (dari Tugas Guru).",
    "**Unduh contoh**: Buku Induk singkat untuk melihat hasil kop."),
  KOTAK("info", "Diubah di Data Induk",
    "Profil dan kop berlaku untuk seluruh aplikasi sekolah, jadi hanya diubah oleh operator **Data Induk → Profil Dokumen** yang masuk dengan akun. Tekan **Ubah di Data Induk**. Perubahan di sana langsung terpakai di sini.",
    "Nama pejabat tidak diketik di sini. Bila **Wakasek Sarana Prasarana** dipasang di **Data Induk → Tugas Guru**, namanya otomatis menggantikan Staf Sarpras di tanda tangan kanan."),

  /* ============================ 12 ============================ */
  H1("Perpustakaan"),
  P("Staf Sarpras dan admin juga dapat membuka semua menu buku. Cara memakainya ada di **Panduan Perpustakaan**; siswa memakai **Panduan Pinjam Buku untuk Siswa**. Tombol **Panduan** di kepala halaman menampilkan panduan yang sesuai dengan orang yang masuk."),
  TB(["Menu", "Isi"], [
    ["**Katalog Buku**", "Semua buku di semua lokasi; tambah, ubah, pindahkan, unduh, template, dan unggah."],
    ["**Pinjam & Kembali**", "ACC permintaan dari HP siswa, meminjamkan, menerima pengembalian, keterlambatan."],
    ["**Label Buku**", "Mencetak label punggung, QR, dan barkode."],
    ["**Penerimaan Buku**", "Pembelian dan sumbangan buku beserta sumber dananya; unduh laporan."],
  ], [1.6, 4.4]),
  P("Buku yang sudah datang otomatis tercatat di **Buku Induk** sebagai barang kategori **Buku** (BK), ruang Perpustakaan. Harga dan bukti dilengkapi di **Penerimaan Buku**, bukan di formulir barang, karena akan ditimpa saat penerimaannya diubah."),
  P("Agar seseorang menjadi pengelola buku, pasang namanya sebagai penanggung jawab ruang **Perpustakaan** atau **Pojok Literasi** di menu **Ruang**."),

  /* ============================ 13 ============================ */
  H1("Tanya Jawab"),
  TB(["Pertanyaan", "Jawaban"], [
    ["PIN saya ditolak.", "Pakai PIN pribadi yang sama dengan Matematika Dasar dan Asesmen. Bila lupa, minta admin Asesmen mengatur ulang; PIN baru langsung berlaku di sini."],
    ["Penanggung jawab tidak melihat ruangnya.", "Pasang namanya sebagai penanggung jawab ruang itu di menu **Ruang**, lalu minta ia masuk ulang."],
    ["Penanggung jawab mengeluh ruangnya kosong.", "Barang tanpa ruang tidak terlihat olehnya. Tempatkan barang lewat kotak **Tanpa ruang** di denah."],
    ["Barang perlu dipindah ke ruang lain.", "Staf Sarpras yang memindahkan: buka barangnya, lalu pilih ruang lain."],
    ["Barang rusak berat, apakah dihapus?", "Bila masih tersimpan, catat di kolom **Rusak berat**. Bila akan dikeluarkan, ajukan lewat menu **Penghapusan**. Tombol Hapus hanya untuk salah catat atau tercatat dua kali."],
    ["Tahun di kode berbeda dengan tahun perolehan.", "Kode dibuat saat barang dicatat. Bila tahunnya belum diketahui saat itu, kode memakai tahun pencatatan, dan tidak berubah walaupun tahunnya diisi kemudian."],
    ["Unggahan ditolak.", "Baca daftar **baris yang perlu diperbaiki** di pratinjau atau pesan galat; nomor baris sama dengan nomor baris di Excel. Perbaiki, lalu unggah lagi. Tidak ada yang tersimpan sebelum semuanya benar."],
    ["Saya mengunggah berkas yang sama dua kali.", "Baris barang baru dari berkas yang sama dilewati, jadi tidak tercatat dua kali. Baris yang berkode hanya mengubah isian yang berbeda."],
    ["Label QR tercetak terlalu kecil atau bergeser.", "Cetak dengan skala **100%** di kertas A4, tanpa \"sesuaikan dengan halaman\", dan matikan kepala/kaki halaman peramban."],
    ["Logo atau nama sekolah di kop salah.", "Minta operator memperbaikinya di Data Induk → Profil Dokumen."],
    ["Unduhan gagal dengan pesan ExcelJS.", "Jaringan memblokir cdnjs.cloudflare.com dan cdn.jsdelivr.net. Coba jaringan lain (mis. data seluler), atau minta keduanya dibuka. Matikan juga VPN."],
  ], [2.4, 4.6]),
];

/* ================= Penomoran judul ================= */
function nomori() { const n = [0, 0, 0];
  ISI.forEach(b => { if (!/^h[123]$/.test(b.t)) return; const k = +b.t[1] - 1; n[k]++; for (let i = k + 1; i < 3; i++) n[i] = 0;
    b.no = k === 0 ? `${n[0]}.` : n.slice(0, k + 1).join("."); b.id = "b" + n.slice(0, k + 1).join("-"); });
  DAFTAR = ISI.filter(b => b.t === "h1" || b.t === "h2"); }

/* ================= HTML untuk PDF ================= */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sebaris = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const WARNA_KOTAK = { info: ["#2F7FD8", "#E8F1FC"], saran: ["#2E9E5B", "#E7F5EC"], awas: ["#C98A12", "#FDF4E1"], bahaya: ["#D9534F", "#FBE9E8"] };
function htmlBlok(b) {
  if (b.t === "h1") return `<h1 id="${b.id}">${b.no} ${sebaris(b.s)}</h1>`;
  if (b.t === "h2") return `<h2 id="${b.id}">${b.no} ${sebaris(b.s)}</h2>`;
  if (b.t === "h3") return `<h3 id="${b.id}">${b.no} ${sebaris(b.s)}</h3>`;
  if (b.t === "p") return `<p>${sebaris(b.s)}</p>`;
  if (b.t === "ul" || b.t === "ol") return `<${b.t}>${b.a.map(x => `<li>${sebaris(x)}</li>`).join("")}</${b.t}>`;
  if (b.t === "tb") { const tot = b.lebar.reduce((a, x) => a + x, 0);
    return `<table><colgroup>${b.lebar.map(w => `<col style="width:${(w / tot * 100).toFixed(1)}%">`).join("")}</colgroup><thead><tr>${b.kepala.map(k => `<th>${sebaris(k)}</th>`).join("")}</tr></thead>
      <tbody>${b.baris.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="pertama"' : ""}>${sebaris(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`; }
  if (b.t === "kotak") { const [w, l] = WARNA_KOTAK[b.jenis];
    return `<div class="kotak" style="border-color:${w};background:${l}"><div class="kotak-judul" style="color:${w}">${sebaris(b.judul)}</div>${b.isi.map(x => `<p>${sebaris(x)}</p>`).join("")}</div>`; }
  if (b.t === "stat") return `<div class="stat">${b.a.map(([a, k]) => `<div><b>${esc(a)}</b><span>${esc(k)}</span></div>`).join("")}</div><p class="stat-ket">${esc(b.ket)}</p>`;
  throw new Error("Blok tidak dikenal: " + b.t);
}
function buatHTML() {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${JUDUL}</title><style>
  @page { size: A4; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Calibri, "Segoe UI", Carlito, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #1F2633; }
  b { font-weight: 700; }
  .sampul { height: 247mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
  .sampul .atas { font-size: 11pt; font-weight: 700; letter-spacing: .08em; color: #8F6B1A; }
  .sampul h1 { break-before: auto; font-size: 34pt; color: #1D2A3A; margin: 10px 0 6px; border: 0; padding: 0; }
  .sampul .sub { font-size: 15pt; color: #33445A; }
  .sampul .garis { height: 4px; background: linear-gradient(90deg, #1D2A3A 0 70%, #F2B92E 70%); margin: 34px 0 22px; border-radius: 2px; }
  .sampul ul { margin: 8px 0 0; } .sampul .kaki { margin-top: 70px; color: #556070; font-size: 9.5pt; }
  .daftar { break-after: page; } .daftar h1 { break-before: auto; }
  .daftar a { color: inherit; text-decoration: none; display: block; padding: 3px 0; border-bottom: 1px dotted #C9D2DE; }
  .daftar .d1 { font-weight: 700; margin-top: 8px; } .daftar .d2 { padding-left: 18px; color: #33445A; }
  h1 { break-before: page; font-size: 19pt; color: #1D2A3A; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 2.5px solid #1D2A3A; }
  h2 { font-size: 13.5pt; color: #1D2A3A; margin: 20px 0 6px; break-after: avoid; }
  h3 { font-size: 11.5pt; color: #2F6FB8; margin: 14px 0 4px; break-after: avoid; }
  p { margin: 0 0 8px; } ul, ol { margin: 0 0 10px; padding-left: 22px; } li { margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; font-size: 9.5pt; }
  th { background: #1D2A3A; color: #fff; text-align: left; padding: 6px 8px; font-weight: 700; }
  td { padding: 6px 8px; border-bottom: 1px solid #D5DCE6; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #F6F8FB; } tr { break-inside: avoid; } td.pertama { font-weight: 400; }
  .kotak { border-left: 5px solid; border-radius: 4px; padding: 10px 14px; margin: 8px 0 14px; break-inside: avoid; font-size: 9.8pt; }
  .kotak-judul { font-weight: 700; margin-bottom: 3px; } .kotak p { margin: 0 0 4px; }
  .stat { display: flex; gap: 6px; margin: 8px 0 2px; break-inside: avoid; }
  .stat div { flex: 1; background: #EEF2F7; border-radius: 6px; padding: 8px 6px; text-align: center; }
  .stat b { display: block; font-size: 17pt; color: #1D2A3A; line-height: 1.1; } .stat span { font-size: 8.5pt; color: #556070; }
  .stat-ket { text-align: center; font-size: 8.5pt; font-style: italic; color: #8A93A3; margin-bottom: 12px; }
  </style></head><body>
  <section class="sampul"><div class="atas">${MEREK}</div><h1>${JUDUL}</h1>
    <div class="sub">${SUBJUDUL}</div><div class="garis"></div>
    <p>Isi panduan ini:</p><ul>${ISI.filter(b => b.t === "h1").map(b => `<li><b>${esc(b.s)}</b></li>`).join("")}</ul>
    <div class="kaki">Untuk: ${UNTUK}<br>Versi: ${VERSI} (sesuai tampilan aplikasi per tanggal tersebut)</div></section>
  <section class="daftar"><h1>Daftar Isi</h1>${DAFTAR.map(b => `<a class="d${b.t[1]}" href="#${b.id}">${b.no} ${sebaris(b.s)}</a>`).join("")}</section>
  ${ISI.map(htmlBlok).join("\n")}
  </body></html>`;
}

/* ================= Cetak PDF lewat Chrome/Edge (DevTools Protocol) ================= */
function cariPeramban() {
  const calon = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  const ada = calon.find(p => p && fs.existsSync(p)); if (!ada) throw new Error("Chrome/Edge tidak ditemukan. Atur variabel CHROME ke lokasi chrome.exe."); return ada;
}
const tunggu = ms => new Promise(r => setTimeout(r, ms));
async function cetakPDF(berkasHTML, keluaran) {
  const port = 9300 + Math.floor(Math.random() * 500), profil = fs.mkdtempSync(path.join(os.tmpdir(), "panduan-"));
  const p = spawn(cariPeramban(), ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, "about:blank"], { stdio: "ignore" });
  try {
    let daftar;
    for (let i = 0; i < 100 && !daftar; i++) { try { daftar = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch (e) { await tunggu(150); } }
    const hal = daftar && daftar.find(x => x.type === "page"); if (!hal) throw new Error("Peramban tidak merespons.");
    const ws = new WebSocket(hal.webSocketDebuggerUrl); await new Promise((ok, gagal) => { ws.onopen = ok; ws.onerror = gagal; });
    let id = 0; const janji = new Map(), acara = [];
    ws.onmessage = m => { const x = JSON.parse(m.data); if (x.id && janji.has(x.id)) { janji.get(x.id)(x); janji.delete(x.id); } else if (x.method) acara.push(x.method); };
    const kirim = (method, params = {}) => new Promise(ok => { const k = ++id; janji.set(k, ok); ws.send(JSON.stringify({ id: k, method, params })); });
    await kirim("Page.enable");
    await kirim("Page.navigate", { url: "file:///" + berkasHTML.replace(/\\/g, "/") });
    for (let i = 0; i < 100 && !acara.includes("Page.loadEventFired"); i++) await tunggu(100);
    await kirim("Runtime.evaluate", { expression: "document.fonts.ready.then(() => 1)", awaitPromise: true });
    const gaya = "font-family:Calibri,'Segoe UI',sans-serif;font-size:8px;color:#8A93A3;width:100%;padding:0 18mm;";
    const opsi = { printBackground: true, displayHeaderFooter: true, paperWidth: 8.27, paperHeight: 11.69, marginTop: 0.75, marginBottom: 0.7, marginLeft: 0.71, marginRight: 0.71,
      headerTemplate: `<div style="${gaya}text-align:right">${JUDUL}</div>`,
      footerTemplate: `<div style="${gaya}text-align:center">Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></div>`,
      generateDocumentOutline: true, generateTaggedPDF: true };
    let r = await kirim("Page.printToPDF", opsi);
    if (r.error) { delete opsi.generateDocumentOutline; delete opsi.generateTaggedPDF; r = await kirim("Page.printToPDF", opsi); }   // Chrome lama
    if (r.error) throw new Error(r.error.message);
    fs.writeFileSync(keluaran, Buffer.from(r.result.data, "base64")); ws.close();
  } finally { p.kill(); await tunggu(400); try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) { /* biarkan */ } }
}

/* ================= Word (.docx) ================= */
async function buatDOCX(keluaran) {
  const D = require("docx");
  const LEBAR = 9638;   // lebar isi A4 dengan margin 2 cm (twip)
  const lari = (s, o = {}) => String(s).split(/(\*\*.+?\*\*)/).filter(Boolean).map(x => /^\*\*.+\*\*$/.test(x) ? new D.TextRun({ text: x.slice(2, -2), bold: true, ...o }) : new D.TextRun({ text: x, ...o }));
  const par = (s, o = {}, r = {}) => new D.Paragraph({ children: lari(s, r), spacing: { after: 120 }, ...o });
  const garis = { style: D.BorderStyle.SINGLE, size: 4, color: "D5DCE6" }, kosong = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const sel = (isi, lebar, o = {}) => new D.TableCell({ width: { size: lebar, type: D.WidthType.DXA }, margins: { top: 70, bottom: 70, left: 110, right: 110 }, children: isi, ...o });
  let nomorDaftar = 0;
  const blok = b => {
    if (b.t === "h1") return [new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, pageBreakBefore: true, children: lari(`${b.no} ${b.s}`) })];
    if (b.t === "h2") return [new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, children: lari(`${b.no} ${b.s}`) })];
    if (b.t === "h3") return [new D.Paragraph({ heading: D.HeadingLevel.HEADING_3, children: lari(`${b.no} ${b.s}`) })];
    if (b.t === "p") return [par(b.s)];
    if (b.t === "ul") return b.a.map(x => par(x, { bullet: { level: 0 }, spacing: { after: 60 } }));
    if (b.t === "ol") { const n = ++nomorDaftar; return b.a.map(x => par(x, { numbering: { reference: "angka", level: 0, instance: n }, spacing: { after: 60 } })); }
    if (b.t === "tb") { const tot = b.lebar.reduce((a, x) => a + x, 0), w = b.lebar.map(x => Math.round(x / tot * LEBAR));
      return [new D.Table({ width: { size: LEBAR, type: D.WidthType.DXA }, columnWidths: w,
        borders: { top: garis, bottom: garis, left: kosong, right: kosong, insideHorizontal: garis, insideVertical: kosong },
        rows: [new D.TableRow({ tableHeader: true, cantSplit: true, children: b.kepala.map((k, i) => sel([par(k, { spacing: { after: 0 } }, { bold: true, color: "FFFFFF", size: 19 })], w[i], { shading: { type: D.ShadingType.CLEAR, color: "auto", fill: "1D2A3A" } })) }),
          ...b.baris.map((r, j) => new D.TableRow({ cantSplit: true, children: r.map((c, i) => sel([par(c, { spacing: { after: 0 } }, { size: 19 })], w[i], j % 2 ? { shading: { type: D.ShadingType.CLEAR, color: "auto", fill: "F6F8FB" } } : {})) }))] }),
        new D.Paragraph({ spacing: { after: 120 }, children: [] })]; }
    if (b.t === "kotak") { const [w, l] = WARNA_KOTAK[b.jenis].map(x => x.slice(1));
      return [new D.Table({ width: { size: LEBAR, type: D.WidthType.DXA }, columnWidths: [LEBAR],
        borders: { top: kosong, bottom: kosong, right: kosong, left: { style: D.BorderStyle.SINGLE, size: 30, color: w }, insideHorizontal: kosong, insideVertical: kosong },
        rows: [new D.TableRow({ cantSplit: true, children: [sel([par(b.judul, { spacing: { after: 40 } }, { bold: true, color: w, size: 20 }), ...b.isi.map(x => par(x, { spacing: { after: 40 } }, { size: 19 }))], LEBAR,
          { shading: { type: D.ShadingType.CLEAR, color: "auto", fill: l }, margins: { top: 120, bottom: 120, left: 200, right: 160 } })] })] }),
        new D.Paragraph({ spacing: { after: 120 }, children: [] })]; }
    if (b.t === "stat") { const w = Math.floor(LEBAR / b.a.length), putih = { style: D.BorderStyle.SINGLE, size: 24, color: "FFFFFF" };
      return [new D.Table({ width: { size: LEBAR, type: D.WidthType.DXA }, columnWidths: b.a.map(() => w),
        borders: { top: putih, bottom: putih, left: putih, right: putih, insideHorizontal: putih, insideVertical: putih },
        rows: [new D.TableRow({ cantSplit: true, children: b.a.map(([a, k]) => sel([
          new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: a, bold: true, size: 34, color: "1D2A3A" })] }),
          new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: k, size: 16, color: "556070" })] })], w, { shading: { type: D.ShadingType.CLEAR, color: "auto", fill: "EEF2F7" } })) })] }),
        new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 40, after: 160 }, children: [new D.TextRun({ text: b.ket, italics: true, size: 16, color: "8A93A3" })] })]; }
    throw new Error("Blok tidak dikenal: " + b.t);
  };
  const sampul = [
    new D.Paragraph({ spacing: { before: 3200, after: 120 }, children: [new D.TextRun({ text: MEREK, bold: true, size: 22, color: "8F6B1A" })] }),
    new D.Paragraph({ spacing: { after: 120 }, children: [new D.TextRun({ text: JUDUL, bold: true, size: 64, color: "1D2A3A" })] }),
    new D.Paragraph({ spacing: { after: 400 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 24, color: "1D2A3A", space: 18 } },
      children: [new D.TextRun({ text: SUBJUDUL, size: 30, color: "33445A" })] }),
    par("Isi panduan ini:"),
    ...ISI.filter(b => b.t === "h1").map(b => par(`**${b.s}**`, { bullet: { level: 0 }, spacing: { after: 40 } })),
    new D.Paragraph({ spacing: { before: 1400, after: 0 }, children: [new D.TextRun({ text: "Untuk: " + UNTUK, size: 19, color: "556070" })] }),
    new D.Paragraph({ children: [new D.TextRun({ text: `Versi: ${VERSI} (sesuai tampilan aplikasi per tanggal tersebut)`, size: 19, color: "556070" })] }),
  ];
  const daftarIsi = [new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, children: [new D.TextRun("Daftar Isi")] }),
    ...DAFTAR.map(b => new D.Paragraph({ spacing: { after: 50, before: b.t === "h1" ? 140 : 0 }, indent: { left: b.t === "h1" ? 0 : 360 },
      children: lari(`${b.no} ${b.s}`, { bold: b.t === "h1", color: b.t === "h1" ? "1F2633" : "33445A" }) }))];
  const kepala = new D.Header({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: JUDUL, size: 16, color: "8A93A3" })] })] });
  const kaki = new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ children: ["Halaman ", D.PageNumber.CURRENT], size: 16, color: "8A93A3" })] })] });
  const halaman = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } };
  const doc = new D.Document({
    creator: "Sarana Prasarana", title: JUDUL, description: SUBJUDUL,
    styles: { default: { document: { run: { font: "Calibri", size: 21, color: "1F2633" }, paragraph: { spacing: { line: 276 } } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, color: "1D2A3A" },
          paragraph: { spacing: { before: 0, after: 200 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 18, color: "1D2A3A", space: 6 } } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 27, bold: true, color: "1D2A3A" }, paragraph: { spacing: { before: 320, after: 100 }, keepNext: true } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 23, bold: true, color: "2F6FB8" }, paragraph: { spacing: { before: 220, after: 80 }, keepNext: true } }] },
    numbering: { config: [{ reference: "angka", levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: "%1.", alignment: D.AlignmentType.START, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
    sections: [{ properties: halaman, children: sampul },
      { properties: halaman, headers: { default: kepala }, footers: { default: kaki }, children: [...daftarIsi, ...ISI.flatMap(blok)] }],
  });
  fs.writeFileSync(keluaran, await D.Packer.toBuffer(doc));
}

const PERAN = require("./panduan-peran.js")({ H1, H2, H3, P, UL, OL, TB, KOTAK, STAT });
const SEMUA = [{ nama: "Panduan_Sarana_Prasarana", judul: "Panduan Sarana Prasarana", sub: "Staf Sarpras dan admin: inventaris semua ruang · Buku Induk · label QR",
  untuk: "Staf Sarana Prasarana, admin, dan pimpinan", isi: ISI_STAF }, PERAN.pj, PERAN.perpus, PERAN.literasi, PERAN.siswa, PERAN.wali, PERAN.pimpinan];
(async () => {
  for (const g of SEMUA) {
    NAMA = g.nama; JUDUL = g.judul; SUBJUDUL = g.sub; UNTUK = g.untuk; ISI = g.isi; nomori();
    const html = path.join(os.tmpdir(), NAMA + ".html"); fs.writeFileSync(html, buatHTML());
    if (process.argv.includes("--html")) { fs.copyFileSync(html, path.join(AKAR, NAMA + ".html")); console.log("HTML →", NAMA + ".html"); }
    await cetakPDF(html, path.join(AKAR, NAMA + ".pdf")); console.log("PDF  →", NAMA + ".pdf");
    await buatDOCX(path.join(AKAR, NAMA + ".docx")); console.log("DOCX →", NAMA + ".docx");
  }
})().catch(e => { console.error("Gagal:", e.message); process.exit(1); });
