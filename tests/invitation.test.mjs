import test from 'node:test';
import assert from 'node:assert/strict';
import { getGuest, escapeHTML, countdownTo, createCalendar, formatDate, formatTime } from '../src/utils.js';
import { invitation } from '../src/invitation.js';

test('guest names decode spaces and Indonesian names while bounding input length', () => {
  assert.equal(getGuest('?to=Bapak%20Budi%20%26%20Ibu%20Sari', 'Tamu'), 'Bapak Budi & Ibu Sari');
  assert.equal(getGuest('?to=%20%20', 'Tamu'), 'Tamu');
  assert.equal(getGuest('?to=' + 'a'.repeat(2000), 'Tamu').length, 100);
  assert.equal(escapeHTML('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('countdown uses absolute time and clamps elapsed events to zero', () => {
  const now = Date.parse('2027-06-19T01:58:57Z');
  assert.deepEqual(countdownTo('2027-06-20T09:00:00+07:00', now), {days:1,hours:0,minutes:1,seconds:3,ended:false});
  assert.deepEqual(countdownTo('2020-01-01', now), {days:0,hours:0,minutes:0,seconds:0,ended:true});
});
test('event labels consistently use the invitation time zone', () => {
  assert.equal(formatDate(invitation.date), 'Minggu, 20 Juni 2027');
  assert.equal(formatTime(invitation.events[0].start), '09.00');
  assert.equal(formatTime(invitation.events[1].end), '14.00');
});
test('calendar exports both events in UTC and clearly labels demo data', () => {
  const output = createCalendar(invitation);
  assert.equal((output.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(output, /DTSTART:20270620T020000Z/);
  assert.match(output, /DTEND:20270620T070000Z/);
  assert.match(output.replace(/\r\n /g, ''), /Bukan undangan acara sungguhan/);
  for (const line of output.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
});
test('calendar escapes punctuation and folds Unicode without splitting characters', () => {
  const changed = structuredClone(invitation);
  changed.events[0].venue = 'Taman; Bunga, Melati\n' + '🌸'.repeat(50);
  const output = createCalendar(changed);
  assert.ok(output.replace(/\r\n /g, '').includes('Taman\\; Bunga\\, Melati\\n' + '🌸'.repeat(50)));
  for (const line of output.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
});
