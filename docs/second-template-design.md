# Template kedua dan pemilihan desain

Status: pengguna memilih Sunset Bloom untuk dikerjakan sekarang dan meminta ketiga konsep masuk daftar. Implementasi diotorisasi.

## Kebutuhan yang dikonfirmasi

- Tambahkan template pernikahan kedua dengan konsep bunga, desain berbeda, warna lebih kaya, dan suasana lebih meriah.
- Gunakan struktur isi undangan yang sudah ada di database.
- Saat membuat undangan, pengelola memilih template/desain terlebih dahulu.
- Template pertama tetap tersedia; desain terpilih menggunakan fitur dan pengaturan komponen yang sama.

## Asumsi operasional

- Performa: utamakan HP, optimalkan aset dekorasi, dan hormati preferensi reduced motion.
- Skala: gunakan model banyak undangan dan penyimpanan yang ada; perubahan ini tidak menyatakan kapasitas trafik baru.
- Privasi: gunakan autentikasi admin dan pemisahan draft/publikasi yang ada, tanpa data tamu tambahan.
- Keandalan: undangan lama tetap memakai Floral Reverie; pilihan desain disimpan bersama draft dan ikut diterbitkan.
- Pemeliharaan: pengelola memilih desain dan mengisi konten; template baru dibuat melalui kode.

## Temuan sebelum implementasi

- `templateId` sudah ada pada data undangan, tetapi validasi server memaksanya menjadi `floral-reverie`.
- Tombol Buat undangan langsung membuat draft; perlu langkah pemilihan sebelum request pembuatan.
- Renderer, nama desain di admin, dan dekorasi default masih khusus template pertama.
- Registry template sudah tersedia dan dapat diperluas. Pemilihan template harus divalidasi di server.

## Catatan keputusan

1. Isi bersama untuk seluruh desain, sesuai arahan pengguna. Alternatif berupa formulir dan data terpisah per template tidak diperlukan untuk cakupan ini.
2. Pilih desain sebelum membuat draft, sesuai arahan pengguna. Alternatif langsung membuat draft dengan satu desain tetap tidak memberi pilihan di awal.
3. Sunset Bloom dipilih: terracotta, jingga, dan kuning lembut. Garden Celebration dan Lilac Romance tetap masuk daftar rencana dengan label jelas, belum dapat dipilih atau dibuka sebagai preview.
4. Pakai renderer interaksi bersama dan CSS khusus template. Ini menjaga RSVP, galeri, peta, rekening, musik, dan opsi komponen tetap sama tanpa menggandakan logika. Registry memuat identitas, warna, dekorasi default, dan status template.
5. Pemilihan desain menyimpan `templateId` yang sudah tersedia dalam draft JSON. Tidak memerlukan kolom database baru. Mengganti desain pada draft tidak mengubah publikasi sampai diterbitkan kembali.

## Kontrak desain Sunset Bloom

- Sampul terracotta dengan bidang krem berlengkung dan garis bingkai hangat; nama pasangan dan tombol buka menjadi fokus. Bunga jingga, aprikot, dan kuning membingkai tepi.
- Kutipan pada latar kuning lembut, profil mempelai dengan foto berbingkai, acara pada latar terracotta, cerita berbentuk timeline, dan galeri dengan bingkai krem.
- Semua isi memakai data yang sama, termasuk dekorasi unggahan jika diganti pengelola. Dekorasi bawaan mengikuti pilihan template.
- HP satu kolom; desktop lebih lapang. Tombol musik tetap melayang dan tidak ada header navigasi di atas undangan.
- Daftar desain menampilkan dua template siap dipakai dan dua konsep dalam rencana. Pembuatan draft hanya terjadi setelah tombol Gunakan desain dipilih.
- Tangani proses pembuatan, gagal request, draft/terbit, komponen kosong/nonaktif, gambar gagal, dan pilihan template tidak valid. Label kontrol dan fokus keyboard mengikuti admin yang ada.

## Rencana dan penerimaan

1. Tambahkan registry dan validasi pilihan template, pertahankan default untuk undangan lama.
2. Buat ilustrasi bunga lokal dan CSS Sunset Bloom yang terpisah dari template pertama.
3. Tambahkan pemilihan desain sebelum pembuatan dan opsi desain pada editor.
4. Uji penyimpanan/publikasi template, penolakan template rencana/tidak dikenal, dan fitur undangan pada HP/desktop.
5. Periksa hasil render, overflow 360–1440 px, teks panjang, komponen dimatikan, dan regresi Floral Reverie.

Risiko yang diperiksa: dekorasi besar memperlambat pemuatan (optimalkan WebP), teks panjang/ornamen bertabrakan (cek viewport kecil), dan template ter-reset saat save (uji round-trip). Tidak ada pertanyaan desain yang menghalangi implementasi.

## Hasil verifikasi

- Sintaks dan build berhasil; aset Sunset Bloom tersalin ke build.
- 26 tes lulus termasuk integrasi PostgreSQL pada cluster uji lokal terpisah.
- Alur browser berhasil: pilih template, tangani request gagal, simpan/publikasikan, ganti desain tanpa kehilangan isi, preview, generator tautan tamu, peta, galeri, rekening, RSVP, opsi komponen, serta nama panjang.
- Tidak ada overflow horizontal pada 360, 390, 768, dan 1440 px. Sampul, acara, dan daftar desain diperiksa melalui screenshot.
- Regresi admin Floral Reverie lulus, termasuk upload foto/musik, pemutaran musik, moderasi, dan pemisahan draft/publikasi.

