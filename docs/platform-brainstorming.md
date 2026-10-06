# Catatan brainstorming platform undangan

Status: pemahaman kebutuhan telah dikonfirmasi pengguna; eksplorasi alur dan pendekatan berlangsung. Belum menjadi desain final atau persetujuan implementasi.

## Keputusan yang sudah dinyatakan pengguna

1. Produk digunakan untuk banyak pasangan, bukan satu acara saja.
2. Pengelola mengisi dan membuat undangan berdasarkan data dari pasangan. Pelanggan tidak menjadi editor mandiri pada tahap awal.
3. Pelanggan dapat memilih template pada halaman order.
4. Template pertama adalah Floral Reverie; arah berikutnya mendukung banyak desain.
5. Pengguna meminta brainstorming halaman admin, halaman umum, pengaturan bagian yang ditampilkan, dan mekanisme penambahan template. Belum meminta implementasi tahap tersebut.
6. Pengguna mengonfirmasi gambaran kebutuhan dan menegaskan bahwa katalog harus menyediakan preview setiap template.

Alasan keputusan pengelola: pengguna memilih opsi pengelolaan terpusat dibanding pelanggan membuat akun dan mengedit sendiri. Alasan mendahulukan satu template: pengguna secara eksplisit meminta satu contoh desain terlebih dahulu.

## Kondisi kode yang telah diperiksa

- Data pasangan terpisah di `src/invitation.js`.
- Sudah ada registry satu template, tetapi renderer `src/main.js` masih khusus Floral Reverie.
- Bagian undangan saat ini dirender tetap, belum mengikuti pengaturan aktif/nonaktif per undangan.
- Belum ada dashboard, order, database, autentikasi, atau backend RSVP.
- Menambahkan item pada registry saja belum menghasilkan desain baru yang dapat dirender.

## Pemahaman yang sudah dikonfirmasi

- Halaman umum melayani calon pelanggan: mengenal layanan, melihat contoh desain, dan memilih desain saat order.
- Halaman admin melayani pengelola: mengurus pesanan dan data pasangan, mengatur bagian undangan, memeriksa hasil, serta menerbitkan tautan.
- Pengaturan bagian berlaku per undangan; menonaktifkan satu bagian tidak mengubah undangan pasangan lain.
- Perlu membedakan informasi inti undangan dan bagian pilihan seperti galeri, cerita, musik, RSVP, ucapan, dan hadiah.
- Banyak undangan memakai desain yang sama dengan data masing-masing.
- Penambahan variasi warna/aset perlu dibedakan dari penambahan tata letak baru; mekanisme dan tanggung jawabnya belum dipilih.

## Asumsi awal pembahasan

- Skala awal: satu pengelola dan sekitar 100 undangan aktif; angka ini target pembahasan, bukan kapasitas yang telah diuji.
- Performa: utamakan ponsel; gambar perlu dioptimalkan dan musik tidak menghambat pembukaan undangan.
- Privasi: admin memerlukan login; data order dan kontak pelanggan tidak tampil pada halaman publik. Publikasi ucapan perlu pengaturan terpisah dari konfirmasi kehadiran.
- Keandalan: data dan foto disimpan permanen dengan cadangan; tautan undangan yang sudah dibagikan tetap stabil saat konten direvisi.
- Pemeliharaan: pengelola mengurus isi dan publikasi sehari-hari; proses membuat desain baru masih perlu ditentukan.
- Non-goal sementara: pelanggan mengedit undangan sendiri, marketplace desainer, atau editor desain bebas drag-and-drop.

## Pertanyaan berikutnya

Pengguna menanyakan pengisian nama penerima melalui tautan dan cara yang lebih cepat. Rekomendasi yang sedang diajukan, belum dipilih: generator tautan massal dari daftar nama, satu penerima atau keluarga per baris, disertai teks pesan yang bisa disalin.

Alternatif untuk dibahas:

- Generator massal dengan nama di parameter URL: cepat digunakan, paling sederhana untuk tahap awal; nama terlihat dan dapat diubah pada tautan, sehingga bukan verifikasi identitas untuk RSVP.
- Input nama satu per satu melalui formulir: implementasi dan penggunaan sederhana, tetapi pekerjaan berulang untuk banyak tamu.
- Daftar tamu tersimpan dengan kode acak unik per penerima: dapat digabungkan dengan generator massal dan membantu pencocokan RSVP; memerlukan pengelolaan data tamu dan pencarian kode pada server. Kode yang dibagikan tetap bisa diteruskan dan tidak membuktikan identitas orang yang membukanya.

Belum menetapkan stack, layout dashboard, gateway pembayaran, paket harga, atau mekanisme deployment. Lanjutkan alur order, pilihan bagian, dan penambahan desain setelah alur penerima dibahas. Tidak ada otorisasi untuk mengirim pesan kepada tamu.
