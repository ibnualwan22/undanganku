# Monochrome Vows

Template ketiga yang siap digunakan. Disetujui pengguna: hitam-putih, potret sebagian wajah di tepi berlawanan, konversi tampilan foto otomatis, dan animasi saat scroll. Konsep mengikuti referensi tata letak pengguna tanpa menyalin identitas, merek, atau isi undangan contoh.

## Desain dan penggunaan

- Sampul tiga bidang: pria/mempelai kedua di kiri, nama pasangan di tengah, wanita/mempelai pertama di kanan.
- Monogram, serif editorial italic, garis bingkai, bidang hitam dan putih; profil mempelai berselang tinggi dan galeri dua kolom pada desktop.
- HP memakai dua potongan potret pendek di sisi nama, lalu sapaan dan tombol buka yang mudah disentuh.
- Pilih **Monochrome Vows** saat membuat undangan, atau dari pilihan desain editor.
- Di **Foto & dekorasi**, upload dua potret, lalu atur geser horizontal, vertikal, dan zoom. Crop langsung terlihat pada pratinjau kecil; simpan untuk memperbarui preview undangan.
- Gunakan potret tegak dengan wajah jelas. Tanpa foto atau ketika gambar gagal dimuat, sampul menampilkan inisial pasangan; foto contoh tidak dimasukkan ke undangan nyata.
- Foto berwarna otomatis ditampilkan monokrom menggunakan CSS. File asli di Cloudinary tetap utuh. Foto contoh AI hanya digunakan pada preview template dan gambar katalog.

## Data dan kompatibilitas

Setiap objek `couple[]` memperoleh `portrait: {src, x, y, zoom}`. URL divalidasi terhadap daftar media upload seperti foto lain, dan nilai crop dibatasi menjadi angka (x/y 0–100, zoom 1–2). Data lama tanpa portrait tetap valid. Struktur tersimpan dalam JSON draft/publikasi, sehingga tidak perlu migrasi kolom PostgreSQL. Pergantian template mempertahankan potret dan seluruh isi. Publikasi tetap berupa snapshot, hanya diperbarui lewat Terbitkan/Perbarui terbitan.

## Animasi dan aksesibilitas

- Pembukaan dua panel satu kali saat undangan dibuka.
- Potret sampul bergerak perlahan mengikuti scroll melalui requestAnimationFrame dan passive listener.
- Heading, profil, kartu acara, dan foto masuk bertahap, berulang ketika keluar dan masuk viewport.
- Scroll tetap native. Animasi menggunakan transform/opacity/clip-path; tidak ada scroll hijacking.
- prefers-reduced-motion mematikan animasi dan menjaga isi terlihat; perubahan preferensi di tengah sesi juga ditangani.

## Verifikasi

- Pemeriksaan sintaks dan build berhasil.
- 24 tes unit/integrasi lulus; tes PostgreSQL langsung dilewati karena TEST_DATABASE_URL tidak dikonfigurasi pada sesi ini.
- Browser lokal menguji 360, 390, 768, dan 1440 px, grayscale, animasi berulang, reduced motion, upload dan crop, save/publish/reload, pergantian desain, tautan tamu, RSVP, serta fallback foto kosong.
- Screenshot diperiksa untuk sampul, profil, acara, galeri, dan editor potret; crop HP diperbaiki setelah inspeksi.
- Pengujian memakai JSON lokal terpisah dengan koneksi PostgreSQL dan Cloudinary produksi dinonaktifkan. Belum deployment ke Vercel.
