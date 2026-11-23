import { escapeHTML as e } from './utils.js';
import { normalizePortrait, portraitStyle } from './portraits.js';

function portrait(person,side) {
  const p=normalizePortrait(person.portrait);
  return `<figure class="mono-portrait mono-${side} ${p.src?'':'mono-empty'}" style="${portraitStyle(p)}"><span class="mono-portrait-fallback" aria-hidden="true">${e(person.name.slice(0,1))}</span>${p.src?`<img src="${e(p.src)}" alt="Potret ${e(person.name)}" fetchpriority="high"/>`:''}<figcaption>${e(person.name)}</figcaption></figure>`;
}
export function prepareMonochrome(data) {
  const cover=document.querySelector('.cover'), [bride,groom]=data.couple;
  cover.querySelectorAll('.floral,.cover-line,.cover-side-note,.cover-arch,.botanical-mark').forEach(el=>el.remove());
  cover.insertAdjacentHTML('afterbegin',`<div class="mono-cover-frame" aria-hidden="true"></div>${portrait(groom,'left')}${portrait(bride,'right')}`);
  const monogram=`<div class="mono-monogram" aria-hidden="true"><span>${e(groom.name.slice(0,1))}</span><i>&</i><span>${e(bride.name.slice(0,1))}</span></div>`;
  cover.querySelector('.cover-content').insertAdjacentHTML('afterbegin',monogram);
  cover.querySelector('.eyebrow').textContent='TOGETHER, FOR A LIFETIME';
  cover.querySelector('.cover-footnote').textContent='Dua jiwa. Satu cerita.';
  document.querySelectorAll('.botanical-mark,.little-branch').forEach(el=>{el.innerHTML='<span class="mono-cross" aria-hidden="true">✳</span>';});
  document.querySelectorAll('.floral,.story-flower-wrap').forEach(el=>el.remove());
  document.querySelectorAll('.person').forEach((el,index)=>{
    const person=data.couple[index],p=normalizePortrait(person.portrait);
    if(p.src)el.insertAdjacentHTML('afterbegin',`<div class="mono-profile-photo" style="${portraitStyle(p)}"><img src="${e(p.src)}" alt="${e(person.name)}" loading="lazy"/></div>`);
    el.classList.add('reveal');
  });
  document.querySelector('.couple-layout').classList.add('mono-couple-layout');
  document.querySelectorAll('.event-card,.gallery-item,.gift-card,.closing-inner').forEach((el,index)=>{
    el.classList.add('reveal');el.style.setProperty('--mono-delay',`${Math.min(index%3,2)*100}ms`);
  });
  document.querySelectorAll('.mono-portrait img,.mono-profile-photo img').forEach(img=>{
    const fail=()=>{img.hidden=true;img.parentElement.classList.add('mono-empty');};
    img.addEventListener('error',fail);if(img.complete&&!img.naturalWidth)fail();
  });
}

export function animateMonochrome(reducedMotion) {
  const cover=document.querySelector('.cover'),content=document.querySelector('#invitation-content');
  let timer;
  document.querySelector('#open-invitation').addEventListener('click',()=>{
    if(reducedMotion.matches||document.body.classList.contains('mono-opened'))return;
    document.body.classList.add('mono-opening','mono-opened');
    clearTimeout(timer);timer=setTimeout(()=>document.body.classList.remove('mono-opening'),1000);
  });
  // Native scrolling stays in control. Only transform and opacity are animated.
  let frame=0;
  function update(){
    frame=0;
    const rect=cover.getBoundingClientRect();
    const progress=reducedMotion.matches?0:Math.max(0,Math.min(1,-rect.top/rect.height));
    cover.style.setProperty('--cover-shift',`${progress*55}px`);
    cover.style.setProperty('--cover-fade',String(1-progress*.65));
  }
  const scroll=()=>{if(!frame)frame=requestAnimationFrame(update);};
  window.addEventListener('scroll',scroll,{passive:true});
  reducedMotion.addEventListener('change',()=>{document.body.classList.remove('mono-opening');scroll();});
  // Section rules draw in each time a section re-enters the viewport.
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('mono-in-view',entry.isIntersecting)),{threshold:.03});
  content.querySelectorAll('.section').forEach(section=>observer.observe(section));
  update();
}
