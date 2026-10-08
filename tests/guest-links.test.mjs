import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGuestNames, guestLink } from '../src/guest-links.js';
import { getGuest } from '../src/utils.js';

test('bulk guest names handle spreadsheet lines, blank rows and duplicate names', () => {
  assert.deepEqual(parseGuestNames('  Bapak Budi \r\n\r\nIbu\t Sari\nBAPAK BUDI\rJose\u0301\nJosé'), {
    names:['Bapak Budi','Ibu Sari','José'], duplicates:2,
  });
  assert.deepEqual(parseGuestNames(' \n\t'), {names:[],duplicates:0});
  assert.throws(() => parseGuestNames('Budi\n' + 'x'.repeat(101)), /baris 2/);
  assert.throws(() => parseGuestNames(Array.from({length:1001},(_,i) => 'Tamu '+i).join('\n')), /1.000/);
});
test('generated links preserve the exact guest name without introducing query parameters or fragments', () => {
  for (const name of ['Bapak Budi & Ibu Sari', 'Dwi + Keluarga #1', 'José / 李 🌸', 'Pak "Ali"?to=lain&admin=true', '<img src=x onerror=alert(1)>']) {
    const url = new URL(guestLink('https://undangan.example', 'dim-linda', name));
    assert.equal(url.origin,'https://undangan.example');
    assert.equal(url.pathname,'/u/dim-linda');
    assert.equal(url.hash,'');
    assert.deepEqual([...url.searchParams.keys()],['to']);
    assert.equal(getGuest(url.search,'Tamu'),name);
  }
});
