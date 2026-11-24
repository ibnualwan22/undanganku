import { normalizePortrait, portraitDemoAssets } from './portraits.js';
import { invitation } from './invitation.js';
import { escapeHTML } from './utils.js';
import { findTemplate, getTemplate } from './templates.js';
export const route=location.pathname.match(/^\/(u|preview)\/([a-zA-Z0-9-]+)$/);
export const isLive=route?.[1]==='u';
export const isPreview=route?.[1]==='preview';
export async function loadInvitation(){
  let data=structuredClone(invitation);
  if (!route) {
    const templateId = location.pathname.match(/^\/demo\/([a-z0-9-]+)$/)?.[1] || new URLSearchParams(location.search).get('preview');
    const template = templateId === null ? getTemplate() : findTemplate(templateId);
    if (!template) {
      document.querySelector('#app').innerHTML='<main class="invitation-error"><h1>Desain belum tersedia.</h1><p>Pilih template yang sudah siap digunakan dari katalog Aksara Invitation.</p><a class="button button-primary" href="/#katalog">Kembali ke katalog</a></main>';
      return null;
    }
    data.templateId=template.id;data.decoration=template.decoration;
    data.couple[0].name='Nadine';data.couple[0].fullName='Nadine Putri';
    data.couple[1].name='Arga';data.couple[1].fullName='Arga Pratama';
    if(template.id==='monochrome-vows'){
      data.couple[0].name='Alya';data.couple[0].fullName='Alya Putri';data.couple[1].name='Raka';data.couple[1].fullName='Raka Pratama';
      data.couple[0].portrait={src:portraitDemoAssets[0],x:8,y:42,zoom:1.05};
      data.couple[1].portrait={src:portraitDemoAssets[1],x:92,y:42,zoom:1.05};
    }
  }
  if(route){
    try{
      const response=await fetch(isLive?`/api/invitations/${route[2]}`:`/api/editor/invitations/${route[2]}`);
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Undangan belum tersedia.');
      data=isLive?result:result.draft;
    }catch(error){document.querySelector('#app').innerHTML=`<main class="invitation-error"><h1>Undangan belum tersedia.</h1><p>${escapeHTML(error.message)}</p>${isPreview?'<a class="button button-primary" href="/masuk">Masuk untuk melihat draft</a>':''}</main>`;return null;}
  }
  data.couple.forEach((person,index)=>{person.portrait=normalizePortrait(person.portrait,index);});
  data.sections={quote:true,couplePhoto:true,countdown:true,calendar:true,map:true,story:true,gallery:true,music:true,rsvp:true,wishes:true,gifts:false,closing:true,...data.sections};
  data.couplePhoto??=data.gallery?.[0]?.src||'';
  data.coverPhoto??='';data.decoration??=getTemplate(data.templateId).decoration;data.accounts??=[];
  data.music??={src:'',volume:0.4,name:''};
  return data;
}
