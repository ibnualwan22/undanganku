# Admin yang dapat digunakan

Instruksi terbaru pengguna meminta implementasi admin untuk segera dipakai; tahap brainstorming berakhir untuk lingkup ini. Halaman katalog/order belum dibuat.

## Kontrak desain

Gunakan karakter ivory dan sage dari undangan, tetapi form memakai sans serif yang jelas. Sidebar berisi koleksi undangan dan status penyimpanan. Editor dibagi ke pasangan/teks, acara/peta, foto/dekorasi, musik, cerita, rekening, komponen, dan respons tamu. Desktop menampilkan preview draft yang sudah disimpan; ponsel menampilkan editor satu kolom.

Semua tombol harus memiliki tindakan nyata. Tampilkan status belum disimpan, upload/progres/gagal, Cloudinary belum dikonfigurasi, form invalid, sesi berakhir, respons kosong, konflik penyuntingan, dan publikasi. Upload tidak membutuhkan pengetikan URL aset. Embed Maps menerima kode yang disalin dari Google Maps dan menyimpan hanya URL yang diizinkan, bukan HTML mentah.

## Keputusan

- Melanjutkan Node.js bawaan dan frontend modular, tanpa migrasi framework untuk mengoperasikan editor.
- Data undangan disimpan dalam file JSON server secara atomik dengan satu cadangan terakhir; data ini harus ditempatkan pada disk persisten saat hosting. Lingkup satu proses/server, bukan layanan multi-instance.
- Setiap undangan memiliki draft dan snapshot terbit, revision untuk mencegah penimpaan dari tab lain, serta slug stabil setelah terbit.
- Admin tunggal dengan setup lokal atau kredensial awal melalui env, hash scrypt, cookie sesi HttpOnly, CSRF, pemeriksaan origin, dan pembatasan percobaan.
- Cloudinary dengan upload bertanda tangan pada server. Audio memakai resource type video sesuai dokumentasi Cloudinary. Kunci rahasia tidak dikirim ke frontend.
- Jika seluruh kredensial kosong pada mode auto, gunakan storage lokal secara eksplisit agar dapat dicoba segera. Kredensial parsial menghasilkan kesalahan; tidak diam-diam beralih dari Cloudinary saat upload gagal.
- RSVP undangan terbit disimpan server. Ucapan memerlukan persetujuan admin sebelum tampil publik. Pratinjau draft tidak menerima RSVP sungguhan.
- Menghapus media dari editor hanya menghapus referensi dari draft; tidak menghapus file Cloudinary atau disk, untuk menghindari kerusakan versi terbit.

## Sumber integrasi

- Cloudinary Upload API: https://cloudinary.com/documentation/image_upload_api_reference
- Cloudinary upload/signature: https://cloudinary.com/documentation/upload_images
- Google Maps embed: https://support.google.com/maps/answer/11471036

## Kriteria penerimaan

Login dan logout, buat/edit lebih dari satu undangan, simpan dan muat ulang, draft privat, publish/unpublish, upload gambar/audio lokal dan jalur API Cloudinary tervalidasi, embed aman, rekening dan salin nomor, checkbox memengaruhi tampilan beserta navigasi, RSVP tersimpan, moderasi ucapan. Tidak ada overflow pada desktop atau ponsel; credential dan data server tidak dilayani sebagai file publik.
