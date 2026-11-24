# PROMPT AI STUDIO — Aplikasi TKA Informatika (CBT + Proktor 3D + Panel Guru)

Salin semua isi di bawah garis ini ke Google AI Studio (Build).

---

Buatkan aplikasi web **"TKA Informatika"**, yaitu ujian berbasis komputer (CBT) untuk **siswa kelas X SMKN 2 Gorontalo**. Ujian dilaksanakan **di dalam kelas dengan pengawas**, diikuti **sekitar 300 siswa secara serentak**, dengan perangkat siswa **campuran (laptop dan HP)**. Seluruh antarmuka berbahasa Indonesia. Database memakai **Google Spreadsheet**, dengan backend **Google Apps Script (web app)**.

Hasilkan dua bagian: (1) kode frontend aplikasi, dan (2) file **Code.gs** lengkap untuk Apps Script beserta langkah deploy-nya (Deploy > Web app, execute as: Me, akses: Anyone). Sertakan juga fungsi `setupSpreadsheet()` yang membuat semua sheet beserta header-nya secara otomatis.

## 1. Struktur Ujian (40 soal, durasi 90 menit)

| No. | Tipe | Cara jawab |
|---|---|---|
| 1–10 | Pilihan Ganda (PG) | Pilih 1 dari 4–5 opsi |
| 11–20 | Pilihan Ganda Kompleks | Pilih lebih dari satu jawaban benar (checkbox) |
| 21–25 | Menjodohkan | Pasangkan butir kiri dengan pilihan kanan (dropdown per baris, ramah layar HP) |
| 26–35 | Isian Singkat | Ketik jawaban singkat |
| 36–40 | Uraian | Ketik jawaban panjang (textarea) |

Soal boleh memuat teks, gambar (URL), dan potongan kode (tampilkan dengan font monospace).

## 2. Penilaian Otomatis (dilakukan di server Apps Script, bukan di browser)

Kunci jawaban **tidak pernah dikirim ke browser siswa**. Pengaturan bobot bisa diubah guru di sheet `Pengaturan`.

- **PG**: benar = bobot penuh, salah/kosong = 0.
- **PG Kompleks**: skor parsial. Rumus: `(jumlah pilihan benar yang dipilih − jumlah pilihan salah yang dipilih) / jumlah kunci`, minimum 0, dikali bobot. Mode "semua benar atau nol" tersedia sebagai opsi di Pengaturan.
- **Menjodohkan**: skor proporsional = (pasangan benar / total pasangan) × bobot.
- **Isian Singkat**: bandingkan setelah normalisasi (huruf kecil, hapus spasi berlebih, hapus tanda baca di ujung). Kunci boleh punya beberapa jawaban alternatif yang dipisah `|`. Cocok = bobot penuh.
- **Uraian**: **dinilai manual oleh guru** di panel guru dengan skala 0 sampai bobot maksimal. Tampilkan juga kunci/rubrik sebagai acuan guru. Nilai akhir otomatis dihitung ulang setelah guru memberi skor uraian.
- Nilai akhir = total skor / total bobot × 100. Rekap per siswa: skor per tipe soal, nilai akhir, jumlah pelanggaran, durasi pengerjaan.

## 3. Sheet Spreadsheet

- `Pengaturan`: judul ujian, durasi (90), bobot per tipe, mode skor PG kompleks, batas pelanggaran (3), PIN pengawas, status ujian (belum mulai/berjalan/selesai).
- `Bank_Soal`: id, no, tipe, teks, gambar_url, opsi_A..opsi_E, kunci (PG: huruf; PGK: `A,C`; Menjodohkan: JSON pasangan; Isian: jawaban dipisah `|`; Uraian: rubrik), bobot.
- `Siswa`: NIS, nama, kelas, ruang, password awal (hash).
- `Ruang`: kode ruang, nama ruang, token ujian, status mulai, jam mulai.
- `Sesi`: NIS, ruang, waktu mulai, batas waktu (server), tambahan waktu, status (belum/mengerjakan/terkunci/selesai), jumlah pelanggaran, soal terakhir, waktu aktif terakhir.
- `Jawaban`: NIS, no soal, jawaban, waktu simpan.
- `Log_Pelanggaran`: waktu, NIS, jenis pelanggaran, keterangan.
- `Nilai`: NIS, nama, kelas, skor per tipe, nilai akhir, status uraian (belum/sudah dinilai).
- `Pengguna`: akun guru dan pengawas (username, hash password, peran).

## 4. Alur Siswa

1. Login dengan NIS dan password, lalu masukkan **token ruang** yang dibagikan pengawas.
2. Layar tunggu: ujian dimulai oleh pengawas, per ruang. Aplikasi mengecek status mulai dengan jeda acak 3–8 detik (jitter), bukan serentak.
3. Setelah mulai: layar penuh (fullscreen) diminta, timer menghitung mundur **berdasarkan waktu server**, soal ditampilkan satu per satu dengan navigasi nomor (hijau = terjawab, kuning = ragu-ragu, abu = kosong).
4. **Urutan soal diacak per siswa dalam tiap tipe**, dan opsi PG/PGK juga diacak. Pengacakan memakai seed dari NIS sehingga konsisten saat siswa refresh.
5. Tombol Selesai dengan halaman konfirmasi dan ringkasan soal yang belum dijawab. Setelah submit, tampilkan pesan selesai (nilai tidak ditampilkan kecuali diaktifkan guru).
6. Jika browser tertutup atau refresh, siswa login lagi dan melanjutkan dengan sisa waktu yang benar.

## 5. Sistem Anti-Curang (lapisan pendukung, keputusan akhir ada pada pengawas)

- Wajib fullscreen; catat jika keluar fullscreen.
- Deteksi pindah tab atau jendela (`visibilitychange`, `blur`) dan catat ke `Log_Pelanggaran`.
- Nonaktifkan klik kanan, copy, paste, cut, seleksi teks soal, print, dan pintasan keyboard umum (F12, Ctrl+U, Ctrl+Shift+I, Ctrl+P).
- Peringatan bertahap: pelanggaran 1 dan 2 menampilkan peringatan; pada batas yang diatur (default 3) layar **terkunci** dan hanya bisa dibuka oleh pengawas (lewat panel pengawas atau memasukkan PIN pengawas di layar siswa).
- Satu sesi aktif per siswa: login kedua dari perangkat lain ditolak atau menggantikan sesi lama atas persetujuan pengawas.
- Fitur ini tidak boleh membuat siswa kehilangan jawaban. Selama terkunci, jawaban yang sudah ada tetap tersimpan.
- Dukungan HP: pada perangkat yang tidak mendukung fullscreen, tetap catat pindah tab/aplikasi dan tampilkan peringatan.

## 6. Avatar 3D Proktor (di layar siswa)

- Avatar proktor 3D low-poly yang ringan (Three.js atau react-three-fiber), tampil di pojok layar dengan animasi diam (bernapas dan menoleh pelan) dan balon ucapan.
- Bereaksi pada kejadian: sapaan saat mulai, peringatan saat pelanggaran ("Tetap fokus di layar ujian ya"), peringatan terakhir sebelum terkunci, pengingat sisa waktu (30, 10, 5, dan 1 menit), dan ucapan setelah selesai.
- Suara opsional memakai `speechSynthesis` bahasa Indonesia, dengan tombol mute yang aktif secara default (karena satu ruang bisa berisik).
- **Mode ringan otomatis**: jika perangkat lambat (FPS rendah) atau di HP berlayar kecil, beralih ke avatar 2D sederhana. Avatar tidak boleh memperlambat pengerjaan soal.
- Avatar tidak memakai kamera dan tidak merekam siswa.

## 7. Panel Guru dan Pengawas

Login dengan akun di sheet `Pengguna`. Peran: **guru/admin** (semua fitur) dan **pengawas** (hanya ruangnya).

- **Pantau langsung**: tabel/grid per ruang dengan status siswa (belum masuk, mengerjakan, terkunci, selesai), progres soal terjawab, jumlah pelanggaran, sisa waktu, dan waktu aktif terakhir. Warna: hijau normal, kuning peringatan, merah terkunci atau pelanggaran berulang, abu offline. Perbarui otomatis tiap 10–15 detik.
- **Kontrol pengawas**: mulai/hentikan ujian per ruang, buka kunci siswa, tambah waktu per siswa, reset sesi siswa (jika perangkat rusak), paksa submit.
- **Log pelanggaran**: daftar kronologis dengan filter per siswa, ruang, dan jenis.
- **Penilaian uraian**: tampilkan jawaban siswa, kunci/rubrik, dan input skor; simpan, lalu nilai akhir terhitung ulang otomatis.
- **Rekap nilai**: per kelas dan ruang, statistik (rata-rata, tertinggi, terendah), analisis butir soal sederhana (persentase siswa yang menjawab benar tiap soal), serta ekspor ke CSV/Excel.
- **Kelola bank soal dan siswa**: impor lewat tempel dari Spreadsheet atau CSV, dengan pratinjau sebelum disimpan.

## 8. Desain Beban untuk 300 Siswa Serentak (WAJIB diikuti)

Apps Script dan Spreadsheet punya batas eksekusi bersamaan, jadi desain harus hemat permintaan:

- **Soal dimuat sekali** saat ujian mulai lalu disimpan di browser siswa; server mengirim soal tanpa kunci. Bank soal di-cache di server dengan `CacheService`.
- **Jawaban disimpan lokal dulu** (`localStorage`) tiap kali siswa menjawab, lalu dikirim ke server secara berkelompok: setiap 5 soal terjawab atau tiap 2 menit (pilih yang lebih dulu), dan satu kali final saat submit.
- **Tanpa heartbeat rapat.** Kirim status ringan hanya tiap 60 detik atau saat ada kejadian (pelanggaran, selesai, pindah soal terjauh).
- Semua permintaan memakai **retry otomatis dengan backoff dan jitter acak**. Jika gagal, jawaban tetap aman di perangkat dan indikator status "tersimpan / menunggu koneksi" ditampilkan kepada siswa.
- Di Apps Script, penulisan ke Spreadsheet memakai **batch** (`setValues`, bukan `appendRow` berulang), dan `LockService` hanya sebentar. Hindari membaca seluruh sheet di tiap permintaan; gunakan `CacheService` dan `PropertiesService`.
- Panel guru membaca **ringkasan status** yang sudah di-cache (diperbarui oleh permintaan siswa), bukan memindai ribuan baris tiap kali.
- Mulai ujian **per ruang secara bertahap** (token dan status mulai per ruang), bukan serentak satu detik untuk 300 siswa.
- Sediakan halaman **Uji Beban** untuk guru: simulasi puluhan sesi palsu sebelum hari-H.

## 9. Keamanan dan Kualitas

- Kunci jawaban, rubrik, dan password tidak pernah dikirim ke frontend. Password disimpan sebagai hash (SHA-256 dengan salt).
- Setiap permintaan siswa membawa token sesi; server memvalidasi sehingga siswa tidak bisa mengirim jawaban atas nama orang lain atau setelah waktu habis.
- Batas waktu diterapkan di server: jawaban yang masuk setelah batas waktu (ditambah toleransi kecil) ditolak.
- Tampilan responsif (HP dan laptop), kontras tinggi, font mudah dibaca, tombol besar di HP.
- Tangani kasus: koneksi putus, refresh, baterai habis, dan siswa submit ganda.

## 10. Hasil yang Diharapkan

Berikan: kode frontend lengkap, `Code.gs` lengkap, langkah setup Spreadsheet dan deploy Apps Script, cara menghubungkan URL web app ke frontend, serta contoh data uji (10 siswa, 1 ruang, beberapa soal dari tiap tipe) agar bisa langsung dicoba.
