import { escapeHTML as e } from './utils.js';
import { normalizePortrait, portraitStyle } from './portraits.js';

export function portraitEditor(data, uploadBox) {
  return `<section class="portrait-editor" aria-labelledby="portrait-editor-title"><h3 id="portrait-editor-title">Potret Monochrome Vows</h3><p>Upload foto masing-masing mempelai. Semua foto tampil hitam-putih di desain ini; file asli tetap tersimpan. Gunakan foto tegak dengan wajah terlihat jelas.</p><div class="portrait-editor-grid">${[1,0].map((index)=>{
    const person=data.couple[index], p=normalizePortrait(person.portrait);
    return `<article class="portrait-editor-card"><h4>${index===1?'Sisi kiri':'Sisi kanan'} · ${e(person.name)}</h4>${uploadBox(`couple.${index}.portrait.src`,'Foto '+person.name)}<div class="portrait-crop-preview" data-portrait-preview="${index}" style="${portraitStyle(p)}">${p.src?`<img src="${e(p.src)}" alt="Pratinjau potongan foto ${e(person.name)}"/>`:'<span>Upload foto untuk mengatur potongan.</span>'}</div><p class="portrait-crop-help">Geser wajah mendekati tepi luar untuk efek separuh potret. Periksa juga preview HP setelah disimpan.</p>${[['x','Geser horizontal',0,100,1],['y','Geser vertikal',0,100,1],['zoom','Perbesar foto',1,2,.05]].map(([key,label,min,max,step])=>`<div class="studio-field"><label for="portrait-${index}-${key}">${label} <output data-portrait-value="${index}-${key}">${key==='zoom'?Math.round(p[key]*100)+'%':Math.round(p[key])+'%'}</output></label><input id="portrait-${index}-${key}" type="range" data-field="couple.${index}.portrait.${key}" value="${p[key]}" min="${min}" max="${max}" step="${step}" ${p.src?'':'disabled'}/></div>`).join('')}</article>`;
  }).join('')}</div></section>`;
}
export function updatePortraitPreview(root,data) {
  data.couple.forEach((person,index)=>{
    const p=normalizePortrait(person.portrait),box=root.querySelector(`[data-portrait-preview="${index}"]`);
    if(!box)return;
    box.style.cssText=portraitStyle(p);
    ['x','y','zoom'].forEach(key=>{root.querySelector(`[data-portrait-value="${index}-${key}"]`).textContent=Math.round(p[key]*(key==='zoom'?100:1))+'%';});
  });
}
