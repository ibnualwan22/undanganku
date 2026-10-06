export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function getGuest(search, fallback) {
  const name = new URLSearchParams(search).get('to')?.trim();
  return name ? name.slice(0, 100) : fallback;
}

export function countdownTo(date, now = Date.now()) {
  const total = Math.max(0, Math.floor((new Date(date).getTime() - now) / 1000));
  return { days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24, minutes: Math.floor(total / 60) % 60, seconds: total % 60, ended: total === 0 };
}

export function formatDate(date, timeZone = 'Asia/Jakarta') {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(new Date(date));
}

export function formatTime(date, timeZone = 'Asia/Jakarta') {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(new Date(date));
}

const icsEscape = value => String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const icsDate = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

// Fold calendar lines at 75 UTF-8 bytes, as required by the iCalendar format.
function foldLine(line) {
  const encoder = new TextEncoder();
  let result = '', part = '', bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) { result += part + '\r\n'; part = ' '; bytes = 1; }
    part += char; bytes += size;
  }
  return result + part;
}

export function createCalendar(data) {
  const names = data.couple.map(person => person.name).join(' & ');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Undangan Onlineku//Floral Reverie//ID', 'CALSCALE:GREGORIAN'];
  data.events.forEach((event, index) => {
    lines.push('BEGIN:VEVENT', `UID:${icsEscape(data.id)}-${index}@undangan-onlineku.local`, `DTSTAMP:${icsDate(Date.now())}`, `DTSTART:${icsDate(event.start)}`, `DTEND:${icsDate(event.end)}`, `SUMMARY:${icsEscape(`${event.title} — ${names}`)}`, `LOCATION:${icsEscape(`${event.venue}, ${event.address}`)}`, `DESCRIPTION:${icsEscape(data.demo ? 'Contoh acara untuk pratinjau template Floral Reverie. Bukan undangan acara sungguhan.' : `Pernikahan ${names}.`)}`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
