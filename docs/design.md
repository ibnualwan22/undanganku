# Floral Reverie — template pertama

## Kebutuhan dan keputusan

- Pengguna membangun layanan undangan untuk banyak pasangan; pengelola memasukkan data dari pelanggan.
- Pelanggan nantinya memilih template di halaman order. Tahap saat ini secara eksplisit diminta membuat satu template yang bagus terlebih dahulu.
- Dibuat pratinjau satu undangan lengkap, bukan dashboard atau sistem pembayaran.
- Nama, tanggal, cerita, keluarga, lokasi, dan foto adalah data demonstrasi, ditandai pada tampilan.
- Arah visual yang dipilih: botanical stationery, ivory, sage, blush; hiasan bunga cat air asli dan tipografi serif editorial.
- Data pasangan dan registry template dipisahkan dari tampilan untuk pengembangan berikutnya.

Instruksi terbaru pengguna untuk langsung membuat satu template menjadi dasar melanjutkan implementasi; tidak meminta persetujuan desain tambahan.

## Asumsi operasional

- Performa: halaman statis, tanpa dependensi runtime, font dan gambar lokal; foto di bawah layar menggunakan lazy loading.
- Skala: tahap ini satu pratinjau; belum ada basis data atau klaim kapasitas produksi.
- Privasi: RSVP simulasi disimpan hanya di browser pengunjung, terpisah per ID undangan; tidak dikirim ke server atau ditampilkan ke pengunjung lain. Tidak ada pelacak.
- Ketersediaan: semua aset inti disertakan dalam build. Peta membuka Google Maps di tab baru.
- Kepemilikan: pengelola mengganti konfigurasi src/invitation.js. Implementasi frontend sederhana agar mudah dipindahkan ke stack platform nanti.
- Form produksi, admin, order, pembayaran, dan penerbitan banyak undangan berada di luar tahap ini.

## Kontrak desain

- Urutan: sampul, kutipan, mempelai, acara dan hitung mundur, cerita, galeri, RSVP dan ucapan, penutup.
- Sampul memiliki nama besar sebagai fokus; bunga membingkai tanpa menutupi tombol atau teks.
- Tombol utama hijau sage tua, heading serif, teks pendukung sans serif; label menggunakan bahasa Indonesia.
- Desktop memiliki komposisi lapang; mobile satu kolom dengan navigasi bawah setelah undangan dibuka.
- Interaksi: buka undangan, navigasi bagian, nama tamu dari parameter `to`, kalender .ics, peta, galeri layar besar, musik pilihan, RSVP demonstrasi.
- Status yang dicakup: form kosong, validasi, pengiriman simulasi, sukses, penyimpanan tidak tersedia, ucapan kosong, gambar gagal dimuat, tanggal acara lewat.
- Aksesibilitas: fokus terlihat, label form, live region, dialog keyboard, target sentuh memadai, reduced motion.
- Kriteria penerimaan: tidak ada overflow horizontal pada lebar 360px–1440px; tautan dan tombol berfungsi; input tamu tidak dieksekusi sebagai HTML; simulasi tidak mengaku mengirim ke pasangan.

## Alternatif yang dipertimbangkan

Framework aplikasi lengkap vs HTML/CSS/JavaScript modular: memilih yang kedua untuk satu template tanpa backend, menghindari struktur platform yang belum diminta.
Foto sebagai fokus sampul vs floral stationery: memilih floral agar identitas template kuat dan tetap indah sebelum pasangan memiliki foto prewedding.
RSVP palsu seolah terkirim vs demonstrasi jujur: memilih demonstrasi lokal dengan keterangan eksplisit.
