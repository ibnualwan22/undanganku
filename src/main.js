import { templates } from './invitation.js';
import { loadInvitation, isLive, isPreview } from './load-invitation.js';
import { escapeHTML as esc, getGuest, countdownTo, formatDate, formatTime, createCalendar } from './utils.js';
import { createMusic } from './music.js';

const data = await loadInvitation();
if (data) renderInvitation(data);

function renderInvitation(data) {
const sections = data.sections;
const paths = {
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  leaf: '<path d="M20 4C9 2 3 7 5 14c7 3 15-2 15-10Z"/><path d="M4 21 15 10"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  down: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  music: '<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  camera: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="m8 6 1-3h6l1 3"/><circle cx="12" cy="13" r="4"/>',
  rings: '<circle cx="8" cy="13" r="6"/><circle cx="16" cy="13" r="6"/><path d="m12 5 2-3 2 3-2 2Z"/>',
  glasses: '<path d="m4 3 6 1-1 8a3 3 0 0 1-6-1l1-8Zm10 1 6-1 1 8a3 3 0 0 1-6 1l-1-8ZM5 14l-1 7m-2 0h5m12-7 1 7m-3 0h5M4 8l6 1m5 0 6-1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
const floral = cls => data.decoration ? `<img class="floral ${cls}" src="${esc(data.decoration)}" alt="" aria-hidden="true" width="1024" height="1536" />` : '';
const dateLabel = formatDate(data.date, data.timeZone);
const guest = getGuest(location.search, data.defaultGuest);
const [bride, groom] = data.couple;
const names = data.couple.map(person => person.name).join(' & ');
const initials = data.couple.map(person => person.name[0]);
const storageKey = `undangan:${data.id}:demo-rsvp`;
document.title = `${names} — ${templates[0].name}`;

document.querySelector('#app').innerHTML = `
  ${isPreview ? '<div class="preview-banner">PRATINJAU DRAFT · HANYA UNTUK PENGELOLA</div>' : ''}
  ${data.demo ? '<div class="preview-banner"><span class="preview-dot"></span><span><strong>Floral Reverie</strong><span class="preview-divider">/</span>Pratinjau template · data & foto contoh</span></div>' : ''}
  <main>
    <section class="cover" id="cover" aria-labelledby="cover-title">
      <div class="cover-line cover-line-left" aria-hidden="true"></div><div class="cover-line cover-line-right" aria-hidden="true"></div>
      <span class="cover-side-note" aria-hidden="true">A CELEBRATION OF LOVE</span>
      ${floral('cover-flower-left')}${floral('cover-flower-right')}
      <div class="cover-arch" aria-hidden="true"></div>${data.coverPhoto ? `<img class="cover-background-photo" src="${esc(data.coverPhoto)}" alt=""/>` : ''}
      <div class="cover-content">
        <div class="botanical-mark">${icon('leaf')}</div>
        <p class="eyebrow">THE WEDDING OF</p>
        <h1 id="cover-title"><span>${esc(bride.name)}</span><span class="name-second"><em>&</em> ${esc(groom.name)}</span></h1>
        <div class="cover-date"><span></span><p>${esc(dateLabel)}</p><span></span></div>
        <p class="cover-location">${esc(data.location)}</p>
        <div class="guest-card"><p>Kepada Yth. Bapak/Ibu/Saudara/i</p><strong id="guest-name">${esc(guest)}</strong></div>
        <button class="button button-primary open-button" id="open-invitation">${icon('mail')}<span>Buka Undangan</span>${icon('arrow')}</button>
        <p class="cover-footnote">Sebuah awal, untuk selamanya.</p>
      </div>
      <span class="cover-bottom-note">WITH LOVE, ${esc(bride.name.toUpperCase())} & ${esc(groom.name.toUpperCase())}</span>
    </section>
    <div id="invitation-content" hidden>
      <section class="quote-section section reveal" aria-label="Kata pembuka">
        <div class="little-branch">${icon('leaf')}</div><p class="eyebrow">DUA HATI, SATU CERITA</p>
        <p class="opening-quote">“${esc(data.quote)}”</p>
        <span class="small-rule"></span><p class="intro-text">${esc(data.introduction)}</p>
      </section>
      <section class="couple-section section" id="mempelai" aria-labelledby="couple-title">
        <div class="section-heading reveal"><p class="eyebrow">DENGAN HATI YANG BERBAHAGIA</p><h2 id="couple-title">Kami yang <em>berbahagia</em></h2><p>Dua cerita yang bertemu, satu perjalanan yang dimulai.</p></div>
        <div class="couple-layout reveal">
          <div class="person person-bride"><span class="person-label">THE BRIDE</span><h3>${esc(bride.name)}</h3><p class="full-name">${esc(bride.fullName)}</p><span class="small-rule"></span><p class="family">${esc(bride.family).replace(/\n/g, '<br>')}</p></div>
          <div class="couple-photo-wrap"><div class="couple-photo"><img src="${esc(data.couplePhoto || '/assets/favicon.svg')}" alt="${data.demo ? 'Foto referensi pernikahan' : 'Foto pasangan mempelai'}" width="1000" height="1200" loading="lazy" /><span class="photo-monogram">${esc(initials[0])} <i>&</i> ${esc(initials[1])}</span></div>${floral('couple-flower')}</div>
          <div class="person person-groom"><span class="person-label">THE GROOM</span><h3>${esc(groom.name)}</h3><p class="full-name">${esc(groom.fullName)}</p><span class="small-rule"></span><p class="family">${esc(groom.family).replace(/\n/g, '<br>')}</p></div>
        </div>
      </section>
      <section class="events-section section" id="acara" aria-labelledby="events-title">
        <div class="section-heading reveal"><p class="eyebrow">SAVE OUR DATE</p><h2 id="events-title">Hari yang <em>kami nantikan</em></h2><p>Kehadiranmu akan melengkapi kebahagiaan kami.</p></div>
        <div class="countdown reveal" role="timer" aria-label="Hitung mundur menuju pernikahan">${[['days','Hari'],['hours','Jam'],['minutes','Menit'],['seconds','Detik']].map(([unit,label]) => `<div><span data-count="${unit}">00</span><small>${label}</small></div>`).join('<span class="countdown-divider" aria-hidden="true">:</span>')}</div>
        <p class="countdown-ended" id="countdown-ended" hidden>Hari bahagia telah tiba. Terima kasih atas doa dan kasih sayangmu.</p>
        <div class="event-grid reveal">${data.events.map((event,i) => `<article class="event-card"><div class="event-icon">${icon(i === 0 ? 'rings' : 'glasses')}</div><p class="eyebrow">${esc(event.subtitle)}</p><h3>${esc(event.title)}</h3><p class="event-date">${esc(formatDate(event.start, data.timeZone))}</p><p class="event-time">${esc(formatTime(event.start, data.timeZone))} – ${esc(formatTime(event.end, data.timeZone))} ${esc(data.timeZoneLabel)}</p><span class="small-rule"></span><h4>${esc(event.venue)}</h4><p class="event-address">${esc(event.address)}</p><a class="button button-outline" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.mapQuery || event.venue + ' ' + event.address)}" target="_blank" rel="noopener noreferrer">${icon('pin')}Lihat Lokasi${icon('arrow')}</a>${sections.map && event.mapEmbed ? `<iframe class="event-map" src="${esc(event.mapEmbed)}" title="Peta ${esc(event.title)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>` : ''}</article>`).join('')}</div>
        <button class="text-button calendar-button" id="save-calendar">${icon('calendar')}Simpan tanggal ke kalender${icon('arrow')}</button>
        ${data.demo ? '<p class="subtle-note">Tanggal dan lokasi di atas merupakan contoh untuk pratinjau.</p>' : ''}
      </section>
      <section class="story-section section" aria-labelledby="story-title">
        <div class="story-heading reveal"><p class="eyebrow">OUR LITTLE STORY</p><h2 id="story-title">Bagaimana <em>semuanya bermula.</em></h2><p>Hal-hal sederhana yang membawa kami sampai di sini.</p><div class="story-flower-wrap">${floral('story-flower')}</div></div>
        <div class="story-timeline">${data.story.map(item => `<article class="story-item reveal"><span class="story-year">${esc(item.year)}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></article>`).join('')}</div>
      </section>
      <section class="gallery-section section" id="galeri" aria-labelledby="gallery-title"><div class="section-heading reveal"><p class="eyebrow">MOMENTS TO REMEMBER</p><h2 id="gallery-title">Sepotong <em>cerita kita</em></h2><p>Karena ada kenangan yang ingin disimpan selamanya.</p></div>
        <div class="gallery-grid reveal">${data.gallery.map((photo,i) => `<button class="gallery-item gallery-item-${i}" data-gallery="${i}" aria-label="Perbesar foto ${i+1}: ${esc(photo.alt)}"><img src="${esc(photo.src)}" alt="${esc(photo.alt)}" width="1000" height="1200" loading="lazy"/><span class="gallery-expand">${icon('expand')}</span><span class="gallery-caption">${esc(photo.caption)}</span></button>`).join('')}</div>
        ${data.demo ? '<p class="subtle-note">Foto referensi · nantinya diganti dengan foto pasangan.</p>' : ''}
      </section>
      <section class="rsvp-section section" id="rsvp" aria-labelledby="rsvp-title">
        <div class="rsvp-copy reveal"><p class="eyebrow">WE SAVED YOU A SEAT</p><h2 id="rsvp-title">Datang, dan menjadi<br>bagian dari <em>cerita kami.</em></h2><p>Kami menantikan kehadiran dan doa baikmu. Beri tahu kami apakah kamu bisa ikut merayakan hari istimewa ini.</p><div class="rsvp-signature">With love,<br><span>${esc(names)}</span></div>${floral('rsvp-flower')}</div>
        <div class="rsvp-form-wrap reveal"><form id="rsvp-form"><h3>Konfirmasi Kehadiran</h3><p class="form-intro">Lengkapi kabar baikmu di bawah ini.</p>
          <div class="demo-notice">${icon('leaf')}<p><strong>Formulir simulasi</strong>Data hanya disimpan di browser ini, belum dikirim ke pasangan.</p></div>
          <div class="field"><label for="name">Nama lengkap <span aria-hidden="true">*</span></label><input id="name" name="name" autocomplete="name" placeholder="Tulis namamu" maxlength="100" required value="${guest === data.defaultGuest ? '' : esc(guest)}" /></div>
          <div class="field"><label for="attendance">Apakah kamu akan hadir? <span aria-hidden="true">*</span></label><select id="attendance" name="attendance" required><option value="" disabled selected>Pilih konfirmasi kehadiran</option><option value="yes">Dengan senang hati, saya hadir</option><option value="no">Maaf, saya belum bisa hadir</option><option value="maybe">Saya masih belum bisa memastikan</option></select></div>
          <div class="field" id="guest-count-field" hidden><label for="guest-count">Jumlah tamu (termasuk kamu)</label><select id="guest-count" name="guests" disabled><option value="1">1 orang</option><option value="2">2 orang</option><option value="3">3 orang</option><option value="4">4 orang</option><option value="5">5 orang</option></select></div>
          <div class="field"><label for="message">Ucapan & doa <span class="optional">(opsional)</span></label><textarea id="message" name="message" rows="3" maxlength="1000" placeholder="Titipkan doa dan harapan baikmu…"></textarea></div>
          <button class="button button-primary submit-button" type="submit"><span>Simpan Konfirmasi Contoh</span>${icon('arrow')}</button><p class="form-feedback" id="form-feedback" role="status" aria-live="polite" tabindex="-1"></p>
        </form></div>
      </section>
      <section class="wishes-section section" aria-labelledby="wishes-title"><div class="section-heading reveal"><p class="eyebrow">WORDS FROM THE HEART</p><h2 id="wishes-title">Titip <em>doa & cinta</em></h2><p>Setiap kata baik adalah hadiah yang berarti.</p></div><div id="wishes-list" class="wishes-list"></div><p class="subtle-note">Ucapan simulasi hanya terlihat di browser ini.</p><button class="text-button clear-demo" id="clear-demo" hidden>Hapus data simulasi di browser ini</button></section>
      ${sections.gifts && data.accounts.length ? `<section class="gift-section section" id="hadiah" aria-labelledby="gift-title"><div class="section-heading reveal"><p class="eyebrow">A LITTLE TOKEN OF LOVE</p><h2 id="gift-title">Tanda <em>kasih</em></h2><p>${esc(data.giftIntro)}</p></div><div class="gift-grid">${data.accounts.map(account=>`<article class="gift-card"><p class="gift-bank">${esc(account.bank)}</p><p class="gift-number">${esc(account.number)}</p><p class="gift-holder">a.n. ${esc(account.holder)}</p>${account.qr ? `<img class="gift-qr" src="${esc(account.qr)}" alt="QR rekening ${esc(account.holder)}" loading="lazy"/>`:''}<button class="button button-outline" data-copy-account="${esc(account.number)}">${icon('copy')}Salin nomor rekening</button></article>`).join('')}</div></section>`:''}
      <footer class="closing section">${floral('closing-flower-left')}${floral('closing-flower-right')}<div class="closing-inner"><div class="botanical-mark">${icon('leaf')}</div><p class="eyebrow">UNTIL OUR HAPPY DAY</p><h2>Sampai bertemu di<br><em>hari bahagia kami.</em></h2><p>${esc(data.closingText || 'Terima kasih telah menjadi bagian dari perjalanan kami. Doa dan kehadiranmu adalah kebahagiaan bagi kami.')}</p><p class="closing-names">${esc(names)}</p><span class="closing-date">${esc(dateLabel)}</span></div><div class="footer-note"><span>Made with love</span><span>FLORAL REVERIE <i>by</i> Undangan Onlineku</span><a href="#cover">Kembali ke atas ↑</a></div></footer>
    </div>
  </main>
  <button type="button" class="music-button" id="music-button" aria-label="Putar musik" title="Putar musik" aria-pressed="false">${icon('music')}<span class="music-status" aria-hidden="true">OFF</span></button>
  <nav class="mobile-nav" aria-label="Navigasi cepat" hidden>${[['mempelai','heart','Mempelai'],['acara','calendar','Acara'],['galeri','camera','Galeri'],['rsvp','mail','RSVP']].map(([id,ico,label]) => `<a href="#${id}">${icon(ico)}<span>${label}</span></a>`).join('')}</nav>
  <dialog id="gallery-dialog" class="gallery-dialog" aria-label="Galeri foto pernikahan"><button class="dialog-close" aria-label="Tutup galeri">${icon('close')}</button><button class="gallery-prev gallery-control" aria-label="Foto sebelumnya">${icon('chevron')}</button><figure><img id="dialog-image" alt=""/><figcaption id="dialog-caption"></figcaption></figure><button class="gallery-next gallery-control" aria-label="Foto berikutnya">${icon('chevron')}</button><p class="gallery-counter" id="gallery-counter"></p></dialog>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const hiddenSections = {quote:'.quote-section',couplePhoto:'.couple-photo-wrap',countdown:'.countdown, #countdown-ended',calendar:'#save-calendar',story:'.story-section',gallery:'.gallery-section',music:'#music-button',wishes:'.wishes-section',closing:'.closing'};
// Fit each name to the cover instead of clipping long names on narrow screens.
function fitCoverNames(){
  const title=document.querySelector('#cover-title');
  title.style.fontSize='';
  const size=parseFloat(getComputedStyle(title).fontSize), available=title.clientWidth-16;
  let width=0;
  title.querySelectorAll(':scope > span').forEach(span=>{const range=document.createRange();range.selectNodeContents(span);width=Math.max(width,range.getBoundingClientRect().width);});
  if(width>available)title.style.fontSize=`${size*available/width}px`;
}
document.fonts.ready.then(fitCoverNames);
let coverWidth=0;
new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==coverWidth){coverWidth=width;fitCoverNames();}}).observe(document.querySelector('.cover-content'));
for (const [key,selector] of Object.entries(hiddenSections)) if (!sections[key]) document.querySelectorAll(selector).forEach(el=>el.remove());
if (!data.couplePhoto) document.querySelector('.couple-photo-wrap')?.remove();
if (!document.querySelector('.couple-photo-wrap')) document.querySelector('.couple-layout').classList.add('no-couple-photo');
if (!data.gallery.length) document.querySelector('.gallery-section')?.remove();
if (!data.story.length) document.querySelector('.story-section')?.remove();
if (!sections.rsvp && !sections.wishes) document.querySelector('.rsvp-section')?.remove();
if (!data.demo && !data.music.src) document.querySelector('#music-button')?.remove();
document.querySelectorAll('.mobile-nav a').forEach(link=>{if(!document.querySelector(link.hash))link.remove();});
if (!sections.rsvp && sections.wishes) {
  document.querySelectorAll('a[href="#rsvp"]').forEach(link=>link.textContent='Ucapan');
  document.querySelector('#rsvp-title').textContent='Titipkan doa & harapan baikmu.';
  document.querySelector('#rsvp-form h3').textContent='Ucapan & doa';
  document.querySelector('#attendance').closest('.field').hidden=true;
  document.querySelector('#attendance').disabled=true;
  document.querySelector('#message').required=true;
}
if (!sections.wishes) document.querySelector('#message')?.closest('.field').remove();
if (isLive) {
  document.querySelector('.demo-notice')?.remove();
  const note=document.querySelector('.wishes-section .subtle-note');if(note)note.textContent='Ucapan ditampilkan setelah disetujui oleh pengelola.';
  document.querySelector('#clear-demo')?.remove();
} else if (isPreview) {
  const notice=document.querySelector('.demo-notice p');if(notice)notice.textContent='Pratinjau draft. Formulir tidak mengirim atau menyimpan respons.';
  const note=document.querySelector('.wishes-section .subtle-note');if(note)note.textContent='Respons tamu akan tampil pada undangan yang sudah diterbitkan.';
}
let opened = false;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const content = document.querySelector('#invitation-content');
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
}), { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));

function openInvitation(target = '#mempelai') {
  if (!opened) {
    content.hidden = false; opened = true;
    document.body.classList.add('invitation-open');
    document.querySelector('.mobile-nav').hidden = false;
    document.querySelector('#open-invitation span').textContent = 'Lihat Undangan';
  }
  requestAnimationFrame(() => {
    const section = document.querySelector(target);
    section?.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    const heading = section?.querySelector('h2');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  });
}
document.querySelector('#open-invitation').addEventListener('click', () => openInvitation('#invitation-content'));
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  const target = link.getAttribute('href');
  if (target !== '#cover') { event.preventDefault(); openInvitation(target); }
}));
if (['#mempelai', '#acara', '#galeri', '#rsvp'].includes(location.hash)) openInvitation(location.hash);

const activeObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) document.querySelectorAll('.mobile-nav a').forEach(link => {
    const active = link.hash === `#${entry.target.id}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  });
}), { rootMargin: '-15% 0px -55% 0px' });
document.querySelectorAll('#mempelai, #acara, #galeri, #rsvp').forEach(element => activeObserver.observe(element));

function updateCountdown() {
  if (!document.querySelector('.countdown')) return;
  const count = countdownTo(data.date);
  for (const unit of ['days','hours','minutes','seconds']) document.querySelector(`[data-count="${unit}"]`).textContent = String(count[unit]).padStart(2, '0');
  document.querySelector('#countdown-ended').hidden = !count.ended;
}
updateCountdown();
setInterval(updateCountdown, 1000);

let toastTimeout;
function toast(message) {
  const element = document.querySelector('#toast'); element.textContent = message; element.classList.add('show');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => element.classList.remove('show'), 5000);
}
document.querySelector('#save-calendar')?.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([createCalendar(data)], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `${data.id}.ics`; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(data.demo ? 'Kalender contoh diunduh. Buka file .ics untuk melihat detailnya.' : 'Kalender diunduh. Buka file .ics untuk menambahkan acara.');
});

const musicButton = document.querySelector('#music-button');
if (musicButton) {
  const audio = data.music.src ? new Audio(data.music.src) : null;
  if (audio) { audio.loop=true; audio.volume=data.music.volume; audio.preload='metadata'; }
  let attempt = 0, wantsMusic = false, playbackState = 'off';
  const music = audio ? { start:()=>audio.play(), pause:()=>audio.pause() } : createMusic(playing => {
    if (playing && wantsMusic) showMusicState('playing');
  });

  function showMusicState(state) {
    playbackState = state;
    const playing = state === 'playing';
    const label = playing ? 'Jeda musik' : state === 'loading' ? 'Batalkan pemutaran musik' : 'Putar musik';
    musicButton.dataset.state = state;
    musicButton.setAttribute('aria-pressed', String(playing));
    musicButton.setAttribute('aria-label', label);
    musicButton.title = state === 'waiting' ? 'Musik akan mulai saat kamu mengetuk halaman' : label;
    musicButton.querySelector('.music-status').textContent = playing ? 'ON' : state === 'loading' ? '…' : 'OFF';
    musicButton.querySelector('svg').outerHTML = icon(playing ? 'pause' : 'music');
  }
  function stopWaitingForGesture() {
    document.removeEventListener('click', startAfterGesture);
    document.removeEventListener('keydown', startAfterGesture);
  }
  async function startMusic(manual = false) {
    wantsMusic = true;
    const currentAttempt = ++attempt;
    showMusicState('loading');
    try {
      await music.start();
      if (currentAttempt !== attempt || !wantsMusic) return;
      showMusicState('playing');
      stopWaitingForGesture();
    } catch (error) {
      if (currentAttempt !== attempt) return;
      const blocked = error.name === 'NotAllowedError';
      showMusicState(blocked ? 'waiting' : 'off');
      if (!blocked) { wantsMusic = false; stopWaitingForGesture(); }
      if (manual) toast(blocked ? 'Ketuk tombol musik sekali lagi untuk memutar.' : 'Musik belum dapat diputar. Silakan coba lagi.');
    }
  }
  function startAfterGesture(event) {
    if (!wantsMusic || playbackState === 'playing' || musicButton.contains(event.target)) return;
    if (event.type === 'keydown' && (event.repeat || ['Shift','Control','Alt','Meta','Escape'].includes(event.key))) return;
    void startMusic();
  }
  musicButton.addEventListener('click', () => {
    stopWaitingForGesture();
    if (playbackState === 'playing' || playbackState === 'loading') {
      wantsMusic = false; attempt++;
      music.pause(); showMusicState('off');
    } else void startMusic(true);
  });
  audio?.addEventListener('pause', () => { if (playbackState === 'playing') showMusicState('off'); });
  audio?.addEventListener('error', () => {
    wantsMusic = false; attempt++; stopWaitingForGesture(); showMusicState('off');
    musicButton.title = 'Musik belum dapat diputar. Ketuk untuk mencoba lagi.';
  });
  // Keep the admin's embedded preview quiet while editing other components.
  if (!isPreview || window.self === window.top) {
    document.addEventListener('click', startAfterGesture);
    document.addEventListener('keydown', startAfterGesture);
    void startMusic();
  }
}

const dialog = document.querySelector('#gallery-dialog');
let galleryIndex = 0;
function showPhoto(index) {
  galleryIndex = (index + data.gallery.length) % data.gallery.length;
  const photo = data.gallery[galleryIndex];
  const img = document.querySelector('#dialog-image'); img.src = photo.src; img.alt = photo.alt;
  document.querySelector('#dialog-caption').textContent = photo.caption;
  document.querySelector('#gallery-counter').textContent = `${galleryIndex + 1} / ${data.gallery.length}`;
}
document.querySelectorAll('[data-gallery]').forEach(button => button.addEventListener('click', () => {
  showPhoto(Number(button.dataset.gallery)); dialog.showModal(); document.body.classList.add('dialog-open');
}));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
document.querySelector('.gallery-prev').addEventListener('click', () => showPhoto(galleryIndex - 1));
document.querySelector('.gallery-next').addEventListener('click', () => showPhoto(galleryIndex + 1));
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(galleryIndex + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(galleryIndex - 1); }
});

let wishes = [];
if (data.demo) {
  try { const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))wishes=saved.filter(item=>item&&typeof item.name==='string'&&typeof item.message==='string').slice(0,50); } catch {}
}
function renderWishes() {
  const list=document.querySelector('#wishes-list');if(!list)return;
  const visible=wishes.filter(item=>item.message.trim());
  list.innerHTML=visible.length?visible.map(item=>`<article class="wish"><span class="wish-avatar" aria-hidden="true">${esc(item.name[0]?.toUpperCase()||'♡')}</span><div><div class="wish-heading"><h3>${esc(item.name)}</h3></div><p>${esc(item.message)}</p></div>${icon('heart')}</article>`).join(''):`<div class="empty-wishes">${icon('mail')}<p>Sepatah doa darimu, berarti bagi kami.</p><span>Ucapan yang sudah disetujui akan tampil di sini.</span></div>`;
  const clear=document.querySelector('#clear-demo');if(clear)clear.hidden=!wishes.length;
}
renderWishes();
if (isLive && sections.wishes) fetch(`/api/invitations/${data.slug}/wishes`).then(async response=>{if(!response.ok)throw new Error();wishes=(await response.json()).wishes;renderWishes();}).catch(()=>{const note=document.querySelector('.wishes-section .subtle-note');if(note)note.textContent='Ucapan belum dapat dimuat. Silakan coba lagi nanti.';});
const form = document.querySelector('#rsvp-form');
if (form) {
  const attendance=document.querySelector('#attendance'), guestCount=document.querySelector('#guest-count');
  const submit=form.querySelector('[type="submit"]'), label=data.demo?'Simpan Konfirmasi Contoh':sections.rsvp?'Kirim konfirmasi':'Kirim ucapan';
  submit.querySelector('span').textContent=isPreview?'Formulir pratinjau':label;
  if(isPreview)submit.disabled=true;
  form.insertAdjacentHTML('beforeend','<div class="rsvp-trap" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"/></label></div>');
  attendance.addEventListener('change',()=>{document.querySelector('#guest-count-field').hidden=attendance.value!=='yes';guestCount.disabled=attendance.value!=='yes';});
  document.querySelector('#name').addEventListener('input',event=>event.target.setCustomValidity(''));
  let submissionId=crypto.randomUUID();
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(isPreview)return;
    const nameInput=document.querySelector('#name');
    if(!nameInput.value.trim()){nameInput.setCustomValidity('Tuliskan nama kamu terlebih dahulu.');nameInput.reportValidity();return;}
    if(!form.reportValidity())return;
    const feedback=document.querySelector('#form-feedback');feedback.textContent='';feedback.classList.remove('success');
    submit.disabled=true;submit.querySelector('span').textContent='Mengirim…';
    const result={name:nameInput.value.trim().slice(0,100),attendance:sections.rsvp?attendance.value:'message',guests:attendance.value==='yes'?Number(guestCount.value):0,message:document.querySelector('#message')?.value.trim().slice(0,1000)||'',createdAt:new Date().toISOString()};
    try{
      if(isLive){
        const response=await fetch(`/api/invitations/${data.slug}/rsvp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...result,submissionId,website:form.elements.website.value})});
        const body=await response.json();if(!response.ok)throw new Error(body.error||'Respons belum terkirim. Coba lagi.');
        feedback.textContent=`Terima kasih, ${result.name}! ${sections.rsvp?'Konfirmasi':'Ucapan'} kamu sudah diterima.${result.message?' Ucapan akan tampil setelah disetujui pengelola.':''}`;
        submissionId=crypto.randomUUID();
      } else {
        wishes=[result,...wishes].slice(0,50);let saved=true;try{localStorage.setItem(storageKey,JSON.stringify(wishes));}catch{saved=false;}
        feedback.textContent=saved?`Terima kasih, ${result.name}! Konfirmasi contoh tersimpan di browser ini, belum dikirim ke pasangan.`:'Contoh ditampilkan sementara. Browser tidak mengizinkan penyimpanan; belum dikirim ke pasangan.';renderWishes();
      }
      feedback.classList.add('success');form.reset();document.querySelector('#guest-count-field').hidden=true;guestCount.disabled=true;
    }catch(error){feedback.textContent=error.message||'Koneksi bermasalah. Silakan coba kembali; isianmu tetap tersimpan di formulir.';}
    finally{submit.disabled=false;submit.querySelector('span').textContent=label;feedback.focus({preventScroll:true});}
  });
}
document.querySelector('#clear-demo')?.addEventListener('click',()=>{try{localStorage.removeItem(storageKey);}catch{return toast('Browser tidak mengizinkan penghapusan.');}wishes=[];renderWishes();const feedback=document.querySelector('#form-feedback');if(feedback)feedback.textContent='';toast('Data simulasi di browser ini telah dihapus.');});
document.querySelectorAll('[data-copy-account]').forEach(button=>button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(button.dataset.copyAccount);toast('Nomor rekening berhasil disalin.');}catch{prompt('Salin nomor rekening:',button.dataset.copyAccount);}}));

document.querySelectorAll('img:not(.floral)').forEach(img => {
  const handleError = () => { img.classList.add('image-unavailable'); img.closest('.couple-photo, .gallery-item')?.classList.add('has-image-error'); };
  img.addEventListener('error', handleError);
  if (img.complete && img.naturalWidth === 0) handleError();
});

}
