// Ganti data di sini untuk setiap pasangan. Semua identitas ini adalah contoh.
// `id` harus unik agar simulasi RSVP antar-undangan tidak tercampur.
export const invitation = {
  id: 'demo-undanganku',
  templateId: 'floral-reverie',
  demo: true,
  couple: [
    { name: 'Mempelai Wanita', fullName: 'Nama Lengkap Wanita', family: 'Putri dari Bapak ..\ndan Ibu ..' },
    { name: 'Mempelai Pria', fullName: 'Nama Lengkap Pria', family: 'Putra dari Bapak ..\ndan Ibu ..' },
  ],
  date: '2027-06-20T09:00:00+07:00',
  timeZone: 'Asia/Jakarta',
  timeZoneLabel: 'WIB',
  location: 'Bandung, Jawa Barat',
  defaultGuest: 'Tamu Undangan',
  quote: 'Di antara begitu banyak perjalanan, menemukanmu adalah cara terindah untuk pulang.',
  introduction: 'Dengan penuh rasa syukur dan bahagia, kami mengundang Bapak/Ibu/Saudara/i untuk menjadi bagian dari hari istimewa kami.',
  events: [
    {
      title: 'Akad Nikah',
      subtitle: 'AWAL SEBUAH JANJI',
      start: '2027-06-20T09:00:00+07:00',
      end: '2027-06-20T10:00:00+07:00',
      venue: 'Taman Hutan Raya Ir. H. Djuanda',
      address: 'Jl. Ir. H. Juanda No. 99, Dago Pakar, Bandung',
      mapQuery: 'Taman Hutan Raya Ir. H. Djuanda Bandung',
    },
    {
      title: 'Resepsi',
      subtitle: 'MERAYAKAN KEBERSAMAAN',
      start: '2027-06-20T11:00:00+07:00',
      end: '2027-06-20T14:00:00+07:00',
      venue: 'Taman Hutan Raya Ir. H. Djuanda',
      address: 'Jl. Ir. H. Juanda No. 99, Dago Pakar, Bandung',
      mapQuery: 'Taman Hutan Raya Ir. H. Djuanda Bandung',
    },
  ],
  story: [
    { year: '2022', title: 'Sebuah pertemuan', text: 'Bermula dari pertemuan sederhana, percakapan kecil membawa kami pada cerita yang tak pernah kami duga.' },
    { year: '2025', title: 'Memilih bersama', text: 'Mengenal satu sama lain, belajar menerima, dan menemukan rumah dalam setiap kebersamaan.' },
    { year: '2027', title: 'Selamanya dimulai', text: 'Dengan restu keluarga, kami memilih melangkah bersama. Bab baru ini menjadi awal dari banyak cerita indah lainnya.' },
  ],
  gallery: [
    { src: '/assets/wedding-garden.jpg', alt: 'Foto referensi suasana pernikahan di taman', caption: 'A little moment, a lifetime of love.' },
    { src: '/assets/wedding-moment.jpg', alt: 'Foto referensi momen pernikahan', caption: 'Bersamamu, semua terasa seperti rumah.' },
    { src: '/assets/wedding-details.jpg', alt: 'Foto referensi pasangan di hari pernikahan', caption: 'Untuk hari ini, dan semua hari setelahnya.' },
  ],
};

export { templates } from './templates.js';
