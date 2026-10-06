# Undangan Onlineku · Studio Admin

Admin untuk mengelola banyak undangan dengan template pertama **Floral Reverie**. Gambar, dekorasi, QR rekening, dan musik diunggah dari halaman admin. Data undangan disimpan pada server, bukan hanya browser.

## Mulai menggunakan

Memerlukan Node.js 22+. Tidak ada dependensi npm yang perlu diinstal.

1. Salin `.env.example` menjadi `.env` jika file tersebut belum ada.
2. Jalankan `npm run dev`.
3. Buka **http://localhost:4173/admin**.
4. Pada penggunaan lokal pertama, buat username dan password admin (minimal 12 karakter).
5. Pilih **Kelola** pada undangan contoh atau **Buat undangan** untuk pasangan baru.

Halaman `/` tetap menjadi contoh template. Undangan sebenarnya menggunakan `/u/nama-tautan` setelah diterbitkan. Data contoh bawaan perlu diganti sebelum digunakan untuk acara sungguhan.

## Alur editor

- **Pasangan & teks:** identitas, keluarga, sapaan tamu, tanggal utama, zona waktu, kota, kata pembuka, dan penutup.
- **Acara & peta:** beberapa acara, waktu, tempat, alamat, tombol lokasi, dan peta embed.
- **Foto & dekorasi:** upload foto sampul, foto pasangan, dekorasi transparan, serta galeri hingga 30 foto.
- **Musik:** upload MP3/WAV/OGG, nama lagu, dan volume awal. Musik dicoba menyala otomatis, lalu dimulai pada interaksi pertama jika browser memblokir autoplay. Tamu dapat jeda/putar melalui tombol melayang; musik yang dijeda tidak menyala kembali hanya karena mengetuk halaman. Preview di dalam editor tidak memutar musik otomatis.
- **Cerita cinta:** tambah, edit, dan hapus momen perjalanan pasangan.
- **Rekening:** beberapa bank, nomor rekening sebagai teks (nol awal dipertahankan), nama pemilik, dan upload QR opsional. Tamu dapat menyalin nomornya.
- **Komponen:** aktif/nonaktif bagian undangan tanpa menghapus isinya. Data bagian yang dinonaktifkan tidak disertakan dalam respons API publik.
- **RSVP & ucapan:** respons tersimpan di server. Ucapan baru tampil publik setelah admin menyetujuinya; jumlah tamu dan status kehadiran tidak ditampilkan bersama ucapan publik.

**Simpan draft** menyimpan pekerjaan dan memperbarui preview. **Terbitkan / Perbarui terbitan** mengganti versi yang dapat dibuka tamu. Menyimpan draft tidak mengubah versi terbit. Slug tidak dapat diubah setelah pernah diterbitkan, agar tautan lama tetap berlaku. **Batalkan publikasi** menutup akses tamu, sementara data tetap tersedia di admin.

Preview pada `/preview/ID` memerlukan login dan tidak mengirim RSVP. Editor desktop memiliki preview ponsel; pada layar kecil tersedia tombol membuka draft tersimpan di tab baru.

## Cloudinary melalui .env

Isi variabel berikut langsung di `.env`, lalu restart server:

```dotenv
MEDIA_STORAGE=auto
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=undangan-onlineku
```

- Jika ketiga kredensial terisi, upload baru dikirim ke Cloudinary melalui server dengan signature. Secret tidak dikirim ke frontend.
- Jika seluruh kredensial kosong dalam mode `auto`, file disimpan lokal di `data/uploads/`; status ini terlihat di admin.
- Jika kredensial hanya terisi sebagian, upload ditolak dengan pesan konfigurasi yang perlu dilengkapi.
- `MEDIA_STORAGE=cloudinary` mewajibkan konfigurasi Cloudinary. `MEDIA_STORAGE=local` memilih penyimpanan lokal secara eksplisit.
- Gambar: JPG, PNG, WebP hingga 10 MB. Audio: MP3, WAV, OGG hingga 20 MB. Upload memeriksa jenis file dari isi file.
- Menghapus gambar dari editor hanya menghapus penggunaannya pada draft. File asli dipertahankan agar versi terbit yang masih menggunakannya tidak rusak.
- Mengaktifkan Cloudinary tidak memindahkan file lokal lama secara otomatis.

Implementasi mengikuti [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference) dan [dokumentasi upload bertanda tangan](https://cloudinary.com/documentation/upload_images). Pengujian otomatis memakai respons Cloudinary tiruan; upload ke akun Cloudinary nyata perlu kredensial milik pengelola.

## Embed Google Maps

Buka lokasi di Google Maps pada komputer, pilih **Bagikan → Sematkan peta → Salin HTML**, lalu tempel pada kolom **Embed Google Maps** di acara yang sesuai. Tombol **Lihat peta** menampilkan preview. Aktifkan **Peta lokasi** pada Komponen, simpan, lalu perbarui terbitan.

Server hanya menyimpan URL HTTPS embed Google Maps yang diizinkan; kode HTML atau atribut tambahan tidak dijalankan. Tautan pendek `maps.app.goo.gl` dan tautan lokasi biasa tidak dapat menggantikan kode embed. Instruksi sumber: [Google Maps Help](https://support.google.com/maps/answer/11471036).

## Nama tamu

Tambahkan parameter `to` pada tautan terbit, misalnya:

```text
http://localhost:4173/u/nadine-arga?to=Bapak%20Budi%20%26%20Ibu%20Sari
```

Nama digunakan sebagai sapaan, bukan verifikasi identitas. Nama dan ucapan di-escape sebelum ditampilkan.

## Penyimpanan dan hosting

- `.env` dan folder `data/` tidak masuk Git dan tidak dilayani sebagai file web.
- `data/store.json` menyimpan akun (hash scrypt), undangan, metadata media, dan RSVP. Penulisan dilakukan secara atomik; `store.json.bak` adalah satu versi cadangan terakhir.
- `data/uploads/` berisi file lokal. Folder `data/` harus berada pada **disk persisten** dan dicadangkan oleh pengelola hosting. Satu cadangan terakhir tidak menggantikan backup berkala di tempat terpisah.
- Implementasi ini untuk **satu proses Node.js dengan satu direktori data**. Jangan menjalankan beberapa instance yang menulis direktori yang sama. Untuk skala multi-instance perlu basis data bersama.
- Sesi admin menggunakan cookie HttpOnly/SameSite dan kedaluwarsa setelah 12 jam; restart server meminta login ulang.
- Default server hanya mendengarkan `127.0.0.1`. Untuk hosting gunakan HTTPS/reverse proxy, isi `APP_ORIGIN=https://domain-anda`, dan atur `HOST` sesuai lingkungan.
- Buat akun sebelum dipublikasikan, atau isi `ADMIN_USERNAME` dan `ADMIN_PASSWORD` sebelum startup pertama. Setup browser dinonaktifkan ketika `APP_ORIGIN` diisi. Password dari env hanya membuat akun awal, tidak menimpa akun yang sudah ada.
- `APP_ORIGIN` harus sama persis dengan origin situs, tanpa garis miring di akhir. Koneksi API mutasi memeriksa origin dan sesi admin memerlukan CSRF token.

## Perintah dan validasi

```sh
npm run check
npm test
npm run build
npm run preview
```

`build` menyiapkan frontend dalam `dist/`. Admin dan undangan terbit tetap memerlukan backend Node.js; aplikasi ini tidak dapat diunggah sebagai situs statis saja. `npm run preview` melayani `dist/` bersama backend. Dev dan preview memakai port yang sama secara default; hentikan salah satunya atau atur `PORT` berbeda.

Tes mencakup input, zona waktu, kalender, validasi peta/media, login dan CSRF, upload lokal, signature Cloudinary, draft/publikasi, konflik revisi, persistensi, serta RSVP dan moderasi. Untuk pengujian browser terpisah:

```sh
PORT=4180 DATA_DIR=./test-results/admin-browser-data npm run dev
# Jalankan Chromium terpisah dengan --remote-debugging-port=9222.
node tests/browser.mjs
```

Jangan menjalankan tes browser pada data utama. Screenshot pemeriksaan berada di `test-results/` dan diabaikan Git.

## Struktur

```text
admin.html, src/admin.js, src/admin.css   Antarmuka admin
src/main.js, src/style.css               Tampilan undangan
src/load-invitation.js                   Pemilihan demo, preview, atau undangan terbit
src/invitation.js                        Data contoh dan registry template
server/                                 API, sesi, validasi, upload, dan penyimpanan
scripts/                                Server, build frontend, pemeriksaan sintaks
tests/                                  Tes unit, integrasi, dan browser
public/assets/                          Dekorasi, foto contoh, font lokal
docs/admin-design.md                    Keputusan implementasi admin
docs/assets.md                          Sumber aset dan prompt ilustrasi
```

Belum termasuk katalog/order, pembayaran, editor desain template baru, atau impor daftar tamu. Penambahan desain baru tetap memerlukan implementasi tampilan dan pendaftaran template; admin ini mengelola isi dan komponen Floral Reverie.
