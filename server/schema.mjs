import { invitation } from '../src/invitation.js';

export const sectionsDefault = { quote: true, couplePhoto: true, countdown: true, calendar: true, map: true, story: true, gallery: true, music: true, rsvp: true, wishes: true, gifts: false, closing: true };
export class AppError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const text = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
const required = (value, label, max) => { const result = text(value, max); if (!result) throw new AppError(`${label} wajib diisi.`); return result; };
const array = (value, max) => Array.isArray(value) ? value.slice(0, max) : [];

export function newInvitation(id) {
  return { ...structuredClone(invitation), id, demo: false, sections: { ...sectionsDefault }, coverPhoto: '', couplePhoto: invitation.gallery[0].src, decoration: '/assets/floral-watercolor.png', music: { src: '', name: '', volume: 0.4 }, accounts: [], giftIntro: 'Doa dan kehadiranmu adalah hadiah terindah. Jika ingin berbagi tanda kasih, kamu dapat mengirimkannya melalui rekening berikut.', closingText: 'Terima kasih telah menjadi bagian dari perjalanan kami. Doa dan kehadiranmu adalah kebahagiaan bagi kami.', events: invitation.events.map(event => ({ ...event, mapEmbed: '' })) };
}

export function mapEmbedURL(value) {
  const raw = text(value, 12000);
  if (!raw) return '';
  const src = raw.startsWith('<') ? raw.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] : raw;
  if (!src) throw new AppError('Tempel kode iframe atau URL embed Google Maps yang valid.');
  let url;
  try { url = new URL(src.replace(/&amp;/g, '&')); } catch { throw new AppError('URL peta tidak valid.'); }
  if (url.protocol !== 'https:' || !['www.google.com', 'google.com', 'maps.google.com'].includes(url.hostname) || url.username || url.password || url.port || !(url.pathname === '/maps/embed' || url.pathname.startsWith('/maps/embed/'))) throw new AppError('Gunakan Google Maps → Bagikan → Sematkan peta → Salin HTML. Tautan lokasi biasa belum merupakan embed.');
  return url.href;
}

export function validateInvitation(input, id, assets = []) {
  if (!input || typeof input !== 'object') throw new AppError('Isi undangan tidak valid.');
  const media = (value, kind = 'image') => {
    const url = text(value, 2000);
    if (!url) return '';
    const stock = kind === 'image' && ['/assets/floral-watercolor.png','/assets/wedding-garden.jpg','/assets/wedding-moment.jpg','/assets/wedding-details.jpg'].includes(url);
    if (!stock && !assets.some(asset => asset.url === url && asset.kind === kind)) throw new AppError('Media harus diunggah melalui halaman admin terlebih dahulu.');
    return url;
  };
  const date = (value, label) => {
    const result = text(value, 40);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(result) || !Number.isFinite(Date.parse(result))) throw new AppError(`${label} tidak valid. Pilih tanggal dan waktu lengkap.`);
    return result;
  };
  const timeZone = ['Asia/Jakarta','Asia/Makassar','Asia/Jayapura'].includes(input.timeZone) ? input.timeZone : 'Asia/Jakarta';
  const couple = array(input.couple, 2).map(person => ({ name: required(person?.name, 'Nama panggilan mempelai', 40), fullName: required(person?.fullName, 'Nama lengkap mempelai', 150), family: text(person?.family, 500) }));
  if (couple.length !== 2) throw new AppError('Lengkapi kedua mempelai.');
  const events = array(input.events, 8).map(event => {
    const start = date(event?.start, 'Waktu mulai acara'), end = date(event?.end, 'Waktu selesai acara');
    if (Date.parse(end) <= Date.parse(start)) throw new AppError('Waktu selesai acara harus setelah waktu mulai.');
    return { title: required(event.title, 'Nama acara', 100), subtitle: text(event.subtitle,100), start, end, venue: required(event.venue, 'Nama tempat', 200), address: text(event.address,500), mapQuery: text(event.mapQuery,500), mapEmbed: mapEmbedURL(event.mapEmbed) };
  });
  if (!events.length) throw new AppError('Tambahkan setidaknya satu acara.');
  const sections = Object.fromEntries(Object.entries(sectionsDefault).map(([key, value]) => [key, typeof input.sections?.[key] === 'boolean' ? input.sections[key] : value]));
  const accounts = array(input.accounts, 8).map(account => ({ bank: required(account?.bank, 'Nama bank',80), holder: required(account?.holder,'Nama pemilik rekening',150), number: required(account?.number,'Nomor rekening',40).replace(/[ -]/g,''), qr: media(account?.qr) }));
  if (accounts.some(account => !/^\d{5,30}$/.test(account.number))) throw new AppError('Nomor rekening harus berupa 5–30 digit.');
  const volume = Number(input.music?.volume ?? 0.4);
  return { id, demo: false, templateId: 'floral-reverie', couple, date: date(input.date, 'Tanggal pernikahan'), timeZone, timeZoneLabel: {'Asia/Jakarta':'WIB','Asia/Makassar':'WITA','Asia/Jayapura':'WIT'}[timeZone], location: text(input.location,200), defaultGuest: text(input.defaultGuest,100) || 'Tamu Undangan', quote: text(input.quote,1500), introduction: text(input.introduction,2500), closingText: text(input.closingText,2500), giftIntro: text(input.giftIntro,1500), sections, coverPhoto: media(input.coverPhoto), couplePhoto: media(input.couplePhoto), decoration: media(input.decoration), music: { src: media(input.music?.src,'audio'), name: text(input.music?.name,200), volume: Number.isFinite(volume) ? Math.min(1,Math.max(0,volume)) : 0.4 }, events, story: array(input.story,12).map(item => ({ year: text(item?.year,40), title: required(item?.title,'Judul cerita',150), text: text(item?.text,2500) })), gallery: array(input.gallery,30).map(photo => ({ src: media(photo?.src), alt: text(photo?.alt,200), caption: text(photo?.caption,250) })).filter(photo => photo.src), accounts };
}

export function publicInvitation(input) {
  const result = structuredClone(input), s = result.sections;
  if (!s.gallery) result.gallery = [];
  if (!s.couplePhoto) result.couplePhoto = '';
  if (!s.story) result.story = [];
  if (!s.music) result.music = { src: '', name: '', volume: 0 };
  if (!s.gifts) { result.accounts = []; result.giftIntro = ''; }
  if (!s.map) result.events = result.events.map(event => ({ ...event, mapEmbed: '' }));
  if (!s.quote) { result.quote = ''; result.introduction = ''; }
  if (!s.closing) result.closingText = '';
  return result;
}

export function validateResponse(input, sections) {
  const name = required(input?.name, 'Nama', 100);
  const attendance = sections.rsvp ? input?.attendance : 'message';
  if (!['yes','no','maybe','message'].includes(attendance) || (sections.rsvp && attendance === 'message')) throw new AppError('Pilih konfirmasi kehadiran.');
  const guests = attendance === 'yes' ? Number(input?.guests) : 0;
  if (!Number.isInteger(guests) || guests < 0 || guests > 5 || (attendance === 'yes' && guests < 1)) throw new AppError('Jumlah tamu tidak valid.');
  const message = sections.wishes ? text(input?.message,1000) : '';
  if (!sections.rsvp && !message) throw new AppError('Tuliskan ucapan terlebih dahulu.');
  return { name, attendance, guests, message };
}
