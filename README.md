# Sarana Prasarana — Inventaris Alat & Bahan

Aplikasi inventaris sarana prasarana SMA Plus Merdeka Soreang. Rancangan dan keputusan: [../RENCANA_SARANA_PRASARANA.md](../RENCANA_SARANA_PRASARANA.md).
Alamat (setelah repositori `sarana_prasarana` dibuat di akun sekolah): https://smapmerdekasoreang99-star.github.io/sarana_prasarana/

## Tahap 1 (31 Okt 2026)

| Bagian | Isi |
|---|---|
| Ringkasan | Jumlah jenis alat & unit, unit rusak, isian yang masih kosong, alat per kategori dan per ruang |
| Daftar Alat | Cari & saring (kategori, ruang, kelengkapan), catat barang baru, ubah, riwayat per barang, unduh Excel buku inventaris |
| Ruang | Daftar ruang + penanggung jawab. Staf Sarpras menambah/mengubah ruang |
| Label QR | Lembar stiker A4 3 × 8 (70 × 37 mm), per ruang, satu label per jenis atau per unit |
| Impor Excel | BUKU INDUK.xlsx diperiksa & dirapikan sebelum disimpan; baris yang sudah diimpor dilewati |

Tahap berikutnya: Bahan habis pakai (stok), lapor kerusakan & peminjaman, stok opname & penghapusan aset.

## Hak akses (diperiksa di server)

Masuk dengan **PIN pribadi yang sama dengan Matematika Dasar dan Asesmen** (tabel `mtd_guru`), atau PIN operator.

| Peran | Siapa | Boleh |
|---|---|---|
| Staf Sarpras (admin) | PIN operator, atau guru berjabatan aktif *Wakasek Sarana Prasarana* / *Staf Sarana Prasarana* di Data Induk | Semua ruang, termasuk **semua ruang kelas**; atur ruang; impor; hapus |
| Penanggung jawab ruang | Guru yang dipasang sebagai penanggung jawab ruang (tab Ruang) | Catat & ubah barang **di ruangnya sendiri**; tidak bisa memindah ke ruang lain |
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

Database: `../database_tryout/supabase/migrations/20261031073716_sarpras_tahap_1_ruang_alat_riwayat_dan_akses_pin.sql`,
kontrak `../database_tryout/kontrak/sarana_prasarana.sql`. Tabel `sp_kategori`, `sp_ruang`, `sp_alat`, `sp_riwayat` hanya
bisa diakses lewat fungsi.
