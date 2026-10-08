import { escapeHTML } from './utils.js';

export function parseGuestNames(text) {
  const names = [], seen = new Set();
  let duplicates = 0;
  for (const [index, line] of String(text).split(/\r\n|\n|\r/).entries()) {
    const name = line.normalize('NFC').trim().replace(/[\t ]+/g, ' ');
    if (!name) continue;
    if (name.length > 100) throw new Error(`Nama pada baris ${index + 1} terlalu panjang. Maksimal 100 karakter per penerima.`);
    const key = name.toLocaleLowerCase('id-ID');
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key); names.push(name);
    if (names.length > 1000) throw new Error('Buat maksimal 1.000 tautan sekaligus. Bagi daftar menjadi beberapa kelompok.');
  }
  return {names, duplicates};
}

export function guestLink(origin, slug, name) {
  return `${new URL(`/u/${encodeURIComponent(slug)}`, origin).href}?to=${encodeURIComponent(name)}`;
}

// Kept outside the invitation draft: never sent to an API or browser storage.
export function createGuestLinkTool({icon, notify}) {
  let text = '', generated = null;
  return {
    reset() { text = ''; generated = null; },
    mount(pane, record) {
      const e = escapeHTML;
      if (!record.published) generated = null;
      pane.innerHTML = `
        <div class="pane-heading"><h2>Buat Link Tamu</h2><p>Satu undangan, sapaan personal untuk setiap penerima.</p></div>
        ${!record.published ? '<div class="helper-note"><p><strong>Undangan masih draft.</strong> Terbitkan undangan terlebih dahulu agar tautannya dapat dibuka tamu. Kamu bisa menyiapkan daftar nama di bawah ini.</p></div>' : ''}
        <div class="studio-field"><label for="guest-names">Nama penerima</label><textarea id="guest-names" rows="7" autocomplete="off" spellcheck="false" aria-describedby="guest-input-help guest-error" placeholder="Bapak Budi\nIbu Sari\nBapak Andi & Keluarga">${e(text)}</textarea><small id="guest-input-help">Satu nama per baris. Bisa ditempel dari satu kolom Excel. Baris kosong dan nama duplikat diabaikan. Maksimal 1.000 penerima per proses.</small></div>
        <p id="guest-error" class="inline-error" role="alert"></p>
        <div class="guest-tool-actions"><button type="button" class="studio-button primary" id="generate-guest-links" ${record.published ? '' : 'disabled'}>${icon('plus')}Buat Tautan</button><button type="button" class="text-button" id="clear-guest-links">Kosongkan daftar</button></div>
        <p class="guest-tool-note">Daftar hanya ada selama editor ini terbuka. Salin hasilnya sebelum memuat ulang atau meninggalkan editor. Tautan yang sudah disalin tetap berlaku selama undangan aktif.</p>
        <section class="guest-results" aria-labelledby="guest-results-title"><div class="guest-results-heading"><div><h3 id="guest-results-title">Tautan penerima</h3><p id="guest-link-status" role="status" aria-live="polite"></p></div><button type="button" class="studio-button secondary" id="copy-all-guest-links" disabled>${icon('copy')}Salin Semua</button></div><div id="guest-link-list"></div></section>
        <div id="guest-copy-fallback" class="studio-field guest-copy-fallback" hidden><label for="guest-copy-text">Salin secara manual</label><textarea id="guest-copy-text" rows="5" readonly></textarea><small>Penyalinan otomatis dibatasi browser. Teks sudah dipilih; gunakan Salin atau Ctrl/Cmd+C.</small></div>`;
      const input = pane.querySelector('#guest-names'), error = pane.querySelector('#guest-error');
      const list = pane.querySelector('#guest-link-list'), status = pane.querySelector('#guest-link-status');
      const copyAll = pane.querySelector('#copy-all-guest-links'), clear = pane.querySelector('#clear-guest-links');
      const fallback = pane.querySelector('#guest-copy-fallback');
      let entries = [];
      function renderResults(changed = false) {
        entries = (generated?.names || []).map(name => ({name, url:guestLink(location.origin, record.slug, name)}));
        copyAll.disabled = !entries.length;
        clear.disabled = !text;
        status.textContent = entries.length ? `${entries.length} tautan siap disalin.${generated.duplicates ? ` ${generated.duplicates} nama duplikat diabaikan.` : ''}` : '';
        list.innerHTML = entries.length ? `<ol class="guest-link-rows">${entries.map((entry, index) => `<li><div class="guest-link-detail"><strong>${e(entry.name)}</strong><input readonly aria-label="Tautan untuk ${e(entry.name)}" value="${e(entry.url)}"/></div><div class="guest-link-actions"><a class="text-button" href="${e(entry.url)}" target="_blank" rel="noopener noreferrer" aria-label="Buka undangan untuk ${e(entry.name)}">Buka ${icon('external')}</a><button type="button" class="studio-button secondary" data-copy-guest="${index}" aria-label="Salin tautan untuk ${e(entry.name)}">${icon('copy')}Salin</button></div></li>`).join('')}</ol>` : `<p class="guest-results-empty">${changed ? 'Daftar berubah. Klik Buat Tautan untuk memperbarui hasil.' : 'Tautan akan muncul di sini setelah kamu memasukkan nama dan memilih Buat Tautan.'}</p>`;
      }
      async function copy(value, message) {
        try { await navigator.clipboard.writeText(value); fallback.hidden = true; notify(message); }
        catch {
          fallback.hidden = false;
          const area = pane.querySelector('#guest-copy-text');area.value = value;area.focus();area.select();
        }
      }
      input.addEventListener('input', () => {
        text = input.value; generated = null; error.textContent = ''; fallback.hidden = true; renderResults(true);
      });
      pane.querySelector('#generate-guest-links').addEventListener('click', () => {
        error.textContent = ''; fallback.hidden = true;
        try {
          generated = parseGuestNames(text);
          if (!generated.names.length) throw new Error('Tulis minimal satu nama penerima terlebih dahulu.');
          renderResults();
        } catch (failure) { generated = null; renderResults(); error.textContent = failure.message; input.focus(); }
      });
      clear.addEventListener('click', () => { text = ''; generated = null; input.value = ''; error.textContent = ''; fallback.hidden = true; renderResults(); input.focus(); });
      copyAll.addEventListener('click', () => { void copy(entries.map(entry => `${entry.name}\n${entry.url}`).join('\n\n'), `${entries.length} tautan penerima disalin.`); });
      list.addEventListener('click', event => {
        if (event.target.matches('input')) event.target.select();
        const button = event.target.closest('[data-copy-guest]');
        if (button) void copy(entries[Number(button.dataset.copyGuest)].url, 'Tautan penerima disalin.');
      });
      renderResults();
    },
  };
}
