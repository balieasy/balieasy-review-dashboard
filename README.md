# BaliEasy Review Monitor

Dashboard privat untuk memantau Google Business Profile Balieasy. Interface Bahasa Indonesia, zona waktu Asia/Makassar, tema oranye.

## Repository GitHub

Gunakan repository **private** untuk source dashboard. Hubungkan hanya folder proyek ini, bukan seluruh folder percakapan atau folder `outputs`.

Source mencakup `app`, `components`, `hooks`, `lib`, `public`, `db`, `drizzle`, `build`, `scripts`, `tests`, `vendor`, dan konfigurasi proyek. `build` berisi plugin sumber yang diperlukan, sedangkan `dist` adalah hasil build dan tidak ikut Git.

Jangan commit JSON OAuth Google, `.dev.vars`, `.env*`, kunci enkripsi, token, file database, atau state `.wrangler`. `.gitignore` mengecualikan file tersebut. Data review dan draf tersimpan di database, bukan di repository. Clone baru memerlukan secret runtime sendiri dan tidak membawa data/koneksi Google dari komputer asal.

Menghubungkan GitHub hanya menyimpan kode; tindakan ini tidak menerbitkan dashboard atau menghubungkan Vercel, Cloudflare produksi, maupun Supabase secara otomatis.

Dashboard online: [BaliEasy Review Monitor](https://balieasy-review-dashboard.hello-balieasy.workers.dev), dengan login khusus `hello@balieasy.com` dan `esim@balieasy.com`. Hosting memakai Cloudflare Workers Free dan D1; detail ada di [CLOUDFLARE.md](./CLOUDFLARE.md). Pengguna memilih deploy manual, sehingga push GitHub belum otomatis memperbarui dashboard online. Jalur `build:cloudflare` terpisah dari preview lokal. Kedua email memakai workspace GBP BaliEasy yang sama. Koneksi sudah tersedia tanpa unggah JSON; sinkronisasi 19 lokasi pada 30 Oktober 2026 menghasilkan 1.396 review. Data diperbarui otomatis saat dibuka jika berumur minimal 15 menit; tombol Sinkronkan tetap tersedia. Draf, riwayat konten dan file bulk lokal belum dimigrasikan.

## Menghubungkan Google

1. Pastikan proyek `intense-plate-511502-n3` / `734102733223` telah disetujui dan API Google My Business, Account Management, serta Business Information aktif.
2. Buka Pengaturan pada dashboard. Pilih JSON OAuth tipe Web application. JSON hanya diterima melalui sesi pengguna terautentikasi dan dikirim ke endpoint server pada Site yang sama.
3. Pada Google Auth Platform > Clients, tambahkan redirect URI yang ditampilkan Pengaturan. JavaScript origins tidak diperlukan.
4. Klik Hubungkan akun Google, gunakan akun pengelola yang berada pada audience OAuth yang diizinkan, lalu setujui akses `business.manage`.
5. Klik Sinkronkan untuk menemukan akun, business group, dan lokasi; seluruh halaman review diambil per lokasi. Pilih lokasi melalui filter.

## Perilaku dan batasan

- Preview ditandai jelas sebagai data contoh. Nilai demo tidak ditulis ke database.
- Sinkronisasi dilakukan lewat tombol, bukan real time atau jadwal otomatis.
- Hitungan review baru menggunakan createTime review yang masih tersedia saat sinkronisasi; review dihapus Google tidak dapat direkonstruksi.
- Bulan berjalan dibandingkan sampai hari yang sama di bulan sebelumnya, menyesuaikan jumlah hari jika bulan sebelumnya lebih pendek. Bulan lampau dibandingkan sebulan penuh. Semua batas menggunakan WITA.
- Persentase pembanding nol tidak dihitung. Ringkasan rating adalah rata-rata berbobot jumlah review dari rating cabang yang diberikan Google.
- Review dengan teks/foto/video dapat tumpang tindih. Foto dan video dihitung dari reviewMediaItems yang diberikan API; ini bukan seluruh media pada galeri lokasi.
- Review belum dibalas dihitung dari tidak adanya reviewReply.comment. Balasan dapat dikirim langsung dari antrean setelah pengguna memeriksa dan menyetujui versi teksnya.
- Sync dengan pagination gagal/tidak selesai tidak mengganti snapshot cabang terakhir. Setelah seluruh halaman selesai, selisih antara review tersedia dan total Google disimpan sebagai metadata kelengkapan dan ditampilkan sebagai peringatan. Perhitungan pertumbuhan serta kategori pada lokasi tersebut bersifat sementara. Lokasi tanpa snapshot ditandai belum sinkron. Data agregat dapat bersifat parsial sampai seluruh lokasi berhasil sinkron.
- JSON config, token Google, dan snapshot review dienkripsi AES-GCM dalam D1. Kunci DATA_ENCRYPTION_KEY disediakan sebagai secret runtime Sites, tidak ada dalam source.
- Semua endpoint data memerlukan identitas Site dan memakai user ID sebagai pemilik record. Writes memvalidasi Origin. OAuth memakai PKCE dan state sekali pakai, berlaku 10 menit, terikat ke user ID.
- Cache review lebih dari 30 hari dihapus ketika endpoint data diakses. Konfigurasi OAuth dan refresh token disimpan sampai dicabut/diganti. Putuskan & hapus data mencabut token Google dan menghapus snapshot serta daftar lokasi; config OAuth tetap tersimpan.
- Audience Site tetap owner-private. Versi Cloudflare menggunakan daftar email spesifik dan workspace tim BaliEasy; versi preview/Sites tetap mempertahankan isolasi data penggunanya.

## Pengembangan

Node >=22.13.0. Ikuti skill Sites untuk install, preview, build, dan publication. Proyek memakai Vinext + D1.

- `node tests/worker-fetch.mjs` memeriksa request OAuth dan penolakan redirect melalui runtime Workers yang sebenarnya.
- `node tests/verify.mjs` memeriksa WITA, pertumbuhan, isolasi data, state OAuth/PKCE, enkripsi, pagination, media, kegagalan sync, dan business group organisasi dengan API Google mock.
- `node node_modules/typescript/bin/tsc --noEmit` untuk pemeriksaan tipe.
- Login dan pembacaan review Google sudah diuji dengan akun pemilik. Pengiriman balasan asli menunggu pengguna; jalur pengiriman diuji dengan mock API.

## Periode dan analisis

Filter periode dipakai bersama oleh Ringkasan, Tren, kategori review, dan pilihan Periode dipilih pada daftar Review. Last 7/30 days mencakup hari ini, dan dibandingkan durasi sama tepat sebelum rentang tersebut. YTD membandingkan 1 Januari sampai tanggal kini terhadap tanggal kalender yang sama pada tahun sebelumnya, dengan penyesuaian 29 Februari. Rentang manual dibanding durasi sama tepat sebelumnya. Bulan dipilih membandingkan bulan sebelumnya; bulan berjalan menggunakan tanggal yang sama. Tanggal ditampilkan eksplisit dalam WITA. Rentang terbalik/tidak valid/masa depan menampilkan error.

Rating Google dan total review Google serta backlog belum dibalas pada Ringkasan mencakup semua tanggal dan ditandai demikian. Tren menghitung rating serta balasan dari review dalam periode dipilih. Grafik per interval/kumulatif dan tabel interval memakai dataset sama; tabel tetap menampilkan jumlah per interval. Grafik memilih interval hari/7 hari/bulan sesuai panjang periode.

## Bantuan balasan

Siapkan draf balasan tersedia pada review belum dibalas. Draf menggunakan generator konteks lokal berdasarkan isi review, rating dan 18 pilihan bahasa; bukan layanan AI berbayar. Pengguna dapat mengubah gaya ramah/profesional/singkat, mengedit teks, menyimpan draf, menyetujui teks, lalu mengirim langsung dari dashboard. Endpoint kirim menggunakan Google Business Profile updateReply setelah persetujuan per draf. Draf disimpan terenkripsi dalam database.

`node tests/features.mjs` memeriksa batas periode, YTD/leap day, konsistensi grafik, dan draf balasan.

## Antrean draf dan pengiriman langsung

Menu Draf balasan mencakup semua tanggal. Siapkan semua draf menghasilkan draf lokal sesuai konteks setiap review yang belum dibalas pada snapshot pengguna, tanpa pengiriman eksternal. Draf awal tersimpan terenkripsi pada tabel settings dengan namespace user ID. Pengulangan pembuatan mempertahankan perubahan dan versi draf yang ada.

Pengiriman memerlukan versi tersimpan, status approved dan hash teks yang sesuai. Edit menghapus approval. Pengiriman mengklaim draf secara atomik untuk mencegah dua tab mengirim bersamaan, membaca review terbaru di Google, menolak jika isi review berubah atau sudah ada balasan, lalu PUT satu kali. Request tidak diulang otomatis jika hasil jaringan tidak pasti. Periksa status Google melakukan GET untuk rekonsiliasi. Hasil Google dapat berstatus PENDING; accepted tidak selalu berarti langsung terlihat publik.

Tidak ada balasan asli dikirim oleh agen saat pembangunan. Jalur PUT diuji menggunakan mock Google pada tests/replies.mjs. Draf tersimpan aktual dibuat melalui UI. Putuskan & hapus data juga menghapus draf pengguna.

## Pengiriman bulk

Pilih draf per kartu atau Pilih semua hasil untuk memilih seluruh hasil filter lintas halaman. Lokasi, status, dan pencarian menentukan cakupan pilihan; mengubah filter menghapus pilihan. Draf yang belum disimpan, sedang diproses, terkirim, atau perlu cek status tidak bisa dipilih. Versi pilihan dicatat agar perubahan di tab lain ditolak oleh server.

Tinjau & kirim membuka teks persis yang tersimpan, review asal, dan lokasi untuk seluruh pilihan. Persetujuan bulk wajib diberikan sebelum Kirim N balasan ke Google aktif. Pengiriman memproses satu review pada satu waktu melalui endpoint save/approve dan send yang sudah ada, dengan pemeriksaan review Google terbaru. Ada progres, ringkasan hasil per review, dan tombol hentikan setelah review saat ini. Tidak ada retry otomatis. Navigasi keluar menghentikan antrean setelah review saat ini; hasil terakhir dapat diperiksa lewat Muat ulang antrean.

`node tests/bulk-replies.mjs` memeriksa kelayakan, urutan request, teks/versi, kegagalan parsial, penghentian, dan penolakan pilihan duplikat dengan mock API. Tidak ada pengiriman bulk asli saat pengembangan.

## Bahasa asli reviewer

Tersedia 18 bahasa: Inggris, Indonesia, Rusia, Ukraina, Jerman, Prancis, Spanyol, Italia, Portugis, Belanda, Polandia, Turki, Mandarin sederhana, Jepang, Korea, Thailand, Vietnam, dan Arab. Draf baru memakai perkiraan bahasa teks asli setelah penanda (Original), termasuk header terjemahan Google yang dilokalkan. Penentuan menggunakan heuristik lokal berbasis aksara dan kata; hasil diberi label Perkiraan, bukan identifikasi pasti. Review pendek, ambigu, atau tanpa teks dapat tidak dikenali; pilihan default Inggris ditandai agar pengguna memilih manual. Nama reviewer tidak dipakai untuk menebak bahasa.

Pada draf lama, Ikuti bahasa asli membuat ulang template dalam bahasa yang terdeteksi; pilihan manual selalu tersedia. Pergantian bahasa mengganti template, membatalkan centang persetujuan, lalu menyimpan teks, bahasa, dan gaya secara otomatis tanpa persetujuan kirim. Setelah penyimpanan selesai, centang Pilih untuk memasukkan versi baru ke bulk. Jika penyimpanan gagal, perubahan tetap di editor dan error menjelaskan agar disimpan ulang. Untuk edit teks manual, centang Pilih menyimpan teks terbaru dengan approved=false lalu memilih versi yang tersimpan untuk bulk. Draf yang tersimpan sebelumnya tidak dimigrasi atau ditimpa otomatis. Bahasa balasan tampil dalam pratinjau bulk. Teks Arab memakai arah otomatis; aksara asli disimpan sebagai Unicode terenkripsi.

`node tests/languages.mjs` memeriksa 18 bahasa, ekstraksi teks asli, kasus tidak pasti, seluruh gaya, review keluhan, dan review tanpa teks. `tests/replies.mjs` juga memeriksa pembuatan otomatis draf Rusia, penyimpanan terenkripsi, dan penolakan kode bahasa yang tidak didukung.

## Draf hanya untuk review belum dibalas

Endpoint antrean dan UI mengeluarkan draf berstatus sent serta review yang sudah dibalas menurut snapshot terbaru. Pengiriman berhasil menghapus kartu dari state antrean segera, termasuk saat bulk. Rekonsiliasi dan pembaruan data juga memuat ulang antrean. Jika pemilik membalas langsung di Google, sinkronisasi berikutnya membuat draf tersebut tersembunyi. Catatan pengiriman tetap terenkripsi untuk mencegah pengiriman duplikat; tidak ada penghapusan balasan Google.

Tab Terkirim di halaman Draf dihapus. Riwayat ada di Review → Sudah dibalas → Semua tanggal; tombol Lihat review sudah dibalas membuka filter ini langsung. Perlu diperiksa mengecualikan status approved; Disetujui dan Semua draf tetap hanya mencakup review belum dibalas. Hasil kirim belum pasti tetap dapat diperiksa selama snapshot belum mengonfirmasi adanya balasan.

20 pemeriksaan `tests/replies.mjs` mencakup hilangnya draf setelah kirim berhasil, balasan pemilik yang ditemukan saat pemeriksaan, rekonsiliasi, serta balasan luar dashboard yang masuk pada snapshot berikutnya.

Perbaikan pilihan bulk setelah bahasa diganti diverifikasi melalui browser: template Inggris diganti ke Rusia, penyimpanan otomatis berhasil, centang Pilih aktif, dan tinjauan bulk memuat teks Rusia tersimpan. Tidak ada persetujuan kirim atau pengiriman Google dilakukan dalam pengujian ini.

## Draf natural dan variasi per review

Generator versi 3 memakai konteks layanan dan keluhan dari teks asli review, dengan dukungan balasan dalam 18 bahasa. Aktivasi, koneksi, harga, waktu tunggu, penjelasan, komunikasi, pengiriman, kunjungan kembali, serta kendala yang sudah diperbaiki diperlakukan berbeda. Inti balasan menanggapi maksimal dua poin positif atau tiga kendala yang dikenali. Durasi tunggu hanya dipakai bila tertulis eksplisit dan terikat frasa menunggu. Keluhan berbintang tinggi, negasi umum dan masalah yang sudah terselesaikan diuji secara terpisah. Pengenalan konteks dan variasi paling lengkap tersedia dalam Inggris/Indonesia; bahasa lain mempertahankan dukungan tema layanan serta tanggapan spesifik untuk aktivasi, koneksi, harga, waktu tunggu dan komunikasi. Detail yang belum dikenali ditandai agar pengguna menyesuaikan draf secara manual. Pembuka, isi, dan penutup divariasikan. Tema isi ulang, SIM/eSIM, visa, kecepatan, bantuan tim, dan rekomendasi dibaca dari kata kunci. Nama staf hanya dipakai bila disebut eksplisit dalam pola ucapan terima kasih atau bantuan; tidak disimpulkan dari nama reviewer. Rating rendah atau ungkapan keluhan menghindari kalimat positif. Review tanpa teks memakai balasan umum tanpa mengarang layanan atau transaksi. Ini generator berbasis aturan, bukan model AI generatif atau pemahaman semantik penuh; pengguna tetap harus memeriksa fakta, bahasa, dan nada.

Pembuatan dan regenerasi berjalan di server. Regenerasi memeriksa kepemilikan, versi, fingerprint review, bahasa, serta status, lalu memilih variasi yang berbeda dari draf dan catatan terkirim milik pengguna yang sama (termasuk catatan balasan terkirim). Yang dibandingkan adalah badan teks setelah sapaan dan tanda tangan diabaikan. Perbandingan ini mendeteksi duplikat teks, bukan semua kemiripan makna. Jika kombinasi kalimat yang sesuai habis, pengguna diminta mengedit manual; tidak ditambahkan nomor atau teks acak.

Variasikan draf menyimpan versi baru otomatis dan menghapus persetujuan. Perbarui draf natural memperbarui draf otomatis yang isinya masih cocok dengan generatedHash atau template versi lama. Draf yang sudah diedit atau disetujui dipertahankan. Hash dan versi generator ikut disimpan terenkripsi. Bulk menolak badan teks yang duplikat pada tinjauan maupun fungsi kirim, meskipun nama reviewer berbeda. Pengiriman tetap menunggu persetujuan pengguna.

Pengujian: tests/contextual-replies.mjs memeriksa aktivasi/penjelasan staf, keluhan rating tinggi, beberapa kendala sekaligus, durasi tunggu, masalah terselesaikan, negasi, privasi, ketidakpastian dan dukungan bahasa lain. tests/natural-replies.mjs memeriksa 30 badan teks berbeda untuk setiap bahasa pada review layanan dan review tanpa teks, konteks staf/layanan, keluhan, tidak mengarang data kontak atau transaksi, variasi stabil, dan normalisasi duplikat. tests/replies.mjs mencakup preservasi edit/approval serta regenerasi tanpa request Google.

Panduan resmi: https://support.google.com/business/answer/3474122 dan https://support.google.com/business/answer/3474050. Variasi draf meningkatkan kualitas respons tetapi bukan jaminan bebas moderasi atau pembatasan akun. Tidak ada pengiriman asli selama pengembangan fitur ini.

## Pilih bulk setelah mengedit teks

Kotak Pilih tetap aktif untuk draf draft/approved yang teks editannya tidak kosong. Jika ada perubahan lokal, klik menyimpan teks, bahasa, dan gaya terbaru menggunakan versi tersimpan dan approved=false. State editor dan parent diperbarui bersama agar pilihan menggunakan versi baru dan tidak tersapu efek dirty/busy. Pada tab Disetujui, edit yang disimpan berpindah ke Semua draf agar pilihan tetap terlihat. Mengubah filter atau pencarian secara eksplisit tetap membatalkan pilihan.

Jika simpan gagal, draf tidak dipilih dan teks lokal tetap di editor. Draft sent/sending/uncertain dan teks kosong tetap tidak bisa dipilih. Tinjauan bulk baru menampilkan versi tersimpan; persetujuan kirim tidak diberikan oleh centang Pilih. Pilih semua hasil tetap mencakup draf yang sudah tersimpan.

Alur edit teks → Pilih → simpan otomatis → tinjauan bulk dengan teks yang sama diverifikasi lewat browser tanpa mengirim balasan ke Google.


## Sorting tabel, pertumbuhan lokasi, dan tipe review

Klik salah satu dari tujuh judul kolom pada **Performa per lokasi** untuk mengurutkan: Lokasi, Rating, Total review, Review baru, Pertumbuhan, Belum dibalas, atau Status. Klik judul yang sama lagi untuk membalik arah; panah menunjukkan arah aktif. Angka diurutkan secara numerik. Data tanpa pembanding dan lokasi belum sinkron tetap di bagian akhir saat mengurutkan pertumbuhan/status.

Kartu **Pertumbuhan lokasi** menampilkan jumlah dan persentase lokasi **Bertumbuh** serta **Menurun**, mengikuti filter lokasi dan periode. Bertumbuh berarti jumlah review baru lebih banyak dibanding periode pembanding; Menurun berarti lebih sedikit. Stabil berarti sama dengan periode pembanding yang memiliki review. Jika periode pembanding nol, lokasi masuk **Tanpa pembanding**, karena persentase pertumbuhan tidak dapat dihitung. Ringkasan juga mencatat lokasi belum sinkron.

Panel **Isi review** memberi penjelasan langsung pada tiap tipe:

- **Bintang saja:** penilaian bintang tanpa teks, foto, atau video.
- **Dengan teks:** komentar tertulis, bisa disertai foto atau video.
- **Dengan foto:** minimal satu foto, dengan atau tanpa teks.
- **Dengan video:** minimal satu video, dengan atau tanpa teks.

Satu review dapat masuk beberapa tipe. Jumlah foto/video mengikuti lampiran yang tersedia dari Google.

Verifikasi: typecheck dan build berhasil; tests/location-performance.mjs memeriksa seluruh kolom sorting, arah urutan, pembanding nol, data belum sinkron, filter, dan konsistensi hitungan status. Browser memverifikasi klik tujuh kolom, pembalikan urutan total/status, serta kecocokan KPI dan status 19 lokasi.


## Pagination dan insight pelanggan

Setiap daftar data memiliki pilihan **10, 25, 50, 100, 250, atau 500 baris per halaman**, nomor halaman, tombol sebelumnya/berikutnya, serta halaman pertama/terakhir. Tersedia di tabel lokasi, review belum dibalas pada Ringkasan, daftar Review, antrean Draf, kontribusi cabang, tabel interval Tren, pratinjau bulk, hasil bulk yang perlu perhatian, dan daftar sumber insight. Kategori tetap seperti distribusi 1–5 bintang atau jenis review tidak dipotong menjadi halaman.

Mengganti filter, periode, urutan, atau jumlah baris kembali ke halaman pertama; jika hasil berkurang setelah pembaruan, halaman disesuaikan agar tidak kosong. Ukuran halaman berlaku per daftar selama tampilan tersebut terbuka. Ekspor CSV tetap mencakup semua hasil filter, bukan hanya halaman yang terlihat.

Pilihan bulk tetap berlaku lintas halaman. **Pilih semua hasil** mencakup seluruh draf yang memenuhi filter, bukan hanya halaman terbuka. Periksa semua halaman pratinjau sebelum menyetujui seluruh batch. Pagination tidak mengirim balasan. Jika ada edit draf yang belum disimpan atau sedang diproses, kontrol halaman draf dinonaktifkan sementara; simpan atau centang Pilih terlebih dahulu.

Panel **Suara pelanggan** pada Ringkasan mengikuti lokasi dan periode yang dipilih. **Yang diapresiasi** berisi review rating 4–5 tanpa indikasi keluhan yang terdeteksi. **Perlu perhatian / komplain** berisi rating 1–3 atau indikasi keluhan dalam teks, termasuk review berbintang tinggi. Tema yang terdeteksi ditampilkan beserta jumlah review dan saran tindak lanjut; klik tema lalu **Lihat review sumber** untuk memeriksa kutipannya. Tombol **Buka review** membuka halaman Review sesuai nama, lokasi, dan periode sumber.

Analisis berjalan lokal berdasarkan rating, kata kunci, dan beberapa aturan konteks/negasi. Teks asli dan terjemahan yang sudah tersedia dari Google dibaca; tidak ada layanan AI atau penerjemahan eksternal yang digunakan. Contoh masalah koneksi yang sudah berhasil diperbaiki dibedakan dari keluhan yang masih berlangsung sejauh pola teks dapat mengenalinya. Analisis ini tidak memahami semua bahasa atau konteks; hasil perlu diperiksa, dan kelompok kosong bukan jaminan tidak ada keluhan. Review tanpa teks hanya dikelompokkan dari rating tanpa mengarang penyebab. Tema dapat tumpang tindih dan jumlahnya tidak harus sama dengan jumlah review. Insight bergantung pada kelengkapan data sinkronisasi.

Verifikasi pagination/insight: tests/pagination-insights.mjs memeriksa cakupan setiap ukuran 10–500, halaman terakhir/kosong, filter tanggal/lokasi, keluhan rating tinggi, negasi, konteks masalah terselesaikan, jam operasional, dan review tanpa teks. Browser menguji 500 dari 1.353 review, reset filter, halaman lokasi/draf/tren/sumber, perlindungan edit draf, pratinjau bulk 37 draf tanpa persetujuan/kirim, serta tautan sumber ke review yang sesuai.


## Total sepanjang waktu, interval tren, dan kembali ke atas

**Total review · sepanjang waktu** hanya tampil di halaman Ringkasan, dengan **Sejak [tanggal bulan tahun]** berdasarkan review paling lama yang tersinkron untuk lokasi yang dipilih (zona WITA). Tanggal ini tidak mengikuti filter periode. Jika belum ada tanggal review, dashboard menampilkan bahwa tanggal awal belum tersedia. Angka ini memakai total review dari Google untuk seluruh riwayat lokasi yang dipilih, sejak awal hingga pembaruan data terakhir. Mengubah periode tidak mengubah total ini. Mengubah lokasi menampilkan total lokasi tersebut. Data diperbarui melalui Sinkronkan. Review baru, insight, dan tren tetap mengikuti filter periode.

Pada **Tren pertumbuhan**, pilihan **Laju pertumbuhan** menyediakan **Day / Harian**, **Week / Mingguan**, **Month / Bulanan**, dan **Quarter / Kuartalan**. Grafik, rata-rata review per interval, tabel interval, dan ekspor CSV mengikuti pilihan ini. Minggu mengikuti Senin–Minggu. Kuartal mengikuti Januari–Maret, April–Juni, Juli–September, dan Oktober–Desember. Interval dipotong pada batas awal/akhir periode; interval yang belum penuh ditandai **Parsial**. Rata-rata adalah jumlah review dibagi jumlah interval yang tampil, termasuk interval parsial.

Pembanding tetap periode yang dijelaskan di filter; interval disejajarkan berdasarkan urutan dari awal masing-masing periode. Persentase pertumbuhan utama tetap membandingkan keseluruhan periode. Jika jumlah interval pembanding berbeda, interval tambahan tetap ditampilkan pada tabel. Ekspor CSV mencakup seluruh interval sesuai pilihan, bukan hanya halaman tabel yang terlihat, dan menyertakan penanda parsial.

Tombol **Kembali ke atas** tersedia di kanan bawah seluruh halaman, termasuk Ringkasan, Review, Draf, dan Tren. Tombol ini hanya menggulir dan memindahkan fokus ke judul halaman, sehingga edit atau pilihan bulk tidak berubah. Animasi mengikuti preferensi pengurangan gerakan pada perangkat.

Verifikasi perubahan total/interval/navigasi: tests/trend-intervals.mjs memeriksa konservasi hitungan untuk keempat interval, minggu kalender, kuartal lintas tahun, Februari kabisat, batas WITA, interval parsial, interval pembanding tambahan, dan rentang harian panjang. tests/features.mjs tetap lolos. Browser memeriksa total Google tetap 1.353 saat periode berubah, jumlah titik YTD 295/43/10/4, CSV kuartal dengan total 989 vs 223, serta tombol dan fokus kembali ke atas pada empat halaman. Runtime workerd yang hilang dipulihkan dari cache npm lokal dengan SHA-512 sesuai package-lock; input dependency tidak diubah.


## Media & Posting

Menu **Media & Posting** mengelola satu lokasi Google pada satu waktu. Pilih cabang di filter lokasi. Galeri membaca media milik bisnis; foto pelanggan tidak dikelola di sini. Galeri, postingan, draf postingan, dan riwayat operasi memiliki pagination 10/25/50/100/250/500.

### Upload foto/video

1. Buka **Foto & video**, pilih JPG/PNG atau MP4, lalu periksa pratinjau, kategori, dan deskripsi.
2. Foto: 10 KB–5 MB, minimal 250 × 250 piksel. Video MP4: maksimal 75 MB dan 30 detik, minimal 720p (sisi pendek 720, sisi panjang 1.280 piksel).
3. Centang persetujuan penggunaan file, lalu klik **Upload ke Google**. Google dapat memproses atau meninjau media sebelum tampil publik.

File dikirim langsung melalui server ke upload Google dengan streaming, bukan disimpan sebagai blob dalam D1. Server memeriksa ukuran, signature, dan SHA-256 sesuai pratinjau sebelum membuat media publik. Hash upload berhasil disimpan terenkripsi untuk mencegah upload file identik yang masih ada. Gambar pratinjau video Google bukan file video asli.

### Menghapus foto/video pilihan

Buka **Media & Posting → Foto & video**, pilih lokasi, lalu centang **Pilih hapus** pada foto/video bisnis yang sudah tidak dipakai. Media tidak harus duplikat. Klik **Tinjau hapus**, periksa thumbnail, tanggal, kategori, serta lokasi. Setelah yakin, centang persetujuan lalu klik **Hapus permanen dari Google**. Klik **Batal** jika belum ingin menghapus. Maksimal 100 media per operasi.

Foto profil, logo, cover, dan media pelanggan tetap dilindungi. Server memeriksa kepemilikan, versi, dan seluruh pilihan sebelum mulai menghapus. Riwayat mencatat hasil per file; pengiriman ulang ID operasi yang sama tidak menghapus ulang. Cache performa konten diperbarui setelah penghapusan berhasil. Penghapusan berlaku pada Google dan tidak dapat dibatalkan melalui dashboard.

Validasi pembaruan: 26 pemeriksaan server dengan mock Google serta build produksi lolos, termasuk media biasa, perlindungan media, versi berubah, hasil parsial, dan pengiriman ulang. Pemeriksaan visual pembaruan belum selesai karena browser memblokir tab uji yang sebelumnya gagal dimuat. Tidak ada foto/video asli yang dihapus selama pengujian agen.

### Membersihkan duplikat

**Kandidat duplikat** memakai URL sumber yang sama atau hash file identik dari upload dashboard. Google sering tidak memberikan URL sumber media lama. Pencocokan ini tidak mengenali semua kemiripan visual dan tidak menghapus otomatis.

Untuk media lama, aktifkan **Bandingkan manual**, pilih minimal dua foto atau dua video, lalu klik **Bandingkan pilihan**. Pilih satu media yang disimpan dan periksa media lainnya sebelum menyetujui penghapusan. Untuk video, buka profil di Maps dan periksa video aslinya; gambar thumbnail yang sama bukan bukti video identik. Mode manual memakai keputusan pengguna, bukan pendeteksi visual otomatis.

Foto profil, logo, cover, dan media pelanggan dilindungi dari penghapusan di dashboard. Maksimal 100 file dihapus per operasi; pada mode kandidat duplikat atau perbandingan manual, satu salinan per kelompok wajib dipertahankan. Server memuat ulang seluruh daftar dan memeriksa versi media, termasuk media yang disimpan. Operasi penghapusan satu lokasi diserialkan lintas tab. Jika proses terputus dan kunci operasi belum selesai, penghapusan berikutnya ditahan untuk pemeriksaan manual, bukan dibuka ulang otomatis.

Penghapusan berlaku di Google dan tidak dapat dibatalkan melalui dashboard. Tidak ada media asli dihapus selama pengujian fitur ini.

### Membuat dan mengedit postingan

Buka **Postingan**, tulis update, pilih bahasa, foto opsional dan tombol tautan. Klik **Simpan draf postingan**; draf ini masih lokal dan terenkripsi. Setelah memeriksa pratinjau, centang persetujuan lalu klik **Publikasikan ke Google**.

Postingan baru memakai tipe STANDARD, maksimal 1.500 karakter. Foto postingan memerlukan URL HTTPS publik sesuai API Google; file lokal perlu diunggah melalui galeri dahulu. Klik **Gunakan di postingan** pada foto galeri untuk mengisinya. Video dapat diunggah ke galeri, tetapi editor postingan ini hanya menambahkan foto.

Klik **Edit postingan** pada daftar postingan Google untuk memperbarui postingan yang ada. Untuk STANDARD, teks, bahasa, foto, dan tombol dapat diperbarui. Saat mengedit, URL foto kosong mempertahankan seluruh lampiran lama; memilih foto baru menggantikan lampiran postingan. Postingan EVENT/OFFER diperbarui teksnya saja, dengan detail acara, penawaran, dan lampiran tetap dipertahankan. Versi Google diperiksa kembali sebelum PATCH untuk mencegah menimpa perubahan di luar dashboard.

Perubahan setelah penyimpanan harus disimpan ulang dan disetujui lagi. Hasil jaringan yang belum pasti ditahan dari pengiriman ulang otomatis; periksa riwayat dan Google dahulu. Draf dan riwayat operasi tersedia kembali setelah reload. Putuskan & hapus data juga menghapus data konten lokal.

Validasi: 20 pemeriksaan server dengan mock Google dan 22 pemeriksaan regresi antrean balasan lolos. Galeri Canggu terbaca langsung: 118 media saat pemeriksaan (100 foto dan 18 video). Pratinjau file lokal, editor postingan, dan dialog perbandingan diperiksa di browser. Upload/publikasi/penghapusan asli tidak dijalankan oleh agen; endpoint tulis diuji memakai mock. Konten tetap mengikuti pemrosesan, izin lokasi, dan kebijakan Google, tanpa jaminan peningkatan ranking Maps.

Referensi: [Upload media Google](https://developers.google.com/my-business/content/upload-photos), [Postingan Google](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts), [Ketentuan foto/video](https://support.google.com/business/answer/6103862).


## Performa jumlah konten dan kesegaran lokasi

Buka **Media & Posting → Performa konten**. Pilihan **Semua lokasi** menampilkan seluruh cabang; pilihan satu cabang membatasi seluruh angka dan tabel. Klik **Perbarui performa** untuk membaca galeri dan postingan Google. Ini hanya membaca Google dan memperbarui cache lokal; tidak mengunggah, menghapus, atau mempublikasikan konten. Sinkronisasi review tetap terpisah.

- **Total konten tersedia**: foto + video milik bisnis yang tersedia dari API, ditambah postingan berstatus LIVE. Media pelanggan dan draf lokal tidak ikut dihitung. Postingan belum LIVE ditampilkan terpisah pada tabel. Penghapusan konten dapat menurunkan total; angka ini bukan jumlah historis konten yang pernah dihapus.
- **Aktivitas periode**: media baru serta postingan LIVE yang dibuat atau terakhir diperbarui dalam 7/30/90 hari terakhir, bulan ini, atau rentang manual. Seluruh batas tanggal memakai WITA. Satu postingan dihitung sekali, meskipun diedit berulang. Ini bukan jumlah semua peristiwa edit sepanjang sejarah.
- **Konten terbaru tercatat**: tanggal/jam terbaru dari unggahan foto/video atau pembuatan/pembaruan postingan LIVE, disertai jenis konten, lokasi, dan jumlah hari kalender sejak pembaruan tersebut. Tanggal ini dan total sepanjang waktu tidak berubah ketika periode aktivitas diganti. Waktu pemeriksaan cache tidak dianggap sebagai tanggal konten fresh.
- **Lokasi perlu diperbarui**: lokasi di luar target pembaruan atau yang sudah terkonfirmasi belum memiliki konten. Target internal dapat dipilih dalam 7, 14, atau 30 hari kalender terakhir. Dalam 7 hari berarti hari ini dan enam tanggal sebelumnya. Ini merupakan target operasional BaliEasy, bukan penilaian resmi Google.

Klik judul kolom untuk mengurutkan jumlah foto/video/postingan, total, aktivitas periode, tanggal konten terakhir, atau status kesegaran. Urutan awal memprioritaskan konten lama dalam kelompok Perlu diperbarui. Tersedia pencarian, filter status, dan pagination 10/25/50/100/250/500. Klik nama lokasi untuk membuka galeri cabang tersebut.

Tanggal kosong, tidak valid, berada di masa depan, atau 1 Januari 1970 tidak dipakai sebagai bukti fresh. Foto profil/logo tanpa tanggal tetap masuk jumlah foto, tetapi tidak menentukan umur pembaruan. Jika konten lain tidak memiliki tanggal valid, status dapat menjadi **Tanggal belum lengkap**. Jika akses salah satu API gagal, hitungan yang belum diketahui memakai tanda – dan total parsial memakai ≥. Lokasi yang belum dimuat tidak dianggap memiliki nol konten.

Cache inventaris minimal disimpan terenkripsi per pengguna dan lokasi, maksimal 30 hari sejak pemeriksaan. Cache lebih dari 24 jam diberi pengingat untuk dimuat ulang. Membuka galeri atau memperbarui konten dari dashboard juga memperbarui inventaris saat pembacaan berikutnya berhasil. Putuskan & hapus data menghapus cache performa ini.

Hasil pemeriksaan awal 22 Oktober 2026: 19 lokasi terbaca, 702 konten tersedia (572 foto, 61 video, 69 postingan LIVE), dan 19 konten aktif dalam 30 hari terakhir. Konten terbaru tercatat adalah foto di eSIM & SIM Card Telkomsel Pererenan pada 21 Oktober 2026 pukul 11.06 WITA. Target 7 hari menghasilkan 1 lokasi dalam target dan 18 perlu diperbarui; target 14 hari menghasilkan 2 dalam target. Angka akan berubah setelah pembaruan data berikutnya.

Validasi: 9 pemeriksaan perhitungan periode/kesegaran dan 21 pemeriksaan server pengelolaan konten lolos, termasuk isolasi pengguna, cache terenkripsi, kedaluwarsa cache, data parsial, dan refresh tanpa penulisan ke Google. Filter periode/target, navigasi ke galeri, sorting, serta pagination diperiksa di browser dengan data asli.


## Bulk foto, video, dan postingan ke banyak lokasi

Buka **Media & Posting → Bulk konten**. Target bulk mengikuti lokasi yang dicentang di dalam bagian ini, terpisah dari filter lokasi utama. Kamu dapat memilih beberapa atau **Pilih semua lokasi**; maksimal 100 lokasi dalam satu rencana. Pilihan tetap berlaku lintas halaman. Daftar tujuan, pratinjau, serta riwayat rencana memakai pagination 10/25/50/100/250/500.

1. Pilih **Upload foto / video** untuk satu file JPG/PNG atau MP4, atau **Postingan baru** untuk satu update STANDARD dengan teks, bahasa, foto URL publik opsional, dan tombol tautan.
2. Pilih lokasi tujuan. Untuk postingan atau deskripsi media, gunakan `{{lokasi}}` agar nama cabang dimasukkan ke teks. Batas panjang diperiksa setelah nama lokasi diganti. File yang sama dikirim ke setiap lokasi; perkiraan total data upload ditampilkan.
3. Klik **Simpan & tinjau rencana**. Rencana disimpan terenkripsi dan belum ada publikasi Google. Seluruh lokasi dan versi isi diperiksa pada server.
4. Baca semua halaman pratinjau. Centang persetujuan konten, hak penggunaan, serta seluruh tujuan, lalu klik **Kirim ke N lokasi**.
5. Periksa hasil per lokasi: Diterima Google, Dilewati, Gagal, atau Hasil belum pasti. Klik **Hentikan setelah lokasi ini** untuk menghentikan sisa antrean setelah lokasi yang sedang diproses selesai.

Bulk menambahkan konten baru. Pengeditan postingan lama tetap tersedia melalui editor per lokasi. Video dikirim ke galeri bisnis; postingan baru mendukung foto melalui URL HTTPS publik. Gunakan konten yang relevan dengan cabang tujuan. Media yang diterima dan postingan yang diproses masih mengikuti peninjauan Google sebelum tampil publik.

Rencana dan hasil tersimpan per lokasi sehingga dapat dibuka kembali melalui **Rencana bulk tersimpan → Buka rencana**. Klik **Periksa status bulk** sebelum melanjutkan setelah gangguan jaringan. Untuk foto/video bulk, salinan file disimpan di IndexedDB browser hingga 30 hari saat rencana disimpan atau saat file asli dipilih untuk rencana lama. Saat **Buka rencana**, file dipulihkan otomatis tanpa memilih ulang di browser dan akun yang sama. File tidak disimpan sebagai blob di D1. Ukuran, tipe, dan SHA-256 diperiksa agar file sesuai rencana. Pengiriman file juga terikat versi operasi yang disetujui.

Lokasi yang sudah berhasil tidak dikirim ulang. File identik yang masih tersedia dan dikenal dari upload dashboard akan dilewati; ini bukan pencocokan seluruh foto/video lama berdasarkan kemiripan visual. **Ulangi yang gagal** memerlukan persetujuan lagi dan hanya mengantrekan kegagalan yang diketahui pasti. Hasil belum pasti tidak diulang; periksa profil Google. Setelah memeriksa hasil tersebut, lokasi lain yang masih menunggu dapat dilanjutkan tanpa mengirim ulang hasil yang belum pasti.

Pengiriman berjalan berurutan selama tab terbuka. Menyimpan atau membuka rencana tidak menjalankan antrean otomatis di latar belakang. Persiapan yang terputus lebih dari lima menit dapat disiapkan kembali karena tahap itu belum mempublikasikan konten. Operasi yang sudah mulai dikirim tetap diperiksa dari catatan operasi dan tidak ditebak sebagai gagal. Teks draf yang diedit di luar rencana harus diperiksa terpisah dan tidak diteruskan memakai persetujuan versi bulk lama.

Setelah berhasil, cache performa lokasi dihapus agar data lama tidak dianggap sebagai hasil publikasi terbaru. Muat ulang **Performa konten** untuk membaca media yang tersedia dan postingan yang sudah LIVE. Putuskan & hapus data juga menghapus rencana bulk lokal.

Validasi: 15 pemeriksaan bulk dengan mock Google serta 21 pemeriksaan regresi pengelolaan konten lolos. Cakupan termasuk target lintas pengguna, persetujuan dan versi, klik bersamaan, file foto dan video, duplikat, kelanjutan antrean, hasil belum pasti, dan pengulangan hanya lokasi gagal. Pilihan semua 19 lokasi dan pagination diperiksa di browser. Tidak ada rencana uji yang dipublikasikan atau file asli yang diunggah selama pengujian agen.

### Persetujuan bulk yang mudah ditemukan

Panel **3. Setujui & kirim** berada di atas daftar pratinjau. Saat rencana disimpan atau dibuka, halaman menggulir ke panel ini. Periksa konten setiap lokasi sebelum mencentang persetujuan; lalu klik **Kirim ke … lokasi**. Tombol di akhir daftar membawa kembali ke persetujuan tanpa mengirim apa pun.

Status file membedakan **File siap dan cocok dengan rencana** dan **File perlu dipilih satu kali**. File yang masih tersedia dalam tab tidak perlu dipilih ulang. Setelah reload, buka rencana tersimpan; file dipulihkan otomatis jika salinan masih tersedia. File lama yang belum pernah disimpan perlu dipilih satu kali untuk mengisi salinan browser. Membatalkan dialog pemilihan file mempertahankan file valid yang sudah dipilih. Kontrol menjelaskan alasan pengiriman belum tersedia dan tetap mengharuskan persetujuan eksplisit.

Validasi perbaikan pratinjau: 8 pemeriksaan UI persetujuan (`node tests/content-bulk-ui.mjs`), 15 pemeriksaan bulk dengan mock Google, TypeScript, dan build lolos. Rencana asli 14 lokasi dibuka kembali dan tampilan diverifikasi tanpa mengirim konten ke Google.

### File bulk tersimpan otomatis di browser

Saat rencana media disimpan, dashboard juga menyimpan file foto atau video ke browser. File untuk rencana lama disimpan setelah dipilih satu kali. Saat **Buka rencana**, salinan dipulihkan dan dicocokkan dengan ukuran, MIME, serta SHA-256 rencana, sehingga persetujuan dapat langsung dicentang tanpa membuka pemilih file. Persetujuan kirim tidak dipulihkan otomatis.

Salinan berlaku hingga 30 hari pada browser/alamat dashboard dan akun yang sama. Salinan tidak dibawa ke perangkat lain. Penyimpanan dapat gagal jika browser membatasi ruang; pesan akan menjelaskan bahwa file hanya tersedia di tab saat itu. Menghapus data browser juga menghapus salinan. **Hapus salinan browser & lepas file** menghapus salinan untuk rencana tersebut, bukan file asli di komputer. **Putuskan & hapus data** membersihkan salinan akun pada browser ini.

Validasi: 7 pemeriksaan IndexedDB di browser, termasuk foto/video setelah reload, kesamaan byte dan metadata, isolasi akun, hash yang salah, pembersihan akun dan kedaluwarsa 30 hari. Formulir bulk diuji terpisah dengan data tiruan: file dipulihkan setelah reload, persetujuan aktif, dan tombol kirim tetap memerlukan persetujuan baru. Ditambah 8 pemeriksaan persetujuan UI serta 16 pemeriksaan server dengan mock Google. Tidak ada konten asli dikirim selama pengujian.

### Error 400 pada bulk media: kategori tidak cocok

Pada percobaan nyata Canggu, Google menerima pengiriman byte tetapi menolak tahap penerbitan dengan `Photo tag 'product' does not apply to this location`. Kategori Produk tidak didukung lokasi itu. Dashboard kini menampilkan tahap error dan rincian validasi Google, termasuk format error lama Business Profile; nilai referensi upload mentah tidak ditampilkan.

Untuk rencana foto/video yang seluruh lokasinya masih menunggu atau gagal, **Ubah ke Foto / video tambahan** memperbarui kategori di rencana lokal. File, hash, deskripsi, dan tujuan tetap sama. Versi rencana bertambah dan persetujuan dibatalkan; tidak ada publikasi saat mengubah kategori. Kategori ditampilkan pada pratinjau setiap lokasi. Operasi aktif, berhasil, atau belum pasti tidak dapat diganti kategorinya melalui tombol ini.

**Kirim ke 1 lokasi dulu** mengirim hanya satu lokasi yang menunggu. **Coba ulang 1 lokasi** mencoba satu lokasi gagal yang dipilih pertama, tanpa menjadwalkan ulang kegagalan lain. Setelah penolakan 400/401/403/429, antrean dihentikan agar kesalahan yang sama tidak diulang ke seluruh tujuan. Lokasi lain dapat dilanjutkan setelah masalah diselesaikan dan persetujuan diperbarui.

Request byte memakai `uploadType=media`, panjang byte yang diketahui (FixedLengthStream pada Workers), serta resource name dengan segmen path utuh. Rujukan: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.media dan https://developers.google.com/my-business/content/upload-photos.

Validasi perbaikan kategori: 19 pemeriksaan bulk, 21 pengelolaan konten, 8 persetujuan UI, 4 pemformatan error, TypeScript dan build. Mock memverifikasi penolakan kategori Produk, pembaruan lokal, persetujuan versi baru, file tetap sama, serta penerbitan kategori tambahan. Pada rencana asli, hanya Canggu dicoba ulang untuk memperoleh pesan detail; Google menolaknya, lalu kategori 14 lokasi disiapkan ulang sebagai Foto / video tambahan tanpa menerbitkan media baru. Publikasi kategori baru menunggu persetujuan pengguna.
