# Cloudflare Free untuk BaliEasy

Hosting memakai Cloudflare Workers Free dan D1 pada akun BaliEasy, dengan login Google yang dibatasi ke **hello@balieasy.com** dan **esim@balieasy.com**. Tidak perlu Cloudflare Access/Zero Trust atau kartu untuk jalur login ini. Kuota Free tetap perlu diuji dengan beban nyata.

## Status, 30 Oktober 2026

- D1 `balieasy-dashboard` telah dibuat di Asia Pacific, ID `75e120fe-f31c-4f00-a8ee-1c7a4454ea47`. Tabel `oauth_states`, `settings`, `snapshots` dan catatan migrasi `0000_open_loki.sql` sudah dibuat; koneksi GBP BaliEasy sudah dipindahkan ke workspace bersama. Sinkronisasi langsung ke Google pada 30 Oktober 2026 berhasil untuk 19 lokasi dan 1.396 review, tanpa selisih total.
- Dashboard dideploy manual ke Worker `balieasy-review-dashboard` pada akun yang sama. Versi produksi: `e42846bb-3d9c-43dc-9150-b5c50493225d`.
- Alamat: `https://balieasy-review-dashboard.hello-balieasy.workers.dev`.
- 17 pengujian login dengan Google tiruan, 7 pengujian workspace dan sinkron bawaan, pengujian kriptografi di workerd, 23 regresi backend, TypeScript, dan build standalone lolos.
- Kedua callback OAuth dan secret runtime telah dipasang. Halaman `/auth/login` terverifikasi HTTP 200; `/api/data` tanpa sesi terverifikasi HTTP 401, keduanya `private, no-store`. Sinkronisasi online melalui otorisasi GBP yang sudah ada berhasil. Login browser dengan akun Google asli esim@balieasy.com terverifikasi, data 19 lokasi langsung tampil, dan sinkron otomatis saat dibuka berjalan.
- Pengguna memilih **deploy manual**. Akun/repository GitHub sudah diizinkan, tetapi Workers Builds tidak dihubungkan. Push GitHub tidak otomatis mengubah versi online.
- Token deploy dibatasi ke Workers Scripts: Edit, D1: Edit, dan Account Settings: Read pada akun BaliEasy. Izin Workers Builds Configuration tidak ditambahkan. Nilai token tidak masuk source atau ZIP.

## Login Google untuk tim BaliEasy

Login dashboard meminta scope `openid email`, terpisah dari izin `business.manage` untuk mengelola Google Business Profile. Server memverifikasi signature RS256 Google, issuer, audience, expiry, nonce, status email terverifikasi, dan email yang diizinkan. Subject Google tetap menjadi identitas login stabil `google:<sub>`. Dengan `DASHBOARD_WORKSPACE=balieasy`, akses data kedua email dipetakan ke `workspace:balieasy`; email lain tetap ditolak. Preview lokal mempertahankan namespace sendiri.

State dan PKCE melindungi alur login. Cookie state berlaku 10 menit; sesi terenkripsi berlaku 8 jam. Cookie memakai Secure, HttpOnly, SameSite=Lax dan awalan `__Host-`. Token Google dari login hanya digunakan untuk memverifikasi identitas, tidak disimpan sebagai sesi browser. Halaman formulir memakai Referrer-Policy same-origin agar POST browser dapat menyertakan Origin; pemeriksaan Origin tetap wajib, sedangkan callback dan pengalihan memakai no-referrer. Keluar memerlukan konfirmasi dengan POST dari origin yang sama. Header identitas pengunjung diganti setelah autentikasi. Konfigurasi belum lengkap menghasilkan 503; API tanpa sesi valid menghasilkan 401. Menghapus email dari daftar izin juga menolak sesi yang sudah dibuat.

Di Google Auth Platform > Clients, gunakan OAuth client Web dari proyek yang sudah disetujui, atau client Web khusus login dalam proyek yang sama. Aplikasi lama bertipe Internal; akun `hello@balieasy.com` dipilih pengguna agar tetap memakai aplikasi Internal tersebut. Akun Gmail di luar organisasi tidak bisa memakainya.

Tambahkan kedua redirect URI persis berikut:

```text
https://balieasy-review-dashboard.hello-balieasy.workers.dev/auth/google/callback
https://balieasy-review-dashboard.hello-balieasy.workers.dev/api/google/callback
```

Yang pertama untuk login dashboard, yang kedua untuk koneksi Google Business Profile. Pertahankan callback lokal agar dashboard lokal tetap dapat digunakan.

Isi `GOOGLE_LOGIN_CLIENT_ID` di `wrangler.cloudflare.jsonc`. Simpan `GOOGLE_LOGIN_CLIENT_SECRET` dan `DATA_ENCRYPTION_KEY` sebagai secret runtime Worker; jangan commit ke GitHub. Kunci enkripsi berupa base64 dari 32 byte acak. Migrasi data lama memerlukan kunci lama yang sama dan pemetaan pengguna yang benar. Jangan mengganti kunci data lama secara sembarang.

## Build, migrasi, dan deploy

Node >=22.13.0, dependency sesuai package-lock. Dari root repository:

```sh
npm run install:ci
node tests/google-dashboard-auth.mjs
node tests/google-auth-worker-runtime.mjs
node tests/workspace-sync.mjs
npm run build:cloudflare
npm run check:cloudflare
npm run migrate:cloudflare
npm run deploy:cloudflare
```

`check:cloudflare` menolak konfigurasi login kosong, database contoh, atau output build yang berbeda dari source. Migrasi memakai `drizzle/` pada D1 remote. Deploy memakai `dist/server/wrangler.json`, terpisah dari preview lokal/Sites. Build standalone menghapus salinan `.dev.vars` dari output server; file rahasia sumber lokal tetap tersimpan. Pemeriksaan sebelum deploy menolak output yang masih memuat salinan file secret lokal. Setelah autentikasi, Worker mengambil JS/CSS dan berkas publik dari binding ASSETS sebelum meneruskan rute aplikasi ke Vinext. Respons privat memakai private, no-store; permintaan aset tanpa sesi tetap ditolak.

Pembaruan source otomatis belum diaktifkan, sesuai pilihan pengguna. Jika nanti diminta, hubungkan hanya repository private `balieasy/balieasy-review-dashboard` ke Workers Builds setelah izin token build disetujui. Build command `npm run build:cloudflare`; deploy command `npm run check:cloudflare && npm run migrate:cloudflare && npm run deploy:cloudflare`. Izin aplikasi GitHub dibatasi ke repository ini. Preview branch tidak diaktifkan agar callback/authentication tidak memakai hostname yang berbeda. Deploy kode otomatis berbeda dari sinkronisasi review otomatis; `DASHBOARD_AUTO_SYNC=true` memperbarui data saat dashboard dibuka jika ada lokasi yang belum disinkronkan atau berumur minimal 15 menit. Pembukaan ulang dengan cache lebih baru tidak mengulang sinkronisasi. Ini tidak menjalankan pekerjaan saat dashboard ditutup. Tombol Sinkronkan tetap tersedia.

## Data lokal dan pengujian

Workspace online memakai konfigurasi dan otorisasi GBP BaliEasy yang sebelumnya tersimpan lokal, tetap terenkripsi dengan kunci data yang sama. Seluruh 19 lokasi dan review sudah diambil ulang dari Google. Akun yang diizinkan tidak perlu mengunggah JSON atau menghubungkan GBP satu per satu. Konfigurasi OAuth runtime juga dapat dipakai jika JSON belum tersimpan; refresh token GBP tetap memerlukan persetujuan Google yang valid. Draf, riwayat operasi, rencana bulk, dan file IndexedDB lokal tidak dimigrasikan.

Setelah login, data GBP bersama langsung ditampilkan. Jika otorisasi dicabut atau kedaluwarsa, hubungkan ulang akun pengelola melalui Pengaturan. Jangan mengirim balasan atau konten sebagai bagian pengujian tanpa persetujuan pengguna untuk konten tersebut. Pantau CPU, subrequest dan D1 agar operasi tetap sesuai kuota Free. Build/dry-run bukan bukti runtime seluruh fitur memenuhi kuota Free.

Referensi: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).
