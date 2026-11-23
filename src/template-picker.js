import { templates } from './templates.js';
import { escapeHTML as e } from './utils.js';

export function templatePicker(icon) {
  const ready = templates.filter(template => template.status === 'ready');
  const planned = templates.filter(template => template.status === 'planned');
  const swatches = template => `<div class="template-swatches" aria-hidden="true">${template.palette.map(color => `<span style="background:${color}"></span>`).join('')}</div>`;
  return `<div class="workspace template-workspace">
    <button class="back-link" data-action="list">${icon('back')}Semua undangan</button>
    <div class="workspace-heading"><div><p class="studio-kicker">LANGKAH PERTAMA · PILIH SUASANANYA</p><h1>Desain untuk<br>hari bahagia<span>.</span></h1><p>Lihat pratinjaunya, pilih yang paling sesuai, lalu lengkapi cerita pasangan.</p></div><span class="template-availability">${ready.length} desain siap digunakan</span></div>
    <div class="template-options">${ready.map((template, index) => `<article class="template-option" data-template-card="${template.id}">
      <a class="template-art ${template.id}" href="${template.preview}" target="_blank" rel="noopener" aria-label="Lihat preview ${e(template.name)}"><span class="template-art-border"></span>${template.id==='monochrome-vows'?'<img class="template-art-person left" src="/assets/monochrome-groom.webp" alt=""/><img class="template-art-person right" src="/assets/monochrome-bride.webp" alt=""/>':`<img src="${template.decoration}" class="template-art-flower left" alt=""/><img src="${template.decoration}" class="template-art-flower right" alt=""/>`}<span class="template-art-copy"><span>THE WEDDING COLLECTION</span><strong>${e(template.name.replace(' ', '\n'))}</strong><i>${template.id==='monochrome-vows'?'Two souls. One story.':index === 0 ? 'A little love, forever.' : 'Love in full bloom.'}</i><span class="template-art-line"></span><span>UNDANGAN PERNIKAHAN</span></span><span class="template-preview-hint">Lihat preview ${icon('external')}</span></a>
      <div class="template-option-content"><div class="template-option-title"><h2>${e(template.name)}</h2>${swatches(template)}</div><p>${e(template.description)}</p><div class="template-option-actions"><a class="text-button" href="${template.preview}" target="_blank" rel="noopener" aria-label="Preview ${e(template.name)}">Preview ${icon('external')}</a><button class="studio-button primary" data-action="choose-template" data-template="${template.id}">Gunakan desain ${icon('arrow')}</button></div></div>
    </article>`).join('')}</div>
    <section class="template-roadmap" aria-labelledby="template-roadmap-title"><div class="template-roadmap-heading"><h2 id="template-roadmap-title">Rencana desain berikutnya</h2><p>Konsep yang masuk daftar. Belum tersedia untuk dipilih.</p></div><div class="template-plans">${planned.map(template => `<article><div>${swatches(template)}<span class="template-planned-label">Dalam rencana</span></div><h3>${e(template.name)}</h3><p>${e(template.description)}</p></article>`).join('')}</div></section>
  </div>`;
}
