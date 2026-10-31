# Sarana Prasarana — Inventaris Alat & Bahan

Aplikasi inventaris sarana prasarana SMA Plus Merdeka Soreang. Rancangan dan keputusan: [../RENCANA_SARANA_PRASARANA.md](../RENCANA_SARANA_PRASARANA.md).
Alamat (setelah repositori `sarana_prasarana` dibuat di akun sekolah): https://smapmerdekasoreang99-star.github.io/sarana_prasarana/

## Isi (31 Okt 2026)

| Tab | Isi |
|---|---|
| Ringkasan | Jumlah sarana & alat, unit rusak, bahan menipis, isian yang masih kosong, per kategori |
| Ruang | **Denah kotak** per jenis ruang (laboratorium, layanan, kantor, kelas, lainnya) dengan jumlah Sarana · Alat · Bahan, tanda rusak / bahan menipis / belum lengkap. Pilih kotak → halaman ruang dengan pilihan **Sarana · Alat · Bahan**, tombol catat langsung di ruang itu, cetak label ruang |
| Sarana & Alat | Seluruh barang, saring golongan/kategori/ruang/kelengkapan, formulir + riwayat, unduh Excel (lembar Sarana & Alat + Bahan) |
| Bahan | Stok bahan habis pakai per ruang, status Cukup/Menipis/Habis, tombol Masuk/Keluar, kartu stok, hitung ulang |
| Buku Induk | Tampilan buku induk (semua kolom, jumlah unit & nilai perolehan), saring ruang/golongan/dana/tahun, **Unduh** xlsx berkop (format Profil Dokumen + tanda tangan), **Unduh template**, **Unggah data** |
| Label QR | Lembar stiker A4 3 × 8 (70 × 37 mm), per ruang/golongan, satu label per jenis atau per unit |
| Profil Dokumen | Pratinjau kop, isian profil, penanda tangan dokumen Sarpras. Dibaca dari Data Induk → Profil Dokumen (diubah di sana) |

**Unduh / Unduh template / Unggah data** ada di Ruang, Sarana & Alat, Bahan, dan Buku Induk:
- Unduhan berkop memakai `assets/kop-dokumen.js` + `assets/kepala-excel.js` (salinan sama persis dari Data Induk; `md5sum */assets/kop-dokumen.js` harus sama)
  dan ExcelJS 4.4.0 dari CDN dengan SRI (sama dengan Data Induk). Tanda tangan: kiri Kepala Sekolah (Mengetahui), kanan Wakasek Sarana Prasarana,
  atau Staf Sarana Prasarana bila Wakasek belum dipasang di Tugas Guru.
- Template: lembar Data (kolom wajib merah, pilihan daftar), Daftar, Petunjuk. Template Ruang & Bahan sudah berisi data yang ada.
- Unggah Sarana & Alat menerima template, Buku Induk berkop hasil unduhan (kop/tanda tangan diabaikan), dan BUKU INDUK.xlsx lama.
  Baris dengan Kode Inventaris yang ada = diubah (sel kosong tidak menghapus), tanpa kode = barang baru, berkas yang sama diunggah ulang = dilewati.
- Bahan dikenali dari Nama + Ruang; Stok yang berbeda dicatat sebagai Hitung ulang. Ruang: hanya Staf Sarpras.
- Satu unggahan = satu transaksi; baris yang ditolak disebut nomornya dan tidak ada yang tersimpan.

**Sarana** = perabot & perlengkapan ruang (kategori Mebel, Pelengkap ruangan). **Alat** = peralatan (kategori lain).
**Bahan** = habis pakai, dicatat stoknya (ATK, Kebersihan, Bahan praktikum, Kesehatan (UKS), Konsumsi, Lainnya).

Tahap berikutnya: lapor kerusakan & peminjaman, stok opname & penghapusan aset.

## Panduan

`Panduan_Sarana_Prasarana.pdf` dan `.docx` (16 halaman, 31 Okt 2026), dibuka lewat tombol **Panduan** di kepala halaman.
Isi panduan ada di `alat/buat-panduan.js` (mesin sama dengan Kehadiran Guru). Setelah tampilan atau aturan berubah:

```
NODE_PATH=../Tryout_Guru/node_modules node alat/buat-panduan.js
```

Jangan menulis PIN di panduan: berkasnya terbuka untuk umum.

## Hak akses (diperiksa di server)

Masuk dengan **PIN pribadi yang sama dengan Matematika Dasar dan Asesmen** (tabel `mtd_guru`), atau PIN admin Sarpras. PIN operator Tryout tidak berlaku di sini.

| Peran | Siapa | Boleh |
|---|---|---|
| Staf Sarpras (admin) | Rian Herdiansah & Piki Permana (jabatan aktif *Staf Sarana Prasarana* di Data Induk; *Wakasek Sarana Prasarana* juga), atau **PIN admin Sarpras** (`sp_privat.pin_admin`) | Semua ruang, termasuk **semua ruang kelas**; atur ruang; impor; hapus |
| Penanggung jawab ruang | Yeni (Lab Komputer), Yanti (Lab IPA), Candra (Perpustakaan), Imas (Ruang UKS); diubah di tab Ruang | Catat & ubah sarana, alat, bahan **di ruangnya sendiri**; tidak bisa memindah ke ruang lain |
| Lihat | Guru lain dengan PIN pribadi | Hanya melihat |

Label QR membuka `?k=<kode>`: kartu barang **tanpa PIN**, tanpa harga dan bukti belanja.

## Kode inventaris

`SMA-INV-<tahun>-<kategori>-<urut>`, mis. `SMA-INV-2024-O-0105`. Tahun = tahun perolehan (bila belum diketahui: tahun
pencatatan). Kode diberikan sekali dan **tidak berubah** walaupun tahun, kategori, atau ruang diubah, karena labelnya sudah
tertempel. Kode dari Excel disimpan sebagai *kode lama*.

Kategori: F Mebel · E Elektronik & TIK · L Alat praktikum lab · O Olahraga · S Kesenian & musik · K Kebersihan ·
P Pelengkap ruangan · D Dapur · U Kesehatan (UKS) · PI Ibadah.

Barang dari dana BOS punya isian **kode rekening ARKAS**, nomor & tanggal bukti BKU, dan harga satuan.
Kode rekening diambil dari ARKAS lewat bendahara; kode di RKAS hanya perkiraan.

## Berkas

| Berkas | Isi |
|---|---|
| `index.html` | Satu halaman: kartu publik (QR), masuk, lima tab |
| `assets/sarana_prasarana.js` | Seluruh logika halaman; semua data lewat fungsi `sp_*` |
| `assets/sarana_prasarana.css` | Komponen halaman; token dari `assets/dasar.css` (salinan bersama, `md5sum */assets/dasar.css` harus sama) |
| `assets/vendor/` | SheetJS 0.20.3 (impor/unduh Excel), qrcodejs 1.0.0 (label) |
| `config.js` | Alamat server Merdeka Tools (sama dengan Tryout/Matdas/ER) |

Database: `../database/supabase/migrations/20261031073716_sarpras_tahap_1_ruang_alat_riwayat_dan_akses_pin.sql`,
lanjutan `20261031083443_sarpras_admin_pin_uks_golongan_dan_bahan_habis_pakai.sql` (PIN admin, UKS, golongan, bahan) dan
`20261031092510_sarpras_profil_dokumen_dan_unggah_data_ruang_alat_bahan.sql` (sp_profil, sp_*_unggah),
kontrak `../database/kontrak/sarana_prasarana.sql`. Tabel `sp_kategori`, `sp_ruang`, `sp_alat`, `sp_riwayat`, `sp_bahan`,
`sp_bahan_gerak`, `sp_privat` hanya
bisa diakses lewat fungsi.
