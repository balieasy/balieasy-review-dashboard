# Cloudflare Free untuk BaliEasy

Konfigurasi ini menyiapkan hosting pada akun Cloudflare milik BaliEasy, terpisah dari preview lokal dan hosting Sites. Tidak ada langganan berbayar yang diaktifkan oleh source ini. Paket Free perlu diuji dengan beban nyata; build yang berhasil bukan jaminan semua request memenuhi batas CPU Free.

## Status persiapan, 26 Oktober 2026

- Build standalone dan TypeScript lolos.
- 10 pengujian login Cloudflare Access dan 23 pemeriksaan regresi backend lolos dengan data tiruan.
- Wrangler dry-run berhasil: sekitar 999 KiB modul, 296 KiB setelah gzip. Dry-run tidak mengunggah ke Cloudflare.
- Deployment, database online, akses pengguna, dan koneksi build GitHub belum dibuat. Langkah berikutnya memerlukan login akun Cloudflare pemilik.

## Persiapan akun dan login privat

1. Login atau buat akun Cloudflare Free.
2. Buat database D1 bernama `balieasy-dashboard`. Catat database ID; jangan memakai database contoh.
3. Siapkan Worker `balieasy-review-dashboard` dan alamat `workers.dev` milik akun tersebut. Jika Worker perlu dibuat dahulu agar Access dapat dikonfigurasi, gunakan halaman placeholder tanpa data atau kredensial BaliEasy.
4. Aktifkan Cloudflare Access untuk seluruh aplikasi dan alamat Worker. Batasi kebijakan ke email pemilik yang disetujui, bukan semua akun atau seluruh domain tanpa keputusan pemilik.
5. Catat team domain `*.cloudflareaccess.com` dan application audience (AUD). Isi `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `DASHBOARD_ALLOWED_EMAILS`, dan `DASHBOARD_ORIGIN` dalam `wrangler.cloudflare.jsonc`, serta ID database D1 yang benar. `DASHBOARD_ALLOWED_EMAILS` berisi email spesifik, dipisahkan koma.
6. Simpan `DATA_ENCRYPTION_KEY` sebagai secret runtime Cloudflare melalui dashboard. Nilainya harus base64 dari 32 byte acak. Jangan commit secret, JSON OAuth, atau database ke GitHub. Migrasi data terenkripsi lama memerlukan kunci lama yang sama dan pemetaan ID pengguna yang benar; jangan mengganti kunci data lama secara sembarang.

Worker standalone memverifikasi signature RS256 melalui signing keys dari team Cloudflare Access yang dikonfigurasi, issuer, audience, expiry, subject, email, serta hostname dashboard. Header identitas Sites yang dikirim pengunjung dihapus dan diganti hanya setelah token terverifikasi. Konfigurasi kosong menghasilkan 503; request tanpa identitas valid menghasilkan 401. Proteksi ini tidak bergantung pada apakah pengunjung menyisipkan header email sendiri.

Cloudflare Vite menyertakan Static Assets. Karena `ctx.access` tidak diteruskan ke user Worker oleh router Static Assets, implementasi memverifikasi `Cf-Access-Jwt-Assertion` secara langsung. Semua identitas tetap terisolasi per user; tidak ada penyatuan data antaranggota tim otomatis.

## Build, migrasi, dan deploy

Node >=22.13.0, dependency sesuai package-lock. Dari root repository:

```sh
npm ci
node tests/cloudflare-access.mjs
npm run build:cloudflare
npm run check:cloudflare
npm run migrate:cloudflare
npm run deploy:cloudflare
```

`check:cloudflare` menolak database ID contoh, konfigurasi login kosong, atau konfigurasi build yang berbeda dari source. Migrasi memakai `drizzle/` pada D1 remote yang dikonfigurasi. Periksa akun/database sebelum menjalankannya. `deploy:cloudflare` memakai output Cloudflare Vite di `dist/server/wrangler.json`, bukan output preview Sites.

Untuk deploy otomatis melalui Workers Builds, hubungkan hanya repository private `balieasy/balieasy-review-dashboard` dan branch yang telah siap. Build command: `npm run build:cloudflare`. Deploy command: `npm run check:cloudflare && npm run migrate:cloudflare && npm run deploy:cloudflare`. Jalankan deploy awal terlebih dahulu, uji login privat dan akses Google, lalu aktifkan pembaruan otomatis branch produksi. Source persiapan yang masih memakai nilai kosong bukan konfigurasi produksi.

## Hubungkan Google dan uji paket Free

Tambahkan origin callback produksi persis seperti `DASHBOARD_ORIGIN` diikuti `/api/google/callback` pada OAuth client Google yang sudah disetujui. Login privat ke dashboard, masukkan konfigurasi OAuth melalui Pengaturan, lalu otorisasi Google. Tidak perlu mengajukan ulang akses API untuk proyek Google yang sama hanya karena alamat dashboard berubah.

Database D1 online baru tidak otomatis berisi data lokal. Review bisa dibaca ulang melalui sinkronisasi. Draf, riwayat operasi, dan rencana bulk memerlukan migrasi terpisah jika ingin dipertahankan; akun Cloudflare memakai namespace pengguna berbeda dari preview lokal. Salinan file bulk di browser juga terikat alamat dashboard, sehingga tidak otomatis berpindah ke alamat online.

Uji satu lokasi lebih dahulu untuk sinkronisasi, pembacaan galeri, serta pagination. Uji berikutnya mencakup 19 lokasi. Pantau CPU, jumlah subrequest, pemakaian D1, dan hasil lengkap/parsial. Batas Free perlu dipenuhi dengan membagi pekerjaan menjadi tahap kecil bila diperlukan. Jangan menyatakan deployment Free siap untuk seluruh fitur sebelum pemeriksaan runtime ini selesai. Tidak ada jadwal sinkron review otomatis yang ditambahkan oleh perubahan hosting ini.

Referensi: [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), [validasi JWT](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).
