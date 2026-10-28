# Cloudflare Free untuk BaliEasy

Hosting memakai Cloudflare Workers Free dan D1 pada akun BaliEasy, dengan login Google yang dibatasi ke **hello.balieasy@gmail.com**. Tidak perlu Cloudflare Access/Zero Trust atau kartu untuk jalur login ini. Kuota Free tetap perlu diuji dengan beban nyata.

## Status, 28 Oktober 2026

- D1 `balieasy-dashboard` telah dibuat di Asia Pacific, ID `75e120fe-f31c-4f00-a8ee-1c7a4454ea47`. Database online masih kosong.
- Worker `balieasy-review-dashboard` telah dibuat dengan placeholder Hello World, tanpa data/kredensial bisnis.
- Alamat: `https://balieasy-review-dashboard.hello-balieasy.workers.dev`.
- 15 pengujian login dengan Google tiruan, pengujian kriptografi di workerd, 23 regresi backend, TypeScript, dan build standalone lolos.
- Source dashboard belum dideploy. Login OAuth, secret runtime, migrasi D1, serta build GitHub masih perlu diselesaikan. Adanya placeholder tidak berarti dashboard sudah siap.

## Login Google khusus pemilik

Login dashboard meminta scope `openid email`, terpisah dari izin `business.manage` untuk mengelola Google Business Profile. Server memverifikasi signature RS256 Google, issuer, audience, expiry, nonce, status email terverifikasi, dan email yang diizinkan. Subject Google menjadi ID internal stabil `google:<sub>`.

State dan PKCE melindungi alur login. Cookie state berlaku 10 menit; sesi terenkripsi berlaku 8 jam. Cookie memakai Secure, HttpOnly, SameSite=Lax dan awalan `__Host-`. Token Google hanya digunakan untuk memverifikasi login, tidak disimpan sebagai sesi browser. Keluar memerlukan konfirmasi dengan POST dari origin yang sama. Header identitas pengunjung diganti setelah autentikasi. Konfigurasi belum lengkap menghasilkan 503; API tanpa sesi valid menghasilkan 401. Menghapus email dari daftar izin juga menolak sesi yang sudah dibuat.

Di Google Auth Platform > Clients, gunakan OAuth client Web dari proyek yang sudah disetujui, atau client Web khusus login dalam proyek yang sama. Audience harus mengizinkan `hello.balieasy@gmail.com`; untuk aplikasi External berstatus Testing, tambahkan akun ini sebagai test user.

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
npm run build:cloudflare
npm run check:cloudflare
npm run migrate:cloudflare
npm run deploy:cloudflare
```

`check:cloudflare` menolak konfigurasi login kosong, database contoh, atau output build yang berbeda dari source. Migrasi memakai `drizzle/` pada D1 remote. Deploy memakai `dist/server/wrangler.json`, terpisah dari preview lokal/Sites.

Untuk pembaruan source otomatis, hubungkan hanya repository private `balieasy/balieasy-review-dashboard` ke Workers Builds setelah branch siap. Build command `npm run build:cloudflare`; deploy command `npm run check:cloudflare && npm run migrate:cloudflare && npm run deploy:cloudflare`. Izin aplikasi GitHub dibatasi ke repository ini. Preview branch tidak diaktifkan agar callback/authentication tidak memakai hostname yang berbeda. Deploy kode otomatis berbeda dari sinkronisasi review otomatis; source ini belum menambahkan jadwal sinkron Google.

## Data lokal dan pengujian

D1 baru tidak otomatis berisi data lokal. Review dapat disinkronkan ulang; draf, riwayat operasi dan rencana bulk memerlukan migrasi tersendiri karena namespace Google berbeda dari `local_seedy`. File bulk IndexedDB terikat browser dan alamat asal sehingga tidak otomatis berpindah.

Setelah login privat teruji, hubungkan konfigurasi OAuth GBP melalui Pengaturan, lalu uji sinkron satu lokasi sebelum 19 lokasi. Jangan mengirim balasan atau konten sebagai bagian pengujian tanpa persetujuan pengguna untuk konten tersebut. Pantau CPU, subrequest dan D1 agar operasi tetap sesuai kuota Free. Build/dry-run bukan bukti runtime seluruh fitur memenuhi kuota Free.

Referensi: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).
