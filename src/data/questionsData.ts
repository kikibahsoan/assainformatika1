export type QuestionType = 'PG' | 'PGK' | 'MENJODOHKAN' | 'ISIAN' | 'URAIAN';

export interface MatchingPairItem {
  id: string; // '1', '2', '3'
  premis: string;
}

export interface MatchingOptionItem {
  id: string; // 'A', 'B', 'C', 'D'
  teks: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface QuestionFull {
  id: string;
  no: number;
  tipe: QuestionType;
  stimulus?: string;
  teks: string;
  kodeProgram?: string;
  tabel?: TableData;
  svgType?: 'KOPERASI_LINE_CHART' | 'FLOWCHART_SYMBOLS';
  gambar_url?: string;
  opsi_A?: string;
  opsi_B?: string;
  opsi_C?: string;
  opsi_D?: string;
  opsi_E?: string;
  menjodohkan_kiri?: MatchingPairItem[];
  menjodohkan_kanan?: MatchingOptionItem[];
  kunci: string; // Never sent to student browser!
  pembahasan: string; // Never sent to student browser!
  bobot: number;
}

// Public question sent to student (stripped of kunci & pembahasan)
export type QuestionClient = Omit<QuestionFull, 'kunci' | 'pembahasan'>;

export const INITIAL_QUESTIONS_FULL: QuestionFull[] = [
  // ===================== A. PILIHAN GANDA (Nomor 1-10) =====================
  {
    id: 'Q01',
    no: 1,
    tipe: 'PG',
    stimulus:
      'Bacalah ilustrasi berikut!\nSeorang nasabah memasukkan kartu ATM, mengetikkan PIN, lalu memilih nominal penarikan Rp500.000,00. Sistem perbankan memverifikasi PIN dan memeriksa kecukupan saldo di server bank sebelum mengeluarkan uang tunai dan struk transaksi.',
    teks: 'Berdasarkan model Input-Process-Output (IPO), aktivitas yang termasuk dalam tahapan Process pada ilustrasi di atas adalah ....',
    opsi_A: 'Memasukkan kartu ATM dan mengetikkan PIN',
    opsi_B: 'Mengeluarkan uang tunai Rp500.000,00 dari mesin',
    opsi_C: 'Memverifikasi PIN dan memeriksa kecukupan saldo di server',
    opsi_D: 'Mencetak struk transaksi sebagai bukti penarikan',
    opsi_E: 'Memilih nominal penarikan pada layar sentuh',
    kunci: 'C',
    pembahasan: 'Verifikasi PIN dan pemeriksaan saldo adalah pengolahan data (Process).',
    bobot: 1,
  },
  {
    id: 'Q02',
    no: 2,
    tipe: 'PG',
    stimulus:
      'Dina sedang mendengarkan musik melalui aplikasi streaming sambil membalas pesan di aplikasi chat dan mengunduh file tugas di latar belakang pada smartphone-nya tanpa mengalami hang.',
    teks: 'Fungsi utama sistem operasi yang memungkinkan seluruh aktivitas Dina berjalan bersamaan secara lancar adalah ....',
    opsi_A: 'Manajemen penyimpanan sekunder untuk mengompresi file audio',
    opsi_B: 'Manajemen proses dan penjadwalan CPU (multitasking)',
    opsi_C: 'Pengaturan antarmuka grafis agar tampilan layar lebih cerah',
    opsi_D: 'Enkripsi data jaringan untuk mempercepat sinyal seluler',
    opsi_E: 'Pemformatan otomatis memori eksternal saat aplikasi dibuka',
    kunci: 'B',
    pembahasan: 'Penjadwalan CPU dan manajemen proses memungkinkan beberapa aplikasi berjalan bersamaan (multitasking).',
    bobot: 1,
  },
  {
    id: 'Q03',
    no: 3,
    tipe: 'PG',
    stimulus:
      'OSIS ingin mengetahui tingkat kepuasan 850 siswa terhadap variasi menu dan kebersihan kantin sekolah dalam waktu 3 hari untuk dilaporkan ke kepala sekolah.',
    teks: 'Teknik pengumpulan data yang paling tepat dan efisien digunakan oleh OSIS adalah ....',
    opsi_A: 'Wawancara mendalam tatap muka kepada seluruh 850 siswa secara bergantian',
    opsi_B: 'Observasi pasif selama satu semester tanpa mencatat opini siswa',
    opsi_C: 'Penyebaran kuesioner daring (Google Form) dengan skala penilaian terstruktur',
    opsi_D: 'Studi pustaka dari buku kesehatan gizi nasional tahun sebelumnya',
    opsi_E: 'Eksperimen laboratorium terhadap sampel makanan tanpa melibatkan siswa',
    kunci: 'C',
    pembahasan: 'Kuesioner daring efisien untuk menjangkau responden besar (850 siswa) dalam waktu singkat (3 hari).',
    bobot: 1,
  },
  {
    id: 'Q04',
    no: 4,
    tipe: 'PG',
    svgType: 'KOPERASI_LINE_CHART',
    teks: 'Pengurus koperasi sekolah ingin menampilkan perkembangan tren penjualan dari bulan Januari hingga Juni agar kenaikan dan penurunan mudah diamati. Alasan paling tepat memilih diagram garis seperti pada gambar adalah ....',
    opsi_A: 'Menunjukkan proporsi persentase masing-masing barang terhadap total',
    opsi_B: 'Menggambarkan perubahan dan tren data secara kontinu dari waktu ke waktu',
    opsi_C: 'Membandingkan korelasi dua variabel acak tanpa urutan waktu',
    opsi_D: 'Menampilkan struktur hierarki pengurus koperasi sekolah',
    opsi_E: 'Menyembunyikan nilai penurunan penjualan pada bulan Maret',
    kunci: 'B',
    pembahasan: 'Diagram garis (line chart) paling efektif untuk memperlihatkan tren perubahan data dari waktu ke waktu.',
    bobot: 1,
  },
  {
    id: 'Q05',
    no: 5,
    tipe: 'PG',
    stimulus:
      'Saat mengetik laporan praktikum, Budi melakukan kesalahan berurutan: (1) menebalkan judul, (2) menghapus paragraf ke-2, lalu (3) mengubah warna huruf. Ketika Budi menekan tombol Undo (Ctrl+Z) satu kali, sistem membatalkan perubahan warna huruf terlebih dahulu.',
    teks: 'Mekanisme fitur Undo tersebut menerapkan prinsip struktur data ....',
    opsi_A: 'Queue dengan prinsip First In First Out (FIFO)',
    opsi_B: 'Stack dengan prinsip Last In First Out (LIFO)',
    opsi_C: 'Array statis dengan pengaksesan indeks acak',
    opsi_D: 'Tree dengan struktur simpul induk dan anak',
    opsi_E: 'Graph dengan hubungan antar simpul tak berarah',
    kunci: 'B',
    pembahasan: 'Aksi terakhir yang masuk adalah aksi pertama yang dibatalkan (LIFO = Stack).',
    bobot: 1,
  },
  {
    id: 'Q06',
    no: 6,
    tipe: 'PG',
    stimulus:
      'Sistem parkir otomatis mal menerapkan aturan:\n- Jika lama parkir <= 2 jam, biaya = Rp3.000.\n- Jika lama parkir > 2 jam, biaya = Rp3.000 + (lama parkir - 2) * Rp2.000.\n- Maksimal tarif harian adalah Rp15.000.',
    teks: 'Jika seorang pengunjung memarkir kendaraannya selama 6 jam, biaya parkir yang harus dibayar berdasarkan algoritma percabangan tersebut adalah ....',
    opsi_A: 'Rp8.000',
    opsi_B: 'Rp10.000',
    opsi_C: 'Rp11.000',
    opsi_D: 'Rp12.000',
    opsi_E: 'Rp15.000',
    kunci: 'C',
    pembahasan: 'Biaya = 3.000 + (6 - 2) * 2.000 = 3.000 + 8.000 = Rp11.000 (di bawah batas maksimal Rp15.000).',
    bobot: 1,
  },
  {
    id: 'Q07',
    no: 7,
    tipe: 'PG',
    stimulus:
      "Sebuah instruksi pembuatan kopi otomatis berbunyi: 'Masukkan gula secukupnya, lalu aduk sampai terasa pas.' Akibatnya, mesin pembuat kopi gagal mengeksekusi perintah tersebut.",
    teks: 'Karakteristik algoritma yang tidak terpenuhi oleh instruksi di atas adalah ....',
    opsi_A: 'Finiteness (memiliki batas akhir langkah)',
    opsi_B: 'Definiteness (langkah jelas dan tidak ambigu)',
    opsi_C: 'Input (memiliki masukan data awal)',
    opsi_D: 'Output (menghasilkan keluaran akhir)',
    opsi_E: 'Generality (dapat diterapkan pada berbagai kasus)',
    kunci: 'B',
    pembahasan: "Kata 'secukupnya' dan 'terasa pas' bersifat ambigu, melanggar sifat definiteness.",
    bobot: 1,
  },
  {
    id: 'Q08',
    no: 8,
    tipe: 'PG',
    stimulus: 'Perhatikan pseudocode simulasi menabung selama 4 minggu berikut:',
    kodeProgram: `tabungan = 0
untuk minggu = 1 sampai 4 lakukan:
  jika minggu mod 2 == 0 maka
    tabungan = tabungan + 20000
  selain itu
    tabungan = tabungan + 10000
tampilkan tabungan`,
    teks: 'Nilai akhir variabel `tabungan` yang ditampilkan oleh program tersebut adalah ....',
    opsi_A: '40000',
    opsi_B: '50000',
    opsi_C: '60000',
    opsi_D: '70000',
    opsi_E: '80000',
    kunci: 'C',
    pembahasan: 'Minggu 1 (+10.000), Minggu 2 (+20.000), Minggu 3 (+10.000), Minggu 4 (+20.000) -> Total = 60.000.',
    bobot: 1,
  },
  {
    id: 'Q09',
    no: 9,
    tipe: 'PG',
    stimulus:
      'Sistem perpustakaan menyimpan 10.000 kode buku yang sudah diurutkan secara menaik (ascending) dari B00001 hingga B10000. Pustakawan ingin mencari kode buku B07520 dengan jumlah perbandingan seminimal mungkin.',
    teks: 'Algoritma pencarian yang paling efisien untuk kasus tersebut adalah ....',
    opsi_A: 'Linear Search, karena memeriksa satu per satu dari awal hingga akhir',
    opsi_B: 'Binary Search, karena membagi rentang data menjadi dua bagian tiap langkah',
    opsi_C: 'Bubble Sort, karena menukar elemen bersebelahan hingga ditemukan',
    opsi_D: 'Selection Search, karena memilih nilai terkecil di setiap iterasi',
    opsi_E: 'Random Search, karena mengambil indeks acak sampai cocok',
    kunci: 'B',
    pembahasan: 'Data sudah terurut, sehingga Binary Search jauh lebih cepat (O(log n)) dibanding Linear Search (O(n)).',
    bobot: 1,
  },
  {
    id: 'Q10',
    no: 10,
    tipe: 'PG',
    stimulus:
      'Di sebuah laboratorium komputer, 15 siswa mengirim perintah cetak (print) ke satu printer jaringan secara hampir bersamaan. Printer harus mencetak dokumen sesuai urutan waktu pengiriman agar adil.',
    teks: 'Struktur data yang paling tepat dimanfaatkan dalam algoritma print spooler tersebut beserta alasannya adalah ....',
    opsi_A: 'Stack, agar dokumen yang paling terakhir dikirim dicetak lebih dulu',
    opsi_B: 'Queue, agar dokumen yang pertama masuk antrean dicetak pertama kali',
    opsi_C: 'Array 2 dimensi, agar semua dokumen dicetak bersamaan di satu kertas',
    opsi_D: 'Stack, karena kapasitas memori printer tidak terbatas',
    opsi_E: 'Array statis tanpa indeks, agar urutan cetak dapat diacak secara bebas',
    kunci: 'B',
    pembahasan: 'Print spooler menggunakan Queue (FIFO) agar dokumen pertama yang masuk dicetak lebih dahulu.',
    bobot: 1,
  },

  // ===================== B. PILIHAN GANDA KOMPLEKS (Nomor 11-20) =====================
  {
    id: 'Q11',
    no: 11,
    tipe: 'PGK',
    stimulus:
      'Rani memesan nasi goreng melalui aplikasi pesan-antar makanan. Ia memilih menu, memasukkan alamat pengiriman, lalu aplikasi menghitung total harga beserta ongkos kirim, mencari pengemudi terdekat, dan menampilkan estimasi waktu tiba di layar.',
    teks: 'Pilihlah lebih dari satu pernyataan yang BENAR mengenai pemetaan IPO pada kasus Rani!',
    opsi_A: 'Pemilihan menu dan alamat pengiriman termasuk komponen Input.',
    opsi_B: 'Penghitungan total harga dan pencarian pengemudi terdekat termasuk komponen Process.',
    opsi_C: 'Tampilan estimasi waktu tiba di layar termasuk komponen Output.',
    opsi_D: 'Mencari pengemudi terdekat termasuk komponen Output.',
    opsi_E: 'Alamat pengiriman yang diketik Rani termasuk komponen Process.',
    kunci: 'A,B,C',
    pembahasan: 'A (Input), B (Process), dan C (Output) benar. D seharusnya Process, E seharusnya Input.',
    bobot: 2,
  },
  {
    id: 'Q12',
    no: 12,
    tipe: 'PGK',
    stimulus:
      'Saat menyalakan laptop untuk mengerjakan tugas presentasi, berbagai proses berjalan di balik layar agar perangkat keras dan perangkat lunak dapat saling berkomunikasi.',
    teks: 'Pilihlah lebih dari satu aktivitas yang merupakan fungsi langsung dari Sistem Operasi!',
    opsi_A: 'Mengalokasikan kapasitas RAM untuk browser dan aplikasi pengolah kata.',
    opsi_B: 'Mengatur penyimpanan dan penamaan folder pada SSD/harddisk.',
    opsi_C: 'Menghubungkan perintah cetak dari aplikasi ke driver printer.',
    opsi_D: 'Menyusun kalimat kesimpulan makalah secara otomatis tanpa campur tangan manusia.',
    opsi_E: 'Mengatur hak akses login pengguna menggunakan kata sandi atau sidik jari.',
    kunci: 'A,B,C,E',
    pembahasan: 'Manajemen memori (A), manajemen file (B), manajemen perangkat I/O (C), dan keamanan akses (E) adalah fungsi OS.',
    bobot: 2,
  },
  {
    id: 'Q13',
    no: 13,
    tipe: 'PGK',
    stimulus: 'Perhatikan tabel hasil pengumpulan data pendaftar ekstrakurikuler Robotika berikut:',
    tabel: {
      headers: ['No', 'Nama Siswa', 'Kelas', 'No. HP', 'Nilai Rata-rata'],
      rows: [
        ['1', 'Andi Pratama', 'X-1', '081234567890', '88'],
        ['2', 'Siti Rahma', 'X-2', '-', '92'],
        ['3', 'Andi Pratama', 'X-1', '081234567890', '88'],
        ['4', 'Budi Santoso', 'X-3', '085678901234', '150'],
      ],
    },
    teks: 'Pilihlah lebih dari satu masalah kualitas data yang ditemukan pada tabel di atas!',
    opsi_A: 'Terdapat data duplikat pada baris nomor 1 dan nomor 3.',
    opsi_B: 'Terdapat data kosong (missing value) pada kolom No. HP milik Siti Rahma.',
    opsi_C: 'Terdapat anomali/nilai tidak valid (outlier) pada Nilai Rata-rata Budi Santoso (150).',
    opsi_D: 'Seluruh data pada tabel sudah bersih dan siap langsung dihitung rata-ratanya.',
    opsi_E: 'Format penulisan kelas pada seluruh baris tidak konsisten.',
    kunci: 'A,B,C',
    pembahasan: 'Baris 1 & 3 duplikat (A), No. HP Siti kosong (B), nilai 150 di luar skala 0-100 (C).',
    bobot: 2,
  },
  {
    id: 'Q14',
    no: 14,
    tipe: 'PGK',
    stimulus:
      'Dalam pengembangan aplikasi kasir dan navigasi web, programmer memilih struktur data yang sesuai dengan pola akses datanya.',
    teks: 'Pilihlah lebih dari satu pernyataan yang BENAR mengenai struktur data dasar!',
    opsi_A: 'Array memungkinkan akses langsung ke elemen tertentu menggunakan nomor indeks.',
    opsi_B: 'Tombol Back pada browser web menerapkan struktur data Stack (LIFO).',
    opsi_C: 'Antrean panggilan pada layanan call center menerapkan struktur data Queue (FIFO).',
    opsi_D: 'Pada Stack, elemen baru selalu ditambahkan dari bagian bawah tumpukan.',
    opsi_E: 'Pada Queue, elemen yang paling akhir masuk akan dilayani pertama kali.',
    kunci: 'A,B,C',
    pembahasan: 'A, B, dan C benar. D salah (Stack menambah di atas/top), E salah (Queue melayani yang pertama masuk).',
    bobot: 2,
  },
  {
    id: 'Q15',
    no: 15,
    tipe: 'PGK',
    stimulus:
      "Mesin cuci otomatis bekerja dengan langkah: (1) Mengisi air hingga sensor penuh, (2) Memutar tabung sebanyak 20 kali putaran, (3) Jika mode 'Keringkan' aktif maka jalankan pemerasan cepat, selain itu hentikan mesin, (4) Membunyikan alarm selesai.",
    teks: 'Pilihlah lebih dari satu analisis yang TEPAT berdasarkan cara kerja mesin cuci tersebut!',
    opsi_A: 'Langkah (2) merupakan penerapan struktur kontrol perulangan (looping).',
    opsi_B: 'Langkah (3) merupakan penerapan struktur kontrol percabangan (branching).',
    opsi_C: 'Urutan langkah (1) hingga (4) secara keseluruhan membentuk alur sekuensial.',
    opsi_D: 'Langkah (4) merupakan contoh perulangan tak terbatas (infinite loop).',
    opsi_E: 'Langkah (1) tidak memerlukan masukan sensor karena tidak ada proses IPO.',
    kunci: 'A,B,C',
    pembahasan: 'A (20 kali = looping), B (Jika... maka = branching), C (urutan 1-4 = sequential).',
    bobot: 2,
  },
  {
    id: 'Q16',
    no: 16,
    tipe: 'PGK',
    svgType: 'FLOWCHART_SYMBOLS',
    teks: 'Pilihlah lebih dari satu pernyataan yang BENAR mengenai fungsi simbol flowchart pada gambar di atas!',
    opsi_A: 'Simbol Oval (Terminator) digunakan untuk menandai awal (Mulai) dan akhir (Selesai) algoritma.',
    opsi_B: 'Simbol Jajar Genjang digunakan untuk proses masukan (Input) dan keluaran (Output).',
    opsi_C: 'Simbol Persegi Panjang digunakan untuk menyatakan proses perhitungan atau pengolahan data.',
    opsi_D: 'Simbol Belah Ketupat (Diamond) digunakan untuk menyatakan pengambilan keputusan/percabangan.',
    opsi_E: 'Simbol Persegi Panjang digunakan untuk mengakhiri seluruh aliran program.',
    kunci: 'A,B,C,D',
    pembahasan: 'A, B, C, D adalah definisi baku simbol flowchart.',
    bobot: 2,
  },
  {
    id: 'Q17',
    no: 17,
    tipe: 'PGK',
    stimulus:
      "Aturan predikat nilai:\n- Jika nilai >= 85 maka Predikat = 'A'\n- Selain itu jika nilai >= 75 maka Predikat = 'B'\n- Selain itu jika nilai >= 65 maka Predikat = 'C'\n- Selain itu Predikat = 'D'",
    teks: 'Pilihlah lebih dari satu pasangan (Nilai -> Predikat) yang BENAR sesuai aturan percabangan di atas!',
    opsi_A: "Nilai 85 -> Predikat 'A'",
    opsi_B: "Nilai 74 -> Predikat 'C'",
    opsi_C: "Nilai 65 -> Predikat 'C'",
    opsi_D: "Nilai 75 -> Predikat 'C'",
    opsi_E: "Nilai 60 -> Predikat 'D'",
    kunci: 'A,B,C,E',
    pembahasan: "85->A, 74->C, 65->C, 60->D. Nilai 75 seharusnya Predikat 'B'.",
    bobot: 2,
  },
  {
    id: 'Q18',
    no: 18,
    tipe: 'PGK',
    stimulus:
      'Daftar harga 5 alat tulis (dalam ribuan): [15, 8, 22, 5, 12]. Pemilik toko ingin mengurutkannya dari termurah ke termahal (ascending).',
    teks: 'Pilihlah lebih dari satu pernyataan yang BENAR terkait proses pengurutan data tersebut!',
    opsi_A: 'Hasil akhir pengurutan ascending adalah [5, 8, 12, 15, 22].',
    opsi_B: 'Pada Bubble Sort, nilai terbesar (22) akan berpindah ke posisi paling kanan pada akhir lintasan pertama.',
    opsi_C: 'Pada Selection Sort, nilai terkecil (5) akan dicari lalu ditukar dengan elemen posisi pertama (15) pada langkah pertama.',
    opsi_D: 'Setelah diurutkan, pencarian harga 12 dapat dilakukan menggunakan Binary Search.',
    opsi_E: 'Pengurutan ascending selalu menempatkan nilai terbesar di indeks pertama.',
    kunci: 'A,B,C,D',
    pembahasan: 'A, B, C, D benar. E salah karena ascending menempatkan nilai terkecil di indeks pertama.',
    bobot: 2,
  },
  {
    id: 'Q19',
    no: 19,
    tipe: 'PGK',
    stimulus: 'Perhatikan data simulasi Task Manager pada laptop seorang siswa yang mengeluh komputernya sangat lambat:',
    tabel: {
      headers: ['Nama Aplikasi', 'CPU (%)', 'Memori RAM (MB)', 'Status'],
      rows: [
        ['Browser (25 Tab)', '48%', '4.800 MB', 'Running'],
        ['Editor Video', '42%', '2.500 MB', 'Running'],
        ['Notepad', '1%', '15 MB', 'Running'],
        ['Total Terpakai (RAM 8 GB)', '98%', '7.850 MB', 'Kritis'],
      ],
    },
    teks: 'Pilihlah lebih dari satu simpulan dan solusi yang TEPAT berdasarkan data tabel di atas!',
    opsi_A: 'Bottleneck utama terjadi karena penggunaan RAM hampir mencapai 100% kapasitas (8 GB).',
    opsi_B: 'Menutup tab browser yang tidak diperlukan akan membebaskan memori RAM secara signifikan.',
    opsi_C: 'Menutup aplikasi Notepad adalah solusi paling efektif untuk mengatasi kelambatan.',
    opsi_D: 'Menjalankan Editor Video bersamaan dengan 25 tab browser membebani penjadwalan CPU.',
    opsi_E: 'Sistem operasi perlu melakukan manajemen memori dengan menghentikan proses tidak penting.',
    kunci: 'A,B,D,E',
    pembahasan: 'A, B, D, E benar. C salah karena Notepad hanya memakai 15 MB RAM dan 1% CPU.',
    bobot: 2,
  },
  {
    id: 'Q20',
    no: 20,
    tipe: 'PGK',
    stimulus:
      'Pengembang perangkat lunak memilih struktur data yang tepat agar aplikasi bekerja cepat dan sesuai logika pengguna.',
    teks: 'Pilihlah lebih dari satu pasangan fitur aplikasi dan struktur data yang TEPAT!',
    opsi_A: 'Daftar nilai 36 siswa dalam satu kelas untuk dihitung rata-ratanya -> Array',
    opsi_B: 'Riwayat halaman yang dikunjungi untuk tombol Back pada browser -> Stack',
    opsi_C: 'Sistem antrean pemesanan tiket konser daring berdasarkan waktu klik -> Queue',
    opsi_D: 'Fitur Undo/Redo pada aplikasi desain grafis -> Queue',
    opsi_E: 'Penyimpanan data piksel gambar (baris dan kolom) -> Array 2 Dimensi',
    kunci: 'A,B,C,E',
    pembahasan: 'A, B, C, E tepat. D salah karena Undo/Redo menggunakan Stack, bukan Queue.',
    bobot: 2,
  },

  // ===================== C. MENJODOHKAN (Nomor 21-25) =====================
  {
    id: 'Q21',
    no: 21,
    tipe: 'MENJODOHKAN',
    stimulus:
      'Jodohkan aktivitas pada sistem kasir swalayan (Lajur Kiri) dengan komponen Model IPO yang sesuai (Lajur Kanan)!',
    teks: 'Pasangkan premis 1, 2, dan 3 dengan pilihan A, B, C, atau D yang paling tepat!',
    menjodohkan_kiri: [
      { id: '1', premis: '1. Pemindaian barcode barang menggunakan scanner' },
      { id: '2', premis: '2. Penghitungan total belanja dan potongan diskon oleh sistem' },
      { id: '3', premis: '3. Pencetakan struk belanja dan tampilan total di layar' },
    ],
    menjodohkan_kanan: [
      { id: 'A', teks: 'A. Output' },
      { id: 'B', teks: 'B. Input' },
      { id: 'C', teks: 'C. Process' },
      { id: 'D', teks: 'D. Storage (Penyimpanan Permanen)' },
    ],
    kunci: JSON.stringify({ '1': 'B', '2': 'C', '3': 'A' }),
    pembahasan: '1-B (Input), 2-C (Process), 3-A (Output).',
    bobot: 3,
  },
  {
    id: 'Q22',
    no: 22,
    tipe: 'MENJODOHKAN',
    stimulus:
      'Jodohkan perangkat digital sehari-hari berikut (Lajur Kiri) dengan contoh Sistem Operasi yang sesuai (Lajur Kanan)!',
    teks: 'Pasangkan premis 1, 2, dan 3 dengan pilihan A, B, C, atau D yang paling tepat!',
    menjodohkan_kiri: [
      { id: '1', premis: '1. Smartphone kelas menengah yang bersifat open-source' },
      { id: '2', premis: '2. Server web sekolah yang membutuhkan stabilitas tinggi & gratis' },
      { id: '3', premis: '3. Perangkat iPhone dan iPad buatan Apple' },
    ],
    menjodohkan_kanan: [
      { id: 'A', teks: 'A. Linux (Ubuntu/Debian)' },
      { id: 'B', teks: 'B. Android' },
      { id: 'C', teks: 'C. iOS / iPadOS' },
      { id: 'D', teks: 'D. Microsoft Excel' },
    ],
    kunci: JSON.stringify({ '1': 'B', '2': 'A', '3': 'C' }),
    pembahasan: '1-B (Android), 2-A (Linux), 3-C (iOS/iPadOS). Microsoft Excel adalah aplikasi, bukan OS.',
    bobot: 3,
  },
  {
    id: 'Q23',
    no: 23,
    tipe: 'MENJODOHKAN',
    stimulus:
      'Jodohkan tujuan penyajian data berikut (Lajur Kiri) dengan jenis grafik/diagram yang paling sesuai (Lajur Kanan)!',
    teks: 'Pasangkan premis 1, 2, dan 3 dengan pilihan A, B, C, atau D yang paling tepat!',
    menjodohkan_kiri: [
      { id: '1', premis: '1. Menampilkan persentase pilihan jurusan siswa terhadap total 100%' },
      { id: '2', premis: '2. Membandingkan jumlah siswa tiap kelas X-1 sampai X-6' },
      { id: '3', premis: '3. Menampilkan tren suhu udara harian selama satu bulan' },
    ],
    menjodohkan_kanan: [
      { id: 'A', teks: 'A. Diagram Batang (Bar Chart)' },
      { id: 'B', teks: 'B. Diagram Lingkaran (Pie Chart)' },
      { id: 'C', teks: 'C. Diagram Garis (Line Chart)' },
      { id: 'D', teks: 'D. Flowchart' },
    ],
    kunci: JSON.stringify({ '1': 'B', '2': 'A', '3': 'C' }),
    pembahasan: '1-B (Pie Chart untuk proporsi), 2-A (Bar Chart untuk perbandingan kategori), 3-C (Line Chart untuk tren waktu).',
    bobot: 3,
  },
  {
    id: 'Q24',
    no: 24,
    tipe: 'MENJODOHKAN',
    stimulus:
      'Jodohkan skenario aktivitas sehari-hari berikut (Lajur Kiri) dengan struktur kontrol algoritma yang sesuai (Lajur Kanan)!',
    teks: 'Pasangkan premis 1, 2, dan 3 dengan pilihan A, B, C, atau D yang paling tepat!',
    menjodohkan_kiri: [
      { id: '1', premis: '1. Jika hujan turun, bawa payung; jika tidak, bawa topi' },
      { id: '2', premis: '2. Mengirim pesan pengingat tagihan ke 100 pelanggan satu per satu' },
      { id: '3', premis: '3. Membuka aplikasi, mengetik pesan, lalu menekan tombol kirim' },
    ],
    menjodohkan_kanan: [
      { id: 'A', teks: 'A. Perulangan (Looping)' },
      { id: 'B', teks: 'B. Sekuensial (Sequential)' },
      { id: 'C', teks: 'C. Percabangan (Branching)' },
      { id: 'D', teks: 'D. Pengurutan (Sorting)' },
    ],
    kunci: JSON.stringify({ '1': 'C', '2': 'A', '3': 'B' }),
    pembahasan: '1-C (Percabangan), 2-A (Perulangan), 3-B (Sekuensial).',
    bobot: 3,
  },
  {
    id: 'Q25',
    no: 25,
    tipe: 'MENJODOHKAN',
    stimulus:
      'Jodohkan istilah teknis berikut (Lajur Kiri) dengan deskripsi proses yang tepat (Lajur Kanan)!',
    teks: 'Pasangkan premis 1, 2, dan 3 dengan pilihan A, B, C, atau D yang paling tepat!',
    menjodohkan_kiri: [
      { id: '1', premis: '1. Push dan Pop' },
      { id: '2', premis: '2. Enqueue dan Dequeue' },
      { id: '3', premis: '3. Binary Search' },
    ],
    menjodohkan_kanan: [
      { id: 'A', teks: 'A. Operasi menambah dan mengeluarkan data pada Queue' },
      { id: 'B', teks: 'B. Operasi menambah dan mengambil data pada Stack' },
      { id: 'C', teks: 'C. Pencarian data terurut dengan membagi dua area pencarian' },
      { id: 'D', teks: 'D. Pencarian data acak dari indeks pertama sampai akhir' },
    ],
    kunci: JSON.stringify({ '1': 'B', '2': 'A', '3': 'C' }),
    pembahasan: '1-B (Stack: Push/Pop), 2-A (Queue: Enqueue/Dequeue), 3-C (Binary Search).',
    bobot: 3,
  },

  // ===================== D. ISIAN SINGKAT (Nomor 26-35) =====================
  {
    id: 'Q26',
    no: 26,
    tipe: 'ISIAN',
    stimulus:
      "Di gerbang sekolah, siswa menempelkan jari pada mesin fingerprint. Mesin mencocokkan pola sidik jari dengan database siswa, lalu menampilkan tulisan 'Hadir - Tepat Waktu' di layar serta mengirim notifikasi ke orang tua.",
    teks: "Berdasarkan model IPO, tampilan tulisan 'Hadir - Tepat Waktu' dan notifikasi ke orang tua termasuk dalam tahap ....",
    kunci: 'output|keluaran|output (keluaran)',
    pembahasan: 'Output (Keluaran) — Informasi hasil pemrosesan yang disajikan kepada pengguna disebut Output.',
    bobot: 2,
  },
  {
    id: 'Q27',
    no: 27,
    tipe: 'ISIAN',
    stimulus:
      'Saat Raka membuka game berat bersamaan dengan aplikasi edit foto di ponselnya, sistem operasi otomatis menutup aplikasi edit foto di latar belakang karena kapasitas memori sementara penuh.',
    teks: 'Komponen memori utama yang dikelola sistem operasi untuk menampung aplikasi yang sedang berjalan tersebut adalah ....',
    kunci: 'ram|random access memory|ram (random access memory)|memori ram',
    pembahasan: 'RAM (Random Access Memory) — RAM menyimpan data dan instruksi aplikasi yang sedang aktif berjalan.',
    bobot: 2,
  },
  {
    id: 'Q28',
    no: 28,
    tipe: 'ISIAN',
    stimulus:
      'Untuk merancang jadwal petugas penyeberangan, tim PKS berdiri di depan gerbang sekolah pukul 06.30–07.00 dan mencatat langsung jumlah sepeda motor serta mobil yang melintas setiap 5 menit.',
    teks: 'Teknik pengumpulan data dengan mengamati dan mencatat langsung objek di lapangan tersebut disebut ....',
    kunci: 'observasi|pengamatan|teknik observasi|observasi lapangan',
    pembahasan: 'Observasi — Pengamatan langsung terhadap fenomena/objek di lapangan disebut teknik observasi.',
    bobot: 2,
  },
  {
    id: 'Q29',
    no: 29,
    tipe: 'ISIAN',
    stimulus:
      "Sebelum menghitung rata-rata uang saku siswa dari hasil Google Form, panitia menghapus baris responden yang mengisi dua kali dan memperbaiki penulisan '15rb' menjadi '15000'.",
    teks: 'Tahap menghapus duplikasi dan menyeragamkan format data agar data berkualitas sebelum dianalisis disebut ....',
    kunci: 'data cleaning|pembersihan data|cleaning data|data cleansing|data cleaning (pembersihan data)',
    pembahasan: 'Data Cleaning (Pembersihan Data) — Proses memperbaiki/menghapus data duplikat, kosong, atau tidak konsisten disebut Data Cleaning.',
    bobot: 2,
  },
  {
    id: 'Q30',
    no: 30,
    tipe: 'ISIAN',
    stimulus:
      'Sebuah array bernama `suhu` menyimpan data suhu (dalam °C) dari Senin sampai Jumat: `suhu = [29, 31, 30, 32, 28]` dengan penomoran indeks dimulai dari 0.',
    teks: 'Nilai yang tersimpan pada `suhu[3]` adalah ....',
    kunci: '32|32 c|32°c',
    pembahasan: '32 — Indeks 0=29, 1=31, 2=30, 3=32, 4=28.',
    bobot: 2,
  },
  {
    id: 'Q31',
    no: 31,
    tipe: 'ISIAN',
    stimulus:
      "Sebuah tumpukan (Stack) kosong menerima urutan operasi: `Push('A')`, `Push('B')`, `Push('C')`, `Pop()`, `Push('D')`.",
    teks: 'Elemen yang berada di posisi paling atas (Top) pada Stack setelah seluruh operasi selesai adalah ....',
    kunci: "d|'d'|\"d\"|elemen d",
    pembahasan: 'D — Push A -> [A]; Push B -> [A,B]; Push C -> [A,B,C]; Pop -> [A,B]; Push D -> [A,B,D]. Top = D.',
    bobot: 2,
  },
  {
    id: 'Q32',
    no: 32,
    tipe: 'ISIAN',
    stimulus: 'Pseudocode kasir:',
    kodeProgram: 'jika total >= 100000 maka bayar = total - 15000 selain itu bayar = total',
    teks: 'Jika seorang pembeli berbelanja dengan `total = 120000`, maka nilai `bayar` yang dihasilkan adalah ....',
    kunci: '105000|105.000|rp105.000|rp105000|rp 105.000|rp 105000',
    pembahasan: '105000 (atau Rp105.000) — Karena 120000 >= 100000, maka bayar = 120000 - 15000 = 105000.',
    bobot: 2,
  },
  {
    id: 'Q33',
    no: 33,
    tipe: 'ISIAN',
    stimulus: 'Perhatikan pseudocode berikut:',
    kodeProgram: 'untuk i = 1 sampai 10 dengan langkah +2 lakukan: cetak(i)',
    teks: 'Jumlah angka yang tercetak oleh perulangan tersebut adalah sebanyak ... kali.',
    kunci: '5|5 kali|lima|lima kali',
    pembahasan: '5 — Nilai i yang dicetak: 1, 3, 5, 7, 9 -> sebanyak 5 kali.',
    bobot: 2,
  },
  {
    id: 'Q34',
    no: 34,
    tipe: 'ISIAN',
    stimulus:
      'Diberikan daftar nilai: `[40, 15, 30, 25]`. Akan dilakukan pengurutan menaik (ascending) menggunakan Selection Sort.',
    teks: 'Setelah langkah pertama (menukar nilai terkecil dengan elemen indeks pertama), susunan daftar nilai menjadi ....',
    kunci: '[15, 40, 30, 25]|[15,40,30,25]|15, 40, 30, 25|15,40,30,25|15 40 30 25',
    pembahasan: '[15, 40, 30, 25] — Nilai terkecil adalah 15, ditukar dengan elemen pertama (40) -> [15, 40, 30, 25].',
    bobot: 2,
  },
  {
    id: 'Q35',
    no: 35,
    tipe: 'ISIAN',
    stimulus:
      'Daftar nomor loker terurut: `[10, 20, 30, 40, 50, 60, 70]`. Sistem akan mencari nomor loker `60` menggunakan Binary Search.',
    teks: 'Nilai elemen tengah (middle) yang pertama kali dibandingkan oleh algoritma Binary Search adalah ....',
    kunci: '40|loker 40|nomor 40',
    pembahasan: '40 — Indeks awal=0, akhir=6, tengah=(0+6)//2 = 3 -> elemen indeks ke-3 adalah 40.',
    bobot: 2,
  },

  // ===================== E. URAIAN (Nomor 36-40) =====================
  {
    id: 'Q36',
    no: 36,
    tipe: 'URAIAN',
    stimulus:
      'Saat berkendara menuju lokasi lomba, Pak Rudi menggunakan aplikasi navigasi peta (Google Maps) di smartphone-nya sambil mengaktifkan koneksi internet dan GPS agar mendapat rute tercepat serta panduan suara.',
    teks: 'Berdasarkan studi kasus tersebut:\na. Uraikan masing-masing komponen Input, Process, dan Output yang terjadi!\nb. Jelaskan 2 (dua) peran Sistem Operasi smartphone agar aplikasi navigasi tersebut dapat berjalan dengan baik!',
    kunci: `a. Input: alamat tujuan, koordinat GPS, data lalu lintas. Process: pencarian rute tercepat & estimasi waktu tempuh. Output: tampilan rute peta di layar & panduan suara.
b. Peran OS: (1) Manajemen perangkat I/O (mengakses sensor GPS, speaker, layar sentuh, modul internet); (2) Manajemen proses & memori (mengalokasikan CPU/RAM agar aplikasi berjalan stabil tanpa crash).
Pedoman Skor Maks 7: Bagian a (3 poin: Input 1, Process 1, Output 1) + Bagian b (4 poin: 2 peran OS x 2 poin).`,
    pembahasan: 'Bagian a (3 poin) + Bagian b (4 poin) = 7 poin.',
    bobot: 7,
  },
  {
    id: 'Q37',
    no: 37,
    tipe: 'URAIAN',
    stimulus: 'Perhatikan tabel rekapitulasi jumlah siswa terlambat di SMA Nusantara berikut:',
    tabel: {
      headers: ['Bulan', 'Jumlah Siswa Terlambat', 'Penyebab Utama'],
      rows: [
        ['Agustus', '18 siswa', 'Macet jalan raya'],
        ['September', '25 siswa', 'Bangun kesiangan'],
        ['Oktober', '34 siswa', 'Hujan pagi & macet'],
        ['November', '42 siswa', 'Hujan pagi & transportasi'],
      ],
    },
    teks: 'Berdasarkan tabel di atas:\na. Analisislah tren data keterlambatan siswa dari Agustus hingga November!\nb. Tentukan jenis grafik yang paling tepat untuk menyajikan data tersebut kepada kepala sekolah dan berikan alasannya!\nc. Sebutkan 2 langkah yang harus dilakukan agar data keterlambatan harian tetap valid dan berkualitas!',
    kunci: `a. Tren meningkat konsisten setiap bulan (naik dari 18 menjadi 42 siswa, kenaikan total 24 siswa atau >133%).
b. Diagram Garis (Line Chart) karena paling efektif menunjukkan perubahan tren dari waktu ke waktu (atau Diagram Batang untuk membandingkan jumlah antarbulan).
c. (1) Pencatatan real-time menggunakan sistem digital/barcode agar tidak ada data ganda/hilang; (2) Standarisasi kategori penyebab keterlambatan & verifikasi berkala (data cleaning).
Pedoman Skor Maks 7: a (2 poin), b (2 poin), c (3 poin).`,
    pembahasan: 'a (2 poin), b (2 poin), c (3 poin) = 7 poin.',
    bobot: 7,
  },
  {
    id: 'Q38',
    no: 38,
    tipe: 'URAIAN',
    stimulus:
      "Seorang wali kelas membutuhkan program sederhana untuk memasukkan 5 nilai mata pelajaran seorang siswa, menghitung nilai rata-ratanya, lalu menampilkan status 'LULUS' jika rata-rata >= 75, atau 'REMEDIAL' jika rata-rata < 75.",
    teks: 'Rancanglah algoritma dalam bentuk pseudocode yang jelas dan terstruktur untuk menyelesaikan masalah tersebut dengan menerapkan struktur kontrol perulangan (looping) dan percabangan (branching)!',
    kunci: `Contoh Pseudocode:
MULAI
  total = 0
  UNTUK i = 1 SAMPAI 5 LAKUKAN
    INPUT nilai
    total = total + nilai
  AKHIR UNTUK
  rata_rata = total / 5
  TAMPILKAN rata_rata
  JIKA rata_rata >= 75 MAKA
    TAMPILKAN 'LULUS'
  SELAIN ITU
    TAMPILKAN 'REMEDIAL'
  AKHIR JIKA
SELESAI
Pedoman Skor Maks 7: Inisialisasi (1), Perulangan input & penjumlahan (2), Hitung rata-rata (1), Percabangan & Output benar (3).`,
    pembahasan: 'Inisialisasi (1), Perulangan (2), Rata-rata (1), Percabangan & Output (3) = 7 poin.',
    bobot: 7,
  },
  {
    id: 'Q39',
    no: 39,
    tipe: 'URAIAN',
    stimulus:
      'Skor 5 peserta lomba Informatika tercatat dalam array: `[78, 92, 65, 85, 70]`.',
    teks: 'Berdasarkan data skor tersebut:\na. Urutkan data tersebut secara menaik (ascending) dan tuliskan hasilnya!\nb. Simulasikan langkah demi langkah algoritma Binary Search untuk mencari skor `85` pada data yang sudah terurut tersebut (sebutkan indeks awal, akhir, dan tengah di tiap langkah)!',
    kunci: `a. Data terurut ascending: [65, 70, 78, 85, 92] (indeks 0 sampai 4).
b. Simulasi Binary Search target = 85:
- Langkah 1: low=0, high=4 -> mid=(0+4)//2 = 2 -> data[2]=78. Karena 85 > 78, geser low = mid + 1 = 3.
- Langkah 2: low=3, high=4 -> mid=(3+4)//2 = 3 -> data[3]=85. Data ditemukan pada indeks ke-3!
Pedoman Skor Maks 7: a (2 poin), b (5 poin: langkah 1 benar 2,5 poin, langkah 2 benar 2,5 poin).`,
    pembahasan: 'a (2 poin), b (5 poin) = 7 poin.',
    bobot: 7,
  },
  {
    id: 'Q40',
    no: 40,
    tipe: 'URAIAN',
    stimulus:
      'Sebuah puskesmas ingin mengganti sistem antrean manual menjadi sistem antrean digital. Pasien yang datang mengambil nomor antrean dan akan dipanggil oleh dokter sesuai urutan kedatangan.',
    teks: "Rancanglah solusi berbasis struktur data untuk puskesmas tersebut dengan menjawab:\na. Struktur data standar apakah yang paling tepat digunakan? Jelaskan alasannya!\nb. Tuliskan simulasi kondisi antrean (dari kosong) jika terjadi urutan kejadian: (1) Pasien 'Ani' mendaftar, (2) Pasien 'Budi' mendaftar, (3) Dokter memanggil 1 pasien, (4) Pasien 'Citra' mendaftar, (5) Dokter memanggil 1 pasien! Sebutkan nama operasi struktur data di tiap kejadian!",
    kunci: `a. Struktur data Queue (Antrean) dengan prinsip FIFO (First In First Out), karena pasien yang pertama datang harus dilayani pertama kali secara adil.
b. Simulasi:
(1) Enqueue('Ani') -> Antrean: [Ani]
(2) Enqueue('Budi') -> Antrean: [Ani, Budi]
(3) Dequeue() -> 'Ani' dipanggil -> Antrean: [Budi]
(4) Enqueue('Citra') -> Antrean: [Budi, Citra]
(5) Dequeue() -> 'Budi' dipanggil -> Antrean tersisa: [Citra]
Pedoman Skor Maks 7: a (2 poin: nama struktur data + alasan FIFO), b (5 poin: 1 poin per langkah simulasi & nama operasi).`,
    pembahasan: 'a (2 poin), b (5 poin) = 7 poin.',
    bobot: 7,
  },
];
